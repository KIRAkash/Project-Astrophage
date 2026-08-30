#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# uninstall.sh — Remove the Astrophage Skill CLI
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BOLD='\033[1m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}✓${RESET} $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }

echo ""
echo -e "${BOLD}🌌 Astrophage Skill Uninstaller${RESET}"
echo ""

# Remove symlinks
for target in "/usr/local/bin/ap" "$HOME/.local/bin/ap"; do
  if [[ -L "$target" ]]; then
    rm -f "$target" && ok "Removed: $target"
  fi
done

# Remove install dir
INSTALL_DIR="$HOME/.astrophage-skill"
if [[ -d "$INSTALL_DIR" ]]; then
  rm -rf "$INSTALL_DIR" && ok "Removed: $INSTALL_DIR"
fi

# Optionally keep cached KBs (they are separate from the tool)
echo ""
warn "Cached KBs in ~/.astrophage/ were NOT removed (they are just git repos)."
echo "  To remove them: rm -rf ~/.astrophage"
echo ""
ok "Astrophage Skill uninstalled."
echo ""
