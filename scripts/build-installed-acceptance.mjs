// Release-mode production shell with a separate Windows app identity.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root, pythonExecutable } from './python.mjs';
import { generateNotices, checkNoticeInventory } from './generate-notices.mjs';
import { sslRuntimeDataArgs } from './engine-runtime-data.mjs';

const syntheticSearch = process.argv[2] === '--synthetic-search';
if (process.platform !== 'win32' || (process.argv.length !== 2 && !(syntheticSearch && process.argv.length === 3))) {
  throw new Error('Windows only. Optional --synthetic-search; no live-provider options.');
}
const directory = path.join(root, '.local/installed-acceptance');
if (!process.env.npm_execpath) throw new Error('Run npm run acceptance:installed:build so dependency notices can be collected.');
const release = path.join(path.resolve(root, process.env.CARGO_TARGET_DIR ?? 'apps/desktop/src-tauri/target'), 'release');
const desktop = path.join(release, 'jobscout-desktop.exe');
const engine = path.join(root, 'apps/desktop/src-tauri/binaries/jobscout-engine-x86_64-pc-windows-msvc.exe');
const normalInstaller = path.join(release, 'bundle/nsis/JobScout_0.1.0_x64-setup.exe');
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
for (const file of [desktop, engine, normalInstaller]) if (!existsSync(file)) throw new Error('Build the paired production release first.');
if (existsSync(path.join(directory, 'installation.json'))) throw new Error('Finish the previous isolated installation before rebuilding.');
mkdirSync(directory, { recursive: true });
const notices = generateNotices(engine);
const noticeConfig = JSON.parse(readFileSync(notices.overlay, 'utf8'));
const before = { desktop: sha(desktop), engine: sha(engine), installer: sha(normalInstaller) };
let acceptanceEngine = engine;
let externalBin;
if (syntheticSearch) {
  // This wrapper has no live transport/vault/model mode. Never replace the
  // production sidecar, or add a runtime test bypass to its entry point.
  const rust = spawnSync('rustc', ['-vV'], { encoding: 'utf8', windowsHide: true });
  const target = rust.stdout?.match(/^host: (.+)$/m)?.[1];
  if (!target) throw new Error('Cannot identify the Windows target.');
  const bin = path.join(directory, 'synthetic-bin');
  mkdirSync(bin, { recursive: true });
  const ssl = spawnSync(pythonExecutable(), ['-c', 'import ssl; print(ssl.__file__)'], { encoding: 'utf8', windowsHide: true });
  if (ssl.error || ssl.status !== 0 || !ssl.stdout?.trim()) throw new Error('Cannot inspect SSL runtime data.');
  const frozen = spawnSync(pythonExecutable(), [
    '-m', 'PyInstaller', '--noconfirm', '--clean', '--onefile', '--name', `jobscout-engine-${target}`,
    '--exclude-module', 'pytest', '--exclude-module', '_pytest', ...sslRuntimeDataArgs(ssl.stdout.trim()),
    '--distpath', bin, '--workpath', path.join(root, 'work/installed-search-pyinstaller'),
    '--specpath', directory, path.join(root, 'scripts/installed_search_engine.py'),
  ], { cwd: root, stdio: 'inherit', windowsHide: true });
  if (frozen.error || frozen.status !== 0) throw new Error('Synthetic installed sidecar packaging failed.');
  acceptanceEngine = path.join(bin, `jobscout-engine-${target}.exe`);
  externalBin = [path.join(bin, 'jobscout-engine').replaceAll('\\', '/')];
}
const backup = path.join(directory, 'production-desktop.backup');
copyFileSync(desktop, backup);
const config = path.join(directory, 'tauri.json');
writeFileSync(config, JSON.stringify({
  productName: 'JobScout acceptance', identifier: 'app.jobscout.installedacceptance',
  bundle: { ...noticeConfig.bundle, ...(externalBin ? { externalBin } : {}) },
  app: { windows: [{ label: 'main', title: syntheticSearch ? 'JobScout — Synthetic installed search' : 'JobScout — Installed acceptance', width: 1280, height: 900, minWidth: 760, minHeight: 640, backgroundColor: '#fafbf7' }] },
}, null, 2));
const require = createRequire(import.meta.url);
let completed = false;
try {
  const result = spawnSync(process.execPath, [require.resolve('@tauri-apps/cli/tauri.js'), 'build', '--config', config], {
    cwd: path.join(root, 'apps/desktop'), stdio: 'inherit', windowsHide: true,
  });
  if (result.error || result.status !== 0) throw new Error('Isolated release packaging failed; production desktop is restored.');
  const noticeInventory = checkNoticeInventory(notices.directory, engine);
  const installer = path.join(release, 'bundle/nsis/JobScout acceptance_0.1.0_x64-setup.exe');
  copyFileSync(desktop, path.join(directory, 'jobscout-desktop.exe'));
  copyFileSync(installer, path.join(directory, 'setup.exe'));
  writeFileSync(path.join(directory, 'build.json'), JSON.stringify({
    identifier: 'app.jobscout.installedacceptance', product: 'JobScout acceptance', version: '0.1.0',
    mode: syntheticSearch ? 'synthetic-search' : 'production-engine',
    engine_sha256: sha(acceptanceEngine), desktop_sha256: sha(desktop), installer_sha256: sha(installer),
    notice_sha256: noticeInventory.sha256,
    notice_scope: 'Production dependency bundle; no synthetic-sidecar inventory or license clearance claimed.',
    ...(syntheticSearch ? { wrapper_sha256: sha(path.join(root, 'scripts/installed_search_engine.py')) } : {}),
    production_before: before,
  }, null, 2));
  completed = true;
} finally {
  copyFileSync(backup, desktop);
  if (sha(desktop) !== before.desktop || sha(engine) !== before.engine || sha(normalInstaller) !== before.installer) {
    throw new Error('Production artifact preservation check failed; retain the ignored backup for inspection.');
  }
}
if (completed) console.log(`Isolated installed-acceptance package ready (${syntheticSearch ? 'synthetic transport engine' : 'production engine'}). Production artifact hashes preserved. No installation, app launch or provider request.`);
