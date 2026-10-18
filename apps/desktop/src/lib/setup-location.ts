export type LocationStatus = { folder: string; retained_folders: string[] };
export type LocationReview = LocationStatus & { destination: string; database_bytes: number; free_bytes: number; review_token: string };
export type LocationAction = 'status' | 'review' | 'apply';
const path = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 2048 && !/[\x00-\x1f]/.test(value);
export const locationMessages: Record<string, string> = {
  invalid_location: 'Choose a new folder on a local fixed drive, with an existing parent folder. Links, network locations and overlapping workspace folders are not supported.',
  location_exists: 'That folder already exists. Choose a new folder name; JobScout will not overwrite existing files.',
  location_space: 'There is not enough available space, or this database exceeds the supported copy size. Free space and review again.',
  location_review_changed: 'This review expired or your records changed. Check the current folder and review again.',
  location_busy: 'Other workspace work is finishing. Wait for it to finish, then check the current folder again.',
  location_limit: 'This workspace has reached its folder-change limit. Keep using the current folder.',
  location_unavailable: 'The folder operation could not be confirmed. Check folder access and available space, then check the current folder.',
  location_copy_failed: 'The database copy could not be verified. Check the current folder before trying a new destination.',
  invalid_location_request: 'The folder request was not accepted. Reopen setup and review again.',
};
export function validateLocation(value: unknown, review = false): LocationStatus | LocationReview {
  const fail = () => { throw new Error(locationMessages.location_unavailable); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const item = value as Record<string, unknown>;
  if (Object.keys(item).length === 1 && typeof item.error === 'string' && locationMessages[item.error]) throw new Error(locationMessages[item.error]);
  const keys = review ? 'database_bytes,destination,folder,free_bytes,retained_folders,review_token' : 'folder,retained_folders';
  if (Object.keys(item).sort().join(',') !== keys || !path(item.folder) || !Array.isArray(item.retained_folders) || item.retained_folders.length > 12 || !item.retained_folders.every(path)) return fail();
  if (review && (!path(item.destination) || typeof item.review_token !== 'string' || !/^[0-9a-f]{64}$/.test(item.review_token) ||
    ![item.database_bytes, item.free_bytes].every(v => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0))) return fail();
  return item as LocationStatus | LocationReview;
}

type Request = (action: LocationAction, body: Record<string, unknown> | undefined, signal: AbortSignal) => Promise<LocationStatus | LocationReview>;
type State = { phase: 'closed' | 'loading' | 'edit' | 'reviewing' | 'review' | 'applying' | 'done' | 'unknown' | 'error'; destination: string; current: LocationStatus | null; review: LocationReview | null; error: string | null };
export function createLocationChange(request: Request) {
  const initial: State = { phase: 'closed', destination: '', current: null, review: null, error: null };
  let state = initial, generation = 0, controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: State) => { state = next; listeners.forEach(listener => listener()); };
  const busy = () => ['loading', 'reviewing', 'applying'].includes(state.phase);
  function invalidate() { generation++; controller?.abort(); controller = undefined; publish(initial); }
  async function run(action: LocationAction) {
    if (busy() || (action === 'apply' && (!state.review || state.phase !== 'review')) ||
      (action === 'review' && !['edit', 'review', 'done'].includes(state.phase))) return;
    const body = action === 'apply' ? { review_token: state.review!.review_token, confirmed: true } : action === 'review' ? { destination: state.destination } : undefined;
    controller?.abort(); controller = new AbortController(); const currentGeneration = ++generation;
    publish({ ...state, phase: action === 'apply' ? 'applying' : action === 'review' ? 'reviewing' : 'loading', review: null, error: null });
    try {
      const result = validateLocation(await request(action, body, controller.signal), action === 'review');
      if (generation !== currentGeneration) return;
      publish({ phase: action === 'apply' ? 'done' : action === 'review' ? 'review' : 'edit',
        destination: action === 'review' ? (result as LocationReview).destination : '', current: { folder: result.folder, retained_folders: result.retained_folders },
        review: action === 'review' ? result as LocationReview : null, error: null });
    } catch (error) {
      if (generation !== currentGeneration) return;
      const message = error instanceof Error && Object.values(locationMessages).includes(error.message) ? error.message : locationMessages.location_unavailable;
      publish({ ...state, current: action === 'apply' ? null : state.current, review: null,
        phase: action === 'apply' ? 'unknown' : action === 'review' ? 'edit' : 'error', error: message });
    }
  }
  return { getSnapshot: () => state, subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, invalidate,
    edit(destination: string) { if (!busy() && ['edit', 'review', 'done'].includes(state.phase)) publish({ ...state, phase: 'edit', destination, review: null, error: null }); },
    status: () => run('status'), review: () => run('review'), apply: () => run('apply'),
  };
}
