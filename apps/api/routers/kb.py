from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
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
        select(KnowledgeBase).options(
            selectinload(KnowledgeBase.events),
            selectinload(KnowledgeBase.source_monitors)
        ).where(KnowledgeBase.id == val)
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="KB not found")
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
        select(KnowledgeBase).options(
            selectinload(KnowledgeBase.events),
            selectinload(KnowledgeBase.source_monitors)
        ).where(KnowledgeBase.id == val)
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="KB not found")

    if kb.status == KBStatus.in_review and kb.pr_url:
        # e.g. https://github.com/astrophage-org/kb-astrophage-cosimcity/pull/1
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

@router.post("/api/kb/{kb_id}/check-updates")
async def check_kb_updates(kb_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Inspect all configured sources (GitHub, Confluence, Notion, Slack, Jira) for updates and trigger Gatekeeper pipeline."""
    from ..workers.tasks import gatekeeper_pipeline_task
    from ..db.models import SourceMonitor, MonitorMode
    from ..agents.runner import log_event, run_gatekeeper_pipeline
    from ..services.source_ingestion import check_source_updates
    from datetime import datetime

    try:
        val = UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="KB not found")

    result = await db.execute(
        select(KnowledgeBase).options(
            selectinload(KnowledgeBase.events),
            selectinload(KnowledgeBase.source_monitors)
        ).where(KnowledgeBase.id == val)
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="KB not found")

    sse_manager = getattr(request.app.state, "sse_manager", None)

    # Ensure source monitors exist for all configured sources
    existing_monitors = {m.target_url: m for m in (kb.source_monitors or [])}
    sources = kb.source_urls or []
    if not sources and not existing_monitors:
        raise HTTPException(status_code=400, detail="No sources configured for this Knowledge Base.")

    for src in sources:
        s_type = src.get('type') if isinstance(src, dict) else getattr(src, 'type', 'github')
        s_url = src.get('url') if isinstance(src, dict) else getattr(src, 'url', '')
        s_incr = src.get('incremental_enabled', True) if isinstance(src, dict) else getattr(src, 'incremental_enabled', True)
        s_cfg = src.get('config', {}) if isinstance(src, dict) else getattr(src, 'config', {})
        if s_url and s_url not in existing_monitors:
            new_mon = SourceMonitor(
                kb_id=kb.id,
                source_type=s_type,
                repo_url=s_url,
                source_url=s_url,
                incremental_enabled=s_incr,
                config=s_cfg or {},
                last_sync_state={},
                monitor_mode=MonitorMode.polling,
            )
            db.add(new_mon)
            existing_monitors[s_url] = new_mon

    await db.commit()

    # Re-fetch monitors
    mon_res = await db.execute(select(SourceMonitor).where(SourceMonitor.kb_id == kb.id))
    monitors = mon_res.scalars().all()

    scan_results = []
    triggered_count = 0

    for mon in monitors:
        if not mon.incremental_enabled:
            scan_results.append({
                "source_type": mon.source_type,
                "source_url": mon.target_url,
                "status": "disabled",
                "message": "Incremental updates disabled for this source"
            })
            continue

        try:
            last_state = mon.last_sync_state or {}
            if mon.last_commit_sha and "last_commit_sha" not in last_state:
                last_state["last_commit_sha"] = mon.last_commit_sha

            delta = await check_source_updates(
                source_type=mon.source_type,
                url=mon.target_url,
                last_state=last_state,
                config=mon.config or {},
            )

            if delta.has_changes and delta.delta_content:
                # Update monitor state
                mon.last_sync_state = delta.new_state
                if "last_commit_sha" in delta.new_state:
                    mon.last_commit_sha = delta.new_state["last_commit_sha"]
                mon.last_synced_at = datetime.utcnow()
                await db.commit()

                if sse_manager:
                    await log_event(db, str(kb.id), sse_manager, "diff_checked", {
                        "source_type": delta.source_type,
                        "source_url": delta.source_url,
                        "summary": delta.summary,
                        "author": delta.author,
                        "affected_items": delta.affected_items,
                        "message": f"Detected changes from {delta.source_type.upper()}: {delta.summary}",
                    })

                # Trigger Gatekeeper Pipeline
                try:
                    gatekeeper_pipeline_task.delay(
                        kb_id=str(kb.id),
                        diff=delta.delta_content,
                        source_type=delta.source_type,
                        source_url=delta.source_url,
                        commit_sha=delta.new_state.get("last_commit_sha") or delta.new_state.get("latest_ts"),
                        commit_message=delta.summary,
                        affected_items=delta.affected_items,
                        author=delta.author,
                        summary=delta.summary,
                    )
                except Exception:
                    # Async fallback
                    if sse_manager:
                        asyncio.create_task(run_gatekeeper_pipeline(
                            kb_id=str(kb.id),
                            diff=delta.delta_content,
                            db=db,
                            sse=sse_manager,
                            commit_sha=delta.new_state.get("last_commit_sha") or delta.new_state.get("latest_ts"),
                            commit_message=delta.summary,
                            source_type=delta.source_type,
                            source_url=delta.source_url,
                            affected_items=delta.affected_items,
                            author=delta.author,
                            summary=delta.summary,
                        ))

                triggered_count += 1
                scan_results.append({
                    "source_type": delta.source_type,
                    "source_url": delta.source_url,
                    "status": "triggered",
                    "summary": delta.summary,
                    "affected_items": delta.affected_items,
                })
            else:
                mon.last_synced_at = datetime.utcnow()
                await db.commit()
                scan_results.append({
                    "source_type": mon.source_type,
                    "source_url": mon.target_url,
                    "status": "no_changes",
                    "summary": delta.summary or "No new updates detected",
                })

        except Exception as e:
            logger.error(f"Error checking updates for {mon.source_type} ({mon.target_url}): {e}")
            scan_results.append({
                "source_type": mon.source_type,
                "source_url": mon.target_url,
                "status": "error",
                "message": str(e),
            })

    status_str = "triggered" if triggered_count > 0 else "no_changes"
    message_str = f"Scanned {len(scan_results)} sources: {triggered_count} update(s) triggered Gatekeeper."

    return {
        "status": status_str,
        "message": message_str,
        "sources_scanned": scan_results,
        "triggered_count": triggered_count,
    }

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
    """Restart the entire pipeline from scratch, deleting all cached checkpoints."""
    from ..db.models import KBStatus, KBEvent
    from ..services.local_storage import clear_kb_checkpoints
    from ..workers.tasks import generation_pipeline_task
    try:
        val = UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="KB not found")
    result = await db.execute(
        select(KnowledgeBase).options(
            selectinload(KnowledgeBase.events),
            selectinload(KnowledgeBase.source_monitors)
        ).where(KnowledgeBase.id == val)
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="KB not found")
    
    # 1. Clean all saved checkpoints on disk
    clear_kb_checkpoints(str(kb.id))

    # 2. Reset status to queued
    kb.status = KBStatus.queued
    event = KBEvent(
        kb_id=kb.id,
        event_type="pipeline_restarted",
        payload={"status": "queued", "message": "Pipeline restarted from scratch (all cached checkpoints cleared)"}
    )
    db.add(event)
    await db.commit()
    await db.refresh(kb)
    
    generation_pipeline_task.delay(str(kb.id))
    
    result = await db.execute(
        select(KnowledgeBase).options(
            selectinload(KnowledgeBase.events),
            selectinload(KnowledgeBase.source_monitors)
        ).where(KnowledgeBase.id == val)
    )
    return result.scalars().first()

@router.post("/api/kb/{kb_id}/retry", response_model=KBDetailResponse)
async def retry_kb(kb_id: str, db: AsyncSession = Depends(get_db)):
    """Retry the pipeline resuming from existing saved checkpoints."""
    from ..db.models import KBStatus, KBEvent
    from ..workers.tasks import generation_pipeline_task
    try:
        val = UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="KB not found")
    result = await db.execute(
        select(KnowledgeBase).options(
            selectinload(KnowledgeBase.events),
            selectinload(KnowledgeBase.source_monitors)
        ).where(KnowledgeBase.id == val)
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="KB not found")
    
    # Keep existing checkpoints on disk for resume
    kb.status = KBStatus.queued
    event = KBEvent(
        kb_id=kb.id,
        event_type="pipeline_retried",
        payload={"status": "queued", "message": "Pipeline retry requested (resuming from saved checkpoints)"}
    )
    db.add(event)
    await db.commit()
    await db.refresh(kb)
    
    generation_pipeline_task.delay(str(kb.id))
    
    result = await db.execute(
        select(KnowledgeBase).options(
            selectinload(KnowledgeBase.events),
            selectinload(KnowledgeBase.source_monitors)
        ).where(KnowledgeBase.id == val)
    )
    return result.scalars().first()

@router.get("/api/upload/presigned")
async def get_presigned_url(filename: str):
    url = generate_presigned_upload_url(filename)
    return {"url": url}

@router.post("/api/upload/file")
async def upload_file(
    file: UploadFile = File(...),
    kb_id: Optional[str] = None
):
    """Directly upload a file to GCS or local storage."""
    from ..services.local_storage import upload_content
    import uuid

    target_kb = kb_id or "shared_uploads"
    content_bytes = await file.read()
    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_str = base64.b64encode(content_bytes).decode("utf-8")

    filename = f"{uuid.uuid4().hex[:8]}_{file.filename}"
    storage_path = upload_content(target_kb, filename, content_str)
    return {
        "filename": file.filename,
        "storage_path": storage_path,
        "size_bytes": len(content_bytes),
        "status": "uploaded"
    }


@router.get("/api/kb/resolve")
async def resolve_kb(target: str, db: AsyncSession = Depends(get_db)):
    """Resolve a target identifier (repo name, app slug, or UUID) to a Knowledge Base ID."""
    clean_target = target.strip().lower()
    
    # 1. Try UUID match
    try:
        val = UUID(clean_target)
        res = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == val))
        kb = res.scalars().first()
        if kb:
            return {"kb_id": str(kb.id), "app_name": kb.app_name, "git_repo_url": kb.git_repo_url}
    except ValueError:
        pass

    # 2. Query all KBs and match by git_repo_url or app_name
    res = await db.execute(select(KnowledgeBase))
    all_kbs = res.scalars().all()

    for kb in all_kbs:
        # Match git_repo_url ending with target
        if kb.git_repo_url:
            repo_slug = kb.git_repo_url.rstrip("/").split("/")[-1].lower()
            if repo_slug == clean_target or repo_slug.replace(".git", "") == clean_target:
                return {"kb_id": str(kb.id), "app_name": kb.app_name, "git_repo_url": kb.git_repo_url}

        # Match app_name exact or normalized
        clean_app = kb.app_name.lower().replace("_", "-").replace(" ", "-")
        if clean_app == clean_target or kb.app_name.lower() == clean_target:
            return {"kb_id": str(kb.id), "app_name": kb.app_name, "git_repo_url": kb.git_repo_url}

        # Match repo without org prefix (e.g., target: kb-apex-financial-services-order-matching-engine, app: order-matching-engine)
        if clean_target.endswith(clean_app) or clean_target.endswith(clean_app.replace("-", "")):
            return {"kb_id": str(kb.id), "app_name": kb.app_name, "git_repo_url": kb.git_repo_url}

    raise HTTPException(status_code=404, detail=f"Target KB '{target}' not found")


@router.get("/api/kb/{kb_id}/tree")
async def get_kb_tree(kb_id: str, db: AsyncSession = Depends(get_db)):
    from ..services.gitops import get_github_client
    from ..services.local_storage import load_checkpoint_json
    try:
        val = UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="KB not found")
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.id == val)
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="KB not found")
        
    if kb.git_repo_url:
        parts = kb.git_repo_url.split("/")
        if len(parts) >= 2:
            repo_full_name = f"{parts[-2]}/{parts[-1]}"
            try:
                g = get_github_client()
                repo = g.get_repo(repo_full_name)
                branch_name = repo.default_branch
                try:
                    branch = repo.get_branch(branch_name)
                except Exception:
                    branch = repo.get_branch("kb/initial-generation")
                tree = repo.get_git_tree(branch.commit.sha, recursive=True)
                return {"tree": [{"path": el.path, "type": el.type, "sha": el.sha} for el in tree.tree]}
            except Exception as e:
                logger.warning(f"Failed to fetch tree from GitHub for {repo_full_name}: {e}. Falling back to compiled checkpoints.")

    # Local / GCS checkpoint fallback
    compiled_files = load_checkpoint_json(kb_id, "compiled_files.json")
    if compiled_files:
        tree = [{"path": p, "type": "blob", "sha": "local"} for p in sorted(compiled_files.keys())]
        return {"tree": tree}

    raise HTTPException(status_code=404, detail="KB files not found")

@router.get("/api/kb/{kb_id}/file")
async def get_kb_file(kb_id: str, path: str, db: AsyncSession = Depends(get_db)):
    from ..services.gitops import get_github_client
    from ..services.local_storage import load_checkpoint_json
    try:
        val = UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="KB not found")
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.id == val)
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="KB not found")
        
    # Clean and normalize path
    clean_path = path.split("#")[0].strip().lstrip("./")
    if not clean_path.endswith(".md") and not "." in clean_path.split("/")[-1]:
        clean_path = f"{clean_path}.md"

    if kb.git_repo_url:
        parts = kb.git_repo_url.split("/")
        if len(parts) >= 2:
            repo_full_name = f"{parts[-2]}/{parts[-1]}"
            try:
                g = get_github_client()
                repo = g.get_repo(repo_full_name)
                try:
                    file_content = repo.get_contents(clean_path)
                except Exception:
                    file_content = repo.get_contents(clean_path, ref="kb/initial-generation")
                if isinstance(file_content, list):
                    raise HTTPException(status_code=400, detail="Path is a directory")
                content = base64.b64decode(file_content.content).decode('utf-8')
                return {"content": content}
            except Exception as e:
                logger.warning(f"Failed to fetch file '{clean_path}' from GitHub: {e}. Falling back to compiled checkpoints.")

    # Local / GCS checkpoint fallback
    compiled_files = load_checkpoint_json(kb_id, "compiled_files.json")
    if compiled_files and clean_path in compiled_files:
        return {"content": compiled_files[clean_path]}

    raise HTTPException(status_code=404, detail=f"File '{clean_path}' not found in KB")


@router.get("/api/kb/{kb_id}/digest")
async def get_kb_digest(kb_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch the compact architecture digest (<4,000 chars) for prompt injection."""
    from ..services.local_storage import load_checkpoint_json
    from ..agents.digest import generate_architecture_digest

    try:
        val = UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="KB not found")
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == val))
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="KB not found")

    cached_files = load_checkpoint_json(kb_id, "compiled_files.json") or {}
    if ".astrophage/brief.md" in cached_files:
        digest = cached_files[".astrophage/brief.md"]
    else:
        digest = generate_architecture_digest(kb.app_name, "org", cached_files)

    return {"digest": digest, "char_count": len(digest), "app_name": kb.app_name}


