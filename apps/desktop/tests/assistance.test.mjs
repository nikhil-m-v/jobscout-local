import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAssistance, requestAssistance, createAssistanceState, ASSISTANCE_ERROR } from '../src/lib/assistance.ts';
import { filterCandidates, initialResultFilters } from '../src/lib/result-filters.ts';
import { initialCriteria } from '../src/lib/public-search-criteria.ts';

globalThis.window = { isTauri: false };
const result = { criteria: { ...initialCriteria, skills: ['python'] }, roles: ['software-engineer'], skills: ['python'], matches: [] };
const candidate = { title: 'Synthetic job', snippet: 'Python', url: 'https://jobs.example.com/role' };
test('assistance accepts only bounded catalog suggestions and ordered candidate evidence', () => {
  assert.ok(Object.isFrozen(validateAssistance(result, 0).skills));
  for (const value of [{ ...result, profile: 'private' }, { ...result, roles: ['PRIVATE_NAME'] }, { ...result, skills: ['python', 'python'] }, { ...result, criteria: { ...initialCriteria, role: 'data-analyst' } }, { ...result, criteria: { ...result.criteria, region: 'india' } }, { ...result, criteria: null }, { ...result, matches: [{}] }]) assert.throws(() => validateAssistance(value, 0));
  const match = { index: 0, skills: ['python'], shared_skills: ['sql'], roles: [], regions: [], arrangements: [], seniorities: [] };
  assert.throws(() => validateAssistance({ ...result, matches: [match] }, 1));
});
test('review text goes only to the fixed local assistance route; URLs are omitted', async () => {
  const original = globalThis.fetch;
  try {
    let captured;
    const match = { index: 0, skills: ['python'], shared_skills: ['python'], content: { status: 'unknown', evidence: [] }, shared_evidence: [{ skill: 'python', resume_phrase: 'Python', job_phrase: 'Python', job_source: 'snippet' }], roles: [], regions: [], arrangements: [], seniorities: [] };
    globalThis.fetch = async (url, options) => { captured = { url, options }; return { ok: true, json: async () => ({ ...result, matches: [match] }) }; };
    await requestAssistance('PRIVATE_RESUME Python', [candidate], new AbortController().signal);
    assert.equal(captured.url, '/engine/assistance');
    assert.deepEqual(JSON.parse(captured.options.body), { text: 'PRIVATE_RESUME Python', reviewed: true, candidates: [{ title: candidate.title, snippet: candidate.snippet }] });
    assert.equal(captured.options.redirect, 'error'); assert.equal(captured.options.credentials, 'omit'); assert.equal(captured.options.cache, 'no-store');
    globalThis.fetch = async () => { throw new Error('PRIVATE_DIAGNOSTIC'); };
    await assert.rejects(requestAssistance('PRIVATE_RESUME', [], new AbortController().signal), error => error.message === ASSISTANCE_ERROR);
  } finally { globalThis.fetch = original; }
});
test('shared evidence must be complete, bounded and present in the exact reviewed sources', () => {
  const entry = { skill: 'python', resume_phrase: 'Python', job_phrase: 'Python', job_source: 'snippet' };
  const match = { index: 0, skills: ['python'], shared_skills: ['python'], content: { status: 'unknown', evidence: [] }, shared_evidence: [entry], roles: [], regions: [], arrangements: [], seniorities: [] };
  const validate = evidence => validateAssistance({ ...result, matches: [{ ...match, content: { status: 'unknown', evidence: [] }, shared_evidence: evidence }] }, 1, 'Python', [candidate]);
  assert.ok(Object.isFrozen(validate([entry]).matches[0].shared_evidence[0]));
  for (const evidence of [[], [entry, entry], [{ ...entry, skill: 'sql' }], [{ ...entry, resume_phrase: 'Invented' }], [{ ...entry, job_source: 'title' }], [{ ...entry, job_phrase: 'x'.repeat(33) }], [{ ...entry, url: 'https://collector.example.com' }]]) assert.throws(() => validate(evidence));
});
test('edits, skip, cancellation and newer analyses discard late native responses', async () => {
  let firstResolve;
  const first = new Promise(resolve => { firstResolve = resolve; });
  let count = 0, signal;
  const store = createAssistanceState(async (_, __, value) => { signal = value; return ++count === 1 ? first : result; });
  const pending = store.analyze('old text'); store.invalidate();
  assert.equal(signal.aborted, true);
  await store.analyze('new text'); firstResolve(result);
  assert.equal(await pending, null); assert.equal(store.getSnapshot().result, result);
  store.invalidate(); assert.equal(store.getSnapshot().result, null);
});
test('local analysis failures permit retry without exposing private errors', async () => {
  let fail = true;
  const store = createAssistanceState(async () => { if (fail) throw new Error('PRIVATE_TEXT'); return result; });
  assert.equal(await store.analyze('private'), null); assert.equal(store.getSnapshot().error, ASSISTANCE_ERROR);
  fail = false; assert.equal(await store.analyze('private'), result);
});
const candidates = [candidate, { ...candidate, url: candidate.url + '2' }, { ...candidate, url: candidate.url + '3' }];
const mentions = [
  { index: 0, skills: ['analytics'], shared_skills: [], roles: ['data-analyst'], regions: ['canada'], arrangements: ['hybrid'], seniorities: ['entry'] },
  { index: 1, skills: ['python', 'sql'], shared_skills: ['python', 'sql'], roles: ['software-engineer'], regions: ['india'], arrangements: ['remote'], seniorities: ['senior'] },
  { index: 2, skills: [], shared_skills: [], roles: [], regions: [], arrangements: [], seniorities: [] },
];
test('the same returned pool orders differently for different resume skill categories', () => {
  assert.deepEqual(filterCandidates(candidates, mentions, true, initialResultFilters).map(item => item.index), [1, 0, 2]);
  const analyst = mentions.map(item => ({ ...item, shared_skills: item.index === 0 ? ['analytics'] : [] }));
  assert.deepEqual(filterCandidates(candidates, analyst, true, initialResultFilters).map(item => item.index), [0, 1, 2]);
  assert.deepEqual(filterCandidates(candidates, mentions, false, initialResultFilters).map(item => item.index), [0, 1, 2]);
  assert.deepEqual(filterCandidates(candidates, mentions, true, initialResultFilters)[0].shared, ['python', 'sql']);
});
test('local filters preserve unknowns by default, exclude contradictions, and reset without fetching', () => {
  for (const filters of [{ region: 'india' }, { role: 'software-engineer' }, { arrangement: 'remote' }, { seniority: 'senior' }, { skill: 'python' }]) {
    assert.deepEqual(filterCandidates(candidates, mentions, false, { ...initialResultFilters, ...filters }).map(item => item.index), [1, 2]);
    assert.deepEqual(filterCandidates(candidates, mentions, false, { ...initialResultFilters, ...filters, keepUnknown: false }).map(item => item.index), [1]);
  }
  assert.equal(filterCandidates(candidates, mentions, false, { ...initialResultFilters, skill: 'java', keepUnknown: false }).length, 0);
  assert.equal(filterCandidates(candidates, mentions, false, initialResultFilters).length, 3);
});

