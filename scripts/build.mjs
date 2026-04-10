import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const viteBin = resolve(scriptDir, '../node_modules/vite/bin/vite.js');

const steps = [
  ['vite', 'build'],
  ['vite', 'build', '--mode', 'standalone'],
  ['vite', 'build', '--mode', 'demo']
];

for (const [command, ...args] of steps) {
  const result = spawnSync(process.execPath, [viteBin, ...args], {
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
