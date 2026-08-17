import logging
import re
from typing import Callable, Optional, Dict, Any
import httpx
import asyncio

from .base import BaseConnector, IngestionError, IngestionAuthError, IngestionRateLimitError

logger = logging.getLogger(__name__)

class NotionConnector(BaseConnector):
    async def _get_all_children(self, block_id: str, headers: dict) -> list:
        children = []
        next_cursor = None
        has_more = True

        while has_more:
            url = f"https://api.notion.com/v1/blocks/{block_id}/children"
            params = {}
            if next_cursor:
                params['start_cursor'] = next_cursor

            async with self.semaphore:
                r = await self.client.get(url, headers=headers, params=params)

            if r.status_code in (401, 403):
                raise IngestionAuthError(f"Notion auth failed: {r.text}")
            elif r.status_code == 429:
                raise IngestionRateLimitError("Notion rate limit exceeded")
            elif r.status_code != 200:
                raise IngestionError(f"Error fetching Notion block children: {r.text}")

            data = r.json()
            children.extend(data.get('results', []))
            has_more = data.get('has_more', False)
            next_cursor = data.get('next_cursor', None)

        return children

    def _extract_block_text(self, block: dict) -> str:
        b_type = block.get('type')
        if not b_type or b_type not in block:
            return ""
        block_data = block[b_type]
        if not isinstance(block_data, dict) or 'rich_text' not in block_data:
            return ""

        rich_texts = block_data['rich_text']
        text = ""
        for rt in rich_texts:
            text += rt.get('plain_text', '')
        if text:
            text += "\n"
        return text

    async def ingest(
        self,
        url: str,
        token: Optional[str],
        on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
    ) -> str:
        if not token:
            raise IngestionAuthError("Notion token not provided.")

        match = re.search(r'-([a-f0-9]{32})$', url)
        if not match:
            match = re.search(r'([a-f0-9]{32})$', url)
        if not match:
            raise IngestionError("Invalid Notion URL format")

        page_id = match.group(1)

        headers = {
            'Authorization': f'Bearer {token}',
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        }

        if on_progress:
            try:
                on_progress("source_files_found", {
                    "source": url,
                    "page_id": page_id,
                    "file_count": 1
                })
            except Exception:
                pass

        # Stack holds dictionaries of items to process.
        # We start by fetching children of the root page_id.
        stack = [{"type": "fetch_children", "block_id": page_id}]
        text_pieces = []

        while stack:
            item = stack.pop()
            if item["type"] == "fetch_children":
                children = await self._get_all_children(item["block_id"], headers)
                # Push children to the stack in reverse order so they are processed in correct forward order.
                for child in reversed(children):
                    stack.append({"type": "block", "data": child})
            elif item["type"] == "block":
                block = item["data"]
                block_text = self._extract_block_text(block)
                if block_text:
                    text_pieces.append(block_text)

                if block.get('has_children'):
                    stack.append({"type": "fetch_children", "block_id": block['id']})

        content = "".join(text_pieces)

        if on_progress:
            try:
                on_progress("source_files_fetched", {
                    "source": url,
                    "fetched": 1,
                    "total": 1
                })
            except Exception:
                pass

        return f"--- Notion Page: {page_id} ---\n\n" + content

async def fetch_notion_page(
    notion_url: str,
    api_token: str,
    on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
) -> str:
    async with httpx.AsyncClient() as client:
        connector = NotionConnector(client)
        return await connector.ingest(notion_url, api_token, on_progress=on_progress)
