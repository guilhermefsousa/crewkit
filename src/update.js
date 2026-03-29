import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { install } from './install.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function update() {
  const versionFile = join(homedir(), '.claude', 'skills', 'crewkit-setup', '.version');
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

  const newVersion = pkg.version;
  const currentVersion = existsSync(versionFile)
    ? readFileSync(versionFile, 'utf8').trim()
    : 'unknown';

  if (currentVersion === newVersion) {
    console.log(`  Already up to date (v${newVersion})`);
    return;
  }

  install();

  const fromLabel = currentVersion === 'unknown' ? 'v0.1 (untracked)' : `v${currentVersion}`;
  console.log(`  Updated: ${fromLabel} → v${newVersion}`);
}
