from celery import Celery
from celery.schedules import crontab
from ..core.config import settings
import asyncio
import logging

logger = logging.getLogger(__name__)

celery_app = Celery(
    'astrophage',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
)


def _run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    return asyncio.run(coro)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def generation_pipeline_task(self, kb_id: str):
    from .db_session import get_db_sync
    from ..services.sse import SSEManager
    from ..agents.runner import run_generation_pipeline
    try:
        async def _execute():
            async with get_db_sync() as db:
                sse = SSEManager()
                await run_generation_pipeline(kb_id, db, sse)
        _run_async(_execute())
    except Exception as exc:
        logger.exception(f"generation_pipeline_task failed for {kb_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def gatekeeper_pipeline_task(self, kb_id: str, diff: str):
    from .db_session import get_db_sync
    from ..services.sse import SSEManager
    from ..agents.runner import run_gatekeeper_pipeline
    try:
        async def _execute():
            async with get_db_sync() as db:
                sse = SSEManager()
                await run_gatekeeper_pipeline(kb_id, diff, db, sse)
        _run_async(_execute())
    except Exception as exc:
        logger.exception(f"gatekeeper_pipeline_task failed for {kb_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def rollup_pipeline_task(self, org_id: str):
    from .db_session import get_db_sync
    from ..services.sse import SSEManager
    from ..agents.runner import run_rollup_pipeline
    try:
        async def _execute():
            async with get_db_sync() as db:
                sse = SSEManager()
                await run_rollup_pipeline(org_id, db, sse)
        _run_async(_execute())
    except Exception as exc:
        logger.exception(f"rollup_pipeline_task failed for {org_id}: {exc}")
        raise self.retry(exc=exc)


@celery_app.task
def poll_sources():
    """Polling fallback for Flow B — compares current HEAD SHA against stored last_commit_sha."""
    from .db_session import get_db_sync
    from ..services.sse import SSEManager
    from ..agents.runner import run_gatekeeper_pipeline
    from ..db.models import SourceMonitor, MonitorMode
    from sqlalchemy import select
    from github import Github

    async def _poll():
        db = get_db_sync()
        sse = SSEManager()
        g = Github(settings.GITHUB_APP_TOKEN)

        result = await db.execute(
            select(SourceMonitor).where(SourceMonitor.monitor_mode == MonitorMode.polling)
        )
        monitors = result.scalars().all()

        for monitor in monitors:
            try:
                repo_name = "/".join(monitor.repo_url.rstrip("/").split("/")[-2:])
                repo = g.get_repo(repo_name)
                latest_sha = repo.get_commits()[0].sha

                if latest_sha != monitor.last_commit_sha:
                    logger.info(f"New commit on {repo_name}: {latest_sha}")
                    # Get diff for the new commit
                    commit = repo.get_commit(latest_sha)
                    diff_parts = []
                    for f in commit.files:
                        if f.patch:
                            diff_parts.append(f"File: {f.filename}\nPatch:\n{f.patch}")
                    diff = "\n\n".join(diff_parts)

                    monitor.last_commit_sha = latest_sha
                    await db.commit()

                    # Trigger gatekeeper
                    await run_gatekeeper_pipeline(str(monitor.kb_id), diff, db, sse)
            except Exception as e:
                logger.warning(f"Poll failed for {monitor.repo_url}: {e}")

    _run_async(_poll())


# ── Celery Beat Schedule (polling fallback) ────────────────────────────────────
if settings.SOURCE_MONITOR_MODE == 'polling':
    celery_app.conf.beat_schedule = {
        'poll-source-repos-every-5-min': {
            'task': 'apps.api.workers.tasks.poll_sources',
            'schedule': 300.0,  # Every 5 minutes
        },
    }
