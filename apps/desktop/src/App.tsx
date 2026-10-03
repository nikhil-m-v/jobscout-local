import { useEffect, useState } from 'react';
import { DiscoveryJourney, type DiscoveryStep } from './components/DiscoveryJourney';
import { SearchProviderSettings } from './components/SearchProviderSettings';
import { initialCriteria, type PublicSearchCriteria } from './lib/public-search-criteria';
import { useSearchPreview } from './hooks/useSearchPreview';
import { useDiscovery } from './hooks/useDiscovery';
import { useAssistance } from './hooks/useAssistance';
import { ArrowUpRight, CircleHelp, LockKeyhole, Monitor, Moon, RefreshCw, Settings2, ShieldCheck, Sparkles, Sun } from 'lucide-react';
import { useEngine } from './hooks/useEngine';
import { useAppearance, type Appearance } from './hooks/useAppearance';
import { openOllamaWebsite } from './lib/engine';

import { useSavedProfile } from './hooks/useSavedProfile';
import { useResumeImport } from './hooks/useResumeImport';

type Page = 'discover' | 'settings';
type Engine = ReturnType<typeof useEngine>;
function EngineBadge({ engine }: { engine: Engine }) {
  const label = engine.health ? 'Workspace connected' : engine.checking ? 'Connecting workspace' : 'Workspace offline';
  return <span className={`status-pill ${engine.health ? 'connected' : ''}`} role="status">
    <span className="status-dot" />{label}
  </span>;
}

function PrivacyPanel() {
  return <section className="settings-panel" aria-labelledby="privacy-title">
    <div className="settings-title">
      <span className="icon-tile green"><ShieldCheck size={20} /></span>
      <div><h2 id="privacy-title">Your privacy comes first.</h2><p>Our commitment: personal career data stays on this computer.</p></div>
    </div>
    <dl className="privacy-details">
      <div><dt>Local intelligence</dt><dd>PDF/Word extraction and saved profile text stay on this computer. Embeddings and matching will also run locally. No hosted AI fallback.</dd></div>
      <div><dt>Private discovery</dt><dd>Searches send only reviewed, generic job criteria. Your resume and personal details will stay local.</dd></div>
      <div><dt>Clear boundaries</dt><dd>Online search uses Tavily after you review and send a public query. Opening an external website connects your browser to that site.</dd></div>
    </dl>
    <p className="privacy-note">Online providers can see your search criteria, connection details such as your IP address, and provider-account information. Keeping personal content local does not make an internet connection anonymous.</p>
  </section>;
}

