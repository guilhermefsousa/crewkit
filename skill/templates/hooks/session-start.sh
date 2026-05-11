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
  sed -n '/^## Now$/,/^##/{/^## [^N]/d;p}' .claude/napkin.md 2>/dev/null | head -5
  sed -n '/^## Blockers/,/^##/{/^## [^B]/d;p}' .claude/napkin.md 2>/dev/null | head -5
fi

# {{domain_detection}}
# Detect active domains from git status and hint which lessons-*.md to load.
# This block is filled by crewkit setup based on detected stacks/modules.
# Crewkit Phase 7 Step 6 replaces this placeholder with stack-detected hints.
# Each detected module from Phase 3 produces a grep pattern matching its source
# paths; a match prints a "Load: lessons-<domain>.md" hint for the AI to act on.
#
# Example pattern (will be replaced for your project):
#   MODIFIED=$(git status --porcelain 2>/dev/null | awk '{print $NF}')
#   if echo "$MODIFIED" | grep -qE '^src/Module-X/'; then
#     echo "Load: lessons-module-x.md from .ai/memory/"
#   fi

echo ""
echo "=== End Session Context ==="
