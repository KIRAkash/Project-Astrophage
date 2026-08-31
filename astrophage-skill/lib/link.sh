#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# link.sh — Manually link a KB repository to the current codebase
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/discover.sh"
source "$SCRIPT_DIR/clone.sh"

cmd_link() {
  local kb_repo_url="${1:-}"

  if [[ -z "$kb_repo_url" ]]; then
    ap_err "Usage: ap link <kb-repo-url>"
    ap_info "Example: ap link https://github.com/my-org/openkb-my-app"
    return 1
  fi

  local repo_url
  repo_url=$(get_git_remote 2>/dev/null)
  
  if [[ -z "$repo_url" ]]; then
    ap_err "Not inside a Git repository (or no remote configured)."
    return 1
  fi

  local norm_url
  norm_url=$(normalize_url "$repo_url")

  # Extract a sensible KB name from the URL (e.g. openkb-my-app)
  local kb_name
  kb_name=$(basename "$kb_repo_url" .git)

  ap_log "Manually linking KB '${kb_name}' to ${norm_url}..."

  local local_path
  if local_path=$(cmd_clone_kb "$kb_name" "$kb_repo_url"); then
    ap_config_set "$norm_url" "$local_path"
    ap_ok "Successfully linked! 'ap discover' will now use this KB."
    return 0
  else
    ap_err "Failed to link KB."
    return 1
  fi
}
