import test from 'node:test';
import assert from 'node:assert/strict';
import { createDataControlsState, validateDataReview } from '../src/lib/data-controls-state.ts';
import { dataRequest } from '../src/lib/data-controls.ts';

const review = { profile_present: true, saved_jobs: 2, jobs_with_notes: 1, review_token: 'a'.repeat(64) };

test('count-only review is strict and cancellation has no deletion/session side effect', async () => {
  for (const change of [{ notes: 'PRIVATE' }, { saved_jobs: 201 }, { jobs_with_notes: 3 }, { profile_present: 1 }, { review_token: 'bad' }]) assert.throws(() => validateDataReview({ ...review, ...change }));
  let cleared = 0; const calls = [];
  const store = createDataControlsState(async action => { calls.push(action); return { review }; }, () => cleared++);
  store.connect(true); await store.review();
  assert.equal(store.getSnapshot().blocked, false);
  store.cancel(); assert.equal(cleared, 0);
  assert.deepEqual(calls, ['review']); assert.equal(store.getSnapshot().review, null);
  assert.equal(await store.remove(), false);
});

test('confirmation clears current session once and waits for disk acknowledgement', async () => {
  let cleared = 0, finish;
  const store = createDataControlsState(async action => action === 'review' ? { review } : new Promise(resolve => { finish = () => resolve({ deleted: true }); }), () => cleared++);
  store.connect(true); await store.review();
  const removal = store.remove();
  assert.equal(cleared, 1); assert.equal(store.getSnapshot().blocked, true);
  assert.equal(store.getSnapshot().phase, 'deleting'); assert.equal(store.getSnapshot().notice, '');
  assert.equal(await store.remove(), false);
  finish(); assert.equal(await removal, true);
  assert.equal(store.getSnapshot().blocked, false); assert.equal(store.getSnapshot().phase, 'done');
});

test('uncertain committed deletion requires a fresh read and never auto-retries on reconnect', async () => {
  let deleted = false, writes = 0, cleared = 0;
  const store = createDataControlsState(async action => {
    if (action === 'review') return { review: deleted ? { ...review, profile_present: false, saved_jobs: 0, jobs_with_notes: 0 } : review };
    writes++; deleted = true; throw new Error('PRIVATE_DIAGNOSTIC');
  }, () => cleared++);
  store.connect(true); await store.review(); assert.equal(await store.remove(), false);
  assert.equal(store.getSnapshot().phase, 'unknown'); assert.equal(store.getSnapshot().blocked, true);
  assert.ok(!store.getSnapshot().error.includes('PRIVATE_DIAGNOSTIC'));
  store.connect(false); store.connect(true);
  assert.equal(writes, 1); assert.equal(await store.remove(), false);
  await store.review(); assert.equal(store.getSnapshot().review.saved_jobs, 0);
  assert.equal(store.getSnapshot().blocked, false); assert.equal(cleared, 1);
});

test('changed review/storage errors retain uncertainty and recover without exposing notes', async () => {
  for (const response of [{ error: 'data_review_changed' }, { error: 'data_busy' }, { deleted: true, notes: 'PRIVATE' }]) {
    const store = createDataControlsState(async action => action === 'review' ? { review } : response, () => {});
    store.connect(true); await store.review(); assert.equal(await store.remove(), false);
    assert.equal(store.getSnapshot().blocked, true); assert.equal(store.getSnapshot().review, null);
    assert.ok(!store.getSnapshot().error.includes('PRIVATE'));
  }
});

test('disconnect invalidates old count review; reconnection requires explicit fresh review', async () => {
  let finish;
  const store = createDataControlsState(() => new Promise(resolve => { finish = () => resolve({ review }); }), () => {});
  store.connect(true); const reading = store.review();
  store.connect(false); store.connect(true); finish();
  assert.equal(await reading, false); assert.equal(store.getSnapshot().review, null);
  assert.equal(await store.remove(), false);
});

test('late delete acknowledgement after reconnect stays locked until a fresh read', async () => {
  let finish;
  const store = createDataControlsState(async action => action === 'review' ? { review } : new Promise(resolve => { finish = () => resolve({ deleted:true }); }), () => {});
  store.connect(true); await store.review(); const writing = store.remove();
  store.connect(false); store.connect(true); finish();
  assert.equal(await writing, false); assert.equal(store.getSnapshot().blocked, true);
  assert.equal(store.getSnapshot().notice, '');
  await store.review(); assert.equal(store.getSnapshot().blocked, false);
});

test('private data controls use only fixed local route and opaque review token', async () => {
  globalThis.window = { isTauri: false };
  const original = globalThis.fetch, calls = [];
  try {
    globalThis.fetch = async (url, options) => { calls.push({ url, options }); return { json: async () => ({}) }; };
    await dataRequest('review'); await dataRequest('delete', review.review_token);
    assert.deepEqual(calls.map(call => [call.url, call.options.method]), [['/engine/data', 'GET'], ['/engine/data', 'DELETE']]);
    assert.deepEqual(JSON.parse(calls[1].options.body), { review_token: review.review_token, confirmed: true });
    for (const call of calls) { assert.equal(call.options.cache, 'no-store'); assert.equal(call.options.credentials, 'omit'); assert.equal(call.options.redirect, 'error'); assert.equal(call.options.headers['X-JobScout-Import'], '1'); }
  } finally { globalThis.fetch = original; }
});
