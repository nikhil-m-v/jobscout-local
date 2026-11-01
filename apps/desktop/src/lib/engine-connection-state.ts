import type { EngineHealth } from './engine.ts';

export const stoppedWorkspaceMessage = 'Your local workspace stopped. Close and reopen JobScout to reconnect. Save operations that were still running may not have finished; check your saved records after reopening.';
export class EngineStoppedError extends Error {}
type State = Readonly<{ health: EngineHealth | null; checking: boolean; error: string | null; stopped: boolean }>;
const initial: State = { health: null, checking: true, error: null, stopped: false };

export function createEngineConnection(read: () => Promise<EngineHealth>, now = Date.now) {
  let state = initial, active = false, pending = false, generation = 0, lastCheck = 0;
  const listeners = new Set<() => void>();
  const publish = (next: State) => { state = next; listeners.forEach(listener => listener()); };
  function stopped() {
    generation++; pending = false;
    publish({ health: null, checking: false, error: stoppedWorkspaceMessage, stopped: true });
  }
  async function refresh() {
    if (!active || pending || state.stopped) return;
    pending = true; const current = ++generation;
    publish({ ...state, checking: true });
    try {
      const health = await read();
      if (active && current === generation) publish({ health, checking: true, error: null, stopped: false });
    } catch (cause) {
      if (active && current === generation) {
        if (cause instanceof EngineStoppedError) stopped();
        else publish({ health: null, checking: true, error: 'We could not reach your local workspace. Try again in a moment.', stopped: false });
      }
    } finally {
      if (active && current === generation) {
        pending = false; lastCheck = now(); publish({ ...state, checking: false });
      }
    }
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start() { active = true; return refresh(); },
    dispose() { active = false; generation++; pending = false; },
    stopped() { if (active) stopped(); },
    refresh,
    poll() { if (now() - lastCheck >= (state.health ? 15000 : 2500)) void refresh(); },
  };
}
