export interface SearchPlan { version: 1; queries: readonly string[]; max_requests: 5; max_candidates: 50; estimated_max_credits: 5; timeout_seconds: 75 }
export interface SearchProgress { attempted: number; completed: number; max_requests: 5; busy: boolean }
export function validateSearchPlan(value: unknown, query: string): SearchPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid search plan');
  const data = value as Record<string, unknown>;
  const intent = query.indexOf(' jobs');
  const expected = ['jobs', 'job openings', 'vacancies', 'hiring', 'careers'].map(term => query.slice(0, intent) + ' ' + term + query.slice(intent + 5));
  if (Object.keys(data).sort().join(',') !== 'estimated_max_credits,max_candidates,max_requests,queries,timeout_seconds,version' || data.version !== 1 || data.max_requests !== 5 || data.max_candidates !== 50 || data.estimated_max_credits !== 5 || data.timeout_seconds !== 75 || intent < 0 || !Array.isArray(data.queries) || JSON.stringify(data.queries) !== JSON.stringify(expected)) throw new Error('Invalid search plan');
  return Object.freeze({ version: 1, queries: Object.freeze([...expected]), max_requests: 5, max_candidates: 50, estimated_max_credits: 5, timeout_seconds: 75 });
}
export function validateSearchProgress(value: unknown): SearchProgress {
  const data = value as SearchProgress;
  if (!data || Object.keys(data).sort().join(',') !== 'attempted,busy,completed,max_requests' || data.max_requests !== 5 || typeof data.busy !== 'boolean' || !Number.isInteger(data.attempted) || !Number.isInteger(data.completed) || data.completed < 0 || data.completed > data.attempted || data.attempted > 5) throw new Error('Invalid progress');
  return Object.freeze({ ...data });
}
