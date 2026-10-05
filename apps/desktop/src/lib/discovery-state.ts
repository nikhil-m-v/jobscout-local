import { validateSearchPlan, type SearchPlan, type SearchProgress } from './search-plan.ts';
import { validatePublicSearchCriteria, type PublicSearchCriteria } from './public-search-criteria.ts';
import type { SearchPreview } from './search-preview-state.ts';

export interface Candidate { title: string; url: string; snippet: string }
export interface SearchResult { query: string; provider: 'tavily'; candidates: readonly Candidate[]; retrieved_at: string; duplicates_removed: number; coverage?: SearchCoverage }
export interface SearchConfirmation { criteria: PublicSearchCriteria; provider: 'tavily'; query_version: 1; reviewed_query: string; confirmed: true; reviewed_plan?: SearchPlan; run_id?: string }
export interface SearchCoverage { attempted: number; completed: number; max_requests: 5; stop_reason: 'complete' | 'cancelled' | 'time_limit' | 'provider_failure'; failures: readonly { request: number; code: string }[] }
const messages: Record<string, string> = {
  provider_invalid_key: 'Tavily did not accept the key. Replace it in Settings.',
  provider_key_missing: 'No saved key was found. Save one in Settings, then prepare a new preview.',
  secret_store_unavailable: 'Windows Credential Manager is unavailable. Check key status in Settings.',
  provider_rate_limited: 'Tavily is limiting requests. Wait before reviewing and sending again.',
  provider_quota_exhausted: 'Tavily reported an account usage limit. Check your allowance in its dashboard.',
  provider_timeout: 'Search timed out. The request may have consumed credits. Review again before retrying.',
  provider_unavailable: 'Tavily is unavailable. Check your connection and try again later.',
  provider_invalid_response: 'Tavily returned unsupported results. Try again later.',
  search_busy: 'The previous search is still finishing. Wait before sending again.',
  search_confirmation_required: 'Prepare and review a fresh query before sending.',
};
export function searchError(code: unknown): string {
  return typeof code === 'string' && Object.hasOwn(messages, code) ? messages[code] : 'Search could not be confirmed. A request may have reached Tavily. Review again before retrying.';
}
export class SearchFailure extends Error {
  readonly code: unknown;
  constructor(code: unknown) { super(searchError(code)); this.code = code; }
}
function text(value: unknown, maximum: number, nonempty = false): value is string {
  return typeof value === 'string' && value.length <= maximum && (!nonempty || Boolean(value.trim())) && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
}
export function validateSearchResult(value: unknown, query: string): SearchResult {
  if (!value || typeof value !== 'object') throw new SearchFailure('provider_invalid_response');
  const data = value as Record<string, unknown>;
  if (!['candidates,duplicates_removed,provider,query,retrieved_at', 'candidates,coverage,duplicates_removed,provider,query,retrieved_at'].includes(Object.keys(data).sort().join(',')) || data.provider !== 'tavily' || data.query !== query || !Array.isArray(data.candidates) || data.candidates.length > (Object.hasOwn(data, 'coverage') ? 50 : 10)) throw new SearchFailure('provider_invalid_response');
  if (typeof data.retrieved_at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(data.retrieved_at)
    || !Number.isFinite(Date.parse(data.retrieved_at)) || new Date(data.retrieved_at).toISOString().replace('.000Z', 'Z') !== data.retrieved_at
    || typeof data.duplicates_removed !== 'number' || !Number.isInteger(data.duplicates_removed) || data.duplicates_removed < 0
    || data.candidates.length + data.duplicates_removed > (Object.hasOwn(data, 'coverage') ? 50 : 10) || (data.candidates.length === 0 && data.duplicates_removed !== 0)) throw new SearchFailure('provider_invalid_response');
  let coverage: SearchCoverage | undefined;
  if (Object.hasOwn(data, 'coverage')) {
    const raw = data.coverage as SearchCoverage;
    if (!raw || Object.keys(raw).sort().join(',') !== 'attempted,completed,failures,max_requests,stop_reason' || raw.max_requests !== 5 || !Number.isInteger(raw.attempted) || !Number.isInteger(raw.completed) || raw.completed < 0 || raw.completed > raw.attempted || raw.attempted > 5 || !['complete', 'cancelled', 'time_limit', 'provider_failure'].includes(raw.stop_reason) || !Array.isArray(raw.failures) || raw.failures.length > 1 || data.candidates.length + data.duplicates_removed > raw.completed * 10 || (raw.stop_reason === 'complete' && (raw.completed !== 5 || raw.attempted !== 5)) || (raw.stop_reason === 'provider_failure') !== (raw.failures.length === 1)) throw new SearchFailure('provider_invalid_response');
    const failures = raw.failures.map(failure => {
      if (!failure || Object.keys(failure).sort().join(',') !== 'code,request' || failure.request !== raw.attempted || typeof failure.code !== 'string' || !Object.hasOwn(messages, failure.code)) throw new SearchFailure('provider_invalid_response');
      return Object.freeze({ ...failure });
    });
    coverage = Object.freeze({ ...raw, failures: Object.freeze(failures) });
  }
  const candidates = data.candidates.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new SearchFailure('provider_invalid_response');
    const record = item as Record<string, unknown>;
    if (Object.keys(record).sort().join(',') !== 'snippet,title,url' || !text(record.title, 512, true) || !text(record.snippet, 16384) || !text(record.url, 2048, true)) throw new SearchFailure('provider_invalid_response');
    const url = new URL(record.url);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || /[\s\\]/.test(record.url)) throw new SearchFailure('provider_invalid_response');
    return Object.freeze({ title: record.title, url: record.url, snippet: record.snippet });
  });
  if (new Set(candidates.map(item => item.url)).size !== candidates.length) throw new SearchFailure('provider_invalid_response');
  return Object.freeze({ query, provider: 'tavily', candidates: Object.freeze(candidates), retrieved_at: data.retrieved_at, duplicates_removed: data.duplicates_removed, ...(coverage ? { coverage } : {}) });
}
type State = Readonly<{ busy: boolean; result: SearchResult | null; error: string; progress?: SearchProgress; stopping?: boolean }>;
const empty: State = { busy: false, result: null, error: '' };
export function createDiscoveryState(request: (confirmation: SearchConfirmation, signal: AbortSignal, progress?: (value: SearchProgress) => void) => Promise<unknown>) {
  let state = empty, generation = 0;
  let controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  const publish = (value: State) => { state = value; listeners.forEach(listener => listener()); };
  const invalidate = () => { generation++; controller?.abort(); controller = undefined; publish(empty); };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate,
    stop: () => { if (state.busy) { publish({ ...state, stopping: true }); controller?.abort(); } },
    async send(criteria: PublicSearchCriteria, preview: SearchPreview | null, reviewed: boolean, broader = true) {
      if (state.busy || !reviewed || preview?.provider !== 'tavily' || !preview.dispatch_available) return;
      invalidate(); const current = generation;
      controller = new AbortController(); publish({ ...empty, busy: true });
      try {
        const confirmation: SearchConfirmation = { criteria: validatePublicSearchCriteria(criteria), provider: 'tavily', query_version: 1, reviewed_query: preview.query, confirmed: true };
        if (broader && preview.plan) {
          confirmation.reviewed_plan = validateSearchPlan(preview.plan, preview.query);
          confirmation.run_id = crypto.randomUUID();
        }
        const result = validateSearchResult(await request(confirmation, controller.signal, progress => { if (generation === current && state.busy) publish({ ...state, progress }); }), preview.query);
        if (Boolean(confirmation.reviewed_plan) !== Boolean(result.coverage)) throw new SearchFailure('provider_invalid_response');
        if (generation === current) publish({ ...empty, result });
      } catch (cause) {
        if (generation === current) publish({ ...empty, error: searchError(cause instanceof SearchFailure ? cause.code : null) });
      } finally { if (generation === current) controller = undefined; }
    },
  };
}
