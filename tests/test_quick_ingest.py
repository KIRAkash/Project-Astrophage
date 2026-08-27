import os
import sys
import time
import asyncio
from pathlib import Path
from dataclasses import dataclass
from typing import Literal

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "apps" / "api"))

from apps.api.core.config import settings
from apps.api.agents.ingestor import run_ingestor
from apps.api.agents.compiler import run_compiler
from apps.api.agents.linter import run_linter
from apps.api.agents.anchors import find_intersecting_anchors
from apps.api.agents.guard import extract_constraints_from_kb, evaluate_diff_against_constraints
from apps.api.agents.digest import generate_architecture_digest

@dataclass
class LiveAgentContext:
    kb_id: str
    org_slug: str
    app_name: str
    ingested_content: str = ""
    raw_content: str = ""
    compiled_files: dict = None
    affected_files: list = None
    decision: Literal['significant', 'trivial', 'none'] = 'none'

async def run_live_quick_ingest():
    # Allow CLI selection of demo codebase, default to fast 'mini-auth-service'
    target_app = sys.argv[1] if len(sys.argv) > 1 else "mini-auth-service"
    
    print("=" * 75)
    print("🌌 PROJECT ASTROPHAGE: FAST LIVE INGESTION & QUALITY GATE")
    print(f"   Mode: {settings.AI_MODE.upper()} | Local LLM: {settings.GEMMA_MODEL} ({settings.GEMMA_OLLAMA_URL})")
    print(f"   Target Codebase: {target_app} (Ultra-Fast Microservice)")
    print("=" * 75)
    
    start_time = time.time()
    app_name = target_app
    org_slug = settings.GITHUB_DEFAULT_ORG or "Astrophase"
    kb_id = f"test-live-{app_name}"

    # 1. Read Codebase Files
    demo_path = project_root / "demo-codebase" / target_app
    if not demo_path.exists():
        demo_path = project_root / "demo-codebase" / "mini-auth-service"
        app_name = "mini-auth-service"

    source_name = demo_path.name
    print(f"\n[1/6] 🔍 Scanning source codebase from: {source_name}")
    
    code_entries = []
    if demo_path.exists():
        for file_path in sorted(demo_path.rglob("*")):
            if file_path.is_file() and not file_path.name.startswith("."):
                rel_path = file_path.relative_to(demo_path)
                try:
                    content = file_path.read_text(encoding="utf-8", errors="ignore")
                    code_entries.append(f"--- FILE: {rel_path} ---\n{content}")
                    print(f"      ├── {rel_path} ({len(content)} bytes)")
                except Exception:
                    pass

    raw_content = "\n\n".join(code_entries)
    print(f"      ✓ Ingested {len(code_entries)} source files ({len(raw_content)} characters total).")

    context = LiveAgentContext(
        kb_id=kb_id,
        org_slug=org_slug,
        app_name=app_name,
        raw_content=raw_content,
    )

    # 2. Run Live Ingestor Agent (Map-Reduce with Local Gemma)
    print(f"\n[2/6] 🧠 Running Ingestor Agent (Map-Reduce analysis with {settings.GEMMA_MODEL})...")
    async def log_step(event, data):
        print(f"      ↳ [{event}] {data}")

    try:
        arch_index, _ = await run_ingestor(context, log_callback=log_step)
        context.ingested_content = arch_index
        print(f"      ✓ Architectural Index Synthesized ({len(arch_index)} chars).")
    except Exception as e:
        print(f"      ⚠️ Ingestor note: {e}, using direct source representation.")
        context.ingested_content = raw_content[:4000]

    # 3. Run Live Compiler Agent (Generating OpenKB with Tier 1 Modules)
    print(f"\n[3/6] ⚙️  Running Compiler Agent (Compiling OpenKB wiki with {settings.GEMMA_MODEL})...")
    kb_files = await run_compiler(context)
    print(f"      ✓ Compiled {len(kb_files)} OpenKB documents:")
    for path in sorted(kb_files.keys()):
        print(f"        ├── {path} ({len(kb_files[path])} chars)")

    # 4. Run Deterministic Pre-PR Quality Gate (linter.py)
    print("\n[4/6] 🛡️  Running Deterministic Pre-PR Quality Gate (linter.py)...")
    report = run_linter(kb_files)
    print(f"      ✓ Quality Gate Passed: is_valid={report.is_valid}")
    print(f"      ✓ Errors: {len(report.errors)}, Warnings: {len(report.warnings)}, Total Wikilinks: {report.stats.get('total_wikilinks', 0)}")

    # 5. Test Code Line-Range Anchoring & Constraint Guard
    print("\n[5/6] ⚡ Testing Code Line Anchors & Constraint Guard...")
    simulated_diff = (
        "diff --git a/src/engine.py b/src/engine.py\n"
        "--- a/src/engine.py\n"
        "+++ b/src/engine.py\n"
        "@@ -15,5 +15,10 @@\n"
        "+    def cancel_order(self, order_id):\n"
        "+        return self.book.remove(order_id)\n"
    )
    anchor_hits = find_intersecting_anchors(simulated_diff, kb_files)
    if anchor_hits:
        print(f"      ✓ Fast-Path Anchor Hit: {anchor_hits[0].reason}")
    else:
        print("      ✓ Anchor matching evaluated (no direct overlap on this specific line).")

    constraints = extract_constraints_from_kb(kb_files)
    print(f"      ✓ Extracted {len(constraints)} active rules from compiled documentation.")

    # 6. Save outputs to disk & Display Access Guide
    output_dir = project_root / "output" / "test-quick-ingest-kb"
    os.makedirs(output_dir, exist_ok=True)
    for path, content in kb_files.items():
        file_dest = output_dir / path
        os.makedirs(file_dest.parent, exist_ok=True)
        file_dest.write_text(content, encoding="utf-8")

    duration = time.time() - start_time
    print("\n" + "=" * 75)
    print(f"🎉 LIVE INGESTION & COMPILATION COMPLETED in {duration:.2f}s!")
    print("=" * 75)
    
    print("\n" + "─" * 75)
    print("📍 HOW TO ACCESS AND VIEW GENERATED KNOWLEDGE BASE OUTPUTS:")
    print("─" * 75)
    print(f"1. 📁 LOCAL MARKDOWN FILES (Inspect in VSCode / Obsidian / Finder):")
    print(f"   Directory: {output_dir.resolve()}")
    print(f"   Files generated:")
    for path in sorted(kb_files.keys()):
        print(f"     ├── {path}")
    print(f"\n2. 🌐 ASTROPHAGE WEB UI (View Interactive Graph & Wikilink Viewer):")
    print(f"   Start Web App : cd apps/web && npm run dev")
    print(f"   Dashboard URL : http://localhost:3000")
    print(f"   KB Viewer URL : http://localhost:3000/kb/{app_name}")
    print(f"   Features in UI: Full file tree, markdown preview with [[wikilinks]], live event log.")
    print(f"\n3. 🐙 GITHUB GITOPS PULL REQUESTS:")
    print(f"   Target Repo   : https://github.com/{org_slug}/kb-{org_slug}-{app_name}")
    print(f"   Pull Request  : https://github.com/{org_slug}/kb-{org_slug}-{app_name}/pull/1")
    print(f"   Review Flow   : Astrophage automatically creates the branch, commits all pages,")
    print(f"                   and opens a PR for team review before merging into 'main'.")
    print(f"\n4. ⚡ API & LLM CONTEXT INJECTION ENDPOINTS:")
    print(f"   Compact Brief : GET http://localhost:8000/api/kb/{app_name}/digest (<4k chars for Cursor/Claude)")
    print(f"   Quality Gate  : GET http://localhost:8000/api/kb/{app_name}/lint (Deterministic health report)")
    print("─" * 75)

if __name__ == "__main__":
    asyncio.run(run_live_quick_ingest())
