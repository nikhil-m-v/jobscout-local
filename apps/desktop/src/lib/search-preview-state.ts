import { validateSearchPlan, type SearchPlan } from './search-plan.ts';
import type { PublicSearchCriteria } from './public-search-criteria.ts';

export interface SearchPreview { query: string; query_version: 1; provider: 'tavily' | null; dispatch_available: boolean; plan?: SearchPlan }
export function validateSearchPreview(value: unknown): SearchPreview {
  if (!value || typeof value !== 'object') throw new Error('Invalid preview');
  const data = value as Record<string, unknown>;
  if (!['dispatch_available,provider,query,query_version', 'dispatch_available,plan,provider,query,query_version'].includes(Object.keys(data).sort().join(',')) ||
      typeof data.query !== 'string' || !data.query.trim() || data.query.length > 1024 ||
      /[\u0000-\u001f\u007f]/.test(data.query) || data.query_version !== 1 ||
      (data.provider !== null && data.provider !== 'tavily') || typeof data.dispatch_available !== 'boolean' ||
      (data.provider === null && data.dispatch_available)) throw new Error('Invalid preview');
  return Object.freeze({ query: data.query, query_version: 1, provider: data.provider, dispatch_available: data.dispatch_available, ...(Object.hasOwn(data, 'plan') ? { plan: validateSearchPlan(data.plan, data.query) } : {}) });
}

type PreviewState = Readonly<{ preview: SearchPreview | null; busy: boolean; reviewed: boolean; error: string }>;
type PreviewRequest = (criteria: PublicSearchCriteria, signal: AbortSignal) => Promise<SearchPreview>;
const empty: PreviewState = { preview: null, busy: false, reviewed: false, error: '' };

// Generation checks also cover native invokes, which cannot be aborted in flight.
export function createSearchPreviewState(request: PreviewRequest) {
  let state = empty;
  let generation = 0;
  let controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: PreviewState) => { state = next; listeners.forEach(listener => listener()); };
  const invalidate = () => { generation++; controller?.abort(); controller = undefined; publish(empty); };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate,
    review: () => { if (state.preview && !state.busy) publish({ ...state, reviewed: true }); },
    consumeReview: () => { publish({ ...state, reviewed: false }); },
    async generate(criteria: PublicSearchCriteria) {
      invalidate();
      const current = generation;
      controller = new AbortController();
      publish({ ...empty, busy: true });
      try {
        const preview = validateSearchPreview(await request(criteria, controller.signal));
        if (current === generation) publish({ ...empty, preview });
      } catch {
        if (current === generation) publish({ ...empty, error: 'The query preview could not be prepared. Check the workspace, then try again.' });
      } finally {
        if (current === generation) controller = undefined;
      }
    },
  };
}
