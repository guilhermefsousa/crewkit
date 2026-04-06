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
  console.log(`  ✓ Claude Code  →  ${target.dest}`);
  console.log(`\n  Next: open any project in Claude Code and run:\n\n    /crewkit-setup\n`);
}

function installSingleFile(target, templateFile, outputFile, label, nextSteps, version) {
  const template = join(__dirname, '..', 'skill', templateFile);
  mkdirSync(target.dest, { recursive: true });
  copyFileSync(template, join(target.dest, outputFile));
  writeFileSync(target.versionFile, version, 'utf8');
  console.log(`  ✓ ${label}  →  ${join(target.dest, outputFile)}`);
  console.log(`\n  ${nextSteps}\n`);
}

export async function install() {
  const version = readVersion();
  const tools = detectTools();

  if (tools.length === 0) {
    console.log(`
  No supported AI tools detected.

  crewkit supports: Claude Code (~/.claude), Cursor (~/.cursor), GitHub Copilot (VS Code).
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
      case 'cursor':
        installSingleFile(target, 'cursor-global.md', 'crewkit-setup.md',
          'Cursor', 'Next: open any project in Cursor and type:\n\n    @crewkit-setup', version);
        break;
      case 'vscode':
        installSingleFile(target, 'vscode-global.prompt.md', 'crewkit-setup.prompt.md',
          'GitHub Copilot (VS Code)', 'Next: open any project in VS Code Copilot Chat and run:\n\n    /crewkit-setup', version);
        break;
    }
  }
}
