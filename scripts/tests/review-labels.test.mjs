import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { reviewInputHash, validateReviewLabels, compareReviewLabels } from '../review-labels.mjs';
import { validateSearchResult } from '../../apps/desktop/src/lib/discovery-state.ts';

const criteria = { role: 'software-engineer', region: 'india', arrangement: 'remote', seniority: 'any', skills: ['python', 'sql'] };
const root = fileURLToPath(new URL('../../', import.meta.url));
const candidate = (index, snippet, title = 'Software engineer review role') => ({ title, snippet, url: `https://job-boards.greenhouse.io/synthetic/jobs/${index}`, source_index: null });
const resultFor = candidates => validateSearchResult({ provider: 'tavily', query: 'Software engineer jobs India Remote Python SQL', candidates, retrieved_at: '2026-10-10T12:00:00Z', duplicates_removed: 0, discarded_results: 0 }, 'Software engineer jobs India Remote Python SQL');
const assess = (status, source, phrase) => ({ status, evidence: phrase ? [{ source, phrase }] : [], reason: 'Frozen synthetic judgment.' });
const labelFor = (index, supported = false) => ({ index, page_type: 'opening',
  role: assess('supported', 'title', 'Software engineer'),
  region: assess(supported ? 'supported' : 'unknown', 'snippet', supported ? 'India' : null),
  arrangement: assess(supported ? 'supported' : 'unknown', 'snippet', supported ? 'remote' : null),
  review_value: supported ? 'supported' : 'needs_review', reason: 'RAW_REASON_MARKER', requirements: [], duplicate_of: null, freshness: 'unverified' });
const rawAudit = (bytes, labels) => ({ version: 1, input_sha256: reviewInputHash(bytes), reviewer: { kind: 'independent_agent', id: 'REVIEWER_PRIVATE_MARKER', reviewed_at: '2026-10-13', blinded: true }, labels });
const evidenceFor = candidates => candidates.map((job, index) => ({ index, roles: ['software-engineer'], regions: [], arrangements: [], seniorities: [], skills: [], shared_skills: [], content: { status: 'opening' }, shortlist: { roles: [{ role: 'software-engineer', source: 'title', phrase: 'Software engineer' }], exact_tools: [], exclusions: [] } }));

test('reviews bind exact input bytes, cover every index once and stay frozen after scoring', () => {
  const result = resultFor([candidate(1, 'Location: India. Work mode: remote.')]);
  const bytes = Buffer.from(JSON.stringify(result)), raw = rawAudit(bytes, [labelFor(0, true)]);
  const audit = validateReviewLabels(raw, bytes, result);
  raw.labels[0].review_value = 'mismatch';
  assert.equal(audit.labels[0].review_value, 'supported');
  assert.ok(Object.isFrozen(audit.labels[0].region.evidence[0]));
  assert.throws(() => { audit.labels[0].review_value = 'mismatch'; });
  assert.throws(() => validateReviewLabels(rawAudit(bytes, []), bytes, result), /Invalid frozen/);
  assert.throws(() => validateReviewLabels(rawAudit(bytes, [{ ...labelFor(0, true), index: 1 }]), bytes, result));
  assert.throws(() => validateReviewLabels(rawAudit(bytes, [labelFor(0, true)]), Buffer.concat([bytes, Buffer.from(' ')]), result));
  assert.throws(() => validateReviewLabels(rawAudit(bytes, [labelFor(0, true)]), bytes, resultFor([candidate(9, 'Location: India. Work mode: remote.')])));
  assert.throws(() => compareReviewLabels(result, evidenceFor(result.candidates), criteria, rawAudit(bytes, [labelFor(0, true)])));
});

test('unknowns are explicit and invented or cross-candidate supporting phrases fail', () => {
  const result = resultFor([candidate(1, ''), candidate(2, 'Location: India. Work mode: remote.')]);
  const bytes = Buffer.from(JSON.stringify(result));
  assert.equal(validateReviewLabels(rawAudit(bytes, [labelFor(0), labelFor(1, true)]), bytes, result).labels.length, 2);
  assert.throws(() => validateReviewLabels(rawAudit(bytes, [labelFor(0, true), labelFor(1, true)]), bytes, result));
  const wrong = labelFor(1, true); wrong.region.evidence[0].phrase = 'NO_SUCH_LOCATION';
  assert.throws(() => validateReviewLabels(rawAudit(bytes, [labelFor(0), wrong]), bytes, result));
});

