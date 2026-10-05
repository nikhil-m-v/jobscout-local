import type { Mentions } from './assistance.ts';
import type { Candidate } from './discovery-state.ts';
import type { PublicSearchCriteria, skills } from './public-search-criteria.ts';
export type ResultFilters = { role: PublicSearchCriteria['role'] | 'any'; region: PublicSearchCriteria['region']; arrangement: PublicSearchCriteria['arrangement']; seniority: PublicSearchCriteria['seniority']; skill: keyof typeof skills | 'any'; keepUnknown: boolean; showResources: boolean };
export const initialResultFilters: ResultFilters = { role: 'any', region: 'any', arrangement: 'any', seniority: 'any', skill: 'any', keepUnknown: true, showResources: false };
export function filterCandidates(candidates: readonly Candidate[], mentions: readonly Mentions[], rankByResume: boolean, filters: ResultFilters) {
  return candidates.map((candidate, index) => {
    const evidence = mentions[index];
    const shared = rankByResume ? evidence?.shared_skills ?? [] : [];
    return { candidate, evidence, shared, index };
  }).filter(({ evidence }) => {
    if (!evidence) return true;
    if (!filters.showResources && evidence.content?.status === 'resource') return false;
    for (const [field, selected] of [['roles', filters.role], ['regions', filters.region], ['arrangements', filters.arrangement], ['seniorities', filters.seniority], ['skills', filters.skill]] as const) {
      const values: readonly string[] = evidence[field];
      if (selected !== 'any' && !values.includes(selected) && !(values.length === 0 && filters.keepUnknown)) return false;
    }
    return true;
  }).sort((a, b) => b.shared.length - a.shared.length || a.index - b.index);
}
