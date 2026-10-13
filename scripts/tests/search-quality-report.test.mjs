import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateSearchResult } from '../../apps/desktop/src/lib/discovery-state.ts';
import { validateAssistance } from '../../apps/desktop/src/lib/assistance.ts';
import { searchQualityReport } from '../search-quality-report.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const criteria = { role: 'software-engineer', region: 'india', arrangement: 'remote', seniority: 'any', skills: ['python', 'sql'] };
const query = 'Software engineer jobs India Remote Python SQL';
const job = (id, snippet, title = `Software engineer ${id}`) => ({ title, snippet, url: `https://job-boards.greenhouse.io/synthetic/jobs/${id}`, source_index: 0 });
const envelope = (candidates, coverage = { attempted: 5, completed: 5, max_requests: 5, stop_reason: 'complete', failures: [] }) => validateSearchResult({
  provider: 'tavily', query, candidates, retrieved_at: '2026-10-10T12:00:00Z', duplicates_removed: 0, discarded_results: 0, ...(coverage ? { coverage } : {}),
}, query);
function report(candidates, coverage) {
  const result = envelope(candidates, coverage);
  const review = 'Software engineer Python SQL';
  const analysis = spawnSync(resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'), ['-c', 'import json,sys; from jobscout_engine.domain.assistance import analyze_review; print(json.dumps(analyze_review(json.load(sys.stdin))))'], {
    cwd: root, input: JSON.stringify({ text: review, reviewed: true, candidates: candidates.map(({ title, snippet }) => ({ title, snippet })) }), encoding: 'utf8', timeout: 30000, windowsHide: true,
  });
  assert.equal(analysis.status, 0, 'Synthetic local analysis must succeed');
  const evidence = validateAssistance(JSON.parse(analysis.stdout), candidates.length, review, candidates).matches;
  return searchQualityReport(result, evidence, criteria);
}

test('first ten count display groups and inspect alternatives without merging separate evidence', () => {
  const candidates = Array.from({ length: 11 }, (_, i) => job(i + 1, 'Python SQL.'));
  candidates.splice(0, 1,
    job(101, 'Python SQL.', 'Software engineer shared role'),
    job(102, 'Location: India. Work mode: remote. Python SQL.', 'Software engineer shared role'));
  candidates.push(job(201, 'Location: India. Python SQL.', 'Software engineer split evidence'),
    job(202, 'Work mode: remote. Python SQL.', 'Software engineer split evidence'));
  const mode = report(candidates).modes.selected_manual;
  assert.equal(mode.pool.links, 14);
  assert.equal(mode.pool.groups, 12);
  assert.equal(mode.pool.links_folded_as_alternatives, 2);
  assert.equal(mode.pool.groups_with_joint_supported_link, 1);
  assert.equal(mode.pool.primary_joint_supported_groups, 0);
  assert.equal(mode.first_ten_groups.displayed_groups, 10);
  assert.equal(mode.first_ten_groups.primary_links.links, 10);
  assert.equal(mode.first_ten_groups.primary_links.joint_supported_links, 0);
  assert.equal(mode.first_ten_groups.groups_with_joint_supported_alternative, 1);
});

test('source accounting preserves outside-scope, board, unknown and unscoped distinctions', () => {
  const candidates = [job(1, 'Location: India. Work mode: remote.'),
    { ...job(2, ''), url: 'https://careers.smartrecruiters.com/synthetic', source_index: 4 },
    { ...job(3, ''), url: 'https://jobs.example.com/synthetic', source_index: 1 }];
  const output = report(candidates);
  assert.equal(output.sources[0].posting_patterns, 1);
  assert.equal(output.sources[4].board_patterns, 1);
  assert.equal(output.sources[4].outside_scope_links, 1);
  assert.equal(output.sources[1].unknown_patterns, 1);
  assert.equal(output.sources[1].outside_scope_links, 1);
  assert.equal(output.sources[5].returned.links, 0);
  assert.equal(output.sources.reduce((n, source) => n + source.returned.links, 0), candidates.length);
});

