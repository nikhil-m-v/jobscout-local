import test from 'node:test';
import assert from 'node:assert/strict';
import { savedJobsRequest } from '../src/lib/saved-jobs.ts';
import { snapshotFor } from '../src/lib/saved-jobs-state.ts';

globalThis.window = { isTauri: false };
test('saved jobs use only fixed authenticated local routes and snapshot fields', async () => {
  const original = globalThis.fetch, calls = [];
  const snapshot = snapshotFor({ title: 'Engineer', url: 'https://jobs.example.com/1', snippet: 'Synthetic', source_index: null }, { provider: 'tavily', retrieved_at: '2026-10-12T03:00:00Z', profile: 'PRIVATE', query: 'public query' });
  const id = '00000000-0000-4000-8000-000000000001';
  try {
    globalThis.fetch = async (url, options) => { calls.push({ url, options }); return { json: async () => ({}) }; };
    await savedJobsRequest('load'); await savedJobsRequest('save', snapshot); await savedJobsRequest('delete', id);
    await savedJobsRequest('update', { id, stage: 'applied', notes: 'PRIVATE_SYNTHETIC_NOTE', revision: 0, query: 'must not retain', profile: 'must not retain' });
    assert.deepEqual(calls.map(call => [call.url, call.options.method]), [['/engine/jobs', 'GET'], ['/engine/jobs', 'PUT'], ['/engine/jobs/' + id, 'DELETE'], ['/engine/jobs/' + id, 'PATCH']]);
    assert.deepEqual(JSON.parse(calls[3].options.body), { stage: 'applied', notes: 'PRIVATE_SYNTHETIC_NOTE', revision: 0, confirmed: true });
    for (const { options } of calls) {
      assert.equal(options.headers['X-JobScout-Import'], '1');
      assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
      assert.ok(options.signal instanceof AbortSignal);
    }
    assert.deepEqual(JSON.parse(calls[1].options.body), { candidate: snapshot, confirmed: true });
    assert.ok(!calls[1].options.body.includes('PRIVATE'));
    assert.equal(calls[0].options.body, undefined); assert.equal(calls[2].options.body, undefined);
  } finally { globalThis.fetch = original; }
});
