import { spawnSync } from 'node:child_process';
import { mkdirSync, renameSync } from 'node:fs';
import path from 'node:path';
import { root, pythonExecutable } from './python.mjs';
import { sslRuntimeDataArgs } from './engine-runtime-data.mjs';

export function buildEngine() {
  const rust = spawnSync('rustc', ['-vV'], { encoding: 'utf8', windowsHide: true });
  const target = process.env.JOBSCOUT_TARGET ?? rust.stdout?.match(/^host: (.+)$/m)?.[1];
  if (!target) throw new Error('Rust is required to identify the desktop target. Install the Tauri prerequisites from README.md.');
  const destination = path.join(root, 'apps/desktop/src-tauri/binaries');
  mkdirSync(destination, { recursive: true });
  const ssl = spawnSync(pythonExecutable(), ['-c', 'import ssl; print(ssl.__file__)'],
    { encoding: 'utf8', windowsHide: true });
  if (ssl.error || ssl.status !== 0 || !ssl.stdout?.trim()) throw new Error('Cannot inspect the build Python SSL runtime.');
  const runtimeData = sslRuntimeDataArgs(ssl.stdout.trim());
  const result = spawnSync(pythonExecutable(), [
    '-m', 'PyInstaller', '--noconfirm', '--clean', '--onefile', '--name', 'jobscout-engine',
    '--exclude-module', 'pytest', '--exclude-module', '_pytest',
    ...runtimeData,
    '--distpath', destination, '--workpath', path.join(root, 'work/pyinstaller'),
    '--specpath', path.join(root, 'work'), path.join(root, 'apps/engine/launcher.py'),
  ], { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error('Engine packaging failed. Install the desktop Python dependencies first.');
  const extension = process.platform === 'win32' ? '.exe' : '';
  const engine = path.join(destination, `jobscout-engine-${target}${extension}`);
  renameSync(path.join(destination, `jobscout-engine${extension}`), engine);
  return engine;
}
if (process.argv[1] === path.join(root, 'scripts/build-engine.mjs')) {
  try { buildEngine(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
