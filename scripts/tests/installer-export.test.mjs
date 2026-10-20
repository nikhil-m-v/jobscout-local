import test from 'node:test';
import assert from 'node:assert/strict';
import { lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkBundleConfig, stageInstaller } from '../installer-export.mjs';

const config = { build: { frontendDist: '../dist' },
  bundle: { targets: ['nsis'], externalBin: ['binaries/jobscout-engine'], windows: { nsis: { installMode: 'currentUser' } } } };
function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'jobscout-export-test-'));
  t.after(() => {
    if (path.dirname(path.resolve(root)) !== path.resolve(os.tmpdir()) ||
        !path.basename(root).startsWith('jobscout-export-test-') || lstatSync(root).isSymbolicLink()) {
      throw new Error('Refusing cleanup outside the owned temporary fixture.');
    }
    rmSync(root, { recursive: true, force: true });
  });
  const frontend = path.join(root, 'dist');
  mkdirSync(frontend);
  writeFileSync(path.join(frontend, 'index.html'), '<html>synthetic</html>');
  writeFileSync(path.join(frontend, 'index.js'), 'console.log("synthetic");');
  const installer = path.join(root, 'JobScout_0.1.0_x64-setup.exe');
  writeFileSync(installer, Buffer.concat([Buffer.from('MZ'), Buffer.alloc(2048)]));
  return { config, frontend, installer, destination: path.join(root, 'export') };
}
test('stages only the installer, matching bytes/hash, with an unapproved release audit', t => {
  const input = fixture(t);
  const audit = stageInstaller(input);
  assert.deepEqual(readdirSync(input.destination), [audit.filename]);
  assert.deepEqual(readFileSync(path.join(input.destination, audit.filename)), readFileSync(input.installer));
  assert.match(audit.sha256, /^[a-f0-9]{64}$/);
  assert.equal(audit.frontendFiles, 2);
  assert.equal(audit.releaseApproved, false);
  assert.equal(audit.installedAcceptance, false);
  assert.throws(() => stageInstaller(input), /EEXIST/);
});
for (const name of ['source.ts', 'engine.py', 'debug.map', '.env', 'archive.zip', 'symbols.pdb']) {
  test(`refuses unexpected frontend payload ${name}`, t => {
    const input = fixture(t);
    writeFileSync(path.join(input.frontend, name), 'synthetic');
    assert.throws(() => stageInstaller(input), /frontend/);
  });
}
for (const marker of ['//# sourceMappingURL=index.js.map', '//# sourceMappingURL=data:application/json;base64,e30=', '//# sourceURL=private.ts']) {
  test(`refuses debug mapping ${marker}`, t => {
    const input = fixture(t);
    writeFileSync(path.join(input.frontend, 'index.js'), marker);
    assert.throws(() => stageInstaller(input), /mapping/);
  });
}
test('refuses missing production frontend and malformed executable', t => {
  const input = fixture(t);
  writeFileSync(input.installer, 'not an executable');
  assert.throws(() => stageInstaller(input), /executable/);
  rmSync(path.join(input.frontend, 'index.html'));
  assert.throws(() => stageInstaller(input), /frontend/);
});
test('requires review before widening bundle inputs', () => {
  checkBundleConfig(config);
  for (const change of [
    { ...config, bundle: { ...config.bundle, resources: ['private/**'] } },
    { ...config, bundle: { ...config.bundle, externalBin: ['other'] } },
    { ...config, bundle: { ...config.bundle, windows: { nsis: { installerHooks: 'custom.nsh' } } } },
    { ...config, bundle: { ...config.bundle, windows: { nsis: { template: 'custom.nsi' } } } },
  ]) assert.throws(() => checkBundleConfig(change), /allowlist/);
});
