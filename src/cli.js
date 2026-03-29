import { install } from './install.js';

const HELP = `
crewkit — Context engineering for AI-assisted development

Commands:
  install    Install crewkit skill globally (~/.claude/skills/)
  update     Update to latest version (re-run install)
  help       Show this message

Usage:
  npx crewkit install    # one-time setup
  /crewkit-setup         # run in your IDE to scan & calibrate a project
`;

export function run(args) {
  const command = args[0];

  switch (command) {
    case 'install':
    case 'update':
      install();
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
