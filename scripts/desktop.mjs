import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { root } from './python.mjs';
import { buildEngine } from './build-engine.mjs';

const require = createRequire(import.meta.url);
const mode = process.argv[2] ?? 'dev';
// Keep managed development separate from direct Cargo checks and old sidecars.
// A running Windows executable cannot be replaced by Tauri's build helper.
const environment = { ...process.env };
if (mode === 'dev' && !environment.CARGO_TARGET_DIR) {
  environment.CARGO_TARGET_DIR = path.join(root, 'work/desktop-dev');
}
try {
  buildEngine();
  const result = spawnSync(process.execPath, [require.resolve('@tauri-apps/cli/tauri.js'), mode], {
    cwd: path.join(root, 'apps/desktop'), stdio: 'inherit', windowsHide: true, env: environment,
  });
  process.exitCode = result.status ?? 1;
} catch (error) { console.error(error.message); process.exitCode = 1; }
