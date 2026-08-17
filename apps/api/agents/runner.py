import asyncio
import uuid
from dataclasses import dataclass
from typing import Literal, Optional, List
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from ..db.models import KnowledgeBase, KBStatus, KBEvent, Org, SourceMonitor, MonitorMode
from ..services.sse import SSEManager
from ..services.gitops import provision_kb_repo, commit_kb_to_branch, open_pull_request, register_push_webhook, register_pr_webhook
from .ingestor import run_ingestor
from .compiler import run_compiler
from .gatekeeper import run_gatekeeper
from .rollup import run_rollup
from ..core.config import settings

logger = logging.getLogger(__name__)

@dataclass
class AgentContext:
    kb_id: str
    org_slug: str
    app_name: str
    ingested_content: str = ""
    raw_content: str = ""
    compiled_files: dict = None
    affected_files: list = None
    decision: Literal['significant', 'trivial', 'none'] = 'none'

async def log_event(db: AsyncSession, kb_id: str, sse: SSEManager, event_type: str, payload: dict):
    kb_uuid = uuid.UUID(kb_id) if isinstance(kb_id, str) else kb_id
    event = KBEvent(kb_id=kb_uuid, event_type=event_type, payload=payload)
    db.add(event)
    await db.commit()
    await sse.broadcast(str(kb_id), {"type": event_type, "payload": payload})

_log_event = log_event

async def _update_kb_status(db: AsyncSession, kb: KnowledgeBase, status: KBStatus, sse: SSEManager, extra_payload: dict = None):
    kb.status = status
    await db.commit()
    payload = {"status": status.value}
    if extra_payload:
        payload.update(extra_payload)
    await log_event(db, str(kb.id), sse, "status_change", payload)

