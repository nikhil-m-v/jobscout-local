import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectCandidate, groupCandidates } from '../src/lib/candidate-pool.ts';
import { filterCandidates, initialResultFilters } from '../src/lib/result-filters.ts';
import { validateSearchResult } from '../src/lib/discovery-state.ts';

const id = '00000000-0000-4000-8000-000000000001';
const candidate = (url, title = 'Acme - Senior Software Engineer (Remote)', source_index = null) => ({ title, url, snippet: '', source_index });
test('known ATS posting and board paths have explicit local evidence', () => {
  for (const [url, kind] of [
    ['https://job-boards.greenhouse.io/acme/jobs/123', 'posting'],
    ['https://boards.greenhouse.io/acme/', 'board'],
    [`https://jobs.lever.co/acme/${id}/apply`, 'posting'],
    ['https://jobs.eu.lever.co/acme', 'board'],
    [`https://jobs.ashbyhq.com/acme/${id}`, 'posting'],
    ['https://jobs.ashbyhq.com/acme', 'board'],
    ['https://acme.wd1.myworkdayjobs.com/en-US/Careers/job/Remote/Engineer_R123-1', 'posting'],
    ['https://acme.wd1.myworkdayjobs.com/en-US/Careers', 'board'],
    ['https://jobs.smartrecruiters.com/Acme/123-software-engineer', 'posting'],
    ['https://careers.smartrecruiters.com/Acme', 'board'],
    ['https://jobs.smartrecruiters.com/Acme', 'board'],
  ]) {
    const result = inspectCandidate(candidate(url));
    assert.equal(result.kind, kind, url);
    assert.equal(result.path, new URL(url).pathname);
    assert.ok(Object.isFrozen(result));
  }
});
test('unrecognized, lookalike and query-selected posting paths remain unknown', () => {
  for (const url of [
    'https://jobs.ashbyhq.com.evil.example/acme',
    'https://jobs.ashbyhq.com/acme/not-a-job-id',
    'https://boards.greenhouse.io/acme?gh_jid=123',
    'https://jobs.ashbyhq.com/acme?jobId=123',
    'https://acme.wd1.myworkdayjobs.com/Careers/job/search',
    'https://careers.smartrecruiters.com/Acme/123-role',
    'https://jobs.example.com/acme/123',
  ]) assert.equal(inspectCandidate(candidate(url)).kind, 'unknown', url);
});
test('scope compares the exact originating request, with bounded Workday subdomains', () => {
  assert.equal(inspectCandidate(candidate(`https://jobs.lever.co/acme/${id}`, undefined, 1)).scope, 'within');
  assert.equal(inspectCandidate(candidate(`https://jobs.lever.co/acme/${id}`, undefined, 0)).scope, 'outside');
  assert.equal(inspectCandidate(candidate('https://careers.smartrecruiters.com/Acme', undefined, 4)).scope, 'outside');
  assert.equal(inspectCandidate(candidate('https://acme.wd1.myworkdayjobs.com/Careers', undefined, 3)).scope, 'within');
  assert.equal(inspectCandidate(candidate('https://evilmyworkdayjobs.com/Careers', undefined, 3)).scope, 'outside');
  assert.equal(inspectCandidate(candidate('https://myworkdayjobs.com.evil.example/Careers', undefined, 3)).scope, 'outside');
  assert.equal(inspectCandidate(candidate('https://jobs.example.com/role')).scope, 'unrestricted');
});
test('same tenant and normalized full title groups reversibly without losing evidence', () => {
  const rows = [
    { candidate: candidate(`https://jobs.lever.co/acme/${id}`), evidence: 'first' },
    { candidate: candidate(`https://jobs.lever.co/acme/${id.replace(/1$/, '2')}`, ' ACME -  Senior Software Engineer (Remote) '), evidence: 'second' },
    { candidate: candidate(`https://jobs.lever.co/other/${id}`), evidence: 'other' },
  ];
  const groups = groupCandidates(rows);
  assert.deepEqual(groups.map(group => group.length), [2, 1]);
  assert.deepEqual(groups.flat(), rows);
  assert.equal(groups[0][1].evidence, 'second');
  assert.equal(groupCandidates(rows, false).length, 3);
  assert.equal(rows.length, 3);
});
test('different location titles, tenants, placeholders, boards and unknowns stay separate', () => {
  const urls = [
    `https://jobs.lever.co/acme/${id}`, `https://jobs.lever.co/acme/${id.replace(/1$/, '2')}`,
  ];
  for (const [a, b] of [
    [candidate(urls[0], 'Senior Engineer - India'), candidate(urls[1], 'Senior Engineer - Canada')],
    [candidate(urls[0], 'page_title'), candidate(urls[1], 'page_title')],
    [candidate(urls[0], 'Software Engineer'), candidate(urls[1], 'Software Engineer')],
    [candidate('https://jobs.ashbyhq.com/acme'), candidate('https://jobs.ashbyhq.com/other')],
    [candidate('https://jobs.example.com/one'), candidate('https://jobs.example.com/two')],
  ]) assert.equal(groupCandidates([{ candidate: a }, { candidate: b }]).length, 2);
});
test('board hiding works without text analysis, preserves unknowns and is reversible', () => {
  const pool = [candidate('https://jobs.ashbyhq.com/acme'), candidate('https://jobs.example.com/role')];
  const hidden = filterCandidates(pool, [], false, { ...initialResultFilters, showCollections: false });
  assert.deepEqual(hidden.map(row => row.index), [1]);
  assert.deepEqual(filterCandidates(pool, [], false, initialResultFilters).map(row => row.index), [0, 1]);
});
test('grouping follows surviving filter/ranking order without restoring excluded links', () => {
  const pool = [candidate(`https://jobs.lever.co/acme/${id}`), candidate(`https://jobs.lever.co/acme/${id.replace(/1$/, '2')}`)];
  const evidence = [
    { roles: [], regions: ['canada'], arrangements: [], seniorities: [], skills: [], shared_skills: [] },
    { roles: [], regions: ['india'], arrangements: [], seniorities: [], skills: [], shared_skills: [] },
  ];
  const filtered = filterCandidates(pool, evidence, false, { ...initialResultFilters, region: 'india' });
  assert.deepEqual(groupCandidates(filtered).flat().map(row => row.index), [1]);
  assert.equal(groupCandidates([{ candidate: pool[1] }, { candidate: pool[0] }])[0][0].candidate, pool[1]);
});
test('wire provenance is required, bounded and consistent with completed requests', () => {
  const result = { query: 'Software engineer jobs', provider: 'tavily', retrieved_at: '2026-10-06T03:00:00Z', duplicates_removed: 0, discarded_results: 0, candidates: [candidate('https://jobs.example.com/role', undefined, 0)], coverage: { attempted: 2, completed: 1, max_requests: 5, stop_reason: 'cancelled', failures: [] } };
  assert.equal(validateSearchResult(result, result.query).candidates[0].source_index, 0);
  for (const source_index of [undefined, null, true, -1, 1, 5, 0.5, '0']) assert.throws(() => validateSearchResult({ ...result, candidates: [{ ...result.candidates[0], source_index }] }, result.query));
  const { coverage, ...single } = result;
  assert.throws(() => validateSearchResult(single, result.query));
  assert.equal(validateSearchResult({ ...single, candidates: [{ ...single.candidates[0], source_index: null }] }, result.query).candidates[0].source_index, null);
});
