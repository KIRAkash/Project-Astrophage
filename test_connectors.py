import pytest
import asyncio
import httpx
from typing import Optional, Callable, Dict, Any

import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'apps', 'api'))

from apps.api.services.source_ingestion.base import (
    BaseConnector, IngestionError, IngestionAuthError, IngestionRateLimitError
)
from apps.api.services.source_ingestion.confluence_source import ConfluenceConnector
from apps.api.services.source_ingestion.jira_source import JiraConnector
from apps.api.services.source_ingestion.notion_source import NotionConnector
from apps.api.services.source_ingestion.file_upload_source import FileUploadConnector

class MockResponse:
    def __init__(self, status_code: int, json_data: dict, text: str = ""):
        self.status_code = status_code
        self._json_data = json_data
        self.text = text

    def json(self):
        return self._json_data

# 1. Interface validation
def test_interface_contract():
    # Verify we can find the BaseConnector as subclass of ABC
    assert issubclass(ConfluenceConnector, BaseConnector)
    assert issubclass(JiraConnector, BaseConnector)
    assert issubclass(NotionConnector, BaseConnector)
    assert issubclass(FileUploadConnector, BaseConnector)

# 2. Confluence Pagination test
@pytest.mark.asyncio
async def test_confluence_connector_pagination():
    mock_responses = {}
    
    # Page 1 of space retrieval
    mock_responses["https://example.atlassian.net/wiki/api/v2/spaces/TEST/pages"] = MockResponse(
        status_code=200,
        json_data={
            "results": [{"id": "page1", "title": "First Page"}],
            "_links": {"next": "/wiki/api/v2/spaces/TEST/pages?cursor=cursor2"}
        }
    )
    
    # Page 2 of space retrieval
    mock_responses["https://example.atlassian.net/wiki/api/v2/spaces/TEST/pages?cursor=cursor2"] = MockResponse(
        status_code=200,
        json_data={
            "results": [{"id": "page2", "title": "Second Page"}],
            "_links": {}
        }
    )
    
    # Page body content responses
    mock_responses["https://example.atlassian.net/wiki/api/v2/pages/page1?body-format=storage"] = MockResponse(
        status_code=200,
        json_data={"body": {"storage": {"value": "Hello on Page 1"}}}
    )
    mock_responses["https://example.atlassian.net/wiki/api/v2/pages/page2?body-format=storage"] = MockResponse(
        status_code=200,
        json_data={"body": {"storage": {"value": "Hello on Page 2"}}}
    )

    class MockAsyncClient:
        async def get(self, url: str, headers: dict = None, params: dict = None):
            full_url = url
            if params:
                query = "&".join(f"{k}={v}" for k, v in params.items())
                full_url = f"{url}?{query}"
            if full_url in mock_responses:
                return mock_responses[full_url]
            return MockResponse(404, {})

    connector = ConfluenceConnector(MockAsyncClient())
    result = await connector.ingest("https://example.atlassian.net/wiki/spaces/TEST", "dummy_token")
    
    assert "First Page" in result
    assert "Hello on Page 1" in result
    assert "Second Page" in result
    assert "Hello on Page 2" in result

# 3. Jira Connector offset pagination
@pytest.mark.asyncio
async def test_jira_connector_pagination():
    # Mocking a project with 200 issues (fetched in 2 batches of 100)
    mock_responses = {}
    
    # Batch 1 (startAt=0)
    mock_responses[0] = MockResponse(
        status_code=200,
        json_data={
            "issues": [{"key": f"TEST-{i}", "fields": {"summary": f"Issue {i}", "description": f"Desc {i}", "issuetype": {"name": "Task"}}} for i in range(1, 101)],
            "total": 200
        }
    )
    
    # Batch 2 (startAt=100)
    mock_responses[100] = MockResponse(
        status_code=200,
        json_data={
            "issues": [{"key": f"TEST-{i}", "fields": {"summary": f"Issue {i}", "description": f"Desc {i}", "issuetype": {"name": "Task"}}} for i in range(101, 201)],
            "total": 200
        }
    )

    class MockAsyncClient:
        async def get(self, url: str, headers: dict = None, params: dict = None):
            start_at = params.get("startAt", 0) if params else 0
            return mock_responses.get(start_at, MockResponse(404, {}))

    connector = JiraConnector(MockAsyncClient())
    result = await connector.ingest("https://example.atlassian.net/secure/RapidBoard.jspa?projectKey=TEST", "dummy_token")
    
    # Verify we fetched all 200 issues
    for i in (1, 50, 100, 150, 200):
        assert f"TEST-{i}" in result
        assert f"Issue {i}" in result

# 4. Notion deep nesting DFS traversal without stack overflow
@pytest.mark.asyncio
async def test_notion_connector_deep_nesting():
    # A highly nested hierarchy of 15 levels
    # Root -> Level 1 -> Level 2 -> ... -> Level 14 -> Leaf Page
    mock_responses = {}
    
    # Root block children
    mock_responses["4a2a118d27774d0089852899477e900c"] = [{"id": "level_1", "type": "paragraph", "paragraph": {"rich_text": [{"plain_text": "Root Content"}]}, "has_children": True}]
    
    for i in range(1, 15):
        parent = f"level_{i}"
        child = f"level_{i+1}"
        mock_responses[parent] = [{
            "id": child,
            "type": "paragraph",
            "paragraph": {"rich_text": [{"plain_text": f"Nesting Level {i}"}]},
            "has_children": True if i < 14 else False
        }]

    class MockAsyncClient:
        async def get(self, url: str, headers: dict = None, params: dict = None):
            # Extract block id from URL (https://api.notion.com/v1/blocks/{block_id}/children)
            block_id = url.split('/')[-2]
            results = mock_responses.get(block_id, [])
            return MockResponse(200, {"results": results, "has_more": False})

    connector = NotionConnector(MockAsyncClient())
    result = await connector.ingest("https://www.notion.so/my-notion-page-4a2a118d27774d0089852899477e900c", "dummy_token")
    
    assert "Root Content" in result
    for i in range(1, 14):
        assert f"Nesting Level {i}" in result

# 5. Ingestion Error mapping and credentials verification
@pytest.mark.asyncio
async def test_notion_connector_auth_failure():
    class MockAsyncClient:
        async def get(self, url: str, headers: dict = None, params: dict = None):
            return MockResponse(401, {}, text="Unauthorized API Token")

    connector = NotionConnector(MockAsyncClient())
    with pytest.raises(IngestionAuthError) as exc_info:
        await connector.ingest("https://www.notion.so/my-notion-page-4a2a118d27774d0089852899477e900c", "invalid_token")
    
    assert "Notion auth failed" in str(exc_info.value)
