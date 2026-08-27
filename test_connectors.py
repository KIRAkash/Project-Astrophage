import unittest
import asyncio
import httpx
from typing import Optional, Callable, Dict, Any

import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'apps', 'api'))

from apps.api.services.source_ingestion.base import (
    BaseConnector, IncrementalDelta, IngestionError, IngestionAuthError, IngestionRateLimitError
)
from apps.api.services.source_ingestion.confluence_source import ConfluenceConnector
from apps.api.services.source_ingestion.jira_source import JiraConnector
from apps.api.services.source_ingestion.notion_source import NotionConnector
from apps.api.services.source_ingestion.slack_source import SlackConnector
from apps.api.services.source_ingestion.github_source import GitHubConnector
from apps.api.services.source_ingestion.file_upload_source import FileUploadConnector
from apps.api.services.source_ingestion import (
    CONNECTOR_REGISTRY, register_connector, get_connector, ingest_source, check_source_updates
)

class MockResponse:
    def __init__(self, status_code: int, json_data: dict, text: str = ""):
        self.status_code = status_code
        self._json_data = json_data
        self.text = text

    def json(self):
        return self._json_data

class TestConnectors(unittest.IsolatedAsyncioTestCase):
    # 1. Interface validation & Registry contract
    def test_interface_contract(self):
        self.assertTrue(issubclass(ConfluenceConnector, BaseConnector))
        self.assertTrue(issubclass(JiraConnector, BaseConnector))
        self.assertTrue(issubclass(NotionConnector, BaseConnector))
        self.assertTrue(issubclass(SlackConnector, BaseConnector))
        self.assertTrue(issubclass(GitHubConnector, BaseConnector))
        self.assertTrue(issubclass(FileUploadConnector, BaseConnector))

        self.assertIn('github', CONNECTOR_REGISTRY)
        self.assertIn('confluence', CONNECTOR_REGISTRY)
        self.assertIn('notion', CONNECTOR_REGISTRY)
        self.assertIn('slack', CONNECTOR_REGISTRY)
        self.assertIn('jira', CONNECTOR_REGISTRY)
        self.assertIn('upload', CONNECTOR_REGISTRY)

    # 2. Confluence Pagination & Incremental test
    async def test_confluence_connector_pagination_and_incremental(self):
        mock_responses = {}
        
        mock_responses["https://example.atlassian.net/wiki/api/v2/spaces/TEST/pages"] = MockResponse(
            status_code=200,
            json_data={
                "results": [{"id": "page1", "title": "First Page", "version": {"number": 1}}],
                "_links": {"next": "/wiki/api/v2/spaces/TEST/pages?cursor=cursor2"}
            }
        )
        mock_responses["https://example.atlassian.net/wiki/api/v2/spaces/TEST/pages?cursor=cursor2"] = MockResponse(
            status_code=200,
            json_data={
                "results": [{"id": "page2", "title": "Second Page", "version": {"number": 1}}],
                "_links": {}
            }
        )
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
        
        self.assertIn("First Page", result)
        self.assertIn("Hello on Page 1", result)
        self.assertIn("Second Page", result)
        self.assertIn("Hello on Page 2", result)

        # Test incremental change detection with a newly added page2
        mock_responses["https://example.atlassian.net/wiki/api/v2/spaces/TEST/pages"] = MockResponse(
            status_code=200,
            json_data={
                "results": [
                    {"id": "page1", "title": "First Page", "version": {"number": 1}},
                    {"id": "page2", "title": "Second Page", "version": {"number": 1}},
                ],
                "_links": {}
            }
        )

        delta = await connector.check_incremental_updates(
            "https://example.atlassian.net/wiki/spaces/TEST",
            "dummy_token",
            last_state={"known_page_ids": {"page1": "1"}}
        )
        self.assertTrue(delta.has_changes)
        self.assertIn("page2", delta.new_state["known_page_ids"])
        self.assertIn("Confluence Space Updates", delta.delta_content)


    # 3. Jira Connector offset pagination & incremental
    async def test_jira_connector_pagination_and_incremental(self):
        mock_responses = {}
        
        mock_responses[0] = MockResponse(
            status_code=200,
            json_data={
                "issues": [{"key": f"TEST-{i}", "fields": {"summary": f"Issue {i}", "description": f"Desc {i}", "issuetype": {"name": "Task"}}} for i in range(1, 101)],
                "total": 200
            }
        )
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
        result = await connector.ingest("https://example.atlassian.net/jira/projects/TEST", "dummy_token")
        
        for i in (1, 50, 100, 150, 200):
            self.assertIn(f"TEST-{i}", result)
            self.assertIn(f"Issue {i}", result)

        delta = await connector.check_incremental_updates(
            "https://example.atlassian.net/jira/projects/TEST",
            "dummy_token",
            last_state={"known_keys": ["TEST-1", "TEST-2"], "last_synced_at": "2026-08-01 00:00"}
        )
        self.assertTrue(delta.has_changes)
        self.assertIn("Jira Project Updates", delta.delta_content)

    # 4. Slack Connector Ingestion & Incremental test
    async def test_slack_connector_ingestion_and_incremental(self):
        class MockSlackAsyncClient:
            async def get(self, url: str, headers: dict = None, params: dict = None):
                if "conversations.info" in url:
                    return MockResponse(200, {
                        "ok": True,
                        "channel": {"id": "C01234567", "name": "architecture", "topic": {"value": "System Design"}}
                    })
                elif "conversations.history" in url:
                    oldest = (params or {}).get("oldest")
                    if oldest:
                        return MockResponse(200, {
                            "ok": True,
                            "messages": [
                                {"ts": "1710000050.000", "user": "alice", "text": "Migrating to microservices"}
                            ]
                        })
                    return MockResponse(200, {
                        "ok": True,
                        "messages": [
                            {"ts": "1710000010.000", "user": "bob", "text": "Initial system architecture discussion", "reply_count": 1, "thread_ts": "1710000010.000"}
                        ]
                    })
                elif "conversations.replies" in url:
                    return MockResponse(200, {
                        "ok": True,
                        "messages": [
                            {"ts": "1710000010.000", "user": "bob", "text": "Root message"},
                            {"ts": "1710000020.000", "user": "charlie", "text": "Agreed on PostgreSQL as primary database."}
                        ]
                    })
                return MockResponse(404, {"ok": False, "error": "not_found"})

        connector = SlackConnector(MockSlackAsyncClient())
        result = await connector.ingest("https://workspace.slack.com/archives/C01234567", "xoxb-dummy-token")

        self.assertIn("architecture", result)
        self.assertIn("Initial system architecture discussion", result)
        self.assertIn("Agreed on PostgreSQL as primary database.", result)

        delta = await connector.check_incremental_updates(
            "https://workspace.slack.com/archives/C01234567",
            "xoxb-dummy-token",
            last_state={"latest_ts": "1710000010.000"}
        )
        self.assertTrue(delta.has_changes)
        self.assertIn("Migrating to microservices", delta.delta_content)
        self.assertEqual(delta.new_state["latest_ts"], "1710000050.000")

    # 5. Notion deep nesting DFS traversal
    async def test_notion_connector_deep_nesting(self):
        mock_responses = {}
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
                if "pages/" in url:
                    return MockResponse(200, {"last_edited_time": "2026-08-26T12:00:00.000Z", "properties": {}})
                block_id = url.split('/')[-2]
                results = mock_responses.get(block_id, [])
                return MockResponse(200, {"results": results, "has_more": False})

        connector = NotionConnector(MockAsyncClient())
        result = await connector.ingest("https://www.notion.so/my-notion-page-4a2a118d27774d0089852899477e900c", "dummy_token")
        
        self.assertIn("Root Content", result)
        for i in range(1, 14):
            self.assertIn(f"Nesting Level {i}", result)

    # 6. Ingestion Error mapping and credentials verification
    async def test_auth_failures(self):
        class MockAsyncClient:
            async def get(self, url: str, headers: dict = None, params: dict = None):
                return MockResponse(401, {}, text="Unauthorized API Token")

        connector = NotionConnector(MockAsyncClient())
        with self.assertRaises(IngestionAuthError):
            await connector.ingest("https://www.notion.so/my-notion-page-4a2a118d27774d0089852899477e900c", "invalid_token")

        slack_connector = SlackConnector(MockAsyncClient())
        with self.assertRaises(IngestionAuthError):
            await slack_connector.ingest("C01234567", "invalid_token")

