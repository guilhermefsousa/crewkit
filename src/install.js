import { cpSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
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

function installSingleFile(target, templateFile, outputFile, label, hint, version) {
  const template = join(__dirname, '..', 'skill', templateFile);
  mkdirSync(target.dest, { recursive: true });
  copyFileSync(template, join(target.dest, outputFile));
  writeFileSync(target.versionFile, version, 'utf8');
  console.log(`  ✓ ${label}  →  ${join(target.dest, outputFile)}`);
  console.log(`    ${hint}\n`);
}

export async function install() {
  const version = readVersion();
  const tools = detectTools();

  if (tools.length === 0) {
    console.log(`
  No supported AI tools detected.

  crewkit looks for: ~/.claude, ~/.copilot, ~/.cursor
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
        installSingleFile(target, 'copilot-agent.md', 'crewkit-setup.md',
          'GitHub Copilot  ', 'Use @crewkit-setup in Copilot CLI or Chat', version);
        break;
      case 'cursor':
        installSingleFile(target, 'cursor-global.md', 'crewkit-setup.md',
          'Cursor          ', 'Copy to .cursor/rules/ in your projects', version);
        break;
    }
  }
}
