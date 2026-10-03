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
function render(step, optionsAvailable, resultsAvailable, result = null, extra = {}) {
  return renderToStaticMarkup(React.createElement(exports.DiscoveryJourney, {
    step, optionsAvailable, resultsAvailable, navigate: noop, continueWithoutResume: noop,
    resume: { selection: null, document: null, busy: false, text: '', notice: '', error: '' },
    saved: { busy: false, connected: true, ready: true, profile: null, notice: '', error: '' },
    criteria: initialCriteria, onChange: noop,
    searchPreview: { preview: { provider: 'tavily', query: 'Software engineer jobs', dispatch_available: true }, busy: false, connected: true, reviewed: false, error: '' },
    discovery: { busy: false, result, error: '', invalidate: noop },
    ...extra,
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
test('resume path opens the generated query and category summary without a mandatory preferences form', () => {
  const markup = render('options', true, false, null, { assisted: true, assistance: { busy: false, error: '', result: { criteria: initialCriteria, roles: ['software-engineer'], skills: ['python', 'sql'], matches: [] } } });
  assert.ok(markup.includes('Review query'));
  assert.ok(markup.includes('Suggested from your reviewed resume'));
  assert.ok(markup.includes('Python, SQL'));
  assert.ok(markup.includes('Engine-generated query'));
  assert.ok(!markup.includes('What jobs are you looking for?'));
  assert.ok(markup.includes('Edit public categories'));
});
test('unsupported resume roles fall back visibly to controlled category selection', () => {
  const markup = render('options', true, false, null, { assisted: true, assistance: { busy: false, error: '', result: { criteria: null, roles: [], skills: ['python'], matches: [] } } });
  assert.ok(markup.includes('No supported role found'));
  assert.ok(markup.includes('Correct your public search categories'));
  assert.ok(markup.includes('Choose a supported role'));
  assert.match(markup, /<button class="button primary" type="submit" disabled="">Find jobs/);
  assert.ok(!markup.includes('id="public-query"'));
});
test('local analysis progress and failure do not expose a sendable stale query', () => {
  for (const assistance of [{ busy: true, result: null, error: '' }, { busy: false, result: null, error: 'Local analysis failed.' }]) {
    const markup = render('options', true, false, null, { assisted: true, assistance });
    assert.ok(markup.includes('Use manual preferences instead'));
    assert.ok(!markup.includes('id="public-query"'));
  }
});
