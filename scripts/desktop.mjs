import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { root } from './python.mjs';
import { buildEngine } from './build-engine.mjs';

const require = createRequire(import.meta.url);
try {
  buildEngine();
  const result = spawnSync(process.execPath, [require.resolve('@tauri-apps/cli/tauri.js'), process.argv[2] ?? 'dev'], {
    cwd: path.join(root, 'apps/desktop'), stdio: 'inherit', windowsHide: true,
  });
  process.exitCode = result.status ?? 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
