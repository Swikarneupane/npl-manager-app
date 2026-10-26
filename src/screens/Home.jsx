import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Meter } from '../components/bits.jsx';
import { ovr } from '../game/engine.js';
import { ordinal } from '../game/game.js';
import { seasonNo, nn, fmtNRR, stageName, tname, tshort, userNextFixture, nextUnplayed, boardMood } from '../lib/util.js';
import { autosave } from '../lib/save.js';
import { simUntilUser, simFixture, simToSeasonEnd, completeSquad, startSeason, savedMatchFor, quickSimUserMatch } from '../lib/flow.js';
import { useEffect } from 'react';

const KINDS = { match: 'Result', injury: 'Injury · Physio', board: 'Board', league: 'League news', event: 'Decision' };

export function xiStatus(G) {
  const t = G.teams[G.user]; if (!t.xi || t.xi.length !== 11) return 'auto-pick';
  const os = t.xi.filter((id) => G.P(id).nat !== 'NEP').length;
  return G.validXI(G.user, t.xi) ? `${11 - os} + ${os} set` : 'needs attention';
}

export function Inbox({ limit = 30 }) {
  const { G, update } = useGame();
  const items = G.s.inbox.slice(0, limit); const lang = G.s.lang;
  if (!items.length) return <p className="faint">Nothing yet.</p>;
  return (
    <ul className="inbox" style={{ marginTop: 6 }}>{items.map((n) => (
      <li key={n.id} className={n.read ? '' : 'unread'}>
        <span className="when">{seasonNo(n.y)} · {n.y}</span>
        <div>
          <span className="kind">{KINDS[n.kind] || 'News'}</span>
          {lang === 'np' && n.ne ? <p className="ttl ne">{nn(G, n.ne)}</p> : <><p className="ttl">{n.text}</p>{lang === 'both' && n.ne && <p className="ne t-small faint">{nn(G, n.ne)}</p>}</>}
          {(n.detail || n.fix) && <p className="mut t-small" style={{ marginTop: 4, maxWidth: 620 }}>{n.detail} {n.fix && <Link to={`/scorecard/${n.fix}`}>Scorecard</Link>}</p>}
          {n.choices && !n.done && <div className="acts">{n.choices.map((c, i) => <button key={i} type="button" className="btn btn-sm" onClick={() => update(() => { G.applyEvent(n, i); autosave(G); })}>{c.l}</button>)}</div>}
          {n.picked && <p className="faint t-small" style={{ marginTop: 4 }}>You chose: {n.picked}</p>}
        </div>
      </li>))}</ul>
  );
}

export function MiniTable() {
  const { G } = useGame(); const st = G.standings();
  return (
    <table className="tbl compact plain"><thead><tr><th style={{ paddingLeft: 0 }}>#</th><th>Team</th><th className="r">P</th><th className="r">Pts</th><th className="r">NRR</th></tr></thead>
      <tbody>{st.map((r, i) => <tr key={r.id} className={`${r.id === G.user ? 'me' : ''} ${i === 3 ? 'cut' : ''}`}><td style={{ paddingLeft: 0 }}>{i + 1}</td><td><Dot id={r.id} />{tshort(G, r.id)}</td><td className="r">{r.p}</td><td className="r">{r.pts}</td><td className="r">{fmtNRR(r.nrr)}</td></tr>)}</tbody></table>
  );
}

