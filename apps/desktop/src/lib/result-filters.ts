import type { Mentions } from './assistance.ts';
import type { Candidate } from './discovery-state.ts';
import type { PublicSearchCriteria, skills } from './public-search-criteria.ts';
import { isCollection } from './candidate-pool.ts';
export type ResultFilters = { role: PublicSearchCriteria['role'] | 'any'; region: PublicSearchCriteria['region']; arrangement: PublicSearchCriteria['arrangement']; seniority: PublicSearchCriteria['seniority']; skill: keyof typeof skills | 'any'; keepUnknown: boolean; showResources: boolean; showCollections: boolean };
export const initialResultFilters: ResultFilters = { role: 'any', region: 'any', arrangement: 'any', seniority: 'any', skill: 'any', keepUnknown: true, showResources: false, showCollections: true };
export function filterCandidates(candidates: readonly Candidate[], mentions: readonly Mentions[], rankByResume: boolean, filters: ResultFilters, reviewedRole: ResultFilters['role'] = 'any', useExactEvidence = true) {
  const roleOrder = (evidence: Mentions | undefined) => {
    if (reviewedRole === 'any') return 0;
    if (!useExactEvidence || !evidence?.shortlist) return evidence?.roles.includes(reviewedRole) ? 0 : !evidence?.roles.length ? 2 : 3;
    if (evidence.shortlist.roles.some(entry => entry.role === reviewedRole && entry.source === 'title')) return 0;
    if (evidence.shortlist.roles.some(entry => entry.source === 'title')) return 3;
    return evidence.roles.includes(reviewedRole) ? 1 : !evidence.roles.length ? 2 : 3;
  };
  const exactTools = (evidence: Mentions | undefined) => evidence?.shortlist?.exact_tools.length ?? 0;
  const positiveShared = (evidence: Mentions | undefined, shared: readonly string[]) => shared.filter(skill => !evidence?.shortlist?.exclusions.some(entry => entry.skill === skill) || evidence.shortlist.exact_tools.some(entry => entry.skill === skill)).length;
  return candidates.map((candidate, index) => {
    const evidence = mentions[index];
    const shared = rankByResume ? evidence?.shared_skills ?? [] : [];
    return { candidate, evidence, shared, index };
  }).filter(({ candidate, evidence }) => {
    if (!filters.showCollections && isCollection(candidate, evidence?.content?.status)) return false;
    if (!evidence) return true;
    if (!filters.showResources && evidence.content?.status === 'resource') return false;
    for (const [field, selected] of [['roles', filters.role], ['regions', filters.region], ['arrangements', filters.arrangement], ['seniorities', filters.seniority], ['skills', filters.skill]] as const) {
      const values: readonly string[] = evidence[field];
      if (selected !== 'any' && !values.includes(selected) && !(values.length === 0 && filters.keepUnknown)) return false;
    }
    return true;
  }).sort((a, b) => (rankByResume ? (useExactEvidence ? Number(isCollection(a.candidate, a.evidence?.content?.status)) - Number(isCollection(b.candidate, b.evidence?.content?.status)) : 0) || roleOrder(a.evidence) - roleOrder(b.evidence) || (useExactEvidence ? exactTools(b.evidence) - exactTools(a.evidence) || positiveShared(b.evidence, b.shared) - positiveShared(a.evidence, a.shared) : b.shared.length - a.shared.length) : 0) || a.index - b.index);
}
