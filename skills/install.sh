#!/bin/bash
# reado-station skills installer
# Usage: bash skills/install.sh
#
# Installs reado-collect and reado-station-ops skills to ~/.claude/skills/

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$HOME/.claude/skills"

mkdir -p "$TARGET_DIR"

echo "Installing reado skills to $TARGET_DIR ..."

# reado-collect
rm -rf "$TARGET_DIR/reado-collect"
cp -r "$SCRIPT_DIR/reado-collect" "$TARGET_DIR/reado-collect"
echo "  ✓ reado-collect"

# reado-station-ops
rm -rf "$TARGET_DIR/reado-station-ops"
cp -r "$SCRIPT_DIR/reado-station-ops" "$TARGET_DIR/reado-station-ops"
echo "  ✓ reado-station-ops"

echo ""
echo "Done. Skills installed:"
echo "  ~/.claude/skills/reado-collect/"
echo "  ~/.claude/skills/reado-station-ops/"
echo ""
echo "Claude Code will auto-discover these skills in new sessions."
