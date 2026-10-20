import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './python.mjs';
import { checkBundleConfig, stageInstaller } from './installer-export.mjs';

const config = JSON.parse(readFileSync(path.join(root, 'apps/desktop/src-tauri/tauri.conf.json'), 'utf8'));
checkBundleConfig(config);
const parent = path.join(root, 'work/distribution');
mkdirSync(parent, { recursive: true });
const run = mkdtempSync(path.join(parent, 'build-'));
const receipt = path.join(run, 'private-notice-inventory.json');
const build = spawnSync(process.execPath, [path.join(root, 'scripts/desktop.mjs'), 'build'], {
  cwd: root, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, JOBSCOUT_NOTICE_RECEIPT: receipt },
});
if (build.error || build.status !== 0) {
  console.error('Packaging failed; no installer export was staged.');
  process.exitCode = 1;
} else {
  const target = path.resolve(root, process.env.CARGO_TARGET_DIR ?? 'apps/desktop/src-tauri/target');
  const bundle = path.join(target, 'release/bundle/nsis');
  const installers = readdirSync(bundle).filter(name => name.endsWith('.exe'));
  if (installers.length !== 1 || installers[0] !== `JobScout_${config.version}_x64-setup.exe`) {
    throw new Error('Expected exactly one installer for the current application version.');
  }
  const notices = JSON.parse(readFileSync(receipt, 'utf8'));
  const destination = path.join(run, 'installer');
  const audit = stageInstaller({
    config, frontend: path.join(root, 'apps/desktop/dist'),
    installer: path.join(bundle, installers[0]), destination,
  });
  audit.revision = process.env.GITHUB_SHA ?? 'local-uncommitted-build';
  audit.runId = process.env.GITHUB_RUN_ID ?? null;
  audit.runAttempt = process.env.GITHUB_RUN_ATTEMPT ?? null;
  audit.dependencyNotices = notices;
  const installerPath = path.join(destination, audit.filename);
  const auditPath = path.join(run, 'private-audit.json');
  writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, { flag: 'wx' });
  console.log(`Installer export: ${path.relative(root, installerPath)}`);
  console.log(`Private audit: ${path.relative(root, auditPath)}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT,
      `installer-path=${path.relative(root, installerPath).replaceAll('\\', '/')}\n` +
      `audit-path=${path.relative(root, auditPath).replaceAll('\\', '/')}\n`);
  }
}
