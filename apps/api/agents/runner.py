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
from .llm_client import get_env_var
from ..core.config import settings

from ..services.discovery import extract_discovered_signatures, get_all_searchable_identifiers
from .contracts import find_matching_cross_kb_contracts, register_kb_contracts

logger = logging.getLogger(__name__)

@dataclass
class AgentContext:
    kb_id: str
    org_slug: str
    app_name: str
    org_id: str = ""
    ingested_content: str = ""
    raw_content: str = ""
    compiled_files: dict = None
    affected_files: list = None
    decision: Literal['significant', 'trivial', 'none'] = 'none'
    discovered_identifiers: list = None
    candidate_contracts: list = None

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
        active_ai_mode = get_env_var("AI_MODE", getattr(settings, "AI_MODE", "remote"))
        await _log_event(db, str(kb.id), sse, "pipeline_started", {
            "status": "ingesting",
            "ai_mode": active_ai_mode,
        })

        context = AgentContext(
            kb_id=str(kb.id),
            org_slug=org.slug,
            app_name=kb.app_name,
            org_id=str(org.id),
        )

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

        # Automated Cross-Repository Discovery Scanner
        discovered = extract_discovered_signatures(raw_content)
        discovered_identifiers = get_all_searchable_identifiers(discovered)
        context.discovered_identifiers = discovered_identifiers

        # Query existing Org Interface Contracts for candidate connections
        candidate_contracts = await find_matching_cross_kb_contracts(
            db, str(org.id), kb.app_name, discovered_identifiers
        )
        context.candidate_contracts = candidate_contracts

        await _log_event(db, str(kb.id), sse, "ingestion_complete", {
            "chars": len(ingested_summary),
            "raw_chars": len(raw_content),
            "discovered_signatures": len(discovered_identifiers),
            "matched_cross_kbs": len(candidate_contracts),
        })

        # ── Step 2: Compilation ────────────────────────────────────────────
        await _update_kb_status(db, kb, KBStatus.generating, sse)
        await _log_event(db, str(kb.id), sse, "compilation_started", {
            "ai_mode": active_ai_mode,
            "matched_cross_kbs": len(candidate_contracts),
        })

        # Wrap run_compiler with per-page SSE events
        async def compile_with_events(ctx):
            """Run compiler and emit a page_compiled SSE event after each page."""
            from .compiler import run_compiler as _run_compiler
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

        # ── Step 2.5: Register exported interface contracts into Org Catalog ─
        registered_count = await register_kb_contracts(
            db, str(org.id), str(kb.id), kb.app_name, compiled_files
        )
        await _log_event(db, str(kb.id), sse, "contracts_registered", {
            "registered_contracts": registered_count,
            "app_name": kb.app_name,
        })


        # ── Step 3: GitOps — provision repo ───────────────────────────────
        github_org = org.github_org or getattr(settings, "GITHUB_DEFAULT_ORG", "Astrophase")
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

        # ── Step 6: Register monitors for all configured sources (Flow B) ─
        for source in (kb.source_urls or []):
            s_type = source.get('type') if isinstance(source, dict) else getattr(source, 'type', 'github')
            s_url = source.get('url') if isinstance(source, dict) else getattr(source, 'url', '')
            s_incr = source.get('incremental_enabled', True) if isinstance(source, dict) else getattr(source, 'incremental_enabled', True)
            s_config = source.get('config', {}) if isinstance(source, dict) else getattr(source, 'config', {})

            if not s_url:
                continue

            webhook_id = None
            monitor_mode = MonitorMode.polling

            if s_type == 'github' and settings.SOURCE_MONITOR_MODE == 'webhook':
                repo_name = "/".join(s_url.rstrip("/").split("/")[-2:])
                try:
                    webhook_id = register_push_webhook(
                        repo_name,
                        f"{settings.WEBHOOK_BASE_URL}/api/webhooks/github/push"
                    )
                    monitor_mode = MonitorMode.webhook
                except Exception as e:
                    logger.warning(f"Could not register webhook for {s_url}: {e}. Falling back to polling monitor.")
                    monitor_mode = MonitorMode.polling

            monitor = SourceMonitor(
                kb_id=kb.id,
                source_type=s_type,
                repo_url=s_url,
                source_url=s_url,
                webhook_id=webhook_id,
                last_commit_sha=None,
                last_sync_state={},
                config=s_config or {},
                incremental_enabled=s_incr,
                monitor_mode=monitor_mode,
            )
            db.add(monitor)

        await db.commit()

        # ── Step 7: Status → in_review ─────────────────────────────────────
        await _update_kb_status(db, kb, KBStatus.in_review, sse, {"pr_url": pr_url})

    except Exception as e:
        logger.exception(f"Generation pipeline failed for KB {kb_id}: {e}")
        await _update_kb_status(db, kb, KBStatus.failed, sse, {"error": str(e)})
        await _log_event(db, str(kb.id), sse, "pipeline_error", {"error": str(e)})


