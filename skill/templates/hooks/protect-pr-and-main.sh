#!/usr/bin/env bash
# protect-pr-and-main.sh
#
# Hook: PreToolUse on Bash
# Purpose: enforce the PR-first workflow described in CLAUDE.md:
#   - Never call `gh pr create` directly. Use the `/create-pr` skill which
#     pre-flights the branch, builds the body from the template, and sets
#     CREWKIT_PR_VIA_SKILL=1 around the gh invocation.
#   - Never push directly to `{{default_branch}}`. Changes reach the default
#     branch only via merged PR.
#
# NOTE: {{default_branch}} is replaced by crewkit setup (Phase 1) with the
# actual default branch name detected from the repository (e.g. main, master).
#
# stdin: hook event JSON; tool_input.command holds the bash command.
# exit codes:
#   0  = allow
#   2  = block (stderr fed back to model)
#
# Bypass via env var (NOT for normal use; meant for explicit user override):
#   CREWKIT_BYPASS_PR_GUARD=1   → allow `gh pr create`
#   CREWKIT_BYPASS_MAIN_GUARD=1 → allow `git push ... {{default_branch}}`
#
# This hook is intentionally permissive on read-only commands and
# multi-line scripts that do not match the unsafe patterns.

set -euo pipefail

# Hook payload arrives on stdin
PAYLOAD="$(cat)"

# Extract the command field; fall back to empty if jq missing or missing field
if command -v jq >/dev/null 2>&1; then
  CMD="$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"
else
  # crude fallback: grep the JSON
  CMD="$(printf '%s' "$PAYLOAD" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p' | head -1 || true)"
fi

# Empty command → nothing to inspect, allow
[ -z "$CMD" ] && exit 0

# ---------- Guard 1: gh pr create ----------
# Allow only when invoked via the `/create-pr` skill, which sets
# CREWKIT_PR_VIA_SKILL=1 around its gh invocation. Direct attempts (typed
# manually or by an agent that bypassed the skill) will not have that env
# var and will be blocked.
#
# Match only when `gh pr create` is at the start of a command segment:
#   - start of line (with optional leading whitespace)
#   - or immediately after a command separator: && || ; | & (
# Avoids false positives when the literal string appears inside a
# commit message heredoc, log line, or echo argument.
if printf '%s' "$CMD" | grep -Eq '(^|&&|\|\||;|\||&|\()[[:space:]]*gh[[:space:]]+pr[[:space:]]+create([[:space:]]|$)'; then
  if [ "${CREWKIT_BYPASS_PR_GUARD:-}" = "1" ] || [ "${CREWKIT_PR_VIA_SKILL:-}" = "1" ]; then
    exit 0
  fi
  cat >&2 <<'EOF'
[protect-pr-and-main] BLOCKED: direct `gh pr create` is not allowed.
Use the `/create-pr` skill — it pre-flights the branch, fills the project PR
template (`.github/pull_request_template.md`), and sets CREWKIT_PR_VIA_SKILL=1
so this hook lets the call through.
Override (NOT recommended): set CREWKIT_BYPASS_PR_GUARD=1 explicitly.
EOF
  exit 2
fi

# ---------- Guard 2: git push to {{default_branch}} ----------
# Pattern catches:
#   git push origin {{default_branch}}
#   git push origin HEAD:{{default_branch}}
#   git push origin HEAD:refs/heads/{{default_branch}}
#   git push --force ... {{default_branch}}
#   git push -f ... {{default_branch}}
# Excludes: pushes to feature/* or fix/* (default workflow).
if printf '%s' "$CMD" | grep -Eq '(^|&&|\|\||;|\||&|\()[[:space:]]*git[[:space:]]+push[[:space:]].*[[:space:]](origin[[:space:]]+|HEAD:|HEAD[[:space:]]+to[[:space:]]+|:?refs/heads/)?{{default_branch}}([[:space:]]|$|:)'; then
  if [ "${CREWKIT_BYPASS_MAIN_GUARD:-}" = "1" ]; then
    exit 0
  fi
  cat >&2 <<'EOF'
[protect-pr-and-main] BLOCKED: direct push to `{{default_branch}}` is not allowed.
Push to `feat/<slug>` and let the `/create-pr` skill open the PR.
Merges to the default branch happen via the hosting platform UI after CI passes.
Reason: CLAUDE.md §PR-first — direct push to the default branch is forbidden.
Override (NOT recommended): set CREWKIT_BYPASS_MAIN_GUARD=1 explicitly.
EOF
  exit 2
fi

# ---------- Guard 3: git push --force to {{default_branch}} ----------
# Force-push to the default branch is hard-banned even with the bypass on Guard 2.
if printf '%s' "$CMD" | grep -Eq '(^|&&|\|\||;|\||&|\()[[:space:]]*git[[:space:]]+push[[:space:]].*(--force|--force-with-lease|-f)[[:space:]].*[[:space:]]{{default_branch}}([[:space:]]|$)'; then
  cat >&2 <<'EOF'
[protect-pr-and-main] HARD BLOCK: force-push to `{{default_branch}}` is forbidden.
No bypass. Reason: irrecoverable history loss risk.
EOF
  exit 2
fi

# Allow everything else
exit 0
