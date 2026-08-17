import logging
from typing import Callable, Optional, Dict, Any
from urllib.parse import urlparse
import httpx
import asyncio

from .base import BaseConnector, IngestionError, IngestionAuthError, IngestionRateLimitError

logger = logging.getLogger(__name__)

class JiraConnector(BaseConnector):
    async def ingest(
        self,
        url: str,
        token: Optional[str],
        on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
    ) -> str:
        if not token:
            raise IngestionAuthError("Jira token not provided.")

        parsed = urlparse(url)
        domain = f"{parsed.scheme}://{parsed.netloc}"
        project_key = url.rstrip('/').split('/')[-1]

        headers = {
            'Authorization': f'Basic {token}',
            'Accept': 'application/json'
        }

        issues = []
        start_at = 0
        max_results = 100

        while True:
            params = {
                'jql': f"project = {project_key} AND type in (Epic, Story, Task) ORDER BY created DESC",
                'startAt': start_at,
                'maxResults': max_results
            }
            api_url = f"{domain}/rest/api/2/search"
            
            async with self.semaphore:
                r = await self.client.get(api_url, headers=headers, params=params)

            if r.status_code in (401, 403):
                raise IngestionAuthError(f"Jira auth failed: {r.text}")
            elif r.status_code == 429:
                raise IngestionRateLimitError("Jira rate limit exceeded")
            elif r.status_code != 200:
                raise IngestionError(f"Error fetching Jira issues: {r.text}")

            data = r.json()
            batch = data.get('issues', [])
            if not batch:
                break

            issues.extend(batch)
            total = data.get('total', 0)
            if len(issues) >= total or len(batch) < max_results:
                break

            start_at += len(batch)

        if on_progress:
            try:
                on_progress("source_files_found", {
                    "source": url,
                    "project_key": project_key,
                    "file_count": len(issues)
                })
            except Exception:
                pass

        content = f"--- Jira Project: {project_key} ---\n\n"

        for issue in issues:
            key = issue['key']
            summary = issue['fields'].get('summary', '')
            description = issue['fields'].get('description', '') or ''
            i_type = issue['fields'].get('issuetype', {}).get('name', '')
            content += f"\n\n--- [{i_type}] {key}: {summary} ---\n{description}"

        if on_progress:
            try:
                on_progress("source_files_fetched", {
                    "source": url,
                    "fetched": len(issues),
                    "total": len(issues)
                })
            except Exception:
                pass

        return content

async def fetch_jira_project(
    jira_url: str,
    api_token: str,
    on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
) -> str:
    async with httpx.AsyncClient() as client:
        connector = JiraConnector(client)
        return await connector.ingest(jira_url, api_token, on_progress=on_progress)
