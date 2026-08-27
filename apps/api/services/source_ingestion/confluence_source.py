import logging
from typing import Callable, Optional, Dict, Any, List
from urllib.parse import urlparse
import httpx
import asyncio
from datetime import datetime

from .base import BaseConnector, IncrementalDelta, IngestionError, IngestionAuthError, IngestionRateLimitError

logger = logging.getLogger(__name__)

def _parse_confluence_url(url: str, config: Optional[Dict[str, Any]] = None) -> tuple:
    """Extract domain and space key from URL or config."""
    if config and config.get("domain") and config.get("space_key"):
        domain = config["domain"].rstrip('/')
        if not domain.startswith("http"):
            domain = f"https://{domain}"
        return domain, config["space_key"].strip()

    parsed = urlparse(url)
    domain = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else "https://confluence.atlassian.net"
    path_parts = [p for p in parsed.path.split('/') if p and p not in ('wiki', 'spaces', 'display')]
    space_key = path_parts[-1] if path_parts else url.strip()
    return domain, space_key

class ConfluenceConnector(BaseConnector):
    async def ingest(
        self,
        url: str,
        token: Optional[str],
        config: Optional[Dict[str, Any]] = None,
        on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
    ) -> str:
        if not token:
            raise IngestionAuthError("Confluence token not provided (CONFLUENCE_API_TOKEN required).")

        domain, space_key = _parse_confluence_url(url, config)

        headers = {
            'Authorization': f'Basic {token}' if not token.startswith('Basic ') and not token.startswith('Bearer ') else token,
            'Accept': 'application/json'
        }

        pages = []
        next_url = f"{domain}/wiki/api/v2/spaces/{space_key}/pages"

        while next_url:
            async with self.semaphore:
                r = await self.client.get(next_url, headers=headers)

            if r.status_code in (401, 403):
                raise IngestionAuthError(f"Confluence auth failed: {r.text}")
            elif r.status_code == 429:
                raise IngestionRateLimitError("Confluence rate limit exceeded")
            elif r.status_code != 200:
                raise IngestionError(f"Error fetching Confluence space pages: {r.text}")

            data = r.json()
            results = data.get('results', [])
            pages.extend(results)

            # Extract cursor pagination
            links = data.get('_links', {})
            next_relative = links.get('next')
            if next_relative:
                if next_relative.startswith('http'):
                    next_url = next_relative
                else:
                    next_url = f"{domain}{next_relative}"
            else:
                next_url = None

        if on_progress:
            try:
                on_progress("source_files_found", {
                    "source": url,
                    "space_key": space_key,
                    "file_count": len(pages)
                })
            except Exception:
                pass

        content = f"--- Confluence Space: {space_key} ---\n\n"

        async def fetch_page_content(page) -> str:
            page_id = page['id']
            page_title = page.get('title', f'Page {page_id}')
            body_url = f"{domain}/wiki/api/v2/pages/{page_id}?body-format=storage"
            async with self.semaphore:
                r = await self.client.get(body_url, headers=headers)

            if r.status_code in (401, 403):
                raise IngestionAuthError(f"Confluence auth failed fetching page: {r.text}")
            elif r.status_code == 429:
                raise IngestionRateLimitError("Confluence rate limit exceeded")
            elif r.status_code != 200:
                raise IngestionError(f"Error fetching Confluence page {page_id}: {r.text}")

            body_data = r.json()
            body_content = body_data.get('body', {}).get('storage', {}).get('value', '')
            return f"\n\n--- Page: {page_title} (ID: {page_id}) ---\n{body_content}"

        # Gather concurrently!
        if pages:
            tasks = [fetch_page_content(page) for page in pages]
            page_contents = await asyncio.gather(*tasks)
            for pc in page_contents:
                content += pc

        if on_progress:
            try:
                on_progress("source_files_fetched", {
                    "source": url,
                    "fetched": len(pages),
                    "total": len(pages)
                })
            except Exception:
                pass

        return content

    async def check_incremental_updates(
        self,
        url: str,
        token: Optional[str],
        last_state: Optional[Dict[str, Any]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> IncrementalDelta:
        if not token:
            raise IngestionAuthError("Confluence token not provided.")

        domain, space_key = _parse_confluence_url(url, config)
        headers = {
            'Authorization': f'Basic {token}' if not token.startswith('Basic ') and not token.startswith('Bearer ') else token,
            'Accept': 'application/json'
        }

        # Query space pages
        pages_url = f"{domain}/wiki/api/v2/spaces/{space_key}/pages"
        async with self.semaphore:
            r = await self.client.get(pages_url, headers=headers)

        if r.status_code in (401, 403):
            raise IngestionAuthError(f"Confluence auth failed: {r.text}")
        elif r.status_code != 200:
            raise IngestionError(f"Error inspecting Confluence space: {r.text}")

        current_pages = r.json().get('results', [])
        known_pages = (last_state or {}).get("known_page_ids", {})

        new_or_updated = []
        updated_state = {}

        for p in current_pages:
            p_id = str(p['id'])
            p_title = p.get('title', '')
            p_version = str(p.get('version', {}).get('number', '1')) if isinstance(p.get('version'), dict) else str(p.get('version', '1'))
            updated_state[p_id] = p_version

            if p_id not in known_pages or known_pages.get(p_id) != p_version:
                new_or_updated.append((p_id, p_title, "new" if p_id not in known_pages else "modified"))

        if not new_or_updated:
            return IncrementalDelta(
                has_changes=False,
                summary=f"No new or updated Confluence pages in space {space_key}",
                new_state={"known_page_ids": updated_state, "space_key": space_key},
                source_type="confluence",
                source_url=url,
            )

        # Fetch contents of changed pages
        delta_lines = [
            f"### 📄 Confluence Space Updates: `{space_key}`",
            f"Detected **{len(new_or_updated)} page change(s)**:\n"
        ]

        for p_id, p_title, change_type in new_or_updated:
            body_url = f"{domain}/wiki/api/v2/pages/{p_id}?body-format=storage"
            async with self.semaphore:
                br = await self.client.get(body_url, headers=headers)
            body_content = ""
            if br.status_code == 200:
                body_content = br.json().get('body', {}).get('storage', {}).get('value', '')

            delta_lines.append(f"#### [{change_type.upper()}] {p_title} (ID: {p_id})\n{body_content}\n")

        affected_items = [f"confluence://{space_key}/{p_id}" for p_id, _, _ in new_or_updated]

        return IncrementalDelta(
            has_changes=True,
            delta_content="\n".join(delta_lines),
            summary=f"{len(new_or_updated)} updated/new pages in Confluence space {space_key}",
            new_state={"known_page_ids": updated_state, "space_key": space_key, "last_synced_at": datetime.utcnow().isoformat()},
            affected_items=affected_items,
            source_type="confluence",
            source_url=url,
            author="Confluence",
        )

async def fetch_confluence_space(
    space_url: str,
    api_token: str,
    config: Optional[Dict[str, Any]] = None,
    on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
) -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        connector = ConfluenceConnector(client)
        return await connector.ingest(space_url, api_token, config=config, on_progress=on_progress)

