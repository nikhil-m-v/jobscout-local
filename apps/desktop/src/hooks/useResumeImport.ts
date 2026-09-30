import { useEffect, useRef, useState } from 'react';
import { extractResume, type ExtractedDocument } from '../lib/resume-import';
import type { ResumeSelection } from '../lib/resume-selection';

export function useResumeImport() {
  const [selected, setSelected] = useState<{ file: File; metadata: ResumeSelection } | null>(null);
  const [document, setDocument] = useState<ExtractedDocument | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  function stop() {
    active.current?.abort(); active.current = null; setBusy(false);
  }
  function clearText() {
    stop(); setDocument(null); setText(''); setReviewed(false); setError('');
  }
  function select(file: File | null, metadata?: ResumeSelection) {
    clearText();
    setSelected(file && metadata ? { file, metadata } : null);
    setNotice(file ? 'File selected. Choose Extract text to read it on this computer.' : 'Document and draft cleared. Any saved profile is kept; your original file is unchanged.');
  }
  async function extract() {
    if (!selected || busy) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true); setError(''); setNotice('Reading your document on this computer…');
    try {
      const result = await extractResume(selected.file, controller.signal);
      if (active.current !== controller) return;
      setDocument(result); setText(result.text); setReviewed(false);
      setNotice('Text is ready to review. Check the reading order and correct anything missing.');
    } catch (cause) {
      if (active.current !== controller) return;
      setNotice('');
      setError(cause instanceof Error && cause.name !== 'TypeError' && cause.name !== 'TimeoutError'
        ? cause.message : 'The local engine could not be reached or took too long. Check the workspace in Settings, then try again.');
    } finally {
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  }
  return {
    selection: selected?.metadata ?? null, document, text, busy, reviewed, error, notice,
    select, extract, setError, setNotice,
    edit(value: string) { setText(value); setReviewed(false); },
    cancel() { stop(); setNotice('Extraction cancelled. You can try again.'); },
    discardText() { clearText(); setNotice('Draft and edits cleared. Any saved profile is kept.'); },
    loadSaved(value: string) { clearText(); setSelected(null); setDocument({ text: value, page_count: null, empty_pages: [] }); setText(value); setNotice('Saved text copied into the review. Edits stay unsaved until you review and save again.'); },
    markReviewed() { setReviewed(true); setNotice('Text reviewed. Choose Save reviewed text to keep it after closing the app.'); },
  };
}
