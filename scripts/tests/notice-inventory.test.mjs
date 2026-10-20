import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkNoticeInventory } from '../generate-notices.mjs';

test('notice inventory binds exact bytes and rejects incomplete or approved-release claims', t => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'jobscout-notice-audit-'));
  t.after(() => {
    if (path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) ||
        !path.basename(directory).startsWith('jobscout-notice-audit-') || lstatSync(directory).isSymbolicLink()) {
      throw new Error('Refusing cleanup outside the owned temporary fixture.');
    }
    rmSync(directory, { recursive: true, force: true });
  });
  const bytes = Buffer.from('Synthetic notice');
  writeFileSync(path.join(directory, 'THIRD-PARTY-NOTICES.txt'), bytes);
  const inventory = { schemaVersion: 1, releaseApproved: false, components: [{ name: 'synthetic' }],
    missingNotices: [], unmappedPythonInputs: [], manualReview: ['Review remains open'],
    noticeBundleSha256: createHash('sha256').update(bytes).digest('hex') };
  const save = value => writeFileSync(path.join(directory, 'inventory.json'), JSON.stringify(value));
  save(inventory);
  assert.equal(checkNoticeInventory(directory).componentCount, 1);
  for (const change of [{ missingNotices: ['missing'] }, { unmappedPythonInputs: ['unknown'] },
    { releaseApproved: true }, { noticeBundleSha256: 'wrong' }, { components: [] }, { manualReview: [] }]) {
    save({ ...inventory, ...change });
    assert.throws(() => checkNoticeInventory(directory), /incomplete or changed/);
  }
  save(inventory);
  writeFileSync(path.join(directory, 'THIRD-PARTY-NOTICES.txt'), 'Changed notice');
  assert.throws(() => checkNoticeInventory(directory), /incomplete or changed/);
});
