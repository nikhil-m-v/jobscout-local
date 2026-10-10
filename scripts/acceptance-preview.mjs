import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { createRequire } from 'node:module';
import path from 'node:path';
import { root, pythonExecutable } from './python.mjs';

const scenario = process.argv[2] ?? 'complete';
if (!['complete', 'failure'].includes(scenario) || process.argv.length > 3) {
  throw new Error('Usage: npm run acceptance:preview -- [complete|failure]');
}
const require = createRequire(import.meta.url);
const token = randomBytes(32).toString('hex');
let engine, frontend, stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  frontend?.kill();
  // Owner watcher permits graceful Python shutdown and temporary-data cleanup.
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
process.on('exit', () => frontend?.kill());

try {
  engine = spawn(pythonExecutable(), ['scripts/acceptance_engine.py', '--scenario', scenario, '--owner-pid', String(process.pid)], {
    cwd: root, env: { ...process.env, JOBSCOUT_SESSION_TOKEN: token, PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true,
  });
  const bound = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Synthetic engine did not start in time.')), 20000);
    engine.once('error', error => { clearTimeout(timeout); reject(error); });
    engine.once('exit', () => { clearTimeout(timeout); reject(new Error('Synthetic engine exited before startup.')); });
    createInterface({ input: engine.stdout }).on('line', line => {
      try {
        const message = JSON.parse(line);
        if (message.event === 'bound' && Number.isInteger(message.port) && message.port > 0 && message.port <= 65535) {
          clearTimeout(timeout); resolve(`http://127.0.0.1:${message.port}`);
        }
      } catch { /* No request bodies or credentials are printed. */ }
    });
  });
  const viteEntry = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');
  frontend = spawn(process.execPath, [viteEntry, '--config', path.join(root, 'scripts/acceptance-vite.config.mjs')], {
    cwd: path.join(root, 'apps/desktop'), windowsHide: true, stdio: 'inherit',
    env: { ...process.env, JOBSCOUT_SESSION_TOKEN: token, JOBSCOUT_ENGINE_URL: bound, JOBSCOUT_ACCEPTANCE_SCENARIO: scenario },
  });
  console.log(`Synthetic acceptance (${scenario}) only. No live search or saved credentials. Ctrl+C closes the preview.`);
  frontend.once('error', error => { console.error(error.message); stop(1); });
  frontend.once('exit', code => { stop(code ?? 1); engine.stdout.destroy(); engine.unref(); });
  engine.on('exit', code => { if (!stopping) { console.error('Synthetic engine stopped.'); stop(code ?? 1); } });
} catch (error) {
  console.error(error.message); stop(1);
  engine?.stdout?.destroy(); engine?.unref();
}
