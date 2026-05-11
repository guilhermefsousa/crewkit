import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectTools } from './detect.js';
import { selectTargets } from './prompt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readVersion() {
  return JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')).version;
}

function installClaude(target, version) {
  const skillSource = join(__dirname, '..', 'skill');
  mkdirSync(target.dest, { recursive: true });
  cpSync(skillSource, target.dest, { recursive: true, force: true });
  writeFileSync(target.versionFile, version, 'utf8');
  console.log(`  ✓ Claude Code       →  ${target.dest}`);
  console.log(`    Run /crewkit-setup in any project\n`);
}

function installCopilot(target, version) {
  const skillSource = join(__dirname, '..', 'skill');
  mkdirSync(target.dest, { recursive: true });
  cpSync(skillSource, target.dest, { recursive: true, force: true });
  writeFileSync(target.versionFile, version, 'utf8');
  console.log(`  ✓ GitHub Copilot    →  ${target.dest}`);
  console.log(`    Use @crewkit-setup in Copilot CLI or Chat\n`);
}

export async function install() {
  const version = readVersion();
  const tools = detectTools();

  if (tools.length === 0) {
    console.log(`
  No supported AI tools detected.

  crewkit looks for: ~/.claude, ~/.copilot
  Install one of these tools and re-run.
    `);
    process.exit(1);
  }

  const targets = await selectTargets(tools);

  console.log(`\n  Installing crewkit v${version}...\n`);

  for (const target of targets) {
    switch (target.id) {
      case 'claude':
        installClaude(target, version);
        break;
      case 'copilot':
        installCopilot(target, version);
        break;
    }
  }
}