async def run_generation_pipeline(kb_id: str, db: AsyncSession, sse: SSEManager):
    kb_uuid = uuid.UUID(kb_id) if isinstance(kb_id, str) else kb_id
    kb = await db.get(KnowledgeBase, kb_uuid)
    if not kb:
        logger.error(f"KnowledgeBase {kb_id} not found")
        return
    org = await db.get(Org, kb.org_id)
    if not org:
        logger.error(f"Org not found for KB {kb_id}")
        return
    
    tokens = {
        'GITHUB_APP_TOKEN': settings.GITHUB_APP_TOKEN,
        'CONFLUENCE_API_TOKEN': settings.CONFLUENCE_API_TOKEN,
        'NOTION_API_TOKEN': settings.NOTION_API_TOKEN,
        'JIRA_API_TOKEN': settings.JIRA_API_TOKEN
    }

    try:
        # ── Step 1: Ingestion ──────────────────────────────────────────────
        await _update_kb_status(db, kb, KBStatus.ingesting, sse)
        await _log_event(db, str(kb.id), sse, "pipeline_started", {
            "status": "ingesting",
            "ai_mode": settings.AI_MODE,
        })

        context = AgentContext(kb_id=str(kb.id), org_slug=org.slug, app_name=kb.app_name)

        async def ingest_log_cb(event_type: str, payload: dict):
            try:
                from ..workers.db_session import get_db_sync
                async with get_db_sync() as event_db:
                    await _log_event(event_db, str(kb.id), sse, event_type, payload)
            except Exception as err:
                logger.warning(f"Failed to log event {event_type}: {err}")

        ingested_summary, raw_content = await run_ingestor(context, kb.source_urls, tokens, log_callback=ingest_log_cb)
        context.ingested_content = ingested_summary
        context.raw_content = raw_content
        await _log_event(db, str(kb.id), sse, "ingestion_complete", {
            "chars": len(ingested_summary),
            "raw_chars": len(raw_content),
        })

        # ── Step 2: Compilation ────────────────────────────────────────────
        await _update_kb_status(db, kb, KBStatus.generating, sse)
        await _log_event(db, str(kb.id), sse, "compilation_started", {"ai_mode": settings.AI_MODE})

        # Wrap run_compiler with per-page SSE events
        async def compile_with_events(ctx):
            """Run compiler and emit a page_compiled SSE event after each page."""
            from .compiler import run_compiler as _run_compiler
            # We monkey-patch the llm_client to emit progress events.
            # Simpler: run compiler normally, then emit a batch event.
            files = await _run_compiler(ctx)
            page_paths = [p for p in files if p != "index.md"]
            for i, path in enumerate(page_paths, 1):
                await _log_event(db, str(kb.id), sse, "page_compiled", {
                    "path": path,
                    "index": i,
                    "total": len(page_paths),
                })
            return files

        compiled_files = await compile_with_events(context)
        context.compiled_files = compiled_files
        await _log_event(db, str(kb.id), sse, "compilation_complete", {
            "file_count": len(compiled_files),
            "files": list(compiled_files.keys()),
        })


        # ── Step 3: GitOps — provision repo ───────────────────────────────
        github_org = org.github_org or getattr(settings, "GITHUB_DEFAULT_ORG", "openkb-astrophage")
        repo_url = provision_kb_repo(org.slug, kb.app_name, github_org)
        repo_full_name = "/".join(repo_url.rstrip("/").split("/")[-2:])
        kb.git_repo_url = repo_url
        await db.commit()
        await _log_event(db, str(kb.id), sse, "repo_provisioned", {"repo_url": repo_url})

        # ── Step 4: Commit to feature branch ──────────────────────────────
        feature_branch = "kb/initial-generation"
        commit_kb_to_branch(repo_full_name, feature_branch, compiled_files)

        # ── Step 5: Open PR to main ────────────────────────────────────────
        pr_url = open_pull_request(
            repo_full_name,
            feature_branch,
            f"🚀 Initial OpenKB: {kb.app_name}",
            (
                f"Automated knowledge base generated by **Astrophage**.\n\n"
                f"**Application:** `{kb.app_name}`\n"
                f"**Org:** `{org.slug}`\n\n"
                f"Please review the generated OpenKB structure and merge to publish."
            )
        )
        kb.pr_url = pr_url
        
        # Register a webhook on the KB repo itself to listen for PR merges
        try:
            register_pr_webhook(
                repo_full_name,
                f"{settings.WEBHOOK_BASE_URL}/api/webhooks/github/pr"
            )
        except Exception as e:
            logger.warning(f"Could not register PR webhook for KB repo {repo_full_name}: {e}")
            
        await db.commit()
        await _log_event(db, str(kb.id), sse, "pr_opened", {"pr_url": pr_url})

        # ── Step 6: Register push webhook on source repos (Flow B) ────────
        if settings.SOURCE_MONITOR_MODE == 'webhook':
            for source in kb.source_urls:
                s_type = source.get('type') if isinstance(source, dict) else getattr(source, 'type', None)
                s_url = source.get('url') if isinstance(source, dict) else getattr(source, 'url', None)
                if s_type == 'github' and s_url:
                    repo_name = "/".join(s_url.rstrip("/").split("/")[-2:])
                    try:
                        webhook_id = register_push_webhook(
                            repo_name,
                            f"{settings.WEBHOOK_BASE_URL}/api/webhooks/github/push"
                        )
                        monitor = SourceMonitor(
                            kb_id=kb.id,
                            repo_url=s_url,
                            webhook_id=webhook_id,
                            monitor_mode=MonitorMode.webhook,
                        )
                        db.add(monitor)
                    except Exception as e:
                        logger.warning(f"Could not register webhook for {s_url}: {e}. Falling back to polling monitor.")
                        monitor = SourceMonitor(
                            kb_id=kb.id,
                            repo_url=s_url,
                            webhook_id=None,
                            monitor_mode=MonitorMode.polling,
                        )
                        db.add(monitor)

        await db.commit()

        # ── Step 7: Status → in_review ─────────────────────────────────────
        await _update_kb_status(db, kb, KBStatus.in_review, sse, {"pr_url": pr_url})

    except Exception as e:
        logger.exception(f"Generation pipeline failed for KB {kb_id}: {e}")
        await _update_kb_status(db, kb, KBStatus.failed, sse, {"error": str(e)})
        await _log_event(db, str(kb.id), sse, "pipeline_error", {"error": str(e)})


async def run_gatekeeper_pipeline(kb_id: str, diff: str, db: AsyncSession, sse: SSEManager):
    """Flow B: Gatekeeper → conditional patch compilation → new PR."""
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb:
        return

    org = await db.get(Org, kb.org_id)

    try:
        # ── Gatekeeper classification ──────────────────────────────────────
        decision = await run_gatekeeper(diff)
        await _log_event(db, kb_id, sse, f"gatekeeper_{decision['decision']}", decision)

        if decision['decision'] == 'trivial':
            logger.info(f"Gatekeeper blocked update for KB {kb_id}: {decision['reason']}")
            return

        # ── Significant change: patch compile affected files ───────────────
        context = AgentContext(
            kb_id=kb_id,
            org_slug=org.slug,
            app_name=kb.app_name,
            ingested_content=f"Diff patch:\n{diff}",
            affected_files=decision.get('affected_files', []),
        )
        patch_files = await run_compiler(context, patch_files=decision.get('affected_files'))
        await _log_event(db, kb_id, sse, "patch_compiled", {"file_count": len(patch_files)})

        # ── Commit patch to new branch → open PR ──────────────────────────
        repo_full_name = "/".join(kb.git_repo_url.rstrip("/").split("/")[-2:])
        branch = f"kb/sync-{kb_id[:8]}-{diff[:8].strip().replace(' ', '-')}"
        commit_kb_to_branch(repo_full_name, branch, patch_files)
        pr_url = open_pull_request(
            repo_full_name,
            branch,
            f"🔄 KB Sync: {kb.app_name}",
            (
                f"**Gatekeeper** detected a significant change.\n\n"
                f"**Reason:** {decision['reason']}\n\n"
                f"**Affected KB files:** {', '.join(decision.get('affected_files', []))}"
            )
        )
        kb.pr_url = pr_url
        await _update_kb_status(db, kb, KBStatus.in_review, sse, {"pr_url": pr_url, "trigger": "sync"})

    except Exception as e:
        logger.exception(f"Gatekeeper pipeline failed for KB {kb_id}: {e}")
        await _log_event(db, kb_id, sse, "pipeline_error", {"error": str(e)})


