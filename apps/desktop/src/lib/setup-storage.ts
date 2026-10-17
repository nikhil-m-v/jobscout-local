export type StorageSnapshot = { folder: string | null; free_bytes: number | null };

export function validateStorageSnapshot(value: unknown): StorageSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Storage check unavailable.');
  const item = value as Record<string, unknown>;
  if (Object.keys(item).sort().join(',') !== 'folder,free_bytes' ||
      !(item.folder === null || (typeof item.folder === 'string' && item.folder.length > 0 && item.folder.length <= 32767 && !/[\u0000-\u001f]/.test(item.folder))) ||
      !(item.free_bytes === null || (typeof item.free_bytes === 'number' && Number.isSafeInteger(item.free_bytes) && item.free_bytes >= 0))) {
    throw new Error('Storage check unavailable.');
  }
  return item as StorageSnapshot;
}

export function describeSpace(bytes: number | null): string {
  if (bytes === null) return 'Available space could not be checked.';
  if (bytes === 0) return 'No free space reported. Free up space before saving records.';
  if (bytes < 1024 ** 2) return 'Less than 1 MiB available on this drive.';
  const unit = bytes < 1024 ** 3 ? 'MiB' : 'GiB';
  const amount = bytes / (unit === 'MiB' ? 1024 ** 2 : 1024 ** 3);
  return `About ${amount.toFixed(1)} ${unit} available on this drive.`;
}

type CheckState = Readonly<{ status: 'idle' | 'checking' | 'done' | 'error'; snapshot: StorageSnapshot | null }>;
const empty: CheckState = { status: 'idle', snapshot: null };
export function createStorageCheck(request: (signal: AbortSignal) => Promise<StorageSnapshot>) {
  let state = empty;
  let generation = 0;
  let controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  function publish(next: CheckState) { state = next; listeners.forEach(listener => listener()); }
  function invalidate() { generation++; controller?.abort(); controller = undefined; publish(empty); }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate,
    async check() {
      if (state.status === 'checking') return;
      invalidate();
      const current = generation;
      controller = new AbortController();
      publish({ status: 'checking', snapshot: null });
      try {
        const snapshot = validateStorageSnapshot(await request(controller.signal));
        if (current === generation) publish({ status: 'done', snapshot });
      } catch {
        if (current === generation) publish({ status: 'error', snapshot: null });
      } finally { if (current === generation) controller = undefined; }
    },
  };
}
