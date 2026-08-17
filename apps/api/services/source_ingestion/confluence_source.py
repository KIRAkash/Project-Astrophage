import logging
from typing import Callable, Optional, Dict, Any
from urllib.parse import urlparse
import httpx
import asyncio

from .base import BaseConnector, IngestionError, IngestionAuthError, IngestionRateLimitError

logger = logging.getLogger(__name__)

class ConfluenceConnector(BaseConnector):
    async def ingest(
        self,
        url: str,
        token: Optional[str],
        on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
    ) -> str:
        if not token:
            raise IngestionAuthError("Confluence token not provided.")

        parsed = urlparse(url)
        domain = f"{parsed.scheme}://{parsed.netloc}"
        space_key = url.rstrip('/').split('/')[-1]

        headers = {
            'Authorization': f'Basic {token}',
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
            page_title = page['title']
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
            return f"\n\n--- Page: {page_title} ---\n{body_content}"

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

async def fetch_confluence_space(
    space_url: str,
    api_token: str,
    on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
) -> str:
    async with httpx.AsyncClient() as client:
        connector = ConfluenceConnector(client)
        return await connector.ingest(space_url, api_token, on_progress=on_progress)
