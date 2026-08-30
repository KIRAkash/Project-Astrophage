#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# list.sh — List all Astrophage KBs from the public API
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

cmd_list() {
  ap_log "Fetching KB list from ${ASTROPHAGE_API}..."

  local response
  response=$(ap_curl "${ASTROPHAGE_API}/api/public/kb/list" 2>/dev/null) || {
    ap_err "Cannot reach Astrophage API at ${ASTROPHAGE_API}"
    ap_info "Set ASTROPHAGE_API=https://your-instance in your shell and retry."
    return 1
  }

  if [[ -z "$response" || "$response" == "[]" ]]; then
    ap_info "No published KBs found on this Astrophage instance."
    return 0
  fi

  echo ""
  echo -e "${C_BOLD}${C_CYAN}🌌 Astrophage Knowledge Bases${C_RESET}"
  echo -e "${C_DIM}$(echo "$response" | (ap_has jq && jq -r 'length' || echo '?')) KB(s) available${C_RESET}"
  echo ""

  if ap_has jq; then
    echo "$response" | jq -r '.[] | "  \(.kb_name)  [\(.org_name // "?")]  \(.kb_repo_url // "(generating)")"' 2>/dev/null
  elif ap_has python3; then
    echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for kb in data:
    repo = kb.get('kb_repo_url') or '(generating)'
    print(f\"  {kb.get('kb_name','?')}  [{kb.get('org_name','?')}]  {repo}\")
" 2>/dev/null
  else
    # Crude grep-based fallback
    echo "$response" | grep -o '"kb_name":"[^"]*"' | sed 's/"kb_name"://;s/"//g' | while read -r n; do
      echo "  $n"
    done
  fi

  echo ""
  echo -e "${C_DIM}To fetch a KB: ${C_CYAN}ap fetch <kb-name>${C_RESET}"
}
