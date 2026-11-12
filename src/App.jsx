import { lazy, Suspense, Component, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { saveLocal } from './lib/save.js';
import { useGame } from './lib/store.jsx';
import Shell from './components/Shell.jsx';
import Home from './screens/Home.jsx';
import { useNarrow } from './lib/util.js';

// Screens load on demand so the first paint only ships what it needs.
const NewGame = lazy(() => import('./screens/NewGame.jsx'));
const Squad = lazy(() => import('./screens/Squad.jsx'));
const Player = lazy(() => import('./screens/Player.jsx'));
const Match = lazy(() => import('./screens/Match.jsx'));
const Scorecard = lazy(() => import('./screens/Scorecard.jsx'));
const Season = lazy(() => import('./screens/Season.jsx'));
const News = lazy(() => import('./screens/News.jsx'));
const Staff = lazy(() => import('./screens/Staff.jsx'));
const Nepal = lazy(() => import('./screens/Nepal.jsx'));
const Overseas = lazy(() => import('./screens/Overseas.jsx'));
const Stats = lazy(() => import('./screens/Stats.jsx'));
const History = lazy(() => import('./screens/History.jsx'));
const Club = lazy(() => import('./screens/Club.jsx'));
const Settings = lazy(() => import('./screens/Settings.jsx'));
const Signings = lazy(() => import('./screens/Signings.jsx'));
const Retention = lazy(() => import('./screens/Retention.jsx'));
const Auction = lazy(() => import('./screens/Auction.jsx'));
const Offseason = lazy(() => import('./screens/Offseason.jsx'));
// Phase 2: matchday, between matches, the club office, the living league and world cricket.
const Prematch = lazy(() => import('./screens/Prematch.jsx'));
const Press = lazy(() => import('./screens/Press.jsx'));
const Roundup = lazy(() => import('./screens/Roundup.jsx'));
const Playoffs = lazy(() => import('./screens/Playoffs.jsx'));
const FinalWeek = lazy(() => import('./screens/FinalWeek.jsx'));
const Trophy = lazy(() => import('./screens/Trophy.jsx'));
const SeasonReview = lazy(() => import('./screens/SeasonReview.jsx'));
const Week = lazy(() => import('./screens/Week.jsx'));
const Dressing = lazy(() => import('./screens/Dressing.jsx'));
const Scouting = lazy(() => import('./screens/Scouting.jsx'));
const Recruitment = lazy(() => import('./screens/Recruitment.jsx'));
const Contract = lazy(() => import('./screens/Contract.jsx'));
const BoardMeeting = lazy(() => import('./screens/Board.jsx'));
const Commercial = lazy(() => import('./screens/Commercial.jsx'));
const Storyline = lazy(() => import('./screens/Storyline.jsx'));
const LeagueHub = lazy(() => import('./screens/League.jsx'));
const Career = lazy(() => import('./screens/Career.jsx'));
const World = lazy(() => import('./screens/World.jsx'));
const International = lazy(() => import('./screens/International.jsx'));
const WorldCup = lazy(() => import('./screens/WorldCup.jsx'));
const Rankings = lazy(() => import('./screens/Rankings.jsx'));
// Phase 3: careers across jobs, the calendar, any competition, the national squad.
const Calendar = lazy(() => import('./screens/Calendar.jsx'));
const Comp = lazy(() => import('./screens/Comp.jsx'));
const NationSquad = lazy(() => import('./screens/NationSquad.jsx'));
const Jobs = lazy(() => import('./screens/Jobs.jsx'));
const ClubAbroad = lazy(() => import('./screens/ClubAbroad.jsx'));

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
    const p = G.s.uiPath; if (p && p !== '/' && loc.pathname === '/' && !loc.search) nav(p, { replace: true });
  }, [G]); // eslint-disable-line react-hooks/exhaustive-deps
  // pathname + query, so tabs such as /season?tab=results come back too
  useEffect(() => { if (G) G.s.uiPath = loc.pathname + loc.search; }, [G, loc.pathname, loc.search]);
  useEffect(() => {
    const flush = () => { if (!G) return; if (ui.live && ui.live.started && !ui.live.done) ui.live.persist(true); else saveLocal(G, true); };
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('beforeunload', flush); window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener('beforeunload', flush); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onVis); };
  }, [G, ui]);
}

export default function App() {
  const { G, theme } = useGame(); const narrow = useNarrow();
  useSession();
  return (
    <div className={`npl${G && narrow ? ' m-app' : ''}`} data-theme={theme} style={{ minHeight: '100vh', position: 'relative' }}>
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
                  <Route path="/season" element={<Season />} />
                  <Route path="/news" element={<News />} />
                  <Route path="/staff" element={<Staff />} />
                  <Route path="/nepal" element={<Nepal />} />
                  <Route path="/squad/overseas" element={<Overseas />} />
                  <Route path="/fixtures" element={<Navigate to="/season?tab=fixtures" replace />} />
                  <Route path="/table" element={<Navigate to="/season" replace />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/club" element={<Club />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/signings" element={<Signings />} />
                  <Route path="/retention" element={<Retention />} />
                  <Route path="/auction" element={<Auction />} />
                  <Route path="/offseason" element={<Offseason />} />
                  <Route path="/prematch" element={<Prematch />} />
                  <Route path="/press" element={<Press />} />
                  <Route path="/roundup" element={<Roundup />} />
                  <Route path="/playoffs" element={<Playoffs />} />
                  <Route path="/final" element={<FinalWeek />} />
                  <Route path="/trophy" element={<Trophy />} />
                  <Route path="/review" element={<SeasonReview />} />
                  <Route path="/week" element={<Week />} />
                  <Route path="/dressing" element={<Dressing />} />
                  <Route path="/scouting" element={<Scouting />} />
                  <Route path="/recruitment" element={<Recruitment />} />
                  <Route path="/contract/:id" element={<Contract />} />
                  <Route path="/board" element={<BoardMeeting />} />
                  <Route path="/commercial" element={<Commercial />} />
                  <Route path="/stories" element={<Storyline />} />
                  <Route path="/story/:id" element={<Storyline />} />
                  <Route path="/league" element={<LeagueHub />} />
                  <Route path="/career" element={<Career />} />
                  <Route path="/world" element={<World />} />
                  <Route path="/international" element={<International />} />
                  <Route path="/worldcup" element={<WorldCup />} />
                  <Route path="/rankings" element={<Rankings />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/comp/:seasonId" element={<Comp />} />
                  <Route path="/nation" element={<NationSquad />} />
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/clubabroad" element={<ClubAbroad />} />
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
