import asyncio
import os
import sys
from unittest.mock import MagicMock, AsyncMock, patch

import pytest
from fastapi import HTTPException

# Add api directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'apps', 'api'))

from apps.api.services.source_ingestion.base import BaseConnector
from apps.api.services.source_ingestion.confluence_source import ConfluenceConnector, fetch_confluence_space
from apps.api.services.source_ingestion.jira_source import JiraConnector, fetch_jira_project
from apps.api.services.source_ingestion.notion_source import NotionConnector, fetch_notion_page
from apps.api.services.source_ingestion.file_upload_source import FileUploadConnector, process_uploaded_file
from apps.api.services.source_ingestion import ingest_source

# ── 1. BaseConnector Tests ───────────────────────────────────────────────────

def test_base_connector_error_handling():
    class TestConnector(BaseConnector):
        async def ingest(self, url, token, on_progress=None):
            return "ok"

    connector = TestConnector()
    
    # Mock Response objects
    mock_401 = MagicMock()
    mock_401.status_code = 401
    mock_401.text = "Unauthorized"
    
    with pytest.raises(HTTPException) as exc_info:
        connector.raise_for_status(mock_401)
    assert exc_info.value.status_code == 401
    assert "Unauthorized" in exc_info.value.detail

    mock_403 = MagicMock()
    mock_403.status_code = 403
    mock_403.text = "Forbidden"
    with pytest.raises(HTTPException) as exc_info:
        connector.raise_for_status(mock_403)
    assert exc_info.value.status_code == 403
    assert "Forbidden" in exc_info.value.detail

    mock_404 = MagicMock()
    mock_404.status_code = 404
    mock_404.text = "Not Found"
    with pytest.raises(HTTPException) as exc_info:
        connector.raise_for_status(mock_404)
    assert exc_info.value.status_code == 404
    assert "Not Found" in exc_info.value.detail

    mock_500 = MagicMock()
    mock_500.status_code = 500
    mock_500.text = "Internal Server Error"
    with pytest.raises(HTTPException) as exc_info:
        connector.raise_for_status(mock_500)
    assert exc_info.value.status_code == 500
    assert "HTTP error occurred" in exc_info.value.detail


# ── 2. Confluence Ingestion Tests ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_confluence_connector_pagination():
    connector = ConfluenceConnector()
    
    # Prepare mock responses for Space Pages call (with cursor-based pagination)
    page_resp_1_data = {
        "results": [
            {"id": "p1", "title": "Page One"},
        ],
        "_links": {
            "next": "/wiki/api/v2/spaces/KEY/pages?cursor=xyz"
        }
    }
    page_resp_2_data = {
        "results": [
            {"id": "p2", "title": "Page Two"},
        ],
        "_links": {}
    }
    
    # Body fetches
    body_resp_p1 = {"body": {"storage": {"value": "<p>Content of Page One</p>"}}}
    body_resp_p2 = {"body": {"storage": {"value": "<p>Content of Page Two</p>"}}}

    async def mock_get(url, *args, **kwargs):
        mock_response = MagicMock()
        mock_response.status_code = 200
        if "spaces/KEY/pages" in url:
            if "cursor=xyz" in url:
                mock_response.json = lambda: page_resp_2_data
            else:
                mock_response.json = lambda: page_resp_1_data
        elif "pages/p1" in url:
            mock_response.json = lambda: body_resp_p1
        elif "pages/p2" in url:
            mock_response.json = lambda: body_resp_p2
        else:
            mock_response.status_code = 404
            mock_response.text = "Not Found"
        return mock_response

    progress_events = []
    def on_progress(event, data):
        progress_events.append((event, data))

    with patch("httpx.AsyncClient.get", side_effect=mock_get):
        content = await connector.ingest(
            url="https://confluence.example.com/wiki/spaces/KEY",
            token="dummy_token_base64",
            on_progress=on_progress
        )

    assert "--- Confluence Space: KEY ---" in content
    assert "--- Page: Page One ---" in content
    assert "<p>Content of Page One</p>" in content
    assert "--- Page: Page Two ---" in content
    assert "<p>Content of Page Two</p>" in content

    # Verify progress events
    assert progress_events[0][0] == "confluence_pages_found"
    assert progress_events[0][1]["count"] == 2
    assert progress_events[1][0] == "confluence_pages_fetched"
    assert progress_events[1][1]["fetched"] == 2