function Settings({ engine, appearance, changeAppearance }: { engine: Engine; appearance: Appearance; changeAppearance: (appearance: Appearance) => void }) {
  const [linkError, setLinkError] = useState(false);
  const ai = engine.health?.local_ai;
  return <>
    <div className="page-heading"><div><p className="eyebrow">MAKE IT YOURS</p><h1>Your workspace, at a glance.</h1><p className="muted">See what is ready and what needs a little attention.</p></div></div>
    <PrivacyPanel />
    <SearchProviderSettings connected={Boolean(engine.health)} />
    <section className="settings-panel appearance-panel" aria-labelledby="appearance-title">
      <div className="settings-title"><span className="icon-tile lavender"><Sun size={20} /></span><div><h2 id="appearance-title">Appearance</h2><p>Choose how JobScout looks on this computer.</p></div></div>
      <div className="appearance-options" role="group" aria-label="Appearance preference">
        <button className={`appearance-option ${appearance === 'system' ? 'selected' : ''}`} aria-pressed={appearance === 'system'} onClick={() => changeAppearance('system')}><Monitor size={18} /><span>Follow system</span><small>Match Windows</small></button>
        <button className={`appearance-option ${appearance === 'light' ? 'selected' : ''}`} aria-pressed={appearance === 'light'} onClick={() => changeAppearance('light')}><Sun size={18} /><span>Light</span><small>Bright and clear</small></button>
        <button className={`appearance-option ${appearance === 'dark' ? 'selected' : ''}`} aria-pressed={appearance === 'dark'} onClick={() => changeAppearance('dark')}><Moon size={18} /><span>Dark</span><small>Easy on the eyes</small></button>
      </div>
    </section>
    <section className="settings-panel" aria-labelledby="connection-title"><div className="settings-title"><span className="icon-tile green"><Monitor size={20} /></span><div><h2 id="connection-title">Local workspace</h2><p>The foundation for keeping your information on this computer.</p></div><EngineBadge engine={engine} /></div>
      <div className="status-row"><div><h3>Application engine</h3><p>{engine.health ? 'Connected and responding.' : engine.checking ? 'Checking the connection…' : 'Connection unavailable.'}</p></div><button className="button secondary" disabled={engine.checking} onClick={() => void engine.refresh()}><RefreshCw size={14} className={engine.checking ? 'spinning' : ''} />{engine.checking ? 'Checking…' : 'Check again'}</button></div>
      <div className="status-row"><div><h3>Local storage</h3><p>{engine.health?.database === 'ready' ? 'Your local database is ready.' : engine.health?.database === 'error' ? 'Storage needs attention before saving information.' : 'Storage status will appear when the workspace connects.'}</p></div><span className={`status-text ${engine.health?.database === 'ready' ? 'positive' : ''}`}>{engine.health?.database === 'ready' ? 'Ready' : 'Not verified'}</span></div>
      {engine.error && <p className="inline-error" role="alert">{engine.error}</p>}
    </section>
    <section className="settings-panel" aria-labelledby="ai-title"><div className="settings-title"><span className="icon-tile lavender"><Sparkles size={20} /></span><div><h2 id="ai-title">Local AI</h2><p>A model that runs where your information lives.</p></div><span className={`status-text ${ai?.status === 'available' ? 'positive' : ''}`}>{ai?.status === 'available' ? 'Ollama connected' : ai?.status === 'error' ? 'Needs attention' : 'Not connected'}</span></div>
      <div className="ai-explanation"><h3>{ai?.status === 'available' ? `${ai.installed_models} installed ${ai.installed_models === 1 ? 'model' : 'models'} detected` : ai?.status === 'error' ? 'Ollama did not return a usable response.' : ai?.status === 'unavailable' ? 'Ollama is not running yet.' : 'Connect the workspace to check local AI.'}</h3><p>We are building a guided model picker and download experience. For now, JobScout checks whether Ollama is available. A connected runtime does not mean a suitable model has been selected.</p><button className="button secondary" onClick={() => { setLinkError(false); void openOllamaWebsite().catch(() => setLinkError(true)); }}>Visit Ollama <ArrowUpRight size={14} /></button>{linkError && <p className="inline-error" role="alert">The website could not be opened. Visit ollama.com in your browser.</p>}</div>
    </section>
    <section className="coming-panel"><CircleHelp size={20} /><div><h3>More setup, less guesswork.</h3><p>Online search is available in Discover after you prepare and review a query. Saving a key sends nothing to Tavily. Guided model downloads and storage choices are still planned.</p></div><span className="badge">COMING NEXT</span></section>
  </>;
}

