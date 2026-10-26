import { lazy, Suspense, Component, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { saveLocal } from './lib/save.js';
import { useGame } from './lib/store.jsx';
import Shell from './components/Shell.jsx';
import Home from './screens/Home.jsx';

// Screens load on demand so the first paint only ships what it needs.
const NewGame = lazy(() => import('./screens/NewGame.jsx'));
const Squad = lazy(() => import('./screens/Squad.jsx'));
const Player = lazy(() => import('./screens/Player.jsx'));
const Match = lazy(() => import('./screens/Match.jsx'));
const Scorecard = lazy(() => import('./screens/Scorecard.jsx'));
const Fixtures = lazy(() => import('./screens/Fixtures.jsx'));
const Table = lazy(() => import('./screens/Table.jsx'));
const Stats = lazy(() => import('./screens/Stats.jsx'));
const History = lazy(() => import('./screens/History.jsx'));
const Club = lazy(() => import('./screens/Club.jsx'));
const Settings = lazy(() => import('./screens/Settings.jsx'));
const Signings = lazy(() => import('./screens/Signings.jsx'));
const Retention = lazy(() => import('./screens/Retention.jsx'));
const Auction = lazy(() => import('./screens/Auction.jsx'));
const Offseason = lazy(() => import('./screens/Offseason.jsx'));

class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error(err, info); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ padding: 32 }}>
        <h1 className="t-h1">Something went wrong</h1>
        <p className="mut" style={{ marginTop: 8 }}>{String(this.state.err.message || this.state.err)}</p>
        <div className="row" style={{ marginTop: 16 }}><button className="btn" onClick={() => { this.setState({ err: null }); window.location.assign('/'); }}>Back to home</button></div>
      </div>
    );
  }
}

const Loading = () => <p className="faint" style={{ padding: 24 }}>Loading…</p>;

// Remembers the current screen and writes the save when the app closes or goes to the background,
// so reopening the app returns to exactly the same place.
function useSession() {
  const { G, ui } = useGame(); const loc = useLocation(); const nav = useNavigate(); const restored = useRef(false);
  useEffect(() => {
    if (!G || restored.current) return;
    restored.current = true;
    const p = G.s.uiPath; if (p && p !== '/' && loc.pathname === '/') nav(p, { replace: true });
  }, [G]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (G) G.s.uiPath = loc.pathname; }, [G, loc.pathname]);
  useEffect(() => {
    const flush = () => { if (!G) return; if (ui.live && ui.live.started && !ui.live.done) ui.live.persist(true); else saveLocal(G, true); };
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('beforeunload', flush); window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener('beforeunload', flush); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onVis); };
  }, [G, ui]);
}

export default function App() {
  const { G, theme } = useGame();
  useSession();
  return (
    <div className="npl" data-theme={theme} style={{ minHeight: '100vh', position: 'relative' }}>
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          {!G ? (
            <Routes><Route path="*" element={<NewGame />} /></Routes>
          ) : (
            <Shell>
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/new" element={<Navigate to="/" replace />} />
                  <Route path="/squad" element={<Squad />} />
                  <Route path="/player/:id" element={<Player />} />
                  <Route path="/match" element={<Match />} />
                  <Route path="/scorecard/:n" element={<Scorecard />} />
                  <Route path="/fixtures" element={<Fixtures />} />
                  <Route path="/table" element={<Table />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/club" element={<Club />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/signings" element={<Signings />} />
                  <Route path="/retention" element={<Retention />} />
                  <Route path="/auction" element={<Auction />} />
                  <Route path="/offseason" element={<Offseason />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </Shell>
          )}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
