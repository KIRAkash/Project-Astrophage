import httpx
from .base import IngestionError, IngestionAuthError, IngestionRateLimitError
from .github_source import GitHubConnector, fetch_github_repo
from .confluence_source import ConfluenceConnector, fetch_confluence_space
from .notion_source import NotionConnector, fetch_notion_page
from .jira_source import JiraConnector, fetch_jira_project
from .file_upload_source import FileUploadConnector, process_uploaded_file

async def ingest_source(source_type: str, url: str, tokens: dict, on_progress=None) -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        if source_type == 'github':
            connector = GitHubConnector(client, concurrency_limit=10)
            return await connector.ingest(url, tokens.get('GITHUB_APP_TOKEN'), on_progress=on_progress)
        elif source_type == 'confluence':
            connector = ConfluenceConnector(client, concurrency_limit=10)
            return await connector.ingest(url, tokens.get('CONFLUENCE_API_TOKEN'), on_progress=on_progress)
        elif source_type == 'notion':
            connector = NotionConnector(client, concurrency_limit=10)
            return await connector.ingest(url, tokens.get('NOTION_API_TOKEN'), on_progress=on_progress)
        elif source_type == 'jira':
            connector = JiraConnector(client, concurrency_limit=10)
            return await connector.ingest(url, tokens.get('JIRA_API_TOKEN'), on_progress=on_progress)
        elif source_type == 'upload':
            connector = FileUploadConnector(client)
            return await connector.ingest(url, None, on_progress=on_progress)
        else:
            raise ValueError(f"Unknown source type: {source_type}")
