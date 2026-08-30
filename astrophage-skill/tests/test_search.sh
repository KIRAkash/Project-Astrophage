#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# tests/test_search.sh — Test markdown search on a fixture KB
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
    echo "       output: '${result:0:200}'"
    FAIL=$((FAIL+1))
  fi
}

# ── Build a fixture KB directory ──────────────────────────────────────────────
FIXTURE_DIR="$(mktemp -d)"
trap "rm -rf '$FIXTURE_DIR'" EXIT

mkdir -p "$FIXTURE_DIR/summaries" "$FIXTURE_DIR/entities" "$FIXTURE_DIR/decisions"

cat > "$FIXTURE_DIR/index.md" << 'EOF'
# My App — Architecture Overview

This is the main app. It uses JWT authentication and PostgreSQL.

## Services
- [[summaries/api-spec]] — REST API
- [[entities/user]] — User model
EOF

cat > "$FIXTURE_DIR/summaries/api-spec.md" << 'EOF'
# API Specification

## Authentication
All endpoints require Bearer JWT tokens in the Authorization header.
POST /api/auth/login — issue a token
POST /api/auth/refresh — refresh token

## Endpoints
GET  /api/users     — list users
POST /api/users     — create user
GET  /api/health    — health check
EOF

cat > "$FIXTURE_DIR/entities/user.md" << 'EOF'
# User Entity

## Schema
- id: UUID (primary key)
- email: string (unique)
- created_at: timestamp
- role: enum (admin, member, viewer)

## Relationships
Users belong to Organizations via the memberships table.
EOF

cat > "$FIXTURE_DIR/decisions/adr-001.md" << 'EOF'
# ADR-001: Database Technology Selection

## Status
Accepted

## Decision
We chose PostgreSQL over MySQL for its JSON support, LISTEN/NOTIFY, and ecosystem.
EOF

# ── Run search tests using the Python scorer ──────────────────────────────────
# Override KB resolution BEFORE sourcing search.sh
export AP_KB_DIR="$FIXTURE_DIR"

source "$SCRIPT_DIR/../lib/search.sh"

echo ""
echo "=== Search Tests (fixture KB) ==="

result1=$(AP_SEARCH_TOOL=grep cmd_search "authentication" 2>/dev/null || true)
check "grep: auth keyword"      "$result1" "api-spec"
check "grep: shows JWT"         "$result1" "jwt"

result2=$(AP_SEARCH_TOOL=grep cmd_search "user entity schema" 2>/dev/null || true)
check "grep: entity keyword"    "$result2" "user"

result3=$(AP_SEARCH_TOOL=grep cmd_search "database postgres" 2>/dev/null || true)
check "grep: decision found"    "$result3" "adr-001\|postgres\|database"

echo ""
echo "=== Python Scorer Direct Test ==="
if command -v python3 &>/dev/null; then
  scored=$(score_and_format "$FIXTURE_DIR" "authentication jwt" "" 2>/dev/null || true)
  check "scorer: returns results"  "$scored" "api-spec\|auth"
  check "scorer: has header"       "$scored" "Astrophage KB"
  echo -e "${C_GREEN}PASS${C_RESET} python3 available"
  PASS=$((PASS+1))
else
  echo -e "${C_YELLOW}SKIP${C_RESET} python3 not available — scorer test skipped"
fi

echo ""
echo "=== Summary ==="
echo -e "${C_GREEN}PASS: $PASS${C_RESET}  ${C_RED}FAIL: $FAIL${C_RESET}"
[[ "$FAIL" -eq 0 ]]
