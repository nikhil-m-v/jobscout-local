import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readSetupProgress, saveSetupProgress, setupProgressKey } from '../src/lib/setup-progress.ts';

const require = createRequire(import.meta.url);
const bundle = await rolldown({ input: fileURLToPath(new URL('../src/components/SetupGuide.tsx', import.meta.url)), external: ['react', 'react/jsx-runtime'], transform: { jsx: { runtime: 'automatic' } } });
const compiled = (await bundle.generate({ format: 'cjs' })).output[0].code;
await bundle.close();
const exports = {};
new Function('require', 'exports', compiled)(require, exports);
const health = { status: 'ready', version: '0.1.0', database: 'ready', local_ai: { provider: 'ollama', status: 'unavailable', installed_models: 0 } };
const render = (step, extra = {}) => renderToStaticMarkup(React.createElement(exports.SetupGuide, { progress: { step, remembered: true }, health, checking: false, refresh() {}, leave() {}, changeStep() {}, ...extra }));

test('only a fixed display step survives reopening; malformed or absent progress starts safely', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(readSetupProgress(storage).step, 'workspace');
  saveSetupProgress('search', storage);
  assert.deepEqual(readSetupProgress(storage), { step: 'search', remembered: true });
  assert.deepEqual([...values], [[setupProgressKey, 'search']]);
  for (const value of ['completed', '{"key":"PRIVATE"}', '', 'start\n']) {
    values.set(setupProgressKey, value);
    assert.equal(readSetupProgress(storage).step, 'workspace');
  }
});

test('blocked preference storage keeps the session step usable and discloses its limit', () => {
  const unavailable = { getItem() { throw Error('PRIVATE'); }, setItem() { throw Error('PRIVATE'); } };
  assert.deepEqual(readSetupProgress(unavailable), { step: 'workspace', remembered: false });
  const progress = saveSetupProgress('start', unavailable);
  assert.deepEqual(progress, { step: 'start', remembered: false });
  const markup = render('start', { progress });
  assert.ok(markup.includes('Progress is kept for this session'));
  assert.ok(!markup.includes('PRIVATE'));
});

test('storage guidance preserves local deletion limits and does not promise a folder picker or model', () => {
  const markup = render('workspace');
  for (const text of ['Original resume files stay where you keep them', 'not automatically encrypted', 'does not guarantee secure disk erasure', 'existing storage location', 'No AI model download is needed', 'Finish later']) assert.ok(markup.includes(text), text);
  assert.equal((markup.match(/aria-current="step"/g) ?? []).length, 1);
  assert.ok(markup.includes('Check storage'));
  assert.ok(markup.includes('Not checked yet'));
  assert.ok(markup.includes('does not test write access'));
  assert.ok(!markup.includes('Space at last check'));
});

test('online setup starts closed and does not mount key controls; continuing can skip it', () => {
  const markup = render('search');
  assert.ok(markup.includes('Set up Tavily'));
  assert.ok(markup.includes('aria-expanded="false"'));
  assert.ok(markup.includes('Continue to first use'));
  assert.ok(!markup.includes('id="tavily-key"'));
  assert.ok(markup.includes('IP address and API-account association'));
  assert.ok(markup.includes('does not send a search or authorize one'));
});

test('first-use guidance distinguishes connected storage, storage failure and offline recovery from search readiness', () => {
  assert.ok(render('start').includes('Run local check'));
  assert.ok(!render('workspace').includes('Run local check'));
  assert.ok(render('start').includes('Connected. Local storage is responding.'));
  assert.ok(render('start').includes('does not check Tavily automatically'));
  assert.ok(render('start', { health: { ...health, database: 'error' } }).includes('Local storage needs attention'));
  const offline = render('start', { health: null });
  assert.ok(offline.includes('Workspace unavailable'));
  assert.match(offline, /<button[^>]*>Go to job search<\/button>/);
  assert.match(render('start', { checking: true }), /<button[^>]*disabled=""[\s\S]*?Checking/);
});
