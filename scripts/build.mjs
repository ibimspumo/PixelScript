import { spawnSync } from 'node:child_process';

const steps = [
  ['vite', 'build'],
  ['vite', 'build', '--mode', 'standalone'],
  ['vite', 'build', '--mode', 'demo']
];

for (const [command, ...args] of steps) {
  const result = spawnSync(process.platform === 'win32' ? `${command}.cmd` : command, args, {
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
