import { invoke, isTauri } from '@tauri-apps/api/core';
import { validateStorageSnapshot } from './setup-storage.ts';

export async function readSetupStorage(signal: AbortSignal) {
  const value: unknown = isTauri() ? await invoke('setup_storage') : await fetch('/engine/setup/storage', {
    headers: { 'X-JobScout-Import': '1' }, cache: 'no-store', redirect: 'error', credentials: 'omit',
    signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
  }).then(response => {
    if (!response.ok) throw new Error('Storage check unavailable.');
    return response.json();
  });
  return validateStorageSnapshot(value);
}
