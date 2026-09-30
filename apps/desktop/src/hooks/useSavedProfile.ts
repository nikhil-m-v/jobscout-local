import { useEffect, useRef, useState } from 'react';
import { profileRequest, type SavedProfile } from '../lib/profile';

export function useSavedProfile() {
  const [profile, setProfile] = useState<SavedProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const mounted = useRef(true);
  async function run(action: 'load' | 'save' | 'delete', text?: string): Promise<boolean> {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await profileRequest(action, text);
      if (!mounted.current) return false;
      setProfile(result); setReady(true);
      setNotice(action === 'save' ? 'Reviewed text saved on this computer.' : action === 'delete' ? 'Saved profile deleted. Your original resume file is unchanged.' : '');
      return true;
    } catch (cause) {
      if (mounted.current) { setError((cause as Error).message); setReady(false); }
      return false;
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    void run('load');
    return () => { mounted.current = false; };
  }, []);
  return { profile, busy, ready, error, notice, reload: () => run('load'),
    save: (text: string) => run('save', text), delete: () => run('delete') };
}
