from typing import Dict, Type, Optional, Callable, Any
import httpx
import logging

from .base import (
    BaseConnector,
    IncrementalDelta,
    IngestionError,
    IngestionAuthError,
    IngestionRateLimitError,
)
from .github_source import GitHubConnector, fetch_github_repo
from .confluence_source import ConfluenceConnector, fetch_confluence_space
from .notion_source import NotionConnector, fetch_notion_page
from .slack_source import SlackConnector, fetch_slack_channel
from .jira_source import JiraConnector, fetch_jira_project
from .file_upload_source import FileUploadConnector, process_uploaded_file

logger = logging.getLogger(__name__)

# Extensible Connector Registry
CONNECTOR_REGISTRY: Dict[str, Type[BaseConnector]] = {
    'github': GitHubConnector,
    'confluence': ConfluenceConnector,
    'notion': NotionConnector,
    'slack': SlackConnector,
    'jira': JiraConnector,
    'upload': FileUploadConnector,
}

TOKEN_KEY_MAP: Dict[str, Optional[str]] = {
    'github': 'GITHUB_APP_TOKEN',
    'confluence': 'CONFLUENCE_API_TOKEN',
    'notion': 'NOTION_API_TOKEN',
    'slack': 'SLACK_BOT_TOKEN',
    'jira': 'JIRA_API_TOKEN',
    'upload': None,
}

def register_connector(source_type: str, connector_cls: Type[BaseConnector], token_key: Optional[str] = None):
    """Register a new custom source connector into Astrophage."""
    CONNECTOR_REGISTRY[source_type.lower()] = connector_cls
    if token_key:
        TOKEN_KEY_MAP[source_type.lower()] = token_key
    logger.info(f"Registered connector '{source_type}' -> {connector_cls.__name__}")

def get_connector(source_type: str, client: Optional[httpx.AsyncClient] = None, concurrency_limit: int = 10) -> BaseConnector:
    """Instantiate connector instance by source type."""
    st = source_type.lower()
    if st not in CONNECTOR_REGISTRY:
        raise ValueError(f"Unknown source type '{source_type}'. Available: {list(CONNECTOR_REGISTRY.keys())}")
    connector_cls = CONNECTOR_REGISTRY[st]
    return connector_cls(client, concurrency_limit=concurrency_limit)

async def ingest_source(
    source_type: str,
    url: str,
    tokens: Optional[dict] = None,
    config: Optional[dict] = None,
    on_progress: Optional[Callable[[str, Dict[str, Any]], Any]] = None
) -> str:
    """Universal ingestion entry point for any registered source."""
    tokens = tokens or {}
    st = source_type.lower()
    if st == 'github':
        return await fetch_github_repo(url, tokens.get('GITHUB_APP_TOKEN'), config=config, on_progress=on_progress)
    elif st == 'confluence':
        return await fetch_confluence_space(url, tokens.get('CONFLUENCE_API_TOKEN'), config=config, on_progress=on_progress)
    elif st == 'notion':
        return await fetch_notion_page(url, tokens.get('NOTION_API_TOKEN'), config=config, on_progress=on_progress)
    elif st == 'jira':
        return await fetch_jira_project(url, tokens.get('JIRA_API_TOKEN'), config=config, on_progress=on_progress)
    elif st == 'upload':
        return await process_uploaded_file(url, config=config, on_progress=on_progress)
    elif st in CONNECTOR_REGISTRY:
        token_key = TOKEN_KEY_MAP.get(st)
        token = tokens.get(token_key) if token_key else None
        if not token and token_key:
            from ...core.config import settings, get_env_var
            token = get_env_var(token_key, getattr(settings, token_key, ""))
        async with httpx.AsyncClient(timeout=45.0) as client:
            connector = get_connector(st, client)
            if config is not None:
                return await connector.ingest(url, token, config=config, on_progress=on_progress)
            return await connector.ingest(url, token, on_progress=on_progress)
    else:
        raise ValueError(f"Unknown source type: {source_type}")

async def check_source_updates(
    source_type: str,
    url: str,
    token: Optional[str] = None,
    last_state: Optional[dict] = None,
    config: Optional[dict] = None,
) -> IncrementalDelta:
    """Universal incremental change detection for any registered source."""
    if not token:
        token_key = TOKEN_KEY_MAP.get(source_type.lower())
        if token_key:
            from ...core.config import settings, get_env_var
            token = get_env_var(token_key, getattr(settings, token_key, ""))

    async with httpx.AsyncClient(timeout=45.0) as client:
        connector = get_connector(source_type, client)
        return await connector.check_incremental_updates(url, token, last_state=last_state, config=config)
