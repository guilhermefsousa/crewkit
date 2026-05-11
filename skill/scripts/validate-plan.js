#!/usr/bin/env node
// .claude/scripts/validate-plan.js
//
// Validates a plan file's `## Verifiable Claims` section against current
// project state using deterministic checks (file/symbol/package/issue/count).
//
// Why deterministic, not LLM-based:
//   Stechly et al 2024 (arxiv.org/abs/2402.08115) — "significant performance
//   collapse with self-critique"; Anthropic skill best-practices documents
//   the plan-validate-execute pattern with script-based validation.
//
// Output:
//   stdout — JSON (always parseable)
//   stderr — short human summary
//   .ai/audits/<slug>-validation-<date>.md — structured audit (machine-first)
//
// Exit codes:
//   0 = all PASS, or plan has no claims section / empty section (informational)
//   1 = at least one FAIL
//   2 = at least one UNKNOWN and zero FAIL (tool unavailable, network, etc.)
//   3 = parse error / missing input

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const IS_WIN = process.platform === 'win32';

// ───────────────────────────────────────────────────────────────────────────
// Mini YAML-tuple parser. Subset only: list of flat objects with scalar values.
// Avoids runtime dep on js-yaml.
// ───────────────────────────────────────────────────────────────────────────
function parseYamlTuples(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const tuples = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.replace(/\s+$/, '');
    if (!line || /^\s*#/.test(line)) continue;

    const listMatch = line.match(/^-\s+(\w+):\s*(.*)$/);
    if (listMatch) {
      if (current) tuples.push(current);
      current = {};
      current[listMatch[1]] = parseScalar(listMatch[2]);
      continue;
    }

    const propMatch = line.match(/^\s+(\w+):\s*(.*)$/);
    if (propMatch) {
      if (!current) {
        throw new Error(`YAML parse error at line ${i + 1}: indented property without parent: ${raw}`);
      }
      current[propMatch[1]] = parseScalar(propMatch[2]);
      continue;
    }

    throw new Error(`YAML parse error at line ${i + 1}: unrecognized syntax: ${raw}`);
  }
  if (current) tuples.push(current);
  return tuples;
}

function parseScalar(s) {
  if (s === '' || s === '~' || s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return s;
}

// ───────────────────────────────────────────────────────────────────────────
// Plan extractor — pulls YAML inside ```yaml fence under `## Verifiable Claims`.
// ───────────────────────────────────────────────────────────────────────────
function extractClaimsBlock(planText) {
  const headingRe = /^##\s+Verifiable\s+Claims\s*$/m;
  const headingMatch = planText.match(headingRe);
  if (!headingMatch) return null;

  const start = headingMatch.index + headingMatch[0].length;
  const tail = planText.slice(start);
  const nextHeading = tail.match(/^##\s+/m);
  const sectionEnd = nextHeading ? nextHeading.index : tail.length;
  const section = tail.slice(0, sectionEnd);

  const fence = section.match(/```ya?ml\s*\n([\s\S]*?)\n```/);
  if (!fence) return null;
  return fence[1];
}

// ───────────────────────────────────────────────────────────────────────────
// Cross-platform exec helper. Uses shell:true on Windows so .cmd shims resolve.
// Args are passed as array — Node handles quoting via shell:true. We do NOT
// concatenate untrusted strings into the command line.
// ───────────────────────────────────────────────────────────────────────────
function execTool(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: IS_WIN,
    timeout: 30_000,
    ...opts,
  });
}

