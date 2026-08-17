import asyncio
import base64
import logging
from typing import Callable, Optional, Dict, Any

import httpx

from ...core.config import settings
from .base import BaseConnector, IngestionError, IngestionAuthError, IngestionRateLimitError

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {
    # Core Programming Languages
    '.py', '.ts', '.tsx', '.js', '.jsx', '.go', '.java', '.kt', '.scala',
    '.cs', '.cpp', '.c', '.cc', '.cxx', '.h', '.hpp', '.hxx',
    '.rs', '.swift', '.rb', '.php', '.lua', '.dart', '.r', '.m',
    # Scripting & Config
    '.sh', '.bash', '.zsh', '.sql', '.graphql', '.proto',
    '.yaml', '.yml', '.json', '.toml', '.xml', '.env.example',
    # Shaders & Engine Scripts
    '.shader', '.cginc', '.hlsl', '.glsl',
    # Documentation & Web
    '.md', '.mdx', '.txt', '.rst', '.html', '.css', '.scss'
}
SKIP_DIRS = {
    'node_modules', '.git', 'build', 'dist', 'venv', '.venv', '__pycache__',
    'Temp', 'Library', 'Logs', 'obj', 'bin', '.vs', '.idea', '.vscode',
    'target', 'vendor', '.next', 'out', '.gradle', 'Pods'
}

# Files that add noise but no signal — skip before chunking
JUNK_FILENAMES = {
    'package-lock.json', 'yarn.lock', 'poetry.lock', 'Pipfile.lock',
    'composer.lock', 'Cargo.lock', 'pnpm-lock.yaml', 'bun.lockb',
}

MAX_FILE_SIZE = 50 * 1024  # 50 KB per file

# Priority tiers for file selection when MAX_FILES cap is hit.
# Lower number = higher priority.
_PRIORITY = {
    '.py': 1, '.ts': 1, '.tsx': 1, '.js': 1, '.jsx': 1,
    '.go': 1, '.java': 1, '.kt': 1, '.rs': 1, '.swift': 1,
    '.cs': 1, '.cpp': 1, '.c': 1,
    '.graphql': 2, '.proto': 2, '.sql': 2,
    '.yaml': 3, '.yml': 3, '.toml': 3, '.json': 3,
    '.md': 4, '.mdx': 4, '.txt': 4, '.rst': 4,
    '.html': 5, '.css': 5, '.scss': 5,
}


def _mode_max_files() -> int:
    """Return the file ingestion cap for the current AI mode."""
    if settings.AI_MODE == "remote":
        return settings.REMOTE_MAX_PAGES  # reuse, or we could add REMOTE_MAX_FILES
    # local or hybrid
    return settings.LOCAL_MAX_FILES


def _prioritise_files(paths: list) -> list:
    """Sort files by type priority, then alphabetically, and apply the mode cap."""
    def _score(p: str) -> int:
        for ext, pri in _PRIORITY.items():
            if p.endswith(ext):
                return pri
        return 6

    cap = _mode_max_files() if settings.AI_MODE != "remote" else 500
    sorted_paths = sorted(paths, key=lambda p: (_score(p), p))
    return sorted_paths[:cap]


