import { useEffect, useRef } from 'react';
import { FileText, LockKeyhole, LoaderCircle } from 'lucide-react';
import { RESUME_ACCEPT, validateResumeSelection } from '../lib/resume-selection';
import { MAX_REVIEW_CHARACTERS } from '../lib/resume-import';
import type { useResumeImport } from '../hooks/useResumeImport';

export function ResumePicker({ resume }: { resume: ReturnType<typeof useResumeImport> }) {
  const { selection, document, busy } = resume;
  const input = useRef<HTMLInputElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const picker = input.current;
    const cancelled = () => resume.setNotice(selection ? 'Picker closed. Your previous selection and review are kept.' : 'Picker closed. No file selected.');
    picker?.addEventListener('cancel', cancelled);
    return () => picker?.removeEventListener('cancel', cancelled);
  }, [selection, resume.setNotice]);
  useEffect(() => { if (document) editor.current?.focus(); }, [document]);

  return <>
    <div className="page-heading"><div><p className="eyebrow">YOUR STORY, IN ONE PLACE</p><h1>Read. Review. Make it yours.</h1><p className="muted">Bring your resume into a private, local workspace.</p></div></div>
    <section className="settings-panel resume-panel" aria-labelledby="resume-title">
      <div className="settings-title"><span className="icon-tile lavender"><FileText size={20} /></span><div><h2 id="resume-title">Start with your resume.</h2><p>Your experience, under your control.</p></div></div>
      <p id="resume-guidance" className="resume-guidance">PDF or Word (.docx), up to 10 MiB. Read text-based PDFs of up to 50 pages locally. Word extraction and scanned-PDF recognition are coming later.</p>
      <input ref={input} type="file" hidden accept={RESUME_ACCEPT} aria-label="Choose a resume" onChange={event => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        const result = validateResumeSelection(file);
        resume.setNotice('');
        if (result.ok) resume.select(file, result.selection);
        else resume.setError(`${result.error}${selection ? ' Your previous selection and review are kept.' : ''}`);
        event.currentTarget.value = '';
      }} />
      {selection && <div className="resume-selection"><span className="icon-tile green"><FileText size={20} /></span><div><h3 className="resume-filename">{selection.name}</h3><p>{selection.format === 'pdf' ? 'PDF document' : 'Word document'} · {selection.size < 1024 ? `${selection.size} bytes` : `${(selection.size / 1024 / 1024).toLocaleString(undefined, { maximumFractionDigits: 2 })} MiB`} · This session only</p></div></div>}
      <div className="resume-actions">
        <button ref={chooseButton} className={`button ${selection ? 'secondary' : 'primary'}`} disabled={busy} aria-describedby="resume-guidance" onClick={() => input.current?.click()}>{selection ? 'Choose a different file' : 'Choose a resume'} <FileText size={16} /></button>
        {selection?.format === 'pdf' && !document && !busy && <button className="button primary" onClick={() => void resume.extract()}>Extract text</button>}
        {busy && <button className="button secondary" onClick={() => { resume.cancel(); requestAnimationFrame(() => chooseButton.current?.focus()); }}>Cancel extraction</button>}
        {selection && !busy && <button className="button secondary" onClick={() => { resume.select(null); chooseButton.current?.focus(); }}>Remove document</button>}
      </div>
      {selection?.format === 'docx' && <p className="resume-notice">Word text extraction is not available yet. Export a PDF to review your text now.</p>}
      {busy && <p className="import-progress"><LoaderCircle size={16} className="spinning" aria-hidden="true" /> Reading locally. You can keep using the workspace.</p>}
      {resume.error && <p className="inline-error" role="alert">{resume.error}</p>}
      <p className="resume-notice" role="status" aria-live="polite">{resume.notice}</p>
      <p className="privacy-note resume-privacy"><LockKeyhole size={14} /><span>Your document is read only on this computer. The selected file, extracted text, and edits stay in memory until you remove the document or close the app. Nothing is saved to your profile yet.</span></p>
    </section>
    {document && <section className="settings-panel resume-panel review-panel" aria-labelledby="review-title">
      <div className="settings-title"><div><p className="eyebrow">CHECK THE DETAILS</p><h2 id="review-title">Your words, ready to review.</h2><p>{document.page_count} {document.page_count === 1 ? 'page' : 'pages'} read · No AI changes</p></div></div>
      <p id="review-guidance" className="resume-guidance">PDF layouts can change the reading order. Correct the text below, then mark it reviewed for this session. Closing the app clears your edits.</p>
      {document.empty_pages.length > 0 && <p className="inline-error" role="status">No readable text on {document.empty_pages.length === 1 ? 'page' : 'pages'} {document.empty_pages.join(', ')}. These pages may contain images or scans. Check the original for missing details.</p>}
      <label className="review-label" htmlFor="resume-text">Resume text</label>
      <textarea ref={editor} id="resume-text" className="review-editor" value={resume.text} maxLength={MAX_REVIEW_CHARACTERS} spellCheck={false} autoComplete="off" aria-describedby="review-guidance review-count" onChange={event => resume.edit(event.target.value)} />
      <p id="review-count" className="resume-notice">{resume.text.length.toLocaleString()} / {MAX_REVIEW_CHARACTERS.toLocaleString()} characters · {resume.reviewed ? 'Reviewed for this session' : 'Awaiting your review'}</p>
      <div className="resume-actions"><button className="button primary" disabled={!resume.text.trim() || resume.reviewed} onClick={resume.markReviewed}>{resume.reviewed ? 'Reviewed' : 'Mark reviewed for this session'}</button><button className="button secondary" onClick={() => { resume.discardText(); chooseButton.current?.focus(); }}>Discard text and edits</button></div>
    </section>}
  </>;
}
