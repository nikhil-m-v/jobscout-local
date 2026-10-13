// Frozen public-text judgments. Validation proves binding/completeness/literal
// sources, not reviewer independence, semantic correctness or active vacancies.
import { createHash } from 'node:crypto';
import { searchQualityModes } from './search-quality-report.mjs';
import { groupCandidates } from '../apps/desktop/src/lib/candidate-pool.ts';
import { relevanceStatus } from '../apps/desktop/src/lib/relevance.ts';
import { postingSources } from '../apps/desktop/src/lib/search-plan.ts';
import { validateSearchResult } from '../apps/desktop/src/lib/discovery-state.ts';

const statuses = ['supported', 'contradiction', 'conflict', 'unknown'];
const values = ['supported', 'needs_review', 'mismatch'];
const fields = ['role', 'region', 'arrangement'];
const validatedAudits = new WeakMap();
const fail = () => { throw new Error('Invalid frozen public-text review.'); };
const keys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...expected].sort().join(',');
const reason = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 600 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
export const reviewInputHash = bytes => createHash('sha256').update(bytes).digest('hex');

export function validateReviewLabels(raw, inputBytes, result) {
  let boundResult;
  try { boundResult = validateSearchResult(JSON.parse(inputBytes.toString('utf8').replace(/^\uFEFF/, '')), result.query); } catch { fail(); }
  if (JSON.stringify(boundResult) !== JSON.stringify(result)) fail();
  if (!keys(raw, ['version', 'input_sha256', 'reviewer', 'labels']) || raw.version !== 1 || raw.input_sha256 !== reviewInputHash(inputBytes)
    || !keys(raw.reviewer, ['kind', 'id', 'reviewed_at', 'blinded']) || !['independent_agent', 'human'].includes(raw.reviewer.kind)
    || !reason(raw.reviewer.id) || raw.reviewer.blinded !== true || typeof raw.reviewer.reviewed_at !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(raw.reviewer.reviewed_at) || !Number.isFinite(Date.parse(raw.reviewer.reviewed_at))
    || new Date(raw.reviewer.reviewed_at).toISOString().slice(0, 10) !== raw.reviewer.reviewed_at
    || !Array.isArray(raw.labels) || raw.labels.length !== result.candidates.length) fail();
  const exact = (entry, candidate, requiredKeys = ['source', 'phrase']) => keys(entry, requiredKeys) && ['title', 'snippet'].includes(entry.source)
    && typeof entry.phrase === 'string' && entry.phrase.trim().length > 0 && entry.phrase.length <= 500 && candidate[entry.source].includes(entry.phrase);
  raw.labels.forEach((label, index) => {
    const candidate = result.candidates[index];
    if (!keys(label, ['index', 'page_type', ...fields, 'review_value', 'reason', 'requirements', 'duplicate_of', 'freshness']) || label.index !== index
      || !['opening', 'collection', 'resource', 'unclear'].includes(label.page_type) || !values.includes(label.review_value) || !reason(label.reason)
      || !Array.isArray(label.requirements) || label.requirements.length > 20 || label.freshness !== 'unverified'
      || (label.duplicate_of !== null && (!Number.isInteger(label.duplicate_of) || label.duplicate_of < 0 || label.duplicate_of >= index))) fail();
    for (const field of fields) {
      const assessment = label[field];
      if (!keys(assessment, ['status', 'evidence', 'reason']) || !statuses.includes(assessment.status) || !reason(assessment.reason)
        || !Array.isArray(assessment.evidence) || assessment.evidence.length > 10 || !assessment.evidence.every(entry => exact(entry, candidate))
        || new Set(assessment.evidence.map(entry => JSON.stringify([entry.source, entry.phrase]))).size !== assessment.evidence.length
        || (assessment.status !== 'unknown' && assessment.evidence.length === 0)
        || (assessment.status === 'conflict' && assessment.evidence.length < 2)) fail();
    }
    if (!label.requirements.every(entry => ['schedule', 'location', 'authorization', 'sponsorship'].includes(entry.kind) && exact(entry, candidate, ['kind', 'source', 'phrase']))) fail();
    const contradiction = fields.some(field => label[field].status === 'contradiction');
    const nonOpening = ['collection', 'resource'].includes(label.page_type);
    const supported = label.page_type === 'opening' && fields.every(field => label[field].status === 'supported');
    const expectedValue = contradiction || nonOpening ? 'mismatch' : supported ? 'supported' : 'needs_review';
    if (label.review_value !== expectedValue) fail();
  });
  // Return a detached frozen artifact: later mutation cannot rewrite the labels
  // in the same process after seeing algorithm scores.
  const freeze = value => {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  };
  const audit = freeze(JSON.parse(JSON.stringify(raw)));
  validatedAudits.set(audit, result);
  return audit;
}