// Light input sanitization. These regexes are whitelists for fields that may
// reach external tools. Reject anything outside the whitelist with FAIL.
const SAFE = {
  packageName: /^[@a-zA-Z0-9._/\-]+$/,
  repoSlug: /^[a-zA-Z0-9._\-]+\/[a-zA-Z0-9._\-]+$/,
  filePath: /^[a-zA-Z0-9._\-/\\: ]+$/,
  glob: /^[a-zA-Z0-9._\-/\\*?{}\[\],! ]+$/,
};
function checkSafe(value, kind, fieldName) {
  if (!SAFE[kind].test(String(value))) {
    throw new Error(`unsafe value in field "${fieldName}" (${kind}): ${value}`);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Validators — each returns { status, evidence }.
// status ∈ {PASS, FAIL, UNKNOWN}
// ───────────────────────────────────────────────────────────────────────────
const VALIDATORS = {
  file_exists: (claim, ctx) => {
    if (!claim.file) return fail('missing required field: file');
    checkSafe(claim.file, 'filePath', 'file');
    const abs = path.resolve(ctx.repoRoot, claim.file);
    return fs.existsSync(abs)
      ? pass(`file present: ${claim.file}`)
      : fail(`file does not exist: ${claim.file}`);
  },

  symbol_at_line: (claim, ctx) => {
    if (!claim.file || !claim.line || !claim.symbol_contains) {
      return fail('missing required fields: file, line, symbol_contains');
    }
    checkSafe(claim.file, 'filePath', 'file');
    const abs = path.resolve(ctx.repoRoot, claim.file);
    if (!fs.existsSync(abs)) return fail(`file does not exist: ${claim.file}`);
    const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/);
    const line = lines[claim.line - 1];
    if (line === undefined) {
      return fail(`file has only ${lines.length} lines; requested line ${claim.line}`);
    }
    return line.includes(claim.symbol_contains)
      ? pass(`${claim.file}:${claim.line} contains "${claim.symbol_contains}"`)
      : fail(`${claim.file}:${claim.line} does NOT contain "${claim.symbol_contains}". Actual: ${line.trim().slice(0, 200)}`);
  },

  package_installed: (claim, ctx) => {
    if (!claim.manifest || !claim.package) {
      return fail('missing required fields: manifest, package');
    }
    checkSafe(claim.manifest, 'filePath', 'manifest');
    const abs = path.resolve(ctx.repoRoot, claim.manifest);
    if (!fs.existsSync(abs)) return fail(`manifest does not exist: ${claim.manifest}`);
    const content = fs.readFileSync(abs, 'utf8');

    if (claim.manifest.endsWith('.csproj')) {
      const re = new RegExp(`<PackageReference\\s+Include="${escapeRegex(claim.package)}"`, 'i');
      return re.test(content)
        ? pass(`${claim.manifest} references ${claim.package}`)
        : fail(`${claim.manifest} does NOT reference ${claim.package}`);
    }

    if (claim.manifest.endsWith('package.json')) {
      let pkg;
      try { pkg = JSON.parse(content); }
      catch (e) { return fail(`failed to parse package.json: ${e.message}`); }
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
        ...(pkg.peerDependencies || {}),
        ...(pkg.optionalDependencies || {}),
      };
      return claim.package in allDeps
        ? pass(`${claim.manifest} declares ${claim.package}@${allDeps[claim.package]}`)
        : fail(`${claim.manifest} does NOT declare ${claim.package}`);
    }

    return unknown(`unsupported manifest type: ${claim.manifest}`);
  },

  package_version_published: (claim) => {
    if (!claim.package) return fail('missing required field: package');
    checkSafe(claim.package, 'packageName', 'package');
    const minVersion = claim.min_version || '0.0.0';

    // Schema guard: pre-release versions in min_version make the comparison
    // ambiguous against published latest. Prefer `package_installed` which
    // checks the actual manifest entry literally.
    if (/-(?:rc|beta|alpha|preview|pre|dev)\b/i.test(String(minVersion))) {
      return fail(`min_version "${minVersion}" looks like a pre-release. Use claim type "package_installed" with manifest+package instead — it checks the literal entry in csproj/package.json without ambiguity.`);
    }

    // Try npm first (covers JS packages)
    try {
      const out = execTool('npm', ['view', claim.package, 'versions', '--json']);
      const versions = JSON.parse(out);
      const list = Array.isArray(versions) ? versions : [versions];
      const matching = list.filter((v) => semverGte(String(v), minVersion));
      if (matching.length > 0) {
        return pass(`npm: ${matching.length} version(s) >= ${minVersion}; latest matching: ${matching[matching.length - 1]}`);
      }
      return fail(`npm: no version >= ${minVersion}. Latest published: ${list[list.length - 1]}`);
    } catch (npmErr) {
      // Fall through to NuGet
    }

    // Try NuGet (covers .NET packages)
    try {
      const url = `https://api.nuget.org/v3-flatcontainer/${claim.package.toLowerCase()}/index.json`;
      const out = execTool('curl', ['-sSf', '--max-time', '15', url]);
      const data = JSON.parse(out);
      if (!data.versions || data.versions.length === 0) {
        return unknown(`NuGet: no versions returned for ${claim.package}`);
      }
      const matching = data.versions.filter((v) => semverGte(v, minVersion));
      if (matching.length > 0) {
        return pass(`NuGet: ${matching.length} version(s) >= ${minVersion}; latest: ${matching[matching.length - 1]}`);
      }
      return fail(`NuGet: no version >= ${minVersion}. Latest: ${data.versions[data.versions.length - 1]}`);
    } catch (nugetErr) {
      return unknown(`package lookup failed for ${claim.package} on both npm and NuGet`);
    }
  },

  github_issue_state: (claim) => {
    if (!claim.repo || !claim.issue || !claim.expected) {
      return fail('missing required fields: repo, issue, expected');
    }
    checkSafe(claim.repo, 'repoSlug', 'repo');
    if (!Number.isInteger(claim.issue)) return fail(`issue must be integer, got: ${claim.issue}`);
    try {
      const out = execTool('gh', ['issue', 'view', String(claim.issue), '--repo', claim.repo, '--json', 'state']);
      const data = JSON.parse(out);
      const actual = String(data.state).toLowerCase();
      const expected = String(claim.expected).toLowerCase();
      return actual === expected
        ? pass(`gh: ${claim.repo}#${claim.issue} state=${actual}`)
        : fail(`gh: ${claim.repo}#${claim.issue} state=${actual} (expected ${expected})`);
    } catch (e) {
      return unknown(`gh issue view failed: ${truncate(e.message, 180)}`);
    }
  },

  line_count_in_path: (claim, ctx) => {
    if (!claim.glob || !claim.pattern || claim.expected_count === undefined) {
      return fail('missing required fields: glob, pattern, expected_count');
    }
    checkSafe(claim.glob, 'glob', 'glob');

    // Use git ls-files with pathspec glob — git-aware (skips node_modules, build
    // outputs, etc.) and avoids dependency on `rg` being in PATH on Windows cmd.
    let files;
    try {
      const out = execTool('git', ['ls-files', '--', claim.glob], { cwd: ctx.repoRoot });
      files = out.split('\n').map((s) => s.trim()).filter(Boolean);
    } catch (e) {
      return unknown(`git ls-files failed: ${truncate(e.message, 180)}`);
    }

    let pattern;
    try { pattern = new RegExp(claim.pattern, 'g'); }
    catch (e) { return fail(`invalid regex pattern: ${e.message}`); }

    let total = 0;
    for (const f of files) {
      try {
        const content = fs.readFileSync(path.join(ctx.repoRoot, f), 'utf8');
        const matches = content.match(pattern);
        if (matches) total += matches.length;
      } catch (_) { /* skip unreadable */ }
    }

    return total === claim.expected_count
      ? pass(`${total} matches across ${files.length} file(s) matching ${claim.glob} (expected ${claim.expected_count})`)
      : fail(`${total} matches across ${files.length} file(s) matching ${claim.glob} (expected ${claim.expected_count})`);
  },

  command_output_contains: (claim, ctx) => {
    // SECURITY: this validator executes a verbatim shell command from the plan.
    // Trust model: plans are git-tracked, architect-produced, user-reviewed.
    // We require an explicit opt-in via env var to enable this validator,
    // because the field isn't constrainable to a whitelist.
    if (process.env.CREWKIT_VALIDATE_ALLOW_COMMAND !== '1') {
      return unknown('command_output_contains validator disabled. Set CREWKIT_VALIDATE_ALLOW_COMMAND=1 to enable.');
    }
    if (!claim.command) return fail('missing required field: command');
    if (claim.contains === undefined && claim.contains_min === undefined) {
      return fail('must provide either `contains` (substring) or `contains_min` (count threshold)');
    }
    try {
      const { execSync } = require('node:child_process');
      const out = execSync(claim.command, {
        encoding: 'utf8',
        cwd: ctx.repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 30_000,
      });
      if (claim.contains_min !== undefined) {
        const needle = claim.contains || '';
        const count = needle ? (out.match(new RegExp(escapeRegex(needle), 'g')) || []).length : out.split('\n').length;
        return count >= claim.contains_min
          ? pass(`output yielded ${count} occurrences (>= ${claim.contains_min})`)
          : fail(`output yielded ${count} occurrences (< ${claim.contains_min})`);
      }
      return out.includes(claim.contains)
        ? pass(`output contains "${claim.contains}"`)
        : fail(`output does NOT contain "${claim.contains}". First 200 chars: ${truncate(out, 200)}`);
    } catch (e) {
      return unknown(`command execution failed: ${truncate(e.message, 180)}`);
    }
  },
};

