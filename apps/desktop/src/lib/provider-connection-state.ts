export interface ProviderConnectionResult { provider: 'tavily'; connection_verified: true; dispatch_available: false }
export function validateProviderConnection(value: unknown): ProviderConnectionResult {
  if (!value || typeof value !== 'object') throw new Error('Invalid connection result');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).sort().join(',') !== 'connection_verified,dispatch_available,provider' ||
      data.provider !== 'tavily' || data.connection_verified !== true || data.dispatch_available !== false) throw new Error('Invalid connection result');
  return Object.freeze({ provider: 'tavily', connection_verified: true, dispatch_available: false });
}

const messages: Record<string, string> = {
  provider_invalid_key: 'Tavily did not accept the saved key. Replace it and try again.',
  provider_rate_limited: 'Tavily is limiting requests. Wait before checking again.',
  provider_quota_exhausted: 'Tavily reported an account usage limit. Review your allowance in its dashboard.',
  provider_unavailable: 'Tavily could not be reached or is unavailable. Check your connection and try again later.',
  provider_timeout: 'The connection check timed out. A request may have reached Tavily. Retry when ready.',
  provider_invalid_response: 'Tavily returned an unsupported response. Try again later.',
  provider_key_missing: 'No saved key was found. Check key status and save one before retrying.',
  secret_store_unavailable: 'The saved key could not be read from Windows Credential Manager. Check key status and try again.',
  provider_check_busy: 'A connection check is still finishing. Wait a moment before retrying.',
  provider_confirmation_required: 'Review the connection-check disclosure before starting.',
};
export function providerConnectionError(code: unknown): string {
  return typeof code === 'string' && Object.hasOwn(messages, code) ? messages[code] : 'The connection check could not be confirmed. A request may have reached Tavily. Try again when ready.';
}

export class ProviderConnectionFailure extends Error {
  readonly code: unknown;
  constructor(code: unknown) { super(providerConnectionError(code)); this.code = code; }
}

type State = Readonly<{ busy: boolean; verified: boolean; error: string }>;
const empty: State = { busy: false, verified: false, error: '' };
export function createProviderConnectionState(request: (signal: AbortSignal) => Promise<ProviderConnectionResult>) {
  let state = empty;
  let generation = 0;
  let controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  function publish(next: State) { state = next; listeners.forEach(listener => listener()); }
  function invalidate() { generation++; controller?.abort(); controller = undefined; publish(empty); }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate,
    async check() {
      if (state.busy) return;
      invalidate(); const current = generation;
      controller = new AbortController(); publish({ ...empty, busy: true });
      try {
        validateProviderConnection(await request(controller.signal));
        if (current === generation) publish({ ...empty, verified: true });
      } catch (cause) {
        if (current === generation) publish({ ...empty, error: cause instanceof ProviderConnectionFailure ? providerConnectionError(cause.code) : providerConnectionError(null) });
      } finally { if (current === generation) controller = undefined; }
    },
  };
}
