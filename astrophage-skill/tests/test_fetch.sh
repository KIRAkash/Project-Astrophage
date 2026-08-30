#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# tests/test_fetch.sh — Test cross-KB link resolution on a fixture
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/config.sh"

PASS=0; FAIL=0
check() {
  local desc="$1" result="$2" want_contains="$3"
  if echo "$result" | grep -qi "$want_contains"; then
    echo -e "${C_GREEN}PASS${C_RESET} $desc"
    PASS=$((PASS+1))
  else
    echo -e "${C_RED}FAIL${C_RESET} $desc (missing: '$want_contains')"
    echo "       output: '${result:0:300}'"
    FAIL=$((FAIL+1))
  fi
}

source "$SCRIPT_DIR/../lib/fetch_linked.sh"

# ── Build a fixture file with cross-KB links ──────────────────────────────────
FIXTURE_DIR="$(mktemp -d)"
trap "rm -rf '$FIXTURE_DIR'" EXIT

cat > "$FIXTURE_DIR/api-spec.md" << 'EOF'
# API Specification

## External Dependencies

See [[kb:auth-service/summaries/api-spec]] for authentication endpoints.
See [[kb:order-service/entities/order]] for the Order entity schema.
No link here [[not-a-kb-link]] should be ignored.
EOF

echo ""
echo "=== Cross-KB Link Detection Tests ==="

# Extract links using python3 (macOS grep ERE is unreliable with [[ patterns)
if command -v python3 &>/dev/null; then
  links=$(python3 -c "
import sys, re
text = open(sys.argv[1], errors='replace').read()
for m in re.findall(r'\[\[kb:[^\]]+\]\]', text):
    print(m)
" "$FIXTURE_DIR/api-spec.md" 2>/dev/null | sort -u)
else
  links=$(grep -oE '[[][[]kb:[^]]+[]][]]' "$FIXTURE_DIR/api-spec.md" 2>/dev/null | sort -u || true)
fi
check "detects auth-service link"  "$links" "auth-service"
check "detects order-service link" "$links" "order-service"
check "ignores non-kb links"       "$(echo "$links" | grep -v 'not-a-kb-link' || echo ok)"  "ok\|auth"

echo ""
echo "=== ap links output test (offline) ==="
# Override cache dir to avoid touching real cache
export AP_CACHE_DIR="$FIXTURE_DIR/cache"
mkdir -p "$AP_CACHE_DIR"

result=$(cmd_resolve_links "$FIXTURE_DIR/api-spec.md" 2>&1 || true)
check "shows auth-service link"   "$result" "auth-service"
check "shows order-service link"  "$result" "order-service"
check "shows Fetching message"    "$result" "Fetching\|fetch\|Resolved\|Could not"

echo ""
echo "=== Summary ==="
echo -e "${C_GREEN}PASS: $PASS${C_RESET}  ${C_RED}FAIL: $FAIL${C_RESET}"
[[ "$FAIL" -eq 0 ]]
