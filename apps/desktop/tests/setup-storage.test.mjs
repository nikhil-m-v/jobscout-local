import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStorageSnapshot, describeSpace, createStorageCheck } from '../src/lib/setup-storage.ts';
import { readSetupStorage } from '../src/lib/setup-storage-request.ts';

test('storage snapshot accepts unknown and full drive without conflating them', () => {
  for (const free_bytes of [null, 0, 123456789, Number.MAX_SAFE_INTEGER]) {
    const value = { folder: 'Synthetic folder', free_bytes };
    assert.deepEqual(validateStorageSnapshot(value), value);
  }
  assert.deepEqual(validateStorageSnapshot({ folder: null, free_bytes: null }), { folder: null, free_bytes: null });
  assert.match(describeSpace(null), /could not be checked/);
  assert.match(describeSpace(0), /No free space/);
  assert.match(describeSpace(1), /Less than 1 MiB/);
  assert.match(describeSpace(1024 ** 2), /1.0 MiB/);
  assert.match(describeSpace(1024 ** 3), /1.0 GiB/);
});

test('storage bridge has a fixed path, no body, no cache, and an abortable request', async () => {
  globalThis.window = { isTauri: false };
  const original = globalThis.fetch;
  const controller = new AbortController();
  let captured;
  try {
    globalThis.fetch = async (url, options) => { captured = { url, options }; return { ok: true, json: async () => ({ folder: null, free_bytes: null }) }; };
    await readSetupStorage(controller.signal);
    assert.equal(captured.url, '/engine/setup/storage');
    assert.equal(captured.options.body, undefined);
    assert.equal(captured.options.headers['X-JobScout-Import'], '1');
    for (const [key, value] of Object.entries({ cache: 'no-store', credentials: 'omit', redirect: 'error' })) assert.equal(captured.options[key], value);
    controller.abort();
    assert.equal(captured.options.signal.aborted, true);
    globalThis.fetch = async () => ({ ok: false, json: async () => { throw Error('must not read error body'); } });
    await assert.rejects(readSetupStorage(new AbortController().signal), { message: 'Storage check unavailable.' });
  } finally { globalThis.fetch = original; }
});

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
test('checks are explicit, suppress duplicate clicks, clear stale snapshots and permit retry', async () => {
  let next = deferred(), calls = 0;
  const state = createStorageCheck(() => { calls++; return next.promise; });
  assert.equal(calls, 0);
  const first = state.check();
  await state.check();
  assert.equal(calls, 1);
  assert.deepEqual(state.getSnapshot(), { status: 'checking', snapshot: null });
  next.resolve({ folder: 'Synthetic', free_bytes: 10 });
  await first;
  assert.equal(state.getSnapshot().status, 'done');
  next = deferred();
  const retry = state.check();
  assert.equal(state.getSnapshot().snapshot, null);
  next.reject(Error('PRIVATE diagnostics'));
  await retry;
  assert.deepEqual(state.getSnapshot(), { status: 'error', snapshot: null });
  next = deferred();
  const recovered = state.check();
  next.resolve({ folder: null, free_bytes: 0 });
  await recovered;
  assert.equal(state.getSnapshot().status, 'done');
});

test('leaving aborts the browser request and ignores late native success or failure', async () => {
  for (const fail of [false, true]) {
    const pending = deferred(); let signal;
    const state = createStorageCheck(value => { signal = value; return pending.promise; });
    const run = state.check();
    state.invalidate();
    assert.equal(signal.aborted, true);
    if (fail) pending.reject(Error('PRIVATE'));
    else pending.resolve({ folder: 'OLD', free_bytes: 10 });
    await run;
    assert.deepEqual(state.getSnapshot(), { status: 'idle', snapshot: null });
  }
});

test('rejects extra private fields, malformed paths and invalid numeric values without echoing them', () => {
  const good = { folder: 'Synthetic folder', free_bytes: 20 };
  for (const value of [null, [], {}, { ...good, profile: 'PRIVATE' }, { ...good, folder: '' },
    { ...good, folder: 'PRIVATE\n' }, { ...good, folder: 'x'.repeat(32768) }, { ...good, folder: 1 },
    ...[-1, 0.1, Infinity, NaN, '20', true, Number.MAX_SAFE_INTEGER + 1].map(free_bytes => ({ ...good, free_bytes }))]) {
    assert.throws(() => validateStorageSnapshot(value), { message: 'Storage check unavailable.' });
  }
});
