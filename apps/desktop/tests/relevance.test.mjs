import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateRelevance, relevanceStatus } from '../src/lib/relevance.ts';
import { filterCandidates, initialResultFilters } from '../src/lib/result-filters.ts';
const job = (title, snippet = '') => ({ title, snippet, url: 'https://jobs.example.com/1', source_index: null });
const mentions = title => ({ index: 0, roles: ['software-engineer'], regions: [], arrangements: [], seniorities: [], skills: [], shared_skills: [], content: { status: 'opening' }, shortlist: { roles: title ? [{ role: 'software-engineer', source: 'title', phrase: 'Software engineer' }] : [], exact_tools: [], exclusions: [] } });

test('explicit details preserve exact source evidence and multiple supported locations', () => {
  const candidate = job('Software engineer (Remote)', 'Location: India, Canada. Work mode: remote.');
  const evidence = candidateRelevance(candidate, mentions(true));
  for (const [field, value] of [['role', 'software-engineer'], ['region', 'india'], ['region', 'canada'], ['arrangement', 'remote']]) assert.equal(relevanceStatus(evidence[field], value), 'supported');
  for (const signals of Object.values(evidence)) for (const signal of signals) assert.ok(candidate[signal.source].includes(signal.phrase));
  assert.equal(relevanceStatus(evidence.region, 'australia'), 'contradiction');
});
test('incidental country, city, team and negated experience mentions remain unknown', () => {
  for (const snippet of ['Our clients are in India and Canada; join a remote team.', 'Location: Bengaluru.', 'Work mode: remote team support.', 'No remote experience required.', 'Headquartered in India. Remote collaboration tools.', 'Location: India team.']) {
    const evidence = candidateRelevance(job('Support for remote teams', snippet));
    assert.equal(relevanceStatus(evidence.region, 'india'), 'unknown', snippet);
    assert.equal(relevanceStatus(evidence.arrangement, 'remote'), 'unknown', snippet);
  }
});
test('explicit exclusions and conflicting text differ from missing details', () => {
  const negative = candidateRelevance(job('Software engineer', 'Not remote. Location: Canada.'));
  assert.equal(relevanceStatus(negative.arrangement, 'remote'), 'contradiction');
  assert.equal(relevanceStatus(negative.region, 'india'), 'contradiction');
  const mixed = candidateRelevance(job('Software engineer (Remote)', 'Not remote.'));
  assert.equal(relevanceStatus(mixed.arrangement, 'remote'), 'conflict');
  assert.equal(relevanceStatus(mixed.region, 'india'), 'unknown');
  const excludedRole = candidateRelevance(job('No Software engineer positions'), mentions(true));
  assert.equal(relevanceStatus(excludedRole.role, 'software-engineer'), 'contradiction');
  const roleConflict = candidateRelevance(job('Software engineer', 'No Software engineer positions.'), { ...mentions(true), shortlist: { ...mentions(true).shortlist, roles: [...mentions(true).shortlist.roles, { role: 'software-engineer', source: 'snippet', phrase: 'Software engineer' }] } });
  assert.equal(relevanceStatus(roleConflict.role, 'software-engineer'), 'conflict');
  const candidates = [job('No Software engineer positions'), job('Software engineer')];
  assert.deepEqual(filterCandidates(candidates, [mentions(true), mentions(true)], true, initialResultFilters, 'software-engineer').map(row => row.index), [1, 0]);
});
test('collections cannot supply individual opportunity evidence', () => {
  const candidate = job('Software engineer (Remote)', 'Location: Canada.');
  const evidence = candidateRelevance(candidate, { ...mentions(true), content: { status: 'collection' } });
  assert.ok(Object.values(evidence).every(signals => signals.length === 0));
});

