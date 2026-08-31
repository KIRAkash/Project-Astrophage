# 🌌 Astrophage Skill

> **Instant, structured access to AI-generated architecture Knowledge Bases for any git repo.**

The Astrophage Skill gives any AI coding agent (Claude Code, Codex, Cursor, Antigravity, Copilot) a single command to discover, search, and read the architecture documentation for the current repository — automatically.

---

## What is an Astrophage KB?

[Project Astrophage](https://github.com/KIRAkash/Project-Astrophage) generates living, AI-maintained architecture documentation from your source code, Confluence, Notion, Jira, and Slack — committed as structured Markdown to a Git repository and kept in sync automatically.

Each generated KB contains:
- `index.md` — architecture overview + navigation map
- `summaries/api-spec.md` — REST endpoints, auth, schemas
- `summaries/db-schema.md` — database tables and relationships
- `concepts/business-logic.md` — domain workflows
- `entities/microservices.md` — service inventory
- `decisions/adr-*.md` — Architecture Decision Records

The `ap` CLI connects your AI agent to these KBs.

---

## Install

```bash
# One-liner (from anywhere):
curl -fsSL https://raw.githubusercontent.com/KIRAkash/Project-Astrophage/main/astrophage-skill/install.sh | bash

# Or locally from this repo:
bash astrophage-skill/install.sh
```

**Requirements:** `git` and `bash`. That's it. Everything else is auto-detected and optional:
- `qmd` — installed automatically if `npm` or `bun` is present (best search quality)
- `ripgrep` — used if `qmd` isn't available
- `grep` — always-available POSIX fallback
- `python3` / `jq` — used for JSON parsing and result scoring (with fallbacks)

---

## Commands

```bash
ap discover              # Auto-detect & clone KB for current git repo
ap search <query>        # Full-text ranked search across the KB
ap read   <file>         # Print a KB file (e.g. ap read summaries/api-spec.md)
ap fetch  <kb-name>      # Manually clone a KB by name
ap list                  # List all Astrophage KBs on this instance
ap links  <file>         # Detect & fetch cross-KB [[kb:...]] wikilinks
ap status                # Show cached KBs, API endpoint, search tool
ap update                # Pull latest for all cached KBs
ap help                  # Full command reference
```

---

## Quick Tour

```bash
# Step into any git repo and run:
ap discover
# → Finds and clones the KB for this repo

ap search "authentication"
# → Returns ranked KB excerpts mentioning authentication

ap read summaries/api-spec.md
# → Prints the full API spec page

ap read index.md
# → Architecture overview and file navigation map

ap links ~/.astrophage/openkb-my-app/summaries/api-spec.md
# → Detects [[kb:auth-service/...]] links and fetches linked KBs
```

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `ASTROPHAGE_API` | `http://localhost:8000` | Astrophage backend URL. Set to your deployed instance. |
| `AP_CACHE_DIR` | `~/.astrophage` | Where KBs are cloned locally. |
| `AP_SEARCH_TOOL` | `auto` | Force: `qmd` \| `rg` \| `grep` |
| `AP_MAX_SEARCH_RESULTS` | `8` | Number of results returned. |
| `AP_MAX_TOTAL_OUTPUT` | `4000` | Max chars in search output (agent context budget). |

Set these in your shell profile:
```bash
export ASTROPHAGE_API=https://your-astrophage-instance.app
```

Or in your project's `.env`:
```bash
ASTROPHAGE_API=https://your-astrophage-instance.app
```

---

## Agent Integration

You can easily initialize the Astrophage skill for your favorite AI agent by running the `ap init` command within your repository:

### Claude Code
```bash
ap init claude
```
*Creates a `CLAUDE.md` memory file in your project.*

### Cursor
```bash
ap init cursor
```
*Appends Astrophage instructions to your project's `.cursorrules` file.*

### Antigravity
```bash
ap init antigravity
```
*Installs the skill directly into `~/.gemini/config/skills` globally.*

### GitHub Copilot
```bash
ap init copilot
```
*Creates `.github/copilot-instructions.md`.*

### Any other agent
Point the agent to `SKILL.md` in this directory. It is written to be universally readable by any LLM-based coding agent.

---

## How Discovery Works

```
ap discover
    │
    ├── 1. git remote get-url origin → extract repo URL
    │
    ├── 2. Normalize URL (strips .git, https://, git@)
    │
    ├── 3. GET /api/public/kb/discover?repo_url=<url>  (no auth)
    │         │
    │         ├── found=true  → clone/pull ~/.astrophage/<kb-name>/
    │         │                 cache mapping for future instant lookups
    │         │
    │         └── found=false → list suggestions from same org
    │                           offer onboarding link
    │
    └── 4. Return local KB path
```

The Astrophage API endpoint is **public and read-only** — no authentication required. Only published KBs are listed.

---

## Search Engine Priority

```
qmd (BM25 + vector + reranking)   ← best quality, requires Node/Bun
  ↓ not available?
rg / ripgrep (structured grep)    ← fast, great for keyword search
  ↓ not available?
grep (POSIX fallback)             ← always works, everywhere
  ↓ always
Python scorer                     ← ranks by heading proximity + keyword density
```

Search output is always capped at ~4,000 chars to fit agent context windows.

---

## File Structure

```
astrophage-skill/
├── SKILL.md                    # Universal skill instructions (all agents)
├── README.md                   # This file
├── install.sh                  # One-liner installer
├── uninstall.sh                # Clean removal
├── bin/
│   └── ap                      # Main CLI entrypoint
├── lib/
│   ├── config.sh               # Central config + helpers
│   ├── discover.sh             # Git remote detection + API lookup
│   ├── clone.sh                # Git clone/pull KB repos
│   ├── search.sh               # qmd/rg/grep search + Python scorer
│   ├── fetch_linked.sh         # Cross-KB [[kb:...]] link resolver
│   └── list.sh                 # List KBs from API
├── integrations/
│   ├── claude/CLAUDE.md        # Claude Code memory file
│   ├── cursor/.cursorrules     # Cursor rules
│   ├── codex/AGENTS.md         # Codex AGENTS.md spec
│   └── antigravity/SKILL.md   # Antigravity skill
└── tests/
    ├── test_discover.sh        # URL normalization + API parsing tests
    ├── test_search.sh          # Search integration tests (fixture KB)
    └── test_fetch.sh           # Cross-KB link detection tests
```

---

## Running Tests

```bash
bash astrophage-skill/tests/test_discover.sh
bash astrophage-skill/tests/test_search.sh
bash astrophage-skill/tests/test_fetch.sh
```

All tests use fixture data — no network calls, no Astrophage API required.

---

## Uninstall

```bash
bash ~/.astrophage-skill/uninstall.sh
# Cached KBs in ~/.astrophage/ are kept (they're just git repos)
# To remove: rm -rf ~/.astrophage
```

---

## Part of Project Astrophage

This skill is part of [Project Astrophage](https://github.com/KIRAkash/Project-Astrophage) — an autonomous, AI-driven knowledge base platform that keeps your architecture documentation always in sync with your code.

**Don't have a KB yet?** [Onboard your repo →](https://astrophage.app/onboard)
