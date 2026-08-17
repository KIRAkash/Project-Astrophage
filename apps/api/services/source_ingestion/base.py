from abc import ABC, abstractmethod
from typing import Callable, Optional, Dict, Any
import httpx
import asyncio

class IngestionError(Exception):
    """Generic pipeline/network error."""
    pass

class IngestionAuthError(IngestionError):
    """Raised on 401/403 credentials failures."""
    pass

class IngestionRateLimitError(IngestionError):
    """Raised on 429 rate limits."""
    pass

class BaseConnector(ABC):
    def __init__(self, client: httpx.AsyncClient, concurrency_limit: int = 10):
        self.client = client
        self.semaphore = asyncio.Semaphore(concurrency_limit)

    @abstractmethod
    async def ingest(
        self,
        url: str,
        token: Optional[str],
        on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
    ) -> str:
        """Asynchronously ingest and format the content of the target source."""
        pass
