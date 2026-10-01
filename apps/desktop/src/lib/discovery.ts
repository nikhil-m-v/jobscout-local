import { invoke, isTauri } from '@tauri-apps/api/core';
import { SearchFailure, type SearchConfirmation } from './discovery-state.ts';

export async function requestDiscovery(confirmation: SearchConfirmation, signal: AbortSignal): Promise<unknown> {
  try {
  const data: unknown = isTauri() ? await invoke('job_search', { confirmation }) : await fetch('/engine/search', {
    method: 'POST', headers: { 'X-JobScout-Import': '1', 'Content-Type': 'application/json' },
    body: JSON.stringify(confirmation), cache: 'no-store', credentials: 'omit', redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
  }).then(response => response.json());
  if (data && typeof data === 'object' && 'error' in data) throw new SearchFailure(data.error);
  return data;
  } catch (cause) {
    if (cause instanceof SearchFailure) throw cause;
    throw new SearchFailure(null);
  }
}
