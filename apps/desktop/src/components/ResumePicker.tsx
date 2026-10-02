import { useEffect, useRef, useState } from 'react';
import { FileText, LockKeyhole, LoaderCircle } from 'lucide-react';
import { RESUME_ACCEPT, validateResumeSelection } from '../lib/resume-selection';
import { MAX_REVIEW_CHARACTERS } from '../lib/resume-import';
import type { useSavedProfile } from '../hooks/useSavedProfile';
import type { useResumeImport } from '../hooks/useResumeImport';

export function ResumePicker({ resume, saved }: { resume: ReturnType<typeof useResumeImport>; saved: ReturnType<typeof useSavedProfile> }) {
  const { selection, document, busy } = resume;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const locked = busy || saved.busy || !saved.connected;
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

    <section className={`settings-panel resume-panel upload-panel ${selection || document ? 'has-resume' : ''}`} aria-labelledby="resume-title">
      <div className="settings-title"><span className="icon-tile lavender"><FileText size={20} /></span><div><h2 id="resume-title">Start with your resume</h2><p>Select a file from your computer to get started.</p></div></div>
      <p id="resume-guidance" className="resume-guidance">PDF or Word · Up to 10 MB · PDFs up to 10 pages</p>
      <input ref={input} type="file" hidden accept={RESUME_ACCEPT} aria-label="Choose a resume" onChange={event => {
        const file = event.currentTarget.files?.[0];
        if (!file) return;
        const result = validateResumeSelection(file);
        resume.setNotice('');
        if (result.ok) resume.select(file, result.selection, true);
        else resume.setError(`${result.error}${selection ? ' Your previous selection and review are kept.' : ''}`);
        event.currentTarget.value = '';
      }} />
      {selection && <div className="resume-selection"><span className="icon-tile green"><FileText size={20} /></span><div><h3 className="resume-filename">{selection.name}</h3><p>{selection.format === 'pdf' ? 'PDF document' : 'Word document'} · {selection.size < 1024 ? `${selection.size} bytes` : `${(selection.size / 1024 / 1024).toLocaleString(undefined, { maximumFractionDigits: 2 })} MiB`} · This session only</p></div></div>}
      <div className="resume-actions">
        <button ref={chooseButton} className={`button ${selection ? 'secondary' : 'primary'}`} disabled={locked} aria-describedby="resume-guidance" onClick={() => input.current?.click()}>{selection ? 'Choose a different file' : 'Choose resume'} <FileText size={16} /></button>
        {selection && !document && !busy && <button className="button primary" disabled={saved.busy} onClick={() => void resume.extract()}>Read resume again</button>}
        {busy && <button className="button secondary" onClick={() => { resume.cancel(); requestAnimationFrame(() => chooseButton.current?.focus()); }}>Cancel extraction</button>}
        {selection && !busy && <button className="button secondary" disabled={saved.busy} onClick={() => { resume.select(null); chooseButton.current?.focus(); }}>Remove document</button>}
      </div>
      {!saved.connected && <p className="resume-guidance" role="status">{saved.error ? "Your local workspace is unavailable. Open Settings and choose Check again." : "Connecting to your local workspace. Resume selection will be available shortly."}</p>}
      {busy && <p className="import-progress"><LoaderCircle size={16} className="spinning" aria-hidden="true" /> Reading locally. You can keep using the workspace.</p>}
      {resume.error && <p className="inline-error" role="alert">{resume.error}</p>}
      <p className="resume-notice" role="status" aria-live="polite">{resume.notice}</p>
      <p className="upload-reassurance"><LockKeyhole size={14} /> Your resume stays on this computer.</p>
      <details className="upload-help"><summary>File support & privacy details</summary><p className="resume-guidance">Text-based PDFs and Word body paragraphs/tables are supported. Scanned PDFs need text recognition, which is not available yet. The limit is 10 MiB (10,485,760 bytes).</p><p className="resume-guidance">The file and unsaved edits stay in memory until removed or the app closes. Removing a draft keeps your saved profile. Use saved-data controls to delete saved text; your original document stays intact.</p></details>
    </section>
    <details className="saved-profile-details"><summary>Saved resume & data controls{saved.profile ? ' · Resume saved' : ''}</summary>
    <section className="settings-panel resume-panel" aria-labelledby="saved-title" aria-busy={saved.busy}>
      <div className="settings-title"><span className="icon-tile green"><LockKeyhole size={20} /></span><div><h2 id="saved-title">Your saved profile.</h2><p>{!saved.connected ? 'Waiting for your local workspace.' : saved.profile ? 'Reviewed text, kept on this computer.' : saved.ready ? 'Save when your words are ready.' : saved.error ? 'Local storage could not be checked.' : 'Checking local storage.'}</p></div></div>
      {saved.profile && <p className="resume-guidance">{saved.profile.text.length.toLocaleString()} characters · Saved {new Date(saved.profile.saved_at).toLocaleString()}</p>}
      <p className="resume-guidance">Only the text you explicitly save is kept after closing JobScout. Original files and filenames are not saved. Local storage is not encrypted; other software running as you may read it.</p>
      <div className="resume-actions">
        <button className="button secondary" disabled={locked} onClick={() => void saved.reload()}>{saved.busy ? 'Working…' : 'Reload saved profile'}</button>
        {saved.profile && <button className="button secondary" disabled={locked || !saved.ready} onClick={() => { resume.loadSaved(saved.profile!.text); setConfirmDelete(false); }}>Review saved text</button>}
        {saved.profile && !confirmDelete && <button className="button secondary" disabled={locked || !saved.ready} onClick={() => setConfirmDelete(true)}>Delete saved profile</button>}
      </div>
      {confirmDelete && saved.profile && <div>
        <p className="resume-guidance">Delete the saved text and clear the current document, extracted text, and edits? Your original file is kept. This cannot be undone and does not securely erase disk or backup copies.</p>
        <div className="resume-actions"><button className="button secondary" disabled={locked || !saved.ready} onClick={() => { void saved.delete().then(deleted => { if (deleted) { resume.select(null); setConfirmDelete(false); requestAnimationFrame(() => chooseButton.current?.focus()); } }); }}>Delete profile and clear draft</button><button className="button secondary" disabled={saved.busy} onClick={() => setConfirmDelete(false)}>Keep profile</button></div>
      </div>}
      {saved.error && <p className="inline-error" role="alert">{saved.error}</p>}
      <p className="resume-notice" role="status" aria-live="polite">{saved.notice}</p>
    </section>
    </details>
    {document && <details className="resume-review-details" open={!resume.reviewed}><summary>{resume.reviewed ? "Resume reviewed · Edit text" : "Review extracted resume text"}</summary><section className="settings-panel resume-panel review-panel" aria-labelledby="review-title">
      <div className="settings-title"><div><p className="eyebrow">CHECK THE DETAILS</p><h2 id="review-title">Check your resume.</h2><p>{!selection ? 'Saved text loaded' : document.page_count === null ? 'Word body text read' : `${document.page_count} ${document.page_count === 1 ? 'page' : 'pages'} read`} · No AI changes</p></div></div>
      <p id="review-guidance" className="resume-guidance">Document layouts can change the reading order. Word headers, footers, images, and embedded files are not extracted. Correct the text below, mark it reviewed, then choose Save reviewed text. Closing the app clears unsaved edits. Saving replaces the previous saved text.</p>
      {document.empty_pages.length > 0 && <p className="inline-error" role="status">No readable text on {document.empty_pages.length === 1 ? 'page' : 'pages'} {document.empty_pages.join(', ')}. These pages may contain images or scans. Check the original for missing details.</p>}
      <label className="review-label" htmlFor="resume-text">Resume text</label>
      <textarea ref={editor} id="resume-text" className="review-editor" value={resume.text} maxLength={MAX_REVIEW_CHARACTERS} disabled={saved.busy} spellCheck={false} autoComplete="off" aria-describedby="review-guidance review-count" onChange={event => resume.edit(event.target.value)} />
      <p id="review-count" className="resume-notice">{resume.text.length.toLocaleString()} / {MAX_REVIEW_CHARACTERS.toLocaleString()} characters · {resume.reviewed ? 'Reviewed' : 'Awaiting your review'}</p>
      <div className="resume-actions"><button className="button primary" disabled={saved.busy || !resume.text.trim() || resume.reviewed} onClick={resume.markReviewed}>{resume.reviewed ? 'Reviewed' : 'Continue to job preferences'}</button><button className="button secondary" disabled={locked || !saved.ready || !resume.reviewed || !resume.text.trim() || saved.profile?.text === resume.text} onClick={() => void saved.save(resume.text)}>{saved.profile?.text === resume.text ? 'Saved on this computer' : saved.profile ? 'Replace saved profile' : 'Save reviewed text'}</button><button className="button secondary" disabled={saved.busy} onClick={() => { resume.discardText(); chooseButton.current?.focus(); }}>Discard text and edits</button></div>
    </section></details>}
  </>;
}
