export type DataReview = Readonly<{ profile_present: boolean; saved_jobs: number; jobs_with_notes: number; review_token: string }>;
export type DataRequest = (action: 'review' | 'delete', token?: string) => Promise<unknown>;
type State = Readonly<{ phase: 'idle' | 'loading' | 'review' | 'deleting' | 'unknown' | 'done'; review: DataReview | null; error: string; notice: string; connected: boolean; blocked: boolean }>;
const empty: State = { phase: 'idle', review: null, error: '', notice: '', connected: false, blocked: false };
export function validateDataReview(value: unknown): DataReview {
  if (!value || typeof value !== 'object') throw new Error();
  const review = value as DataReview;
  if (Object.keys(review).sort().join(',') !== 'jobs_with_notes,profile_present,review_token,saved_jobs'
      || typeof review.profile_present !== 'boolean' || !Number.isInteger(review.saved_jobs) || review.saved_jobs < 0 || review.saved_jobs > 200
      || !Number.isInteger(review.jobs_with_notes) || review.jobs_with_notes < 0 || review.jobs_with_notes > review.saved_jobs
      || typeof review.review_token !== 'string' || !/^[0-9a-f]{64}$/.test(review.review_token)) throw new Error();
  return Object.freeze({ ...review });
}
export function createDataControlsState(request: DataRequest, clearSession: () => void) {
  let state = empty, pending = false, generation = 0;
  const listeners = new Set<() => void>();
  const publish = (next: State) => { state = next; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    connect(connected: boolean) {
      if (state.connected === connected) return;
      generation++;
      publish({ ...state, connected, review: null, phase: state.blocked ? 'unknown' : 'idle' });
    },
    cancel() { if (!pending && state.phase === 'review') publish({ ...state, phase: 'idle', review: null, error: '' }); },
    async review() {
      if (pending || !state.connected) return false;
      pending = true; const current = generation, wasUnknown = state.phase === 'unknown';
      publish({ ...state, phase: 'loading', review: null, error: '', notice: '' });
      try {
        const value = await request('review') as Record<string, unknown>;
        if (!value || Object.keys(value).join(',') !== 'review') throw new Error();
        const review = validateDataReview(value.review);
        if (current !== generation) return false;
        publish({ ...state, phase: 'review', review, blocked: false }); return true;
      } catch {
        if (current === generation) publish({ ...state, phase: wasUnknown ? 'unknown' : 'idle', review: null, error: 'Local data could not be reviewed. Check the workspace and try again.' });
        return false;
      } finally { pending = false; }
    },
    async remove() {
      if (pending || !state.connected || state.phase !== 'review' || !state.review) return false;
      pending = true; const token = state.review.review_token, current = generation;
      publish({ ...state, phase: 'deleting', review: null, error: '', notice: '', blocked: true });
      // Confirmation releases every current UI copy, even if disk deletion is uncertain.
      try {
        clearSession();
        const value = await request('delete', token) as Record<string, unknown>;
        if (!value || Object.keys(value).join(',') !== 'deleted' || value.deleted !== true) throw new Error();
        if (current !== generation) throw new Error();
        publish({ ...state, phase: state.connected ? 'done' : 'unknown', blocked: !state.connected, notice: 'Local career records deleted. Current drafts and results cleared.' });
        return true;
      } catch {
        publish({ ...state, phase: 'unknown', review: null, error: 'Deletion could not be confirmed. Current drafts and results were cleared. Review remaining local data before doing more work.' });
        return false;
      } finally { pending = false; }
    },
  };
}
