import asyncio
import logging
from typing import Callable, Optional, Dict, Any, List
from urllib.parse import urlparse
import httpx
from datetime import datetime
from fastapi import HTTPException

from .base import BaseConnector, IncrementalDelta, IngestionError, IngestionAuthError, IngestionRateLimitError

logger = logging.getLogger(__name__)

def _parse_jira_url(url: str, config: Optional[Dict[str, Any]] = None) -> tuple:
    """Extract domain and project key from Jira URL or config."""
    if config and config.get("domain") and config.get("project_key"):
        domain = config["domain"].rstrip('/')
        if not domain.startswith("http"):
            domain = f"https://{domain}"
        return domain, config["project_key"].strip()

    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        raise HTTPException(
            status_code=400,
            detail="Invalid Jira URL format."
        )
    domain = f"{parsed.scheme}://{parsed.netloc}"
    
    # Check for query params (e.g., projectKey=PROJ)
    if 'projectKey=' in url:
        project_key = url.split('projectKey=')[-1].split('&')[0]
        return domain, project_key

    path_parts = [p for p in parsed.path.split('/') if p and p not in ('browse', 'jira', 'projects', 'boards', 'rest', 'api', '2', 'search')]
    project_key = path_parts[-1] if path_parts else url.rstrip('/').split('/')[-1]
    if not project_key:
        raise HTTPException(
            status_code=400,
            detail="Invalid Jira URL project key."
        )
    return domain, project_key

class JiraConnector(BaseConnector):
    async def ingest(
        self,
        url: str,
        token: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
        on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
    ) -> str:
        if not token:
            raise IngestionAuthError("Jira API token not provided.")

        domain, project_key = _parse_jira_url(url, config)
        issue_types = (config or {}).get("issue_types", "Epic, Story, Task")

        headers = {
            'Authorization': f'Basic {token}' if not token.startswith('Basic ') and not token.startswith('Bearer ') else token,
            'Accept': 'application/json'
        }

        all_issues = []
        start_at = 0
        max_results = 50
        total = 1

        client = self.client
        own_client = False
        if client is None:
            client = httpx.AsyncClient(headers=headers, timeout=30.0)
            own_client = True

        try:
            while start_at < total:
                api_url = f"{domain}/rest/api/2/search"
                params = {
                    'jql': f"project = {project_key} AND type in ({issue_types}) ORDER BY created DESC",
                    'startAt': start_at,
                    'maxResults': max_results
                }
                async with self.semaphore:
                    try:
                        response = await client.get(api_url, headers=headers, params=params)
                    except httpx.RequestError as exc:
                        raise HTTPException(
                            status_code=500,
                            detail=f"Connection error while contacting Jira: {str(exc)}"
                        )

                self.raise_for_status(response)
                data = response.json()
                issues = data.get('issues', [])
                if not issues:
                    break

                all_issues.extend(issues)
                total = data.get('total', len(all_issues))
                start_at += len(issues)

            if on_progress:
                try:
                    on_progress("jira_issues_fetched", {
                        "source": url,
                        "project_key": project_key,
                        "fetched": len(all_issues),
                        "total": total,
                    })
                    on_progress("source_files_fetched", {
                        "source": url,
                        "fetched": len(all_issues),
                        "total": total,
                    })
                except Exception:
                    pass

            content = f"--- Jira Project: {project_key} ---\n\n"
            for issue in all_issues:
                key = issue['key']
                summary = issue['fields'].get('summary', '')
                description = issue['fields'].get('description', '') or ''
                i_type = issue['fields'].get('issuetype', {}).get('name', '')
                content += f"\n\n--- [{i_type}] {key}: {summary} ---\n{description}"

            return content
        finally:
            if own_client:
                await client.aclose()

    async def check_incremental_updates(
        self,
        url: str,
        token: Optional[str] = None,
        last_state: Optional[Dict[str, Any]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> IncrementalDelta:
        if not token:
            raise IngestionAuthError("Jira token not provided.")

        domain, project_key = _parse_jira_url(url, config)
        headers = {
            'Authorization': f'Basic {token}' if not token.startswith('Basic ') and not token.startswith('Bearer ') else token,
            'Accept': 'application/json'
        }

        last_synced_at = (last_state or {}).get("last_synced_at")
        if not last_synced_at:
            jql = f"project = {project_key} ORDER BY updated DESC"
        else:
            jql = f"project = {project_key} AND updated >= '{last_synced_at}' ORDER BY updated DESC"

        params = {'jql': jql, 'startAt': 0, 'maxResults': 50}
        api_url = f"{domain}/rest/api/2/search"

        client = self.client
        own_client = False
        if client is None:
            client = httpx.AsyncClient(headers=headers, timeout=30.0)
            own_client = True

        try:
            async with self.semaphore:
                r = await client.get(api_url, headers=headers, params=params)

            if r.status_code in (401, 403):
                raise IngestionAuthError(f"Jira auth failed: {r.text}")
            elif r.status_code != 200:
                raise IngestionError(f"Error inspecting Jira project: {r.text}")

            issues = r.json().get('issues', [])
            known_keys = (last_state or {}).get("known_keys", [])

            new_or_updated = [i for i in issues if i['key'] not in known_keys or last_synced_at]

            if not new_or_updated:
                return IncrementalDelta(
                    has_changes=False,
                    summary=f"No updated Jira issues in project {project_key}",
                    new_state=last_state or {},
                    source_type="jira",
                    source_url=url,
                )

            now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
            delta_lines = [
                f"### 📋 Jira Project Updates: `{project_key}`",
                f"Found **{len(new_or_updated)} updated issue(s)**:\n"
            ]

            for issue in new_or_updated:
                key = issue['key']
                summary = issue['fields'].get('summary', '')
                description = issue['fields'].get('description', '') or ''
                i_type = issue['fields'].get('issuetype', {}).get('name', 'Issue')
                delta_lines.append(f"- **[{i_type}] {key}**: {summary}\n  {description[:300]}")

            affected_items = [f"jira://{project_key}/{i['key']}" for i in new_or_updated]

            return IncrementalDelta(
                has_changes=True,
                delta_content="\n".join(delta_lines),
                summary=f"{len(new_or_updated)} updated issues in Jira project {project_key}",
                new_state={
                    "last_synced_at": now_str,
                    "project_key": project_key,
                    "known_keys": [i['key'] for i in issues[:50]]
                },
                affected_items=affected_items,
                source_type="jira",
                source_url=url,
                author="Jira",
            )
        finally:
            if own_client:
                await client.aclose()

async def fetch_jira_project(
    jira_url: str,
    api_token: str,
    config: Optional[Dict[str, Any]] = None,
    on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
) -> str:
    connector = JiraConnector()
    if config is not None:
        return await connector.ingest(jira_url, api_token, config=config, on_progress=on_progress)
    return await connector.ingest(jira_url, api_token, on_progress=on_progress)
