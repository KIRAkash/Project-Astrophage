import asyncio
import os
import sys

sys.path.append(os.path.join(os.getcwd(), 'apps', 'api'))

from apps.api.agents.compiler import run_compiler, _build_manifest, _route_page
from apps.api.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)

SAMPLE_CODE = """
--- FILE: main.py ---
from fastapi import FastAPI
app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

--- FILE: models/user.py ---
from sqlalchemy import Column, String
class User:
    id = Column(String, primary_key=True)
    email = Column(String)
"""

class MockContext:
    def __init__(self):
        self.kb_id = "test-kb-id"
        self.app_name = "test_app"
        self.org_slug = "test_org"
        self.ingested_content = "FastAPI app with a health endpoint and a User SQLAlchemy model."
        self.raw_content = SAMPLE_CODE

async def test_manifest():
    plan = [
        {"path": "summaries/api-spec.md", "topic": "REST API endpoints"},
        {"path": "concepts/data-model.md", "topic": "Data model"},
        {"path": "entities/user.md", "topic": "User entity"},
    ]
    manifest = _build_manifest(plan)
    print("\n=== Manifest ===")
    print(manifest)
    assert "[[summaries/api-spec]]" in manifest
    assert "[[entities/user]]" in manifest
    print("✓ Manifest test passed")

def test_routing():
    print("\n=== Routing (hybrid mode) ===")
    settings.AI_MODE = "hybrid"
    assert _route_page("summaries/api-spec.md") == "local",  "summaries should be local"
    assert _route_page("entities/user.md") == "local",       "entities should be local"
    assert _route_page("concepts/pipeline.md") == "remote",  "concepts should be remote"
    assert _route_page("decisions/db-choice.md") == "remote","decisions should be remote"
    print("✓ Routing test passed")

    settings.AI_MODE = "local"
    assert _route_page("concepts/pipeline.md") == "local",   "all local in local mode"
    settings.AI_MODE = "remote"
    assert _route_page("entities/user.md") == "remote",      "all remote in remote mode"
    print("✓ Mode override routing test passed")

from unittest.mock import patch, AsyncMock

async def test_compile():
    print("\n=== Compiler (remote mode) ===")
    settings.AI_MODE = "remote"
    ctx = MockContext()
    with patch("apps.api.agents.llm_client.llm_client.generate", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = "# System Architecture\n[[summaries/api-spec]] [[entities/user]]"
        res = await run_compiler(ctx)
        print("Files generated:", list(res.keys()))
        assert "index.md" in res, "index.md must always be present"
        # Check wikilinks appear somewhere
        all_content = "\n".join(res.values())
        print(f"Total content length: {len(all_content)} chars")
        print("✓ Compiler test passed")

async def main():
    await test_manifest()
    test_routing()
    await test_compile()
    print("\n✅ All tests passed")

if __name__ == "__main__":
    asyncio.run(main())

