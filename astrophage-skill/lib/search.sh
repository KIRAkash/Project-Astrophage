#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# search.sh — Search the local Astrophage KB using the best available tool
#
# Tool preference order:
#   1. qmd  — BM25 + vector + reranking (best quality, requires Node/Bun)
#   2. rg   — ripgrep (fast, structured output)
#   3. grep — POSIX fallback (always available)
#
# Output is always capped at AP_MAX_TOTAL_OUTPUT chars for agent context budget.
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"
source "$SCRIPT_DIR/discover.sh"

# ── Resolve KB directory ──────────────────────────────────────────────────────
resolve_kb_dir() {
  # 1. Check if a specific KB path is forced (env var override — used in tests)
  if [[ -n "${AP_KB_DIR:-}" && -d "$AP_KB_DIR" ]]; then
    echo "$AP_KB_DIR"
    return 0
  fi

  # 2. Try discover for current repo
  local discovered
  discovered=$(cmd_discover 2>/dev/null) || true
  if [[ -n "$discovered" && -d "$discovered" ]]; then
    echo "$discovered"
    return 0
  fi

  # 3. Check if there's only one KB in cache — use it
  local count=0 first_dir=""
  while IFS= read -r d; do
    count=$((count+1)); first_dir="$d"
  done < <(find "$AP_CACHE_DIR" -maxdepth 1 -mindepth 1 -type d -name "openkb-*" 2>/dev/null)

  if [[ "$count" -eq 1 ]]; then
    echo "$first_dir"
    return 0
  elif [[ "$count" -gt 1 ]]; then
    ap_warn "Multiple KBs in cache. Run ${C_CYAN}ap discover${C_RESET} from a repo, or set AP_KB_DIR."
    return 1
  fi

  ap_err "No KB found. Run ${C_CYAN}ap discover${C_RESET} first."
  return 1
}

# ── Detect best search tool ───────────────────────────────────────────────────
detect_search_tool() {
  if [[ "$AP_SEARCH_TOOL" != "auto" ]]; then
    echo "$AP_SEARCH_TOOL"
    return
  fi
  if ap_has qmd; then
    echo "qmd"
  elif ap_has rg; then
    echo "rg"
  else
    echo "grep"
  fi
}

# ── qmd search ────────────────────────────────────────────────────────────────
search_with_qmd() {
  local kb_dir="$1" query="$2"
  local collection_name
  collection_name="ap-$(basename "$kb_dir")"

  # Ensure collection is registered (idempotent — qmd ignores duplicates)
  qmd collection add "$kb_dir" --name "$collection_name" --mask '**/*.md' 2>/dev/null || true

  # BM25 keyword search (fast, no embedding required)
  # --json gives structured output; -n limits results; --full shows full section
  local results
  results=$(qmd search "$query" -c "$collection_name" --json -n "$AP_MAX_SEARCH_RESULTS" 2>/dev/null) || {
    # Fallback to grep if qmd fails (e.g. collection not indexed yet)
    ap_log "qmd search failed — falling back to ripgrep/grep."
    search_with_rg "$kb_dir" "$query"
    return
  }

  # Format output for agent consumption
  if ap_has python3; then
    echo "$results" | python3 -c "
import sys, json

data = json.load(sys.stdin)
total_chars = 0
max_total = ${AP_MAX_TOTAL_OUTPUT}
max_per = ${AP_MAX_CHARS_PER_RESULT}

print(f'## Astrophage KB Search Results')
print(f'Query: \"{sys.argv[1] if len(sys.argv)>1 else \"\"}\"\n')

for i, hit in enumerate(data[:${AP_MAX_SEARCH_RESULTS}], 1):
    file_path = hit.get('file', '')
    score = hit.get('score', 0)
    excerpt = (hit.get('content') or hit.get('text') or '')[:max_per]
    excerpt = excerpt.replace('\n', ' ').strip()

    line = f'### [{i}] {file_path}  (score: {score:.2f})\n{excerpt}\n'

    if total_chars + len(line) > max_total:
        print(f'_(output truncated at {max_total} chars for context budget)_')
        break
    print(line)
    total_chars += len(line)
" "$query" 2>/dev/null
  elif ap_has jq; then
    echo "## Astrophage KB Search Results"
    echo "Query: \"$query\""
    echo ""
    echo "$results" | jq -r '.[:8][] | "### \(.file)\n\(.content // .text // "" | .[0:300])\n"' 2>/dev/null
  else
    echo "$results"
  fi
}

