import asyncio
import json
import logging
import re
from typing import Literal, Optional

from ..core.config import settings
from .llm_client import llm_client

logger = logging.getLogger(__name__)

SYSTEM_COMPILER = (
    "You are a technical documentation compiler generating a codebase wiki. "
    "Use Obsidian-compatible [[wikilinks]] to cross-reference other pages listed "
    "in the KB manifest provided in each prompt."
)


# ---------------------------------------------------------------------------
# Hybrid routing helper
# ---------------------------------------------------------------------------

def _route_page(path: str) -> Literal["local", "remote"]:
    """Determine which model should compile a given KB page.

    In local/remote modes, routing is uniform. In hybrid mode, pages are
    routed by their directory category based on HYBRID_*_CATEGORIES config.
    """
    if settings.AI_MODE == "local":
        return "local"
    if settings.AI_MODE == "remote":
        return "remote"
    # hybrid
    category = path.split("/")[0]
    local_cats = [c.strip() for c in settings.HYBRID_LOCAL_CATEGORIES.split(",")]
    if category in local_cats:
        return "local"
    return "remote"


# ---------------------------------------------------------------------------
# Context filtering helper
# ---------------------------------------------------------------------------

def _filter_raw_code(raw: str, topic: str, max_chars: int = 25000) -> str:
    """Return the most topic-relevant files from raw content, up to max_chars.

    In local mode the budget is tight; callers pass a smaller max_chars.
    """
    parts = re.split(r'--- FILE: (.*?) ---', raw)
    if len(parts) <= 1:
        return raw[:max_chars]

    file_map = {parts[i]: parts[i + 1].strip() for i in range(1, len(parts), 2)}
    topic_words = set(re.findall(r'\w+', topic.lower()))

    scored = []
    for path, content in file_map.items():
        score = sum(1 for w in topic_words if w in path.lower() or w in content.lower())
        scored.append((score, path, content))
    scored.sort(reverse=True, key=lambda x: x[0])

    filtered = ""
    for _, path, content in scored:
        if len(filtered) >= max_chars:
            break
        filtered += f"\n--- FILE: {path} ---\n{content}"
    return filtered


# ---------------------------------------------------------------------------
# Page manifest builder (zero LLM cost)
# ---------------------------------------------------------------------------

