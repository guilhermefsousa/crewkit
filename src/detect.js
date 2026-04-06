import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';

function getVSCodeUserPath() {
  const home = homedir();
  switch (platform()) {
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Code', 'User');
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'Code', 'User');
    default:
      return join(home, '.config', 'Code', 'User');
  }
}

export function detectTools() {
  const tools = [];
  const home = homedir();

  if (existsSync(join(home, '.claude'))) {
    const dest = join(home, '.claude', 'skills', 'crewkit-setup');
    tools.push({ id: 'claude', name: 'Claude Code', dest, versionFile: join(dest, '.version') });
  }

  if (existsSync(join(home, '.cursor'))) {
    const dest = join(home, '.cursor', 'rules');
    tools.push({ id: 'cursor', name: 'Cursor', dest, versionFile: join(dest, 'crewkit-setup.version') });
  }

  const vscodePath = getVSCodeUserPath();
  if (existsSync(vscodePath)) {
    const dest = join(vscodePath, 'prompts');
    tools.push({ id: 'vscode', name: 'GitHub Copilot (VS Code)', dest, versionFile: join(dest, 'crewkit-setup.version') });
  }

  return tools;
}
