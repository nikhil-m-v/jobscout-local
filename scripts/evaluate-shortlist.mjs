import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { filterCandidates, initialResultFilters } from '../apps/desktop/src/lib/result-filters.ts';
import { validateAssistance } from '../apps/desktop/src/lib/assistance.ts';
import './evaluate-candidate-pool.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(root, 'evaluation/shortlist-cases.json'), 'utf8').replace(/^\uFEFF/, ''));
const relevanceFixture = JSON.parse(readFileSync(resolve(root, 'evaluation/relevance-cases.json'), 'utf8'));
assert.equal(relevanceFixture.version, 1);
fixture.cases.push(...relevanceFixture.cases);
assert.equal(fixture.version, 1);
assert.ok(fixture.cases.length > 0);
assert.equal(new Set(fixture.cases.map(item => item.id)).size, fixture.cases.length);
for (const item of fixture.cases) {
  assert.ok(item.candidates.length > 0 && item.candidates.length <= 50);
  assert.equal(new Set(item.candidates.map(candidate => candidate.id)).size, item.candidates.length);
  assert.ok(item.candidates.some(candidate => candidate.relevant));
  for (const candidate of item.candidates) {
    assert.equal(typeof candidate.relevant, 'boolean');
    assert.ok(candidate.reason.length > 0);
  }
}
const python = resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const analysis = spawnSync(python, ['-c', `
import json, sys
from jobscout_engine.domain.assistance import analyze_review
cases = json.load(sys.stdin)
print(json.dumps([analyze_review({
    'text': item['review'], 'reviewed': True,
    'candidates': [{'title': c['title'], 'snippet': c['snippet']} for c in item['candidates']]
}) for item in cases]))
`], { cwd: root, input: JSON.stringify(fixture.cases), encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
if (analysis.error || analysis.status !== 0) throw new Error('Local evaluation analysis failed. Install the engine in .venv as described in README.');
const results = JSON.parse(analysis.stdout);
assert.equal(results.length, fixture.cases.length);
const percent = value => `${Math.round(value * 100)}%`;
console.log('Synthetic shortlist evaluation: no provider calls; labels are fixture judgments, not live vacancy verification.');
console.log('| Case | Mode | Shown | Relevant@5 | Relevant@10 | Relevant retained | Irrelevant in top 5 |');
console.log('|---|---|---:|---:|---:|---:|---|');
for (const [position, item] of fixture.cases.entries()) {
  const candidates = item.candidates.map(candidate => ({ title: candidate.title, snippet: candidate.snippet, url: `https://jobs.example.com/${candidate.id}` }));
  const evidence = validateAssistance(results[position], candidates.length, item.review, candidates).matches;
  const relevantTotal = item.candidates.filter(candidate => candidate.relevant).length;
  const cleaned = filterCandidates(candidates, evidence, true, initialResultFilters, 'any', false);
  assert.equal(cleaned.filter(row => item.candidates[row.index].relevant).length, relevantTotal, `${item.id}: content filtering lost a labeled relevant candidate`);
  const baseline = filterCandidates(candidates, evidence, true, { ...initialResultFilters, showResources: true }, 'any', false);
  const reviewedRole = item.filters.role ?? results[position].criteria?.role ?? 'any';
  const roleOrdered = filterCandidates(candidates, evidence, true, initialResultFilters, reviewedRole);
  const priorRoleOrdered = filterCandidates(candidates, evidence, true, initialResultFilters, reviewedRole, false);
  assert.deepEqual(roleOrdered.map(row => row.index).sort((a, b) => a - b), cleaned.map(row => row.index).sort((a, b) => a - b), `${item.id}: role ordering changed retention`);
  const relevantAtFive = rows => rows.slice(0, 5).filter(row => item.candidates[row.index].relevant).length;
  assert.ok(relevantAtFive(cleaned) >= relevantAtFive(baseline), `${item.id}: content filtering degraded top-five relevance`);
  assert.ok(relevantAtFive(roleOrdered) >= relevantAtFive(cleaned), `${item.id}: role ordering degraded top-five relevance`);
  const relevantAtTen = rows => rows.slice(0, 10).filter(row => item.candidates[row.index].relevant).length;
  assert.ok(relevantAtTen(roleOrdered) >= relevantAtTen(cleaned), `${item.id}: role ordering degraded top-ten relevance`);
  assert.ok(relevantAtFive(roleOrdered) >= relevantAtFive(priorRoleOrdered), `${item.id}: exact evidence degraded top-five relevance`);
  assert.ok(relevantAtTen(roleOrdered) >= relevantAtTen(priorRoleOrdered), `${item.id}: exact evidence degraded top-ten relevance`);

  for (const [mode, ranked, filters] of [
    ['Provider order', false, { ...initialResultFilters, showResources: true }],
    ['Resume baseline', true, { ...initialResultFilters, showResources: true }],
    ['Resume ordering', true, initialResultFilters],
    ['Reviewed-role ordering', true, initialResultFilters],
    ['Evidence-led shortlist', true, initialResultFilters],
    ['Reviewed filters', true, { ...initialResultFilters, ...item.filters }],
    ['Source-linked filters', true, { ...initialResultFilters, ...item.filters }],
    ['Strict source-linked filters', true, { ...initialResultFilters, ...item.filters, keepUnknown: false }],
    ['Strict known filters', true, { ...initialResultFilters, ...item.filters, keepUnknown: false }],
  ]) {
    const sourceLinked = ['Source-linked filters', 'Strict source-linked filters'].includes(mode);
    const shown = filterCandidates(candidates, evidence, ranked, filters, sourceLinked || ['Reviewed-role ordering', 'Evidence-led shortlist'].includes(mode) ? reviewedRole : 'any', sourceLinked || mode === 'Evidence-led shortlist');
    const precision = limit => {
      const top = shown.slice(0, limit);
      return top.length ? percent(top.filter(row => item.candidates[row.index].relevant).length / top.length) : 'n/a';
    };
    const retained = shown.filter(row => item.candidates[row.index].relevant).length;
    if (mode === 'Source-linked filters') {
      assert.equal(retained, relevantTotal, `${item.id}: source-linked filtering lost a labeled reviewable candidate`);
      if (item.id === 'explicit-location-work-mode') {
        assert.equal(shown.length, 7);
        assert.equal(relevantAtFive(shown), 5);
        assert.equal(filterCandidates(candidates, evidence, true, { ...filters, keepUnknown: false }, reviewedRole).length, 4);
      }
    }
    const noise = shown.slice(0, 5).filter(row => !item.candidates[row.index].relevant).map(row => item.candidates[row.index].id).join(', ') || 'none';
    console.log(`| ${item.id} | ${mode} | ${shown.length} | ${precision(5)} | ${precision(10)} | ${retained}/${relevantTotal} | ${noise} |`);
  }
}
console.log('\nPrecision divides by actual displayed count up to k. Retention divides by all relevant fixture candidates. Empty results have n/a precision.');
console.log('This evaluates local pools of up to 50 candidates; it does not establish live 30-50-job coverage, freshness, provider cost or latency.');
