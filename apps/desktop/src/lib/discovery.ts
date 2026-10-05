import { invoke, isTauri } from '@tauri-apps/api/core';
import { SearchFailure, type SearchConfirmation } from './discovery-state.ts';
import { validateSearchProgress, type SearchProgress } from './search-plan.ts';

export async function discoveryControl(runId: string, cancel = false): Promise<unknown> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(runId)) throw new SearchFailure(null);
  return isTauri() ? invoke('search_control', { runId, cancel }) : fetch(`/engine/search/${runId}${cancel ? '/cancel' : ''}`, {
    method: cancel ? 'POST' : 'GET', headers: { 'X-JobScout-Import': '1' }, cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(5000),
  }).then(response => response.json());
}
export async function requestDiscovery(confirmation: SearchConfirmation, signal: AbortSignal, progress?: (value: SearchProgress) => void): Promise<unknown> {
  let timer: ReturnType<typeof setInterval> | undefined, polling = false;
  const cancel = () => { if (confirmation.run_id) void discoveryControl(confirmation.run_id, true).catch(() => {}); };
  if (confirmation.run_id) {
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    timer = setInterval(async () => {
      if (polling) return;
      polling = true;
      try { progress?.(validateSearchProgress(await discoveryControl(confirmation.run_id!))); } catch { /* Final response remains authoritative. */ }
      finally { polling = false; }
    }, 1000);
  }
  try {
    const data: unknown = isTauri() ? await invoke('job_search', { confirmation }) : await fetch('/engine/search', {
      method: 'POST', headers: { 'X-JobScout-Import': '1', 'Content-Type': 'application/json' },
      body: JSON.stringify(confirmation), cache: 'no-store', credentials: 'omit', redirect: 'error',
      signal: confirmation.run_id ? AbortSignal.timeout(85_000) : AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
    }).then(response => response.json());
    if (data && typeof data === 'object' && 'error' in data) throw new SearchFailure(data.error);
    return data;
  } catch (cause) {
    cancel();
    if (cause instanceof SearchFailure) throw cause;
    throw new SearchFailure(null);
  } finally {
    if (timer) clearInterval(timer);
    signal.removeEventListener('abort', cancel);
  }
}
