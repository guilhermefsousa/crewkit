import { cpSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { CORE_SKILLS } from './constants.js';

function getOptionalSkills() {
  const skillsDir = join(homedir(), '.claude', 'skills', 'crewkit-setup', 'templates', 'skills');
  if (!existsSync(skillsDir)) return [];
  return readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && !CORE_SKILLS.includes(d.name))
    .map(d => d.name);
}

function getAvailablePacks() {
  const packsDir = join(homedir(), '.claude', 'skills', 'crewkit-setup', 'packs');
  if (!existsSync(packsDir)) return [];
  return readdirSync(packsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(packsDir, d.name, 'pack.json')))
    .map(d => d.name);
}

function installSkill(skillName) {
  const sourceDir = join(homedir(), '.claude', 'skills', 'crewkit-setup', 'templates', 'skills', skillName);

  if (!existsSync(sourceDir)) {
    console.error(`Error: source not found at ${sourceDir}`);
    console.log('  Make sure crewkit is installed first: npx crewkit install');
    process.exit(1);
  }

  const targetDir = join(process.cwd(), '.claude', 'skills', skillName);

  if (existsSync(targetDir)) {
    console.log(`  Warning: ${targetDir} already exists. Overwriting.`);
  }

  mkdirSync(targetDir, { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true, force: true });

  return targetDir;
}

function installPack(packName) {
  const packJson = join(homedir(), '.claude', 'skills', 'crewkit-setup', 'packs', packName, 'pack.json');
  let pack;
  try {
    pack = JSON.parse(readFileSync(packJson, 'utf8'));
  } catch {
    console.error(`Error: invalid pack.json for "${packName}".`);
    process.exit(1);
  }
  const skills = pack.components?.skills ?? [];

  const templatesDir = join(homedir(), '.claude', 'skills', 'crewkit-setup', 'templates', 'skills');
  const missing = skills.filter(s => !existsSync(join(templatesDir, s)));
  if (missing.length) {
    console.error(`Error: pack "${packName}" references missing skills: ${missing.join(', ')}`);
    console.log('  Make sure crewkit is installed first: npx crewkit install');
    process.exit(1);
  }

  const installed = [];
  for (const skillName of skills) {
    const targetDir = installSkill(skillName);
    installed.push({ name: skillName, path: targetDir });
  }

  console.log(`
  ✓ Pack "${packName}" installed (${installed.length} skill${installed.length !== 1 ? 's' : ''})
`);
  for (const { name, path } of installed) {
    console.log(`    /${name}  →  ${path}`);
  }
  console.log('');
}

export function add(skillName) {
  const availablePacks = getAvailablePacks();
  const optionalSkills = getOptionalSkills();

  if (!skillName) {
    console.error('Error: skill name is required.');
    console.log(`\n  Available packs:\n${availablePacks.map(p => `    - ${p}`).join('\n')}`);
    console.log(`\n  Available optional skills:\n${optionalSkills.map(s => `    - ${s}`).join('\n')}\n`);
    process.exit(1);
  }

  if (availablePacks.includes(skillName)) {
    installPack(skillName);
    return;
  }

  if (optionalSkills.includes(skillName)) {
    const targetDir = installSkill(skillName);
    console.log(`
  ✓ Skill "${skillName}" installed

  Copied to: ${targetDir}

  Use /${skillName} in Claude Code to run it.
  `);
    return;
  }

  console.error(`Error: "${skillName}" is not a known pack or optional skill.`);
  console.log(`\n  Available packs:\n${availablePacks.map(p => `    - ${p}`).join('\n')}`);
  console.log(`\n  Available optional skills:\n${optionalSkills.map(s => `    - ${s}`).join('\n')}\n`);
  process.exit(1);
}
