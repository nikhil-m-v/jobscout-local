import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { audit, contrast } from '../check-theme-contrast.mjs';

test('sRGB reference extremes, symmetry and midtone transfer', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#abcdef', '#abcdef'), 1);
  assert.equal(contrast('#abcdef', '#123456'), contrast('#123456', '#abcdef'));
  assert.ok(Math.abs(contrast('#777777', '#ffffff') - 4.478) < .001);
  assert.throws(() => contrast('#fff8', '#ffffff'));
});
test('both production opaque palettes meet normal-text minimum', () => {
  const css = readFileSync(new URL('../../apps/desktop/src/styles.css', import.meta.url), 'utf8');
  const checks = audit(css);
  assert.equal(checks.length, 70);
  assert.deepEqual(checks.filter(x => !x.passed), []);
  assert.throws(() => audit(':root {}'));
  const weak = css.replace('--control-line: #85858c;', '--control-line: #dedee3;');
  assert.equal(audit(weak).filter(x => !x.passed).length, 3);
});
