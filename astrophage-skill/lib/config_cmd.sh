#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# config_cmd.sh — Manage global Astrophage settings
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

cmd_config() {
  local action="${1:-}"
  local key="${2:-}"
  local val="${3:-}"

  local global_config="${AP_CACHE_DIR}/.ap_global_config"

  if [[ -z "$action" ]]; then
    ap_info "Usage: ap config set <key> <value>"
    ap_info "       ap config get <key>"
    ap_info "       ap config list"
    echo ""
    echo -e "Available keys:"
    echo -e "  ${C_CYAN}api${C_RESET}       (ASTROPHAGE_API instance URL)"
    return 0
  fi

  case "$action" in
    set)
      if [[ -z "$key" || -z "$val" ]]; then
        ap_err "Usage: ap config set <key> <value>"
        return 1
      fi
      if [[ "$key" == "api" || "$key" == "ASTROPHAGE_API" ]]; then
        key="ASTROPHAGE_API"
      else
        ap_err "Unknown config key: $key"
        return 1
      fi
      
      touch "$global_config"
      grep -v "^export ${key}=" "$global_config" > "${global_config}.tmp" 2>/dev/null || true
      mv "${global_config}.tmp" "$global_config"
      echo "export ${key}=\"${val}\"" >> "$global_config"
      
      ap_ok "Set ${key} = ${val}"
      ;;
    get)
      if [[ -z "$key" ]]; then
        ap_err "Usage: ap config get <key>"
        return 1
      fi
      if [[ "$key" == "api" || "$key" == "ASTROPHAGE_API" ]]; then
        key="ASTROPHAGE_API"
      fi
      if [[ -f "$global_config" ]]; then
        grep "^export ${key}=" "$global_config" | cut -d= -f2- | tr -d '"'
      else
        echo "Not set."
      fi
      ;;
    list|ls)
      if [[ -f "$global_config" ]]; then
        cat "$global_config"
      else
        ap_info "No global config set."
      fi
      ;;
    *)
      ap_err "Unknown config action: $action"
      ;;
  esac
}
