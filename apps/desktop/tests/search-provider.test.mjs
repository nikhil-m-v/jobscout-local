import test from 'node:test';
import assert from 'node:assert/strict';
import { searchProviderRequest } from '../src/lib/search-provider.ts';

globalThis.window = { isTauri: false };
const valid = { provider: 'tavily', key_saved: false, connection_verified: false, dispatch_available: false, secret_store: 'windows-credential-manager' };

test('provider setup forwards only a key to the fixed local route with safe fetch options', async () => {
  const original = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return { json: async () => ({ ...valid, key_saved: options.method === 'PUT' }) };
    };
    await searchProviderRequest('load');
    await searchProviderRequest('save', 'SYNTHETIC_ONLY');
    await searchProviderRequest('delete');
    assert.deepEqual(calls.map(call => call.options.method), ['GET', 'PUT', 'DELETE']);
    for (const { url, options } of calls) {
      assert.equal(url, '/engine/providers/tavily');
      assert.equal(options.headers['X-JobScout-Import'], '1');
      assert.equal(options.cache, 'no-store');
      assert.equal(options.credentials, 'omit');
      assert.equal(options.redirect, 'error');
    }
    assert.deepEqual(JSON.parse(calls[1].options.body), { key: 'SYNTHETIC_ONLY' });
    assert.equal(calls[0].options.body, undefined);
    assert.equal(calls[2].options.body, undefined);
  } finally { globalThis.fetch = original; }
});

test('unexpected secrets, enabled dispatch, wrong provider and operation mismatches fail closed', async () => {
  const original = globalThis.fetch;
  try {
    for (const [action, payload] of [
      ['load', null], ['load', { ...valid, key: 'SYNTHETIC_PRIVATE' }],
      ['load', { ...valid, provider: 'other' }], ['load', { ...valid, dispatch_available: true }],
      ['load', { ...valid, connection_verified: true }], ['load', { ...valid, key_saved: 'true' }],
      ['save', valid], ['delete', { ...valid, key_saved: true }],
    ]) {
      globalThis.fetch = async () => ({ json: async () => payload });
      await assert.rejects(searchProviderRequest(action, 'synthetic'), error => !error.message.includes('SYNTHETIC_PRIVATE'));
    }
  } finally { globalThis.fetch = original; }
});

test('provider errors and transport diagnostics never echo private content', async () => {
  const original = globalThis.fetch;
  try {
    for (const code of ['invalid_provider_key', 'secret_store_unavailable', 'SYNTHETIC_PRIVATE']) {
      globalThis.fetch = async () => ({ json: async () => ({ error: code, key: 'SYNTHETIC_PRIVATE' }) });
      await assert.rejects(searchProviderRequest('save', 'synthetic'), error => !error.message.includes('SYNTHETIC_PRIVATE'));
    }
    globalThis.fetch = async () => { throw new Error('SYNTHETIC_PRIVATE'); };
    await assert.rejects(searchProviderRequest('save', 'synthetic'), /Check key status before retrying/);
  } finally { globalThis.fetch = original; }
});