def _build_manifest(plan: list) -> str:
    """Build a wikilink manifest from the documentation plan.

    Example output:
      [[index]] - High-level architecture overview
      [[summaries/api-spec]] - REST API endpoints and request/response schemas
    """
    lines = ["[[index]] - High-level architecture overview of this application"]
    for page in plan:
        path = page.get("path", "")
        topic = page.get("topic", "")
        wikilink = path.replace(".md", "")
        lines.append(f"[[{wikilink}]] - {topic}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Synthesis / link-repair pass
# ---------------------------------------------------------------------------

async def run_synthesis_pass(files: dict, plan: list) -> dict:
    """Post-compilation pass to verify and repair wikilinks.

    local mode  : pure Python regex — removes links to pages that don't exist.
    remote/hybrid: single Gemini call that sees all page titles + previews and
                   adds missing cross-references.
    """
    valid_wikilinks = {"index"}
    for page in plan:
        valid_wikilinks.add(page["path"].replace(".md", ""))

    if settings.AI_MODE == "local":
        # Regex-only repair: strip links to non-existent pages
        pattern = re.compile(r'\[\[([^\]]+)\]\]')
        for path, content in files.items():
            def _fix_link(m):
                target = m.group(1)
                return f"[[{target}]]" if target in valid_wikilinks else f"`{target}`"
            files[path] = pattern.sub(_fix_link, content)
        return files

    # remote / hybrid: Gemini cross-link pass
    if not settings.HYBRID_ENABLE_SYNTHESIS_PASS and settings.AI_MODE == "hybrid":
        return files

    # Build a compact page preview (title + first 200 chars)
    previews = []
    for path, content in files.items():
        preview = content[:200].replace('\n', ' ')
        previews.append(f"[[{path.replace('.md', '')}]]: {preview}...")

    manifest_block = "\n".join(previews)

    synthesis_prompt = (
        "Below is the full KB page manifest with previews. "
        "Review the following KB files and:\n"
        "1. Fix any [[wikilinks]] that reference pages not in the manifest.\n"
        "2. Add missing cross-references where pages are clearly related.\n"
        "3. Update the [[index]] page with a complete navigation table if missing.\n\n"
        f"MANIFEST:\n{manifest_block}\n\n"
        "Return the updated files as a JSON object where keys are file paths "
        "and values are the full updated markdown content.\n\n"
        "Files to review:\n"
        + json.dumps({k: v[:3000] for k, v in files.items()})  # cap for context
    )

    try:
        result_raw = await llm_client.generate(
            prompt=synthesis_prompt,
            system=SYSTEM_COMPILER,
            force_json=True,
            force_mode="remote",
        )
        updated = json.loads(result_raw)
        # Only accept keys that already exist — never let synthesis invent new pages
        for path, content in updated.items():
            if path in files:
                files[path] = content
    except Exception as e:
        logger.warning(f"Synthesis pass failed (non-fatal): {e}")

    return files


# ---------------------------------------------------------------------------
# Main compiler entry point
# ---------------------------------------------------------------------------

async def run_compiler(context, patch_files: list = None) -> dict:
    """Multi-step KB compilation pipeline.

    Steps:
      1. Generate high-level summary.
      2. Generate documentation plan (page list).
      3. Build page manifest (zero cost — derived from plan).
      4. Compile each page with manifest injected into the prompt.
      5. Run synthesis pass to verify/repair wikilinks.

    Mode behaviour:
      local  — summary from architecture index only; plan capped at LOCAL_MAX_PAGES;
               pages compiled sequentially with tight token budget; regex link repair.
      remote — summary + plan generated in a single combined call; concurrent
               page compilation with Semaphore(REMOTE_SEMAPHORE_LIMIT); Gemini
               synthesis pass.
      hybrid — summary from Gemini (has full context); plan from Gemini; pages
               routed by category (local=summaries/entities, remote=concepts/decisions);
               Gemini synthesis pass.
    """
    mode = settings.AI_MODE

    # ── Step 1: High-level summary ─────────────────────────────────────────
    logger.info(f"[compile/step1] Generating summary for {context.app_name} (mode={mode})")

    if mode == "local":
        # Use the architecture index (already summarised) — stays within context
        summary_prompt = (
            f"Write a high-level architectural summary of this application "
            f"based on the architecture index below.\n\n"
            f"Architecture Index:\n{context.ingested_content}"
        )
        summary_force_mode = "local"
    else:
        # remote / hybrid: Gemini sees the full raw code for maximum fidelity
        summary_prompt = (
            f"Write a comprehensive high-level architectural summary of this "
            f"application based on the ingested code.\n\nCode:\n{context.ingested_content}"
        )
        summary_force_mode = "remote"

    summary = await llm_client.generate(
        prompt=summary_prompt,
        system=SYSTEM_COMPILER,
        force_mode=summary_force_mode,
    )

    # ── Step 2: Documentation plan ─────────────────────────────────────────
    logger.info("[compile/step2] Generating documentation plan")

    plan_schema = (
        '{\n'
        '  "pages": [\n'
        '    {"path": "summaries/api-spec.md", "topic": "REST API endpoints"},\n'
        '    {"path": "concepts/data-pipeline.md", "topic": "Data flow"}\n'
        '  ]\n'
        '}'
    )
    max_pages = settings.LOCAL_MAX_PAGES if mode == "local" else settings.REMOTE_MAX_PAGES
    plan_prompt = (
        f"Based on this summary, list the specific documentation pages to create "
        f"in the Knowledge Base. Use directories: 'summaries/', 'concepts/', "
        f"'entities/', 'decisions/'. Limit to {max_pages} pages.\n\n"
        f"Output JSON ONLY:\n{plan_schema}\n\n"
        f"Summary:\n{summary}"
    )

    plan_raw = await llm_client.generate(
        prompt=plan_prompt,
        system=SYSTEM_COMPILER,
        force_json=True,
        force_mode="remote" if mode in ("remote", "hybrid") else "local",
    )

    # Strip markdown fences if model wrapped the JSON
    plan_text = plan_raw.strip()
    if plan_text.startswith("```"):
        plan_text = re.sub(r"^```(?:json)?", "", plan_text)
        plan_text = re.sub(r"```$", "", plan_text.strip()).strip()

    try:
        plan = json.loads(plan_text).get("pages", [])
        if not plan:
            plan = [
                {"path": "summaries/core-logic.md", "topic": "Core logic"},
                {"path": "summaries/api-spec.md", "topic": "API routes"},
            ]
    except Exception as e:
        logger.error(f"Failed to parse plan JSON: {e} — Raw: {plan_raw}")
        plan = [{"path": "summaries/core-logic.md", "topic": "Core logic"}]

    # Apply page cap
    plan = plan[:max_pages]

    # ── Step 3: Build page manifest (zero LLM cost) ────────────────────────
    page_manifest = _build_manifest(plan)
    logger.info(f"[compile/step3] Manifest built: {len(plan)} pages")

    # ── Step 4: Compile individual pages ───────────────────────────────────
    logger.info(f"[compile/step4] Compiling {len(plan)} pages")

    # Budget for raw code context per page
    local_code_budget = settings.LOCAL_PAGE_TOKEN_BUDGET  # chars (~5k tokens)
    remote_code_budget = 60000                             # chars, Gemini can handle it

    files: dict = {"index.md": summary}

    async def compile_page(page_def: dict) -> tuple:
        path = page_def.get("path", "untitled.md")
        topic = page_def.get("topic", "General documentation")
        page_mode = _route_page(path)

        code_budget = local_code_budget if page_mode == "local" else remote_code_budget
        relevant_code = _filter_raw_code(context.raw_content, topic, max_chars=code_budget)

        # num_ctx override for local: keep page prompt inside 8k window
        num_ctx = 8192 if page_mode == "local" else None

        page_prompt = (
            f"Write the markdown documentation for '{path}'.\n"
            f"Topic to cover: {topic}\n\n"
            f"KNOWLEDGE BASE PAGE MANIFEST — use [[wikilinks]] to cross-reference "
            f"these pages where relevant:\n{page_manifest}\n\n"
            f"Use this architectural summary for context:\n{summary}\n\n"
            f"Use this relevant source code for exact details:\n{relevant_code}\n\n"
            f"Only output the raw markdown content. Use [[wikilinks]] from the manifest."
        )

        logger.info(f"  Compiling {path} via {page_mode}...")
        content = await llm_client.generate(
            prompt=page_prompt,
            system=SYSTEM_COMPILER,
            force_mode=page_mode,
            num_ctx_override=num_ctx,
        )
        return path, content

    if mode == "local":
        # Sequential — protect VRAM
        for page_def in plan:
            path, content = await compile_page(page_def)
            files[path] = content
    elif mode == "remote":
        # Concurrent with semaphore cap
        sem = asyncio.Semaphore(settings.REMOTE_SEMAPHORE_LIMIT)
        async def _guarded(page_def):
            async with sem:
                return await compile_page(page_def)
        results = await asyncio.gather(*[_guarded(p) for p in plan])
        for path, content in results:
            files[path] = content
    else:
        # hybrid: local pages run sequentially (VRAM), remote pages run concurrently
        local_pages = [p for p in plan if _route_page(p["path"]) == "local"]
        remote_pages = [p for p in plan if _route_page(p["path"]) == "remote"]

        # Local pages — sequential
        for page_def in local_pages:
            path, content = await compile_page(page_def)
            files[path] = content

        # Remote pages — concurrent, separate semaphore
        if remote_pages:
            sem = asyncio.Semaphore(5)
            async def _guarded_hybrid(page_def):
                async with sem:
                    return await compile_page(page_def)
            results = await asyncio.gather(*[_guarded_hybrid(p) for p in remote_pages])
            for path, content in results:
                files[path] = content

    # ── Step 5: Synthesis / link-repair pass ───────────────────────────────
    logger.info("[compile/step5] Running synthesis pass")
    files = await run_synthesis_pass(files, plan)

    return files

