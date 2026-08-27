import logging
from typing import Callable, Optional, Dict, Any
import asyncio
import httpx

from .base import BaseConnector, IngestionError
from ..local_storage import download_content

logger = logging.getLogger(__name__)

class FileUploadConnector(BaseConnector):
    async def ingest(
        self,
        url: str,
        token: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
        on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
    ) -> str:
        if on_progress:
            try:
                on_progress("source_files_found", {
                    "source": url,
                    "file_count": 1
                })
            except Exception:
                pass

        try:
            content = await asyncio.to_thread(download_content, url)
        except Exception as e:
            raise IngestionError(f"Error processing uploaded file: {str(e)}")

        if on_progress:
            try:
                on_progress("source_files_fetched", {
                    "source": url,
                    "fetched": 1,
                    "total": 1
                })
            except Exception:
                pass

        return content

async def process_uploaded_file(gcs_path: str, config: Optional[Dict[str, Any]] = None) -> str:
    async with httpx.AsyncClient() as client:
        connector = FileUploadConnector(client)
        return await connector.ingest(gcs_path, None, config=config)

