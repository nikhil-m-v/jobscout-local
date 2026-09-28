import { useState } from 'react';
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, ChevronRight, CircleHelp, Compass, FileText, LayoutDashboard, ListChecks, LockKeyhole, Monitor, RefreshCw, Settings2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useEngine } from './hooks/useEngine';
import { useAppearance, type Appearance } from './hooks/useAppearance';
import { openOllamaWebsite } from './lib/engine';

type Page = 'overview' | 'profile' | 'discover' | 'applications' | 'settings';
type Engine = ReturnType<typeof useEngine>;
const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'My profile', icon: FileText },
  { id: 'discover', label: 'Discover jobs', icon: Compass },
  { id: 'applications', label: 'Applications', icon: BriefcaseBusiness },
  { id: 'settings', label: 'Settings', icon: Settings2 },
] as const;

function EngineBadge({ engine }: { engine: Engine }) {
  const label = engine.health ? 'Workspace connected' : engine.checking ? 'Connecting workspace' : 'Workspace offline';
  return <span className={`status-pill ${engine.health ? 'connected' : ''}`} role="status">
    <span className="status-dot" />{label}
  </span>;
}

function JourneyIllustration() {
  return <div className="journey-art" aria-hidden="true">
    <div className="resume-art">
      <div className="resume-art-head"><div className="avatar-art">Y</div><div><b>Your story</b><span>A world of possibilities</span></div></div>
      <div className="art-line" /><div className="art-line short" /><div className="art-rule" />
      <span className="art-label">EXPERIENCE & SKILLS</span>
      <div className="art-line" /><div className="art-line" /><div className="art-line short" />
      <div className="art-tags"><span>Strengths</span><span>Potential</span></div>
    </div>
  </div>;
}

function Overview({ engine, navigate }: { engine: Engine; navigate: (page: Page) => void }) {
  return <>
    <div className="page-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Your career. Your information.</h1><p className="muted">A job search built around your privacy.</p></div></div>
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy"><span className="small-tag">Private. Personal. Local.</span>
        <h2 id="hero-title">Your next role.<br /><em>Your privacy.</em></h2>
        <p>Local AI for your next chapter.<br />Keep your personal story on your computer.</p>
        <button className="button primary" onClick={() => navigate('settings')}>View privacy & setup <ArrowUpRight size={17} /></button>
        <div className="hero-footnote"><LockKeyhole size={12} /> Built for local analysis. No resume uploads.</div>
      </div><JourneyIllustration />
    </section>
    <div className="section-heading"><h2>A place to begin.</h2></div>
    <div className="start-grid">
      <article className="start-card"><div className="card-top"><span className="icon-tile lavender"><FileText size={19} /></span><span className="card-number">01</span></div><h3>Bring your story</h3><p>Your resume will become a local profile you can review and edit, without uploading it.</p><button className="text-action" onClick={() => navigate('profile')}>See your profile space <ArrowRight size={15} /></button><span className="feature-note">Resume import is our next milestone</span></article>
      <article className="start-card"><div className="card-top"><span className="icon-tile green"><Zap size={19} /></span><span className="card-number">02</span></div><h3>A little local intelligence</h3><p>Run analysis on your computer. Your personal context stays with your local model.</p><button className="text-action" onClick={() => navigate('settings')}>Check local AI <ArrowRight size={15} /></button><span className="feature-note">{engine.health?.local_ai.status === 'available' ? 'Ollama is available on your computer' : 'Model setup comes next'}</span></article>
      <article className="start-card"><div className="card-top"><span className="icon-tile peach"><Compass size={19} /></span><span className="card-number">03</span></div><h3>Discover privately</h3><p>Planned search will use generic job criteria, keeping your resume and personal details local.</p><button className="text-action" onClick={() => navigate('discover')}>Explore what is coming <ArrowRight size={15} /></button><span className="feature-note">Job discovery is on the roadmap</span></article>
    </div>
    <div className="privacy-strip"><span className="privacy-icon"><ShieldCheck size={20} /></span><div><strong>Your story stays with you.</strong><p>Local processing. No product tracking. Clear disclosure before online discovery.</p></div><span className="local-label">LOCAL BY DEFAULT</span></div>
  </>;
}

