import asyncio
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'apps', 'api'))

from apps.api.core.config import settings
from apps.api.db.database import get_db
from apps.api.services.sse import SSEManager
from apps.api.agents.runner import run_generation_pipeline
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logging.basicConfig(level=logging.INFO)

async def test_run():
    # Setup DB
    db_gen = get_db()
    db = await anext(db_gen)
    sse = SSEManager()
    
    kb_id = "af06abef-b213-4406-9217-2982c3e7fe3d"
    
    print(f"Running pipeline for {kb_id}...")
    try:
        await run_generation_pipeline(kb_id, db, sse)
        print("Pipeline finished successfully!")
    except Exception as e:
        print(f"Pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        
if __name__ == "__main__":
    asyncio.run(test_run())
