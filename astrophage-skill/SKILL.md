---
name: astrophage-kb
description: >
  Provides instant, structured access to Astrophage-generated Knowledge Bases (KBs) for any Git repository.
  Auto-discovers and clones the KB for the current repo, searches it with ranked full-text results,
  reads specific KB files, and follows cross-KB wikilinks. Works offline once the KB is cloned.
  Compatible with Claude Code, Codex, Cursor, Antigravity, Copilot, and any agent that can run bash.
triggers:
  - "understand the codebase architecture"
  - "find the API spec"
  - "how does X work"
  - "what is the data model"
  - "explain the system design"
  - "find the entity for"
  - "how are services connected"
  - "what are the dependencies"
  - "architecture decision"
  - "find documentation for"
  - "what does this repo do"
---

# 🌌 Astrophage KB Skill

Use this skill whenever you need to understand the architecture, APIs, entities, or design decisions of the current codebase. The Astrophage skill gives you access to a structured, AI-generated Knowledge Base (KB) that is always up to date with the repository.

---

## Prerequisites

The `ap` CLI must be installed. Check with:

```bash
which ap
```

If not installed, install it silently:

```bash
curl -fsSL https://raw.githubusercontent.com/KIRAkash/Project-Astrophage/main/astrophage-skill/install.sh | bash
```

Or, if you have the repo locally:

```bash
bash /path/to/astrophage-skill/install.sh
```

> The install script is fully self-contained. It does not require Docker, Node, or any pre-existing tools beyond `git` and `bash`. It will attempt to install `qmd` for best search quality if `npm` or `bun` is available, but falls back to `ripgrep`/`grep` silently.

---

## Step 1 — Discover the KB

**Always run this first when entering a new repo or when the KB is not yet loaded.**

```bash
ap discover
```

This command:
1. Reads `git remote get-url origin` from the current directory
2. Queries the Astrophage API to look up the KB for that repo
3. Clones the KB into `~/.astrophage/<kb-name>/`
4. Reports any linked KBs (other services in the same org)

**Expected output (KB found):**

```
✓ Found KB: my-app → https://github.com/my-org/openkb-my-app
✓ KB cloned to: /Users/you/.astrophage/openkb-my-app
ℹ 2 linked KB(s) in this org. Fetch them with: ap fetch <name>
  • order-service: https://github.com/my-org/openkb-order-service
  • auth-service: https://github.com/my-org/openkb-auth-service
```

**If no KB is found**, the tool will:
- List all available KBs on this Astrophage instance
- Suggest related KBs from the same org
- Provide an onboarding URL to add this repo to Astrophage

---

## Step 2 — Search the KB

Use natural-language or keyword queries. The tool uses `qmd` (BM25 + vector) if available, falls back to `ripgrep`, then `grep`. Output is always capped at ~4,000 chars for context efficiency.

```bash
ap search "authentication flow"
ap search "database schema"
ap search "API endpoints for payments"
ap search "how the gatekeeper decides significance"
```

**Output format:**

```markdown
## Astrophage KB Search Results
Query: "authentication flow"

### summaries/api-spec.md
**## Authentication**
All API endpoints require a Bearer JWT token in the Authorization header.
Tokens are issued by POST /api/auth/login and expire after 24 hours...

### concepts/business-logic.md
**## Auth Flow**
The authentication lifecycle begins at the login page, which calls the auth service...

### decisions/adr-003-jwt-auth.md
**## Decision**
We chose JWT over session cookies to support stateless horizontal scaling...
```

The output is **ready to use directly in your response** — cite the file path (`summaries/api-spec.md`) when referencing KB content.

---

## Step 3 — Read a Specific File

When you know which KB file you need (e.g. from search results):

```bash
ap read index.md
ap read summaries/api-spec.md
ap read entities/user.md
ap read decisions/adr-001-initial.md
```

You can also use partial paths — `ap` will resolve `.md` extension automatically:

```bash
ap read summaries/api-spec   # same as summaries/api-spec.md
```

When a file contains `[[kb:other-app/page]]` cross-KB links, `ap read` will automatically detect them and offer to fetch the linked KB.

---

## Step 4 — Follow Cross-KB Links

When the KB page you're reading references another service's KB with `[[kb:app-name/page]]` syntax:

```bash
# See all cross-KB links in a file and fetch missing linked KBs:
ap links ~/.astrophage/openkb-my-app/summaries/api-spec.md

# Or explicitly fetch a specific linked KB:
ap fetch order-service
ap fetch openkb-auth-service   # with or without openkb- prefix

# Then read the page from the linked KB:
ap read ~/.astrophage/openkb-order-service/summaries/events.md
```

---

## Other Useful Commands

```bash
# List all KBs on this Astrophage instance:
ap list

# See cached KBs and tool status:
ap status

# Pull latest for all cached KBs:
ap update

# Force re-discover (bypasses cache):
ap discover --force
```

---

## KB Structure Reference

Every Astrophage KB follows this standard layout:

```
openkb-<app-name>/
├── index.md                  # Architecture overview + navigation table
├── AGENTS.md                 # Schema contract + rules (for agents)
├── log.md                    # Change timeline (KB update history)
├── summaries/
│   ├── api-spec.md           # REST endpoints, auth, request/response schemas
│   ├── db-schema.md          # Database tables, relationships, indexes
│   └── core-logic.md         # Key algorithms and business rules
├── concepts/
│   ├── business-logic.md     # Domain workflows and rules
│   └── data-flows.md         # How data moves through the system
├── entities/
│   ├── microservices.md      # Service inventory and responsibilities
│   ├── databases.md          # Database instances and configurations
│   └── integrations.md       # Third-party dependencies
└── decisions/
    └── adr-001-initial.md    # Architecture Decision Records
```

**Always start with `index.md`** for a high-level orientation. Use `summaries/` for API and schema details. Use `concepts/` for understanding workflows. Use `decisions/` for understanding *why* something was built a certain way.

---

## Decision Tree — When the KB Is Missing

```
ap discover
    │
    ├── KB found → proceed with ap search / ap read
    │
    └── KB not found
            │
            ├── ap list → user picks an existing KB → ap fetch <name>
            │
            └── Repo not in Astrophage yet
                    → Tell user: "This repo doesn't have an Astrophage KB yet."
                    → Provide link: https://astrophage.app/onboard?repo=<remote-url>
                    → Offer to continue without KB (fall back to standard code reading)
```

---

## Environment Configuration

| Variable | Default | Purpose |
|---|---|---|
| `ASTROPHAGE_API` | `http://localhost:8000` | Astrophage backend URL |
| `AP_CACHE_DIR` | `~/.astrophage` | Local KB cache directory |
| `AP_SEARCH_TOOL` | `auto` | Force search tool: `qmd`, `rg`, or `grep` |
| `AP_MAX_SEARCH_RESULTS` | `8` | Max results returned per search |
| `AP_MAX_TOTAL_OUTPUT` | `4000` | Max chars in search output (context budget) |

Set these in your shell profile (`.zshrc`, `.bashrc`) or in the repo's `.env` file.

---

## Agent Integration Notes

- **Always run `ap discover` silently first** — it's fast (<2s) and cached after the first call.
- **Do not parse raw grep output yourself** — use `ap search` which handles all tool-specific formatting.
- **Cite file paths** in your responses (e.g. "According to `summaries/api-spec.md`...") so the user can verify.
- **Cross-KB links matter** — if `api-spec.md` links to `[[kb:auth-service/summaries/api-spec]]`, fetch it before answering questions that span services.
- The `ap search` output is **already truncated** to fit context windows. Do not truncate further.