test('ATS metadata supports explicit country/work mode without geocoding or worldwide eligibility', () => {
  for (const candidate of [job('Software engineer', 'Remote - India\n\nAbout the role'), job('Software engineer (Remote – India)'), job('Software engineer', 'This is a remote opportunity based in India.'), job('Software engineer (Remote)', 'locations: Example City, Example State, India.')]) {
    const evidence = candidateRelevance(candidate, mentions(true));
    assert.equal(relevanceStatus(evidence.region, 'india'), 'supported');
    assert.equal(relevanceStatus(evidence.arrangement, 'remote'), 'supported');
    for (const signals of Object.values(evidence)) for (const signal of signals) assert.ok(candidate[signal.source].includes(signal.phrase));
  }
  for (const snippet of ['Our remote teams serve India.', 'Client request: Remote - India support.', 'Remote-first culture across the world.', 'remote type: Partially Remote. locations: Example City.', 'locations: India team.']) {
    const evidence = candidateRelevance(job('Software engineer', snippet));
    assert.equal(relevanceStatus(evidence.region, 'india'), 'unknown', snippet);
    assert.equal(relevanceStatus(evidence.arrangement, 'remote'), 'unknown', snippet);
  }
});
test('explicit remote area restrictions contradict disjoint regions and preserve overlapping unknowns', () => {
  const latin = candidateRelevance(job('Software engineer - Remote, Latin America'));
  assert.equal(relevanceStatus(latin.region, 'india'), 'contradiction');
  assert.equal(relevanceStatus(latin.arrangement, 'remote'), 'supported');
  const emea = candidateRelevance(job('Software engineer (Remote – EMEA)'));
  assert.equal(relevanceStatus(emea.region, 'india'), 'contradiction');
  assert.equal(relevanceStatus(emea.region, 'europe'), 'unknown');
  assert.equal(relevanceStatus(emea.region, 'united-kingdom'), 'unknown');
  assert.equal(relevanceStatus(latin.region, 'united-states'), 'unknown');
  const mixed = candidateRelevance(job('Software engineer (Remote – EMEA)', 'Location: India.'));
  assert.equal(relevanceStatus(mixed.region, 'india'), 'conflict');
  const incidental = candidateRelevance(job('Software engineer', 'Our customers span Latin America and EMEA.'));
  assert.equal(relevanceStatus(incidental.region, 'india'), 'unknown');
  const jobs = [job('Software engineer - Remote, Latin America'), job('Software engineer (Remote – India)'), job('Software engineer')];
  const evidence = jobs.map((_, index) => ({ ...mentions(true), index }));
  assert.deepEqual(filterCandidates(jobs, evidence, false, { ...initialResultFilters, region: 'india', arrangement: 'remote' }).map(row => row.index), [1, 2]);
  assert.equal(filterCandidates(jobs, evidence, false, initialResultFilters).length, 3);
});
test('reversible filters keep unknowns/conflicts, reject title contradictions and preserve manual order', () => {
  const candidates = [job('Software engineer (Remote)', 'Location: India.'), job('Software engineer', 'Clients in Canada; remote team.'), job('Software engineer', 'Location: Canada. Work mode: onsite.'), job('Software engineer (Remote)', 'Not remote. Location: India.')];
  const evidence = candidates.map((_, index) => ({ ...mentions(true), index }));
  const filters = { ...initialResultFilters, role: 'software-engineer', region: 'india', arrangement: 'remote' };
  assert.deepEqual(filterCandidates(candidates, evidence, false, filters).map(row => row.index), [0, 1, 3]);
  assert.deepEqual(filterCandidates(candidates, evidence, false, { ...filters, keepUnknown: false }).map(row => row.index), [0]);
  assert.equal(filterCandidates(candidates, evidence, false, initialResultFilters).length, 4);
  const other = { ...mentions(true), shortlist: { ...mentions(true).shortlist, roles: [{ role: 'data-analyst', source: 'title', phrase: 'Data analyst' }, { role: 'software-engineer', source: 'snippet', phrase: 'software engineer' }] } };
  assert.equal(filterCandidates([job('Data analyst', 'Work with a software engineer.')], [other], false, { ...initialResultFilters, role: 'software-engineer' }).length, 0);
});
