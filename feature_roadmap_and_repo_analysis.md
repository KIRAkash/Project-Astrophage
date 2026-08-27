# 🌌 Project Astrophage: Reference Repository Analysis & Master Feature Roadmap

> Comprehensive synthesis of practitioner implementations, comparative architectural breakdowns, and prioritized feature shortlists for **Project Astrophage**, derived from [Andrej Karpathy's LLM Wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and the 16 reference codebases cloned into `ref_code/`.

---

## 1. Executive Summary & Filtered Repositories

We evaluated the entire ecosystem of code wiki, persistent memory, and agent knowledge graph implementations. 

### ⏩ Skipped (Helper / Single-Utility Repositories)
* **`qmd` & `docq`**: Standalone CLI search engines for local markdown files.
* **`sqz`**: AST token compression tool for file-heavy agent tasks.
* **`cartographer-obsidian-viz`**: Obsidian visual graph renderer plugin.
* **`sqlite-s3-agent-tutorial`**: Serverless tutorial guide for AWS Lambda.

### 🎯 Shortlisted Core Architecture Repositories
1. **`Provenance-First-Wiki`** (`@AbleVarghese`): Provenance-first transclusion pointers & anti-self-citation firewall at scale (>1,000 files).
2. **`counterentry`** (`@pollockchris083-arch`): Codebase anchoring ({file, line, sha}), dead-reason decision invalidation (`predicated_on`), 3-tier write permissions, and dormancy invariants.
3. **`link`** (`@gowtham0992`): Active real-time constraint interceptors (80ms guardrails), cross-agent handoff packets, and token-budgeted memory digests (<4k chars).
4. **`iwe`** (`@gimalay`): Markdown AST queryable graph, LSP server integration, deterministic schema enforcement (`document-schema.org`), and safe refactorings.
5. **`stigmergy`** (`@sturlese`): 8 deterministic pre-commit diff gates, human entity birth gating, and ADR-023 knowledge loop postmortem.
6. **`llm-wiki-cli` (LWC)** (`@JanYork`): SQLite canonical relational store + Markdown projection, Tree-sitter CodeGraph (AST symbols, callers, callees, dependency impact).
7. **`cortexes`** (`@XBlueSky`): Bounded-span coverage plans (gap-free partitioning), superseded snapshot reclaim, and hybrid search evaluation harnesses (@5$, $).
8. **`LLM-Wiki-Agent-Workflow-Demo`** (`@WayneChou-bot`) & **`mindbase`** (`@frankchu91`): `AGENTS.md` schema-as-contract, browser/CLI AST linters, `log.md` timeline changelog, and dual-tier model routing.

---

## 2. Comparative Analysis: Reference Repositories vs. Project Astrophage

| Reference Project | Key Architectural Mechanisms | How It Differs from Current Astrophage | Key Value / Transferable Takeaway |
| :--- | :--- | :--- | :--- |
| **`Provenance-First-Wiki`** | Immutable raw source store + quote transclusion pointers into exact source spans. | Astrophage extracts free-form map-reduce summaries where exact line provenance is lost. | Mathematically eliminates citation hallucinations, context collapse, and self-citation loops. |
| **`counterentry`** | Claims bound to `{file, lines, commit_sha}`; dead-reason invalidation cascades on ADRs. | Astrophage Gatekeeper uses LLMs to classify git diffs without knowing which specific page sections are anchored to the modified lines. | Precise git-hook triggers, 90% sync cost reduction, and automated flagging of outdated architecture decisions. |
| **`link`** | Real-time constraint interceptors (80ms check on prompts); token-budgeted memory digests (<4k chars); agent handoffs. | Astrophage runs post-hoc sync on push webhooks, with no active pre-commit constraint guardrails for engineers. | Active architectural enforcement ("speak up when a rule is about to be violated") and lightweight prompt context injection. |
| **`iwe`** | Markdown AST queryable graph; deterministic schema validation (`document-schema.org`); LSP server with safe renaming. | Astrophage validates wikilinks using post-compilation regex without enforcing strict section header schemas or AST-level refactoring. | Guarantees deterministic structural compliance and native IDE editor support. |
| **`stigmergy`** | 8 deterministic diff gates before commit; human gating on "entity births" (new vocabulary). | Astrophage generates all pages and opens PRs without intermediate multi-gate pre-commit validation. | Prevents taxonomy pollution, hallucinated entities, and broken cross-references before PR creation. |
| **`llm-wiki-cli` (LWC)** | AST CodeGraph mapping symbols, callers, callees, and dependency impact. | Astrophage treats source code files as text blocks in the Ingestor. | Adds structural code understanding (call trees, symbol impact) into OpenKB entity pages. |
| **`cortexes`** | Bounded-span coverage plans (guaranteeing no dropped session/file context); disposable indexes. | Astrophage uses fixed-size chunks (`LOCAL_CHUNK_SIZE`) in map-reduce. | Guarantees complete architectural coverage without silent truncation of middle sections. |
| **`Workflow-Demo` & `mindbase`** | `AGENTS.md` schema contract; deterministic orphan/stub/broken link linter; append-only `log.md` timeline. | Astrophage hardcodes agent instructions in Python prompt strings without a root contract file or change timeline. | Standardizes the OpenKB format for any AI coding agent (Cursor, Claude Code, Copilot). |

---

## 3. Prioritized Feature Shortlist & Actionable Roadmap

```
                                  HIGH VALUE
                                      ▲
                                      │   [1. Deterministic Linter Suite (L1)]
                                      │   [2. Code Line Anchors for Gatekeeper]
                                      │   [3. Root AGENTS.md Contract & log.md]
                                      │   [4. Active Constraint Interceptors]
       [7. Bounded Coverage Audit]    │   [5. Compact Architecture Digest (<4k)]
       [8. Living Decision Graphs]    │
                                      │
  ────────────────────────────────────┼────────────────────────────────────► LOW EFFORT /
  HIGH EFFORT                         │                                      EASY TO SHIP
       [9. Tree-sitter CodeGraph]     │   [6. Atomic Ingest Placeholders]
       [10. OpenKB LSP Server]        │
                                      │
                                      ▼
                                  LOW VALUE
```

---

### 🥇 Tier 1: Major Features (High Impact & Immediate Implementation)

#### 1. Deterministic Pre-PR Quality Gate & Linter Suite (`apps/api/agents/linter.py`)
* **Sources**: `stigmergy` (8 diff gates), `LLM-Wiki-Agent-Workflow-Demo` (AST linters), `iwe` (schema validator)
* **What to Build**:
  Add an automated deterministic Python linter pipeline in Astrophage that executes before opening any GitOps PR:
  1. **Schema Linter**: Checks required OpenKB headers (`## Status`, `## Context`, `## Decision` in ADRs; `## Responsibilities`, `## Dependencies` in entities).
  2. **Wikilink & Backlink Validator**: Verifies all `[[wikilinks]]` resolve to existing files; computes backlink indexes.
  3. **Orphan & Stub Detector**: Flags any page with 0 incoming backlinks or fewer than 50 words.
  4. **Index Registry Check**: Verifies every file in the directory has an explicit entry in `index.md`.
  5. **Security / PII Screening**: Runs regex / `gitleaks` scanning to ensure proprietary tokens/keys are never committed to documentation PRs.
* **Value**: Guarantees zero broken links, empty stubs, or malformed pages before human review at zero LLM cost.

#### 2. Code Line-Range Anchoring for Gatekeeper (Deterministic Fast-Path)
* **Source**: `counterentry`
* **What to Build**:
  When the Compiler creates code-grounded pages (`summaries/api-spec.md`, `entities/*.md`), embed lightweight HTML anchor tags:
  ```markdown
  <!-- anchor: apps/api/routers/auth.py:L35-L72 sha:8f2a1b -->
  ```
  When the **Gatekeeper** receives a GitHub push webhook, it first checks if the modified line ranges in the git diff intersect any stored anchors. If an anchor is hit, Astrophage immediately identifies the exact dirty page without needing an LLM to re-evaluate the full repository diff.
* **Value**: Cuts continuous sync latency and cost by 90% and eliminates false negatives.

#### 3. Root `AGENTS.md` Schema Contract & `log.md` Audit Timeline
* **Source**: `LLM-Wiki-Agent-Workflow-Demo`
* **What to Build**:
  1. Have the Compiler generate an `AGENTS.md` file in the root of every OpenKB repo outlining structure rules, wikilink syntax, and naming conventions.
  2. Automatically maintain a `log.md` timeline inside the repository documenting every commit SHA, date, triggering webhook, and modified KB pages:
     ```markdown
     ## [2026-08-19 13:23] ingest | Full repository ingest (commit 4f9e2b1)
     ## [2026-08-19 14:10] patch | Updated summaries/api-spec.md from PR #42
     ## [2026-08-19 15:00] lint | 0 issues found, 3 orphan links resolved
     ```
* **Value**: Standardizes the OpenKB format so other AI coding tools (Claude Code, Cursor, Copilot) can read and update the repository safely.

#### 4. Active Architectural Constraint Interceptors
* **Source**: `link`
* **What to Build**:
  Extract hard rules from `decisions/` and `concepts/` (e.g., *"All endpoints must use JWT auth"*, *"Direct DB queries from frontend are forbidden"*). Expose a fast (<80ms) check in Astrophage that validates git diffs or engineer prompts against these active constraints and warns immediately if an invariant is violated.
* **Value**: Transforms passive documentation into an active architectural guardrail.

#### 5. Compact Architecture Digest (<4,000 chars)
* **Sources**: `link`, `cortexes`
* **What to Build**:
  Generate an ultra-compact `<4,000 char` executive architecture digest (`.astrophage/brief.md` / API endpoint) that can be embedded into `.cursorrules`, Claude Code memory, or IDE headers without consuming full context windows.
* **Value**: Instant architectural grounding for IDE agents with minimal token overhead.

---

### 🥈 Tier 2: Architectural Enhancements (Medium Priority)

#### 6. Atomic Ingestion Placeholder Reservations
* **Source**: `@huachen-wang` (production findings)
* **What to Build**: In multi-source or parallel ingestions, the planning step atomically reserves slugs in `index.md` (`status: planned`, `claimed_by: [ingest_id]`). If another worker created the slug, `create` gracefully degrades to `update`.
* **Value**: Prevents concurrent ingestion pipelines from creating duplicate pages (e.g. `auth` vs `authentication-service`).

#### 7. Living Decision Graphs & Falsifiable Assumptions (`predicated_on`)
* **Sources**: `counterentry`, `ednawnika` (Vigil)
* **What to Build**: Upgrade ADR templates (`decisions/*.md`) to include an explicit `## Falsifiable Assumptions` section. When continuous sync detects code changes that invalidate a premise, Gatekeeper opens a targeted PR with a `[DECISION REVIEW REQUIRED]` label.
* **Value**: Automatically detects and surfaces obsolete architecture decisions when technical premises change.

#### 8. 3-Tier Write Permissions for GitOps
* **Source**: `counterentry`
* **What to Build**:
  * **Tier 1 (`re_derivable`)**: Direct auto-commit/auto-merge for purely structural updates (API parameter lists, schema dumps).
  * **Tier 2 (`reversible`)**: Standard PRs for concept summaries and architectural descriptions.
  * **Tier 3 (`irreversible`)**: Gated PRs requiring explicit code-owner approvals for retiring ADRs or changing security policies.
* **Value**: Balances automation speed with human safety.

#### 9. Gatekeeper Precision Ledger & Alert Fatigue Governor
* **Source**: `counterentry`
* **What to Build**: Track the merge rate of Gatekeeper PRs (`merged` vs `closed_unmerged_spam`). If a team's action rate falls below 50%, automatically increase the significance threshold to prevent alert fatigue.
* **Value**: Prevents spamming developers with documentation PRs for minor changes.

#### 10. Bounded-Span Coverage Audit in Ingestor
* **Source**: `cortexes`
* **What to Build**: Generate a coverage audit report during ingestion verifying that all source modules, routers, and database models were either documented or explicitly marked as non-architectural.
* **Value**: Guarantees no silent context drops during repository ingestion.

#### 11. Dormancy Safety Invariant ("May Only Subtract")
* **Source**: `counterentry`
* **What to Build**: If a repository has had no human interaction for $>N$ days, background maintenance passes may only clean broken links, prune dead references, and merge duplicates, without synthesizing speculative new concept pages.
* **Value**: Prevents hallucination drift in dormant repositories.

---

### 🥉 Tier 3: Advanced Extensions (Long-Term)

#### 12. AST-Aware CodeGraph Extraction
* **Source**: `llm-wiki-cli` (LWC)
* **What to Build**: Integrate `tree-sitter` in the Ingestor to extract classes, functions, callers, and callees into structured dependency trees before feeding to LLMs.

#### 13. Dedicated OpenKB LSP Server
* **Source**: `iwe`
* **What to Build**: A lightweight Language Server Protocol (LSP) providing IDE auto-completion of `[[wikilinks]]` and cross-file rename refactoring in VSCode and Neovim.

---

## 📂 Reference Codebases & Documentation
* **Failure Modes & Technical Analysis**: [`user_found_issues.md`](user_found_issues.md)
* **Master Feature Roadmap**: [`feature_roadmap_and_repo_analysis.md`](feature_roadmap_and_repo_analysis.md)
* **Cloned Repositories**: All 16 reference codebases are located in [`ref_code/`](ref_code/).
