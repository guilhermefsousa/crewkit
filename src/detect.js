import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export function detectTools() {
  const tools = [];
  const home = homedir();

  if (existsSync(join(home, '.claude'))) {
    const dest = join(home, '.claude', 'skills', 'crewkit-setup');
    tools.push({ id: 'claude', name: 'Claude Code', dest, versionFile: join(dest, '.version') });
  }

  if (existsSync(join(home, '.copilot'))) {
    const dest = join(home, '.copilot', 'agents');
    tools.push({ id: 'copilot', name: 'GitHub Copilot', dest, versionFile: join(dest, 'crewkit-setup.version') });
  }

  return tools;
}
