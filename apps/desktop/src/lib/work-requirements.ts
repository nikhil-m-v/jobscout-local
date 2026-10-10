import type { Candidate } from './discovery-state.ts';
import type { ContentAssessment } from './assistance.ts';
import { isCollection } from './candidate-pool.ts';

export const workRequirementLabels = {
  schedule: 'Working hours', location: 'Physical location',
  authorization: 'Work authorization', sponsorship: 'Visa sponsorship',
} as const;
export type WorkRequirement = Readonly<{ kind: keyof typeof workRequirementLabels; source: 'title' | 'snippet'; phrase: string }>;

// Review notes only: no timezone-to-country mapping, eligibility judgment,
// filtering, profile comparison, provider fields or page retrieval.
export function candidateRequirements(candidate: Candidate, contentStatus?: ContentAssessment['status']): readonly WorkRequirement[] {
  if (isCollection(candidate, contentStatus) || contentStatus === 'resource') return [];
  const notes: WorkRequirement[] = [];
  for (const source of ['title', 'snippet'] as const) {
    for (const hit of candidate[source].matchAll(/[^.!?;\r\n]+[.!?;\r\n]?/g)) {
      const phrase = hit[0].trim();
      // Long paragraphs and questions stay unclassified rather than matching
      // a truncated suffix or treating an application question as a requirement.
      if (!phrase || phrase.length > 240 || phrase.endsWith('?') || /^(?:[*•-]\s*)?(?:please\s+)?(?:select|answer)\b/i.test(phrase)) continue;
      const negated = /\b(?:no|not|never|without)\b/i.test(phrase);
      const required = /\b(?:must|are required to|is required to|need to|willing to|ability to|expected to|expect (?:you|candidates) to)\b/i.test(phrase);
      if (!negated && required && /\b(?:time[ -]?zones?|PT|ET|PST|EST|CST|UTC|GMT)\b/i.test(phrase) && /\b(?:work|working|align|overlap|hours)\b/i.test(phrase)) {
        notes.push({ kind: 'schedule', source, phrase });
      }
      if (!negated && required && /\b(?:physically located|reside|be based)\b/i.test(phrase)) notes.push({ kind: 'location', source, phrase });
      if (!negated && /\b(?:must|are required to|need to|have to)\s+(?:be\s+)?(?:legally\s+)?authori[sz]ed\s+to\s+work\b/i.test(phrase)) notes.push({ kind: 'authorization', source, phrase });
      if (/\bvisa sponsorship (?:is )?(?:not available|not provided|unavailable)\b/i.test(phrase)) notes.push({ kind: 'sponsorship', source, phrase });
    }
  }
  return notes;
}