export function App() {
  const [page, setCurrentPage] = useState<Page>('discover');
  const [discoveryStep, setDiscoveryStep] = useState<DiscoveryStep>('resume');
  const [optionsReached, setOptionsReached] = useState(false);
  const [resultsReached, setResultsReached] = useState(false);
  const [criteria, setCriteria] = useState<PublicSearchCriteria>(initialCriteria);
  const [searchMode, setSearchMode] = useState<'resume' | 'manual' | null>(null);
  const [reviewedText, setReviewedText] = useState('');

  const resume = useResumeImport();
  const engine = useEngine();
  const searchPreview = useSearchPreview(Boolean(engine.health));
  const discovery = useDiscovery(Boolean(engine.health));
  const assistance = useAssistance(Boolean(engine.health));
  const resultAnalysis = useAssistance(Boolean(engine.health));
  const startManual = () => {
    assistance.invalidate(); resultAnalysis.invalidate(); searchPreview.invalidate(); discovery.invalidate();
    setSearchMode('manual'); setReviewedText(''); setCriteria(initialCriteria);
    setOptionsReached(true); setDiscoveryStep('options');
  };
  const startAssisted = async () => {
    searchPreview.invalidate(); discovery.invalidate(); resultAnalysis.invalidate();
    setSearchMode('resume'); setReviewedText(resume.text); setOptionsReached(true); setDiscoveryStep('options');
    const suggestion = await assistance.analyze(resume.text);
    if (!suggestion) return;
    const next = suggestion.criteria ?? { ...initialCriteria, skills: suggestion.skills.slice(0, 5) };
    setCriteria(next);
    // No role evidence means manual selection is required; never send a guessed role.
    if (suggestion.criteria) searchPreview.generate(next);
  };
  useEffect(() => {
    if (searchMode === 'resume' && (!resume.reviewed || resume.text !== reviewedText)) {
      assistance.invalidate(); resultAnalysis.invalidate(); searchPreview.invalidate(); discovery.invalidate();
      setSearchMode(null); setReviewedText(''); setOptionsReached(false); setResultsReached(false); setDiscoveryStep('resume');
    }
  }, [resume.text, resume.reviewed, searchMode, reviewedText, assistance.invalidate, resultAnalysis.invalidate, searchPreview.invalidate, discovery.invalidate]);
  useEffect(() => {
    resultAnalysis.invalidate();
    if (discovery.result) void resultAnalysis.analyze(searchMode === 'resume' ? reviewedText : '', discovery.result.candidates);
  }, [discovery.result, searchMode, reviewedText, resultAnalysis.analyze, resultAnalysis.invalidate]);
  const setPage = (next: Page) => {
    // Settings can change the saved provider; discard its old preview and review first.
    if (next === 'settings') { if (assistance.busy) assistance.invalidate(); searchPreview.invalidate(); discovery.invalidate(); }
    setCurrentPage(next);
  };
  const saved = useSavedProfile(Boolean(engine.health));
  const { appearance, changeAppearance } = useAppearance();
  const optionsAvailable = optionsReached && (searchMode === 'manual' || (searchMode === 'resume' && resume.reviewed && resume.text === reviewedText));
  const navigateStep = (next: DiscoveryStep) => {
    if ((next === 'options' && !optionsAvailable) || (next === 'results' && !resultsReached)) return;
    if (next === 'options') setOptionsReached(true);
    setDiscoveryStep(next);
  };
  useEffect(() => {
    if (discovery.result) { setResultsReached(true); setDiscoveryStep('results'); }
  }, [discovery.result]);
  useEffect(() => {
    if (!optionsAvailable && discoveryStep === 'options') setDiscoveryStep('resume');
  }, [optionsAvailable, discoveryStep]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [page, discoveryStep]);
  return <div className="app-shell focused-shell"><a className="skip-link" href="#main-content">Skip to main content</a>
    <div className="workspace"><header className="topbar"><a href="#" className="brand" onClick={event => { event.preventDefault(); setPage('discover'); }} aria-label="JobScout home"><span className="brand-mark"><Sparkles size={21} /></span>jobscout<span className="brand-period">.</span></a><nav className="flow-nav" aria-label="Main navigation">{page === 'settings' && <button className="button secondary" onClick={() => setPage('discover')}>Back to job search</button>}<button className="button secondary" aria-current={page === 'settings' ? 'page' : undefined} onClick={() => setPage('settings')}><Settings2 size={16} />Settings</button></nav></header>
    <main id="main-content" className="main-content" tabIndex={-1}>
      <div hidden={page !== 'discover'} className="find-workspace">
        <div className="page-heading search-intro"><div><h1>{discoveryStep === 'resume' ? 'Start with your resume.' : discoveryStep === 'options' ? searchMode === 'resume' ? 'Review your suggested search.' : 'Choose your job options.' : 'Your search results.'}</h1><p className="muted">{discoveryStep === 'resume' ? 'Choose a file to read and review on this computer.' : discoveryStep === 'options' ? 'Review the public categories and exact query before searching.' : 'Refine candidates with local filters and evidence.'}</p></div></div>
        <DiscoveryJourney step={discoveryStep} navigate={navigateStep} optionsAvailable={optionsAvailable} resultsAvailable={resultsReached} continueWithoutResume={startManual} onResumeReviewed={() => void startAssisted()} assisted={searchMode === 'resume'} assistance={assistance} resultAnalysis={resultAnalysis} retryResultAnalysis={() => { if (discovery.result) void resultAnalysis.analyze(searchMode === 'resume' ? reviewedText : '', discovery.result.candidates); }} resume={resume} saved={saved} criteria={criteria} discovery={discovery} searchPreview={searchPreview} onChange={value => { searchPreview.invalidate(); discovery.invalidate(); setCriteria(value); }} />
      </div>
      {page === 'settings' && <Settings engine={engine} appearance={appearance} changeAppearance={changeAppearance} />}
    </main><footer className="workspace-footer"><span><LockKeyhole size={12} /> Resume stays on this computer</span><EngineBadge engine={engine} /></footer></div>
  </div>;
}