test('derived review values, conflict evidence, freshness and unsupported schema are checked', () => {
  const result = resultFor([candidate(1, 'Location: India. Work mode: remote. Not remote.')]);
  const bytes = Buffer.from(JSON.stringify(result));
  const conflict = labelFor(0, true);
  conflict.arrangement = { status: 'conflict', evidence: [{ source: 'snippet', phrase: 'Work mode: remote.' }, { source: 'snippet', phrase: 'Not remote.' }], reason: 'Two competing statements.' };
  conflict.review_value = 'needs_review';
  assert.equal(validateReviewLabels(rawAudit(bytes, [conflict]), bytes, result).labels[0].review_value, 'needs_review');
  for (const mutate of [
    item => { item.review_value = 'supported'; },
    item => { item.arrangement.evidence.pop(); },
    item => { item.arrangement.evidence[1] = { ...item.arrangement.evidence[0] }; },
    item => { item.freshness = 'active'; },
    item => { item.extra = 'unchecked'; },
    item => { item.duplicate_of = 0; },
  ]) {
    const changed = structuredClone(conflict); mutate(changed);
    assert.throws(() => validateReviewLabels(rawAudit(bytes, [changed]), bytes, result));
  }
  const invalidDate = rawAudit(bytes, [conflict]); invalidDate.reviewer.reviewed_at = '2026-02-31';
  assert.throws(() => validateReviewLabels(invalidDate, bytes, result));
});

test('supported alternatives and primary precision use actual group counts and retain unknowns separately', () => {
  const candidates = [candidate(1, ''), candidate(2, 'Location: India. Work mode: remote.')];
  const result = resultFor(candidates), bytes = Buffer.from(JSON.stringify(result));
  const audit = validateReviewLabels(rawAudit(bytes, [labelFor(0), labelFor(1, true)]), bytes, result);
  const report = compareReviewLabels(result, evidenceFor(candidates), criteria, audit);
  const manual = report.modes.selected_manual, strict = report.modes.selected_assisted_strict;
  assert.deepEqual(report.label_counts, { supported: 1, needs_review: 1, mismatch: 0 });
  assert.equal(manual.retained_links, 2);
  assert.equal(manual.first_ten.displayed_groups, 1);
  assert.equal(manual.first_ten.primary_labels.supported, 0);
  assert.equal(manual.first_ten.primary_labels.needs_review, 1);
  assert.equal(manual.first_ten.groups_with_supported_alternative, 1);
  assert.equal(manual.first_ten.supported_primary_share, 0);
  assert.equal(strict.first_ten.displayed_groups, 1);
  assert.equal(strict.first_ten.supported_primary_share, 1);
  assert.deepEqual(manual.supported_group_retention, { retained: 1, total: 1 });
});

test('field disagreements remain visible without exporting labels, identity or raw sources', () => {
  const candidates = [candidate(1, 'Location: India. Work mode: remote. RAW_TEXT_MARKER')];
  const result = resultFor(candidates), bytes = Buffer.from(JSON.stringify(result));
  const audit = validateReviewLabels(rawAudit(bytes, [labelFor(0)]), bytes, result);
  const output = compareReviewLabels(result, evidenceFor(candidates), criteria, audit);
  assert.equal(output.field_agreement.region.matches, 0);
  assert.equal(output.field_agreement.region.matrix.unknown.supported, 1);
  const json = JSON.stringify(output);
  for (const marker of ['RAW_TEXT_MARKER', 'RAW_REASON_MARKER', 'REVIEWER_PRIVATE_MARKER', candidates[0].url, 'input_sha256']) assert.ok(!json.includes(marker));
});

test('empty-pool scores stay unmeasured and zero support has a zero denominator', () => {
  const result = resultFor([]), bytes = Buffer.from(JSON.stringify(result));
  const output = compareReviewLabels(result, [], criteria, validateReviewLabels(rawAudit(bytes, []), bytes, result));
  assert.equal(output.modes.selected_manual.first_ten.supported_primary_share, null);
  assert.deepEqual(output.modes.selected_manual.supported_link_retention, { retained: 0, total: 0 });
});

