import { install } from './install.js';
import { update } from './update.js';
import { add } from './add.js';
import { list } from './list.js';

const HELP = `
crewkit — Context engineering for AI-assisted development

Commands:
  install       Install crewkit globally (Claude Code, Copilot, Cursor)
  update        Update to latest version (re-run install)
  add <name>    Add an optional skill or pack to the current project
  list          List all available skills and packs (core + add-ons)
  help          Show this message

Usage:
  npx crewkit install          # one-time setup
  npx crewkit list             # see all available skills and packs
  npx crewkit add retro        # add optional skill to project
  npx crewkit add quality      # add a pack (multiple skills)
  /crewkit-setup               # run in your IDE to scan & calibrate a project
`;

export function run(args) {
  const command = args[0];

  switch (command) {
    case 'install':
      install().catch(err => { console.error(err.message); process.exit(1); });
      return;

    case 'update':
      update().catch(err => { console.error(err.message); process.exit(1); });
      return;
    case 'add':
      add(args[1]);
      break;
    case 'list':
      list();
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
