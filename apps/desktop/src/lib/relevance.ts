import type { Candidate } from './discovery-state.ts';
import type { Mentions } from './assistance.ts';
import { regions, arrangements } from './public-search-criteria.ts';

export type Signal = Readonly<{ value: string; source: 'title' | 'snippet'; phrase: string; polarity: 'positive' | 'negative' }>;
export type RelevanceStatus = 'supported' | 'contradiction' | 'conflict' | 'unknown';
export type CandidateRelevance = Readonly<Record<'role' | 'region' | 'arrangement', readonly Signal[]>>;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Deliberately narrow source language. Unqualified snippet mentions, cities,
// eligibility and global remote availability cannot establish a job location.
export function candidateRelevance(candidate: Candidate, mentions?: Mentions): CandidateRelevance {
  const role: Signal[] = [], region: Signal[] = [], arrangement: Signal[] = [];
  if (mentions?.content?.status === 'collection' || mentions?.content?.status === 'resource') return { role, region, arrangement };
  for (const entry of mentions?.shortlist?.roles ?? []) {
    const text = candidate[entry.source];
    const negatives = [...text.matchAll(new RegExp(`\\b(?:no|not) +${escape(entry.phrase)} +(positions|roles|jobs|openings)\\b`, 'gi'))];
    for (const hit of negatives) role.push({ value: entry.role, source: entry.source, phrase: hit[0], polarity: 'negative' });
    if (entry.source === 'title' && [...text.matchAll(new RegExp(`\\b${escape(entry.phrase)}\\b`, 'gi'))].some(hit => !negatives.some(n => hit.index! >= n.index! && hit.index! < n.index! + n[0].length))) {
      role.push({ value: entry.role, source: 'title', phrase: entry.phrase, polarity: 'positive' });
    }
  }
  for (const [field, catalog, output, labels] of [
    ['region', regions, region, 'location|job location|based in'],
    ['arrangement', arrangements, arrangement, 'work mode|work arrangement|workplace'],
  ] as const) {
    for (const [value, label] of Object.entries(catalog)) {
      if (value === 'any') continue;
      const term = field === 'arrangement' && value === 'onsite' ? 'on[ -]?site' : escape(label);
      for (const source of ['title', 'snippet'] as const) {
        const text = candidate[source];
        const negatives = [...text.matchAll(new RegExp(`\\b(?:not|no) +${term}(?: +(?:positions|roles|jobs|openings|work))?\\b(?=\\s*(?:[.;,|/()\\n]|$))`, 'gi'))];
        for (const hit of negatives) output.push({ value, source, phrase: hit[0], polarity: 'negative' });
        for (const hit of text.matchAll(new RegExp(`\\b${term}\\b`, 'gi'))) {
          const start = hit.index!;
          if (negatives.some(n => start >= n.index! && start < n.index! + n[0].length)) continue;
          const before = text.slice(Math.max(0, start - 80), start);
          const context = new RegExp(`\\b(?:${labels})\\s*:?\\s*(?:[\\w -]+[,/]\\s*)*$`, 'i').exec(before);
          const qualified = field === 'arrangement' ? /\b(?:fully|100%)\s*$/i.exec(before) : null;
          // In titles, accept only explicit suffix metadata, not "Remote team".
          const suffix = source === 'title' && /[|(,–—-]\s*$/.test(before) && /^\s*(?:[),|–—-]|$)/.test(text.slice(start + hit[0].length));
          const endsDetail = /^\s*(?:[.;,|/()\n]|$)/.test(text.slice(start + hit[0].length));
          if (endsDetail && (context || qualified || suffix)) output.push({ value, source, phrase: (context?.[0] ?? qualified?.[0] ?? '') + hit[0], polarity: 'positive' });
        }
      }
    }
  }
  return { role, region, arrangement };
}

export function relevanceStatus(signals: readonly Signal[], selected: string): RelevanceStatus {
  if (selected === 'any') return 'unknown';
  const positive = signals.filter(signal => signal.polarity === 'positive');
  const matches = positive.some(signal => signal.value === selected);
  const denied = signals.some(signal => signal.value === selected && signal.polarity === 'negative');
  if (matches && denied) return 'conflict';
  if (matches) return 'supported';
  if (denied || positive.length > 0) return 'contradiction';
  return 'unknown';
}