# ── 3. Jira Ingestion Tests ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_jira_connector_pagination():
    connector = JiraConnector()

    # Offset pagination (total = 120, fetching max_results = 50 per page)
    # Page 1: startAt = 0, fetched = 50
    # Page 2: startAt = 50, fetched = 50
    # Page 3: startAt = 100, fetched = 20
    
    def get_mock_issues(start, count):
        return [
            {
                "key": f"PROJ-{start + i}",
                "fields": {
                    "summary": f"Summary {start + i}",
                    "description": f"Description {start + i}",
                    "issuetype": {"name": "Task" if i % 2 == 0 else "Story"}
                }
            }
            for i in range(count)
        ]

    async def mock_get(url, *args, **kwargs):
        # Extract startAt
        import urllib.parse
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        if "params" in kwargs and isinstance(kwargs["params"], dict):
            start_at = int(kwargs["params"].get("startAt", 0))
            max_results = int(kwargs["params"].get("maxResults", 50))
        else:
            start_at = int(params.get("startAt", [0])[0])
            max_results = int(params.get("maxResults", [50])[0])
        
        mock_response = MagicMock()
        mock_response.status_code = 200
        
        if start_at == 0:
            mock_response.json = lambda: {"total": 120, "issues": get_mock_issues(0, 50)}
        elif start_at == 50:
            mock_response.json = lambda: {"total": 120, "issues": get_mock_issues(50, 50)}
        elif start_at == 100:
            mock_response.json = lambda: {"total": 120, "issues": get_mock_issues(100, 20)}
        else:
            mock_response.json = lambda: {"total": 120, "issues": []}
            
        return mock_response

    progress_events = []
    def on_progress(event, data):
        progress_events.append((event, data))

    with patch("httpx.AsyncClient.get", side_effect=mock_get):
        content = await connector.ingest(
            url="https://jira.example.com/rest/api/2/search/PROJ",
            token="dummy_token",
            on_progress=on_progress
        )

    assert "--- Jira Project: PROJ ---" in content
    # Verify we retrieved issues from all pages
    assert "[Task] PROJ-0: Summary 0" in content
    assert "[Story] PROJ-49: Summary 49" in content
    assert "[Task] PROJ-50: Summary 50" in content
    assert "[Story] PROJ-99: Summary 99" in content
    assert "[Task] PROJ-100: Summary 100" in content
    assert "[Story] PROJ-119: Summary 119" in content
    
    assert progress_events[0][0] == "jira_issues_fetched"
    assert progress_events[0][1]["fetched"] == 120
    assert progress_events[0][1]["total"] == 120


