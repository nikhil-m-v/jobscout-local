import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { initialCriteria } from '../src/lib/public-search-criteria.ts';

const require = createRequire(import.meta.url);
const bundle = await rolldown({ input: fileURLToPath(new URL('../src/components/DiscoveryJourney.tsx', import.meta.url)), external: ['react', 'react/jsx-runtime'], transform: { jsx: { runtime: 'automatic' } } });
const compiled = (await bundle.generate({ format: 'cjs' })).output[0].code;
await bundle.close();
const exports = {};
new Function('require', 'exports', compiled)(require, exports);
const noop = () => {};
function render(step, optionsAvailable, resultsAvailable, result = null) {
  return renderToStaticMarkup(React.createElement(exports.DiscoveryJourney, {
    step, optionsAvailable, resultsAvailable, navigate: noop, continueWithoutResume: noop,
    resume: { selection: null, document: null, busy: false, text: '', notice: '', error: '' },
    saved: { busy: false, connected: true, ready: true, profile: null, notice: '', error: '' },
    criteria: initialCriteria, onChange: noop,
    searchPreview: { preview: { provider: 'tavily', query: 'Software engineer jobs', dispatch_available: true }, busy: false, connected: true, reviewed: false, error: '' },
    discovery: { busy: false, result, error: '', invalidate: noop },
  }));
}
function stepButton(markup, label) {
  const navigation = markup.slice(markup.indexOf('<nav'), markup.indexOf('</nav>'));
  return navigation.match(/<button\b[\s\S]*?<\/button>/g).find(button => button.includes(`<span>${label}</span>`));
}
test('first page has an active Resume step, locked future pages and an explicit skip', () => {
  const markup = render('resume', false, false);
  assert.match(stepButton(markup, 'Resume'), /aria-current="step"/);
  assert.match(stepButton(markup, 'Job options'), /disabled=""/);
  assert.match(stepButton(markup, 'Results'), /disabled=""/);
  assert.ok(markup.includes('Search without a resume'));
  assert.ok(!markup.includes('What jobs are you looking for?'));
});
test('job options permits returning to Resume while Results stays locked', () => {
  const markup = render('options', true, false);
  assert.doesNotMatch(stepButton(markup, 'Resume'), /disabled/);
  assert.match(stepButton(markup, 'Job options'), /aria-current="step"/);
  assert.match(stepButton(markup, 'Results'), /disabled=""/);
  assert.ok(markup.includes('What jobs are you looking for?'));
  assert.ok(!markup.includes('Choose a resume'));
});
test('completed search unlocks all steps and displays only the result page', () => {
  const markup = render('results', true, true, { query: 'Software engineer jobs', provider: 'tavily', retrieved_at: '2026-10-04T03:00:00Z', duplicates_removed: 0, candidates: [] });
  for (const label of ['Resume', 'Job options', 'Results']) assert.doesNotMatch(stepButton(markup, label), /disabled/);
  assert.ok(markup.includes('No candidates returned'));
  assert.ok(markup.includes('Software engineer jobs'));
  assert.ok(!markup.includes('What jobs are you looking for?'));
});
test('cleared results show recovery guidance rather than previous candidates', () => {
  const markup = render('results', true, true);
  assert.ok(markup.includes('Your previous results were cleared'));
  assert.ok(!markup.includes('Search candidates'));
});
