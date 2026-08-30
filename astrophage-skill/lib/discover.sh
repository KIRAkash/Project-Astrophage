#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# discover.sh — Auto-discover the Astrophage KB for the current Git repo
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/clone.sh"

# ── Normalize a git URL (same logic as the server side) ───────────────────────
normalize_url() {
  local url="$1"
  url="$(echo "$url" | tr '[:upper:]' '[:lower:]')"  # lowercase (bash 3 compatible)
  # Convert SSH → HTTPS style: git@github.com:org/repo → github.com/org/repo
  url="$(echo "$url" | sed 's|^git@\([^:]*\):|\1/|')"
  # Strip https:// or http:// (two explicit rules, POSIX sed doesn't support https?)
  url="$(echo "$url" | sed 's|^https://||; s|^http://||')"
  # Strip trailing .git
  url="$(echo "$url" | sed 's|\.git$||')"
  # Strip trailing slash
  url="${url%/}"
  echo "$url"
}

# ── Get git remote URL for current directory ──────────────────────────────────
get_git_remote() {
  if ! ap_has git; then
    ap_err "git is not installed. Please install git and try again."
    return 1
  fi
  local remote
  remote=$(git remote get-url origin 2>/dev/null || git remote get-url upstream 2>/dev/null || true)
  echo "$remote"
}

# ── Query Astrophage API ───────────────────────────────────────────────────────
query_api() {
  local repo_url="$1"
  local encoded_url
  encoded_url=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$repo_url', safe=''))" 2>/dev/null \
    || python -c "import urllib.parse; print(urllib.parse.quote('$repo_url', safe=''))" 2>/dev/null \
    || echo "$repo_url" | sed 's|:|%3A|g; s|/|%2F|g' )

  ap_curl "${ASTROPHAGE_API}/api/public/kb/discover?repo_url=${encoded_url}" 2>/dev/null
}

# ── Parse JSON field (portable — tries jq, then python, then awk) ─────────────
json_get() {
  local json="$1" field="$2"
  if ap_has jq; then
    echo "$json" | jq -r ".$field // empty" 2>/dev/null
  elif ap_has python3; then
    echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$field','') or '')" 2>/dev/null
  elif ap_has python; then
    echo "$json" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('$field','') or '')" 2>/dev/null
  else
    # awk fallback — crude but works for simple string fields
    echo "$json" | grep -o "\"$field\":[[:space:]]*\"[^\"]*\"" | head -1 | sed 's/.*: *"//;s/"//'
  fi
}

json_bool() {
  local json="$1" field="$2"
  if ap_has jq; then
    echo "$json" | jq -r ".$field" 2>/dev/null
  elif ap_has python3; then
    echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('$field',False)).lower())" 2>/dev/null
  else
    echo "$json" | grep -o "\"$field\":[[:space:]]*[^,}]*" | head -1 | grep -q "true" && echo "true" || echo "false"
  fi
}

json_array_len() {
  local json="$1" field="$2"
  if ap_has jq; then
    echo "$json" | jq -r ".${field} | length" 2>/dev/null || echo 0
  elif ap_has python3; then
    echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('$field',[])))" 2>/dev/null || echo 0
  else
    echo 0
  fi
}

# ── Print suggestions table ───────────────────────────────────────────────────
print_suggestions() {
  local response="$1"
  if ap_has jq; then
    echo "$response" | jq -r '.suggestions[]? | "  • \(.app_name)  [\(.org_name // "?")]  \(.kb_repo_url // "(no repo)")"' 2>/dev/null | head -10
  elif ap_has python3; then
    echo "$response" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for s in d.get('suggestions', [])[:10]:
    print(f\"  • {s.get('app_name','?')}  [{s.get('org_name','?')}]  {s.get('kb_repo_url') or '(no repo)'}\" )
" 2>/dev/null
  fi
}

# ── Main discover flow ────────────────────────────────────────────────────────
cmd_discover() {
  local force="${1:-}"    # pass --force to bypass cache

  # 1. Get git remote
  local repo_url
  repo_url=$(get_git_remote)

  if [[ -z "$repo_url" ]]; then
    ap_warn "Not inside a Git repository (or no remote configured)."
    echo ""
    ap_info "You can still manually fetch a KB:"
    echo -e "  ${C_CYAN}ap list${C_RESET}           — see all available KBs"
    echo -e "  ${C_CYAN}ap fetch <name>${C_RESET}   — pull a specific KB by name"
    return 1
  fi

  local norm_url
  norm_url=$(normalize_url "$repo_url")

  # 2. Check local cache first (skip if --force)
  if [[ "$force" != "--force" ]]; then
    local cached_path
    cached_path=$(ap_config_get "$norm_url")
    if [[ -n "$cached_path" && -d "$cached_path" ]]; then
      ap_log "Cached KB found at: $cached_path — running git pull..."
      cmd_pull_kb "$cached_path"
      echo "$cached_path"
      return 0
    fi
  fi

  # 3. Query Astrophage API
  ap_log "Looking up KB for: ${C_CYAN}${repo_url}${C_RESET}"
  local response
  response=$(query_api "$repo_url" 2>/dev/null) || {
    ap_warn "Astrophage API unreachable at ${ASTROPHAGE_API}."
    ap_info "Set ASTROPHAGE_API=https://your-astrophage-instance in your shell to configure."
    return 1
  }

  if [[ -z "$response" ]]; then
    ap_err "Empty response from Astrophage API."
    return 1
  fi

  local found
  found=$(json_bool "$response" "found")

  if [[ "$found" == "true" ]]; then
    local kb_name kb_repo_url
    kb_name=$(json_get "$response" "kb_name")
    kb_repo_url=$(json_get "$response" "kb_repo_url")
    local app_name
    app_name=$(json_get "$response" "app_name")

    ap_ok "Found KB: ${C_BOLD}${app_name}${C_RESET} → ${C_CYAN}${kb_repo_url}${C_RESET}"

    # Clone/update the KB
    local local_path
    local_path=$(cmd_clone_kb "$kb_name" "$kb_repo_url")

    # Cache the mapping
    ap_config_set "$norm_url" "$local_path"

    # Report linked KBs
    local linked_count
    linked_count=$(json_array_len "$response" "linked_kbs")
    if [[ "$linked_count" -gt 0 ]]; then
      ap_info "${linked_count} linked KB(s) in this org. Fetch them with: ${C_CYAN}ap fetch <name>${C_RESET}"
      if ap_has jq; then
        echo "$response" | jq -r '.linked_kbs[]? | "  • \(.app_name): \(.kb_repo_url // "(pending)")"' 2>/dev/null | head -5
      fi
    fi

    echo "$local_path"
    return 0
  else
    # Not found
    ap_warn "No Astrophage KB found for this repository."
    echo ""

    local suggestion_count
    suggestion_count=$(json_array_len "$response" "suggestions")
    if [[ "$suggestion_count" -gt 0 ]]; then
      ap_info "Available KBs on this Astrophage instance:"
      print_suggestions "$response"
      echo ""
      ap_info "To use one of these KBs: ${C_CYAN}ap fetch <kb-name>${C_RESET}"
    fi

    echo -e "${C_YELLOW}📡 Onboard this repo to Astrophage:${C_RESET}"
    echo -e "   ${C_CYAN}${AP_ONBOARD_URL}?repo=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${repo_url}', safe=''))" 2>/dev/null || echo "${repo_url}")${C_RESET}"
    return 1
  fi
}
