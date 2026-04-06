import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectTools } from './detect.js';
import { install } from './install.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getInstalledVersion() {
  for (const tool of detectTools()) {
    if (existsSync(tool.versionFile)) {
      return readFileSync(tool.versionFile, 'utf8').trim();
    }
  }
  return 'unknown';
}

export async function update() {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  const newVersion = pkg.version;
  const currentVersion = getInstalledVersion();

  if (currentVersion === newVersion) {
    console.log(`  Already up to date (v${newVersion})`);
    return;
  }

  await install();

  const fromLabel = currentVersion === 'unknown' ? 'v0.1 (untracked)' : `v${currentVersion}`;
  console.log(`  Updated: ${fromLabel} → v${newVersion}`);
}