// ───────────────────────────────────────────────────────────────────────────
// Result helpers
// ───────────────────────────────────────────────────────────────────────────
const pass    = (evidence) => ({ status: 'PASS',    evidence });
const fail    = (evidence) => ({ status: 'FAIL',    evidence });
const unknown = (evidence) => ({ status: 'UNKNOWN', evidence });

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// Standard semver 2.0 comparison. Pre-release versions are LESS than the
// corresponding release (e.g., 7.0.0-rc.9 < 7.0.0). Pre-release identifiers
// compare per spec (numeric < non-numeric; numeric compared numerically; mixed
// compared lexicographically; longer prefix wins).
function semverGte(a, b) {
  const parse = (v) => {
    const m = String(v).match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?(?:\+[\w.-]+)?$/);
    return m ? {
      major: parseInt(m[1], 10),
      minor: parseInt(m[2], 10),
      patch: parseInt(m[3], 10),
      prerelease: m[4] || null,
    } : null;
  };
  const va = parse(a);
  const vb = parse(b);
  if (!va || !vb) return String(a) >= String(b); // fallback to lexical
  if (va.major !== vb.major) return va.major > vb.major;
  if (va.minor !== vb.minor) return va.minor > vb.minor;
  if (va.patch !== vb.patch) return va.patch > vb.patch;
  // Same MAJOR.MINOR.PATCH — handle prerelease per semver 2.0 §11
  if (!va.prerelease && !vb.prerelease) return true;       // equal release
  if (!va.prerelease && vb.prerelease) return true;        // release > prerelease
  if (va.prerelease && !vb.prerelease) return false;       // prerelease < release
  // Both prereleases — compare identifier-by-identifier
  const aIds = va.prerelease.split('.');
  const bIds = vb.prerelease.split('.');
  for (let i = 0; i < Math.max(aIds.length, bIds.length); i++) {
    if (aIds[i] === undefined) return false; // a is shorter prefix → a < b
    if (bIds[i] === undefined) return true;  // b is shorter prefix → a > b
    const aIsNum = /^\d+$/.test(aIds[i]);
    const bIsNum = /^\d+$/.test(bIds[i]);
    if (aIsNum && bIsNum) {
      const aN = parseInt(aIds[i], 10);
      const bN = parseInt(bIds[i], 10);
      if (aN !== bN) return aN > bN;
    } else if (aIsNum) {
      return false; // numeric < non-numeric
    } else if (bIsNum) {
      return true;
    } else {
      if (aIds[i] !== bIds[i]) return aIds[i] > bIds[i];
    }
  }
  return true; // all identifiers equal
}

