import { install } from './install.js';
import { update } from './update.js';
import { add } from './add.js';

const HELP = `
crewkit — Context engineering for AI-assisted development

Commands:
  install       Install crewkit skill globally (~/.claude/skills/)
  update        Update to latest version (re-run install)
  add <skill>   Add an optional skill to the current project
  help          Show this message

Usage:
  npx crewkit install          # one-time setup
  npx crewkit add retro        # add optional skill to project
  /crewkit-setup               # run in your IDE to scan & calibrate a project
`;

export function run(args) {
  const command = args[0];

  switch (command) {
    case 'install':
      install();
      break;
    case 'update':
      update();
      break;
    case 'add':
      add(args[1]);
      break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}
