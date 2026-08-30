import json
import logging
import re
from typing import Dict, Any

from ..core.config import settings
from .llm_client import llm_client, get_env_var
from .digest import generate_architecture_digest

logger = logging.getLogger(__name__)

SYSTEM_COVERAGE_DIFF = (
    "You are a technical documentation architect. Your task is to analyze new source code/content "
    "and compare it against the existing Knowledge Base (KB) architecture digest. "
    "Identify what is genuinely new and needs to be documented, versus what is already covered."
)

async def run_coverage_diff(
    app_name: str,
    existing_kb_files: dict,
    new_source_content: str,
    source_type: str,
    source_url: str,
    org_slug: str = "org"
) -> Dict[str, Any]:
    """
    Determines which parts of the new source content are NOT already
    documented in the existing KB.
    """
    
    # 1. Generate the digest of the existing KB
    kb_digest = generate_architecture_digest(app_name, org_slug, existing_kb_files)
    
    # 2. Prepare the prompt
    prompt = (
        f"We are adding a new source to the existing Knowledge Base for '{app_name}'.\n\n"
        f"--- EXISTING KB DIGEST ---\n"
        f"{kb_digest}\n\n"
        f"--- NEW SOURCE ({source_type.upper()}: {source_url}) ---\n"
        f"{new_source_content[:25000]}\n\n"
        f"INSTRUCTIONS:\n"
        f"1. Compare the new source content against the existing KB digest.\n"
        f"2. Identify any significant topics, components, or logic in the new source that are NOT already covered.\n"
        f"3. Propose new KB pages to create (e.g., 'entities/new-service.md') OR existing pages to update (e.g., 'summaries/api-spec.md').\n"
        f"4. If the new source is completely redundant or trivial, set 'is_fully_covered' to true.\n"
        f"5. Output JSON ONLY in this format:\n"
        f"{{\n"
        f"  \"pages_to_create\": [\"list of new file paths\"],\n"
        f"  \"pages_to_update\": [\"list of existing file paths\"],\n"
        f"  \"is_fully_covered\": false,\n"
        f"  \"reason\": \"brief explanation of what is new or why it is fully covered\"\n"
        f"}}\n"
    )

    mode = get_env_var("AI_MODE", getattr(settings, "AI_MODE", "remote"))
    force_mode = "remote" if mode in ("remote", "hybrid") else "local"

    try:
        raw_res = await llm_client.generate(
            prompt=prompt,
            system=SYSTEM_COVERAGE_DIFF,
            force_json=True,
            force_mode=force_mode,
        )

        clean_json = raw_res.strip()
        if clean_json.startswith("```"):
            clean_json = re.sub(r"^```(?:json)?", "", clean_json)
            clean_json = re.sub(r"```$", "", clean_json.strip()).strip()

        result = json.loads(clean_json)
        
        # Ensure schema
        return {
            "pages_to_create": result.get("pages_to_create", []),
            "pages_to_update": result.get("pages_to_update", []),
            "is_fully_covered": result.get("is_fully_covered", False),
            "reason": result.get("reason", "No reason provided")
        }
    except Exception as e:
        logger.error(f"Coverage diff failed or returned invalid JSON: {e}")
        # Conservative fallback: Assume not covered, update index and a new source page.
        return {
            "pages_to_create": [f"sources/{source_type}-{source_url.split('/')[-1]}.md"],
            "pages_to_update": ["index.md"],
            "is_fully_covered": False,
            "reason": f"Fallback due to LLM error: {str(e)}"
        }
