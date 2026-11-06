import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRetainedNoticeInputs } from '../retained-notice-inputs.mjs';
const npm = { dependencies: { ui: { version: '1.0.0', license: 'MIT' } } };
const cargo = { packages: [{ name: 'native', version: '1.0.0', license: 'MIT' }], resolve: { nodes: [{ id: 'native', features: ['default'] }] } };
test('same dependency metadata permits unrelated target-directory changes', () => {
  assertRetainedNoticeInputs(npm, structuredClone(npm), cargo, { ...structuredClone(cargo), target_directory: 'other-build' });
});
test('changed JavaScript/native identity, license or features rejects reuse', () => {
  const changedNpm = structuredClone(npm); changedNpm.dependencies.ui.version = '2.0.0';
  assert.throws(() => assertRetainedNoticeInputs(npm, changedNpm, cargo, cargo));
  for (const field of ['version', 'license']) {
    const changed = structuredClone(cargo); changed.packages[0][field] = 'changed';
    assert.throws(() => assertRetainedNoticeInputs(npm, npm, cargo, changed));
  }
  const changed = structuredClone(cargo); changed.resolve.nodes[0].features = ['new-feature'];
  assert.throws(() => assertRetainedNoticeInputs(npm, npm, cargo, changed));
});
test('missing dependency evidence fails closed', () => {
  assert.throws(() => assertRetainedNoticeInputs({}, npm, cargo, cargo));
  assert.throws(() => assertRetainedNoticeInputs(npm, npm, cargo, {}));
});
