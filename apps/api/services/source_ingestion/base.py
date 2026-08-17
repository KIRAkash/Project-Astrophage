import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Callable, Optional, Dict, Any, List
from dataclasses import dataclass, field
import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Shared/pooled limits to respect downstream rate limits
SEMAPHORE = asyncio.Semaphore(10)

class IngestionError(Exception):
    """Generic pipeline/network error."""
    pass

class IngestionAuthError(HTTPException, IngestionError):
    """Raised on 401/403 credentials failures."""
    def __init__(self, detail: str = "Unauthorized: Invalid or expired API token/credentials provided.", status_code: int = 401):
        HTTPException.__init__(self, status_code=status_code, detail=detail)
        IngestionError.__init__(self, detail)

class IngestionRateLimitError(HTTPException, IngestionError):
    """Raised on 429 rate limits."""
    def __init__(self, detail: str = "Rate limit exceeded.", status_code: int = 429):
        HTTPException.__init__(self, status_code=status_code, detail=detail)
        IngestionError.__init__(self, detail)

@dataclass
class IncrementalDelta:
    has_changes: bool
    delta_content: str = ""
    summary: str = ""
    new_state: Dict[str, Any] = field(default_factory=dict)
    affected_items: List[str] = field(default_factory=list)
    source_type: str = ""
    source_url: str = ""
    author: str = "System"

class BaseConnector(ABC):
    def __init__(self, client: Optional[httpx.AsyncClient] = None, concurrency_limit: int = 10):
        self.client = client
        self.semaphore = asyncio.Semaphore(concurrency_limit)

    @abstractmethod
    async def ingest(
        self,
        url: str,
        token: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
        on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
    ) -> str:
        """Asynchronously ingest and format the content of the target source."""
        pass

    def raise_for_status(self, response) -> None:
        """Inspect HTTP response codes and raise standardized HTTPException / IngestionError."""
        if response.status_code >= 400:
            logger.error(f"HTTP Error {response.status_code}: {response.text}")
            if response.status_code in (401, 403):
                detail = "Unauthorized: Invalid or expired API token/credentials provided." if response.status_code == 401 else "Forbidden: You do not have permission to access this resource."
                raise IngestionAuthError(detail=detail, status_code=response.status_code)
            elif response.status_code == 429:
                raise IngestionRateLimitError(detail="Rate limit exceeded.", status_code=429)
            elif response.status_code == 404:
                raise HTTPException(
                    status_code=404,
                    detail="Not Found: The requested resource could not be found."
                )
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"HTTP error occurred: {response.text[:200]}"
                )

    async def check_incremental_updates(
        self,
        url: str,
        token: Optional[str] = None,
        last_state: Optional[Dict[str, Any]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> IncrementalDelta:
        """Check for new or modified content since last_state.
        Default implementation returns no changes unless overridden by connector.
        """
        return IncrementalDelta(
            has_changes=False,
            delta_content="",
            summary="Incremental updates not supported for this connector",
            new_state=last_state or {},
            source_url=url,
        )
