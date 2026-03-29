#!/bin/bash
# PostCompact hook: re-injects critical rules after context compaction
# These are the rules that MUST survive compaction — non-negotiable guardrails

cat << 'RULES'
CRITICAL RULES (re-injected after context compaction):

{{hard_rules}}

Memory on demand: .ai/memory/ (architecture.md and conventions.md ALWAYS, rest by stack)
RULES
