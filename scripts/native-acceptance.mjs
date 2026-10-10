// Development-only native shell + frozen mock sidecar. No production config edit.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { root, pythonExecutable } from './python.mjs';

const scenario = process.argv[2] ?? 'complete';
const compact = process.argv[3] === '--compact';
if (process.platform !== 'win32' || !['complete', 'failure'].includes(scenario) ||
    process.argv.length > 4 || (process.argv[3] !== undefined && !compact)) {
  throw new Error('Windows only. Usage: npm run acceptance:native -- [complete|failure] [--compact]');
}
const rust = spawnSync('rustc', ['-vV'], { encoding: 'utf8', windowsHide: true });
const target = rust.stdout?.match(/^host: (.+)$/m)?.[1];
if (!target) throw new Error('Install the Windows Tauri prerequisites first.');
const directory = path.join(root, '.local/native-acceptance');
const binaries = path.join(directory, 'bin');
mkdirSync(binaries, { recursive: true });
const packaged = spawnSync(pythonExecutable(), [
  '-m', 'PyInstaller', '--noconfirm', '--onefile', '--name', `jobscout-engine-${target}`,
  '--distpath', binaries, '--workpath', path.join(root, 'work/native-acceptance-pyinstaller'),
  '--specpath', directory, path.join(root, 'scripts/native_acceptance_engine.py'),
], { cwd: root, stdio: 'inherit', windowsHide: true });
if (packaged.error || packaged.status !== 0) throw new Error('Synthetic sidecar packaging failed.');
const config = path.join(directory, 'tauri.json');
writeFileSync(config, JSON.stringify({
  productName: 'JobScout synthetic acceptance', identifier: 'app.jobscout.syntheticacceptance',
  build: { devUrl: 'http://127.0.0.1:1422', beforeDevCommand: '' },
  app: {
    windows: [{ label: 'main', title: 'JobScout — Synthetic acceptance', width: compact ? 760 : 1280, height: compact ? 640 : 900, minWidth: 760, minHeight: 640 }],
    security: { devCsp: "default-src 'self'; connect-src ipc: http://ipc.localhost http://127.0.0.1:1422 ws://127.0.0.1:1422; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'" },
  },
  bundle: { active: false, externalBin: ['../../../.local/native-acceptance/bin/jobscout-engine'] },
}, null, 2));
const require = createRequire(import.meta.url);
const vite = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');
const tauri = path.join(path.dirname(require.resolve('@tauri-apps/cli/package.json')), 'tauri.js');
// Reuse only the existing ignored dev cache; distribution outputs stay untouched.
const env = { ...process.env, CARGO_TARGET_DIR: path.join(root, 'work/desktop-dev'), JOBSCOUT_ACCEPTANCE_SCENARIO: scenario };
delete env.JOBSCOUT_ENGINE_URL;
delete env.JOBSCOUT_SESSION_TOKEN;
let frontend, desktop, stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  frontend?.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
frontend = spawn(process.execPath, [vite, '--config', path.join(root, 'scripts/native-acceptance-vite.config.mjs')],
  { cwd: path.join(root, 'apps/desktop'), env, stdio: 'inherit', windowsHide: true });
frontend.once('error', () => stop(1));
frontend.once('exit', () => { if (!stopping) stop(1); });
desktop = spawn(process.execPath, [tauri, 'dev', '--no-watch', '--config', config],
  { cwd: path.join(root, 'apps/desktop'), env, stdio: 'inherit', windowsHide: true });
desktop.once('error', () => stop(1));
desktop.once('exit', code => stop(code ?? 1));
console.log('Native synthetic acceptance only: fresh storage, mock providers, no saved vault. Close the test window normally to end the run.');
