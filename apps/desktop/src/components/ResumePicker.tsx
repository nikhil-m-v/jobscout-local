import { useEffect, useRef, useState } from 'react';
import { FileText, LockKeyhole } from 'lucide-react';
import { RESUME_ACCEPT, validateResumeSelection, type ResumeSelection } from '../lib/resume-selection';

export function ResumePicker({ selection, onSelect }: {
  selection: ResumeSelection | null;
  onSelect: (selection: ResumeSelection | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const picker = input.current;
    const cancelled = () => setNotice(selection ? 'Picker closed. Your previous selection is kept.' : 'Picker closed. No file selected.');
    picker?.addEventListener('cancel', cancelled);
    return () => picker?.removeEventListener('cancel', cancelled);
  }, [selection]);

  function discard() {
    onSelect(null);
    setError('');
    setNotice('Selection removed. Your original file is unchanged.');
    if (input.current) input.current.value = '';
    chooseButton.current?.focus();
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">YOUR STORY, IN ONE PLACE</p><h1>Start with your resume.</h1><p className="muted">Choose a document on this computer.</p></div></div>
    <section className="settings-panel resume-panel" aria-labelledby="resume-title">
      <div className="settings-title"><span className="icon-tile lavender"><FileText size={20} /></span><div><h2 id="resume-title">A small first step.</h2><p>Your experience, under your control.</p></div></div>
      <p id="resume-guidance" className="resume-guidance">PDF or Word (.docx), up to 10 MiB. This preview checks your selection only. Text extraction and profile review are coming next.</p>
      <input ref={input} type="file" hidden accept={RESUME_ACCEPT} aria-label="Choose a resume" onChange={event => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        const result = validateResumeSelection(file);
        setNotice('');
        if (result.ok) {
          onSelect(result.selection);
          setError('');
          setNotice('File selected. Its contents have not been read or saved.');
        } else {
          setError(`${result.error}${selection ? ' Your previous selection is kept.' : ''}`);
        }
        // Release the File reference and allow selecting the same file again.
        event.currentTarget.value = '';
      }} />
      {selection && <div className="resume-selection"><span className="icon-tile green"><FileText size={20} /></span><div><h3 className="resume-filename">{selection.name}</h3><p>{selection.format === 'pdf' ? 'PDF document' : 'Word document'} · {selection.size < 1024 ? `${selection.size} bytes` : `${(selection.size / 1024 / 1024).toLocaleString(undefined, { maximumFractionDigits: 2 })} MiB`} · Selected only</p></div></div>}
      <div className="resume-actions"><button ref={chooseButton} className="button primary" aria-describedby="resume-guidance" onClick={() => input.current?.click()}>{selection ? 'Choose a different file' : 'Choose a resume'} <FileText size={16} /></button>{selection && <button className="button secondary" onClick={discard}>Remove selection</button>}</div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <p className="resume-notice" role="status" aria-live="polite">{notice}</p>
      <p className="privacy-note resume-privacy"><LockKeyhole size={14} /><span>No upload or AI request. Only the filename, size, and format stay in memory while this workspace is open. Removing the selection or closing the app clears them.</span></p>
    </section>
    <section className="coming-panel"><FileText size={20} /><div><h3>Next: read, review, then keep.</h3><p>Local extraction will let you inspect the text before saving a profile. Scanned PDFs will need a later OCR feature.</p></div></section>
  </>;
}