export function compareReviewLabels(result, evidence, criteria, audit) {
  if (validatedAudits.get(audit) !== result) fail();
  const modes = searchQualityModes(result, evidence, criteria);
  const labels = audit.labels;
  const total = Object.fromEntries(values.map(value => [value, labels.filter(label => label.review_value === value).length]));
  const tally = rows => Object.fromEntries(values.map(value => [value, rows.filter(row => labels[row.index].review_value === value).length]));
  const groupTally = groups => Object.fromEntries(values.map(value => [value, groups.filter(group => group.some(row => labels[row.index].review_value === value)).length]));
  const groupSupportedTotal = groupCandidates(modes.all_returned_provider_order).filter(group => group.some(row => labels[row.index].review_value === 'supported')).length;
  const perMode = Object.fromEntries(Object.entries(modes).map(([mode, rows]) => {
    const groups = groupCandidates(rows), firstTen = groups.slice(0, 10), primaries = firstTen.map(group => group[0]);
    const retained = tally(rows), primary = tally(primaries), any = groupTally(firstTen);
    const retainedSupportedGroups = groupTally(groups).supported;
    return [mode, {
      retained_links: rows.length, displayed_groups: groups.length, retained_labels_by_link: retained,
      supported_link_retention: { retained: retained.supported, total: total.supported },
      supported_group_retention: { retained: retainedSupportedGroups, total: groupSupportedTotal },
      first_ten: { displayed_groups: firstTen.length, primary_labels: primary,
        groups_with_supported_alternative: any.supported,
        supported_primary_share: firstTen.length ? primary.supported / firstTen.length : null,
        needs_review_primary_share: firstTen.length ? primary.needs_review / firstTen.length : null,
        // Group categories can overlap; only primary_labels partitions the list.
        group_label_presence: any },
    }];
  }));
  const all = modes.all_returned_provider_order;
  const agreement = Object.fromEntries(fields.map(field => [field, {
    matches: all.filter(row => relevanceStatus(row.relevance[field], criteria[field]) === labels[row.index][field].status).length,
    compared: all.length,
    matrix: Object.fromEntries(statuses.map(manual => [manual, Object.fromEntries(statuses.map(machine => [machine, all.filter(row => labels[row.index][field].status === manual && relevanceStatus(row.relevance[field], criteria[field]) === machine).length]))])),
  }]));
  const bySource = [...postingSources.map((source, index) => ({ source: source.name, index })), { source: 'Unscoped', index: null }].map(source => ({
    source: source.source,
    labels_by_link: tally(all.filter(row => (row.candidate.source_index ?? null) === source.index)),
  }));
  return {
    reviewer_kind: audit.reviewer.kind, reviewed_at: audit.reviewer.reviewed_at, blinding_declared: audit.reviewer.blinded,
    input_binding_verified: true, candidate_labels: labels.length, label_counts: total,
    page_types: Object.fromEntries(['opening', 'collection', 'resource', 'unclear'].map(type => [type, labels.filter(label => label.page_type === type).length])),
    reviewer_requirement_links: labels.filter(label => label.requirements.length > 0).length,
    suspected_duplicate_links: labels.filter(label => label.duplicate_of !== null).length,
    per_source: bySource, field_agreement: agreement, modes: perMode,
    limits: 'One blinded reviewer declaration for one saved envelope; literal-source validation does not prove semantic accuracy or independence. Disagreements are unadjudicated. Supported means returned-text support, not suitable/eligible/active vacancy. Needs-review is separate from support; suspected duplicates are not merged as verified jobs. No representative or human acceptance claim.',
  };
}
