import { invoke, isTauri } from '@tauri-apps/api/core';
import { ProviderConnectionFailure, validateProviderConnection } from './provider-connection-state.ts';

export async function requestProviderConnection(signal: AbortSignal) {
  let data: unknown;
  try {
    if (signal.aborted) throw new Error();
    data = isTauri() ? await invoke('provider_connection') : await fetch('/engine/providers/tavily/check', {
      method: 'POST', headers: { 'X-JobScout-Import': '1', 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: true }), cache: 'no-store', credentials: 'omit', redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
    }).then(response => response.json());
  } catch { throw new ProviderConnectionFailure(null); }
  if (data && typeof data === 'object' && 'error' in data) throw new ProviderConnectionFailure((data as { error: unknown }).error);
  try { return validateProviderConnection(data); }
  catch { throw new ProviderConnectionFailure('provider_invalid_response'); }
}
