from fastapi import APIRouter, Request, HTTPException, Header, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..core.security import validate_github_webhook_signature
from ..core.config import settings
from ..db.database import get_db
from ..db.models import SourceMonitor, KnowledgeBase, Org, KBStatus
from ..workers.tasks import gatekeeper_pipeline_task, rollup_pipeline_task
from ..services.gitops import get_commit_diff

router = APIRouter(prefix="/api/webhooks/github", tags=["Webhooks"])

@router.post("/push")
async def handle_github_push(
    request: Request,
    x_hub_signature_256: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    payload_bytes = await request.body()
    if not validate_github_webhook_signature(payload_bytes, x_hub_signature_256, settings.WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    repo_url = payload['repository']['html_url']
    after_sha = payload['after']
    
    result = await db.execute(select(SourceMonitor).where(SourceMonitor.repo_url == repo_url))
    monitors = result.scalars().all()
    
    for monitor in monitors:
        diff = get_commit_diff(payload['repository']['full_name'], after_sha)
        gatekeeper_pipeline_task.delay(str(monitor.kb_id), diff)
        monitor.last_commit_sha = after_sha
        
    await db.commit()
    return {"status": "accepted"}

@router.post("/pr")
async def handle_github_pr(
    request: Request,
    x_hub_signature_256: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    payload_bytes = await request.body()
    if not validate_github_webhook_signature(payload_bytes, x_hub_signature_256, settings.WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()
    if payload.get("action") == "closed" and payload.get("pull_request", {}).get("merged") == True:
        repo_url = payload['repository']['html_url']
        
        result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.git_repo_url == repo_url))
        kb = result.scalars().first()
        
        if kb:
            kb.status = KBStatus.published
            await db.commit()
            
            # Check for rollup trigger
            org_result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.org_id == kb.org_id, KnowledgeBase.status == KBStatus.published))
            published_kbs = org_result.scalars().all()
            
            if len(published_kbs) >= 2:
                rollup_pipeline_task.delay(str(kb.org_id))

    return {"status": "accepted"}
