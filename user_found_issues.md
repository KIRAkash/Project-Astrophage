# Real-World Implementations, Issues & Learnings: The LLM / Code Wiki Pattern

This document provides a comprehensive synthesis of discussions, real-world implementations, stress-testing results, and architectural critiques from developers implementing **Andrej Karpathy's LLM Wiki pattern** (from [Gist: karpathy/llm-wiki.md](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)).

All referenced open-source implementations have been cloned locally into the `ref_code/` directory for deep technical reference.

---

## 1. Core Paradigm: LLM Wiki vs. Standard RAG

* **Traditional RAG (Ephemeral & Stateless)**:
  14175\text{Documents} \longrightarrow \text{Chunks} \longrightarrow \text{Vector Retrieval} \longrightarrow \text{LLM} \longrightarrow \text{Answer}14175
  Every query re-derives synthesis from raw fragments from scratch. Nothing compounds; multi-document cross-synthesis is expensive and fragile.

* **LLM Wiki Pattern (Compounding & Persistent)**:
  14175\text{Raw Sources} \xrightarrow[\text{Ingest \& Reconcile}]{\text{LLM Agent}} \text{Living Markdown Wiki / Knowledge Graph} \xrightarrow[\text{Indexed \& Traversed}]{\text{Hybrid Query}} \text{Synthesized Knowledge / Decisions}14175
  The LLM acts as an automated compiler and librarian. Raw sources are parsed once into interconnected concept/entity pages, cross-referenced, and continuously linted for contradictions and missing links.

---

## 2. Key Failure Modes & Issues Encountered (Stress-Test Findings)

Real-world deployments across personal vaults, enterprise document collections, and codebases revealed several critical scaling boundaries and failure modes:

### A. Epistemic Drift & The Self-Citation Loop (Scale Breakdown at ~1,000 Files)
* **Reported by**: `@AbleVarghese` ([Provenance-First-Wiki](ref_code/Provenance-First-Wiki))
* **The Problem**: While the basic pattern functions smoothly on small vaults (100–200 files), it begins breaking around **1,000 files**. When derived wiki pages are placed in the same index or retrieval namespace as primary raw sources with equal standing, the LLM starts citing its own compiled summaries. Over successive compilation cycles, subtle hallucinations or inferences get treated as ground truth, compounding into confident factual errors (e.g., the "twelve confident hits on the bathyscaphe Trieste").
* **Solution**: **Provenance-First Architecture**. Quotes and claims must be direct pointers/spans into immutable raw source documents rather than copies. Strict tier separation between immutable raw inputs and compiled wiki outputs.

### B. Concurrent Ingest Silently Forks the Wiki
* **Reported by**: `@huachen-wang` (Team-scale production deployment: 100+ sources, ~200 pages)
* **The Problem**: When multiple documents are ingested concurrently, parallel agent runs read the same index snapshot and independently decide to create new pages under slightly different slugs (e.g., `eori` vs `eori-number`), resulting in up to **38% semantic near-duplicates**. Locking the entire planning phase causes ingest queue starvation due to LLM inference latency.
* **Solution**: **Atomic Placeholder Reservation**.
  1. The LLM proposes target page names outside of any lock.
  2. The system atomically registers placeholder entries in the index (`status: "planned"`, `claimed_by: ["ingest#123"]`).
  3. If another ingest already claimed or created the slug, `create` gracefully degrades to `update` without retries.

### C. Vault vs. Codebase Drift (The "Phantom Documentation" Problem)
* **Reported by**: `@pollockchris083-arch` ([counterentry](ref_code/counterentry)), `@tonydzi`
* **The Problem**: A markdown note in the wiki stated a dashboard required admin permissions. In reality, the codebase check always returned `true`. Wiki lint passed perfectly because *notes agreed with notes*, but the entire knowledge base was false relative to the real-world code. Similarly, documentation claimed an import was called while it was missing, and a background nightly rebuild job was disabled for 5 days.
* **Solution**:
  1. **Co-location**: Claims that describe single-file code logic must live inside the code file as docstrings/annotations committed atomically with code changes.
  2. **File + Line Anchoring**: Claims in external wiki pages must be explicitly anchored to specific file paths, line ranges, and commit hashes. Git hooks flag/invalidate claims whenever anchored code changes.
  3. **Runtime State Verification**: External states (e.g., "cron runs nightly") require deterministic health checks, not ungrounded prose claims.

