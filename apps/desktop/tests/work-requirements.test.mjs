import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateRequirements } from '../src/lib/work-requirements.ts';
import { filterCandidates, initialResultFilters } from '../src/lib/result-filters.ts';

const job = (snippet, title = 'Software engineer (100% Remote - India)') => ({ title, snippet, url: 'https://jobs.example.com/1', source_index: null });

test('explicit work requirements retain literal source phrases without eligibility inference', () => {
  const candidate = job('Willing to align working hours with PT timezone. We expect candidates to be physically located in PST - EST timezones. You must be legally authorised to work in India. Visa sponsorship is not available.');
  const notes = candidateRequirements(candidate);
  assert.deepEqual(notes.map(n => n.kind), ['schedule', 'location', 'authorization', 'sponsorship']);
  for (const note of notes) {
    assert.equal(note.source, 'snippet');
    assert.ok(candidate[note.source].includes(note.phrase));
    assert.deepEqual(Object.keys(note).sort(), ['kind', 'phrase', 'source']);
  }
  assert.equal(candidateRequirements(job('', 'Must work with ET time zone overlap.'))[0].source, 'title');
});

test('team prose, application questions and negated requirements do not acquire review notes', () => {
  for (const text of [
    'Our distributed team spans multiple time zones.', 'Collaborate with a team with partial ET time zone overlap.',
    'Are you legally authorized to work in India?', 'Can you align working hours with PT timezone?',
    'Do you have to be legally authorized to work here?', "Select Yes if you do NOT need visa sponsorship of any kind.",
    'No time zone overlap is required.', 'We do not expect candidates to be physically located in PST - EST timezones.',
    'You are not required to be legally authorized to work here.', 'We provide visa sponsorship.',
    'Select No if visa sponsorship is not available.', '* Please answer whether you must work with ET time zone overlap.',
  ]) assert.deepEqual(candidateRequirements(job(text)), [], text);
});

test('bounded clauses stay literal and do not match a long paragraph suffix', () => {
  assert.deepEqual(candidateRequirements(job('Context '.repeat(40) + 'Must work with ET time zone overlap.')), []);
  const text = 'Context '.repeat(40) + '.\nAbility to work remotely with ET time zone overlap.';
  const notes = candidateRequirements(job(text));
  assert.equal(notes.length, 1);
  assert.equal(notes[0].phrase, 'Ability to work remotely with ET time zone overlap.');
});

test('known boards, collections and resources do not gain individual requirements', () => {
  const candidate = job('Visa sponsorship is not available.');
  for (const status of ['collection', 'resource']) assert.deepEqual(candidateRequirements(candidate, status), []);
  assert.deepEqual(candidateRequirements({ ...candidate, url: 'https://jobs.lever.co/example' }), []);
});

test('requirements do not change supported filters, strict survivors, reset or manual order', () => {
  const candidates = [job('We expect candidates to be physically located in PST - EST timezones.'), job('Location: India. Work mode: remote.')];
  const evidence = candidates.map((_, index) => ({ index, roles: ['software-engineer'], regions: [], arrangements: [], seniorities: [], skills: [], shared_skills: [], content: { status: 'opening' }, shortlist: { roles: [{ role: 'software-engineer', source: 'title', phrase: 'Software engineer' }], exact_tools: [], exclusions: [] } }));
  const selected = { ...initialResultFilters, role: 'software-engineer', region: 'india', arrangement: 'remote' };
  for (const filters of [initialResultFilters, selected, { ...selected, keepUnknown: false }]) {
    assert.deepEqual(filterCandidates(candidates, evidence, false, filters).map(row => row.index), [0, 1]);
  }
  assert.equal(candidateRequirements(candidates[0], evidence[0].content.status)[0].kind, 'location');
});
