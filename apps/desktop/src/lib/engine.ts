import { invoke, isTauri } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

export interface EngineHealth {
  status: 'ready';
  version: string;
  database: 'ready' | 'error';
  local_ai: { provider: string; status: 'available' | 'unavailable' | 'error'; installed_models: number };
}

export async function readEngineHealth(): Promise<EngineHealth> {
  const data: unknown = isTauri()
    ? await invoke('engine_health')
    : await fetch('/engine/health', { signal: AbortSignal.timeout(5000) }).then(response => {
        if (!response.ok) throw new Error('The local engine could not be reached.');
        return response.json();
      });
  if (!data || typeof data !== 'object') throw new Error('Unexpected engine response.');
  const health = data as EngineHealth;
  if (health.status !== 'ready' || !['ready', 'error'].includes(health.database) ||
      !health.local_ai || !['available', 'unavailable', 'error'].includes(health.local_ai.status) ||
      !Number.isInteger(health.local_ai.installed_models) || typeof health.version !== 'string') {
    throw new Error('Unexpected engine response.');
  }
  return health;
}

export async function openOllamaWebsite(): Promise<void> {
  if (isTauri()) await openUrl('https://ollama.com/download/windows');
  else window.open('https://ollama.com/download/windows', '_blank', 'noopener,noreferrer');
}
