import test from 'node:test';
import assert from 'node:assert/strict';
import { createProviderConnectionState, validateProviderConnection, ProviderConnectionFailure, providerConnectionError } from '../src/lib/provider-connection-state.ts';
import { requestProviderConnection } from '../src/lib/provider-connection.ts';

globalThis.window = { isTauri: false };
const valid = { provider: 'tavily', connection_verified: true, dispatch_available: false };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('connection bridge sends only explicit confirmation to the fixed local route', async () => {
  const original = globalThis.fetch; let captured;
  try {
    globalThis.fetch = async (url, options) => { captured = { url, options }; return { json: async () => valid }; };
    assert.deepEqual(await requestProviderConnection(new AbortController().signal), valid);
    assert.equal(captured.url, '/engine/providers/tavily/check');
    assert.equal(captured.options.method, 'POST');
    assert.deepEqual(JSON.parse(captured.options.body), { confirmed: true });
    assert.equal(captured.options.headers['X-JobScout-Import'], '1');
    assert.equal(captured.options.redirect, 'error');
    assert.equal(captured.options.credentials, 'omit');
    assert.equal(captured.options.cache, 'no-store');
  } finally { globalThis.fetch = original; }
});

test('unsupported connection results cannot expose account data or enable search', () => {
  for (const payload of [null, {}, { ...valid, provider: 'other' }, { ...valid, connection_verified: false },
    { ...valid, dispatch_available: true }, { ...valid, account: 'SYNTHETIC_PRIVATE' }, { ...valid, key: 'SYNTHETIC_PRIVATE' }]) assert.throws(() => validateProviderConnection(payload));
  assert.ok(Object.isFrozen(validateProviderConnection(valid)));
});

test('provider and transport diagnostics are mapped to fixed recovery messages', async () => {
  const original = globalThis.fetch;
  try {
    for (const code of ['provider_invalid_key', 'provider_rate_limited', 'provider_quota_exhausted', 'provider_unavailable',
      'provider_timeout', 'provider_invalid_response', 'provider_key_missing', 'secret_store_unavailable', 'provider_check_busy', 'SYNTHETIC_PRIVATE']) {
      globalThis.fetch = async () => ({ json: async () => ({ error: code, account: 'SYNTHETIC_PRIVATE' }) });
      await assert.rejects(requestProviderConnection(new AbortController().signal), error => error.message === providerConnectionError(code) && !error.message.includes('SYNTHETIC_PRIVATE'));
    }
    globalThis.fetch = async () => { throw new Error('SYNTHETIC_PRIVATE'); };
    await assert.rejects(requestProviderConnection(new AbortController().signal), /may have reached Tavily/);
  } finally { globalThis.fetch = original; }
});

test('stopping waiting, disconnect or unmount ignores late native success and failure', async () => {
  for (const fails of [false, true]) {
    const pending = deferred(); let signal;
    const store = createProviderConnectionState(async supplied => { signal = supplied; return pending.promise; });
    const run = store.check();
    assert.equal(store.getSnapshot().busy, true);
    store.invalidate();
    assert.equal(signal.aborted, true);
    if (fails) pending.reject(new Error('SYNTHETIC_PRIVATE')); else pending.resolve(valid);
    await run;
    assert.deepEqual(store.getSnapshot(), { busy: false, verified: false, error: '' });
  }
});

test('overlap cannot send duplicate checks and a new generation wins', async () => {
  const first = deferred(), second = deferred(); let calls = 0;
  const store = createProviderConnectionState(() => ++calls === 1 ? first.promise : second.promise);
  const oldRun = store.check();
  await store.check(); assert.equal(calls, 1);
  store.invalidate(); const newRun = store.check();
  second.resolve(valid); await newRun;
  first.reject(new Error('SYNTHETIC_PRIVATE')); await oldRun;
  assert.equal(store.getSnapshot().verified, true);
  assert.equal(store.getSnapshot().error, '');
  store.invalidate(); assert.equal(store.getSnapshot().verified, false);
});

test('failure can retry explicitly but never echoes unexpected exceptions', async () => {
  let calls = 0;
  const store = createProviderConnectionState(async () => {
    calls++;
    if (calls === 1) throw new Error('SYNTHETIC_PRIVATE');
    if (calls === 2) throw new ProviderConnectionFailure('provider_invalid_key');
    return valid;
  });
  await store.check(); assert.ok(!store.getSnapshot().error.includes('SYNTHETIC_PRIVATE'));
  await store.check(); assert.match(store.getSnapshot().error, /did not accept/);
  await store.check(); assert.equal(store.getSnapshot().verified, true);
});
