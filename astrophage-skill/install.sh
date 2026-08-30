#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# install.sh — Astrophage Skill Installer
#
# One-liner install:
#   curl -fsSL https://raw.githubusercontent.com/your-org/Project-Astrophage/main/astrophage-skill/install.sh | bash
#
# Or locally:
#   bash install.sh
#
# What this does:
#   1. Clones (or updates) this skill repo into ~/.astrophage-skill/
#   2. Makes bin/ap executable
#   3. Symlinks ap → /usr/local/bin/ap (or ~/.local/bin/ap if no sudo)
#   4. Adds PATH update to shell rc file
#   5. Runs `ap discover` silently to bootstrap the current repo's KB
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SKILL_REPO="https://github.com/KIRAkash/Project-Astrophage.git"
SKILL_SUBDIR="astrophage-skill"
INSTALL_DIR="$HOME/.astrophage-skill"
BIN_TARGET="$INSTALL_DIR/bin/ap"

# Colors (POSIX-safe)
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'; DIM='\033[2m'
info()  { echo -e "${CYAN}[ap-install]${RESET} $*"; }
ok()    { echo -e "${GREEN}✓${RESET} $*"; }
warn()  { echo -e "${YELLOW}⚠${RESET}  $*"; }
err()   { echo -e "${RED}✗${RESET}  $*" >&2; }
bold()  { echo -e "${BOLD}$*${RESET}"; }

# ── Detect OS ─────────────────────────────────────────────────────────────────
OS="$(uname -s 2>/dev/null || echo unknown)"
ARCH="$(uname -m 2>/dev/null || echo unknown)"

# ── Detect shell rc file ─────────────────────────────────────────────────────
detect_shell_rc() {
  local shell_name
  shell_name="$(basename "${SHELL:-/bin/bash}" 2>/dev/null || echo bash)"
  case "$shell_name" in
    zsh)   echo "$HOME/.zshrc" ;;
    fish)  echo "$HOME/.config/fish/config.fish" ;;
    *)     echo "$HOME/.bashrc" ;;
  esac
}

# ── Check for git ─────────────────────────────────────────────────────────────
if ! command -v git &>/dev/null; then
  err "git is required but not installed."
  echo ""
  echo "Install git:"
  echo "  macOS:  xcode-select --install"
  echo "  Linux:  sudo apt install git  (or your distro's equivalent)"
  exit 1
fi

echo ""
bold "🌌 Astrophage Skill Installer"
echo -e "${DIM}Platform: ${OS} / ${ARCH}${RESET}"
echo ""

# ── Step 1: Clone or update the skill repo ────────────────────────────────────
if [[ -d "$INSTALL_DIR/.git" ]]; then
  info "Updating existing installation at $INSTALL_DIR..."
  git -C "$INSTALL_DIR" pull --ff-only --quiet 2>/dev/null \
    || warn "Could not pull updates — continuing with existing version."
else
  info "Cloning Astrophage Skill into $INSTALL_DIR..."

  # If we're running from inside the repo (local install), just copy
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
  if [[ -d "$SCRIPT_DIR/bin" && -d "$SCRIPT_DIR/lib" ]]; then
    info "Detected local install — copying from: $SCRIPT_DIR"
    cp -r "$SCRIPT_DIR" "$INSTALL_DIR" 2>/dev/null || {
      mkdir -p "$INSTALL_DIR"
      cp -r "$SCRIPT_DIR/." "$INSTALL_DIR/"
    }
  else
    # Remote install — sparse-clone just the astrophage-skill/ subdirectory
    TMP_DIR="$(mktemp -d)"
    trap "rm -rf '$TMP_DIR'" EXIT
    git clone --depth=1 --filter=blob:none --sparse --quiet "$SKILL_REPO" "$TMP_DIR" 2>/dev/null \
      || git clone --depth=1 --quiet "$SKILL_REPO" "$TMP_DIR" 2>/dev/null
    git -C "$TMP_DIR" sparse-checkout set "$SKILL_SUBDIR" 2>/dev/null || true
    mkdir -p "$INSTALL_DIR"
    cp -r "$TMP_DIR/$SKILL_SUBDIR/." "$INSTALL_DIR/"
  fi
