import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root, pythonExecutable } from './python.mjs';
import { checkBundleConfig } from './installer-export.mjs';

export function checkNoticeInventory(directory, engine) {
  const inventory = JSON.parse(readFileSync(path.join(directory, 'inventory.json'), 'utf8'));
  const bytes = readFileSync(path.join(directory, 'THIRD-PARTY-NOTICES.txt'));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const native = inventory.nativeArchiveVerification;
  if (!bytes.length || inventory.schemaVersion !== 1 || inventory.releaseApproved !== false ||
      !Array.isArray(inventory.components) || !inventory.components.length ||
      inventory.missingNotices?.length !== 0 || inventory.unmappedPythonInputs?.length !== 0 ||
      !Array.isArray(inventory.manualReview) || !inventory.manualReview.length ||
      inventory.noticeBundleSha256 !== sha256 ||
      native?.verified !== true || !Number.isInteger(native.identityCount) || native.identityCount < 1 ||
      !Number.isInteger(native.archiveEntryCount) || native.archiveEntryCount < native.identityCount ||
      !engine || native.engineSha256 !== createHash('sha256').update(readFileSync(engine)).digest('hex')) {
    throw new Error('Dependency notice inventory is missing, incomplete or changed.');
  }
  return { sha256, componentCount: inventory.components.length, manualReview: inventory.manualReview };
}

export function generateNotices(engine) {
  if (!engine) throw new Error('Pass the exact frozen engine to dependency notice collection.');
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error('Build through npm run desktop:build or npm run package:installer.');
  checkBundleConfig(JSON.parse(readFileSync(path.join(root, 'apps/desktop/src-tauri/tauri.conf.json'), 'utf8')));
  const parent = path.join(root, 'work/notices');
  mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(path.join(parent, 'build-'));
  function metadata(name, command, args) {
    const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', windowsHide: true,
      maxBuffer: 32 * 1024 * 1024, timeout: 300_000 });
    if (result.error || result.status !== 0) throw new Error(`Cannot collect ${name} dependency metadata: ${result.stderr ?? result.error}`);
    JSON.parse(result.stdout);
    const file = path.join(directory, `${name}.json`);
    writeFileSync(file, result.stdout);
    return file;
  }
  const npmFile = metadata('npm', process.execPath, [npm, 'ls', '--omit=dev', '--all', '--long',
    '--json', '--workspace', '@jobscout/desktop']);
  const cargoFile = metadata('cargo', 'cargo', ['metadata', '--manifest-path', 'apps/desktop/src-tauri/Cargo.toml',
    '--locked', '--format-version', '1', '--filter-platform', 'x86_64-pc-windows-msvc']);
  const result = spawnSync(pythonExecutable(), [path.join(root, 'scripts/collect_notices.py'),
    '--npm', npmFile, '--cargo', cargoFile,
    '--analysis', path.join(root, 'work/pyinstaller/jobscout-engine/Analysis-00.toc'), '--output', directory,
    '--engine', engine],
  { cwd: root, stdio: 'inherit', windowsHide: true, timeout: 300_000 });
  if (result.error || result.status !== 0) throw new Error('Dependency notice collection failed; installer build stopped.');
  checkNoticeInventory(directory, engine);
  // This build-only overlay adds one exact text file. No inventory, source,
  // directories or other generated inputs are permitted as bundle resources.
  const overlay = path.join(directory, 'tauri-notices.json');
  writeFileSync(overlay, JSON.stringify({ bundle: { resources: {
    [path.join(directory, 'THIRD-PARTY-NOTICES.txt').replaceAll('\\', '/')]: 'licenses/THIRD-PARTY-NOTICES.txt',
  } } }, null, 2));
  return { directory, overlay };
}
