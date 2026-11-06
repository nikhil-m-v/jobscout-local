import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const bundle = await rolldown({ input: fileURLToPath(new URL('../src/components/SavedJobs.tsx', import.meta.url)), external: ['react', 'react/jsx-runtime'], transform: { jsx: { runtime: 'automatic' } } });
const compiled = (await bundle.generate({ format: 'cjs' })).output[0].code;
await bundle.close();
const exports = {};
new Function('require', 'exports', compiled)(require, exports);
const job = { title: '<script>steal()</script>', snippet: 'Must work with ET time zone overlap. <img src="https://tracker.example.com">', url: 'https://jobs.lever.co/example/00000000-0000-4000-8000-000000000001', source_index: 1, provider: 'tavily', id: '00000000-0000-4000-8000-000000000001', retrieved_at: '2026-10-12T03:00:00Z', saved_at: '2026-10-12T03:01:00Z' };
Object.assign(job, { stage: 'applied', notes: '<script>PRIVATE_SYNTHETIC_NOTE</script>', revision: 1 });
const saved = { jobs: [job], ready: true, busy: false, connected: true, error: '', notice: '', drafts: {}, reload() {}, remove() {}, update() {}, setDraft() {}, clearDraft() {} };
function render(extra = {}) { return renderToStaticMarkup(React.createElement(exports.SavedJobs, { saved: { ...saved, ...extra } })); }

test('saved list items are named by their own heading without repeating notes or card contents', () => {
  const other = { ...job, id: '00000000-0000-4000-8000-000000000002', title: 'Second synthetic job' };
  const markup = render({ jobs: [job, other] });
  for (const entry of [job, other]) {
    const titleId = `saved-title-${entry.id}`;
    assert.ok(markup.includes(`<li aria-labelledby="${titleId}"><article><h2 id="${titleId}">`));
    assert.equal(markup.split(`id="${titleId}"`).length - 1, 1);
  }
  // Naming the item must preserve the separately readable details and editor labels.
  assert.ok(markup.includes('&lt;script&gt;PRIVATE_SYNTHETIC_NOTE&lt;/script&gt;'));
  const editing = render({ drafts: { [job.id]: { stage: 'applied', notes: job.notes, revision: 1 } } });
  assert.ok(editing.includes(`aria-labelledby="saved-title-${job.id}"`));
  assert.ok(editing.includes(`for="notes-${job.id}"`));
});
test('saved snapshots keep source, timestamps, uncertainty and safely escaped content', () => {
  const markup = render();
  assert.ok(markup.includes('&lt;script&gt;steal()&lt;/script&gt;'));
  assert.ok(markup.includes('&lt;img'));
  assert.ok(!/<(script|img|iframe|a)\b/.test(markup));
  assert.ok(markup.includes('Requested source: Lever'));
  assert.ok(markup.includes('dateTime="2026-10-12T03:00:00Z"'));
  assert.ok(markup.includes('dateTime="2026-10-12T03:01:00Z"'));
  assert.ok(markup.includes('listings can change or close'));
  assert.ok(markup.includes('Work requirements to review'));
  assert.ok(markup.includes('Remove saved candidate'));
});
test('unconfirmed storage disables removal, retains records and offers reload recovery', () => {
  const markup = render({ ready: false, error: 'Saving could not be confirmed.' });
  assert.ok(markup.includes('(last loaded view)'));
  assert.match(markup, /<button[^>]*disabled=""[^>]*aria-label="Remove saved candidate/);
  assert.ok(markup.includes('Reload saved jobs'));
  assert.ok(markup.includes(job.url));
  assert.ok(render({ jobs: [] }).includes('Keep a candidate with Save candidate'));
});

test('tracking safely renders private notes and stale drafts require explicit recovery', () => {
  const markup = render();
  assert.ok(markup.includes('Stage: <strong>Applied</strong>'));
  assert.ok(markup.includes('&lt;script&gt;PRIVATE_SYNTHETIC_NOTE&lt;/script&gt;'));
  assert.ok(markup.includes('does not apply, contact an employer'));
  const editing = render({ drafts: { [job.id]: { stage: 'saved', notes: '<img src="https://tracker.example.com">', revision: 0 } } });
  assert.ok(editing.includes('Discard draft and use latest'));
  assert.match(editing, /<button[^>]*type="submit"[^>]*disabled=""/);
  assert.ok(editing.includes('maxLength="4000"'));
  assert.ok(!/<(script|img|iframe)\b/.test(editing));
});
