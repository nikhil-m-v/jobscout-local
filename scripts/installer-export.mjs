import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

export function checkBundleConfig(config) {
  if (config.build?.frontendDist !== '../dist' ||
      JSON.stringify(config.bundle?.targets) !== '["nsis"]' ||
      JSON.stringify(config.bundle?.externalBin) !== '["binaries/jobscout-engine"]' ||
      config.bundle?.resources !== undefined ||
      config.bundle?.windows?.nsis?.template !== undefined ||
      config.bundle?.windows?.nsis?.installerHooks !== undefined) {
    throw new Error('Distribution bundle inputs changed; review the installer allowlist first.');
  }
}

export function checkFrontend(directory) {
  const allowed = new Set(['.html', '.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.ico', '.webp', '.woff', '.woff2']);
  let count = 0;
  const walk = current => {
    if (lstatSync(current).isSymbolicLink()) throw new Error('Linked frontend paths are not allowed.');
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) throw new Error('Hidden or linked frontend paths are not allowed.');
      if (entry.isDirectory()) { walk(file); continue; }
      if (!entry.isFile() || !allowed.has(path.extname(entry.name).toLowerCase())) {
        throw new Error('Unexpected frontend file; source maps and development files must not ship.');
      }
      if (['.html', '.js', '.css'].includes(path.extname(entry.name).toLowerCase()) &&
          /sourceMappingURL\s*=|sourceURL\s*=/.test(readFileSync(file, 'utf8'))) {
        throw new Error('Frontend source/debug mapping references must not ship.');
      }
      count++;
    }
  };
  walk(directory);
  if (!existsSync(path.join(directory, 'index.html')) || count === 0) throw new Error('Production frontend is missing.');
  return count;
}

export function stageInstaller({ config, frontend, installer, destination }) {
  checkBundleConfig(config);
  const frontendFiles = checkFrontend(frontend);
  const filename = path.basename(installer);
  if (!/^JobScout_[0-9]+\.[0-9]+\.[0-9]+_x64-setup\.exe$/.test(filename)) {
    throw new Error('Expected a versioned JobScout x64 installer.');
  }
  const info = lstatSync(installer);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Installer must be a regular file.');
  const bytes = readFileSync(installer);
  if (bytes.length < 1024 || bytes.subarray(0, 2).toString() !== 'MZ') throw new Error('Installer executable is missing or invalid.');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  // A fresh, non-recursive directory creation fails if anything is already
  // there. Never sweep/reuse a directory that may contain other artifacts.
  mkdirSync(destination);
  const output = path.join(destination, filename);
  copyFileSync(installer, output, constants.COPYFILE_EXCL);
  const copied = readFileSync(output);
  if (copied.length !== bytes.length || createHash('sha256').update(copied).digest('hex') !== sha256) {
    throw new Error('Installer changed while staging; export is not approved.');
  }
  return { filename, bytes: copied.length, sha256, frontendFiles, sourceMaps: false,
    installedAcceptance: false, releaseApproved: false };
}