test('ordering and filtering separate retained unknowns, contradictions and supported restrictions', () => {
  const candidates = [...Array.from({ length: 11 }, (_, i) => job(i + 1, 'Python SQL.')),
    job(12, 'Location: India. Work mode: remote. Must physically reside in India.'),
    job(13, 'Location: Canada. Work mode: remote. Python SQL.')];
  const output = report(candidates);
  const manual = output.modes.selected_manual, assisted = output.modes.selected_assisted, strict = output.modes.selected_assisted_strict;
  assert.deepEqual(manual.pool, assisted.pool);
  assert.equal(assisted.pool.links, 12);
  assert.equal(assisted.pool.evidence_by_link.region.unknown, 11);
  assert.equal(output.modes.all_returned_provider_order.pool.evidence_by_link.region.contradiction, 1);
  assert.equal(assisted.first_ten_groups.primary_links.joint_supported_links, 0);
  assert.equal(assisted.pool.groups_with_joint_supported_link, 1);
  assert.equal(strict.pool.links, 1);
  assert.equal(strict.pool.joint_supported_groups_with_requirements, 1);
  assert.equal(strict.pool.requirements_by_kind.location, 1);
  assert.equal(strict.first_ten_groups.displayed_groups, 1);
  assert.equal(output.unmeasured.verified_suitable_jobs, null);
  assert.equal(output.unmeasured.independent_relevance_precision, null);
});

test('empty and partial pools do not imply completed sources or successful quality', () => {
  const partial = { attempted: 2, completed: 1, max_requests: 5, stop_reason: 'provider_failure', failures: [{ request: 2, code: 'provider_timeout' }] };
  const output = report([], partial);
  assert.deepEqual(output.sources.map(source => source.request_state), ['completed', 'attempted_without_completion', 'not_attempted', 'not_attempted', 'not_attempted', 'unscoped']);
  assert.equal(output.modes.selected_assisted.first_ten_groups.displayed_groups, 0);
  assert.equal(output.unmeasured.current_vacancy_status, null);
  assert.equal(output.unmeasured.actual_billed_credits, null);
  assert.equal(output.unmeasured.provider_latency_seconds, null);
});

test('resource pages cannot inflate the joint-supported opportunity-review pool', () => {
  const output = report([job(1, 'Location: India. Work mode: remote. Python SQL.', 'Software engineer interview guide')]);
  assert.equal(output.modes.all_returned_provider_order.pool.links, 1);
  assert.equal(output.modes.all_returned_provider_order.pool.reviewable_groups, 0);
  assert.equal(output.modes.all_returned_provider_order.pool.joint_supported_links, 0);
  assert.equal(output.modes.selected_assisted.pool.links, 0);
});

test('single-query provenance stays unscoped without inventing an ATS request', () => {
  const output = report([{ ...job(1, 'Location: India. Work mode: remote.'), source_index: null }], null);
  assert.equal(output.sources[5].returned.links, 1);
  assert.equal(output.sources[5].returned.groups_with_joint_supported_link, 1);
  assert.ok(output.sources.slice(0, 5).every(source => source.request_state === 'not_in_plan' && source.returned.links === 0));
  assert.equal(output.coverage, null);
});

test('aggregate report and CLI errors do not export raw text, URLs or input paths', () => {
  const output = report([job(1, 'PRIVATE_TEXT_MARKER Python SQL.', 'Software engineer PRIVATE_TITLE_MARKER')]);
  const json = JSON.stringify(output);
  for (const marker of ['PRIVATE_TEXT_MARKER', 'PRIVATE_TITLE_MARKER', 'job-boards.greenhouse.io/synthetic', 'Python SQL.']) assert.ok(!json.includes(marker));
  const failure = spawnSync(process.execPath, ['--experimental-strip-types', resolve(root, 'scripts/review-search-quality.mjs'), 'PRIVATE_PATH_MARKER'], { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(failure.status, 1);
  assert.equal(failure.stdout, '');
  assert.ok(!failure.stderr.includes('PRIVATE_PATH_MARKER'));
  assert.match(failure.stderr, /No network request was performed/);
});
