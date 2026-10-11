import type { Candidate, SearchResult } from './discovery-state.ts';

export const MAX_SAVED_JOBS = 200;
export type JobSnapshot = Omit<Candidate, 'source_index'> & { source_index: number | null } & Pick<SearchResult, 'provider' | 'retrieved_at'>;
export type SavedJob = JobSnapshot & { id: string; saved_at: string };
export type JobsAction = 'load' | 'save' | 'delete';
export type JobsRequest = (action: JobsAction, value?: JobSnapshot | string) => Promise<unknown>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const date = (value: unknown) => typeof value === 'string' && value.length <= 40 && /(?:Z|\+00:00)$/.test(value) && Number.isFinite(Date.parse(value));
const text = (value: unknown, max: number, required = false) => typeof value === 'string' && value.length <= max && (!required || !!value.trim()) && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\ud800-\udfff]/u.test(value);
export function validateSavedJob(value: unknown): SavedJob {
  if (!value || typeof value !== 'object') throw new Error();
  const job = value as SavedJob;
  if (Object.keys(job).sort().join(',') !== 'id,provider,retrieved_at,saved_at,snippet,source_index,title,url'
      || typeof job.id !== 'string' || !uuid.test(job.id) || job.provider !== 'tavily'
      || !date(job.retrieved_at) || !date(job.saved_at) || !text(job.title, 512, true)
      || !text(job.snippet, 16384) || !text(job.url, 2048, true)
      || (job.source_index !== null && (!Number.isInteger(job.source_index) || job.source_index < 0 || job.source_index >= 5))) throw new Error();
  const url = new URL(job.url);
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || (url.port && url.port !== '443') || /[\s\\]/.test(job.url)) throw new Error();
  return Object.freeze({ ...job });
}
export function snapshotFor(candidate: Candidate, result: SearchResult): JobSnapshot {
  // Explicit projection: never save the query, reviewed profile or match assessments.
  return { title: candidate.title, url: candidate.url, snippet: candidate.snippet, source_index: candidate.source_index ?? null, provider: result.provider, retrieved_at: result.retrieved_at };
}
type State = Readonly<{ jobs: readonly SavedJob[]; ready: boolean; busy: boolean; connected: boolean; error: string; notice: string }>;
const empty: State = { jobs: [], ready: false, busy: false, connected: false, error: '', notice: '' };
export function createSavedJobsState(request: JobsRequest) {
  let state = empty, refreshRequested = false;
  const listeners = new Set<() => void>();
  const publish = (next: State) => { state = next; listeners.forEach(listener => listener()); };
  async function run(action: JobsAction, value?: JobSnapshot | string): Promise<boolean> {
    if (!state.connected || state.busy || (action !== 'load' && !state.ready)) return false;
    publish({ ...state, busy: true, error: '', notice: '' });
    try {
      const response = await request(action, value);
      if (!response || typeof response !== 'object') throw new Error();
      const data = response as Record<string, unknown>;
      if (data.error === 'saved_jobs_full') {
        publish({ ...state, error: `Your ${MAX_SAVED_JOBS} saved places are full. Remove an item in Saved jobs to make room.` });
        return false;
      }
      let jobs = state.jobs;
      if (action === 'load') {
        if (Object.keys(data).join(',') !== 'jobs' || !Array.isArray(data.jobs) || data.jobs.length > MAX_SAVED_JOBS) throw new Error();
        jobs = Object.freeze(data.jobs.map(validateSavedJob));
        if (new Set(jobs.map(job => job.url)).size !== jobs.length || new Set(jobs.map(job => job.id)).size !== jobs.length) throw new Error();
      } else if (action === 'save') {
        if (Object.keys(data).join(',') !== 'job') throw new Error();
        const job = validateSavedJob(data.job);
        if (job.url !== (value as JobSnapshot).url) throw new Error();
        jobs = Object.freeze([job, ...jobs.filter(item => item.id !== job.id && item.url !== job.url)]);
        if (jobs.length > MAX_SAVED_JOBS) throw new Error();
      } else {
        if (Object.keys(data).join(',') !== 'deleted' || data.deleted !== true) throw new Error();
        jobs = Object.freeze(jobs.filter(job => job.id !== value));
      }
      publish({ ...state, jobs, ready: state.connected && !refreshRequested, notice: action === 'save' ? 'Candidate saved on this computer.' : action === 'delete' ? 'Saved candidate removed from this computer.' : '' });
      return true;
    } catch {
      publish({ ...state, ready: false, error: action === 'load' ? 'Saved jobs could not be loaded. Check the workspace and reload.' : `${action === 'save' ? 'Saving' : 'Removal'} could not be confirmed. Reload saved jobs to check before trying again.` });
      return false;
    } finally {
      publish({ ...state, busy: false });
      if (refreshRequested && state.connected) { refreshRequested = false; void run('load'); }
    }
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    connect(connected: boolean) {
      if (state.connected === connected) return;
      publish({ ...state, connected, ready: false });
      if (state.busy) refreshRequested = true;
      else if (connected) { refreshRequested = false; void run('load'); }
    },
    reload: () => run('load'), save: (snapshot: JobSnapshot) => run('save', snapshot), remove: (id: string) => run('delete', id),
  };
}
