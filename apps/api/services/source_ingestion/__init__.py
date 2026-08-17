from .github_source import fetch_github_repo
from .confluence_source import fetch_confluence_space
from .notion_source import fetch_notion_page
from .jira_source import fetch_jira_project
from .file_upload_source import process_uploaded_file

async def ingest_source(source_type: str, url: str, tokens: dict, on_progress=None) -> str:
    if source_type == 'github':
        return await fetch_github_repo(url, tokens.get('GITHUB_APP_TOKEN'), on_progress=on_progress)
    elif source_type == 'confluence':
        return fetch_confluence_space(url, tokens.get('CONFLUENCE_API_TOKEN'))
    elif source_type == 'notion':
        return fetch_notion_page(url, tokens.get('NOTION_API_TOKEN'))
    elif source_type == 'jira':
        return fetch_jira_project(url, tokens.get('JIRA_API_TOKEN'))
    elif source_type == 'upload':
        return process_uploaded_file(url)
    else:
        raise ValueError(f"Unknown source type: {source_type}")

