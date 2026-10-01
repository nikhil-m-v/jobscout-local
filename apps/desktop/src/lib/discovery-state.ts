import { validatePublicSearchCriteria, type PublicSearchCriteria } from './public-search-criteria.ts';
import type { SearchPreview } from './search-preview-state.ts';

export interface Candidate { title: string; url: string; snippet: string }
export interface SearchResult { query: string; provider: 'tavily'; candidates: readonly Candidate[] }
export interface SearchConfirmation { criteria: PublicSearchCriteria; provider: 'tavily'; query_version: 1; reviewed_query: string; confirmed: true }
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
  if (Object.keys(data).sort().join(',') !== 'candidates,provider,query' || data.provider !== 'tavily' || data.query !== query || !Array.isArray(data.candidates) || data.candidates.length > 10) throw new SearchFailure('provider_invalid_response');
  const candidates = data.candidates.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new SearchFailure('provider_invalid_response');
    const record = item as Record<string, unknown>;
    if (Object.keys(record).sort().join(',') !== 'snippet,title,url' || !text(record.title, 512, true) || !text(record.snippet, 16384) || !text(record.url, 2048, true)) throw new SearchFailure('provider_invalid_response');
    const url = new URL(record.url);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || /[\s\\]/.test(record.url)) throw new SearchFailure('provider_invalid_response');
    return Object.freeze({ title: record.title, url: record.url, snippet: record.snippet });
  });
  return Object.freeze({ query, provider: 'tavily', candidates: Object.freeze(candidates) });
}
type State = Readonly<{ busy: boolean; result: SearchResult | null; error: string }>;
const empty: State = { busy: false, result: null, error: '' };
export function createDiscoveryState(request: (confirmation: SearchConfirmation, signal: AbortSignal) => Promise<unknown>) {
  let state = empty, generation = 0;
  let controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  const publish = (value: State) => { state = value; listeners.forEach(listener => listener()); };
  const invalidate = () => { generation++; controller?.abort(); controller = undefined; publish(empty); };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate,
    async send(criteria: PublicSearchCriteria, preview: SearchPreview | null, reviewed: boolean) {
      if (state.busy || !reviewed || preview?.provider !== 'tavily' || !preview.dispatch_available) return;
      invalidate(); const current = generation;
      controller = new AbortController(); publish({ ...empty, busy: true });
      try {
        const confirmation: SearchConfirmation = { criteria: validatePublicSearchCriteria(criteria), provider: 'tavily', query_version: 1, reviewed_query: preview.query, confirmed: true };
        const result = validateSearchResult(await request(confirmation, controller.signal), preview.query);
        if (generation === current) publish({ ...empty, result });
      } catch (cause) {
        if (generation === current) publish({ ...empty, error: searchError(cause instanceof SearchFailure ? cause.code : null) });
      } finally { if (generation === current) controller = undefined; }
    },
  };
}
