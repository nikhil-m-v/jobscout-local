import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const bundle = await rolldown({ input: fileURLToPath(new URL('../src/components/DataControls.tsx', import.meta.url)), external: ['react', 'react/jsx-runtime'], transform: { jsx: { runtime: 'automatic' } } });
const compiled = (await bundle.generate({ format: 'cjs' })).output[0].code; await bundle.close();
const exports = {}; new Function('require', 'exports', compiled)(require, exports);
const controls = { phase: 'review', connected: true, blocked: false, review: { profile_present: true, saved_jobs: 2, jobs_with_notes: 1, review_token: 'PRIVATE_OPAQUE_TOKEN' }, error: '', notice: '', reviewData() {}, remove() {}, cancel() {} };
const render = (extra = {}, workBusy = false) => renderToStaticMarkup(React.createElement(exports.DataControls, { controls: { ...controls, ...extra }, workBusy }));
test('review shows counts, retention limits and safe cancellation without exposing opaque token', () => {
  const markup = render();
  assert.ok(markup.includes('1 saved profile')); assert.ok(markup.includes('2 saved candidates')); assert.ok(markup.includes('1 with private notes'));
  assert.ok(markup.includes('Keep my data')); assert.match(markup, /autofocus/i);
  assert.ok(!markup.includes('PRIVATE_OPAQUE_TOKEN'));
  assert.ok(markup.includes('original resume files, provider key and appearance choices are kept'));
  assert.ok(markup.includes('cannot erase backups')); assert.ok(markup.includes('even if database deletion cannot be confirmed'));
});
test('active work/disconnected state disables confirmation and ambiguous deletion offers fresh review', () => {
  assert.match(render({}, true), /<button[^>]*disabled=""[^>]*>Confirm deletion/);
  assert.match(render({connected:false}), /<button[^>]*disabled=""[^>]*>Confirm deletion/);
  assert.ok(render({phase:'unknown',review:null}).includes('Review remaining local data'));
});
