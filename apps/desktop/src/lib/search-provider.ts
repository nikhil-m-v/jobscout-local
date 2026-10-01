import { invoke, isTauri } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

export interface SearchProviderStatus {
  provider: 'tavily'; key_saved: boolean; connection_verified: false;
  dispatch_available: false; secret_store: 'windows-credential-manager';
}

export async function searchProviderRequest(action: 'load' | 'save' | 'delete', key?: string): Promise<SearchProviderStatus> {
  let data: unknown;
  try {
    data = isTauri() ? await invoke('search_provider', { action, key }) :
      await fetch('/engine/providers/tavily', {
        method: action === 'load' ? 'GET' : action === 'save' ? 'PUT' : 'DELETE',
        headers: { 'X-JobScout-Import': '1', ...(action === 'save' ? { 'Content-Type': 'application/json' } : {}) },
        body: action === 'save' ? JSON.stringify({ key }) : undefined,
        cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(10_000),
      }).then(response => response.json());
  } catch {
    throw new Error(action === 'load' ? 'Key status could not be checked. Reconnect the workspace and try again.' :
      'The change could not be confirmed. Check key status before retrying.');
  }
  if (data && typeof data === 'object' && 'error' in data) {
    const code = (data as { error: unknown }).error;
    if (code === 'invalid_provider_key') throw new Error('Enter a key of up to 512 characters without spaces or line breaks.');
    if (code === 'secret_store_unavailable') throw new Error('Windows Credential Manager is unavailable. Continue locally or check key status again later.');
  }
  if (!data || typeof data !== 'object') throw new Error('Key status could not be confirmed. Check again before retrying.');
  const value = data as Record<string, unknown>;
  if (Object.keys(value).sort().join(',') !== 'connection_verified,dispatch_available,key_saved,provider,secret_store' ||
      value.provider !== 'tavily' || typeof value.key_saved !== 'boolean' || value.connection_verified !== false ||
      value.dispatch_available !== false || value.secret_store !== 'windows-credential-manager' ||
      (action === 'save' && value.key_saved !== true) || (action === 'delete' && value.key_saved !== false)) {
    throw new Error('Key status could not be confirmed. Check again before retrying.');
  }
  return value as unknown as SearchProviderStatus;
}

const providerLinks = {
  dashboard: 'https://app.tavily.com',
  guide: 'https://help.tavily.com/articles/9170796666-how-can-i-create-an-api-key',
} as const;

export async function openSearchProviderLink(link: keyof typeof providerLinks): Promise<void> {
  const url = providerLinks[link];
  if (isTauri()) await openUrl(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}
