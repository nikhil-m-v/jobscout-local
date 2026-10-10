import type { Candidate } from './discovery-state.ts';
import { groupCandidates, isCollection } from './candidate-pool.ts';

// A product review target, independent of the reviewed provider request limits.
// The upper target never discards additional returned candidates.
export const shortlistTarget = Object.freeze({ minimum: 10, preferredMaximum: 20 });

type CoverageRow = { candidate: Candidate; evidence?: { content?: { status: string } } };

export function shortlistCoverage(rows: readonly CoverageRow[]) {
  const reviewable = rows.filter(row => !isCollection(row.candidate, row.evidence?.content?.status)
    && row.evidence?.content?.status !== 'resource');
  // Always group for coverage, even when the user displays individual links.
  const reviewableGroups = groupCandidates(reviewable).length;
  return { reviewableGroups, belowMinimum: reviewableGroups < shortlistTarget.minimum };
}
