import type { Candidate } from './discovery-state.ts';
import type { Mentions } from './assistance.ts';
import { regions, arrangements, roles } from './public-search-criteria.ts';
import { inspectCandidate } from './candidate-pool.ts';

export type Signal = Readonly<{ value: string; source: 'title' | 'snippet'; phrase: string; polarity: 'positive' | 'negative' | 'restriction'; excludes?: readonly string[] }>;
export type RelevanceStatus = 'supported' | 'contradiction' | 'conflict' | 'unknown';
export type CandidateRelevance = Readonly<Record<'role' | 'region' | 'arrangement', readonly Signal[]>>;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const countryIds = new Map(Object.entries(regions).filter(([value]) => value !== 'any').map(([value, label]) => [label.toLowerCase(), value]));
const countryTerms = [...countryIds.keys()].map(escape).join('|');
const standaloneLocation = new RegExp(`(?:^|\\[\\.\\.\\.\\])[\\t ]*((${countryTerms})[\\t ]*,[\\t ]*(Remote|Hybrid|On[ -]?site))[\\t ]*[.!]?(?=[\\t ]*(?:\\[\\.\\.\\.\\]|$))`, 'gim');
const labelledLocation = /(?:^|[.!?][\t ]+)((?:job locations?|locations?)[\t ]*:[\t ]*([^\r\n.;|]{1,160}))(?=[.;|\r\n]|$)/gim;
const leadingCountry = new RegExp(`^(${countryTerms})(?=[\\t ,(])`, 'i');
const placeAndMode = /^(?:(.*?)[\t ]+)?(Remote|Hybrid|On[ -]?site|\([\t ]*(?:Remote|Hybrid|On[ -]?site)[\t ]*\))$/i;
// Optional place words are opaque metadata, never geocoded. Prose-like tokens,
// partial percentages and unfinished details cannot establish an arrangement.
const placeWords = /^[\p{Lu}][\p{L}'’\-]{0,39}(?:[\t ]+[\p{Lu}][\p{L}'’\-]{0,39}){0,2}$/u;
const nonPlaceWords = /\b(?:support|supports|team|teams|client|clients|customer|customers|office|offices|policy|culture|partial|partially|flexible|not|no|only|all|worldwide|global|can|may|must|prefer|prefers|allows|offers|is|are)\b/i;
const roleIds = new Map(Object.entries(roles).map(([value, label]) => [label.toLowerCase(), value]));

