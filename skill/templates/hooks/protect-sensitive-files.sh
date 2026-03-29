#!/bin/bash
# PreToolUse hook: blocks editing sensitive files (.env, credentials, secrets)
# Receives JSON via stdin — parses file_path without jq

INPUT=$(cat)
# POSIX-compatible extraction (works on macOS/Linux/WSL — no grep -P)
FILE_PATH=$(echo "$INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")

case "$BASENAME" in
  .env|.env.*|appsettings.*.json|credentials.*|secrets.*|.mcp.json)
    echo "BLOCKED: $BASENAME is a sensitive file. Move secrets to environment variables."
    exit 2
    ;;
  # Add project-specific patterns below (e.g., *.pem, *.key, service-account.json)
esac

exit 0
