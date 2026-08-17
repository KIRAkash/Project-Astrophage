from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID
from ..db.database import get_db
from ..db.models import KnowledgeBase
from ..db.schemas import KBResponse, KBDetailResponse
from ..services.local_storage import generate_presigned_upload_url
import asyncio
import base64

router = APIRouter(tags=["Knowledge Bases"])

@router.get("/api/kb", response_model=List[KBResponse])
async def list_kbs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KnowledgeBase))
    return result.scalars().all()

@router.get("/api/kb/{kb_id}", response_model=KBDetailResponse)
async def get_kb(kb_id: str, db: AsyncSession = Depends(get_db)):
    try:
        val = UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="KB not found")
    result = await db.execute(
        select(KnowledgeBase).options(selectinload(KnowledgeBase.events)).where(KnowledgeBase.id == val)
    )
    kb = result.scalars().first()
    return kb

@router.post("/api/kb/{kb_id}/sync", response_model=KBDetailResponse)
async def sync_kb_status(kb_id: str, db: AsyncSession = Depends(get_db)):
    from ..db.models import KBStatus, KBEvent
    from ..services.gitops import get_github_client
    from ..workers.tasks import rollup_pipeline_task
    try:
        val = UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="KB not found")
    
    result = await db.execute(
        select(KnowledgeBase).options(selectinload(KnowledgeBase.events)).where(KnowledgeBase.id == val)
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="KB not found")

    if kb.status == KBStatus.in_review and kb.pr_url:
        # e.g. https://github.com/Astrophase/kb-astrophage-cosimcity/pull/1
        parts = kb.pr_url.split("/")
        if len(parts) >= 4:
            owner = parts[-4]
            repo_name = parts[-3]
            pr_num = int(parts[-1])
            repo_full_name = f"{owner}/{repo_name}"
            
            g = get_github_client()
            repo = g.get_repo(repo_full_name)
            pr = repo.get_pull(pr_num)
            
            if pr.is_merged():
                kb.status = KBStatus.published
                event = KBEvent(kb_id=kb.id, event_type="status_change", payload={"status": "published", "message": "PR was merged"})
                db.add(event)
                await db.commit()
                await db.refresh(kb)
                
                # Trigger rollup if needed
                org_result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.org_id == kb.org_id, KnowledgeBase.status == KBStatus.published))
                published_kbs = org_result.scalars().all()
                if len(published_kbs) >= 2:
                    rollup_pipeline_task.delay(str(kb.org_id))

    return kb

@router.get("/api/kb/{kb_id}/stream")
async def kb_stream(kb_id: str, request: Request):
    sse_manager = request.app.state.sse_manager
    queue = await sse_manager.subscribe(str(kb_id))
    
    async def event_publisher():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=1.0)
                    yield event
                except asyncio.TimeoutError:
                    pass
        finally:
            await sse_manager.unsubscribe(str(kb_id), queue)

    return EventSourceResponse(event_publisher())

@router.post("/api/kb/{kb_id}/restart", response_model=KBDetailResponse)
async def restart_kb(kb_id: str, db: AsyncSession = Depends(get_db)):
    from ..db.models import KBStatus, KBEvent
    from ..workers.tasks import generation_pipeline_task
    try:
        val = UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="KB not found")
    result = await db.execute(
        select(KnowledgeBase).options(selectinload(KnowledgeBase.events)).where(KnowledgeBase.id == val)
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="KB not found")
    
    kb.status = KBStatus.queued
    event = KBEvent(kb_id=kb.id, event_type="pipeline_restarted", payload={"status": "queued", "message": "Pipeline restart requested by user"})
    db.add(event)
    await db.commit()
    await db.refresh(kb)
    
    generation_pipeline_task.delay(str(kb.id))
    
    result = await db.execute(
        select(KnowledgeBase).options(selectinload(KnowledgeBase.events)).where(KnowledgeBase.id == val)
    )
    return result.scalars().first()

@router.get("/api/upload/presigned")
async def get_presigned_url(filename: str):
    url = generate_presigned_upload_url(filename)
    return {"url": url}

@router.get("/api/kb/{kb_id}/tree")
async def get_kb_tree(kb_id: str, db: AsyncSession = Depends(get_db)):
    from ..services.gitops import get_github_client
    try:
        val = UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="KB not found")
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.id == val)
    )
    kb = result.scalars().first()
    if not kb or not kb.git_repo_url:
        raise HTTPException(status_code=404, detail="KB repo not found")
        
    parts = kb.git_repo_url.split("/")
    if len(parts) >= 2:
        repo_full_name = f"{parts[-2]}/{parts[-1]}"
        g = get_github_client()
        try:
            repo = g.get_repo(repo_full_name)
            branch = repo.get_branch(repo.default_branch)
            tree = repo.get_git_tree(branch.commit.sha, recursive=True)
            return {"tree": [{"path": el.path, "type": el.type, "sha": el.sha} for el in tree.tree]}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=400, detail="Invalid repo url")

@router.get("/api/kb/{kb_id}/file")
async def get_kb_file(kb_id: str, path: str, db: AsyncSession = Depends(get_db)):
    from ..services.gitops import get_github_client
    try:
        val = UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="KB not found")
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.id == val)
    )
    kb = result.scalars().first()
    if not kb or not kb.git_repo_url:
        raise HTTPException(status_code=404, detail="KB repo not found")
        
    parts = kb.git_repo_url.split("/")
    if len(parts) >= 2:
        repo_full_name = f"{parts[-2]}/{parts[-1]}"
        g = get_github_client()
        try:
            repo = g.get_repo(repo_full_name)
            file_content = repo.get_contents(path)
            if isinstance(file_content, list):
                raise HTTPException(status_code=400, detail="Path is a directory")
            content = base64.b64decode(file_content.content).decode('utf-8')
            return {"content": content}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=400, detail="Invalid repo url")
