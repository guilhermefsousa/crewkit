import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const OPTIONAL_SKILLS = ['retro', 'dev-metrics', 'security-scan', 'impact'];

export function add(skillName) {
  if (!skillName) {
    console.error('Error: skill name is required.');
    console.log(`\n  Available optional skills:\n${OPTIONAL_SKILLS.map(s => `    - ${s}`).join('\n')}\n`);
    process.exit(1);
  }

  if (!OPTIONAL_SKILLS.includes(skillName)) {
    console.error(`Error: "${skillName}" is not a known optional skill.`);
    console.log(`\n  Available optional skills:\n${OPTIONAL_SKILLS.map(s => `    - ${s}`).join('\n')}\n`);
    process.exit(1);
  }

  const source = join(homedir(), '.claude', 'skills', 'crewkit-setup', 'templates', 'skills', skillName, 'SKILL.md');

  if (!existsSync(source)) {
    console.error(`Error: source not found at ${source}`);
    console.log('  Make sure crewkit is installed first: npx crewkit install');
    process.exit(1);
  }

  const targetDir = join(process.cwd(), '.claude', 'skills', skillName);
  const target = join(targetDir, 'SKILL.md');

  if (existsSync(target)) {
    console.log(`  Warning: ${target} already exists. Overwriting.`);
  }

  mkdirSync(targetDir, { recursive: true });
  cpSync(source, target);

  console.log(`
  ✓ Skill "${skillName}" installed

  Copied to: ${target}

  Use /${skillName} in Claude Code to run it.
  `);
}
