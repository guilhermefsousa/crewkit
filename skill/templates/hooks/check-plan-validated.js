#!/usr/bin/env node
// .claude/hooks/check-plan-validated.js
//
// PreToolUse hook for the Task tool. Blocks invocation of the `coder`
// sub-agent when the prompt references a plan file in `.ai/plans/` whose
// `**Status:**` is not VALIDATED (or downstream).
//
// Trust basis: Stechly et al 2024 (arxiv.org/abs/2402.08115);
// Anthropic skill best-practices plan-validate-execute pattern.
// See .claude/skills/validate-plan/SKILL.md for the discipline this enforces.
//
// Behavior contract:
// - Fail OPEN on ANY internal error. Never break the agent.
// - Only intercepts Task with subagent_type=coder.
// - Allows ad-hoc coder invocations that don't reference a plan file.
// - Block reason includes the validated bypass mechanism.
// - Bypass: env CREWKIT_SKIP_PLAN_VALIDATION=1 (logged to stderr).

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PLAN_PATH_RE = /\.ai[/\\]plans[/\\][\w\-./\\]+\.md/;
const STATUS_RE = /^\*\*Status:\*\*\s+(\S+)/m;
const STATUSES_THAT_ALLOW = new Set(['VALIDATED', 'IN_PROGRESS', 'DONE']);

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    // Safety: if no stdin within 2s, resolve empty so we fail open.
    setTimeout(() => resolve(data), 2000).unref();
  });
}

function allow() {
  // Documented "do nothing" behavior: exit 0 with no output.
  process.exit(0);
}

function block(reason) {
  // Structured deny output per Anthropic hooks spec.
  const out = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

async function main() {
  if (process.env.CREWKIT_SKIP_PLAN_VALIDATION === '1') {
    process.stderr.write('[validate-plan-hook] CREWKIT_SKIP_PLAN_VALIDATION=1 — bypassing plan validation gate.\n');
    return allow();
  }

  let payload;
  try {
    const raw = await readStdin();
    if (!raw.trim()) return allow();
    payload = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`[validate-plan-hook] cannot parse hook input — failing open: ${e.message}\n`);
    return allow();
  }

  if (payload.tool_name !== 'Task') return allow();

  const ti = payload.tool_input || {};
  if (ti.subagent_type !== 'coder') return allow();

  const prompt = String(ti.prompt || '');
  const m = prompt.match(PLAN_PATH_RE);
  if (!m) return allow();

  const planRel = m[0].replace(/\\/g, '/');
  const cwd = payload.cwd || process.cwd();
  const planAbs = path.resolve(cwd, planRel);

  if (!fs.existsSync(planAbs)) return allow();

  let planText;
  try { planText = fs.readFileSync(planAbs, 'utf8'); }
  catch (_) { return allow(); }

  const sm = planText.match(STATUS_RE);
  if (!sm) return allow();

  const status = sm[1];
  if (STATUSES_THAT_ALLOW.has(status)) return allow();

  const reason = [
    `Plan ${planRel} has Status: ${status} (required: VALIDATED).`,
    '',
    `Required: run /validate-plan ${planRel} before invoking the coder.`,
    'The skill runs .claude/scripts/validate-plan.js, which deterministically checks',
    'each entry in the plan\'s `## Verifiable Claims` section (file existence, symbol',
    'at line, package installed, package version published, github issue state, line',
    'count in path). Status is auto-updated to VALIDATED on PASS.',
    '',
    'Why this gate exists: same-model self-critique on planning tasks causes',
    'performance collapse (Stechly et al 2024 — arxiv.org/abs/2402.08115). Plans',
    'with hallucinated factual claims have reached coder phase before. This hook',
    'is the deterministic gate.',
    '',
    'Emergency bypass: set environment variable CREWKIT_SKIP_PLAN_VALIDATION=1.',
    'The bypass is logged to stderr.',
  ].join('\n');

  return block(reason);
}

main().catch((e) => {
  process.stderr.write(`[validate-plan-hook] unexpected error — failing open: ${e.message}\n`);
  allow();
});