# ── 4. Notion Ingestion Tests ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_notion_connector_iterative_dfs():
    connector = NotionConnector()

    # Setup deep block hierarchy:
    # Root Page (a06abefb213440692172982c3e7fe3db) children has Block A (has_children) and Block B (no children)
    # Block A has_children, child is Block A1 (no children)
    # We will also test cursor pagination on Block A's children:
    #   - Block A children fetch 1 returns Block A1 with next_cursor="cursor_a2"
    #   - Block A children fetch 2 returns Block A2
    
    async def mock_get(url, *args, **kwargs):
        mock_response = MagicMock()
        mock_response.status_code = 200
        
        # a06abefb213440692172982c3e7fe3db children
        if "blocks/a06abefb213440692172982c3e7fe3db/children" in url:
            mock_response.json = lambda: {
                "results": [
                    {
                        "id": "block-a",
                        "type": "paragraph",
                        "has_children": True,
                        "paragraph": {
                            "rich_text": [{"plain_text": "Block A text"}]
                        }
                    },
                    {
                        "id": "block-b",
                        "type": "paragraph",
                        "has_children": False,
                        "paragraph": {
                            "rich_text": [{"plain_text": "Block B text"}]
                        }
                    }
                ],
                "has_more": False
            }
        # block-a children pagination page 1
        elif "blocks/block-a/children" in url and "start_cursor" not in url:
            mock_response.json = lambda: {
                "results": [
                    {
                        "id": "block-a1",
                        "type": "paragraph",
                        "has_children": False,
                        "paragraph": {
                            "rich_text": [{"plain_text": "Block A1 nested text"}]
                        }
                    }
                ],
                "has_more": True,
                "next_cursor": "cursor_a2"
            }
        # block-a children pagination page 2
        elif "blocks/block-a/children" in url and "start_cursor=cursor_a2" in url:
            mock_response.json = lambda: {
                "results": [
                    {
                        "id": "block-a2",
                        "type": "paragraph",
                        "has_children": False,
                        "paragraph": {
                            "rich_text": [{"plain_text": "Block A2 nested text"}]
                        }
                    }
                ],
                "has_more": False
            }
        else:
            mock_response.json = lambda: {"results": [], "has_more": False}
            
        return mock_response

    progress_events = []
    def on_progress(event, data):
        progress_events.append((event, data))

    with patch("httpx.AsyncClient.get", side_effect=mock_get):
        # Passing URL containing 32-character hex ID
        content = await connector.ingest(
            url="https://notion.so/my-notion-page-a06abefb213440692172982c3e7fe3db",
            token="dummy_token",
            on_progress=on_progress
        )

    # Output text should preserve DFS reading order:
    # parent block, then child blocks, then sibling blocks
    expected_output = (
        "--- Notion Page: a06abefb213440692172982c3e7fe3db ---\n\n"
        "Block A text\n"
        "Block A1 nested text\n"
        "Block A2 nested text\n"
        "Block B text\n"
    )
    assert content == expected_output
    
    assert any(event == "notion_blocks_progress" for event, _ in progress_events)
    assert any(event == "notion_ingestion_complete" for event, _ in progress_events)


# ── 5. File Upload Ingestion Tests ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_file_upload_connector():
    connector = FileUploadConnector()
    
    with patch("apps.api.services.source_ingestion.file_upload_source.download_content", return_value="Mocked file content") as mock_download:
        content = await connector.ingest(url="local://logdir/archives/kb_id/test.txt")
        assert content == "Mocked file content"
        mock_download.assert_called_once_with("local://logdir/archives/kb_id/test.txt")


# ── 6. Ingestion Orchestrator Tests ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_ingest_source_orchestrator():
    # Test Confluence dispatch
    with patch("apps.api.services.source_ingestion.confluence_source.ConfluenceConnector.ingest", new_callable=AsyncMock) as mock_ingest:
        mock_ingest.return_value = "Confluence results"
        res = await ingest_source("confluence", "https://confluence.example.com/wiki/spaces/KEY", {"CONFLUENCE_API_TOKEN": "token1"})
        assert res == "Confluence results"
        mock_ingest.assert_called_once_with("https://confluence.example.com/wiki/spaces/KEY", "token1", on_progress=None)

    # Test Jira dispatch
    with patch("apps.api.services.source_ingestion.jira_source.JiraConnector.ingest", new_callable=AsyncMock) as mock_ingest:
        mock_ingest.return_value = "Jira results"
        res = await ingest_source("jira", "https://jira.example.com/rest/api/2/search/PROJ", {"JIRA_API_TOKEN": "token2"})
        assert res == "Jira results"
        mock_ingest.assert_called_once_with("https://jira.example.com/rest/api/2/search/PROJ", "token2", on_progress=None)

    # Test Notion dispatch
    with patch("apps.api.services.source_ingestion.notion_source.NotionConnector.ingest", new_callable=AsyncMock) as mock_ingest:
        mock_ingest.return_value = "Notion results"
        res = await ingest_source("notion", "https://notion.so/page1", {"NOTION_API_TOKEN": "token3"})
        assert res == "Notion results"
        mock_ingest.assert_called_once_with("https://notion.so/page1", "token3", on_progress=None)

    # Test File Upload dispatch
    with patch("apps.api.services.source_ingestion.file_upload_source.FileUploadConnector.ingest", new_callable=AsyncMock) as mock_ingest:
        mock_ingest.return_value = "Uploaded file contents"
        res = await ingest_source("upload", "local://path/to/file")
        assert res == "Uploaded file contents"
        mock_ingest.assert_called_once_with("local://path/to/file", None, on_progress=None)
