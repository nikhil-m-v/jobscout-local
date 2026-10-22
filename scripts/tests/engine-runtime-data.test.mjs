import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sslRuntimeDataArgs } from '../engine-runtime-data.mjs';

test('stock Python adds no environment-specific trust data', t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'jobscout-ssl-'));
  t.after(() => rmSync(directory, { recursive: true }));
  const ssl = path.join(directory, 'ssl.py');
  writeFileSync(ssl, '# stock SSL module');
  assert.deepEqual(sslRuntimeDataArgs(ssl), []);
});

test('a patched runtime carries its required policy file and fails if missing or empty', t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'jobscout-ssl-'));
  t.after(() => rmSync(directory, { recursive: true }));
  const ssl = path.join(directory, 'ssl.py');
  const policy = path.join(directory, 'codex-rejected-cas.pem');
  writeFileSync(ssl, "load_verify_locations(cafile='codex-rejected-cas.pem')");
  assert.throws(() => sslRuntimeDataArgs(ssl), /requires missing runtime/);
  writeFileSync(policy, '');
  assert.throws(() => sslRuntimeDataArgs(ssl), /requires missing runtime/);
  writeFileSync(policy, 'SYNTHETIC CERTIFICATE POLICY FIXTURE');
  assert.deepEqual(sslRuntimeDataArgs(ssl), ['--add-data', `${policy}:.`]);
});