function structuredHeading(candidate: Candidate): CandidateRelevance {
  const role: Signal[] = [], region: Signal[] = [], arrangement: Signal[] = [];
  const output = { role, region, arrangement };
  const { title, snippet } = candidate;
  if (!/^Job Posting(?:[\t ]*\|[\t ]*[^<>\r\n]{1,160})?$/i.test(title) || inspectCandidate(candidate).kind !== 'posting' || /^(?:[\t ]*)(?:```|~~~)/m.test(snippet)) return output;
  // One complete primary role heading and its adjacent employer/location line;
  // a copied collection, code sample or unrelated country paragraph cannot join it.
  const headings = [...snippet.matchAll(/^#[\t ]+([^\r\n]+)(?=\r?$)/gm)];
  if (headings.length !== 1) return output;
  const heading = headings[0], roleId = roleIds.get(heading[1].trim().toLowerCase());
  const next = /^[\t ]*\r?\n(?:[\t ]*\r?\n)?(##[\t ]+[^\r\n]{1,264})(?=\r?\n|$)/.exec(snippet.slice(heading.index! + heading[0].length));
  const location = next && /^##[\t ]+([^<>#·\r\n]{1,100})[\t ]*·[\t ]*([^<>#·\r\n]{1,160})$/.exec(next[1]);
  if (!roleId || !location || !location[1].trim()) return output;
  const parts = location[2].split(',').map(part => part.trim());
  const countryId = countryIds.get(parts.at(-1)!.toLowerCase());
  if (!countryId || ![2, 3].includes(parts.length) || parts.slice(0, -1).some(part => !placeWords.test(part) || nonPlaceWords.test(part) || /\b(?:our|headquarters|company|companies|employer|employers|products|benefits|news|opportunities)\b/i.test(part))) return output;
  output.role.push({ value: roleId, source: 'snippet', phrase: heading[0].trim(), polarity: 'positive' });
  output.region.push({ value: countryId, source: 'snippet', phrase: next![1].trim(), polarity: 'positive' });
  const tags = snippet.split(/\r?\n|\[\.\.\.\]/).flatMap(fragment => {
    const match = /^(#LI-(REMOTE|HYBRID|ONSITE))(?:[\t ]+#LI-[A-Z]{1,3}\d{1,3})*$/i.exec(fragment.trim());
    return match ? [match] : [];
  });
  if (tags.length && new Set(tags.map(tag => tag[2].toLowerCase())).size === 1) output.arrangement.push({ value: tags[0][2].toLowerCase(), source: 'snippet', phrase: tags[0][1], polarity: 'positive' });
  return output;
}

// Deliberately narrow source language. Unqualified snippet mentions, cities,
// eligibility and global remote availability cannot establish a job location.
export function candidateRelevance(candidate: Candidate, mentions?: Mentions): CandidateRelevance {
  const role: Signal[] = [], region: Signal[] = [], arrangement: Signal[] = [];
  if (mentions?.content?.status === 'collection' || mentions?.content?.status === 'resource') return { role, region, arrangement };
  const heading = structuredHeading(candidate);
  role.push(...heading.role); region.push(...heading.region);
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
    if (source === 'snippet') {
      const addLocation = (phrase: string, country: string, mode: string) => {
        const countryId = countryIds.get(country.toLowerCase())!;
        const modeId = mode.replace(/[()\t -]/g, '').toLowerCase();
        for (const [output, value] of [[region, countryId], [arrangement, modeId]] as const) {
          if (!output.some(signal => signal.value === value && signal.source === source && signal.phrase === phrase && signal.polarity === 'positive')) output.push({ value, source, phrase, polarity: 'positive' });
        }
      };
      // Whole standalone lines/fragments only; provider [...] markers can
      // separate repeated metadata without admitting surrounding company prose.
      for (const hit of text.matchAll(standaloneLocation)) addLocation(hit[1], hit[2], hit[3]);
      // A label must start a line or sentence. Its entire bounded value must
      // contain an explicit country, optional place words and a terminal mode.
      for (const hit of text.matchAll(labelledLocation)) {
        const detail = hit[2].trim();
        const country = leadingCountry.exec(detail);
        if (!country) continue;
        const tail = detail.slice(country[0].length).trim().replace(/^,[\t ]*/, '');
        const mode = placeAndMode.exec(tail);
        if (!mode) continue;
        const place = mode[1]?.trim();
        if (place && (!placeWords.test(place) || nonPlaceWords.test(place))) continue;
        addLocation(hit[1].trim(), country[1], mode[2]);
      }
    }
    // Greenhouse-style application titles delimit country before the employer.
    // An employer name containing India or the same phrase in prose is not metadata.
    const applicationCountry = source === 'title'
      ? /^Job Application for [^\r\n]{1,350}([-–—]\s*India)\s+at\s+[^\r\n]{1,100}$/i.exec(text)
      : null;
    if (applicationCountry) region.push({ value: 'india', source, phrase: applicationCountry[1], polarity: 'positive' });
    // Standalone ATS metadata or a delimited title suffix, not surrounding
    // company prose. Restrictions do not assert eligibility in their area.
    const metadata = source === 'title'
      ? /(?:\(|[-–—]\s*)(?:100%\s+)?Remote\s*[-–—,/]\s*(India|Latin America|EMEA)(?=\s*(?:[)|]| @|$))/gi
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
  // A work-mode tag may supplement an explicit matching detail, never replace
  // an incompatible existing positive mode. Explicit negatives still conflict.
  if (heading.arrangement.length && !arrangement.some(signal => signal.polarity === 'positive' && signal.value !== heading.arrangement[0].value)) arrangement.push(...heading.arrangement);
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