async def run_rollup_pipeline(org_id: str, db: AsyncSession, sse: SSEManager):
    """Flow C: Read all published app KBs in org → Rollup Agent → Org KB repo PR."""
    org = await db.get(Org, org_id)
    if not org:
        return

    try:
        # ── Fetch all published app KBs for this org ───────────────────────
        result = await db.execute(
            select(KnowledgeBase)
            .where(KnowledgeBase.org_id == org_id, KnowledgeBase.status == KBStatus.published)
            .options(selectinload(KnowledgeBase.events))
        )
        published_kbs = result.scalars().all()

        if len(published_kbs) < 2:
            logger.info(f"Rollup skipped for org {org_id}: fewer than 2 published KBs")
            return

        # ── Build app KB content list for rollup agent ─────────────────────
        from ..services.gcs import download_content
        app_kbs = []
        for kb in published_kbs:
            index_content = ""
            if kb.gcs_archive_path:
                try:
                    index_content = download_content(f"{kb.gcs_archive_path}/index.md")
                except Exception:
                    index_content = f"# {kb.app_name}\n\nContent unavailable."
            app_kbs.append({"app_name": kb.app_name, "index": index_content})

        # ── Check for existing org KB ─────────────────────────────────────
        org_kb_result = await db.execute(select(OrgKB).where(OrgKB.org_id == org_id))
        existing_org_kb_record = org_kb_result.scalars().first()
        existing_content = None
        if existing_org_kb_record and existing_org_kb_record.git_repo_url:
            try:
                existing_content = download_content(f"org-kbs/{org_id}/index.md")
            except Exception:
                pass

        # ── Run Rollup Agent ───────────────────────────────────────────────
        org_files = await run_rollup(org_id, app_kbs, existing_content)
        logger.info(f"Rollup generated {len(org_files)} files for org {org_id}")

        # ── GitOps: provision org repo if needed ──────────────────────────
        github_org = org.github_org or getattr(settings, "GITHUB_DEFAULT_ORG", "openkb-astrophage")
        if existing_org_kb_record and existing_org_kb_record.git_repo_url:
            org_repo_url = existing_org_kb_record.git_repo_url
        else:
            org_repo_url = provision_org_kb_repo(org.slug, github_org)

        org_repo_full_name = "/".join(org_repo_url.rstrip("/").split("/")[-2:])
        branch = f"kb/rollup-{org_id[:8]}"
        commit_kb_to_branch(org_repo_full_name, branch, org_files)
        org_pr_url = open_pull_request(
            org_repo_full_name,
            branch,
            f"🌐 Org KB Rollup: {org.name}",
            (
                f"**Org-level knowledge base** updated by **Astrophage Rollup Agent**.\n\n"
                f"**Org:** `{org.name}`\n"
                f"**Contributing apps:** {', '.join([k['app_name'] for k in app_kbs])}\n\n"
                f"Review and merge to publish the updated org architecture map."
            )
        )

        # ── Persist OrgKB record ───────────────────────────────────────────
        if existing_org_kb_record:
            existing_org_kb_record.git_repo_url = org_repo_url
            existing_org_kb_record.pr_url = org_pr_url
            existing_org_kb_record.status = KBStatus.in_review
            existing_org_kb_record.trigger_count = len(published_kbs)
        else:
            new_org_kb = OrgKB(
                org_id=org_id,
                git_repo_url=org_repo_url,
                pr_url=org_pr_url,
                status=KBStatus.in_review,
                trigger_count=len(published_kbs),
            )
            db.add(new_org_kb)

        # Update org_pr_url on all contributing KBs
        for kb in published_kbs:
            kb.org_pr_url = org_pr_url
        await db.commit()

        logger.info(f"Rollup complete for org {org_id}: PR at {org_pr_url}")

        # ── Bubble up to parent org if applicable ─────────────────────────
        if org.parent_org_id:
            parent_published = await db.execute(
                select(KnowledgeBase).where(
                    KnowledgeBase.org_id == org.parent_org_id,
                    KnowledgeBase.status == KBStatus.published
                )
            )
            if len(parent_published.scalars().all()) >= 2:
                await run_rollup_pipeline(str(org.parent_org_id), db, sse)

    except Exception as e:
        logger.exception(f"Rollup pipeline failed for org {org_id}: {e}")
