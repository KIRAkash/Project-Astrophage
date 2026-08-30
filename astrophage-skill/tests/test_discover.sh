#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# tests/test_discover.sh — Test KB discovery and URL normalization
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/config.sh"
source "$SCRIPT_DIR/../lib/discover.sh"

PASS=0; FAIL=0
check() {
  local desc="$1" got="$2" want="$3"
  if [[ "$got" == "$want" ]]; then
    echo -e "${C_GREEN}PASS${C_RESET} $desc"
    PASS=$((PASS+1))
  else
    echo -e "${C_RED}FAIL${C_RESET} $desc"
    echo "       got:  '$got'"
    echo "       want: '$want'"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "=== URL Normalization Tests ==="
check "https with .git"  "$(normalize_url 'https://github.com/org/repo.git')"  "github.com/org/repo"
check "https no .git"    "$(normalize_url 'https://github.com/org/repo')"       "github.com/org/repo"
check "git@ SSH format"  "$(normalize_url 'git@github.com:org/repo.git')"       "github.com/org/repo"
check "trailing slash"   "$(normalize_url 'https://github.com/org/repo/')"      "github.com/org/repo"
check "uppercase"        "$(normalize_url 'https://GitHub.COM/Org/Repo.GIT')"   "github.com/org/repo"
check "http"             "$(normalize_url 'http://github.com/org/repo')"        "github.com/org/repo"

echo ""
echo "=== API Response Parsing Tests (mock) ==="

FOUND_RESPONSE='{"found":true,"kb_name":"openkb-my-app","kb_repo_url":"https://github.com/test-org/openkb-my-app","status":"published","org_name":"Test Org","linked_kbs":[]}'
NOT_FOUND_RESPONSE='{"found":false,"kb_name":null,"kb_repo_url":null,"status":null,"linked_kbs":[],"suggestions":[{"kb_name":"openkb-other","app_name":"Other App","kb_repo_url":"https://github.com/test-org/openkb-other","status":"published","org_name":"Test Org"}]}'

check "found=true"       "$(json_bool "$FOUND_RESPONSE" "found")"             "true"
check "kb_name parsed"   "$(json_get  "$FOUND_RESPONSE" "kb_name")"           "openkb-my-app"
check "kb_repo_url"      "$(json_get  "$FOUND_RESPONSE" "kb_repo_url")"       "https://github.com/test-org/openkb-my-app"
check "found=false"      "$(json_bool "$NOT_FOUND_RESPONSE" "found")"         "false"
check "suggestions len"  "$(json_array_len "$NOT_FOUND_RESPONSE" "suggestions")"  "1"

echo ""
echo "=== Summary ==="
echo -e "${C_GREEN}PASS: $PASS${C_RESET}  ${C_RED}FAIL: $FAIL${C_RESET}"
[[ "$FAIL" -eq 0 ]]