### D. Lossy Index Navigation & Context Retrieval Bottlenecks
* **Reported by**: `@huachen-wang`, `@coder-jeffery`, `@gowtham0992` ([link](ref_code/link))
* **The Problem**: Single-line summaries in `index.md` work up to ~100 pages, but lose specific facts buried deep inside page bodies (e.g. niche keywords, fee amounts, specific exceptions). Ingest and ask agents miss relevant pages. Furthermore, sending the full wiki index in early MCP tool responses causes massive token bloat (16.5k chars / 11k tokens).
* **Solution**:
  1. **Additive Union Retrieval**: Always combine index navigation with deterministic full-text search (BM25) / local vector search (`union(Index-Selected, BM25-Top-K)`).
  2. **Strict Memory Budgets**: Cap initial session memory digests to <4,000 characters.

### E. Human Corrections Overwritten by Re-compilation
* **Reported by**: `@huachen-wang`
* **The Problem**: When a human manually fixes an error on a wiki page, the next automated agent ingest of a related source re-generates the page and silently wipes out the human's edit.
* **Solution**: **Semantic Human Pins**. Store human edits as structured intention objects (e.g., `{ "kind": "correction", "claim": "...", "anchor": "## Section Header", "provenance": "human" }`). After every regeneration pass, re-verify pins against the new text. If violated or contradicted, escalate to human review instead of silently discarding.

### F. Long-Session Context Truncation & Capture Redundancy
* **Reported by**: `@XBlueSky` ([cortexes](ref_code/cortexes))
* **The Problem**:
  1. `SessionEnd` hooks in tools like Claude Code can fire multiple times for growing sessions, creating duplicate prefix snapshots.
  2. Passing an entire long coding session to a single summarization prompt loses intermediate insights when context budgets run out.
* **Solution**:
  1. **Superseded Snapshot Pruning**: Reclaim only provably superseded, undistilled session snapshots.
  2. **Bounded Span Coverage Plan**: Partition raw sessions into gap-free spans. Require every span to be explicitly processed or closed as having no durable insights.

### G. Probabilistic Hazards in Graph Materialization (Contradiction Edges)
* **Reported by**: `@sturlese` ([stigmergy](ref_code/stigmergy)), `@drjoeshepherd`
* **The Problem**: Allowing an LLM to materialize `contradicts` or `invalidates` edges directly into the database injects probabilistic inferences into the substrate, which downstream agents treat as verified facts.
* **Solution**:
  1. **Model Proposes, System Verifies, Humans Decide**.
  2. Separate inferred semantic contradictions (report to human) from deterministic contradictions (file hash mismatch, test exit code failures).
  3. Strict gating on "Entity Births" (introducing new canonical vocabulary).