test('the approved no-tools arm binds its exact query and frozen labels through the CLI', () => {
  // A clean checkout has no ignored .local folder; own only this fresh fixture.
  const directory = mkdtempSync(resolve(tmpdir(), 'jobscout-quality-cli-'));
  const inputPath = resolve(directory, 'result.json'), auditPath = resolve(directory, 'review.json');
  try {
    const result = { ...resultFor([candidate(1, 'Location: India. Work mode: remote.')]), query: 'Software engineer jobs India Remote' };
    const bytes = Buffer.from(JSON.stringify(result));
    writeFileSync(inputPath, bytes); writeFileSync(auditPath, JSON.stringify(rawAudit(bytes, [labelFor(0, true)])));
    const invoke = args => spawnSync(process.execPath, ['--experimental-strip-types', resolve(root, 'scripts/review-search-quality.mjs'), ...args], { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
    const reviewed = invoke([inputPath, auditPath, '--case', 'software-india-remote']);
    assert.equal(reviewed.status, 0);
    const report = JSON.parse(reviewed.stdout);
    assert.equal(report.review_case, 'software-india-remote');
    assert.deepEqual(report.criteria.skills, []);
    assert.equal(report.frozen_review.candidate_labels, 1);
    assert.equal(report.frozen_review.modes.selected_manual.first_ten.primary_labels.supported, 1);
    for (const args of [[inputPath, auditPath], [inputPath, '--case', 'unknown-case']]) {
      const rejected = invoke(args);
      assert.equal(rejected.status, 1);
      assert.equal(rejected.stdout, '');
      assert.ok(!rejected.stderr.includes(directory));
    }
  } finally {
    unlinkSync(inputPath); unlinkSync(auditPath); rmdirSync(directory);
  }
});

test('all predeclared public cases match production engine queries without vault or dispatch', () => {
  const verified = spawnSync(resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'), [resolve(root, 'scripts/verify-quality-cases.py'), '--verify-only'], { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(verified.status, 0);
  const report = JSON.parse(verified.stdout), registry = JSON.parse(readFileSync(resolve(root, 'evaluation/search-quality-cases.json'), 'utf8'));
  assert.equal(report.requests, 0);
  assert.equal(report.vault_access, false);
  assert.deepEqual(report.cases.map(item => item.query), registry.cases.map(item => item.expected_query));
  assert.deepEqual(report.proposed_comparison, ['software-india-remote-tools', 'software-india-remote']);
  assert.equal(report.comparison_request_ceiling, 10);
});

for (const caseId of ['quality-india-remote', 'analyst-canada-hybrid']) {
  test(`${caseId} binds registered criteria, labels and its own synthetic tool reference`, () => {
    const registry = JSON.parse(readFileSync(resolve(root, 'evaluation/search-quality-cases.json'), 'utf8'));
    const item = registry.cases.find(value => value.id === caseId);
    const title = caseId === 'quality-india-remote' ? 'Quality engineer' : 'Data analyst';
    const country = caseId === 'quality-india-remote' ? 'India' : 'Canada';
    const mode = item.criteria.arrangement;
    // The tenth-boundary unknown moves forward only with this case's tools.
    // A reused Python/SQL reference would favor the ten earlier candidates.
    const candidates = Array.from({ length: 10 }, (_, index) => candidate(index, `Location: ${country}. Work mode: ${mode}. Python SQL.`, `${title} synthetic role ${index}`));
    candidates.push(candidate(10, item.synthetic_reference, `${title} synthetic tool role`));
    candidates.push(candidate(11, `Location: ${country}. Work mode: ${mode}.`, 'Software engineer other role'));
    const labels = candidates.map((job, index) => ({ ...labelFor(index),
      role: assess(index === 11 ? 'contradiction' : 'supported', 'title', index === 11 ? 'Software engineer' : title),
      region: assess(index === 10 ? 'unknown' : 'supported', 'snippet', index === 10 ? null : country),
      arrangement: assess(index === 10 ? 'unknown' : 'supported', 'snippet', index === 10 ? null : mode),
      review_value: index === 11 ? 'mismatch' : index === 10 ? 'needs_review' : 'supported',
    }));
    const result = { ...resultFor([]), query: item.expected_query,
      candidates: candidates.map(job => ({ ...job, source_index: 0 })),
      coverage: { attempted: 5, completed: 5, max_requests: 5, stop_reason: 'complete', failures: [] } };
    const bytes = Buffer.from(JSON.stringify(result));
    const directory = mkdtempSync(resolve(tmpdir(), 'jobscout-quality-cli-'));
    const inputPath = resolve(directory, 'result.json'), auditPath = resolve(directory, 'review.json');
    try {
      writeFileSync(inputPath, bytes); writeFileSync(auditPath, JSON.stringify(rawAudit(bytes, labels)));
      const invoke = selected => spawnSync(process.execPath, ['--experimental-strip-types', resolve(root, 'scripts/review-search-quality.mjs'), inputPath, auditPath, '--case', selected], { cwd: root, encoding: 'utf8', timeout: 30000, windowsHide: true });
      const reviewed = invoke(caseId);
      assert.equal(reviewed.status, 0, reviewed.stderr);
      const report = JSON.parse(reviewed.stdout);
      assert.equal(report.review_case, caseId);
      assert.deepEqual(report.criteria, item.criteria);
      assert.deepEqual(report.frozen_review.label_counts, { supported: 10, needs_review: 1, mismatch: 1 });
      const modes = report.frozen_review.modes;
      assert.equal(modes.selected_manual.retained_links, 11);
      assert.equal(modes.selected_manual.first_ten.primary_labels.supported, 10);
      assert.equal(modes.selected_assisted.first_ten.primary_labels.supported, 9);
      assert.equal(modes.selected_assisted.first_ten.primary_labels.needs_review, 1);
      assert.deepEqual(modes.selected_assisted_strict.supported_link_retention, { retained: 10, total: 10 });
      assert.equal(modes.selected_assisted_strict.retained_links, 10);
      const rejected = invoke(caseId === 'quality-india-remote' ? 'analyst-canada-hybrid' : 'quality-india-remote');
      assert.equal(rejected.status, 1);
      assert.equal(rejected.stdout, '');
      for (const marker of [directory, 'REVIEWER_PRIVATE_MARKER', 'RAW_REASON_MARKER', candidates[0].url]) {
        assert.ok(!reviewed.stdout.includes(marker)); assert.ok(!rejected.stderr.includes(marker));
      }
    } finally {
      unlinkSync(inputPath); unlinkSync(auditPath); rmdirSync(directory);
    }
  });
}