async def run_gatekeeper_pipeline(
    kb_id: str,
    diff: str,
    db: AsyncSession,
    sse: SSEManager,
    commit_sha: str = None,
    commit_message: str = None,
    source_type: str = "github",
    source_url: str = None,
    affected_items: list = None,
    author: str = None,
    summary: str = None,
):
    """Flow B: Gatekeeper → conditional patch compilation → new PR."""
    kb_uuid = uuid.UUID(kb_id) if isinstance(kb_id, str) else kb_id
    kb = await db.get(KnowledgeBase, kb_uuid)
    if not kb:
        logger.error(f"KnowledgeBase {kb_id} not found for gatekeeper pipeline")
        return

    org = await db.get(Org, kb.org_id)
    org_slug = org.slug if org else "default"

    try:
        logger.info(f"🛡️ [Gatekeeper] Starting evaluation for KB {kb.app_name} (Source: {source_type})")
        await _log_event(db, str(kb.id), sse, "gatekeeper_evaluation_started", {
            "message": f"Analyzing changes from {source_type.upper()} for {kb.app_name}",
            "source_type": source_type,
            "source_url": source_url,
            "commit_sha": commit_sha,
            "commit_message": commit_message,
            "summary": summary,
        })

        # ── Gatekeeper classification ──────────────────────────────────────
        decision = await run_gatekeeper(diff)
        logger.info(f"🛡️ [Gatekeeper] Classification: {decision.get('decision', '').upper()} | Reason: {decision.get('reason')}")

        event_payload = {
            "decision": decision['decision'],
            "reason": decision['reason'],
            "affected_files": decision.get('affected_files', []) or (affected_items or []),
            "source_type": source_type,
            "source_url": source_url,
            "commit_sha": commit_sha,
            "commit_message": commit_message,
            "summary": summary,
            "message": f"Gatekeeper [{source_type.upper()}]: {decision['decision'].upper()} — {decision['reason']}",
        }
        await _log_event(db, str(kb.id), sse, f"gatekeeper_{decision['decision']}", event_payload)

        if decision['decision'] == 'trivial':
            logger.info(f"🛡️ Gatekeeper blocked update for KB {kb_id}: {decision['reason']}")
            await _log_event(db, str(kb.id), sse, "gatekeeper_block", {
                "message": f"Update skipped: {decision['reason']}",
                "decision": "trivial",
                "source_type": source_type,
            })
            return

        # ── Significant change: patch compile affected files ───────────────
        logger.info(f"🌟 [Patch Compilation] Starting patch compilation for {kb.app_name}...")
        await _update_kb_status(db, kb, KBStatus.generating, sse, {"trigger": "sync_patch"})
        await _log_event(db, str(kb.id), sse, "patch_compilation_started", {
            "message": f"Compiling documentation updates for significant change: {decision['reason']}",
            "affected_files": decision.get('affected_files', []),
            "source_type": source_type,
        })

        context = AgentContext(
            kb_id=str(kb.id),
            org_slug=org_slug,
            app_name=kb.app_name,
            ingested_content=f"Source: {source_type.upper()} ({source_url or 'N/A'})\n\nChanges / Delta:\n{diff}",
            affected_files=decision.get('affected_files', []),
            decision="significant",
        )

        patch_files = await run_compiler(context, patch_files=decision.get('affected_files'))
        logger.info(f"🌟 [Patch Compilation] Successfully compiled {len(patch_files)} updated KB files")

        if org:
            await register_kb_contracts(db, str(org.id), str(kb.id), kb.app_name, patch_files)

        await _log_event(db, str(kb.id), sse, "patch_compiled", {
            "file_count": len(patch_files),
            "files": list(patch_files.keys()),
            "message": f"Compiled {len(patch_files)} documentation files for patch",
            "source_type": source_type,
        })

        # ── Commit patch to new branch → open PR ──────────────────────────
        repo_full_name = "/".join(kb.git_repo_url.rstrip("/").split("/")[-2:])
        branch_suffix = commit_sha[:7] if commit_sha else uuid.uuid4().hex[:7]
        branch = f"kb/sync-{source_type}-{branch_suffix}"

        logger.info(f"📦 [GitOps] Committing patch to branch {branch} in {repo_full_name}...")
        commit_kb_to_branch(repo_full_name, branch, patch_files)

        source_label = source_type.capitalize()
        summary_label = summary or commit_message or branch_suffix
        pr_title = f"🔄 KB Sync [{source_label}]: {kb.app_name} ({summary_label[:40]})"
        pr_body = (
            f"### 🌌 Astrophage Automated KB Sync\n\n"
            f"**Gatekeeper** detected a significant change from **{source_label}**.\n\n"
            f"- **Source:** `{source_type}` ({source_url or 'configured source'})\n"
            f"- **Reason:** {decision['reason']}\n"
            f"- **Author / Trigger:** `{author or 'System'}`\n"
            f"- **Summary:** {summary or commit_message or 'Incremental change detected'}\n"
            f"- **Affected Files / Items:** {', '.join(decision.get('affected_files', []) or (affected_items or ['All']))}\n"
            f"- **Updated KB Pages:** {', '.join(patch_files.keys())}\n\n"
            f"Please review the updated documentation and merge to publish."
        )

        logger.info(f"🚀 [GitOps] Opening PR on {repo_full_name}...")
        pr_url = open_pull_request(repo_full_name, branch, pr_title, pr_body)
        kb.pr_url = pr_url
        await db.commit()

        await _log_event(db, str(kb.id), sse, "pr_opened", {
            "pr_url": pr_url,
            "branch": branch,
            "source_type": source_type,
            "message": f"Pull Request opened for sync: {pr_url}",
        })
        await _update_kb_status(db, kb, KBStatus.in_review, sse, {"pr_url": pr_url, "trigger": "sync"})
        logger.info(f"✅ [Gatekeeper Pipeline] Complete! PR opened at: {pr_url}")

    except Exception as e:
        logger.exception(f"❌ Gatekeeper pipeline failed for KB {kb_id}: {e}")
        await _update_kb_status(db, kb, KBStatus.failed, sse, {"error": str(e)})
        await _log_event(db, str(kb.id), sse, "pipeline_error", {"error": str(e)})



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