class GitHubConnector(BaseConnector):
    async def ingest(
        self,
        url: str,
        token: Optional[str],
        on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
    ) -> str:
        parts = url.rstrip('/').split('/')
        if len(parts) < 2:
            raise IngestionError("Invalid GitHub repository URL")
        owner, repo = parts[-2], parts[-1]

        use_token = bool(token) and not token.startswith("ghp_dummy")
        auth_headers = {'Accept': 'application/vnd.github.v3+json'}
        if use_token:
            auth_headers['Authorization'] = f'token {token}'

        base_api_url = f"https://api.github.com/repos/{owner}/{repo}"
        logger.info(f"Connecting to GitHub repository: {owner}/{repo}")

        # ── Resolve default branch ────────────────────────────────────────
        default_branch = "main"
        try:
            r = await self.client.get(base_api_url, headers=auth_headers)
            if r.status_code == 401 and use_token:
                # Token rejected — fall back to public access or raise IngestionAuthError
                auth_headers.pop('Authorization', None)
                r = await self.client.get(base_api_url, headers=auth_headers)
            
            if r.status_code in (401, 403):
                raise IngestionAuthError(f"GitHub authentication failed: {r.text}")
            elif r.status_code == 429:
                raise IngestionRateLimitError("GitHub rate limit exceeded")
            elif r.status_code == 200:
                default_branch = r.json().get('default_branch', 'main')
        except (IngestionAuthError, IngestionRateLimitError):
            raise
        except Exception as e:
            logger.warning(f"Could not resolve default branch for {owner}/{repo}: {e}")

        # ── Fetch repo tree ───────────────────────────────────────────────
        tree_data = []
        for branch in [default_branch, 'main', 'master']:
            try:
                r = await self.client.get(f"{base_api_url}/git/trees/{branch}?recursive=1", headers=auth_headers)
                if r.status_code == 200:
                    tree_data = r.json().get('tree', [])
                    break
            except Exception:
                continue

        if not tree_data:
            raise IngestionError(f"Could not fetch tree for {owner}/{repo}")

        # ── Filter and prioritise files ───────────────────────────────────
        candidate_paths = []
        for item in tree_data:
            if item.get('type') != 'blob':
                continue
            path = item.get('path', '')
            filename = path.split('/')[-1]
            if filename in JUNK_FILENAMES:
                continue
            if any(skip in path.split('/') for skip in SKIP_DIRS):
                continue
            if any(path.endswith(ext) for ext in ALLOWED_EXTENSIONS):
                candidate_paths.append(path)

        files_to_process = _prioritise_files(candidate_paths)
        logger.info(
            f"Repository {owner}/{repo}: {len(candidate_paths)} candidate files, "
            f"processing {len(files_to_process)} (mode={settings.AI_MODE})"
        )

        if on_progress:
            try:
                on_progress("source_files_found", {
                    "source": url,
                    "owner": owner,
                    "repo": repo,
                    "file_count": len(files_to_process),
                })
            except Exception:
                pass

        # ── Concurrent file fetch with semaphore ──────────────────────────
        results: dict[str, str] = {}

        async def _fetch_file(path: str) -> None:
            async with self.semaphore:
                try:
                    r = await self.client.get(f"{base_api_url}/contents/{path}", headers=auth_headers)
                    if r.status_code == 200:
                        file_data = r.json()
                        if 'content' in file_data:
                            raw = base64.b64decode(file_data['content']).decode('utf-8', errors='replace')
                            if len(raw) > MAX_FILE_SIZE:
                                raw = raw[:MAX_FILE_SIZE] + "\n...[TRUNCATED]"
                            results[path] = raw
                        else:
                            results[path] = "[Binary or unreadable content]"
                    elif r.status_code in (401, 403):
                        results[path] = "[Auth/Access error]"
                    else:
                        results[path] = f"[Fetch error: {r.status_code}]"
                except Exception as e:
                    logger.debug(f"Skipped {path}: {e}")
                    results[path] = "[Fetch exception]"

        await asyncio.gather(*[_fetch_file(p) for p in files_to_process])

        # Log progress summary
        logger.info(
            f"Completed ingestion for {owner}/{repo}: "
            f"{len(results)} files, approx {sum(len(v) for v in results.values())} chars"
        )

        if on_progress:
            try:
                on_progress("source_files_fetched", {
                    "source": url,
                    "fetched": len(results),
                    "total": len(files_to_process),
                })
            except Exception:
                pass

        # ── Build ordered content string ──────────────────────────────────
        content = ""
        for path in files_to_process:
            if path in results:
                content += f"\n\n--- FILE: {path} ---\n{results[path]}"

        return content


async def fetch_github_repo(
    repo_url: str,
    github_token: str,
    on_progress: Optional[Callable[[str, dict], None]] = None,
) -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        connector = GitHubConnector(client, concurrency_limit=10)
        return await connector.ingest(repo_url, github_token, on_progress=on_progress)
