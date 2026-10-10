import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const bootstrap = readFileSync(new URL('../public/appearance.js', import.meta.url), 'utf8');
function firstPaint(values = {}, dark = false, unavailable = false) {
  const document = { documentElement: { dataset: {} } };
  vm.runInNewContext(bootstrap, {
    document,
    localStorage: { getItem(key) { if (unavailable) throw Error('Storage unavailable'); return values[key] ?? null; } },
    matchMedia: () => ({ matches: dark }),
  });
  return document.documentElement.dataset;
}

test('saved accessibility reductions apply before first paint independently of the theme', () => {
  for (const theme of ['light', 'dark', 'system']) {
    assert.deepEqual(firstPaint({
      'jobscout.appearance': theme,
      'jobscout.reduce-transparency': 'true',
      'jobscout.reduce-motion': 'true',
    }, true), { theme: theme === 'system' ? 'dark' : theme, reduceTransparency: 'true', reduceMotion: 'true' });
  }
  assert.equal(firstPaint({'jobscout.reduce-motion': 'true'}).reduceTransparency, 'false');
});

test('old, malformed and unavailable preference storage preserve system-theme fallback', () => {
  for (const unavailable of [false, true]) {
    assert.deepEqual(firstPaint({
      'jobscout.appearance': 'unexpected',
      'jobscout.reduce-transparency': 'unexpected',
      'jobscout.reduce-motion': '1',
    }, true, unavailable), { theme: 'dark', reduceTransparency: 'false', reduceMotion: 'false' });
  }
  assert.equal(firstPaint().theme, 'light');
});
