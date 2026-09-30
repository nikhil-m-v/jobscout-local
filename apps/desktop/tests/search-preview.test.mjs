import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchPreviewState, validateSearchPreview } from '../src/lib/search-preview-state.ts';
import { initialCriteria } from '../src/lib/public-search-criteria.ts';
const valid = { query: 'Software engineer jobs', query_version: 1, provider: null, dispatch_available: false };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('preview needs explicit review, and criteria changes clear both', async () => {
  const store = createSearchPreviewState(async () => valid);
  store.review();
  assert.equal(store.getSnapshot().reviewed, false);
  await store.generate(initialCriteria);
  assert.equal(store.getSnapshot().preview.query, valid.query);
  assert.equal(store.getSnapshot().reviewed, false);
  store.review();
  assert.equal(store.getSnapshot().reviewed, true);
  store.invalidate();
  assert.deepEqual(store.getSnapshot(), { preview: null, busy: false, reviewed: false, error: '' });
});

test('cancel or edit invalidates late native success even if transport ignores abort', async () => {
  const pending = deferred(); let signal;
  const store = createSearchPreviewState(async (_, suppliedSignal) => { signal = suppliedSignal; return pending.promise; });
  const run = store.generate(initialCriteria);
  assert.equal(store.getSnapshot().busy, true);
  store.invalidate();
  assert.equal(signal.aborted, true);
  pending.resolve(valid);
  await run;
  assert.equal(store.getSnapshot().preview, null);
  assert.equal(store.getSnapshot().busy, false);
});

test('newest request wins across overlapping success and failure', async () => {
  const old = deferred(), newest = deferred(); let calls = 0;
  const store = createSearchPreviewState(() => ++calls === 1 ? old.promise : newest.promise);
  const first = store.generate(initialCriteria);
  const second = store.generate({ ...initialCriteria, role: 'data-analyst' });
  newest.resolve({ ...valid, query: 'Data analyst jobs' });
  await second;
  store.review();
  old.reject(new Error('SYNTHETIC_PRIVATE_DIAGNOSTIC'));
  await first;
  assert.equal(store.getSnapshot().preview.query, 'Data analyst jobs');
  assert.equal(store.getSnapshot().reviewed, true);
  assert.equal(store.getSnapshot().error, '');
});

test('errors are fixed, leave no preview and allow retry', async () => {
  let fail = true;
  const store = createSearchPreviewState(async () => { if (fail) throw new Error('SYNTHETIC_PRIVATE'); return valid; });
  await store.generate(initialCriteria);
  assert.equal(store.getSnapshot().preview, null);
  assert.equal(store.getSnapshot().busy, false);
  assert.ok(!store.getSnapshot().error.includes('SYNTHETIC_PRIVATE'));
  fail = false;
  await store.generate(initialCriteria);
  assert.equal(store.getSnapshot().error, '');
  assert.equal(store.getSnapshot().preview.query, valid.query);
});

test('disconnect/unmount invalidation ignores late failures', async () => {
  const pending = deferred();
  const store = createSearchPreviewState(() => pending.promise);
  const run = store.generate(initialCriteria);
  store.invalidate();
  pending.reject(new Error('disconnected'));
  await run;
  assert.equal(store.getSnapshot().error, '');
});

test('unsupported versions, dispatch, provider and malformed query fail closed', () => {
  for (const payload of [null, {}, { ...valid, query_version: 2 }, { ...valid, dispatch_available: true }, { ...valid, provider: 'unexpected' }, { ...valid, query: '' }, { ...valid, query: 'x'.repeat(1025) }, { ...valid, query: 'jobs\nprivate' }, { ...valid, extra: 'SYNTHETIC_PRIVATE' }]) assert.throws(() => validateSearchPreview(payload));
  assert.ok(Object.isFrozen(validateSearchPreview(valid)));
});