function PrivacyPanel() {
  return <section className="settings-panel" aria-labelledby="privacy-title">
    <div className="settings-title">
      <span className="icon-tile green"><ShieldCheck size={20} /></span>
      <div><h2 id="privacy-title">Your privacy comes first.</h2><p>Our commitment: personal career data stays on this computer.</p></div>
    </div>
    <dl className="privacy-details">
      <div><dt>Local intelligence</dt><dd>Resume parsing, profiles, embeddings, and matching are planned to run locally. No hosted AI fallback.</dd></div>
      <div><dt>Private discovery</dt><dd>Future searches will send only reviewed, generic job criteria. Your resume and personal details will stay local.</dd></div>
      <div><dt>Clear boundaries</dt><dd>Online job search is not available in this release. Opening an external website connects your browser to that site.</dd></div>
    </dl>
    <p className="privacy-note">Online providers can see your search criteria, connection details such as your IP address, and provider-account information. Keeping personal content local does not make an internet connection anonymous.</p>
  </section>;
}

function Settings({ engine }: { engine: Engine }) {
  const [linkError, setLinkError] = useState(false);
  const ai = engine.health?.local_ai;
  return <>
    <div className="page-heading"><div><p className="eyebrow">MAKE IT YOURS</p><h1>Your workspace, at a glance.</h1><p className="muted">See what is ready and what needs a little attention.</p></div></div>
    <PrivacyPanel />
    <section className="settings-panel" aria-labelledby="connection-title"><div className="settings-title"><span className="icon-tile green"><Monitor size={20} /></span><div><h2 id="connection-title">Local workspace</h2><p>The foundation for keeping your information on this computer.</p></div><EngineBadge engine={engine} /></div>
      <div className="status-row"><div><h3>Application engine</h3><p>{engine.health ? 'Connected and responding.' : engine.checking ? 'Checking the connection…' : 'Connection unavailable.'}</p></div><button className="button secondary" disabled={engine.checking} onClick={() => void engine.refresh()}><RefreshCw size={14} className={engine.checking ? 'spinning' : ''} />{engine.checking ? 'Checking…' : 'Check again'}</button></div>
      <div className="status-row"><div><h3>Local storage</h3><p>{engine.health?.database === 'ready' ? 'Your local database is ready.' : engine.health?.database === 'error' ? 'Storage needs attention before saving information.' : 'Storage status will appear when the workspace connects.'}</p></div><span className={`status-text ${engine.health?.database === 'ready' ? 'positive' : ''}`}>{engine.health?.database === 'ready' ? 'Ready' : 'Not verified'}</span></div>
      {engine.error && <p className="inline-error" role="alert">{engine.error}</p>}
    </section>
    <section className="settings-panel" aria-labelledby="ai-title"><div className="settings-title"><span className="icon-tile lavender"><Sparkles size={20} /></span><div><h2 id="ai-title">Local AI</h2><p>A model that runs where your information lives.</p></div><span className={`status-text ${ai?.status === 'available' ? 'positive' : ''}`}>{ai?.status === 'available' ? 'Ollama connected' : ai?.status === 'error' ? 'Needs attention' : 'Not connected'}</span></div>
      <div className="ai-explanation"><h3>{ai?.status === 'available' ? `${ai.installed_models} installed ${ai.installed_models === 1 ? 'model' : 'models'} detected` : ai?.status === 'error' ? 'Ollama did not return a usable response.' : ai?.status === 'unavailable' ? 'Ollama is not running yet.' : 'Connect the workspace to check local AI.'}</h3><p>We are building a guided model picker and download experience. For now, JobScout checks whether Ollama is available. A connected runtime does not mean a suitable model has been selected.</p><button className="button secondary" onClick={() => { setLinkError(false); void openOllamaWebsite().catch(() => setLinkError(true)); }}>Visit Ollama <ArrowUpRight size={14} /></button>{linkError && <p className="inline-error" role="alert">The website could not be opened. Visit ollama.com in your browser.</p>}</div>
    </section>
    <section className="coming-panel"><CircleHelp size={20} /><div><h3>More setup, less guesswork.</h3><p>Model downloads, storage choices, and secure search-provider keys will join this space as we build each feature. Online job search is not configured in this release.</p></div><span className="badge">COMING NEXT</span></section>
  </>;
}

