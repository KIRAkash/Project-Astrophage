# Astrophage KB — Knowledge Base Access

You have access to the Astrophage KB skill via the `ap` CLI. This gives you structured, AI-generated knowledge bases for the current repository and linked services.

## When to use

Use the Astrophage KB **before** reading source code when:
- Asked to explain architecture, APIs, data models, or system design
- Asked about how services connect or communicate
- Asked about architecture decisions (ADRs)
- Exploring an unfamiliar codebase for the first time

## Quick start

```bash
# 1. Discover and clone the KB for this repo (run first, always)
ap discover

# 2. Search for anything
ap search "<what you need to understand>"

# 3. Read a specific KB file
ap read summaries/api-spec.md
ap read index.md

# 4. List all KB files in cache
ap status
```

## Command reference

```bash
ap discover              # Auto-detect KB for current git repo
ap search <query>        # Full-text ranked search (uses qmd/rg/grep)
ap read   <file>         # Print a KB file (e.g. summaries/api-spec.md)
ap fetch  <kb-name>      # Manually fetch a specific KB by name
ap list                  # List all Astrophage KBs
ap links  <file>         # Resolve cross-KB [[kb:...]] links in a file
ap status                # Show cached KBs and config
ap update                # Pull latest for all cached KBs
```

## KB structure

```
openkb-<app>/
├── index.md              ← Start here: architecture overview
├── summaries/
│   ├── api-spec.md       ← REST endpoints, auth, schemas
│   ├── db-schema.md      ← Tables, relationships, indexes
│   └── core-logic.md     ← Algorithms, business rules
├── concepts/
│   ├── business-logic.md ← Domain workflows
│   └── data-flows.md     ← How data moves
├── entities/
│   ├── microservices.md  ← Service inventory
│   └── integrations.md   ← Third-party deps
└── decisions/
    └── adr-*.md          ← Architecture Decision Records
```

## If no KB exists

Run `ap list` to see available KBs, or `ap fetch <name>` to pull one manually.
If this repo hasn't been onboarded: https://astrophage.app/onboard

## Environment

- `ASTROPHAGE_API` — backend URL (default: `http://localhost:8000`)
- `AP_CACHE_DIR` — local cache (default: `~/.astrophage`)
- `AP_SEARCH_TOOL` — force tool: `qmd` | `rg` | `grep` (default: `auto`)
