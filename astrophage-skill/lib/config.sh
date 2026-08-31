#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# config.sh — Central configuration for the Astrophage Skill CLI
# Source this file from all other lib scripts.
# ─────────────────────────────────────────────────────────────────────────────

# ── API endpoint ─────────────────────────────────────────────────────────────
# Override by setting ASTROPHAGE_API in your shell environment or .env file.
# Example: export ASTROPHAGE_API=https://api.astrophage.app
# Load global overrides first
if [[ -f "$HOME/.astrophage/.ap_global_config" ]]; then
  source "$HOME/.astrophage/.ap_global_config"
fi

ASTROPHAGE_API="${ASTROPHAGE_API:-http://localhost:8000}"

# ── Local KB cache directory ──────────────────────────────────────────────────
AP_CACHE_DIR="${AP_CACHE_DIR:-$HOME/.astrophage}"

# ── Config file (persists discovered KB per repo) ─────────────────────────────
AP_CONFIG_FILE="$AP_CACHE_DIR/.ap_config"

# ── Astrophage onboarding URL ─────────────────────────────────────────────────
AP_ONBOARD_URL="${AP_ONBOARD_URL:-https://astrophage.app/onboard}"

# ── Search tool preference (auto-detected at runtime) ─────────────────────────
# Options: qmd | rg | grep
# ap search will prefer qmd if installed, fall back to rg, then grep.
AP_SEARCH_TOOL="${AP_SEARCH_TOOL:-auto}"

# ── Output limits (aligned with Compact Architecture Digest spec: <4k chars) ──
AP_MAX_SEARCH_RESULTS=8
AP_MAX_CHARS_PER_RESULT=300
AP_MAX_TOTAL_OUTPUT=4000

# ── Colors ────────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then   # only colorize if stdout is a terminal
  C_RESET='\033[0m'
  C_BOLD='\033[1m'
  C_DIM='\033[2m'
  C_CYAN='\033[0;36m'
  C_GREEN='\033[0;32m'
  C_YELLOW='\033[0;33m'
  C_RED='\033[0;31m'
  C_BLUE='\033[0;34m'
  C_MAGENTA='\033[0;35m'
else
  C_RESET='' C_BOLD='' C_DIM='' C_CYAN='' C_GREEN='' C_YELLOW='' C_RED='' C_BLUE='' C_MAGENTA=''
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
ap_log()  { echo -e "${C_DIM}[ap]${C_RESET} $*" >&2; }
ap_ok()   { echo -e "${C_GREEN}✓${C_RESET} $*" >&2; }
ap_warn() { echo -e "${C_YELLOW}⚠${C_RESET}  $*" >&2; }
ap_err()  { echo -e "${C_RED}✗${C_RESET}  $*" >&2; }
ap_info() { echo -e "${C_CYAN}ℹ${C_RESET}  $*" >&2; }

# Ensure cache dir exists
mkdir -p "$AP_CACHE_DIR"

# ── Config read/write ─────────────────────────────────────────────────────────
# Stored as: <normalized_repo_url>=<local_kb_path>
ap_config_get() {
  local key="$1"
  if [[ -f "$AP_CONFIG_FILE" ]]; then
    grep "^${key}=" "$AP_CONFIG_FILE" 2>/dev/null | tail -1 | cut -d= -f2-
  fi
}

ap_config_set() {
  local key="$1" val="$2"
  touch "$AP_CONFIG_FILE"
  # Remove existing entry then append
  grep -v "^${key}=" "$AP_CONFIG_FILE" > "${AP_CONFIG_FILE}.tmp" 2>/dev/null && mv "${AP_CONFIG_FILE}.tmp" "$AP_CONFIG_FILE"
  echo "${key}=${val}" >> "$AP_CONFIG_FILE"
}

# ── Dependency check (non-fatal — we always have a fallback) ─────────────────
ap_has() { command -v "$1" &>/dev/null; }

# ── curl wrapper with timeout ─────────────────────────────────────────────────
ap_curl() {
  curl --silent --max-time 8 --fail "$@"
}
