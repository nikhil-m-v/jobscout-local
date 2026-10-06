import type { Candidate } from './discovery-state.ts';
import { postingSources } from './search-plan.ts';

export type LinkAssessment = Readonly<{ kind: 'posting' | 'board' | 'unknown'; host: string; path: string; employer: string | null; scope: 'within' | 'outside' | 'unrestricted'; source: string | null; domains: readonly string[] }>;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

// Conservative known ATS paths. No resolution, requests, inferred vacancy status,
// or fuzzy job identity. Unrecognized paths remain available as unknown.
export function inspectCandidate(candidate: Candidate): LinkAssessment {
  const url = new URL(candidate.url), host = url.hostname.toLowerCase();
  const path = url.pathname, parts = path.split('/').filter(Boolean);
  const source = candidate.source_index == null ? undefined : postingSources[candidate.source_index];
  const scope = !source ? 'unrestricted' : source.domains.some(domain => host === domain || (domain === 'myworkdayjobs.com' && host.endsWith('.' + domain))) ? 'within' : 'outside';
  let kind: LinkAssessment['kind'] = 'unknown', employer: string | null = null;
  const tenant = parts[0];
  if (['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(host)) {
    if (parts.length === 1) kind = 'board';
    else if ((parts.length === 3 || (parts.length === 4 && parts[3] === 'apply')) && parts[1] === 'jobs' && /^\d+$/.test(parts[2])) kind = 'posting';
    if (kind === 'posting') employer = `greenhouse:${tenant}`;
  } else if (['jobs.lever.co', 'jobs.eu.lever.co'].includes(host)) {
    if (parts.length === 1) kind = 'board';
    else if ((parts.length === 2 || (parts.length === 3 && parts[2] === 'apply')) && uuid.test(parts[1])) kind = 'posting';
    if (kind === 'posting') employer = `${host}:${tenant}`;
  } else if (host === 'jobs.ashbyhq.com') {
    if (parts.length === 1) kind = 'board';
    else if ((parts.length === 2 || (parts.length === 3 && parts[2] === 'application')) && uuid.test(parts[1])) kind = 'posting';
    if (kind === 'posting') employer = `ashby:${tenant}`;
  } else if (host.endsWith('.myworkdayjobs.com')) {
    const job = parts.indexOf('job');
    if (job >= 1 && parts.length > job + 1 && /_(?:R|JR)[a-z0-9-]+$/i.test(parts.at(-1)!)) { kind = 'posting'; employer = `workday:${host}:${parts[job - 1]}`; }
    else if (parts.length === 1 || (parts.length === 2 && /^[a-z]{2}-[a-z]{2}$/i.test(parts[0]))) kind = 'board';
  } else if (['jobs.smartrecruiters.com', 'www.smartrecruiters.com', 'careers.smartrecruiters.com'].includes(host)) {
    if (parts.length === 1) kind = 'board';
    else if (host !== 'careers.smartrecruiters.com' && parts.length === 2 && /^\d+(?:-|$)/.test(parts[1])) kind = 'posting';
    if (kind === 'posting') employer = `smartrecruiters:${tenant}`;
  }
  // Query-driven board/search views cannot establish an individual posting.
  if (kind === 'board' && ['gh_jid', 'jobId', 'job_id'].some(key => url.searchParams.has(key))) kind = 'unknown';
  return Object.freeze({ kind, host, path, employer, scope, source: source?.name ?? null, domains: Object.freeze(source ? [...source.domains] : []) });
}

export function isCollection(candidate: Candidate, textStatus?: string): boolean {
  return inspectCandidate(candidate).kind === 'board' || textStatus === 'collection';
}

export function groupCandidates<T extends { candidate: Candidate }>(rows: readonly T[], enabled = true): T[][] {
  const groups: T[][] = [], byKey = new Map<string, T[]>();
  for (const row of rows) {
    const link = inspectCandidate(row.candidate);
    const title = row.candidate.title.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
    const generic = /^(?:page[_ ]title|jobs?|job application(?: page)?|careers?|untitled|software engineer|software developer)$/i.test(title);
    const key = enabled && link.employer && title && !generic ? JSON.stringify([link.employer, title]) : null;
    const group = key ? byKey.get(key) : undefined;
    if (group) group.push(row);
    else { const next = [row]; groups.push(next); if (key) byKey.set(key, next); }
  }
  return groups;
}
