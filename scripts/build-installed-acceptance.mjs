// Release-mode production code with a separate Windows app identity; no mocks.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './python.mjs';

if (process.platform !== 'win32' || process.argv.length !== 2) throw new Error('Windows only; no arguments or live-provider options.');
const directory = path.join(root, '.local/installed-acceptance');
const release = path.join(root, 'apps/desktop/src-tauri/target/release');
const desktop = path.join(release, 'jobscout-desktop.exe');
const engine = path.join(root, 'apps/desktop/src-tauri/binaries/jobscout-engine-x86_64-pc-windows-msvc.exe');
const normalInstaller = path.join(release, 'bundle/nsis/JobScout_0.1.0_x64-setup.exe');
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
for (const file of [desktop, engine, normalInstaller]) if (!existsSync(file)) throw new Error('Build the paired production release first.');
if (existsSync(path.join(directory, 'installation.json'))) throw new Error('Finish the previous isolated installation before rebuilding.');
mkdirSync(directory, { recursive: true });
const before = { desktop: sha(desktop), engine: sha(engine), installer: sha(normalInstaller) };
const backup = path.join(directory, 'production-desktop.backup');
copyFileSync(desktop, backup);
const config = path.join(directory, 'tauri.json');
writeFileSync(config, JSON.stringify({
  productName: 'JobScout acceptance', identifier: 'app.jobscout.installedacceptance',
  app: { windows: [{ label: 'main', title: 'JobScout — Installed acceptance', width: 1280, height: 900, minWidth: 760, minHeight: 640, backgroundColor: '#fafbf7' }] },
}, null, 2));
const require = createRequire(import.meta.url);
let completed = false;
try {
  const result = spawnSync(process.execPath, [require.resolve('@tauri-apps/cli/tauri.js'), 'build', '--config', config], {
    cwd: path.join(root, 'apps/desktop'), stdio: 'inherit', windowsHide: true,
  });
  if (result.error || result.status !== 0) throw new Error('Isolated release packaging failed; production desktop is restored.');
  const installer = path.join(release, 'bundle/nsis/JobScout acceptance_0.1.0_x64-setup.exe');
  copyFileSync(desktop, path.join(directory, 'jobscout-desktop.exe'));
  copyFileSync(installer, path.join(directory, 'setup.exe'));
  writeFileSync(path.join(directory, 'build.json'), JSON.stringify({
    identifier: 'app.jobscout.installedacceptance', product: 'JobScout acceptance', version: '0.1.0',
    engine_sha256: before.engine, desktop_sha256: sha(desktop), installer_sha256: sha(installer),
    production_before: before,
  }, null, 2));
  completed = true;
} finally {
  copyFileSync(backup, desktop);
  if (sha(desktop) !== before.desktop || sha(engine) !== before.engine || sha(normalInstaller) !== before.installer) {
    throw new Error('Production artifact preservation check failed; retain the ignored backup for inspection.');
  }
}
if (completed) console.log('Isolated installed-acceptance package ready. Production desktop, sidecar and installer hashes preserved. No installation, app launch or provider request.');
