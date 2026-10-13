// Deliberate offline replay of the four predeclared public quality cases.
// Only aggregates leave this runner; public raw responses stay local/ignored.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSearchResult } from '../apps/desktop/src/lib/discovery-state.ts';
import { validateAssistance } from '../apps/desktop/src/lib/assistance.ts';
import { searchQualityReport } from './search-quality-report.mjs';
import { validateReviewLabels, compareReviewLabels } from './review-labels.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const cases = {
  'software-india-remote-tools': { query: 'Software engineer jobs India Remote Python SQL', criteria: { role: 'software-engineer', region: 'india', arrangement: 'remote', seniority: 'any', skills: ['python', 'sql'] }, reference: 'Software engineer Python SQL' },
  'software-india-remote': { query: 'Software engineer jobs India Remote', criteria: { role: 'software-engineer', region: 'india', arrangement: 'remote', seniority: 'any', skills: [] }, reference: 'Software engineer Python SQL' },
  'quality-india-remote': { query: 'Quality engineer jobs India Remote .NET Software testing', criteria: { role: 'quality-engineer', region: 'india', arrangement: 'remote', seniority: 'any', skills: ['dotnet', 'testing'] }, reference: 'Quality engineer .NET software testing' },
  'analyst-canada-hybrid': { query: 'Data analyst jobs Canada Hybrid Data analytics SQL', criteria: { role: 'data-analyst', region: 'canada', arrangement: 'hybrid', seniority: 'any', skills: ['analytics', 'sql'] }, reference: 'Data analyst SQL data analytics' },
};
try {
  const args = process.argv.slice(2);
  let caseId = 'software-india-remote-tools';
  if (args.at(-2) === '--case') { caseId = args.pop(); args.pop(); }
  if (![1, 2].includes(args.length) || !Object.hasOwn(cases, caseId)) throw new Error();
  const { query, criteria, reference: review } = cases[caseId];
  const inputBytes = readFileSync(resolve(args[0]));
  const result = validateSearchResult(JSON.parse(inputBytes.toString('utf8').replace(/^\uFEFF/, '')), query);
  const audit = args[1] ? validateReviewLabels(JSON.parse(readFileSync(resolve(args[1]), 'utf8').replace(/^\uFEFF/, '')), inputBytes, result) : null;
  const python = resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  const analysis = spawnSync(python, ['-c', 'import json,sys; from jobscout_engine.domain.assistance import analyze_review; print(json.dumps(analyze_review(json.load(sys.stdin))))'], {
    cwd: root,
    input: JSON.stringify({ text: review, reviewed: true, candidates: result.candidates.map(({ title, snippet }) => ({ title, snippet })) }),
    encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024, windowsHide: true,
  });
  if (analysis.error || analysis.status !== 0) throw new Error();
  const evidence = validateAssistance(JSON.parse(analysis.stdout), result.candidates.length, review, result.candidates).matches;
  const report = searchQualityReport(result, evidence, criteria);
  report.review_case = caseId;
  if (audit) {
    report.frozen_review = compareReviewLabels(result, evidence, criteria, audit);
    report.limits = 'Saved-envelope returned-text diagnosis with one separately frozen review; see frozen_review limits. Suitability, freshness, representative independent relevance and billing remain unverified. No network request.';
  }
  console.log(JSON.stringify(report, null, 2));
} catch {
  // Never print input content, filenames, paths or child-process diagnostics.
  console.error('Offline review failed. Supply one valid local result envelope for the documented fixed criteria and set up the local engine. No network request was performed.');
  process.exitCode = 1;
}
