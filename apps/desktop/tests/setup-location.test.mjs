import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createLocationChange, validateLocation, locationMessages } from '../src/lib/setup-location.ts';
import { locationRequest } from '../src/lib/setup-location-request.ts';

const current = { folder: '/synthetic/original', retained_folders: [] };
const review = { ...current, destination: '/synthetic/new', database_bytes: 24576, free_bytes: 123456789, review_token: 'a'.repeat(64) };
const done = { folder: review.destination, retained_folders: [current.folder] };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

test('location responses accept only bounded paths, counts and exact fields', () => {
  assert.deepEqual(validateLocation(current), current);
  assert.deepEqual(validateLocation(review, true), review);
  for (const value of [null, [], {}, { ...current, extra: 'PRIVATE' }, { ...current, folder: '\nPRIVATE' },
    { ...current, folder: 'x'.repeat(2049) }, { ...current, retained_folders: Array(13).fill('/a') }, { ...current, retained_folders: [1] }]) assert.throws(() => validateLocation(value));
  for (const value of [{ ...review, review_token: 'z'.repeat(64) }, { ...review, free_bytes: Infinity }, { ...review, database_bytes: -1 }, { ...review, destination: '' }]) assert.throws(() => validateLocation(value, true));
  for (const [error, message] of Object.entries(locationMessages)) assert.throws(() => validateLocation({ error }), { message });
  assert.throws(() => validateLocation({ error: 'PRIVATE' }), { message: locationMessages.location_unavailable });
});

test('transport sends only local fixed action and reviewed token with strict browser options', async () => {
  const original = globalThis.fetch, controller = new AbortController(); let captured;
  try {
    for (const [action, body, response] of [['status', undefined, current], ['review', { destination: review.destination }, review], ['apply', { confirmed: true, review_token: review.review_token }, done]]) {
      globalThis.fetch = async (url, options) => { captured = { url, options }; return { json: async () => response }; };
      assert.deepEqual(await locationRequest(action, body, controller.signal), response);
      assert.equal(captured.url, '/engine/setup/location' + (action === 'status' ? '' : '/' + action));
      assert.equal(captured.options.method, action === 'status' ? 'GET' : 'POST');
      assert.equal(captured.options.body, body ? JSON.stringify(body) : undefined);
      for (const [key, value] of Object.entries({ credentials: 'omit', redirect: 'error', cache: 'no-store' })) assert.equal(captured.options[key], value);
      assert.equal(captured.options.headers['X-JobScout-Import'], '1');
    }
    controller.abort(); assert.ok(captured.options.signal.aborted);
  } finally { globalThis.fetch = original; }
});

test('a fresh explicit review is required; edits discard confirmation; copy sends no path or records', async () => {
  const calls = [];
  const store = createLocationChange(async (action, body) => { calls.push([action, body]); return action === 'status' ? current : action === 'review' ? review : done; });
  await store.apply(); await store.review(); assert.equal(calls.length, 0);
  await store.status(); store.edit(review.destination); await store.review();
  assert.equal(store.getSnapshot().phase, 'review');
  store.edit('/synthetic/other'); await store.apply(); assert.equal(calls.length, 2);
  store.edit(review.destination); await store.review(); await store.apply(); await store.apply();
  assert.equal(store.getSnapshot().phase, 'done');
  assert.deepEqual(calls.at(-1), ['apply', { confirmed: true, review_token: review.review_token }]);
  assert.equal(calls.filter(([action]) => action === 'apply').length, 1);
});

test('uncertain apply clears current data, refuses retries and requires status recovery', async () => {
  let applying = 0;
  const store = createLocationChange(async action => {
    if (action === 'apply') { applying++; throw Error('PRIVATE filesystem details'); }
    return action === 'review' ? review : applying ? done : current;
  });
  await store.status(); store.edit(review.destination); await store.review(); await store.apply();
  assert.equal(store.getSnapshot().phase, 'unknown');
  assert.equal(store.getSnapshot().current, null);
  assert.equal(store.getSnapshot().destination, review.destination);
  assert.equal(store.getSnapshot().error, locationMessages.location_unavailable);
  await store.apply(); await store.review(); assert.equal(applying, 1);
  await store.status(); assert.deepEqual(store.getSnapshot().current, done);
  assert.equal(store.getSnapshot().phase, 'edit'); assert.equal(store.getSnapshot().review, null);
});

test('navigation and stop discard late completions, duplicate clicks never start extra copies', async () => {
  for (const fails of [false, true]) {
    const pending = deferred(); let signal, copies = 0;
    const store = createLocationChange(async (action, body, givenSignal) => {
      if (action === 'apply') { copies++; signal = givenSignal; return pending.promise; }
      return action === 'status' ? current : review;
    });
    await store.status(); store.edit(review.destination); await store.review();
    const copying = store.apply(); await store.apply(); await store.status(); store.edit('changed');
    assert.equal(copies, 1); assert.equal(store.getSnapshot().destination, review.destination);
    store.invalidate(); assert.ok(signal.aborted); await store.status();
    if (fails) pending.reject(Error('PRIVATE')); else pending.resolve(done);
    await copying; assert.equal(store.getSnapshot().phase, 'edit'); assert.deepEqual(store.getSnapshot().current, current);
  }
});

const require = createRequire(import.meta.url);
const bundle = await rolldown({ input: fileURLToPath(new URL('../src/components/SetupLocation.tsx', import.meta.url)), external: ['react', 'react/jsx-runtime'], transform: { jsx: { runtime: 'automatic' } } });
const compiled = (await bundle.generate({ format: 'cjs' })).output[0].code;
await bundle.close();
const exports = {};
new Function('require', 'exports', compiled)(require, exports);

test('folder UI is explicit and safely renders recovery locations and copy sizes', () => {
  const idle = renderToStaticMarkup(React.createElement(exports.SetupLocation));
  assert.ok(idle.includes('Change personal-data folder'));
  assert.ok(idle.includes('Nothing is sent online'));
  assert.ok(!idle.includes('Copy and use this folder'));
  const markup = renderToStaticMarkup(React.createElement(exports.LocationDetails, { current: { ...done, retained_folders: ['<script>PRIVATE</script>'] }, review }));
  for (const text of ['Active folder', 'New folder', 'Database to copy', 'Previous folders retained', 'deletion affect only the active folder', '&lt;script&gt;']) assert.ok(markup.includes(text), text);
  assert.ok(!markup.includes('<script>'));
});
