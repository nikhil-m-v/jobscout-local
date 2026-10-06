export const postingSources = [
  { name: 'Greenhouse', domains: ['boards.greenhouse.io', 'job-boards.greenhouse.io'] },
  { name: 'Lever', domains: ['jobs.lever.co', 'jobs.eu.lever.co'] },
  { name: 'Ashby', domains: ['jobs.ashbyhq.com'] },
  { name: 'Workday', domains: ['myworkdayjobs.com'] },
  { name: 'SmartRecruiters', domains: ['jobs.smartrecruiters.com', 'www.smartrecruiters.com'] },
] as const;
export interface SearchPlan { version: 2; queries: readonly string[]; sources: readonly Readonly<{ name: string; domains: readonly string[] }>[]; max_requests: 5; max_candidates: 50; estimated_max_credits: 5; timeout_seconds: 75 }
export interface SearchProgress { attempted: number; completed: number; max_requests: 5; busy: boolean }
export function validateSearchPlan(value: unknown, query: string): SearchPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid search plan');
  const data = value as Record<string, unknown>;
  const intent = query.indexOf(' jobs');
  const expected = postingSources.map(() => query);
  if (Object.keys(data).sort().join(',') !== 'estimated_max_credits,max_candidates,max_requests,queries,sources,timeout_seconds,version' || data.version !== 2 || data.max_requests !== 5 || data.max_candidates !== 50 || data.estimated_max_credits !== 5 || data.timeout_seconds !== 75 || intent < 0 || !Array.isArray(data.queries) || JSON.stringify(data.queries) !== JSON.stringify(expected) || !Array.isArray(data.sources) || data.sources.length !== postingSources.length) throw new Error('Invalid search plan');
  data.sources.forEach((source, index) => {
    const expectedSource = postingSources[index];
    if (!source || Object.keys(source).sort().join(',') !== 'domains,name' || source.name !== expectedSource.name || JSON.stringify(source.domains) !== JSON.stringify(expectedSource.domains)) throw new Error('Invalid search plan');
  });
  return Object.freeze({ version: 2, queries: Object.freeze([...expected]), sources: Object.freeze(postingSources.map(source => Object.freeze({ name: source.name, domains: Object.freeze([...source.domains]) }))), max_requests: 5, max_candidates: 50, estimated_max_credits: 5, timeout_seconds: 75 });
}
export function validateSearchProgress(value: unknown): SearchProgress {
  const data = value as SearchProgress;
  if (!data || Object.keys(data).sort().join(',') !== 'attempted,busy,completed,max_requests' || data.max_requests !== 5 || typeof data.busy !== 'boolean' || !Number.isInteger(data.attempted) || !Number.isInteger(data.completed) || data.completed < 0 || data.completed > data.attempted || data.attempted > 5) throw new Error('Invalid progress');
  return Object.freeze({ ...data });
}
