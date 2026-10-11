import test from 'node:test';
import assert from 'node:assert/strict';
import { createSavedJobsState, snapshotFor, validateSavedJob } from '../src/lib/saved-jobs-state.ts';

const candidate = { title: 'Synthetic engineer', url: 'https://jobs.example.com/1', snippet: '<img src="https://tracker.example.com">', source_index: 1 };
const result = { provider: 'tavily', retrieved_at: '2026-10-12T03:00:00Z', query: 'public query', profile: 'SYNTHETIC_PRIVATE_PROFILE', matches: [{ resume_phrase: 'private' }] };
const snapshot = snapshotFor(candidate, result);
const job = { ...snapshot, id: '00000000-0000-4000-8000-000000000001', saved_at: '2026-10-12T03:01:00Z' };
const tick = () => new Promise(resolve => setImmediate(resolve));
test('saving projects only returned candidate content and provenance', () => {
  assert.deepEqual(Object.keys(snapshot).sort(), ['title', 'url', 'snippet', 'source_index', 'provider', 'retrieved_at'].sort());
  assert.ok(!JSON.stringify(snapshot).includes('SYNTHETIC_PRIVATE_PROFILE'));
  assert.deepEqual(validateSavedJob(job), job);
  for (const change of [{ resume: 'private' }, { url: 'javascript:alert(1)' }, { url: 'https://user:secret@jobs.example.com/1' }, { snippet: '\ud800' }, { source_index: true }, { source_index: 5 }, { provider: 'other' }, { id: '../private' }, { saved_at: 'invalid' }]) assert.throws(() => validateSavedJob({ ...job, ...change }));
});
test('save and removal wait for acknowledgement; reload after ambiguous failure resolves committed save', async () => {
  let persisted = [], finish, calls = [];
  const store = createSavedJobsState(async (action, value) => {
    calls.push(action);
    if (action === 'load') return { jobs: persisted };
    if (action === 'save') { persisted = [job]; throw new Error('SYNTHETIC_PRIVATE_TRANSPORT'); }
    return new Promise(resolve => { finish = () => { persisted = []; resolve({ deleted: true }); }; });
  });
  store.connect(true); await tick();
  assert.equal(store.getSnapshot().ready, true);
  assert.equal(await store.save(snapshot), false);
  assert.equal(store.getSnapshot().jobs.length, 0);
  assert.equal(store.getSnapshot().ready, false);
  assert.ok(!store.getSnapshot().error.includes('SYNTHETIC_PRIVATE_TRANSPORT'));
  assert.equal(await store.save(snapshot), false);
  await store.reload();
  assert.deepEqual(store.getSnapshot().jobs, [job]);
  const removing = store.remove(job.id);
  assert.deepEqual(store.getSnapshot().jobs, [job]);
  assert.equal(store.getSnapshot().busy, true);
  assert.equal(await store.save(snapshot), false);
  finish(); assert.equal(await removing, true);
  assert.deepEqual(store.getSnapshot().jobs, []);
  assert.deepEqual(calls, ['load', 'save', 'load', 'delete']);
});
test('same-link save does not multiply local records; malformed response blocks writes', async () => {
  let invalid = false;
  const store = createSavedJobsState(async action => action === 'load' ? { jobs: [job] } : { job: invalid ? { ...job, url: 'https://jobs.example.com/different' } : job });
  store.connect(true); await tick();
  await store.save(snapshot);
  assert.equal(store.getSnapshot().jobs.length, 1);
  invalid = true;
  assert.equal(await store.save(snapshot), false);
  assert.deepEqual(store.getSnapshot().jobs, [job]);
  assert.equal(store.getSnapshot().ready, false);
});
test('disconnect during a write keeps controls locked and reloads on reconnection', async () => {
  let finish, reads = 0;
  const store = createSavedJobsState(async action => action === 'load' ? (reads++, { jobs: reads === 1 ? [] : [job] }) : new Promise(resolve => { finish = () => resolve({ job }); }));
  store.connect(true); await tick();
  const saving = store.save(snapshot);
  store.connect(false); store.connect(true);
  assert.equal(store.getSnapshot().ready, false);
  assert.equal(await store.save(snapshot), false);
  finish(); await saving; await tick();
  assert.equal(reads, 2);
  assert.equal(store.getSnapshot().ready, true);
  assert.deepEqual(store.getSnapshot().jobs, [job]);
});
test('malformed reload retains last known records and suppresses private error details', async () => {
  let invalid = false;
  const store = createSavedJobsState(async () => invalid ? { jobs: [job, job], diagnostic: 'PRIVATE' } : { jobs: [job] });
  store.connect(true); await tick(); invalid = true;
  assert.equal(await store.reload(), false);
  assert.deepEqual(store.getSnapshot().jobs, [job]);
  assert.equal(store.getSnapshot().ready, false);
  assert.ok(!store.getSnapshot().error.includes('PRIVATE'));
});