function validateClaim(claim, ctx) {
  if (!claim.type) {
    return { ...claim, status: 'FAIL', evidence: 'claim missing required field: type' };
  }
  const validator = VALIDATORS[claim.type];
  if (!validator) {
    return { ...claim, status: 'FAIL', evidence: `unknown claim type: ${claim.type}. Supported: ${Object.keys(VALIDATORS).join(', ')}` };
  }
  try {
    return { ...claim, ...validator(claim, ctx) };
  } catch (e) {
    return { ...claim, status: 'UNKNOWN', evidence: `validator threw: ${truncate(e.message, 180)}` };
  }
}

function summarize(results) {
  const counts = { PASS: 0, FAIL: 0, UNKNOWN: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  if (counts.FAIL > 0)    return { status: 'FAIL',    exitCode: 1, counts };
  if (counts.UNKNOWN > 0) return { status: 'UNKNOWN', exitCode: 2, counts };
  return                       { status: 'PASS',    exitCode: 0, counts };
}

// Map summary status → plan Status field. Returns null if no update applies.
function mapToPlanStatus(summaryStatus) {
  if (summaryStatus === 'PASS')    return 'VALIDATED';
  if (summaryStatus === 'FAIL')    return 'NEEDS_REWORK';
  if (summaryStatus === 'UNKNOWN') return 'NEEDS_REWORK';
  return null;
}

// Atomically update the `**Status:**` line in the plan file. Returns the
// previous status (string) or null if no Status: line was found.
function updatePlanStatus(planPath, newStatus) {
  const original = fs.readFileSync(planPath, 'utf8');
  const re = /^(\*\*Status:\*\*\s+)(\S+)/m;
  const match = original.match(re);
  if (!match) return null;
  const previous = match[2];
  if (previous === newStatus) return previous;
  const updated = original.replace(re, `$1${newStatus}`);
  fs.writeFileSync(planPath, updated, 'utf8');
  return previous;
}

// ───────────────────────────────────────────────────────────────────────────
// Audit writer — structured markdown, machine-first, no prose categorization.
// ───────────────────────────────────────────────────────────────────────────
function writeAudit(planPath, results, summary, repoRoot) {
  const planSlug = path.basename(planPath, '.md');
  const today = new Date().toISOString().slice(0, 10);
  const auditDir = path.join(repoRoot, '.ai', 'audits');
  fs.mkdirSync(auditDir, { recursive: true });
  const auditPath = path.join(auditDir, `${planSlug}-validation-${today}.md`);

  const rel = (p) => path.relative(repoRoot, p).replace(/\\/g, '/');
  const lines = [];
  lines.push(`# Validation: ${planSlug}`);
  lines.push('');
  lines.push(`- **Date:** ${today}`);
  lines.push(`- **Plan:** \`${rel(planPath)}\``);
  lines.push(`- **Status:** ${summary.status}`);
  lines.push(`- **Counts:** PASS=${summary.counts.PASS} FAIL=${summary.counts.FAIL} UNKNOWN=${summary.counts.UNKNOWN}`);
  lines.push(`- **Validator:** \`.claude/scripts/validate-plan.js\` (deterministic, no LLM)`);
  lines.push(`- **Trust basis:** Stechly et al 2024 (arxiv.org/abs/2402.08115); Anthropic skill best-practices plan-validate-execute pattern`);
  lines.push('');
  lines.push('## Per-claim results');
  lines.push('');
  lines.push('| # | Status | Type | Evidence |');
  lines.push('|---|--------|------|----------|');
  results.forEach((r, i) => {
    const ev = (r.evidence || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
    lines.push(`| ${i + 1} | ${r.status} | ${r.type || '(missing)'} | ${ev} |`);
  });
  lines.push('');
  lines.push('## Raw (machine-readable)');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify({ summary, results }, null, 2));
  lines.push('```');

  fs.writeFileSync(auditPath, lines.join('\n') + '\n', 'utf8');
  return auditPath;
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);
  const noUpdate = args.includes('--no-update');
  const planArg = args.find((a) => !a.startsWith('--'));
  if (!planArg) {
    process.stderr.write('Usage: node .claude/scripts/validate-plan.js [--no-update] <path-to-plan.md>\n');
    process.exit(3);
  }
  const planPath = path.resolve(planArg);
  if (!fs.existsSync(planPath)) {
    process.stderr.write(`plan file not found: ${planPath}\n`);
    process.exit(3);
  }

  const repoRoot = process.cwd();
  const planText = fs.readFileSync(planPath, 'utf8');

  const block = extractClaimsBlock(planText);
  if (block === null) {
    // Per architect.md Verifiable Claims Discipline: if a plan has factual
    // claims, the architect MUST emit them. Absence of the section = plan has
    // no factual claims to validate (e.g., pure design/scope plans). We
    // auto-mark such plans VALIDATED so the workflow can proceed without
    // manual intervention. If the architect forgot to emit claims (discipline
    // violation), that's an upstream bug — not the validator's job to enforce.
    let statusUpdate = null;
    if (!noUpdate) {
      const previous = updatePlanStatus(planPath, 'VALIDATED');
      if (previous !== null && previous !== 'VALIDATED') {
        statusUpdate = { previous, current: 'VALIDATED', reason: 'no_claims_section' };
      }
    }
    const out = {
      status: 'NO_CLAIMS_SECTION',
      plan: path.relative(repoRoot, planPath).replace(/\\/g, '/'),
      message: 'Plan has no `## Verifiable Claims` section. Per architect.md discipline, this means no factual claims to validate. Status auto-set to VALIDATED.',
      plan_status_update: statusUpdate,
    };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    process.stderr.write('NO_CLAIMS_SECTION — no factual claims; Status auto-set to VALIDATED.\n');
    if (statusUpdate) {
      process.stderr.write(`Plan status: ${statusUpdate.previous} → ${statusUpdate.current}\n`);
    }
    process.exit(0);
  }

  let claims;
  try {
    claims = parseYamlTuples(block);
  } catch (e) {
    process.stderr.write(`parse error in ${planPath}: ${e.message}\n`);
    process.exit(3);
  }

  if (claims.length === 0) {
    const out = {
      status: 'EMPTY_CLAIMS',
      plan: path.relative(repoRoot, planPath).replace(/\\/g, '/'),
      message: '`## Verifiable Claims` section is empty.',
    };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    process.stderr.write('EMPTY_CLAIMS — section present but empty.\n');
    process.exit(0);
  }

  const ctx = { repoRoot };
  const results = claims.map((c) => validateClaim(c, ctx));
  const summary = summarize(results);
  const auditPath = writeAudit(planPath, results, summary, repoRoot);

  // Atomic plan status update (unless --no-update).
  let statusUpdate = null;
  if (!noUpdate) {
    const newPlanStatus = mapToPlanStatus(summary.status);
    if (newPlanStatus) {
      const previous = updatePlanStatus(planPath, newPlanStatus);
      if (previous !== null) {
        statusUpdate = { previous, current: newPlanStatus };
      }
    }
  }

  process.stdout.write(JSON.stringify({
    status: summary.status,
    plan: path.relative(repoRoot, planPath).replace(/\\/g, '/'),
    audit: path.relative(repoRoot, auditPath).replace(/\\/g, '/'),
    counts: summary.counts,
    plan_status_update: statusUpdate,
    results,
  }, null, 2) + '\n');

  process.stderr.write(`\nValidation: ${summary.status}\n`);
  process.stderr.write(`PASS=${summary.counts.PASS} FAIL=${summary.counts.FAIL} UNKNOWN=${summary.counts.UNKNOWN}\n`);
  process.stderr.write(`Audit: ${path.relative(repoRoot, auditPath).replace(/\\/g, '/')}\n`);
  if (statusUpdate) {
    process.stderr.write(`Plan status: ${statusUpdate.previous} → ${statusUpdate.current}\n`);
  }
  if (summary.exitCode !== 0) {
    process.stderr.write('\nNon-PASS details:\n');
    results.forEach((r, i) => {
      if (r.status !== 'PASS') {
        process.stderr.write(`  ${i + 1}. [${r.status}] ${r.type || '?'}: ${truncate(r.evidence, 200)}\n`);
      }
    });
  }

  process.exit(summary.exitCode);
}

main();
