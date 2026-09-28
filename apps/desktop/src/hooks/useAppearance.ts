import { useEffect, useState } from 'react';

export type Appearance = 'system' | 'light' | 'dark';
const storageKey = 'jobscout.appearance';

function readPreference(): Appearance {
  try {
    const value = localStorage.getItem(storageKey);
    if (value === 'light' || value === 'dark') return value;
  } catch { /* Appearance still works when preference storage is unavailable. */ }
  return 'system';
}

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(readPreference);
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
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const changeAppearance = (next: Appearance) => {
    setAppearance(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Keep the session choice. */ }
  };
  return { appearance, changeAppearance };
}
