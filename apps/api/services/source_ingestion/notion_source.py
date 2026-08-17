import asyncio
import logging
import re
from typing import Callable, Optional, Dict, Any, List
import httpx
from datetime import datetime
from fastapi import HTTPException

from .base import BaseConnector, IncrementalDelta, IngestionError, IngestionAuthError, IngestionRateLimitError

logger = logging.getLogger(__name__)

def _extract_notion_id(url: str, config: Optional[Dict[str, Any]] = None) -> str:
    """Extract 32-char hex Notion page or database ID from URL or config."""
    if config and config.get("page_id"):
        return re.sub(r'[^a-fA-F0-9]', '', str(config["page_id"]))
    if config and config.get("database_id"):
        return re.sub(r'[^a-fA-F0-9]', '', str(config["database_id"]))

    cleaned = url.split('?')[0].rstrip('/')
    match = re.search(r'-([a-f0-9]{32})$', cleaned, re.IGNORECASE)
    if not match:
        match = re.search(r'([a-f0-9]{32})$', cleaned, re.IGNORECASE)
    if match:
        return match.group(1)
    
    # Try UUID format with dashes
    match = re.search(r'([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', cleaned, re.IGNORECASE)
    if match:
        return match.group(1).replace('-', '')

    # Fallback to alphanumeric stripping
    hex_only = re.sub(r'[^a-fA-F0-9]', '', cleaned)
    if len(hex_only) >= 32:
        return hex_only[-32:]

    raise HTTPException(
        status_code=400,
        detail="Invalid Notion URL format."
    )

class NotionConnector(BaseConnector):
    async def ingest(
        self,
        url: str,
        token: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
        on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
    ) -> str:
        if not token:
            raise HTTPException(
                status_code=401,
                detail="Notion API token not provided."
            )

        page_id = _extract_notion_id(url, config)

        headers = {
            'Authorization': f'Bearer {token}' if not token.startswith('Bearer ') else token,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        }

        # Stack-based DFS traversal preserving reading order
        stack = [(page_id, "fetch")]
        extracted_texts = []
        total_blocks_fetched = 0

        client = self.client
        own_client = False
        if client is None:
            client = httpx.AsyncClient(headers=headers, timeout=30.0)
            own_client = True

        try:
            while stack:
                item, action = stack.pop()

                if action == "output":
                    block = item
                    b_type = block.get('type')
                    if b_type and b_type in block and isinstance(block[b_type], dict) and 'rich_text' in block[b_type]:
                        rich_texts = block[b_type]['rich_text']
                        text_parts = []
                        for rt in rich_texts:
                            text_parts.append(rt.get('plain_text', ''))
                        extracted_texts.append("".join(text_parts) + "\n")

                elif action == "fetch":
                    block_id = item
                    children = []
                    start_cursor = None
                    while True:
                        fetch_url = f"https://api.notion.com/v1/blocks/{block_id}/children"
                        if start_cursor:
                            fetch_url += f"?start_cursor={start_cursor}"

                        async with self.semaphore:
                            try:
                                response = await client.get(fetch_url, headers=headers)
                            except httpx.RequestError as exc:
                                raise HTTPException(
                                    status_code=500,
                                    detail=f"Connection error while contacting Notion: {str(exc)}"
                                )

                        self.raise_for_status(response)
                        resp_data = response.json()
                        results = resp_data.get('results', [])
                        children.extend(results)
                        total_blocks_fetched += len(results)

                        if resp_data.get('has_more') and resp_data.get('next_cursor'):
                            start_cursor = resp_data['next_cursor']
                        else:
                            break

                    if on_progress and len(children) > 0:
                        try:
                            on_progress("notion_blocks_progress", {
                                "source": url,
                                "block_id": block_id,
                                "children_count": len(children),
                                "total_fetched": total_blocks_fetched,
                            })
                        except Exception:
                            pass

                    # Push onto stack in reverse order to preserve reading order
                    for block in reversed(children):
                        if block.get('has_children'):
                            stack.append((block['id'], "fetch"))
                        stack.append((block, "output"))

            if on_progress:
                try:
                    on_progress("notion_ingestion_complete", {
                        "source": url,
                        "total_blocks": total_blocks_fetched,
                    })
                    on_progress("source_files_fetched", {
                        "source": url,
                        "fetched": total_blocks_fetched,
                        "total": total_blocks_fetched,
                    })
                except Exception:
                    pass

            return f"--- Notion Page: {page_id} ---\n\n" + "".join(extracted_texts)
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
            raise IngestionAuthError("Notion token not provided.")

        page_id = _extract_notion_id(url, config)
        headers = {
            'Authorization': f'Bearer {token}' if not token.startswith('Bearer ') else token,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        }

        page_meta_url = f"https://api.notion.com/v1/pages/{page_id}"
        client = self.client
        own_client = False
        if client is None:
            client = httpx.AsyncClient(headers=headers, timeout=30.0)
            own_client = True

        try:
            async with self.semaphore:
                r = await client.get(page_meta_url, headers=headers)

            if r.status_code in (401, 403):
                raise IngestionAuthError(f"Notion auth failed: {r.text}")
            elif r.status_code != 200:
                raise IngestionError(f"Error inspecting Notion page: {r.text}")

            page_data = r.json()
            current_edited_time = page_data.get('last_edited_time', '')
            last_recorded_time = (last_state or {}).get("last_edited_time", "")

            if last_recorded_time and current_edited_time <= last_recorded_time:
                return IncrementalDelta(
                    has_changes=False,
                    summary=f"No changes in Notion page {page_id} since {last_recorded_time}",
                    new_state=last_state or {},
                    source_type="notion",
                    source_url=url,
                )

            updated_content = await self.ingest(url, token, config=config)

            return IncrementalDelta(
                has_changes=True,
                delta_content=f"### 📑 Notion Page Updated (Last Edited: {current_edited_time})\n\n{updated_content}",
                summary=f"Notion page {page_id} updated at {current_edited_time}",
                new_state={"last_edited_time": current_edited_time, "page_id": page_id},
                affected_items=[f"notion://{page_id}"],
                source_type="notion",
                source_url=url,
                author="NotionUser",
            )
        finally:
            if own_client:
                await client.aclose()

async def fetch_notion_page(
    notion_url: str,
    api_token: str,
    config: Optional[Dict[str, Any]] = None,
    on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
) -> str:
    connector = NotionConnector()
    if config is not None:
        return await connector.ingest(notion_url, api_token, config=config, on_progress=on_progress)
    return await connector.ingest(notion_url, api_token, on_progress=on_progress)
