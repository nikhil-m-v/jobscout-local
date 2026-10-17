export type CoreSnapshot = {
  system: 'windows' | 'linux' | 'macos' | 'other';
  process_bits: 32 | 64 | null;
  logical_processors: number | null;
  memory_bytes: number | null;
  storage: 'verified' | 'unavailable' | 'cleanup_needed' | 'busy';
};

export function validateCoreSnapshot(value: unknown): CoreSnapshot {
  const fail = () => { throw new Error('Local check unavailable.'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  const item = value as Record<string, unknown>;
  const bounded = (v: unknown, min: number, max: number) => v === null ||
    (typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max);
  if (Object.keys(item).sort().join(',') !== 'logical_processors,memory_bytes,process_bits,storage,system' ||
      !['windows', 'linux', 'macos', 'other'].includes(item.system as string) ||
      ![32, 64, null].includes(item.process_bits as 32 | 64 | null) ||
      !bounded(item.logical_processors, 1, 65536) || !bounded(item.memory_bytes, 0, Number.MAX_SAFE_INTEGER) ||
      !['verified', 'unavailable', 'cleanup_needed', 'busy'].includes(item.storage as string)) return fail();
  return item as CoreSnapshot;
}

export const storageCheckMessages = {
  verified: ['Temporary-file check passed', 'JobScout wrote, read back and removed a small test file. This does not test a database save or guarantee future saves.'],
  unavailable: ['Storage test could not finish', 'Check that your personal-data folder is available and has free space and write access, then try again. Your existing records were not changed.'],
  cleanup_needed: ['Test-file cleanup needs attention', 'A tiny file containing only fixed test text may remain in your data folder. Check folder access, then try again; JobScout will try removing that file before running a new test.'],
  busy: ['Another storage check is finishing', 'Wait a moment, then try again. Stopping waiting does not interrupt file cleanup.'],
} as const;

type State = Readonly<{ status: 'idle' | 'checking' | 'done' | 'error' | 'stopped'; snapshot: CoreSnapshot | null }>;
export function createCoreCheck(request: (signal: AbortSignal) => Promise<CoreSnapshot>) {
  let state: State = { status: 'idle', snapshot: null };
  let generation = 0;
  let controller: AbortController | undefined;
  const listeners = new Set<() => void>();
  function publish(next: State) { state = next; listeners.forEach(listener => listener()); }
  function invalidate(stopped = false) {
    generation++; controller?.abort(); controller = undefined;
    publish({ status: stopped ? 'stopped' : 'idle', snapshot: null });
  }
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
        const snapshot = validateCoreSnapshot(await request(controller.signal));
        if (current === generation) publish({ status: 'done', snapshot });
      } catch {
        if (current === generation) publish({ status: 'error', snapshot: null });
      } finally { if (current === generation) controller = undefined; }
    },
  };
}
