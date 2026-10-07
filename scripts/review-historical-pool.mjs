// Explicit offline replay only. No credential access, provider or page requests.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSearchResult } from '../apps/desktop/src/lib/discovery-state.ts';
import { validateAssistance } from '../apps/desktop/src/lib/assistance.ts';
import { filterCandidates, initialResultFilters } from '../apps/desktop/src/lib/result-filters.ts';
import { groupCandidates, inspectCandidate } from '../apps/desktop/src/lib/candidate-pool.ts';
import { relevanceStatus } from '../apps/desktop/src/lib/relevance.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const [input, countsArgument] = process.argv.slice(2);
if (!input) throw new Error('Provide a local historical result JSON and optional comma-separated source counts. No network requests are performed.');
const raw = JSON.parse(readFileSync(resolve(input), 'utf8').replace(/^\uFEFF/, ''));
const criteria = { role: 'software-engineer', region: 'india', arrangement: 'remote', seniority: 'any', skills: ['python', 'sql'] };
const query = 'Software engineer jobs India Remote Python SQL';
// Older responses lacked provenance. Reconstruction must be explicitly supplied,
// bounded, lossless and marked in the report; it never changes runtime validation.
const reconstructed = countsArgument !== undefined;
if (reconstructed) {
  const counts = countsArgument.split(',').map(Number);
  assert.equal(counts.length, 5);
  assert.ok(counts.every(count => Number.isInteger(count) && count >= 0 && count <= 10));
  assert.equal(counts.reduce((sum, count) => sum + count, 0), raw.candidates.length);
  assert.ok(raw.candidates.every(candidate => !Object.hasOwn(candidate, 'source_index')));
  let cursor = 0;
  for (const [source_index, count] of counts.entries()) for (let i = 0; i < count; i++) raw.candidates[cursor++].source_index = source_index;
}
const result = validateSearchResult(raw, query);
const review = 'Software engineer Python SQL'; // Synthetic reference, never a user profile.
const python = resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const analyzed = spawnSync(python, ['-c', 'import json,sys; from jobscout_engine.domain.assistance import analyze_review; print(json.dumps(analyze_review(json.load(sys.stdin))))'], {
  cwd: root, input: JSON.stringify({ text: review, reviewed: true, candidates: result.candidates.map(({ title, snippet }) => ({ title, snippet })) }), encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024, windowsHide: true,
});
if (analyzed.error || analyzed.status !== 0) throw new Error('Offline local analysis failed. No provider request was performed.');
const evidence = validateAssistance(JSON.parse(analyzed.stdout), result.candidates.length, review, result.candidates).matches;
const all = filterCandidates(result.candidates, evidence, true, { ...initialResultFilters, showResources: true }, criteria.role);
assert.equal(all.length, result.candidates.length);
assert.equal(groupCandidates(all).flat().length, result.candidates.length);
const tally = rows => Object.fromEntries(['role', 'region', 'arrangement'].map(field => [field, Object.fromEntries(['supported', 'contradiction', 'conflict', 'unknown'].map(status => [status, rows.filter(row => relevanceStatus(row.relevance[field], criteria[field]) === status).length]))]));
const report = {
  offline_historical_replay: true, provenance_reconstructed: reconstructed, synthetic_reference: true,
  criteria, links: all.length, groups: groupCandidates(all).length,
  posting_patterns: result.candidates.filter(candidate => inspectCandidate(candidate).kind === 'posting').length,
  boards: result.candidates.filter(candidate => inspectCandidate(candidate).kind === 'board').length,
  evidence_counts: tally(all), modes: {},
  limits: 'Returned text only; unknowns/conflicts are reviewable, not suitable jobs. No freshness, live relevance, billing or eligibility verification. No network request.',
};
for (const [mode, filters, exact] of [
  ['prior_mentions', { ...initialResultFilters, ...criteria, skill: 'any', showCollections: false }, false],
  ['source_linked', { ...initialResultFilters, ...criteria, skill: 'any', showCollections: false }, true],
  ['strict_source_linked', { ...initialResultFilters, ...criteria, skill: 'any', showCollections: false, keepUnknown: false }, true],
]) {
  const rows = filterCandidates(result.candidates, evidence, true, filters, criteria.role, exact);
  report.modes[mode] = { links: rows.length, groups: groupCandidates(rows).length, evidence_counts: tally(rows), first_ten_evidence_counts: tally(rows.slice(0, 10)), supported_all_three: rows.filter(row => ['role', 'region', 'arrangement'].every(field => relevanceStatus(row.relevance[field], criteria[field]) === 'supported')).length };
}
const times = [];
for (let sample = 0; sample < 7; sample++) {
  const start = performance.now();
  groupCandidates(filterCandidates(result.candidates, evidence, true, { ...initialResultFilters, ...criteria, skill: 'any', showCollections: false }, criteria.role));
  if (sample > 1) times.push(performance.now() - start);
}
report.warm_frontend_filter_group_median_ms = Math.round(times.sort((a, b) => a - b)[2] * 100) / 100;
// Summary only: no paths, raw result text, links, profile or credentials printed.
console.log(JSON.stringify(report, null, 2));
