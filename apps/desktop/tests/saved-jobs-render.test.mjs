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
const saved = { jobs: [job], ready: true, busy: false, connected: true, error: '', notice: '', reload() {}, remove() {} };
function render(extra = {}) { return renderToStaticMarkup(React.createElement(exports.SavedJobs, { saved: { ...saved, ...extra } })); }
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
