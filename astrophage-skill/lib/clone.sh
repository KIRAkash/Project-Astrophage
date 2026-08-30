#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# clone.sh — Clone or update an Astrophage KB into the local cache
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# ── Clone or pull a KB repo ───────────────────────────────────────────────────
# Returns the local path where the KB is stored.
cmd_clone_kb() {
  local kb_name="$1"
  local kb_repo_url="$2"
  local local_path="${AP_CACHE_DIR}/${kb_name}"

  if [[ -z "$kb_repo_url" ]]; then
    ap_warn "No KB repo URL available for '${kb_name}'. The KB may still be generating."
    ap_info "Check back later or visit ${AP_ONBOARD_URL}"
    echo ""
    return 1
  fi

  if [[ -d "${local_path}/.git" ]]; then
    # Already cloned — pull updates silently
    ap_log "Updating KB: ${kb_name}..."
    git -C "$local_path" pull --ff-only --quiet 2>/dev/null \
      || git -C "$local_path" fetch --quiet 2>/dev/null \
      || ap_warn "Could not pull latest — using cached version."
  else
    # Fresh clone
    ap_log "Cloning KB: ${kb_name}..."
    mkdir -p "$AP_CACHE_DIR"
    if ! git clone --depth=1 --quiet "$kb_repo_url" "$local_path" 2>/dev/null; then
      ap_err "Failed to clone KB from: $kb_repo_url"
      ap_info "Is this a private repo? Ensure your git credentials are configured."
      return 1
    fi
    ap_ok "KB cloned to: ${local_path}"
  fi

  echo "$local_path"
}

# ── Pull/refresh an already-cloned KB ────────────────────────────────────────
cmd_pull_kb() {
  local local_path="$1"
  git -C "$local_path" pull --ff-only --quiet 2>/dev/null \
    || git -C "$local_path" fetch --quiet 2>/dev/null \
    || true  # silent failure — offline usage still works
}
