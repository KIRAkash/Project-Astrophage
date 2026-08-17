import json
import logging

from ..core.config import settings
from .llm_client import llm_client

logger = logging.getLogger(__name__)

_GATEKEEPER_PROMPT = """
Analyse this git diff and classify the change.

If the change is SIGNIFICANT (API changes, schema changes, new services,
architecture shifts, new dependencies, security changes), return 'significant'.

If the change is TRIVIAL (typo fixes, comment changes, UI colour tweaks,
test-only changes, formatting, version bumps in lock files), return 'trivial'.

Output JSON ONLY — no markdown, no explanation outside the JSON:
{{
    "decision": "significant" | "trivial",
    "reason": "short explanation (one sentence)",
    "affected_files": ["list", "of", "changed", "file", "paths"]
}}

Diff:
{diff}
"""

async def run_gatekeeper(diff: str, ollama_url: str = None, model: str = None) -> dict:
    """Classify a git diff as significant or trivial.

    Routing:
      local  -> Gemma via Ollama (4k context — diff classification is compact)
      remote -> Gemini Flash
      hybrid -> Gemma (cheap binary decision, small context)
    """
    mode = settings.AI_MODE
    # hybrid + local both use Gemma for the gatekeeper
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
        # Ensure required keys exist
        result.setdefault("decision", "significant")
        result.setdefault("reason", "Gatekeeper returned incomplete response")
        result.setdefault("affected_files", [])
        return result
    except Exception as e:
        logger.error(f"Gatekeeper failed: {e}")
        return {
            "decision": "significant",
            "reason": f"Gatekeeper error — defaulting to significant: {e}",
            "affected_files": [],
        }

