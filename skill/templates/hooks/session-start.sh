#!/bin/bash
# SessionStart hook: injects context at the beginning of every conversation
# Gives the AI immediate awareness of recent work and project state

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || cd "{{project_dir}}"

echo "=== Session Context ==="
echo ""

# Current branch and status
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
DIRTY=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
echo "Branch: $BRANCH | Uncommitted changes: $DIRTY"
echo ""

# Recent commits (last 5)
echo "Recent commits:"
git log --oneline -5 2>/dev/null || echo "(no git history)"
echo ""

# Napkin (current priorities)
if [ -f ".claude/napkin.md" ]; then
  echo "Current priorities (napkin):"
  sed -n '/^## Now$/,/^##/{/^## [^N]/d;p}' .claude/napkin.md | head -5
  sed -n '/^## Blockers/,/^##/{/^## [^B]/d;p}' .claude/napkin.md | head -5
fi

echo ""
echo "=== End Session Context ==="
