import { postingSources } from '../src/lib/search-plan.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSearchPlan, validateSearchProgress } from '../src/lib/search-plan.ts';
import { validateSearchPreview } from '../src/lib/search-preview-state.ts';
import { createDiscoveryState, validateSearchResult } from '../src/lib/discovery-state.ts';
import { requestDiscovery, discoveryControl } from '../src/lib/discovery.ts';
import { initialCriteria } from '../src/lib/public-search-criteria.ts';
const query = 'Software engineer jobs';
const plan = { version: 2, sources: postingSources.map(source => ({ name: source.name, domains: [...source.domains] })), queries: postingSources.map(() => 'Software engineer jobs'), max_requests: 5, max_candidates: 50, estimated_max_credits: 5, timeout_seconds: 75 };
const preview = { query, query_version: 1, provider: 'tavily', dispatch_available: true, plan };
const candidate = { source_index: 0, title: 'Software engineer', snippet: 'Hiring Python', url: 'https://jobs.example.com/role' };
const result = { query, provider: 'tavily', retrieved_at: '2026-10-05T03:00:00Z', duplicates_removed: 0, discarded_results: 0, candidates: [candidate], coverage: { attempted: 2, completed: 1, max_requests: 5, stop_reason: 'cancelled', failures: [] } };
const runId = '00000000-0000-4000-8000-000000000001';
globalThis.window = { isTauri: false };
test('reviewed plan is immutable, exact and bounded with no arbitrary queries', () => {
  assert.ok(Object.isFrozen(validateSearchPreview(preview).plan.queries));
  for (const value of [{ ...plan, max_requests: 6 }, { ...plan, estimated_max_credits: true }, { ...plan, queries: ['PRIVATE_NAME'] }, { ...plan, timeout_seconds: 76 }, { ...plan, endpoint: 'https://collector.example.com' }]) assert.throws(() => validateSearchPlan(value, query));
  assert.throws(() => validateSearchPreview({ ...preview, plan: null }));
  for (const value of [{ attempted: 6, completed: 5, max_requests: 5, busy: true }, { attempted: 1, completed: 2, max_requests: 5, busy: true }]) assert.throws(() => validateSearchProgress(value));
});

test('fixed source scopes are deeply frozen and stale or modified plans fail closed', () => {
  const validated = validateSearchPlan(plan, query);
  assert.ok(Object.isFrozen(validated.sources));
  assert.ok(Object.isFrozen(validated.sources[0].domains));
  for (const value of [{ ...plan, version: 1 }, { ...plan, sources: [...plan.sources].reverse() }, { ...plan, sources: [{ name: 'Private employer', domains: ['collector.example.com'] }, ...plan.sources.slice(1)] }, { ...plan, sources: [{ ...plan.sources[0], profile: 'PRIVATE_NAME' }, ...plan.sources.slice(1)] }, { ...plan, sources: [] }]) assert.throws(() => validateSearchPlan(value, query));
  // Backend JSON object ordering does not change the contract.
  assert.deepEqual(validateSearchPlan({ ...plan, sources: plan.sources.map(source => ({ domains: source.domains, name: source.name })) }, query), validated);
});
test('stopping broader discovery retains completed results and progress rather than discarding the run', async () => {
  let finish, signal, confirmation;
  const store = createDiscoveryState(async (value, abort, progress) => { confirmation = value; signal = abort; progress({ attempted: 2, completed: 1, max_requests: 5, busy: true }); return new Promise(resolve => { finish = resolve; }); });
  const pending = store.send(initialCriteria, preview, true);
  assert.deepEqual(confirmation.reviewed_plan, plan);
  assert.match(confirmation.run_id, /^[0-9a-f-]{36}$/);
  assert.equal(store.getSnapshot().progress.completed, 1);
  store.stop(); assert.equal(signal.aborted, true); assert.equal(store.getSnapshot().stopping, true);
  finish(result); await pending;
  assert.equal(store.getSnapshot().busy, false); assert.equal(store.getSnapshot().result.coverage.stop_reason, 'cancelled');
  assert.equal(store.getSnapshot().result.candidates.length, 1);
});
test('single-search opt out omits broader authorization and rejects mismatched response modes', async () => {
  let confirmation;
  const store = createDiscoveryState(async value => { confirmation = value; return result; });
  await store.send(initialCriteria, preview, true, false);
  assert.equal(confirmation.reviewed_plan, undefined); assert.equal(confirmation.run_id, undefined);
  assert.equal(store.getSnapshot().result, null);
});
test('50-candidate coverage validates bounds and rejects invented failure/progress metadata', () => {
  const complete = { ...result, candidates: Array.from({ length: 50 }, (_, i) => ({ ...candidate, url: candidate.url + i })), coverage: { attempted: 5, completed: 5, max_requests: 5, stop_reason: 'complete', failures: [] } };
  assert.equal(validateSearchResult(complete, query).candidates.length, 50);
  for (const value of [{ ...complete, candidates: [...complete.candidates, { ...candidate, url: candidate.url + 'extra' }] }, { ...result, coverage: { ...result.coverage, completed: 0 } }, { ...result, coverage: { ...result.coverage, stop_reason: 'complete' } }, { ...result, coverage: { ...result.coverage, stop_reason: 'provider_failure', failures: [{ request: 2, code: 'PRIVATE_DIAGNOSTIC' }] } }]) assert.throws(() => validateSearchResult(value, query));
  const partial = validateSearchResult({ ...result, coverage: { ...result.coverage, stop_reason: 'provider_failure', failures: [{ request: 2, code: 'provider_rate_limited' }] } }, query);
  assert.ok(Object.isFrozen(partial.coverage.failures[0]));
});

test('broader accounting includes discarded links within completed request limits', () => {
  assert.equal(validateSearchResult({ ...result, discarded_results: 9 }, query).discarded_results, 9);
  assert.throws(() => validateSearchResult({ ...result, discarded_results: 10 }, query));
  assert.throws(() => validateSearchResult({ ...result, discarded_results: 9, duplicates_removed: 1 }, query));
  assert.equal(validateSearchResult({ ...result, candidates: [], discarded_results: 10 }, query).candidates.length, 0);
});
test('browser cancellation uses only the authenticated local run route and keeps the final request alive', async () => {
  const original = globalThis.fetch, calls = []; let finish;
  const controller = new AbortController();
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url === '/engine/search') return new Promise(resolve => { finish = () => resolve({ json: async () => result }); });
      return { json: async () => ({ cancelled: true }) };
    };
    const pending = requestDiscovery({ criteria: initialCriteria, provider: 'tavily', query_version: 1, confirmed: true, reviewed_query: query, reviewed_plan: plan, run_id: runId }, controller.signal);
    controller.abort(); await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(calls[1].url, `/engine/search/${runId}/cancel`);
    assert.equal(calls[1].options.method, 'POST');
    assert.equal(calls[0].options.signal.aborted, false);
    assert.equal(calls[1].options.headers['X-JobScout-Import'], '1');
    finish(); assert.deepEqual(await pending, result);
    await assert.rejects(discoveryControl('../private'));
    assert.equal(calls.length, 2);
  } finally { globalThis.fetch = original; }
});
