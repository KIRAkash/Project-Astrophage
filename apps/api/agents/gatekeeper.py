import json
import logging
from typing import Dict, Optional

from ..core.config import settings
from .llm_client import llm_client, get_env_var
from .anchors import find_intersecting_anchors

logger = logging.getLogger(__name__)

_GATEKEEPER_PROMPT = """
Analyse the following code diff or source delta (e.g. from GitHub, Confluence, Slack, Notion, Jira) and classify the change.

If the change is SIGNIFICANT (API changes, schema/data model modifications, architectural decisions, new services or features, major dependency shifts, security changes, critical policy updates), return 'significant'.

If the change is TRIVIAL (typos, minor comments, formatting, routine status updates, casual chat, minor copy adjustments, version bumps in lock files), return 'trivial'.

Output JSON ONLY — no markdown, no explanation outside the JSON:
{{
    "decision": "significant" | "trivial",
    "reason": "short explanation (one sentence)",
    "affected_files": ["list", "of", "relevant", "openkb", "or", "source", "file", "paths"]
}}

Delta / Changes:
{diff}
"""

async def run_gatekeeper(
    diff: str,
    kb_files: Optional[Dict[str, str]] = None,
    ollama_url: str = None,
    model: str = None
) -> dict:
    """Classify a git diff as significant or trivial.

    Fast-Path:
      If active OpenKB anchor tags are present in kb_files and intersect
      modified diff lines, immediately returns 'significant' with exact dirty files (0 LLM cost).

    LLM Routing:
      local  -> Gemma via Ollama (4k context — diff classification is compact)
      remote -> Gemini Flash
      hybrid -> Gemma (cheap binary decision, small context)
    """
    # 1. Deterministic Fast-Path: Check Code Anchors
    if kb_files:
        try:
            anchor_hits = find_intersecting_anchors(diff, kb_files)
            if anchor_hits:
                affected_kb_pages = sorted(list(set(hit.kb_file for hit in anchor_hits)))
                hit_reasons = "; ".join(hit.reason for hit in anchor_hits[:2])
                logger.info(f"Gatekeeper fast-path triggered on {len(anchor_hits)} anchor intersections: {hit_reasons}")
                return {
                    "decision": "significant",
                    "reason": f"Deterministic anchor hit: {hit_reasons}",
                    "affected_files": affected_kb_pages,
                    "fast_path": True,
                }
        except Exception as e:
            logger.warning(f"Anchor fast-path check failed: {e}. Falling back to LLM classifier.")

    # 2. LLM Diff Classifier Fallback
    mode = get_env_var("AI_MODE", getattr(settings, "AI_MODE", "remote"))
    force_mode = "local" if mode in ("local", "hybrid") else "remote"
    prompt = _GATEKEEPER_PROMPT.format(diff=diff)

    try:
        raw = await llm_client.generate(
            prompt=prompt,
            force_json=True,
            force_mode=force_mode,
            num_ctx_override=4096,  # diffs are compact; save VRAM
        )
        result = json.loads(raw)
        result.setdefault("decision", "significant")
        result.setdefault("reason", "Gatekeeper returned incomplete response")
        result.setdefault("affected_files", [])
        result["fast_path"] = False
        return result
    except Exception as e:
        logger.error(f"Gatekeeper failed: {e}")
        return {
            "decision": "significant",
            "reason": f"Gatekeeper error — defaulting to significant: {e}",
            "affected_files": [],
            "fast_path": False,
        }
