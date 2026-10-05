import { invoke, isTauri } from '@tauri-apps/api/core';
import { arrangements, regions, roles, seniorities, skills, validatePublicSearchCriteria, type PublicSearchCriteria } from './public-search-criteria.ts';
import type { Candidate } from './discovery-state.ts';

export type SkillEvidence = Readonly<{ skill: keyof typeof skills; resume_phrase: string; job_phrase: string; job_source: 'title' | 'snippet' }>;
export type ContentAssessment = Readonly<{ status: 'resource' | 'opening' | 'unknown'; evidence: readonly Readonly<{ kind: 'resource' | 'opening'; source: 'title' | 'snippet'; phrase: string }>[] }>;
export type Mentions = Readonly<{ index: number; content: ContentAssessment; skills: readonly (keyof typeof skills)[]; shared_skills: readonly (keyof typeof skills)[]; shared_evidence: readonly SkillEvidence[]; roles: readonly (keyof typeof roles)[]; regions: readonly (keyof typeof regions)[]; arrangements: readonly (keyof typeof arrangements)[]; seniorities: readonly (keyof typeof seniorities)[] }>;
export type Assistance = Readonly<{ criteria: PublicSearchCriteria | null; roles: readonly (keyof typeof roles)[]; skills: readonly (keyof typeof skills)[]; matches: readonly Mentions[] }>;
export const ASSISTANCE_ERROR = 'Local analysis could not finish. Retry or use manual preferences. Nothing was sent to a search provider.';
function categoryList<T extends Record<string, string>>(value: unknown, catalog: T): readonly (keyof T)[] {
  if (!Array.isArray(value) || value.length > Object.keys(catalog).length || new Set(value).size !== value.length || value.some(id => typeof id !== 'string' || id === 'any' || !Object.hasOwn(catalog, id))) throw new Error(ASSISTANCE_ERROR);
  return Object.freeze([...value]);
}
export function validateAssistance(value: unknown, count: number, text = '', candidates: readonly Candidate[] = []): Assistance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(ASSISTANCE_ERROR);
  const data = value as Record<string, unknown>;
  if (Object.keys(data).sort().join(',') !== 'criteria,matches,roles,skills' || !Array.isArray(data.matches) || data.matches.length !== count || count > 50) throw new Error(ASSISTANCE_ERROR);
  const detectedRoles = categoryList(data.roles, roles), detectedSkills = categoryList(data.skills, skills);
  const criteria = data.criteria === null ? null : validatePublicSearchCriteria(data.criteria);
  if ((criteria && (criteria.role !== detectedRoles[0] || criteria.region !== 'any' || criteria.arrangement !== 'any' || criteria.seniority !== 'any' || criteria.skills.join(',') !== [...detectedSkills.slice(0, 5)].sort().join(','))) || (!criteria && detectedRoles.length > 0)) throw new Error(ASSISTANCE_ERROR);
  const matches = data.matches.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(ASSISTANCE_ERROR);
    const record = item as Record<string, unknown>;
    if (Object.keys(record).sort().join(',') !== 'arrangements,content,index,regions,roles,seniorities,shared_evidence,shared_skills,skills' || record.index !== index) throw new Error(ASSISTANCE_ERROR);
    const raw = record.content as Record<string, unknown> | null;
    if (!raw || Array.isArray(raw) || Object.keys(raw).sort().join(',') !== 'evidence,status' || !['resource', 'opening', 'unknown'].includes(raw.status as string) || !Array.isArray(raw.evidence) || raw.evidence.length > 4) throw new Error(ASSISTANCE_ERROR);
    const contentEvidence = raw.evidence.map((signal: unknown) => {
      if (!signal || typeof signal !== 'object' || Array.isArray(signal)) throw new Error(ASSISTANCE_ERROR);
      const entry = signal as Record<string, unknown>;
      if (Object.keys(entry).sort().join(',') !== 'kind,phrase,source' || !['resource', 'opening'].includes(entry.kind as string) || (entry.source !== 'title' && entry.source !== 'snippet') || typeof entry.phrase !== 'string' || !entry.phrase || entry.phrase.length > 80 || /[\x00-\x1f\x7f]/.test(entry.phrase) || !candidates[index]?.[entry.source].includes(entry.phrase)) throw new Error(ASSISTANCE_ERROR);
      return Object.freeze({ kind: entry.kind as 'resource' | 'opening', source: entry.source, phrase: entry.phrase });
    });
    if (new Set(contentEvidence.map(e => `${e.kind}:${e.source}`)).size !== contentEvidence.length) throw new Error(ASSISTANCE_ERROR);
    const hasOpening = contentEvidence.some(e => e.kind === 'opening'), hasResource = contentEvidence.some(e => e.kind === 'resource');
    const expected = contentEvidence.some(e => e.kind === 'resource' && e.source === 'title') && !hasOpening ? 'resource' : hasOpening && !hasResource ? 'opening' : 'unknown';
    if (raw.status !== expected) throw new Error(ASSISTANCE_ERROR);
    const content: ContentAssessment = Object.freeze({ status: expected, evidence: Object.freeze(contentEvidence) });
    const jobSkills = categoryList(record.skills, skills), sharedSkills = categoryList(record.shared_skills, skills);
    if (sharedSkills.join(',') !== jobSkills.filter(id => detectedSkills.includes(id)).join(',')) throw new Error(ASSISTANCE_ERROR);
    if (!Array.isArray(record.shared_evidence) || record.shared_evidence.length !== sharedSkills.length) throw new Error(ASSISTANCE_ERROR);
    const evidence = record.shared_evidence.map((entry, position) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(ASSISTANCE_ERROR);
      const item = entry as Record<string, unknown>;
      if (Object.keys(item).sort().join(',') !== 'job_phrase,job_source,resume_phrase,skill' || item.skill !== sharedSkills[position] || (item.job_source !== 'title' && item.job_source !== 'snippet')) throw new Error(ASSISTANCE_ERROR);
      for (const [phrase, source] of [[item.resume_phrase, text], [item.job_phrase, candidates[index]?.[item.job_source]]] as const) {
        if (typeof phrase !== 'string' || !phrase || phrase.length > 32 || /[\x00-\x1f\x7f]/.test(phrase) || !source?.includes(phrase)) throw new Error(ASSISTANCE_ERROR);
      }
      return Object.freeze({ skill: sharedSkills[position], resume_phrase: item.resume_phrase as string, job_phrase: item.job_phrase as string, job_source: item.job_source });
    });
    return Object.freeze({ index, content, roles: categoryList(record.roles, roles), skills: jobSkills, shared_skills: sharedSkills, shared_evidence: Object.freeze(evidence), regions: categoryList(record.regions, regions), arrangements: categoryList(record.arrangements, arrangements), seniorities: categoryList(record.seniorities, seniorities) });
  });
  return Object.freeze({ criteria, roles: detectedRoles, skills: detectedSkills, matches: Object.freeze(matches) });
}
export async function requestAssistance(text: string, candidates: readonly Candidate[], signal: AbortSignal): Promise<Assistance> {
  try {
    const review = { text, reviewed: true, candidates: candidates.map(({ title, snippet }) => ({ title, snippet })) };
    const data: unknown = isTauri() ? await invoke('local_assistance', { review }) : await fetch('/engine/assistance', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-JobScout-Import': '1' },
      body: JSON.stringify(review), cache: 'no-store', credentials: 'omit', redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
    }).then(response => { if (!response.ok) throw new Error(); return response.json(); });
    return validateAssistance(data, candidates.length, text, candidates);
  } catch { throw new Error(ASSISTANCE_ERROR); }
}

export function createAssistanceState(request = requestAssistance) {
  type State = Readonly<{ busy: boolean; result: Assistance | null; error: string }>;
  const empty: State = { busy: false, result: null, error: '' };
  let state = empty, generation = 0, controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: State) => { state = next; listeners.forEach(listener => listener()); };
  const invalidate = () => { generation++; controller?.abort(); controller = undefined; publish(empty); };
  return { getSnapshot: () => state, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, invalidate,
    async analyze(text: string, candidates: readonly Candidate[] = []) {
      invalidate(); const current = generation;
      controller = new AbortController(); publish({ ...empty, busy: true });
      try {
        const result = await request(text, candidates, controller.signal);
        if (generation !== current) return null;
        publish({ ...empty, result }); return result;
      } catch {
        if (generation === current) publish({ ...empty, error: ASSISTANCE_ERROR });
        return null;
      } finally { if (generation === current) controller = undefined; }
    },
  };
}
