#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# init.sh — Initialize Astrophage skill for various AI agents
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

cmd_init() {
  local agent="${1:-}"

  if [[ -z "$agent" ]]; then
    ap_info "Usage: ap init <agent>"
    ap_info "Supported agents:"
    echo "  cursor       (Creates .cursorrules)"
    echo "  claude       (Creates clauderc.toml)"
    echo "  antigravity  (Installs to ~/.gemini/config/skills)"
    echo "  copilot      (Creates .github/copilot-instructions.md)"
    return 1
  fi

  local integrations_dir="$(cd "$SCRIPT_DIR/../integrations" && pwd)"

  case "$agent" in
    cursor)
      if [[ -f "$integrations_dir/cursor/.cursorrules" ]]; then
        cp "$integrations_dir/cursor/.cursorrules" .cursorrules
        ap_ok "Created .cursorrules for Cursor."
      else
        ap_err "Cursor integration file not found."
      fi
      ;;
    claude)
      if [[ -f "$integrations_dir/claude/clauderc.toml" ]]; then
        cp "$integrations_dir/claude/clauderc.toml" clauderc.toml
        ap_ok "Created clauderc.toml for Claude Code."
      else
        # Fallback to create one
        cat << 'TOML' > clauderc.toml
# Astrophage KB rules
[rules]
astrophage = "Use the `ap` CLI to understand architecture. Run `ap discover` first. If it fails, review the list and use `ap link <url>`. To search, use `ap search <query>`. You should traverse between KBs if you see `ap:app/path` links to find required info."
TOML
        ap_ok "Created clauderc.toml for Claude Code."
      fi
      ;;
    antigravity)
      local ag_dir="$HOME/.gemini/config/skills/astrophage"
      mkdir -p "$ag_dir"
      if [[ -f "$integrations_dir/antigravity/SKILL.md" ]]; then
        cp "$integrations_dir/antigravity/SKILL.md" "$ag_dir/SKILL.md"
        ap_ok "Installed Antigravity skill directly into ~/.gemini/config/skills."
      else
        ap_err "Antigravity integration file not found."
      fi
      ;;
    copilot)
      mkdir -p .github
      if [[ -f "$integrations_dir/copilot/copilot-instructions.md" ]]; then
        cp "$integrations_dir/copilot/copilot-instructions.md" .github/copilot-instructions.md
      else
        cat << 'MD' > .github/copilot-instructions.md
# Astrophage KB
When asked about architecture, always use the `ap` CLI tool to query the Knowledge Base.
Commands:
- `ap discover` to find the KB. If it fails, pick a KB from the list and use `ap link <url>`.
- `ap search <query>` to search.
- You can traverse between multiple KBs if you see `ap:app/path` links to find required information.
MD
      fi
      ap_ok "Created .github/copilot-instructions.md for GitHub Copilot."
      ;;
    *)
      ap_err "Unknown agent: $agent"
      ap_info "Supported: cursor, claude, antigravity, copilot"
      return 1
      ;;
  esac
}
