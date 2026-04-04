#!/bin/bash
# reado-station skills installer
# Auto-detects installed AI coding tools and installs skills to all of them.
#
# Usage:
#   bash skills/install.sh            # auto-detect + install globally
#   bash skills/install.sh --project  # also install project-level rules

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTALLED=0

green()  { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
dim()    { printf "\033[2m%s\033[0m\n" "$1"; }

echo ""
echo "reado-station skills installer"
echo "=============================="
echo ""

# ─── Helper: merge skill markdown into one file ───
# Strips YAML frontmatter, concatenates with headers
merge_skills() {
  local out="$1"
  cat > "$out" <<'HEADER'
# reado-station — Agent 运营指南

> 自动生成，勿手动编辑。源文件在 reado-station/skills/ 目录。
> 入职指南: https://raw.githubusercontent.com/dolphin-molt/reado-station/main/ONBOARD.md

HEADER
  for skill_dir in "$SCRIPT_DIR"/*/; do
    [ -f "$skill_dir/SKILL.md" ] || continue
    echo "" >> "$out"
    # Strip YAML frontmatter (lines between first --- and second ---)
    awk 'BEGIN{f=0} /^---$/{f++; next} f>=2||f==0{print}' "$skill_dir/SKILL.md" >> "$out"
    echo "" >> "$out"
    # Append reference files if any
    if [ -d "$skill_dir/reference" ]; then
      for ref in "$skill_dir"/reference/*.md; do
        [ -f "$ref" ] || continue
        echo "" >> "$out"
        cat "$ref" >> "$out"
        echo "" >> "$out"
      done
    fi
  done
}

# ═══════════════════════════════════════════════
# 1. Claude Code  (~/.claude/skills/*/SKILL.md)
# ═══════════════════════════════════════════════
if command -v claude &>/dev/null || [ -d "$HOME/.claude" ]; then
  TARGET="$HOME/.claude/skills"
  mkdir -p "$TARGET"
  for skill_dir in "$SCRIPT_DIR"/*/; do
    name="$(basename "$skill_dir")"
    [ -f "$skill_dir/SKILL.md" ] || continue
    rm -rf "$TARGET/$name"
    cp -r "$skill_dir" "$TARGET/$name"
  done
  green "  ✓ Claude Code  → ~/.claude/skills/"
  INSTALLED=$((INSTALLED + 1))
fi

# ═══════════════════════════════════════════════
# 2. Codex CLI  (~/.codex/AGENTS.md)
# ═══════════════════════════════════════════════
if command -v codex &>/dev/null || [ -d "$HOME/.codex" ]; then
  mkdir -p "$HOME/.codex"
  merge_skills "$HOME/.codex/reado-station-rules.md"
  # Codex reads AGENTS.md; we write a separate file and instruct to include it
  if [ ! -f "$HOME/.codex/AGENTS.md" ]; then
    echo "Read and follow the instructions in ~/.codex/reado-station-rules.md" > "$HOME/.codex/AGENTS.md"
  elif ! grep -q "reado-station-rules.md" "$HOME/.codex/AGENTS.md" 2>/dev/null; then
    echo "" >> "$HOME/.codex/AGENTS.md"
    echo "Read and follow the instructions in ~/.codex/reado-station-rules.md" >> "$HOME/.codex/AGENTS.md"
  fi
  green "  ✓ Codex CLI    → ~/.codex/reado-station-rules.md"
  INSTALLED=$((INSTALLED + 1))
fi

# ═══════════════════════════════════════════════
# 3. Windsurf  (~/.codeium/windsurf/memories/)
# ═══════════════════════════════════════════════
if command -v windsurf &>/dev/null || [ -d "$HOME/.codeium/windsurf" ]; then
  WINDSURF_DIR="$HOME/.codeium/windsurf/memories"
  mkdir -p "$WINDSURF_DIR"
  merge_skills "$WINDSURF_DIR/reado-station-rules.md"
  green "  ✓ Windsurf     → ~/.codeium/windsurf/memories/reado-station-rules.md"
  INSTALLED=$((INSTALLED + 1))
fi

# ═══════════════════════════════════════════════
# 4. Aider  (~/.aider.conf.yml → read: file)
# ═══════════════════════════════════════════════
if command -v aider &>/dev/null; then
  AIDER_SKILLS="$HOME/.aider/reado-station-rules.md"
  mkdir -p "$HOME/.aider"
  merge_skills "$AIDER_SKILLS"
  # Add to aider config if not already there
  AIDER_CONF="$HOME/.aider.conf.yml"
  if [ -f "$AIDER_CONF" ] && grep -q "reado-station-rules.md" "$AIDER_CONF" 2>/dev/null; then
    : # already configured
  else
    echo "" >> "$AIDER_CONF"
    echo "# reado-station skills (auto-added by install.sh)" >> "$AIDER_CONF"
    echo "read: $AIDER_SKILLS" >> "$AIDER_CONF"
  fi
  green "  ✓ Aider        → ~/.aider/reado-station-rules.md"
  INSTALLED=$((INSTALLED + 1))
fi

# ═══════════════════════════════════════════════
# 5. Project-level installs (--project flag)
# ═══════════════════════════════════════════════
if [ "$1" = "--project" ]; then
  echo ""
  echo "Installing project-level rules..."

  # Cursor (.cursor/rules/)
  CURSOR_DIR="$PROJECT_DIR/.cursor/rules"
  mkdir -p "$CURSOR_DIR"
  merge_skills "$CURSOR_DIR/reado-station.md"
  green "  ✓ Cursor       → .cursor/rules/reado-station.md"

  # Cline (.clinerules/)
  CLINE_DIR="$PROJECT_DIR/.clinerules"
  mkdir -p "$CLINE_DIR"
  merge_skills "$CLINE_DIR/reado-station.md"
  green "  ✓ Cline        → .clinerules/reado-station.md"

  # Copilot (.github/copilot-instructions.md)
  mkdir -p "$PROJECT_DIR/.github"
  merge_skills "$PROJECT_DIR/.github/copilot-instructions.md"
  green "  ✓ Copilot      → .github/copilot-instructions.md"

  # Windsurf project (.windsurf/rules/)
  WINDSURF_PROJ="$PROJECT_DIR/.windsurf/rules"
  mkdir -p "$WINDSURF_PROJ"
  merge_skills "$WINDSURF_PROJ/reado-station.md"
  green "  ✓ Windsurf     → .windsurf/rules/reado-station.md"

  # Codex project (AGENTS.md)
  merge_skills "$PROJECT_DIR/AGENTS.md"
  green "  ✓ Codex        → AGENTS.md"
fi

# ═══════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════
echo ""
if [ "$INSTALLED" -eq 0 ] && [ "$1" != "--project" ]; then
  yellow "  No AI coding tools detected globally."
  yellow "  Supported: Claude Code, Codex CLI, Windsurf, Aider"
  echo ""
  dim "  Use --project to install project-level rules for Cursor/Cline/Copilot."
else
  green "Done. $INSTALLED tool(s) configured."
  echo ""
  dim "  Skills will be auto-loaded in new sessions."
  dim "  Source: https://github.com/dolphin-molt/reado-station/tree/main/skills"
  [ "$1" != "--project" ] && dim "  Tip: run with --project to also install Cursor/Cline/Copilot project rules."
fi
echo ""
