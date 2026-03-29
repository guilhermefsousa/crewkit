import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function install() {
  const skillSource = join(__dirname, '..', 'skill');
  const skillDest = join(homedir(), '.claude', 'skills', 'crewkit-setup');

  // Verify source exists
  if (!existsSync(skillSource)) {
    console.error('Error: skill/ directory not found. Package may be corrupted.');
    process.exit(1);
  }

  // Create destination
  mkdirSync(skillDest, { recursive: true });

  // Copy skill + templates
  cpSync(skillSource, skillDest, { recursive: true, force: true });

  // Read version
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

  // Write version marker
  writeFileSync(join(skillDest, '.version'), pkg.version, 'utf8');

  console.log(`
  ✓ crewkit v${pkg.version} installed

  Skill copied to: ${skillDest}

  Next: open any project in Claude Code and run:

    /crewkit-setup

  This will scan your codebase and generate a complete
  context engineering setup (agents, skills, hooks, rules, memory).
  `);
}