const H1 = ({ children }) => <h1 style={{ fontSize: 34, lineHeight: '40px', fontWeight: 600, letterSpacing: '-.015em', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 14px' }}>{children}</h1>;
const KV = ({ k, children }) => <tr><td className="faint" style={{ paddingLeft: 0 }}>{k}</td>{children}</tr>;

function Hero() {
  const { G, ui, update, toast, setG } = useGame(); const nav = useNavigate();
  const s = G.s, t = G.teams[G.user];
  const busy = (fn) => async () => { toast('Simulating…'); await fn(); autosave(G); update(); };
  if (s.sacked) return (
    <section className="stack" style={{ gap: 14 }}><h1 className="t-h1">You have been dismissed.</h1><p className="mut">The {t.name} board has ended your contract. Board confidence fell to {t.board}.</p>
      <div className="row" style={{ gap: 10 }}><button className="btn btn-primary btn-lg" onClick={() => nav('/club')}>See job offers · {(s.offers || []).length}</button><button className="btn btn-lg" onClick={() => setG(null)}>Start a new game</button></div></section>);
  if (s.phase === 'preseason') {
    const os = G.osCount(G.user); const ok = os >= 6 || !G.osFreeAgents().some((p) => p.value <= t.osPurse);
    return (
      <section className="stack" style={{ gap: 14 }}>
        <p className="faint t-small">Season {seasonNo(G.year)} · {G.year} · first ball at Kirtipur{G.year === 2026 ? ' on October 26' : ''}</p>
        <H1>Pre-season</H1>
        <table className="tbl plain compact" style={{ maxWidth: 560 }}><tbody>
          <KV k="Squad"><td>{t.squad.length} players · need 18 to 22</td></KV>
          <KV k="Overseas"><td className={os < 6 ? 'crim' : ''}>{os} signed · need 6 to 8</td></KV>
          <KV k="Objective"><td>{(t.objective || {}).txt}</td></KV></tbody></table>
        <div className="row" style={{ gap: 10 }}>
          <button className={`btn btn-lg ${ok ? '' : 'btn-primary'}`} onClick={() => nav('/signings')}>Overseas signing window</button>
          <button className="btn btn-lg" onClick={() => nav('/squad')}>Review squad</button>
          <button className={`btn btn-lg ${ok ? 'btn-primary' : ''}`} disabled={!ok} onClick={() => update(() => { const n = startSeason(G); autosave(G); if (n) toast(`${n} free agent${n > 1 ? 's' : ''} signed at base price to complete your squad.`); })}>Start Season {seasonNo(G.year)}</button>
        </div>
        {(t.squad.length < 18 || os < 6) && <div className="row" style={{ gap: 10, alignItems: 'center' }}><button className="btn btn-ghost" onClick={() => update(() => { const n = completeSquad(G); autosave(G); toast(n ? `Signed ${n} free agent${n > 1 ? 's' : ''} at base price.` : 'No affordable free agents left.'); })}>Auto-complete squad</button><span className="faint t-small">Signs the best affordable free agents up to 18 players and 6 overseas.</span></div>}
        {!ok && <p className="crim t-small">Sign overseas players until you have at least 6, or auto-complete the squad.</p>}
      </section>);
  }
  if (s.phase === 'league' || s.phase === 'playoffs') {
    const f = userNextFixture(G); const nu = nextUnplayed(G);
    if (f) {
      const st = G.standings(); const pos = (id) => st.findIndex((x) => x.id === id);
      const before = s.fixtures.filter((x) => !x.res && x.n < f.n).length;
      const live = (ui.live && !ui.live.done && ui.live.started) || !!savedMatchFor(G, f);
      const form = (id) => (G.teams[id].form || []).join(' ') || '–';
      const goMatch = async () => { if (!live) { if (before) toast('Simulating other matches…'); await simUntilUser(G); autosave(G); if (ui.live && ui.live.done) ui.live = null; } nav('/match'); };
      const quick = async () => { await simUntilUser(G); const ff = userNextFixture(G); if (ff) { ui.live = null; const m = await quickSimUserMatch(G, ff); autosave(G); toast(`${m.result.text}.`); } update(); };
      return (
        <section className="stack" style={{ gap: 14 }}>
          <p className="faint t-small">{f.date}, {f.night ? '7:15 pm' : '3:00 pm'} · {stageName(f)} · TU International Cricket Ground, Kirtipur</p>
          <H1><span style={{ display: 'flex', alignItems: 'center' }}><Dot id={f.home} big />{tname(G, f.home)}</span><span className="faint" style={{ fontWeight: 400 }}>v</span><span style={{ display: 'flex', alignItems: 'center' }}><Dot id={f.away} big />{tname(G, f.away)}</span></H1>
          <table className="tbl plain compact" style={{ maxWidth: 560 }}><tbody>
            <KV k="Table"><td>{ordinal(pos(f.home) + 1)} · {s.table[f.home].pts} pts</td><td>{ordinal(pos(f.away) + 1)} · {s.table[f.away].pts} pts</td></KV>
            <KV k="Form"><td className="board-f" style={{ fontSize: 17, letterSpacing: '.08em' }}>{form(f.home)}</td><td className="board-f" style={{ fontSize: 17, letterSpacing: '.08em' }}>{form(f.away)}</td></KV></tbody></table>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-primary btn-lg" onClick={goMatch}>{live ? (ui.live && ui.live.started ? 'Back to live match' : 'Resume match') : 'Go to match'}</button>
            <button className="btn btn-lg" onClick={() => nav('/squad')}>Review XI <span className="sub faint">{xiStatus(G)}</span></button>
            {!(ui.live && ui.live.started && !ui.live.done) && <button className="btn btn-ghost btn-lg" onClick={quick}>{live ? 'Quick sim the rest' : 'Quick sim'}</button>}
          </div>
          {before > 0 && !live && <p className="faint t-small">{before} other match{before > 1 ? 'es' : ''} will be simulated first.</p>}
        </section>);
    }
    if (nu) return (
      <section className="stack" style={{ gap: 14 }}><h1 className="t-h1">{s.phase === 'playoffs' ? 'Playoffs' : 'League'} continue without you</h1><p className="mut">Next: {stageName(nu)}, {tname(G, nu.home)} v {tname(G, nu.away)}.</p>
        <div className="row" style={{ gap: 10 }}><button className="btn btn-primary btn-lg" onClick={busy(() => simFixture(G, nu))}>Simulate next match</button><button className="btn btn-lg" onClick={busy(() => simToSeasonEnd(G, false))}>Simulate to the end of the season</button></div></section>);
  }
  if (s.phase === 'seasonEnd') {
    const h = s.history[s.history.length - 1];
    return (
      <section className="stack" style={{ gap: 14 }}><p className="faint t-small">Season {seasonNo(h.year)} · {h.year} is over</p>
        <H1><span style={{ display: 'flex', alignItems: 'center' }}><Dot id={h.champion} big />{tname(G, h.champion)} are champions</span></H1>
        <p className="mut">{h.final}. Player of the tournament: {h.pot}.</p>
        <table className="tbl plain compact" style={{ maxWidth: 560 }}><tbody>
          <KV k="Platinum Cap"><td>{h.runs[0][0]} · {h.runs[0][2]} runs</td></KV><KV k="Golden Cap"><td>{h.wkts[0][0]} · {h.wkts[0][2]} wickets</td></KV>
          {h.emerging && <KV k="Emerging player"><td>{h.emerging}</td></KV>}</tbody></table>
        <div className="row" style={{ gap: 10 }}><button className="btn btn-primary btn-lg" onClick={() => { G.startOffseason(); autosave(G); update(); nav('/offseason'); }}>Start the off-season</button>{s.offers && s.offers.length > 0 && <button className="btn btn-lg" onClick={() => nav('/club')}>Job offers</button>}</div></section>);
  }
  const simple = (title, text, label, to) => <section className="stack" style={{ gap: 14 }}><h1 className="t-h1">{title}</h1><p className="mut">{text}</p><div className="row"><button className="btn btn-primary btn-lg" onClick={() => nav(to)}>{label}</button></div></section>;
  if (s.phase === 'offseason') return simple('Off-season', `Players have aged a year. Review the changes, make trades, then move on to ${s.mega ? 'retention for the mega auction' : 'releases for the mini auction'}.`, 'Off-season summary', '/offseason');
  if (s.phase === 'retention') return simple(s.mega ? 'Retention' : 'Releases', s.mega ? 'Pick up to 3 players to keep before the mega auction.' : 'Choose who to release before the mini auction.', `Go to ${s.mega ? 'retention' : 'releases'}`, '/retention');
  if (s.phase === 'auction') return simple(`${s.auction.kind === 'mega' ? 'Mega' : 'Mini'} auction ${G.year}`, 'The auction room is open.', 'Enter the auction room', '/auction');
  return null;
}

export default function Home() {
  const { G } = useGame(); const s = G.s, t = G.teams[G.user];
  const obj = t.objective || { txt: '—' }; const bc = t.board;
  const unread = s.inbox.filter((n) => !n.read).length, dec = s.inbox.filter((n) => n.choices && !n.done).length;
  useEffect(() => () => { s.inbox.forEach((n) => { n.read = true; }); }, [s]);
  const watch = t.squad.map((id) => G.P(id)).filter((p) => p.inj || p.fit < 75 || (p.lastDev && Math.abs(p.lastDev) >= 3 && s.phase === 'preseason')).slice(0, 6);
  return (
    <div className="wrap split">
      <div className="stack" style={{ gap: 36 }}>
        <Hero />
        <section><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h2 className="t-h2">Inbox</h2><span className="faint t-small">{dec} need a decision · {unread} unread</span></div><Inbox /></section>
      </div>
      <aside className="stack" style={{ gap: 28 }}>
        <section className="panel stack" style={{ gap: 12 }}><h2 className="sec" style={{ margin: 0 }}>Board objective</h2><p className="t-h3">{obj.txt}</p>
          <div className="stack" style={{ gap: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between' }} className="t-small"><span className="mut">Board confidence</span><span className="num">{bc} · {boardMood(bc)}</span></div><Meter pct={bc} blue /><p className="faint t-micro">Below 30 at the end-of-season review puts your job at risk.</p></div>
          <hr className="hr" style={{ margin: '4px 0' }} /><p className="t-small mut">Manager: {s.manager.name} · reputation {s.manager.rep}</p></section>
        <section><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h2 className="sec">Table</h2><Link to="/table" className="t-small">Full table</Link></div><MiniTable /></section>
        <section><h2 className="sec">Squad watch</h2><ul className="inbox">
          {watch.length ? watch.map((p) => (
            <li key={p.id} style={{ gridTemplateColumns: 'minmax(0,1fr) auto', padding: '10px 0' }}><Link to={`/player/${p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link>
              {p.inj ? <span className="crim t-small">Injured · {p.inj} match{p.inj > 1 ? 'es' : ''}</span> : p.fit < 75 ? <span className="mut t-small">Fitness {Math.round(p.fit)}%</span> : <span className={`${p.lastDev > 0 ? 'up' : 'down'} t-small`}>Rating {p.prevOvr} → {ovr(p)}</span>}</li>))
            : <li style={{ gridTemplateColumns: '1fr', padding: '10px 0' }}><span className="faint t-small">Everyone is fit.</span></li>}
        </ul></section>
      </aside>
    </div>
  );
}