if __name__ == '__main__':
    unittest.main()

    # 7. GitHub Connector Incremental check test
    async def test_github_connector_incremental(self):
        mock_responses = {}
        mock_responses["https://api.github.com/repos/org/repo/commits"] = MockResponse(
            status_code=200,
            json_data=[{"sha": "abcdef123456"}]
        )
        mock_responses["https://api.github.com/repos/org/repo/commits/abcdef123456"] = MockResponse(
            status_code=200,
            json_data={
                "commit": {"message": "Add user authentication endpoints", "author": {"name": "Alice Developer"}},
                "files": [
                    {"filename": "src/auth/jwt.py", "patch": "+def verify_token(): pass", "status": "added"}
                ]
            }
        )

        class MockAsyncClient:
            async def get(self, url: str, headers: dict = None, params: dict = None):
                return mock_responses.get(url, MockResponse(404, {}))

        connector = GitHubConnector(MockAsyncClient())
        delta = await connector.check_incremental_updates(
            "https://github.com/org/repo",
            "ghp_test_token",
            last_state={"last_commit_sha": "oldsha000000"}
        )
        self.assertTrue(delta.has_changes)
        self.assertEqual(delta.source_type, "github")
        self.assertIn("jwt.py", delta.affected_items)
        self.assertIn("verify_token", delta.delta_content)

    # 8. File Upload Connector test
    async def test_file_upload_connector(self):
        import tempfile
        with tempfile.NamedTemporaryFile("w+", suffix=".md", delete=False) as tf:
            tf.write("# Architecture Overview\nMicroservices system.")
            tf.flush()
            temp_path = tf.name

        connector = FileUploadConnector()
        content = await connector.ingest(temp_path, token=None)
        self.assertIn("Architecture Overview", content)
        self.assertIn("Microservices system.", content)

        delta = await connector.check_incremental_updates(temp_path, token=None)
        self.assertFalse(delta.has_changes)
        os.remove(temp_path)
