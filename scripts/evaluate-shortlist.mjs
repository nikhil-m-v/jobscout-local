import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { filterCandidates, initialResultFilters } from '../apps/desktop/src/lib/result-filters.ts';
import { validateAssistance } from '../apps/desktop/src/lib/assistance.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(root, 'evaluation/shortlist-cases.json'), 'utf8').replace(/^\uFEFF/, ''));
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
  const cleaned = filterCandidates(candidates, evidence, true, initialResultFilters);
  assert.equal(cleaned.filter(row => item.candidates[row.index].relevant).length, relevantTotal, `${item.id}: content filtering lost a labeled relevant candidate`);
  const baseline = filterCandidates(candidates, evidence, true, { ...initialResultFilters, showResources: true });
  const relevantAtFive = rows => rows.slice(0, 5).filter(row => item.candidates[row.index].relevant).length;
  assert.ok(relevantAtFive(cleaned) >= relevantAtFive(baseline), `${item.id}: content filtering degraded top-five relevance`);

  for (const [mode, ranked, filters] of [
    ['Provider order', false, { ...initialResultFilters, showResources: true }],
    ['Resume baseline', true, { ...initialResultFilters, showResources: true }],
    ['Resume ordering', true, initialResultFilters],
    ['Reviewed filters', true, { ...initialResultFilters, ...item.filters }],
    ['Strict known filters', true, { ...initialResultFilters, ...item.filters, keepUnknown: false }],
  ]) {
    const shown = filterCandidates(candidates, evidence, ranked, filters);
    const precision = limit => {
      const top = shown.slice(0, limit);
      return top.length ? percent(top.filter(row => item.candidates[row.index].relevant).length / top.length) : 'n/a';
    };
    const retained = shown.filter(row => item.candidates[row.index].relevant).length;
    const noise = shown.slice(0, 5).filter(row => !item.candidates[row.index].relevant).map(row => item.candidates[row.index].id).join(', ') || 'none';
    console.log(`| ${item.id} | ${mode} | ${shown.length} | ${precision(5)} | ${precision(10)} | ${retained}/${relevantTotal} | ${noise} |`);
  }
}
console.log('\nPrecision divides by actual displayed count up to k. Retention divides by all relevant fixture candidates. Empty results have n/a precision.');
console.log('This evaluates local pools of up to 50 candidates; it does not establish live 30-50-job coverage, freshness, provider cost or latency.');
