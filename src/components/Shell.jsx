import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot } from './bits.jsx';
import { Icon } from './icons.jsx';
import MoreSheet, { auctionLink } from './MoreSheet.jsx';
import DecisionSheet from './DecisionSheet.jsx';
import { unreadCount } from './news.jsx';
import { fmtL } from '../game/engine.js';
import { seasonNo, tr, userNextFixture, nextUnplayed } from '../lib/util.js';
import { savedMatchFor } from '../lib/flow.js';

const PHASES = { preseason: 'Pre-season', league: 'League', playoffs: 'Playoffs', seasonEnd: 'Season over', offseason: 'Off-season', retention: 'Retention', auction: 'Auction' };
const MORE_ROUTES = ['/news', '/nepal', '/stats', '/history', '/club', '/staff', '/settings', '/auction', '/retention', '/offseason', '/signings'];

// A match is live while it is being played, or part-played and saved.
export function isLive(G, ui) { return !!((ui.live && ui.live.started && !ui.live.done) || savedMatchFor(G, userNextFixture(G))); }

function phaseExtra(G, ui) {
  if (ui.live && !ui.live.done && ui.live.started) return ` · Match ${ui.live.f.n} live`;
  if (G.s.phase === 'league') return ` · ${G.s.fixtures.filter((f) => f.res).length} of 28 played`;
  return '';
}

export default function Shell({ children }) {
  const { G, ui, modal } = useGame(); const loc = useLocation();
  const t = G.teams[G.user]; const ph = G.s.phase;
  const uf = userNextFixture(G), nu = nextUnplayed(G); const live = isLive(G, ui);
  const matchSmall = live ? 'Live' : uf && nu && uf === nu ? 'Next' : '';
  const unread = unreadCount(G); const auc = auctionLink(G);

  // More sheet. Opening pushes a history entry so the Android back button (popstate) closes it.
  const [more, setMore] = useState(false); const moreBtn = useRef(null);
  const openMore = () => { window.history.pushState({ ...window.history.state, nplSheet: true }, ''); setMore(true); };
  const closeMore = useCallback(() => { if (window.history.state && window.history.state.nplSheet) window.history.back(); else setMore(false); }, []);
  useEffect(() => {
    if (!more) return undefined;
    const pop = () => setMore(false);
    window.addEventListener('popstate', pop);
    return () => { window.removeEventListener('popstate', pop); if (moreBtn.current) moreBtn.current.focus(); };
  }, [more]);
  // a new page starts at the top (tab changes within a page, ?tab=, keep their place)
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  const where = loc.pathname + loc.search;
  const opened = useRef(where);
  useEffect(() => { if (more && where !== opened.current) setMore(false); opened.current = where; }, [where]); // eslint-disable-line react-hooks/exhaustive-deps

  const L = (to, label, small, end) => (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'on' : '')}>{tr(G, label)}{small ? <small> {small}</small> : null}</NavLink>
  );
  const tab = (to, icon, label, { end, on, dot } = {}) => (
    <NavLink to={to} end={end} replace={more} className={({ isActive }) => (!more && (isActive || on) ? 'on' : '')}>
      <Icon name={icon} />{tr(G, label)}{dot && <span className="tdot" aria-label={dot} />}
    </NavLink>
  );
  const onMore = more || MORE_ROUTES.some((r) => loc.pathname.startsWith(r));
  return (
    <>
      <header className="top">
        <span className="brand">NPL Manager</span>
        <span className="tm"><Dot id={G.user} />{t.name}</span>
        <span className="kv wide"><span>Season</span><span>{seasonNo(G.year)} · {G.year}</span></span>
        <span className="phase wide"><b>{PHASES[ph] || ph}</b>{phaseExtra(G, ui)}</span>
        <span className="phase-sm t-small faint">Season {seasonNo(G.year)} · {PHASES[ph] || ph}{phaseExtra(G, ui).replace(' played', '')}</span>
        <span className="spacer" />
        <span className="kv wide"><span>Domestic purse</span><span className="num">{fmtL(t.purse)}</span></span>
        <span className="kv wide"><span>Overseas purse</span><span className="num">{fmtL(t.osPurse)}</span></span>
      </header>
      <div className="shell">
        <nav className="nav" aria-label="Main">
          {L('/', 'Home', null, true)}{L('/squad', 'Squad')}{L('/match', 'Match', matchSmall)}{L('/season', 'Season')}{L('/news', 'News', unread ? String(unread) : null)}{L('/nepal', 'Nepal')}
          <hr />
          {auc.to ? L(auc.to, 'Auction', auc.sub) : <span className="off" aria-disabled="true">{tr(G, 'Auction')} <small>Off-season</small></span>}
          {ph === 'offseason' && L('/offseason', 'Off-season')}{ph === 'preseason' && L('/signings', 'Signings')}
          {L('/stats', 'Stats')}{L('/history', 'History')}{L('/club', 'Club')}{L('/settings', 'Settings')}
        </nav>
        <main className="main" id="main">{children}</main>
      </div>
      <nav className="tabbar" aria-label="Main">
        {tab('/', 'home', 'Home', { end: true })}
        {tab('/squad', 'squad', 'Squad', { on: loc.pathname.startsWith('/player') })}
        {tab('/match', 'match', 'Match', { dot: live ? 'Live match' : null })}
        {tab('/season', 'season', 'Season', { on: loc.pathname.startsWith('/scorecard') })}
        <button type="button" ref={moreBtn} className={onMore ? 'on' : ''} aria-haspopup="dialog" aria-expanded={more} onClick={() => (more ? closeMore() : openMore())}>
          <Icon name="more" />{tr(G, 'More')}{unread > 0 && <span className="tdot" aria-label={`${unread} unread`} />}
        </button>
      </nav>
      {more && <MoreSheet onClose={closeMore} />}
      {ui.decide && <DecisionSheet />}
      {modal}
    </>
  );
}
