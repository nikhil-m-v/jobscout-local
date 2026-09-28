import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';
import { createRequire } from 'node:module';
import path from 'node:path';
import { root, pythonExecutable } from './python.mjs';

const require = createRequire(import.meta.url);
const token = randomBytes(32).toString('hex');
let engine;
let frontend;
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  frontend?.kill(); engine?.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
process.on('exit', () => { frontend?.kill(); engine?.kill(); });

try {
  engine = spawn(pythonExecutable(), ['-m', 'jobscout_engine', '--data-dir', path.join(root, '.local'), '--port', '0'], {
    cwd: root, env: { ...process.env, JOBSCOUT_SESSION_TOKEN: token, PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true,
  });
  const bound = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Local engine did not start in time.')), 20000);
    engine.once('error', error => { clearTimeout(timeout); reject(error); });
    engine.once('exit', () => { clearTimeout(timeout); reject(new Error('Local engine exited before startup.')); });
    createInterface({ input: engine.stdout }).on('line', line => {
      try {
        const message = JSON.parse(line);
        if (message.event === 'bound' && Number.isInteger(message.port) && message.port > 0 && message.port <= 65535) {
          clearTimeout(timeout); resolve(`http://127.0.0.1:${message.port}`);
        }
      } catch { /* Ignore non-handshake output; credentials are never written here. */ }
    });
  });
  const viteEntry = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');
  frontend = spawn(process.execPath, [viteEntry, '--host', '127.0.0.1'], {
    cwd: path.join(root, 'apps/desktop'),
    env: { ...process.env, JOBSCOUT_SESSION_TOKEN: token, JOBSCOUT_ENGINE_URL: bound },
    stdio: 'inherit', windowsHide: true,
  });
  console.log('JobScout preview is starting. Press Ctrl+C to close the workspace.');
  frontend.once('error', error => { console.error(error.message); stop(1); });
  frontend.once('exit', code => stop(code ?? 1));
  engine.on('exit', code => { if (!stopping) { console.error('Local engine stopped.'); stop(code ?? 1); } });
} catch (error) { console.error(error.message); stop(1); }

