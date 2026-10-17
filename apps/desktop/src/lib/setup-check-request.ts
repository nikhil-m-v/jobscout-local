import { invoke, isTauri } from '@tauri-apps/api/core';
import { validateCoreSnapshot } from './setup-check.ts';

export async function runSetupCheck(signal: AbortSignal) {
  const value: unknown = isTauri() ? await invoke('setup_check') : await fetch('/engine/setup/check', {
    method: 'POST', headers: { 'X-JobScout-Import': '1' },
    cache: 'no-store', redirect: 'error', credentials: 'omit',
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  }).then(response => {
    if (!response.ok) throw new Error('Local check unavailable.');
    return response.json();
  });
  return validateCoreSnapshot(value);
}
