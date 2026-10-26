import { NavLink } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot } from './bits.jsx';
import { fmtL } from '../game/engine.js';
import { seasonNo, tr, userNextFixture, nextUnplayed } from '../lib/util.js';

function phaseLabel(G, ui) {
  const m = { preseason: 'Pre-season', league: 'League', playoffs: 'Playoffs', seasonEnd: 'Season over', offseason: 'Off-season', retention: 'Retention', auction: 'Auction' };
  let extra = '';
  if (G.s.phase === 'league') extra = ` · ${G.s.fixtures.filter((f) => f.res).length} of 28 played`;
  if (ui.live && !ui.live.done && ui.live.started) extra = ` · Match ${ui.live.f.n} live`;
  return <><b>{m[G.s.phase] || G.s.phase}</b>{extra}</>;
}

export default function Shell({ children }) {
  const { G, ui, modal } = useGame();
  const t = G.teams[G.user]; const ph = G.s.phase;
  const uf = userNextFixture(G), nu = nextUnplayed(G);
  const matchSmall = ui.live && !ui.live.done && ui.live.started ? 'Live' : uf && nu && uf === nu ? 'Next' : '';
  const L = (to, label, small, end) => (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'on' : '')}>{tr(G, label)}{small ? <small> {small}</small> : null}</NavLink>
  );
  return (
    <>
      <header className="top">
        <span className="brand">NPL Manager</span>
        <span className="tm"><Dot id={G.user} />{t.name}</span>
        <span className="kv"><span>Season</span><span>{seasonNo(G.year)} · {G.year}</span></span>
        <span className="phase">{phaseLabel(G, ui)}</span>
        <span className="spacer" />
        <span className="kv"><span>Domestic purse</span><span className="num">{fmtL(t.purse)}</span></span>
        <span className="kv"><span>Overseas purse</span><span className="num">{fmtL(t.osPurse)}</span></span>
      </header>
      <div className="shell">
        <nav className="nav" aria-label="Main">
          {L('/', 'Home', null, true)}{L('/squad', 'Squad')}{L('/match', 'Match', matchSmall)}{L('/fixtures', 'Fixtures')}{L('/table', 'Table')}
          {ph === 'auction' ? L('/auction', 'Auction', 'Live') : ph === 'retention' ? L('/retention', 'Auction', 'Retention') : <span className="off" aria-disabled="true">{tr(G, 'Auction')} <small>Off-season</small></span>}
          {ph === 'offseason' && L('/offseason', 'Off-season')}{ph === 'preseason' && L('/signings', 'Signings')}
          <hr />{L('/stats', 'Stats')}{L('/history', 'History')}{L('/club', 'Club')}{L('/settings', 'Settings')}
        </nav>
        <main className="main" id="main">{children}</main>
      </div>
      {modal}
    </>
  );
}
