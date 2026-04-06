import { createInterface } from 'node:readline';

function ask(question) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function selectTargets(tools) {
  if (tools.length === 0) return [];
  if (tools.length === 1) return [tools[0]];

  console.log('\n  Multiple AI tools detected. Where do you want to install crewkit?\n');
  tools.forEach((tool, i) => {
    console.log(`    [${i + 1}] ${tool.name}`);
  });
  console.log(`    [${tools.length + 1}] All of the above`);
  console.log();

  const answer = await ask('  Your choice: ');
  const num = parseInt(answer, 10);

  if (num === tools.length + 1) return tools;
  if (num >= 1 && num <= tools.length) return [tools[num - 1]];

  console.log('  Invalid choice. Installing to all detected tools.');
  return tools;
}
