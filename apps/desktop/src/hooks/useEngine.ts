import { useEffect, useState, useSyncExternalStore } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { readEngineHealth } from '../lib/engine';
import { createEngineConnection } from '../lib/engine-connection-state';

export function useEngine() {
  const [store] = useState(() => createEngineConnection(readEngineHealth));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    let active = true, unlisten: (() => void) | undefined;
    if (isTauri()) void listen('engine-stopped', () => store.stopped()).then(stop => {
      if (active) unlisten = stop; else stop();
    }).catch(() => { /* Health also reports a stopped engine if event setup fails. */ });
    void store.start();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') store.poll();
    }, 2500);
    return () => { active = false; unlisten?.(); store.dispose(); window.clearInterval(timer); };
  }, [store]);
  return { ...state, refresh: store.refresh };
}
