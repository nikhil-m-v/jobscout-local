import { useCallback, useEffect, useRef, useState } from 'react';
import { readEngineHealth, type EngineHealth } from '../lib/engine';

export function useEngine() {
  const [health, setHealth] = useState<EngineHealth | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const hasConnection = useRef(false);
  const lastCheck = useRef(0);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      const next = await readEngineHealth();
      if (mounted.current) { hasConnection.current = true; setHealth(next); setError(null); }
    } catch {
      if (mounted.current) { hasConnection.current = false; setHealth(null); setError('We could not reach your local workspace. Try again in a moment.'); }
    } finally {
      inFlight.current = false;
      lastCheck.current = Date.now();
      if (mounted.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = window.setInterval(() => {
      const interval = hasConnection.current ? 15000 : 2500;
      if (document.visibilityState === 'visible' && Date.now() - lastCheck.current >= interval) void refresh();
    }, 2500);
    return () => { mounted.current = false; window.clearInterval(timer); };
  }, [refresh]);

  return { health, checking, error, refresh };
}
