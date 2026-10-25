import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root, pythonExecutable } from './python.mjs';

// Use the same checks locally and on disposable Windows CI runners. Reports
// contain synthetic test output; never point this runner at a private review.
const python = pythonExecutable();
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this through npm run validate:ci.');
const parent = path.join(root, 'work', 'ci');
mkdirSync(parent, { recursive: true });
const output = mkdtempSync(path.join(parent, 'validation-'));
console.log(`Validation reports: ${path.relative(root, output)}`);
const steps = [
  ['engine', python, ['-m', 'pytest', '-q', '-p', 'no:cacheprovider',
    `--basetemp=${path.join(output, 'pytest-tmp')}`, `--junitxml=${path.join(output, 'engine.xml')}`]],
  ['frontend', process.execPath, ['--experimental-strip-types', '--test', '--test-reporter=tap', 'apps/desktop/tests/*.test.mjs']],
  ['reports', process.execPath, ['--experimental-strip-types', '--test', '--test-reporter=tap', 'scripts/tests/*.test.mjs']],
  ['notices', python, ['-m', 'unittest', 'discover', '-s', 'scripts/tests', '-p', 'test_*.py', '-v']],
  ['shortlist', process.execPath, ['--experimental-strip-types', 'scripts/evaluate-shortlist.mjs']],
  ['candidate-pool', process.execPath, ['--experimental-strip-types', 'scripts/evaluate-candidate-pool.mjs']],
  ['quality-plans', python, ['scripts/verify-quality-cases.py', '--verify-only']],
  ['typecheck', process.execPath, [npm, 'run', 'typecheck']],
  ['build', process.execPath, [npm, 'run', 'build']],
];
const results = [];
for (const [name, executable, args] of steps) {
  console.log(`Running ${name}…`);
  const fd = openSync(path.join(output, `${name}.log`), 'wx');
  let result;
  try {
    result = spawnSync(executable, args, {
      cwd: root, stdio: ['ignore', fd, fd], windowsHide: true, timeout: 300_000,
    });
  } finally {
    closeSync(fd);
  }
  const passed = !result.error && result.status === 0;
  results.push({ check: name, passed, exitCode: result.status, error: result.error?.code ?? null });
  console.log(`${name}: ${passed ? 'PASS' : 'FAIL'} (see ${name}.log)`);
}
writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify(results, null, 2)}\n`);
process.exitCode = results.every(result => result.passed) ? 0 : 1;
