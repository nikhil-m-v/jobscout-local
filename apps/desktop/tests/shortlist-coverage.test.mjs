import test from 'node:test';
import assert from 'node:assert/strict';
import { shortlistCoverage, shortlistTarget } from '../src/lib/shortlist-coverage.ts';

const row = (index, title = `Candidate ${index}`, employer = `employer${index}`, status = 'opening') => ({
  candidate: { title, url: `https://boards.greenhouse.io/${employer}/jobs/${index}`, snippet: '', source_index: null },
  evidence: { content: { status } },
});

test('the review target starts at ten without capping twenty or larger pools', () => {
  assert.deepEqual(shortlistTarget, { minimum: 10, preferredMaximum: 20 });
  for (const count of [0, 1, 9, 10, 20, 21, 50]) {
    const rows = Array.from({ length: count }, (_, index) => row(index));
    assert.deepEqual(shortlistCoverage(rows), { reviewableGroups: count, belowMinimum: count < 10 });
    assert.equal(rows.length, count);
  }
});

test('repeated employer/title links cannot inflate coverage when grouping display is off', () => {
  const rows = Array.from({ length: 20 }, (_, index) => row(index, 'Senior software engineer', 'same-employer'));
  assert.deepEqual(shortlistCoverage(rows), { reviewableGroups: 1, belowMinimum: true });
  assert.equal(rows.length, 20);
});

test('boards and resources do not count; unclear candidates stay reviewable', () => {
  const board = { candidate: { title: 'Careers', url: 'https://boards.greenhouse.io/acme', snippet: '', source_index: null } };
  const unknown = { candidate: { title: 'Unclear candidate', url: 'https://jobs.example.com/one', snippet: '', source_index: null } };
  const rows = [board, unknown, row(1, 'Python course', 'training', 'resource'), row(2, 'Jobs', 'listing', 'collection')];
  assert.deepEqual(shortlistCoverage(rows), { reviewableGroups: 1, belowMinimum: true });
  assert.equal(rows.length, 4);
});