@router.get("/api/kb/{kb_id}/lint")
async def get_kb_lint_report(kb_id: str, db: AsyncSession = Depends(get_db)):
    """Run the deterministic quality gate on the current knowledge base."""
    from ..services.local_storage import load_checkpoint_json
    from ..agents.linter import run_linter

    cached_files = load_checkpoint_json(kb_id, "compiled_files.json") or {}
    if not cached_files:
        raise HTTPException(status_code=404, detail="Compiled KB files not found")

    report = run_linter(cached_files)
    return report



@router.post("/api/kb/{kb_id}/add-source", response_model=dict)
async def add_source_to_kb(kb_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    from ..db.schemas import AddSourceRequest
    from ..db.models import SourceMonitor, MonitorMode
    from ..workers.tasks import add_source_pipeline_task
    from ..services.gitops import register_push_webhook
    
    body = await request.json()
    source_req = AddSourceRequest(**body)
    
    try:
        val = UUID(kb_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="KB not found")
        
    result = await db.execute(
        select(KnowledgeBase).options(
            selectinload(KnowledgeBase.events),
            selectinload(KnowledgeBase.source_monitors)
        ).where(KnowledgeBase.id == val)
    )
    kb = result.scalars().first()
    if not kb:
        raise HTTPException(status_code=404, detail="KB not found")
        
    # Check duplicates
    existing_urls = [m.target_url for m in (kb.source_monitors or [])]
    if source_req.url in existing_urls:
        return {
            "status": "duplicate",
            "message": f"Source {source_req.url} is already registered.",
            "source_added": None,
            "kb": kb
        }
        
    # Append to kb.source_urls
    sources = kb.source_urls or []
    new_source_dict = {
        "type": source_req.type,
        "url": source_req.url,
        "incremental_enabled": source_req.incremental_enabled,
        "config": source_req.config or {}
    }
    
    # We must explicitly set to trigger SQLAlchemy JSON update
    new_sources = list(sources)
    new_sources.append(new_source_dict)
    kb.source_urls = new_sources
    
    # Register source monitor
    webhook_id = None
    monitor_mode = MonitorMode.polling
    
    from ..core.config import settings
    if source_req.type == 'github' and settings.SOURCE_MONITOR_MODE == 'webhook':
        repo_name = "/".join(source_req.url.rstrip("/").split("/")[-2:])
        try:
            webhook_id = register_push_webhook(
                repo_name,
                f"{settings.WEBHOOK_BASE_URL}/api/webhooks/github/push"
            )
            monitor_mode = MonitorMode.webhook
        except Exception:
            monitor_mode = MonitorMode.polling

    new_monitor = SourceMonitor(
        kb_id=kb.id,
        source_type=source_req.type,
        repo_url=source_req.url,
        source_url=source_req.url,
        incremental_enabled=source_req.incremental_enabled,
        config=source_req.config or {},
        last_sync_state={},
        webhook_id=webhook_id,
        monitor_mode=monitor_mode,
    )
    db.add(new_monitor)
    await db.commit()
    await db.refresh(kb)
    
    # Trigger Pipeline Task
    add_source_pipeline_task.delay(str(kb.id), new_source_dict)
    
    return {
        "status": "pipeline_started",
        "message": "Source added and incremental pipeline started",
        "source_added": new_source_dict,
        "kb": kb
    }


# ─────────────────────────────────────────────────────────────────
# PUBLIC (no-auth) endpoints for the `ap` CLI / Astrophage Skill
# ─────────────────────────────────────────────────────────────────

def _normalize_repo_url(url: str) -> str:
    """
    Normalize a Git repo URL for reliable comparison.
    Handles: https://github.com/org/repo.git  git@github.com:org/repo.git
    Returns:  github.com/org/repo  (lowercase, no protocol, no .git suffix)
    """
    import re
    url = url.strip().lower()
    # Convert SSH → HTTPS style: git@github.com:org/repo → github.com/org/repo
    url = re.sub(r'^git@([^:]+):', r'\1/', url)
    # Strip protocol prefix
    url = re.sub(r'^https?://', '', url)
    # Strip trailing .git
    url = re.sub(r'\.git$', '', url)
    # Strip trailing slash
    url = url.rstrip('/')
    return url


@router.get("/api/public/kb/discover", tags=["Public"])
async def public_discover_kb(repo_url: str, db: AsyncSession = Depends(get_db)):
    """
    No-auth endpoint: check if a source repo URL has an Astrophage KB.
    Used by the `ap discover` CLI command.

    Returns KB metadata + linked KBs if found, or a list of all published KBs
    so the caller can pick the closest match.
    """
    from ..db.models import KBStatus
    from sqlalchemy.orm import selectinload

    normalized_query = _normalize_repo_url(repo_url)

    # Fetch all published KBs with their source monitors
    result = await db.execute(
        select(KnowledgeBase)
        .options(
            selectinload(KnowledgeBase.source_monitors),
            selectinload(KnowledgeBase.org),
        )
        .where(KnowledgeBase.status == KBStatus.published)
    )
    all_kbs = result.scalars().all()

    matched_kb = None
    for kb in all_kbs:
        # Check against kb-level git_repo_url (the KB output repo — not the source)
        # and all source_urls / source monitor URLs
        candidate_urls = []
        if kb.source_urls:
            for src in kb.source_urls:
                if isinstance(src, dict):
                    candidate_urls.append(src.get("url", ""))
                elif isinstance(src, str):
                    candidate_urls.append(src)
        for monitor in (kb.source_monitors or []):
            candidate_urls.append(monitor.repo_url or "")
            candidate_urls.append(monitor.source_url or "")

        for candidate in candidate_urls:
            if candidate and _normalize_repo_url(candidate) == normalized_query:
                matched_kb = kb
                break
        if matched_kb:
            break

    if matched_kb:
        # Find linked KBs: other published KBs in the same org
        siblings = [
            {
                "kb_name": f"openkb-{kb.app_name.lower().replace(' ', '-')}",
                "app_name": kb.app_name,
                "kb_repo_url": kb.git_repo_url,
                "status": kb.status.value,
            }
            for kb in all_kbs
            if kb.id != matched_kb.id and kb.org_id == matched_kb.org_id
        ]
        return {
            "found": True,
            "kb_name": f"openkb-{matched_kb.app_name.lower().replace(' ', '-')}",
            "app_name": matched_kb.app_name,
            "kb_repo_url": matched_kb.git_repo_url,
            "status": matched_kb.status.value,
            "org_name": matched_kb.org.name if matched_kb.org else None,
            "org_slug": matched_kb.org.slug if matched_kb.org else None,
            "linked_kbs": siblings,
        }

    # Not found — return full list so the caller can offer alternatives
    suggestions = [
        {
            "kb_name": f"openkb-{kb.app_name.lower().replace(' ', '-')}",
            "app_name": kb.app_name,
            "kb_repo_url": kb.git_repo_url,
            "status": kb.status.value,
            "org_name": kb.org.name if kb.org else None,
        }
        for kb in all_kbs
    ]
    return {
        "found": False,
        "kb_name": None,
        "kb_repo_url": None,
        "status": None,
        "linked_kbs": [],
        "suggestions": suggestions,
    }


@router.get("/api/public/kb/list", tags=["Public"])
async def public_list_kbs(db: AsyncSession = Depends(get_db)):
    """
    No-auth endpoint: list all published Astrophage KBs.
    Used by the `ap list` CLI command.
    """
    from ..db.models import KBStatus
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(KnowledgeBase)
        .options(selectinload(KnowledgeBase.org))
        .where(KnowledgeBase.status == KBStatus.published)
        .order_by(KnowledgeBase.updated_at.desc())
    )
    kbs = result.scalars().all()
    return [
        {
            "kb_name": f"openkb-{kb.app_name.lower().replace(' ', '-')}",
            "app_name": kb.app_name,
            "kb_repo_url": kb.git_repo_url,
            "status": kb.status.value,
            "org_name": kb.org.name if kb.org else None,
            "org_slug": kb.org.slug if kb.org else None,
            "updated_at": kb.updated_at.isoformat() if kb.updated_at else None,
        }
        for kb in kbs
    ]


@router.post("/api/kb/{kb_id}/guard")
async def check_diff_constraints(kb_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Evaluate an incoming git diff or prompt against active architectural constraints."""
    from ..services.local_storage import load_checkpoint_json
    from ..agents.guard import extract_constraints_from_kb, evaluate_diff_against_constraints

    body = await request.json()
    diff_text = body.get("diff", "")
    if not diff_text:
        raise HTTPException(status_code=400, detail="Missing 'diff' field in request body")

    cached_files = load_checkpoint_json(kb_id, "compiled_files.json") or {}
    constraints = extract_constraints_from_kb(cached_files)
    violations = evaluate_diff_against_constraints(diff_text, constraints)

    return {
        "is_compliant": len(violations) == 0,
        "total_constraints_evaluated": len(constraints),
        "violations": violations,
    }
