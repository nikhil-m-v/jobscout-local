// Offline diagnostics using production helpers. Returned-text support is not a
// relevance label, an eligibility decision, or a verified active vacancy.
import { filterCandidates, initialResultFilters } from '../apps/desktop/src/lib/result-filters.ts';
import { groupCandidates, inspectCandidate, isCollection } from '../apps/desktop/src/lib/candidate-pool.ts';
import { relevanceStatus } from '../apps/desktop/src/lib/relevance.ts';
import { candidateRequirements, workRequirementLabels } from '../apps/desktop/src/lib/work-requirements.ts';
import { postingSources } from '../apps/desktop/src/lib/search-plan.ts';
import { validatePublicSearchCriteria } from '../apps/desktop/src/lib/public-search-criteria.ts';

export function searchQualityModes(result, evidence, rawCriteria) {
  const criteria = validatePublicSearchCriteria(rawCriteria);
  if (evidence.length !== result.candidates.length) throw new Error('Missing local candidate analysis.');
  const selected = { ...initialResultFilters, role: criteria.role, region: criteria.region, arrangement: criteria.arrangement, seniority: criteria.seniority, showCollections: false };
  return Object.fromEntries([
    ['all_returned_provider_order', false, { ...initialResultFilters, showResources: true }],
    ['selected_manual', false, selected],
    ['selected_assisted', true, selected],
    ['selected_assisted_strict', true, { ...selected, keepUnknown: false }],
  ].map(([mode, rank, filters]) => [mode, filterCandidates(result.candidates, evidence, rank, filters, criteria.role)]));
}

export function searchQualityReport(result, evidence, rawCriteria) {
  const criteria = validatePublicSearchCriteria(rawCriteria);
  const modeRows = searchQualityModes(result, evidence, criteria);
  const fields = ['role', 'region', 'arrangement'].filter(field => criteria[field] !== 'any');
  const reviewable = row => !isCollection(row.candidate, row.evidence?.content?.status) && row.evidence?.content?.status !== 'resource';
  const supported = row => reviewable(row) && fields.length > 0 && fields.every(field => relevanceStatus(row.relevance[field], criteria[field]) === 'supported');
  const notes = row => candidateRequirements(row.candidate, row.evidence?.content?.status);
  const summarize = rows => {
    const groups = groupCandidates(rows);
    return {
      links: rows.length,
      groups: groups.length,
      reviewable_groups: groupCandidates(rows.filter(reviewable)).length,
      links_folded_as_alternatives: rows.length - groups.length,
      joint_supported_links: rows.filter(supported).length,
      groups_with_joint_supported_link: groups.filter(group => group.some(supported)).length,
      primary_joint_supported_groups: groups.filter(group => supported(group[0])).length,
      joint_supported_groups_with_requirements: groups.filter(group => group.some(row => supported(row) && notes(row).length > 0)).length,
      evidence_by_link: Object.fromEntries(fields.map(field => [field, Object.fromEntries(['supported', 'contradiction', 'conflict', 'unknown'].map(status => [status, rows.filter(row => relevanceStatus(row.relevance[field], criteria[field]) === status).length]))])),
      requirement_links: rows.filter(row => notes(row).length > 0).length,
      requirements_by_kind: Object.fromEntries(Object.keys(workRequirementLabels).map(kind => [kind, rows.filter(row => notes(row).some(note => note.kind === kind)).length])),
    };
  };
  const all = modeRows.all_returned_provider_order;
  const modes = {};
  for (const [mode, rows] of Object.entries(modeRows)) {
    const firstTen = groupCandidates(rows).slice(0, 10);
    modes[mode] = {
      pool: summarize(rows),
      // The display unit is a group. Alternatives remain available, but never
      // combine one link's location with another link's role or work mode.
      first_ten_groups: {
        displayed_groups: firstTen.length,
        primary_links: summarize(firstTen.map(group => group[0])),
        groups_with_joint_supported_alternative: firstTen.filter(group => group.some(supported)).length,
      },
    };
  }
  const sources = [...postingSources.map((source, index) => ({ name: source.name, index })), { name: 'Unscoped', index: null }].map(source => {
    const rows = all.filter(row => (row.candidate.source_index ?? null) === source.index);
    const shapes = rows.map(row => inspectCandidate(row.candidate));
    return {
      source: source.name,
      request_state: source.index === null ? 'unscoped' : !result.coverage ? 'not_in_plan' : source.index < result.coverage.completed ? 'completed' : source.index < result.coverage.attempted ? 'attempted_without_completion' : 'not_attempted',
      returned: summarize(rows),
      posting_patterns: shapes.filter(shape => shape.kind === 'posting').length,
      board_patterns: shapes.filter(shape => shape.kind === 'board').length,
      unknown_patterns: shapes.filter(shape => shape.kind === 'unknown').length,
      outside_scope_links: shapes.filter(shape => shape.scope === 'outside').length,
    };
  });
  return {
    version: 1,
    offline_returned_text_diagnostic: true,
    synthetic_reference: true,
    criteria,
    joint_support_fields: fields,
    retrieved_at: result.retrieved_at,
    coverage: result.coverage ?? null,
    duplicates_removed_by_engine: result.duplicates_removed,
    discarded_results_by_engine: result.discarded_results,
    sources,
    modes,
    unmeasured: {
      independent_relevance_precision: null,
      verified_suitable_jobs: null,
      verified_unique_vacancies: null,
      current_vacancy_status: null,
      provider_latency_seconds: null,
      actual_billed_credits: null,
    },
    limits: 'One saved envelope; no independent relevance labels. Joint support must occur in the same returned link and does not verify suitability. Requirements are review prompts; absence proves nothing. URL patterns and grouping do not verify vacancy identity. Retrieval time is not posting time. No provider, credential, page, model or profile-storage access.',
  };
}