# ── ripgrep search ────────────────────────────────────────────────────────────
search_with_rg() {
  local kb_dir="$1" query="$2"
  local rg_cmd="rg"
  ap_has rg || rg_cmd="grep -r"

  # Split query into keywords (simple word split)
  local keywords=($query)
  local primary="${keywords[0]}"
  local extra_flags=()
  if ap_has rg; then
    extra_flags=(--type md -i -C 3 --heading --max-count 3)
  fi

  local raw_results
  if ap_has rg; then
    raw_results=$(rg "${extra_flags[@]}" -e "$primary" "$kb_dir" 2>/dev/null | head -200) || raw_results=""
  else
    raw_results=$(grep -r -i --include="*.md" -l "$primary" "$kb_dir" 2>/dev/null | head -10) || raw_results=""
  fi

  if [[ -z "$raw_results" ]]; then
    ap_warn "No results found for: $query"
    return 0
  fi

  # Pass through the Python scorer for ranking
  if ap_has python3; then
    score_and_format "$kb_dir" "$query" "$raw_results"
  else
    echo "## Astrophage KB Search Results"
    echo "Query: \"$query\""
    echo ""
    echo "$raw_results" | head -100
  fi
}

# ── Python scorer: rank grep results by heading proximity + keyword density ───
score_and_format() {
  local kb_dir="$1" query="$2" raw="$3"
  python3 - "$kb_dir" "$query" <<'PYEOF'
import sys, os, re, math
from pathlib import Path
from collections import defaultdict

kb_dir = Path(sys.argv[1])
query = sys.argv[2].lower()
keywords = re.split(r'\s+', query.strip())

MAX_RESULTS = int(os.environ.get('AP_MAX_SEARCH_RESULTS', 8))
MAX_PER = int(os.environ.get('AP_MAX_CHARS_PER_RESULT', 300))
MAX_TOTAL = int(os.environ.get('AP_MAX_TOTAL_OUTPUT', 4000))

def score_section(heading: str, content: str, keywords: list) -> float:
    text = (heading + " " + content).lower()
    kw_hits = sum(text.count(kw) for kw in keywords)
    heading_bonus = sum(2.0 for kw in keywords if kw in heading.lower())
    length_penalty = max(math.log(max(len(content), 2)), 0.1)  # guard log(0) and log(1)=0
    return (kw_hits + heading_bonus) / length_penalty

def extract_sections(md_path: Path):
    """Split markdown into (heading, body) sections."""
    try:
        text = md_path.read_text(errors='replace')
    except Exception:
        return []
    sections = []
    current_h = "# (top)"
    current_body = []
    for line in text.splitlines():
        if re.match(r'^#{1,4} ', line):
            if current_body:
                sections.append((current_h, '\n'.join(current_body).strip()))
            current_h = line
            current_body = []
        else:
            current_body.append(line)
    if current_body:
        sections.append((current_h, '\n'.join(current_body).strip()))
    return sections

# Collect all .md files
md_files = list(kb_dir.rglob('*.md'))

candidates = []
for md_path in md_files:
    rel = md_path.relative_to(kb_dir)
    for heading, body in extract_sections(md_path):
        sc = score_section(heading, body, keywords)
        if sc > 0:
            excerpt = body[:MAX_PER].replace('\n', ' ').strip()
            candidates.append((sc, str(rel), heading, excerpt))

candidates.sort(key=lambda x: -x[0])

print("## Astrophage KB Search Results")
print(f"Query: \"{query}\"\n")

total = 0
for sc, fpath, heading, excerpt in candidates[:MAX_RESULTS]:
    block = f"### {fpath}\n**{heading}**\n{excerpt}\n"
    if total + len(block) > MAX_TOTAL:
        print(f"_(output capped at {MAX_TOTAL} chars)_")
        break
    print(block)
    total += len(block)

if not candidates:
    print(f"No results found for: {query}")
PYEOF
}

# ── Main search command ───────────────────────────────────────────────────────
cmd_search() {
  local query="$*"
  if [[ -z "$query" ]]; then
    ap_err "Usage: ap search <query>"
    return 1
  fi

  local kb_dir
  kb_dir=$(resolve_kb_dir) || return 1

  ap_log "Searching KB at: ${C_CYAN}${kb_dir}${C_RESET}"
  ap_log "Query: \"${query}\""
  echo ""

  local tool
  tool=$(detect_search_tool)
  ap_log "Search engine: ${tool}"
  echo ""

  case "$tool" in
    qmd)  search_with_qmd  "$kb_dir" "$query" ;;
    rg)   search_with_rg   "$kb_dir" "$query" ;;
    grep) search_with_rg   "$kb_dir" "$query" ;;  # search_with_rg handles grep fallback
    *)    search_with_rg   "$kb_dir" "$query" ;;
  esac
}
