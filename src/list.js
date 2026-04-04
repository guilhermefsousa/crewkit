import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { CORE_SKILLS } from './constants.js';

function readDescription(skillDir) {
  const skillMd = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMd)) return '';
  const content = readFileSync(skillMd, 'utf8');
  const match = content.match(/^---[\s\S]*?^description:\s*"?(.+?)"?\s*$/m);
  if (!match) return '';
  const desc = match[1].trim();
  return desc.length > 45 ? desc.slice(0, 44) + '…' : desc;
}

function getAvailablePacks() {
  const packsDir = join(homedir(), '.claude', 'skills', 'crewkit-setup', 'packs');
  if (!existsSync(packsDir)) return [];
  return readdirSync(packsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && existsSync(join(packsDir, d.name, 'pack.json')))
    .map(d => {
      try {
        const pack = JSON.parse(readFileSync(join(packsDir, d.name, 'pack.json'), 'utf8'));
        return { name: d.name, description: pack.description ?? '', skills: pack.components?.skills ?? [] };
      } catch {
        return { name: d.name, description: '(invalid pack.json)', skills: [] };
      }
    });
}

export function list() {
  const skillsDir = join(homedir(), '.claude', 'skills', 'crewkit-setup', 'templates', 'skills');

  if (!existsSync(skillsDir)) {
    console.error('Error: crewkit templates not found.');
    console.log('  Make sure crewkit is installed first: npx crewkit install');
    process.exit(1);
  }

  const allDirs = readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const coreSkills = CORE_SKILLS.filter(s => allDirs.includes(s));
  const addonSkills = allDirs.filter(s => !CORE_SKILLS.includes(s)).sort();
  const packs = getAvailablePacks();

  const pad = (name, width) => name + ' '.repeat(Math.max(1, width - name.length));
  const nameWidth = Math.max(...[...coreSkills, ...addonSkills, ...packs.map(p => p.name)].map(s => s.length)) + 2;

  console.log('\ncrewkit — available components\n');

  console.log('  Core skills (installed by /crewkit-setup):');
  for (const name of coreSkills) {
    const desc = readDescription(join(skillsDir, name));
    console.log(`    ${pad(name, nameWidth)}${desc}`);
  }

  console.log('\n  Add-on skills (install with: npx crewkit add <name>):');
  for (const name of addonSkills) {
    const desc = readDescription(join(skillsDir, name));
    console.log(`    ${pad(name, nameWidth)}${desc}`);
  }

  if (packs.length > 0) {
    console.log('\n  Packs (install with: npx crewkit add <name>):');
    for (const { name, description, skills } of packs) {
      const desc = description.length > 45 ? description.slice(0, 44) + '…' : description;
      const contents = skills.length > 0 ? `  [${skills.join(', ')}]` : '';
      console.log(`    ${pad(name, nameWidth)}${desc}${contents}`);
    }
  }

  console.log('');
}
