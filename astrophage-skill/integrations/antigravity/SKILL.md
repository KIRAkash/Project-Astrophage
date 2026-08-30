---
name: astrophage-kb
description: >
  Antigravity skill for accessing Astrophage Knowledge Bases via the `ap` CLI.
  Activates when the user needs to understand codebase architecture, API specs,
  data models, service dependencies, or architecture decisions. Auto-discovers
  and searches the KB for the current repo. Works with any repo that has been
  onboarded to an Astrophage instance.
triggers:
  - "understand the architecture"
  - "explain the codebase"
  - "find the API"
  - "what does this service do"
  - "how does X connect to Y"
  - "database schema"
  - "architecture decision"
  - "what is the data model"
  - "service dependencies"
  - "how is X implemented"
---

# Astrophage KB Skill (Antigravity)

This skill provides access to AI-generated architecture Knowledge Bases via the `ap` CLI.

## Instructions

Read the full skill instructions at:

```
/Users/akash/Documents/Projects/Project Astrophage/astrophage-skill/SKILL.md
```

Or from the install location:

```
~/.astrophage-skill/SKILL.md
```

## Quick Reference

```bash
ap discover              # Auto-detect KB for current git repo — run first
ap search "<query>"      # Search the KB (BM25 + fallback)
ap read <file>           # Read a KB file (e.g. summaries/api-spec.md)
ap list                  # List all available KBs
ap fetch <kb-name>       # Clone a specific KB
ap status                # Show cache state and search engine
```

The `SKILL.md` above has the complete usage guide including cross-KB link resolution and the decision tree for missing KBs.
