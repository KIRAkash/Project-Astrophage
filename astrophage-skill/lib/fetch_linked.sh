#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# fetch_linked.sh — Resolve and fetch cross-KB [[kb:app-name/path]] links
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/clone.sh"

# ── Fetch a KB by name (used by `ap fetch <name>`) ───────────────────────────
cmd_fetch() {
  local kb_name="$1"
  if [[ -z "$kb_name" ]]; then
    ap_err "Usage: ap fetch <kb-name>"
    ap_info "Run ${C_CYAN}ap list${C_RESET} to see available KBs."
    return 1
  fi

  # Normalize name: ensure it starts with openkb- prefix
  local normalized_name="$kb_name"
  [[ "$kb_name" != openkb-* ]] && normalized_name="openkb-${kb_name}"

  ap_log "Fetching KB: ${normalized_name}"

  # Get repo URL from API
  local response
  response=$(ap_curl "${ASTROPHAGE_API}/api/public/kb/list" 2>/dev/null) || {
    ap_err "Cannot reach Astrophage API."
    return 1
  }

  local kb_repo_url=""
  if ap_has jq; then
    kb_repo_url=$(echo "$response" | jq -r ".[] | select(.kb_name==\"${normalized_name}\") | .kb_repo_url" 2>/dev/null | head -1)
  elif ap_has python3; then
    kb_repo_url=$(echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
target = sys.argv[1]
for kb in data:
    if kb.get('kb_name') == target:
        print(kb.get('kb_repo_url') or '')
        break
" "$normalized_name" 2>/dev/null)
  fi

  if [[ -z "$kb_repo_url" ]]; then
    ap_err "KB not found: ${normalized_name}"
    ap_info "Run ${C_CYAN}ap list${C_RESET} to see available KBs."
    return 1
  fi

  local local_path
  local_path=$(cmd_clone_kb "$normalized_name" "$kb_repo_url") || return 1
  ap_ok "KB ready at: ${local_path}"
  echo "$local_path"
}

# ── Find and resolve [[kb:app-name/page]] cross-links in a markdown file ──────
cmd_resolve_links() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    ap_err "File not found: $file"
    return 1
  fi

  # Extract [[kb:<name>/...]] wikilinks — use python3 if available (more reliable), fallback to grep
  local links=""
  if command -v python3 &>/dev/null; then
    links=$(python3 -c "
import sys, re
text = open(sys.argv[1], errors='replace').read()
for m in re.findall(r'\[\[kb:[^\]]+\]\]|\bap:[A-Za-z0-9_-]+/[A-Za-z0-9_/-]+(?:\.md)?', text):
    print(m)
" "$file" 2>/dev/null | sort -u)
  else
    # macOS ERE: [[] matches literal [
    links=$(grep -oE '[[][[]kb:[^/]]+/[^]]+[]][]|\bap:[A-Za-z0-9_-]+/[A-Za-z0-9_/-]+(\.md)?' "$file" 2>/dev/null | sort -u || true)
  fi

  if [[ -z "$links" ]]; then
    ap_info "No cross-KB links found in: $file"
    return 0
  fi

  echo ""
  echo -e "${C_BOLD}Cross-KB links found in: $(basename "$file")${C_RESET}"
  echo ""

  while IFS= read -r link; do
    # Parse [[kb:app-name/path]]
    local inner="${link#\[\[kb:}"
    if [[ "$link" == ap:* ]]; then
      inner="${link#ap:}"
      inner="${inner%.md}"
    fi
    inner="${inner%\]\]}"
    local linked_kb_name="${inner%%/*}"
    local linked_path="${inner#*/}"

    echo -e "  ${C_CYAN}${link}${C_RESET}"

    # Check if already cloned
    local local_kb_path="${AP_CACHE_DIR}/openkb-${linked_kb_name}"
    if [[ -d "${local_kb_path}/.git" ]]; then
      local resolved="${local_kb_path}/${linked_path}.md"
      if [[ -f "$resolved" ]]; then
        echo -e "    ${C_GREEN}✓ Resolved${C_RESET}: ${resolved}"
      else
        echo -e "    ${C_YELLOW}⚠${C_RESET}  KB cloned but page not found: ${linked_path}.md"
      fi
    else
      echo -e "    ${C_YELLOW}→ Fetching linked KB: openkb-${linked_kb_name}${C_RESET}"
      cmd_fetch "openkb-${linked_kb_name}" 2>/dev/null \
        && echo -e "    ${C_GREEN}✓ Now available at: ${local_kb_path}/${linked_path}.md${C_RESET}" \
        || echo -e "    ${C_RED}✗ Could not fetch linked KB${C_RESET}"
    fi
    echo ""
  done <<< "$links"
}
