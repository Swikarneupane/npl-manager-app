import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot } from './bits.jsx';
import MoreSheet, { auctionLink } from './MoreSheet.jsx';
import DecisionSheet from './DecisionSheet.jsx';
import { MTop } from './MScreen.jsx';
import { unreadCount } from './news.jsx';
import { fmtL } from '../game/engine.js';
import { seasonNo, tr, userNextFixture, nextUnplayed, useNarrow } from '../lib/util.js';
import { tn, tnShort } from '../lib/i18n.js';
import { DEPTH_GROUPS, MATCH_ROUTES, LEAGUE_ROUTES } from '../lib/nav.js';
import { savedMatchFor } from '../lib/flow.js';

const PHASES = { preseason: 'Pre-season', league: 'League', playoffs: 'Playoffs', seasonEnd: 'Season over', offseason: 'Off-season', retention: 'Retention', auction: 'Auction' };
const OFF = ['offseason', 'retention', 'auction'];

// A match is live while it is being played, or part-played and saved.
export function isLive(G, ui) { return !!((ui.live && ui.live.started && !ui.live.done) || savedMatchFor(G, userNextFixture(G))); }

function phaseExtra(G, ui) {
  if (ui.live && !ui.live.done && ui.live.started) return ` · Match ${ui.live.f.n} live`;
  if (G.s.phase === 'league') return ` · ${G.s.fixtures.filter((f) => f.res).length} of 28 played`;
  return '';
}

// Phone bottom bar: Home, Squad, Match, League, More. In the off-season Match becomes Auction,
// with a red live dot while bidding runs.
function BottomBar({ more, openMore, closeMore, moreBtn }) {
  const { G, ui } = useGame(); const loc = useLocation(); const ph = G.s.phase;
  const off = OFF.includes(ph); const auc = auctionLink(G); const live = isLive(G, ui);
  const at = (list) => list.some((r) => loc.pathname.startsWith(r));
  const item = (to, label, { end, on, dot } = {}) => (
    <NavLink to={to} end={end} replace={more} className={({ isActive }) => (!more && (isActive || on) ? 'on' : '')} aria-label={dot ? `${label}, ${dot}` : undefined}>
      {dot && <span className="live" aria-hidden="true" />}{tnShort(G, label)}
    </NavLink>
  );
  const onMore = more || !(loc.pathname === '/' || at(['/squad', '/player', '/auction', '/retention', '/offseason', '/signings', ...MATCH_ROUTES, ...LEAGUE_ROUTES]));
  return (
    <nav className="bnav" aria-label="Main">
      {item('/', 'Home', { end: true })}
      {item('/squad', 'Squad', { on: loc.pathname.startsWith('/player') })}
      {off ? item(auc.to || '/offseason', 'Auction', { on: at(['/auction', '/retention', '/offseason']), dot: ph === 'auction' ? 'bidding live' : null })
        : item('/match', 'Match', { on: at(MATCH_ROUTES), dot: live ? 'live' : null })}
      {item('/season', 'League', { on: at(LEAGUE_ROUTES) })}
      <a href="#more" ref={moreBtn} className={onMore ? 'on' : ''} role="button" aria-haspopup="dialog" aria-expanded={more} onClick={(e) => { e.preventDefault(); if (more) closeMore(); else openMore(); }}>
        {tnShort(G, 'More')}{unreadCount(G) > 0 && <span className="badge" aria-label={`${unreadCount(G)} unread`}>{unreadCount(G)}</span>}
      </a>
    </nav>
  );
}

export default function Shell({ children }) {
  const { G, ui, modal } = useGame(); const loc = useLocation(); const narrow = useNarrow();
  const t = G.teams[G.user]; const ph = G.s.phase;
  const uf = userNextFixture(G), nu = nextUnplayed(G); const live = isLive(G, ui);
  const matchSmall = live ? 'Live' : uf && nu && uf === nu ? 'Next' : '';
  const unread = unreadCount(G); const auc = auctionLink(G);

  // More sheet. Opening pushes a history entry so the Android back button (popstate) closes it.
  const [more, setMore] = useState(false); const moreBtn = useRef(null); const main = useRef(null);
  const openMore = () => { window.history.pushState({ ...window.history.state, nplSheet: true }, ''); setMore(true); };
  const closeMore = useCallback(() => { if (window.history.state && window.history.state.nplSheet) window.history.back(); else setMore(false); }, []);
  useEffect(() => {
    if (!more) return undefined;
    const pop = () => setMore(false);
    window.addEventListener('popstate', pop);
    return () => { window.removeEventListener('popstate', pop); if (moreBtn.current) moreBtn.current.focus(); };
  }, [more]);
  // a new page starts at the top (tab changes within a page, ?tab=, keep their place)
  useEffect(() => { window.scrollTo(0, 0); if (main.current) main.current.scrollTop = 0; }, [loc.pathname]);
  const where = loc.pathname + loc.search;
  const opened = useRef(where);
  useEffect(() => { if (more && where !== opened.current) setMore(false); opened.current = where; }, [where]); // eslint-disable-line react-hooks/exhaustive-deps

  const L = (to, label, small, end) => (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'on' : '')}>{tr(G, label)}{small ? <small> {small}</small> : null}</NavLink>
  );
  const overlays = <>{more && <MoreSheet onClose={closeMore} />}{ui.decide && <DecisionSheet />}{modal}</>;
  if (narrow) return (
    <>
      <MTop dflt />
      <main className="main m-main" id="main" ref={main}>{children}</main>
      <BottomBar more={more} openMore={openMore} closeMore={closeMore} moreBtn={moreBtn} />
      {overlays}
    </>
  );
  return (
    <>
      <header className="top">
        <span className="brand">NPL Manager</span>
        <span className="tm"><Dot id={G.user} />{t.name}</span>
        <span className="kv wide"><span>Season</span><span>{seasonNo(G.year)} · {G.year}</span></span>
        <span className="phase wide"><b>{PHASES[ph] || ph}</b>{phaseExtra(G, ui)}</span>
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
          {DEPTH_GROUPS.map(([g, links]) => <div key={g} className="navgrp"><hr />{links.filter(([to]) => to !== '/news').map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'on' : '')}>{tn(G, label)}</NavLink>)}</div>)}
          <hr />
          {L('/world', 'World')}{L('/history', 'History')}{L('/club', 'Club')}{L('/settings', 'Settings')}
        </nav>
        <main className="main" id="main">{children}</main>
      </div>
      {overlays}
    </>
  );
}
