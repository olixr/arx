// Runs the game server and the Vite client dev server together.
import { spawn } from 'node:child_process';

const procs = [
  ['server', 'npm', ['run', 'dev', '-w', '@devcraft/server']],
  ['client', 'npm', ['run', 'dev', '-w', '@devcraft/client']],
];

const children = [];
for (const [name, cmd, args] of procs) {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const prefix = (data) =>
    data
      .toString()
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((l) => `[${name}] ${l}`)
      .join('\n');
  child.stdout.on('data', (d) => console.log(prefix(d)));
  child.stderr.on('data', (d) => console.error(prefix(d)));
  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
    for (const c of children) c.kill();
    process.exit(code ?? 0);
  });
  children.push(child);
}

process.on('SIGINT', () => {
  for (const c of children) c.kill('SIGINT');
});
