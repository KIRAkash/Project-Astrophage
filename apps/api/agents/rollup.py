import json
import logging

from ..core.config import settings
from .llm_client import llm_client

logger = logging.getLogger(__name__)

SYSTEM_ROLLUP = (
    "You are a senior software architect synthesising an organisation-level "
    "knowledge base from multiple application-level knowledge bases."
)


async def run_rollup(org_id: str, app_kbs: list, existing_org_kb: str = None) -> dict:
    """Generate or update the org-level KB by synthesising all app-level KBs.

    Always routes to remote (Gemini) regardless of AI_MODE, because rollup
    must synthesise across multiple KBs — exactly the large-context task that
    local Gemma cannot handle reliably.
    """
    content = ""
    for kb in app_kbs:
        content += f"\n\n--- App: {kb['app_name']} ---\n{kb['index']}"

    existing_hint = ""
    if existing_org_kb:
        existing_hint = (
            f"\n\nEXISTING ORG KB (update / extend this, do not discard):\n"
            f"{existing_org_kb[:8000]}"
        )

    prompt = (
        "Synthesise an org-level architecture map from these application KBs.\n\n"
        "Tasks:\n"
        "- Identify shared infrastructure, libraries, and dependencies across apps.\n"
        "- Resolve contradictions or naming inconsistencies between apps.\n"
        "- Create an org-level index that maps how apps relate to each other.\n"
        "- Use [[wikilinks]] to reference app-level concepts where helpful.\n\n"
        "Output strictly valid JSON ONLY, where keys are file paths and values "
        "are markdown content. Do NOT wrap in markdown code blocks.\n\n"
        f"Apps:\n{content}"
        f"{existing_hint}"
    )

    # Rollup always uses remote — it needs the widest context window available
    force_mode = "remote"
    logger.info(f"[rollup] Synthesising org KB for {org_id} via {force_mode}")

    try:
        raw = await llm_client.generate(
            prompt=prompt,
            system=SYSTEM_ROLLUP,
            force_json=True,
            force_mode=force_mode,
        )
        result = json.loads(raw)
        if not result:
            return {"index.md": f"# Org KB — {org_id}\n\nRollup produced an empty result."}
        return result
    except json.JSONDecodeError as e:
        logger.error(f"Rollup JSON parse failed for org {org_id}: {e}")
        return {"index.md": f"# Org KB — {org_id}\n\nError parsing rollup output."}
    except Exception as e:
        logger.error(f"Rollup failed for org {org_id}: {e}")
        return {"index.md": f"# Org KB — {org_id}\n\nRollup error: {e}"}