### H. Decision Reasoning vs. Fact Recording (The Vigil Paradigm)
* **Reported by**: `@ednawnika` ([Vigil](https://trustvigil.com)), `@pollockchris083-arch`
* **The Problem**: Traditional PKMs and wikis record *what is known*, but fail to track *why decisions were made* and *what assumptions support them*. When the world changes, decisions remain frozen until failure occurs.
* **Solution**: **Living Decision & Assumption Graph**:
  14175\text{Evidence} \longrightarrow \text{Atomic Claims} \longrightarrow \text{Assumptions} \longrightarrow \text{Decisions} \xrightarrow{\text{New Evidence}} \text{Review Trigger}14175
  Assumptions are formulated as falsifiable conditions. When new evidence weakens an assumption, dependent decisions are automatically flagged for review.

### I. Dormant Constraints & Multi-Agent Context Loss
* **Reported by**: `@gowtham0992` ([link](ref_code/link))
* **The Problem**: Important operational constraints ("never deploy on Friday") sit unread in static memory files until violated. Switching between agents (Claude Code, Cursor, Codex) causes context loss and re-explanation friction.
* **Solution**:
  1. **Active Constraint Interceptors**: Fast (80ms) local pattern-matching on prompts that alerts the model whenever a prompt conflicts with a stored constraint.
  2. **Agent Handoff Packets**: Standalone transient handoff files (`task`, `state`, `next_steps`) with 48h TTL and secret redaction.

---

## 3. Cloned Reference Repositories in `ref_code/`

The following 16 repositories have been cloned into `ref_code/` for direct code examination:

| Directory | Author / Project | Primary Tech / Language | Core Architecture & Key Contribution |
| :--- | :--- | :--- | :--- |
| [`Provenance-First-Wiki`](ref_code/Provenance-First-Wiki) | `@AbleVarghese` | Markdown, Architecture Spec | Stress-test results at >1000 files; quotes as byte pointers into immutable sources; eliminates self-citation feedback loops. |
| [`llm-wiki-cli`](ref_code/llm-wiki-cli) (LWC) | `@JanYork` | Rust, SQLite, CLI | Agent-first CLI memory; SQLite is canonical store, Markdown is human-readable projection; CodeGraph (AST symbols, callers/callees). |
| [`llm-wiki-skill`](ref_code/llm-wiki-skill) | `@One4Shell` | Shell, Agent Skills spec | Cross-agent skill (70+ agent runtimes) for incremental wiki maintenance, contradiction flagging, and chronological logging. |
| [`LLM-Wiki-Agent-Workflow-Demo`](ref_code/LLM-Wiki-Agent-Workflow-Demo) | `@WayneChou-bot` | TypeScript, React, Next.js | Interactive knowledge atlas with typed graph edges, browser-based lint passes (orphans, broken links, schema-as-contract `AGENTS.md`). |
| [`cortexes`](ref_code/cortexes) | `@XBlueSky` | Python, Claude Code Plugin | Session capture filtering, bounded-span coverage distillation, disposable BM25/vector/graph index harnesses with P@5/MRR evals. |
| [`link`](ref_code/link) | `@gowtham0992` | Python, Swift, Rust | Review-gated plain Markdown store, active real-time constraint interceptors, cross-agent handoff packets, fast on-device semantic recall. |
| [`iwe`](ref_code/iwe) | `@gimalay` | Rust, LSP Server | Treats Markdown AST as a queryable graph (headers/paragraphs as nodes); full LSP server for Neovim/VSCode/Zed; deterministic wiki refactoring tools. |
| [`docq`](ref_code/docq) | `@lichuang` | Rust, SQLite, FTS5 | Local-first search & retrieval engine with hybrid BM25 + vector + reranking and inline source citations for local agent workflows. |
| [`counterentry`](ref_code/counterentry) | `@pollockchris083-arch` | Markdown, Architecture Spec | Spec & essay on vault-codebase drift, anchoring claims to code lines/commits, dead-reason edge cascades, and 3-tier write permissions. |
| [`stigmergy`](ref_code/stigmergy) | `@sturlese` | Python, ADRs | 8 deterministic validation gates over agent diffs; human gating on entity births; removal of dormant learning loops (ADR-023). |
| [`expo-llm-wiki`](ref_code/expo-llm-wiki) | `@equationalapplications` | TypeScript | Platform-agnostic TypeScript memory engine for hybrid LLM memory over SQLite (`@equationalapplications/core-llm-wiki`). |
| [`sqlite-s3-agent-tutorial`](ref_code/sqlite-s3-agent-tutorial) | `@equationalapplications` | Python, AWS Lambda | Serverless swarm architecture for LLM Wiki agents with SQLite + sqlite-vec on S3; tiered memory hierarchy. |
| [`mindbase`](ref_code/mindbase) | `@frankchu91` | Python, MLX, Ollama | Fully local on-device LLM wiki running Meta Muse Glimmer / Qwen 14B; routing interactive work to fast models and consistency lint to reasoning models. |
| [`cartographer-obsidian-viz`](ref_code/cartographer-obsidian-viz) | `@H179922` / `multimail-dev` | TypeScript, Obsidian Plugin | Local-first Obsidian knowledge graph visualizer using PageRank, Louvain community clustering, and ForceAtlas3 layout. |
| [`sqz`](ref_code/sqz) | `@ojuschugh1` | Rust, CLI / IDE Plugins | AST-aware context intelligence and token compression engine for file-heavy agent tasks. |
| [`qmd`](ref_code/qmd) | `@tobi` | Go / Python, CLI | Local markdown search engine with hybrid BM25/vector search and LLM re-ranking (referenced by Karpathy in original gist). |

---

## 4. Synthesis: Rules for Implementing a Robust Code Wiki

Based on all practitioner findings, any production-grade Code Wiki or Knowledge Compiler should adhere to these principles:

1. **Strict Source-Derived Separation**: Never mix raw sources and compiled wiki pages in the same index. Quotes are pointers into immutable raw files.
2. **Deterministic Pre-Commit Gating**: The LLM drafts changes, but deterministic linters (backlinks, schema compliance, broken link checks, code anchors) validate diffs before committing.
3. **Atomic Multi-Ingest Placeholders**: Never lock during LLM inference; use atomic status reservations (`status: planned`) in the index to prevent wiki forking.
4. **Codebase Anchoring**: Claims about code logic must specify file path, line bounds, and commit hash so git triggers can invalidate stale claims upon code modifications.
5. **Surviving Human Edits**: Human adjustments must be captured as semantic intent "pins", re-checked after every compilation pass.
6. **Additive Hybrid Retrieval**: Never rely solely on an LLM reading `index.md`. Combine index navigation with local BM25 full-text search and vector retrieval.
7. **Living Decisions & Assumptions**: Store falsifiable assumptions alongside decisions, allowing new incoming evidence to trigger decision review workflows automatically.
