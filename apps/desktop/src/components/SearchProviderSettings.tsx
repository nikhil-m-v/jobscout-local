import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LockKeyhole } from 'lucide-react';
import { openSearchProviderLink, searchProviderRequest, type SearchProviderStatus } from '../lib/search-provider';
import { useProviderConnection } from '../hooks/useProviderConnection';

export function SearchProviderSettings({ connected }: { connected: boolean }) {
  const [status, setStatus] = useState<SearchProviderStatus | null>(null);
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmCheck, setConfirmCheck] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const pending = useRef(false);
  const generation = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const connection = useProviderConnection(connected && Boolean(status?.key_saved));

  async function run(action: 'load' | 'save' | 'delete') {
    if (pending.current || connection.busy || !connected) return;
    connection.invalidate(); setConfirmCheck(false);
    pending.current = true; setBusy(true); setShow(false); setError(''); setNotice('');
    const current = generation.current;
    try {
      const result = await searchProviderRequest(action, action === 'save' ? key : undefined);
      if (current !== generation.current) return;
      setStatus(result); setConfirmRemove(false);
      if (action !== 'load') {
        setKey(''); setShow(false);
        setNotice(action === 'save' ? 'Key saved locally. Connection has not been checked; online search is still unavailable.' : 'Saved key removed. Local profile features remain available.');
        input.current?.focus();
      }
    } catch (cause) {
      if (current === generation.current) { setStatus(null); setConfirmRemove(false); setError((cause as Error).message); }
    } finally {
      if (current === generation.current) { pending.current = false; setBusy(false); }
    }
  }

  useEffect(() => {
    if (connected) void run('load');
    else { setStatus(null); setKey(''); setShow(false); setConfirmRemove(false); setConfirmCheck(false); setBusy(false); }
    return () => { generation.current++; pending.current = false; };
  }, [connected]);

  const disabled = !connected || busy || connection.busy || !status;
  const validKey = /^[\x21-\x7e]{1,512}$/.test(key);
  function openLink(link: 'dashboard' | 'guide') {
    setLinkError(false);
    void openSearchProviderLink(link).catch(() => setLinkError(true));
  }
  return <section className="settings-panel" aria-labelledby="search-provider-title">
    <div className="settings-title"><span className="icon-tile peach"><LockKeyhole size={20} /></span><div><h2 id="search-provider-title">Online discovery · optional</h2><p>Prepare Tavily now, or keep using your local workspace.</p></div><span className="status-text">{!connected ? 'Workspace offline' : busy ? 'Checking…' : !status ? 'Not verified' : status.key_saved ? 'Key saved' : 'Not configured'}</span></div>
    <p className="resume-guidance">Tavily will help find jobs using generic criteria you review. Your resume and personal details stay on this computer. Search requests may use provider credits and reveal your IP address and API-account association.</p>
    <div className="criteria-actions provider-links"><button className="button secondary" onClick={() => openLink('dashboard')}>Open Tavily dashboard <ArrowUpRight size={14} /></button><button className="text-action" onClick={() => openLink('guide')}>How to get a key <ArrowUpRight size={14} /></button></div>
    <p className="criteria-help">These links open external websites with their own data practices.</p>
    {linkError && <p className="inline-error" role="alert">The website could not be opened. Visit app.tavily.com in your browser.</p>}
    <form onSubmit={event => { event.preventDefault(); if (!disabled && validKey) void run('save'); }}>
      <label className="review-label" htmlFor="tavily-key">{status?.key_saved ? 'Replace API key' : 'Tavily API key'}</label>
      <div className="provider-key-row"><input ref={input} id="tavily-key" type={show ? 'text' : 'password'} value={key} onChange={event => { setKey(event.target.value); setNotice(''); setConfirmRemove(false); setConfirmCheck(false); connection.invalidate(); }} disabled={disabled} autoComplete="off" spellCheck={false} autoCapitalize="none" maxLength={512} aria-describedby="key-storage-note" /><button type="button" className="button secondary" disabled={disabled || !key} aria-pressed={show} onClick={() => setShow(value => !value)}>{show ? 'Hide' : 'Show'}</button></div>
      <p id="key-storage-note" className="criteria-help">Saved in Windows Credential Manager for this workspace. Saved keys are never shown here. Other software running as you may access them.</p>
      {key && !validKey && <p className="inline-error">Use a key without spaces or line breaks.</p>}
      <div className="criteria-actions"><button className="button primary" type="submit" disabled={disabled || !validKey}>{busy ? 'Working…' : status?.key_saved ? 'Replace saved key' : 'Save key locally'}</button><button className="button secondary" type="button" disabled={!connected || busy || connection.busy} onClick={() => void run('load')}>Check key status</button>{status?.key_saved && <button className="button secondary" type="button" disabled={disabled} onClick={() => { connection.invalidate(); setConfirmCheck(false); setConfirmRemove(true); setKey(''); setShow(false); }}>Remove saved key</button>}<button className="button secondary" type="button" disabled={busy || connection.busy} onClick={() => { connection.invalidate(); setKey(''); setShow(false); setConfirmRemove(false); setConfirmCheck(false); setNotice('Setup deferred. Any previously saved key is kept. You can continue using local features.'); }}>Set up later</button></div>
    </form>
    {confirmRemove && <div className="query-preview"><p className="resume-notice">Remove the saved Tavily key from this workspace? This does not revoke the key at Tavily or delete your profile.</p><div className="criteria-actions"><button className="button secondary" disabled={disabled} onClick={() => { setConfirmRemove(false); input.current?.focus(); }}>Keep key</button><button className="button primary" disabled={disabled} onClick={() => void run('delete')}>Confirm removal</button></div></div>}
    <div className="query-preview" aria-labelledby="provider-check-title"><h3 id="provider-check-title">Check the saved key with Tavily</h3><p className="criteria-help">This is an optional internet request. Save or discard a replacement draft before checking.</p><div className="criteria-actions"><button className="button secondary" disabled={disabled || !status?.key_saved || Boolean(key) || confirmRemove} onClick={() => { setNotice(''); setConfirmCheck(true); }}>Review connection check</button>{connection.busy && <button className="button secondary" onClick={() => { connection.invalidate(); setNotice('Stopped waiting. A request already sent may finish at Tavily.'); }}>Stop waiting</button>}</div>
      {confirmCheck && !connection.busy && <div className="query-preview"><p className="resume-notice">Send one GET request to <span className="provider-endpoint">https://api.tavily.com/usage</span> with your saved Tavily key. Tavily sees network metadata and API-account association. No resume, profile, job criteria or search query is sent. This reads account usage; no job search is performed. Provider limits and billing rules apply.</p><p className="criteria-help">Stopping the check ends waiting in JobScout; it cannot recall a request already sent. The result applies only to this check.</p><div className="criteria-actions"><button className="button secondary" disabled={disabled} onClick={() => setConfirmCheck(false)}>Not now</button><button className="button primary" disabled={disabled || !status?.key_saved || Boolean(key)} onClick={() => { setConfirmCheck(false); setNotice(''); void connection.check(); }}>Send connection check</button></div></div>}
      {connection.verified && <p className="resume-notice" role="status">Tavily accepted the saved key for this check. This does not guarantee search credits or enable online discovery.</p>}
      {connection.error && <p className="inline-error" role="alert">{connection.error}</p>}
    </div>
    <p className="resume-notice" role="status">{notice || (!connected ? 'Reconnect the workspace to manage keys. Local documents remain on this computer.' : busy ? 'Working with the local secret store…' : connection.busy ? 'Checking Tavily…' : 'Saving or checking local key status makes no request to Tavily. Online search remains unavailable.')}</p>
    {error && <p className="inline-error" role="alert">{error}</p>}
  </section>;
}
