#!/bin/bash
# Stop hook: prevents Claude from stopping if build is broken or tests fail
# Only runs checks if there are modified source files (avoids unnecessary work)

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || cd "{{project_dir}}"

# Check for modified source files (staged or unstaged)
{{build_gate}}

# ─── Lessons split alert ───

LESSONS_DIR=".ai/memory"

if [ -d "$LESSONS_DIR" ]; then
  for f in "$LESSONS_DIR"/lessons-*.md; do
    [ -f "$f" ] || continue
    LINES=$(wc -l < "$f" | tr -d '[:space:]')
    if [ "${LINES:-0}" -gt 200 ]; then
      BASENAME=$(basename "$f")
      echo "LESSONS SPLIT NEEDED: ${BASENAME} has ${LINES} lines (limit: 200). Consider splitting into sub-domains."
    fi
  done
fi

exit 0
