import { useEffect, useState } from 'react';

export type Appearance = 'system' | 'light' | 'dark';
const storageKey = 'jobscout.appearance';
const transparencyKey = 'jobscout.reduce-transparency';
const motionKey = 'jobscout.reduce-motion';

function readReduction(key: string): boolean {
  try { return localStorage.getItem(key) === 'true'; }
  catch { return false; }
}

function readPreference(): Appearance {
  try {
    const value = localStorage.getItem(storageKey);
    if (value === 'light' || value === 'dark') return value;
  } catch { /* Appearance still works when preference storage is unavailable. */ }
  return 'system';
}

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(readPreference);
  const [reduceTransparency, setReduceTransparency] = useState(() => readReduction(transparencyKey));
  const [reduceMotion, setReduceMotion] = useState(() => readReduction(motionKey));
  useEffect(() => {
    document.documentElement.dataset.reduceTransparency = String(reduceTransparency);
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceTransparency, reduceMotion]);
  useEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme = appearance === 'system'
        ? (system.matches ? 'dark' : 'light') : appearance;
    };
    apply();
    system.addEventListener('change', apply);
    return () => system.removeEventListener('change', apply);
  }, [appearance]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) setAppearance(readPreference());
      if (event.key === transparencyKey || event.key === null) setReduceTransparency(readReduction(transparencyKey));
      if (event.key === motionKey || event.key === null) setReduceMotion(readReduction(motionKey));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const changeAppearance = (next: Appearance) => {
    setAppearance(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Keep the session choice. */ }
  };
  const changeReduceTransparency = (next: boolean) => {
    setReduceTransparency(next);
    try { localStorage.setItem(transparencyKey, String(next)); } catch { /* Keep the session choice. */ }
  };
  const changeReduceMotion = (next: boolean) => {
    setReduceMotion(next);
    try { localStorage.setItem(motionKey, String(next)); } catch { /* Keep the session choice. */ }
  };
  return { appearance, changeAppearance, reduceTransparency, changeReduceTransparency, reduceMotion, changeReduceMotion };
}