const upcoming = {
  profile: { eyebrow: 'YOUR STORY, IN ONE PLACE', title: 'A profile that grows with you.', icon: FileText, heading: 'Start with the experience you already have.', description: 'Our next milestone brings PDF and Word resume import, local text extraction, and a profile you can review before anything is saved.', steps: ['Import a PDF or Word resume', 'Review extracted skills and experience', 'Keep a profile locally, under your control'] },
  discover: { eyebrow: 'PRIVACY AT EVERY STEP', title: 'Discover jobs. Keep your story private.', icon: Compass, heading: 'Opportunities without uploading your resume.', description: 'Planned discovery will send only reviewed, generic job criteria. Your resume, profile, and matching will stay local. Providers can still see connection details and the account behind an API key; complete internet anonymity is not provided.', steps: ['Choose generic roles, skills, and an optional search region', 'Review exactly which criteria go to the search provider', 'Match results against your resume on your computer'] },
  applications: { eyebrow: 'ONE STEP AT A TIME', title: 'Keep your next chapter in view.', icon: BriefcaseBusiness, heading: 'A calmer way to follow your progress.', description: 'The application tracker will keep your saved roles, notes, and next steps together. Your history will stay intact when search results change.', steps: ['Save roles that catch your attention', 'Track applications and interview stages', 'Keep notes and next steps close at hand'] },
};

function Upcoming({ page, navigate }: { page: keyof typeof upcoming; navigate: (page: Page) => void }) {
  const content = upcoming[page];
  const Icon = content.icon;
  return <><div className="page-heading"><div><p className="eyebrow">{content.eyebrow}</p><h1>{content.title}</h1><p className="muted">A space we are building with care.</p></div><span className="badge">PLANNED FEATURE</span></div><section className="empty-panel"><span className="empty-icon"><Icon size={32} strokeWidth={1.5} /></span><h2>{content.heading}</h2><p>{content.description}</p><ul className="planned-list">{content.steps.map(step => <li key={step}><ListChecks size={17} />{step}</li>)}</ul><button className="button primary" onClick={() => navigate('settings')}>Check your workspace <ArrowRight size={16} /></button><span className="feature-note">This feature is not available in the foundation release.</span></section></>;
}

export function App() {
  const [page, setPage] = useState<Page>('overview');
  const engine = useEngine();
  const { appearance, changeAppearance } = useAppearance();
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to main content</a>
    <aside className="sidebar"><a href="#" className="brand" onClick={event => { event.preventDefault(); setPage('overview'); }} aria-label="JobScout overview"><span className="brand-mark"><Sparkles size={21} /></span>jobscout<span className="brand-period">.</span></a><div className="sidebar-label">YOUR WORKSPACE</div><nav aria-label="Main navigation">{navigation.map(({ id, label, icon: Icon }) => <button key={id} aria-label={label} title={label} className={`nav-item ${page === id ? 'active' : ''}`} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}><Icon size={18} strokeWidth={1.7} /><span>{label}</span>{page === id && <ChevronRight size={14} />}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-footer"><span className="mini-brand">Private by design</span><span>v0.1</span></div></div></aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb">My workspace <ChevronRight size={12} /><span>{navigation.find(item => item.id === page)?.label}</span></div><div className="topbar-actions"><EngineBadge engine={engine} /><label className="appearance-control"><span className="sr-only">Appearance</span><select value={appearance} onChange={event => changeAppearance(event.target.value as Appearance)}><option value="system">Follow system</option><option value="light">Light</option><option value="dark">Dark</option></select></label></div></header><main id="main-content" className="main-content" key={page} tabIndex={-1}>{page === 'overview' ? <Overview engine={engine} navigate={setPage} /> : page === 'settings' ? <Settings engine={engine} /> : <Upcoming page={page} navigate={setPage} />}</main><footer className="workspace-footer"><span>Made for the next step.</span><span><LockKeyhole size={12} /> Personal by design</span></footer></div>
  </div>;
}