test('resource hiding is reversible and unknown candidates survive missing-detail filtering', () => {
  const evidence = mentions.map((item, index) => ({ ...item, content: { status: index === 1 ? 'resource' : 'unknown', evidence: [] } }));
  assert.deepEqual(filterCandidates(candidates, evidence, true, initialResultFilters).map(row => row.index), [0, 2]);
  assert.deepEqual(filterCandidates(candidates, evidence, true, { ...initialResultFilters, showResources: true }).map(row => row.index), [1, 0, 2]);
  assert.equal(filterCandidates(candidates, [], true, initialResultFilters).length, 3);
});
test('content response rejects fabricated evidence and unsupported hiding decisions', () => {
  const job = { ...candidate, title: 'Python course' };
  const match = { index: 0, skills: [], shared_skills: [], shared_evidence: [], roles: [], regions: [], arrangements: [], seniorities: [] };
  const content = { status: 'resource', evidence: [{ kind: 'resource', source: 'title', phrase: 'course' }] };
  const validate = value => validateAssistance({ ...result, matches: [{ ...match, content: value }] }, 1, 'Python', [job]);
  assert.equal(validate(content).matches[0].content.status, 'resource');
  for (const value of [null, { ...content, status: 'opening' }, { status: 'resource', evidence: [] }, { ...content, evidence: [{ ...content.evidence[0], phrase: 'Invented' }] }, { ...content, evidence: [content.evidence[0], content.evidence[0]] }, { ...content, url: job.url }]) assert.throws(() => validate(value));
});
