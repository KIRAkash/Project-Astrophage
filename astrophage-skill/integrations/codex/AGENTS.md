# Astrophage KB — Agent Contract

## Purpose

This file tells AI coding agents (Codex, Claude Code, Cursor, Antigravity, Copilot, etc.) how to access the Astrophage Knowledge Base for this repository.

Astrophage generates and maintains structured, AI-readable architecture documentation (KBs) from source code, Confluence, Notion, Jira, and Slack. The `ap` CLI is the agent interface.

## Tools Available

The `ap` CLI is a bash command installed at `/usr/local/bin/ap` (or `~/.local/bin/ap`).

### Discovery

```bash
ap discover
```

Checks if this repository has an Astrophage KB. If found, clones it locally. Always run this first when entering a repository.

### Search

```bash
ap search "<natural language or keyword query>"
```

Searches the KB using BM25 full-text search (via `qmd` if available, ripgrep otherwise). Returns ranked, excerpt-rich results capped at 4,000 chars. Use this to find architecture details, API specs, data models, and decisions.

### Read

```bash
ap read <kb-file>
```

Reads a specific KB file. Examples:
- `ap read index.md` — architecture overview
- `ap read summaries/api-spec.md` — REST endpoints and auth
- `ap read summaries/db-schema.md` — database schema
- `ap read entities/user.md` — User entity model
- `ap read decisions/adr-001-initial.md` — Initial Architecture Decision Record

### List and Fetch

```bash
ap list              # list all KBs on this Astrophage instance
ap fetch <name>      # clone a specific KB (e.g. ap fetch auth-service)
ap links <file>      # auto-fetch cross-KB [[kb:...]] links from a file
```

### Status

```bash
ap status            # show cached KBs, API endpoint, search tool
ap update            # pull latest for all cached KBs
```

## KB Structure

```
openkb-<app-name>/
├── index.md                  # ALWAYS READ FIRST — architecture overview + file map
├── AGENTS.md                 # Schema contract and rules for this KB
├── log.md                    # KB update timeline
├── summaries/
│   ├── api-spec.md
│   ├── db-schema.md
│   └── core-logic.md
├── concepts/
│   ├── business-logic.md
│   └── data-flows.md
├── entities/
│   ├── microservices.md
│   └── integrations.md
└── decisions/
    └── adr-*.md
```

## Cross-KB Wikilinks

KB files use `[[kb:app-name/page-path]]` syntax for cross-service references. When you see these:

1. Run `ap links <current-file>` to detect and resolve them
2. Or `ap fetch <app-name>` to pull the linked KB manually
3. Then `ap read ~/.astrophage/openkb-<app-name>/<page-path>.md`

## Workflow

```
1. ap discover
2. ap read index.md                  (orientation)
3. ap search "<specific question>"   (targeted lookup)
4. ap read <result-file>             (read the matched file)
5. ap links <result-file>            (follow cross-KB refs if needed)
```

## When No KB Exists

1. `ap list` to see all available KBs — pick the closest match
2. `ap fetch <name>` to use it
3. If this repo is not onboarded: `https://astrophage.app/onboard?repo=<remote-url>`

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ASTROPHAGE_API` | `http://localhost:8000` | Astrophage backend URL |
| `AP_CACHE_DIR` | `~/.astrophage` | Local KB cache |
| `AP_SEARCH_TOOL` | `auto` | `qmd` \| `rg` \| `grep` |

## Rules for Agents

- **Always run `ap discover` first** when entering a new repository session.
- **Cite KB sources** in responses: `According to summaries/api-spec.md: ...`
- **Do not modify KB files** — they are read-only outputs managed by Astrophage.
- **Prefer KB content over source code reading** for architecture and design questions.
- **Follow cross-KB links** before answering questions that span multiple services.
