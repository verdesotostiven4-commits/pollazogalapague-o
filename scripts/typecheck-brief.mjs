import { spawnSync } from 'node:child_process';

// Keep CI diagnostics compact so the actual TypeScript errors stay visible.
// This script is also usable locally with npm run typecheck.
const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsc', '--noEmit', '-p', 'tsconfig.app.json', '--pretty', 'false'],
  { encoding: 'utf8' }
);

const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();

if (result.status === 0) {
  console.log('TypeScript: OK');
  process.exit(0);
}

const lines = output.split(/\r?\n/).filter(Boolean);
const diagnostics = lines.filter(line => line.includes('error TS'));

console.error('TypeScript errors:');
console.error((diagnostics.length > 0 ? diagnostics : lines).slice(0, 80).join('\n'));
process.exit(result.status || 1);
