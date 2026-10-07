import type { Candidate } from './discovery-state.ts';
import type { Mentions } from './assistance.ts';
import { regions, arrangements } from './public-search-criteria.ts';

export type Signal = Readonly<{ value: string; source: 'title' | 'snippet'; phrase: string; polarity: 'positive' | 'negative' | 'restriction'; excludes?: readonly string[] }>;
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
  for (const source of ['title', 'snippet'] as const) {
    const text = candidate[source];
    // Standalone ATS metadata or a delimited title suffix, not surrounding
    // company prose. Restrictions do not assert eligibility in their area.
    const metadata = source === 'title'
      ? /(?:\(|[-–—]\s*)Remote\s*[-–—,/]\s*(India|Latin America|EMEA)(?=\s*(?:[)|]| @|$))/gi
      : /^\s*Remote\s*[-–—,/]\s*(India|Latin America|EMEA)\s*[.!]?\s*$/gim;
    for (const hit of text.matchAll(metadata)) {
      const phrase = hit[0].trim();
      arrangement.push({ value: 'remote', source, phrase, polarity: 'positive' });
      if (hit[1].toLowerCase() === 'india') region.push({ value: 'india', source, phrase, polarity: 'positive' });
      else region.push({ value: hit[1].toLowerCase(), source, phrase, polarity: 'restriction', excludes: Object.keys(regions).filter(value => value !== 'any' && (hit[1].toLowerCase() === 'emea' ? !['europe', 'united-kingdom'].includes(value) : value !== 'united-states')) });
    }
    for (const hit of text.matchAll(/\bthis is a remote (?:role|position|opportunity)\b/gi)) arrangement.push({ value: 'remote', source, phrase: hit[0], polarity: 'positive' });
    // A labelled location may include cities before an explicit country.
    // Do not geocode cities or scan unlabelled company/customer paragraphs.
    for (const hit of text.matchAll(/\b(?:job locations?|locations?)\s*:\s*[^\n.;]{1,160}/gi)) {
      for (const [value, label] of Object.entries(regions)) {
        if (value !== 'any' && new RegExp(`\\b${escape(label)}\\b(?=\\s*(?:[,/]|$))`, 'i').test(hit[0]) && !/\b(?:no|not)\b/i.test(hit[0])) region.push({ value, source, phrase: hit[0], polarity: 'positive' });
      }
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
          if (endsDetail && (context || qualified || suffix) && !output.some(signal => signal.value === value && signal.source === source && signal.polarity === 'positive' && signal.phrase.includes(hit[0]))) output.push({ value, source, phrase: (context?.[0] ?? qualified?.[0] ?? '') + hit[0], polarity: 'positive' });
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
  const denied = signals.some(signal => signal.value === selected && signal.polarity === 'negative' || signal.polarity === 'restriction' && signal.excludes?.includes(selected));
  if (matches && denied) return 'conflict';
  if (matches) return 'supported';
  if (denied || positive.length > 0) return 'contradiction';
  return 'unknown';
}