fi

ok "Skill installed at: $INSTALL_DIR"

# ── Step 2: Make `ap` executable ──────────────────────────────────────────────
chmod +x "$BIN_TARGET"

# ── Step 3: Symlink `ap` into PATH ────────────────────────────────────────────
LINKED=false
LINK_PATH=""

# Try /usr/local/bin first (preferred, may need sudo on Linux)
if [[ -w "/usr/local/bin" ]]; then
  ln -sf "$BIN_TARGET" "/usr/local/bin/ap" 2>/dev/null && {
    LINKED=true
    LINK_PATH="/usr/local/bin/ap"
  }
fi

# Try ~/.local/bin (no sudo needed)
if [[ "$LINKED" == "false" ]]; then
  mkdir -p "$HOME/.local/bin"
  ln -sf "$BIN_TARGET" "$HOME/.local/bin/ap" 2>/dev/null && {
    LINKED=true
    LINK_PATH="$HOME/.local/bin/ap"
  }
fi

if [[ "$LINKED" == "false" ]]; then
  warn "Could not symlink ap automatically."
  warn "Add this to your PATH manually:"
  echo "  export PATH=\"$INSTALL_DIR/bin:\$PATH\""
else
  ok "Linked: $LINK_PATH → $BIN_TARGET"
fi

# ── Step 4: Ensure PATH contains the link dir ─────────────────────────────────
LINK_DIR="$(dirname "${LINK_PATH:-$INSTALL_DIR/bin}")"
RC_FILE="$(detect_shell_rc)"
PATH_LINE="export PATH=\"${LINK_DIR}:\$PATH\""

# Check if it's already in PATH
if ! echo "$PATH" | grep -q "$LINK_DIR"; then
  # Add to shell rc
  if [[ ! -f "$RC_FILE" ]] || ! grep -q "$LINK_DIR" "$RC_FILE" 2>/dev/null; then
    echo "" >> "$RC_FILE"
    echo "# Astrophage Skill CLI (ap)" >> "$RC_FILE"
    echo "$PATH_LINE" >> "$RC_FILE"
    ok "Added to $RC_FILE: $PATH_LINE"
  fi
  # Export for current session
  export PATH="${LINK_DIR}:${PATH}"
fi

# ── Step 5: Bootstrap qmd (optional, best search quality) ────────────────────
echo ""
info "Checking for qmd (best-quality search engine)..."
if command -v qmd &>/dev/null; then
  ok "qmd is already installed."
elif command -v npm &>/dev/null; then
  info "Installing qmd via npm..."
  npm install -g @tobilu/qmd --silent 2>/dev/null \
    && ok "qmd installed." \
    || warn "Could not install qmd — ap will use ripgrep/grep as fallback."
elif command -v bun &>/dev/null; then
  info "Installing qmd via bun..."
  bun install -g @tobilu/qmd 2>/dev/null \
    && ok "qmd installed." \
    || warn "Could not install qmd — ap will use ripgrep/grep as fallback."
else
  warn "Neither npm nor bun found — skipping qmd install."
  info "ap will fall back to ripgrep/grep for search (still works great)."
fi

# ── Step 6: Auto-discover KB for current repo (silent) ────────────────────────
echo ""
info "Running initial KB discovery..."
"$BIN_TARGET" discover 2>/dev/null \
  && ok "KB discovery complete." \
  || info "No KB found for current repo — run 'ap discover' from a repo with a KB, or 'ap list' to browse all KBs."

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
bold "🚀 Astrophage Skill is ready!"
echo ""
echo -e "  ${CYAN}ap discover${RESET}          — auto-detect KB for any git repo"
echo -e "  ${CYAN}ap search <query>${RESET}    — search your KB"
echo -e "  ${CYAN}ap list${RESET}              — browse all Astrophage KBs"
echo -e "  ${CYAN}ap help${RESET}              — full command reference"
echo ""
echo -e "${DIM}Reload your shell or run: source ${RC_FILE}${RESET}"
echo ""
