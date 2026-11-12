import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Meter } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { NewsRow, ageOf, isPending, today, kindOf, KINDS } from '../components/news.jsx';
import { openDecisions, dueLabel } from '../components/DecisionSheet.jsx';
import { ovr } from '../game/engine.js';
import { ordinal, effectLines } from '../game/game.js';
import { fmtL } from '../game/engine.js';
import { seasonNo, fmtNRR, formDisp, stageName, tname, tshort, userNextFixture, nextUnplayed, boardMood, useNarrow, nn } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { lastMeeting } from '../game/depth.js';
import { autosave } from '../lib/save.js';
import { simUntilUser, simFixture, simToSeasonEnd, completeSquad, startSeason, savedMatchFor, quickSimUserMatch, startOffseason, matchPath, afterMatchRoute } from '../lib/flow.js';
import * as CR from '../world/career.js';
import * as ST from '../world/state.js';
import { ClubEventCard, ClubPortal } from './ClubAbroadCard.jsx';
import { savedWorld } from '../world/match.js';
import DateGate from '../components/DateGate.jsx';
import ClashPicker from '../components/ClashPicker.jsx';
import { NDot } from '../components/NationBits.jsx';
import { short, label as dayLabel } from '../world/dates.js';
import '../styles/career.css';

// ===== Both jobs: the world clock, the next national match, the national board =====
// The clock: today, the next thing that needs you across both jobs, and Continue.
export function ClockBar({ m }) {
  const { G, update, toast } = useGame(); const [busy, setBusy] = useState(false); if (!G.s.wd) return null;
  const ev = CR.nextEvent(G); const now = G.s.wd.day; const due = ev && ev.day <= now;
  const go = async () => { setBusy(true); toast('The world moves on…'); const d0 = G.s.wd.day, n0 = ST.played.n; try { await CR.continueWorld(G); autosave(G); const n = ST.played.n - n0; toast(`Now ${dayLabel(G.s.wd.day)} · ${G.s.wd.day - d0} days on${n ? `, ${n} matches played` : ''}.`); } finally { setBusy(false); update(); } };
  return (
    <section className={`cr-clock${m ? ' m' : ''}`} aria-label="Calendar">
      <div className="stack cr-today"><span className="t-micro faint">Today</span><span className="b6 num">{dayLabel(now)}</span></div>
      <div className="stack grow" style={{ minWidth: 0 }}><span className="t-micro faint">{!ev ? 'Next' : due ? 'Due today' : `Next · ${short(ev.day)} · in ${ev.day - now} day${ev.day - now === 1 ? '' : 's'}`}</span><span className="t-small ell">{CR.eventLabel(G, ev)}</span></div>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>{!due && <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={go}>{busy ? 'Moving on…' : 'Continue'}</button>}<Link to="/calendar" className="t-small">Calendar</Link></div>
    </section>
  );
}
// The user's next national fixture: move on to the match day, then play it live or let the assistant play it.
export function WorldCard({ ev, m }) {
  const { G, ui, update, toast } = useGame(); const nav = useNavigate(); const [busy, setBusy] = useState(false);
  const { S, f } = ev; const now = G.s.wd.day; const due = ev.day <= now; const me = CR.mySide(G, f); const opp = f.a === me ? f.b : f.a;
  const sel = CR.selection(G, me, f.fmt); const sw = savedWorld(G); const live = (ui.live && ui.live.world && ui.live.f === f && ui.live.started && !ui.live.done) || (sw && sw.f === f);
  const j = CR.jobs(G).find((x) => x.team === me); const last = S.fx.filter((x) => x.res && (x.a === opp || x.b === opp)).slice(-1)[0];
  const go = async () => { if (!due) { setBusy(true); toast('Moving on to the match day…'); try { await CR.continueWorld(G); autosave(G); } finally { setBusy(false); update(); } return; } nav('/match'); };
  const quick = () => update(() => { if (sw) delete G.s.liveMatch; ui.live = null; const r = CR.assistantPlays(G, S, f); autosave(G); toast(`${r.text}.`); });
  const T2 = ({ id }) => <span className="tm"><NDot id={id} big />{CR.nationName(G, id)}</span>;
  const body = (
    <>
      <p className="faint t-micro">National match · {CR.seasonName(S)} · {dayLabel(f.d)}{f.ko ? ` · ${f.ko === 'F' ? 'Final' : f.ko}` : ''}</p>
      {m ? <p className="cr-teams"><T2 id={f.a} /><T2 id={f.b} /></p> : <H1><T2 id={f.a} /><span className="faint" style={{ fontWeight: 400 }}>v</span><T2 id={f.b} /></H1>}
      <p className="t-small mut">{{ ODI: 'ODI · 50 overs', Test: 'Test · 5 days', FC4: 'First-class · 4 days', FC3: 'First-class · 3 days', FC2: 'First-class · 2 days' }[f.fmt] || 'T20I · 20 overs'} · Squad {sel.picked ? 'picked by you' : 'picked by the assistant'} · XI {sel.xi.length}/11{last ? ` · ${CR.nationName(G, opp)} last: ${last.res.text}` : ''}</p>
      <div className={m ? 'cr-btns' : 'hero-btns'}>
        <button type="button" className={`btn btn-primary${m ? '' : ' btn-lg'}`} disabled={busy} onClick={go}>{busy ? 'Moving on…' : !due ? `Continue to ${short(f.d)}` : live ? 'Back to the match' : 'Play live'}</button>
        <Link to={CR.abroadJob(G) && CR.abroadJob(G).team === me ? '/clubabroad?tab=squad' : `/nation?fmt=${f.fmt}`} className={`btn${m ? '' : ' btn-lg'}`}>Pick squad</Link>
      </div>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        {due && !(ui.live && ui.live.world && ui.live.started && !ui.live.done) && <button type="button" className="btn btn-ghost btn-sm" onClick={quick}>{G.s.settings.assistant ? 'Let the assistant play' : 'Quick sim'}</button>}
        {j && <span className="faint t-micro">Board confidence {j.board} · {boardMood(j.board)}</span>}
      </div>
    </>);
  return m ? <section className="stack cr-wcard" style={{ gap: 8 }}>{body}</section> : <Card>{body}</Card>;
}
// The national board: confidence, the year's objectives and the record.
export function NationPortal() {
  const { G } = useGame(); const j = CR.nationJob(G); if (!j) return null;
  const st = (o) => (o.done === true ? <span className="blu t-micro b6">Met</span> : o.done === false ? <span className="crim t-micro b6">Missed</span> : <span className="faint t-micro">In progress</span>);
  return (
    <section className="p-board"><Head title={`${CR.nationName(G, j.team)} board`} to="/jobs" link="Jobs" />
      <div className="panel stack" style={{ gap: 8, padding: '12px 14px' }}>
        <div className="sechead" style={{ margin: 0 }}><span className="t-small b6">Record P{j.rec.p} W{j.rec.w} L{j.rec.l}</span><span className="t-small mut num">{j.board} · {boardMood(j.board)}</span></div>
        <Meter pct={j.board} blue />
        {j.obj.length ? j.obj.map((o) => <div key={o.sid} className="sechead" style={{ margin: 0, alignItems: 'center', gap: 8 }}><Link to={`/comp/${o.sid}`} className="t-small">{o.t}</Link>{st(o)}</div>) : <p className="t-small faint">No competitions this year yet.</p>}
        <p className="faint t-micro">Below {CR.sackLine(G)} after a missed objective and the board will dismiss you.</p>
      </div>
    </section>
  );
}
function NationResults() {
  const { G } = useGame(); const me = CR.userNation(G); if (!me) return null;
  const list = []; for (const S of Object.values(G.s.wd.seasons)) for (const f of S.fx) if (f.res && (f.a === me || f.b === me)) list.push([S, f]);
  list.sort((a, b) => b[1].d - a[1].d);
  return (
    <section className="p-results"><Head title="National results" to="/calendar?view=list" link="Competitions" />
      {list.length ? list.slice(0, 4).map(([S, f]) => { const wl = f.res.nr || (f.res.tie && !f.res.w) ? '–' : f.res.w === me ? 'W' : 'L'; return (
        <Link key={f.id} to={`/comp/${S.id}?tab=fixtures&fx=${encodeURIComponent(f.id)}`} className="rrow"><span className={`board-f wl ${wl === 'W' ? 'w' : wl === 'L' ? 'l' : ''}`}>{wl}</span><span className="t-small rrow-t">{f.res.text}</span><span className="t-micro faint">{short(f.d)}</span></Link>); })
        : <p className="faint t-small">No national matches played yet.</p>}
    </section>
  );
}
function CompsPortal() {
  const { G } = useGame(); const me = CR.userNation(G); if (!me || !G.s.wd) return null;
  const now = G.s.wd.day; const list = Object.values(G.s.wd.seasons).filter((S) => S.teams.includes(me) && (S.done ? (S.end ?? 0) >= now - 45 : (S.start ?? 0) <= now + 120)).sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  return (
    <section className="p-caps"><Head title="Your competitions" to="/calendar?view=list" link="All competitions" />
      {list.length ? <ul className="mlist">{list.slice(0, 5).map((S) => { const t = CR.nationJob(G) && CR.nationJob(G).obj.find((o) => o.sid === S.id); return <li key={S.id}><Link to={`/comp/${S.id}`} className="grow" style={{ color: 'inherit', textDecoration: 'none' }}>{CR.seasonName(S)}<br /><span className="l2">{S.done ? `Finished${S.champ ? ` · ${CR.nationName(G, S.champ)} won` : ''}` : `${S.fx.filter((f) => f.res).length} of ${S.fx.length} played`}{t ? ` · ${t.t}` : ''}</span></Link><span className="faint" aria-hidden="true">›</span></li>; })}</ul>
        : <p className="faint t-small">No competitions scheduled for {CR.nationName(G, me)} yet.</p>}
    </section>
  );
}
function OffersPin() {
  const { G } = useGame(); const n = (G.s.wd && G.s.wd.offers || []).length; if (!n) return null;
  return <Link to="/jobs" className="pin p-pin"><span className="pin-body"><span className="t-small b6">{plural(n, 'job offer')} waiting</span><span className="t-micro">{G.s.wd.offers.map((o) => CR.nationName(G, o.team)).join(', ')}</span></span><span className="t-small b6">Jobs</span></Link>;
}
// A manager with no job at all: offers and applications.
function OutOfWork() {
  const { G } = useGame();
  return <Card><H1>Between jobs</H1><p className="mut">The world goes on. Offers come every few months; you can also apply to a national board.</p><div className="acts"><Link className="btn btn-primary btn-lg" to="/jobs">Jobs and offers</Link></div><p className="faint t-micro">Reputation {Math.round(G.s.manager.rep)}.</p></Card>;
}

export function xiStatus(G) {
  const t = G.teams[G.user]; if (!t.xi || t.xi.length !== 11) return 'auto-pick';
  const os = t.xi.filter((id) => G.P(id).nat !== 'NEP').length;
  return G.validXI(G.user, t.xi) ? `${11 - os} + ${os} set` : 'needs attention';
}

// Entry buttons for the big occasions: playoff week, final week, the season review and the trophy.
export function OccasionButtons({ f, sm }) {
  const { G } = useGame(); const s = G.s; const out = [];
  if (s.phase === 'playoffs') { if (f && f.stage === 'F') out.push(['/final', 'Final week', 'फाइनल हप्ता', true]); else out.push(['/playoffs', 'Playoff week', 'प्लेअफ हप्ता']); }
  else if (f && f.stage === 'F') out.push(['/final', 'Final week', 'फाइनल हप्ता', true]);
  if (s.phase === 'seasonEnd') { const h = s.history[s.history.length - 1]; if (h && h.champion === G.user) out.push(['/trophy', 'Trophy ceremony', 'ट्रफी समारोह', true]); out.push(['/review', 'Season review', 'सिजन समीक्षा']); }
  if (!out.length) return null;
  return <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>{out.map(([to, en, np, gold]) => <Link key={to} to={to} className={`btn${sm ? ' btn-sm' : ''}${gold ? ' occasion' : ''}`}>{T(G, en, np)}</Link>)}</div>;
}

const H1 = ({ children }) => <h1 className="t-h1 teams">{children}</h1>;
const KV = ({ k, children }) => <tr><td className="faint" style={{ paddingLeft: 0 }}>{k}</td>{children}</tr>;
const Card = ({ children }) => <section className="panel hero p-next">{children}</section>;
const clip = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s || '');
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// A portal heading with its "See all" link.
function Head({ title, to, link }) {
  return <div className="sechead"><h2 className="t-h2">{title}</h2>{to && <Link to={to} className="t-small seeall">{link} ›</Link>}</div>;
}

function DecisionPin() {
  const { G, ui, update } = useGame(); const p = G.s.inbox.filter(isPending);
  if (!p.length || G.decisionsDue().length) return null;
  const before = (G.s.phase === 'league' || G.s.phase === 'playoffs') && userNextFixture(G);
  return (
    <Link to="/news" className="pin p-pin" onClick={(e) => { e.preventDefault(); openDecisions(G, ui, update); }}>
      <span className="pin-body"><span className="t-small b6">{plural(p.length, 'decision')} {before ? 'before your next match' : 'waiting'}</span><span className="t-micro">{clip(p[0].text, 64)}</span></span>
      <span className="t-small b6">Decide</span></Link>
  );
}

function Hero() {
  const { G, ui, update, toast, setG } = useGame(); const nav = useNavigate();
  const s = G.s, t = G.teams[G.user];
  if (G.s.wd && !CR.hasClub(G)) return CR.nationJob(G) || CR.abroadJob(G) ? null : <OutOfWork />;
  const busy = (fn) => async () => { toast('Simulating…'); await fn(); autosave(G); update(); };
  if (s.sacked) return (
    <Card><H1>You have been dismissed.</H1><p className="mut">The {t.name} board has ended your contract. Board confidence fell to {t.board}.</p>
      <div className="acts"><button className="btn btn-primary btn-lg" onClick={() => nav('/club')}>See job offers · {(s.offers || []).length}</button>{CR.nationJob(G) ? <button className="btn btn-lg" onClick={() => update(() => { CR.resign(G, 'club'); autosave(G); })}>Carry on with {CR.nationName(G, CR.userNation(G))} only</button> : <button className="btn btn-lg" onClick={() => setG(null)}>Start a new game</button>}</div></Card>);
  if (s.phase === 'preseason') {
    const os = G.osCount(G.user); const ok = os >= 6 || !G.osFreeAgents().some((p) => p.value <= t.osPurse);
    return (
      <Card>
        <p className="faint t-micro">Season {seasonNo(G.year)} · {G.year} · first ball at Kirtipur{G.year === 2026 ? ' on October 26' : ''}</p>
        <H1>Pre-season</H1>
        <table className="tbl plain compact"><tbody>
          <KV k="Squad"><td className="wrapcell">{t.squad.length} players · need 18 to 22</td></KV>
          <KV k="Overseas"><td className={`wrapcell ${os < 6 ? 'crim' : ''}`}>{os} signed · need 6 to 8</td></KV>
          <KV k="Objective"><td className="wrapcell">{(t.objective || {}).txt}</td></KV></tbody></table>
        <div className="acts">
          <button className={`btn ${ok ? '' : 'btn-primary'}`} onClick={() => nav('/signings')}>Overseas signing window</button>
          <button className="btn" onClick={() => nav('/squad')}>Review squad</button>
          <DateGate what="season" className={`btn ${ok ? 'btn-primary' : ''}`} disabled={!ok} onClick={() => update(() => { const n = startSeason(G); autosave(G); if (n) toast(`${n} free agent${n > 1 ? 's' : ''} signed at base price to complete your squad.`); })}>Start Season {seasonNo(G.year)}</DateGate>
        </div>
        {(t.squad.length < 18 || os < 6) && <div className="row" style={{ gap: 10, alignItems: 'center' }}><button className="btn btn-ghost" onClick={() => update(() => { const n = completeSquad(G); autosave(G); toast(n ? `Signed ${n} free agent${n > 1 ? 's' : ''} at base price.` : 'No affordable free agents left.'); })}>Auto-complete squad</button><span className="faint t-small">Signs the best affordable free agents up to 18 players and 6 overseas.</span></div>}
        {!ok && <p className="crim t-small">Sign overseas players until you have at least 6, or auto-complete the squad.</p>}
      </Card>);
  }
  if (s.phase === 'league' || s.phase === 'playoffs') {
    const f = userNextFixture(G); const nu = nextUnplayed(G);
    if (f) {
      const st = G.standings(); const pos = (id) => ordinal(st.findIndex((x) => x.id === id) + 1);
      const before = s.fixtures.filter((x) => !x.res && x.n < f.n).length;
      const live = (ui.live && !ui.live.done && ui.live.started) || !!savedMatchFor(G, f);
      const form = (id) => (G.teams[id].form || []).slice(-3).join(' ') || '–';
      const due = G.decisionsDue(); const gated = due.length > 0;
      const decide = (id) => openDecisions(G, ui, update, id);
      const goMatch = async () => { if (gated) { decide(); return; } if (!live) { if (before) toast('Simulating other matches…'); await simUntilUser(G); autosave(G); if (ui.live && ui.live.done) ui.live = null; } nav(matchPath(G, f, live)); };
      const quick = async () => { if (gated) { decide(); return; } await simUntilUser(G); const ff = userNextFixture(G); if (ff) { ui.live = null; if (!savedMatchFor(G, ff) && G.s.wd) CR.applyCallUps(G, ff); const m = await quickSimUserMatch(G, ff); autosave(G); toast(`${m.result.text}.`); update(); nav(afterMatchRoute(G, ff)); return; } update(); };
      return (
        <Card>
          <p className="faint t-micro">Next match · {f.date}, {f.night ? '7:15 pm' : '3:00 pm'} · {f.stage === 'L' ? `Match ${f.n}` : stageName(f)}</p>
          <H1><span className="tm"><Dot id={f.home} big />{tshort(G, f.home)}</span><span className="faint" style={{ fontWeight: 400 }}>v</span><span className="tm"><Dot id={f.away} big />{tshort(G, f.away)}</span></H1>
          <p className="t-small mut">{f.stage === 'L' && <>{pos(f.home)} v {pos(f.away)} · </>}Form <span className="board-f formstr">{form(f.home)}</span> v <span className="board-f formstr">{form(f.away)}</span>{lastMeeting(G, f.home, f.away) && <> · {lastMeeting(G, f.home, f.away)}</>}</p>
          {gated && <div className="gate">
            <p className="t-small crim b6">{plural(due.length, 'decision')} before this match</p>
            {due.map((n) => <div key={n.id} className="gate-row"><span className="gate-ic" aria-hidden="true">!</span>
              <span className="gate-t"><span className="t-micro faint">{n.cat || 'Club'} · {dueLabel(G, n).replace(/^Before/, 'before').replace(/ · .*$/, '')}</span><span className="t-small b6">{n.title || n.text}</span>{n.sum && <span className="t-micro mut">{n.sum}</span>}</span>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => decide(n.id)}>Decide</button></div>)}
            <p className="t-micro faint" style={{ padding: '8px 0 10px' }}>Not answering in time picks the cautious option for you, and the board notices.</p>
          </div>}
          <div className="hero-btns">
            <button className="btn btn-primary btn-lg" disabled={gated} onClick={goMatch}>{live ? (ui.live && ui.live.started ? 'Back to live match' : 'Resume match') : 'Go to match'}</button>
            <button className="btn btn-lg" onClick={() => nav('/squad')} title={`XI: ${xiStatus(G)}`}>Review XI</button>
          </div>
          {gated && <p className="t-micro faint" style={{ textAlign: 'center', maxWidth: 520 }}>{due.length === 1 ? 'Answer the decision to play' : due.length === 2 ? 'Answer both decisions to play' : `Answer all ${due.length} decisions to play`}</p>}
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            {!(ui.live && ui.live.started && !ui.live.done) && <button className="btn btn-ghost btn-sm" onClick={quick}>{live ? 'Quick sim the rest' : 'Quick sim'}</button>}
            {before > 0 && !live && <span className="faint t-micro">{before} other match{before > 1 ? 'es' : ''} will be simulated first.</span>}
            <OccasionButtons f={f} sm />
          </div>
        </Card>);
    }
    if (nu) return (
      <Card><H1>{s.phase === 'playoffs' ? 'Playoffs' : 'League'} continue without you</H1><p className="mut">Next: {stageName(nu)}, {tname(G, nu.home)} v {tname(G, nu.away)}.</p>
        <div className="acts"><button className="btn btn-primary btn-lg" onClick={busy(() => simFixture(G, nu))}>Simulate next match</button><button className="btn btn-lg" onClick={busy(() => simToSeasonEnd(G, false))}>Simulate to the end of the season</button></div><OccasionButtons /></Card>);
  }
  if (s.phase === 'seasonEnd') {
    const h = s.history[s.history.length - 1];
    return (
      <Card><p className="faint t-micro">Season {seasonNo(h.year)} · {h.year} is over</p>
        <H1><span className="tm"><Dot id={h.champion} big />{tname(G, h.champion)} are champions</span></H1>
        <p className="mut">{h.final}. Player of the tournament: {h.pot}.</p>
        <table className="tbl plain compact"><tbody>
          <KV k="Platinum Cap"><td className="wrapcell">{h.runs[0][0]} · {h.runs[0][2]} runs</td></KV><KV k="Golden Cap"><td className="wrapcell">{h.wkts[0][0]} · {h.wkts[0][2]} wickets</td></KV>
          {h.emerging && <KV k="Emerging player"><td className="wrapcell">{h.emerging}</td></KV>}</tbody></table>
        <div className="acts"><DateGate what="offseason" className="btn btn-primary btn-lg" onClick={async () => { toast('Nepal play their winter internationals…'); await startOffseason(G); autosave(G); update(); nav('/offseason'); }}>Start the off-season</DateGate>{s.offers && s.offers.length > 0 && <button className="btn btn-lg" onClick={() => nav('/club')}>Job offers</button>}</div><OccasionButtons /></Card>);
  }
  const simple = (title, text, label, to) => <Card><H1>{title}</H1><p className="mut">{text}</p><div className="acts"><button className="btn btn-primary btn-lg" onClick={() => nav(to)}>{label}</button></div></Card>;
  if (s.phase === 'offseason') return simple('Off-season', `Players have aged a year. Review the changes, make trades, then move on to ${s.mega ? 'retention for the mega auction' : 'releases for the mini auction'}.`, 'Off-season summary', '/offseason');
  if (s.phase === 'retention') return simple(s.mega ? 'Retention' : 'Releases', s.mega ? 'Pick up to 3 players to keep before the mega auction.' : 'Choose who to release before the mini auction.', `Go to ${s.mega ? 'retention' : 'releases'}`, '/retention');
  if (s.phase === 'auction') return simple(`${s.auction.kind === 'mega' ? 'Mega' : 'Mini'} auction ${G.year}`, 'The auction room is open.', 'Enter the auction room', '/auction');
  return null;
}

// "Start Paudel v Pokhara" / "Give Jora a debut", with how long is left.
export function promiseText(G, pr) {
  const p = G.P(pr.pid); const f = G.s.fixtures.find((x) => x.n === pr.dueFixture); const opp = f ? (f.home === G.user ? f.away : f.home) : null;
  return pr.kind === 'debut' ? `Give ${p.name} a debut` : `Start ${p.name}${opp ? ` v ${tshort(G, opp)}` : ''}`;
}
function Promises() {
  const { G } = useGame(); const list = G.s.promises || [];
  if (!list.length) return null;
  return (
    <section className="p-promises"><h2 className="sec" style={{ marginBottom: 6 }}>Promises you've made</h2>
      <div className="panel stack" style={{ gap: 6, padding: '12px 14px' }}>
        {list.map((pr) => <div key={pr.id} className="sechead" style={{ margin: 0, alignItems: 'center' }}><span className="t-small">{promiseText(G, pr)}</span><span className={`ptag${pr.matchesLeft <= 1 ? ' g' : ''}`}>{pr.matchesLeft <= 1 ? 'Due next match' : `${pr.matchesLeft} matches left`}</span></div>)}
        <p className="t-micro faint">Breaking a promise costs morale and board confidence.</p>
      </div>
    </section>
  );
}
function LastAnswer() {
  const { G } = useGame(); const n = G.s.inbox.find((x) => x.kind === 'event' && x.done && x.picked && x.y === G.year);
  if (!n) return null;
  return (
    <section className="p-answer"><h2 className="sec" style={{ marginBottom: 6 }}>After your last match</h2>
      <div className="panel" style={{ padding: '12px 14px' }}><p className="t-micro faint">{n.auto ? 'Not answered in time' : 'Answered'} · {(n.cat || 'Club').toLowerCase()}</p><p className="t-small">{n.picked}.{n.outcome ? ` ${n.outcome}.` : ''}</p></div>
    </section>
  );
}

function NewsPortal() {
  const { G } = useGame(); const now = today(G);
  const items = G.s.inbox.filter((n) => !isPending(n)).slice(0, 3);
  const when = (n) => { const a = ageOf(G, n, now); return a === 'Today' || a === 'Yesterday' ? a : n.d || `Season ${seasonNo(n.y)}`; };
  return (
    <section className="p-news"><Head title="News" to="/news" link={`All news · ${G.s.inbox.length}`} />
      {items.length ? items.map((n) => <NewsRow key={n.id} G={G} n={n} sub={[clip((n.detail || '').split('. ')[0], 48), when(n)].filter(Boolean).join(' · ')} />) : <p className="faint t-small">Nothing yet.</p>}
    </section>
  );
}

function TablePortal() {
  const { G } = useGame(); const st = G.standings(); const me = st.findIndex((r) => r.id === G.user);
  const rows = st.slice(0, 4).map((r, i) => [r, i]); const out = me >= 4;
  const anyPlayed = st.some((r) => r.p > 0);
  const gap = out ? st[3].pts - st[me].pts : 0;
  const note = !anyPlayed ? null : out ? (gap > 0 ? `${plural(gap, 'point')} off the playoff places` : 'Level on points with 4th') : 'In the playoff places';
  const Row = ([r, i]) => <tr key={r.id} className={r.id === G.user ? 'me' : ''}><td className="faint">{i + 1}</td><td className="name"><Dot id={r.id} />{tshort(G, r.id)}{r.id === G.user ? ' (you)' : ''}</td><td className="r faint">{r.p}</td><td className="r"><b>{r.pts}</b></td><td className="r faint">{fmtNRR(r.nrr)}</td></tr>;
  return (
    <section className="p-table"><Head title="Table" to="/season" link="Full table" />
      <table className="tbl compact plain mini"><thead><tr><th>#</th><th>Team</th><th className="r">P</th><th className="r">Pts</th><th className="r">NRR</th></tr></thead>
        <tbody>{rows.map(Row)}{out && <tr className="gap" aria-hidden="true"><td colSpan={5} /></tr>}{out && Row([st[me], me])}</tbody></table>
      {note && <p className="t-micro faint" style={{ marginTop: 6 }}>{note}</p>}
    </section>
  );
}

// "Lumbini beat Karnali" / "by 4 wickets" from a stored result.
function resultLine(G, f) {
  const r = f.res; const opp = f.home === G.user ? f.away : f.home;
  if (r.nr) return ['–', `No result v ${tshort(G, opp)}`, 'Rain'];
  if (!r.winner) return ['–', `Tied with ${tshort(G, opp)}`, r.text.replace(/\.$/, '')];
  const loser = r.winner === f.home ? f.away : f.home; const m = /won (by .+?)\.?$/.exec(r.text);
  return [r.winner === G.user ? 'W' : 'L', `${tshort(G, r.winner)} beat ${tshort(G, loser)}`, m ? m[1] : ''];
}

function ResultsPortal() {
  const { G } = useGame();
  const mine = G.s.fixtures.filter((f) => f.res && (f.home === G.user || f.away === G.user)).slice(-3).reverse();
  return (
    <section className="p-results"><Head title="Results" to="/season?tab=results" link="All fixtures" />
      {mine.length ? mine.map((f) => { const [wl, txt, by] = resultLine(G, f); return (
        <Link key={`${f.stage}${f.n}`} to={`/scorecard/${f.n}`} className="rrow"><span className={`board-f wl ${wl === 'W' ? 'w' : wl === 'L' ? 'l' : ''}`}>{wl}</span><span className="t-small rrow-t">{txt}</span><span className="t-micro faint">{by}</span></Link>); })
        : <p className="faint t-small">No results yet.</p>}
    </section>
  );
}

function CapRaces() {
  const { G } = useGame(); const y = G.year;
  const ps = Object.values(G.players).filter((p) => p.stats[y] && p.stats[y].m > 0);
  const runs = ps.slice().sort((a, b) => b.stats[y].r - a.stats[y].r);
  const wkts = ps.slice().sort((a, b) => b.stats[y].w - a.stats[y].w || a.stats[y].rc - b.stats[y].rc);
  const lastName = (p) => p.name.split(' ').slice(-1)[0];
  const Cap = ({ label, list, v }) => {
    const [a, b] = list;
    return (
      <div className="panel cap"><p className="t-micro faint">{label}</p>
        {a && v(a) > 0 ? <><Link to={`/player/${a.id}`} className="t-small b6 ell cap-n">{a.name}</Link><p className="board-f cap-v">{v(a)}</p><p className="t-micro faint ell">{b ? `Next: ${lastName(b)} ${v(b)}` : ''}</p></>
          : <><p className="t-small faint">No leader yet</p><p className="board-f cap-v faint">—</p></>}
      </div>);
  };
  return (
    <section className="p-caps"><Head title="Cap races" to="/stats" link="All stats" />
      <div className="caps"><Cap label="Platinum Cap · runs" list={runs} v={(p) => p.stats[y].r} /><Cap label="Golden Cap · wickets" list={wkts} v={(p) => p.stats[y].w} /></div>
    </section>
  );
}

function SquadWatch() {
  const { G } = useGame(); const t = G.teams[G.user]; const pre = G.s.phase === 'preseason';
  const sq = t.squad.map((id) => G.P(id));
  const items = [
    ...sq.filter((p) => p.inj).map((p) => [p, <span className="t-micro crim b6">Injured · {p.inj} match{p.inj > 1 ? 'es' : ''}</span>]),
    ...sq.filter((p) => !p.inj && p.fit < 75).sort((a, b) => a.fit - b.fit).map((p) => [p, <span className="t-micro mut">Fitness {Math.round(p.fit)}%</span>]),
    ...(pre ? sq.filter((p) => p.lastDev && Math.abs(p.lastDev) >= 3).map((p) => [p, <span className={`t-micro b6 ${p.lastDev > 0 ? 'up' : 'down'}`}>Rating {p.prevOvr} → {ovr(p)}</span>]) : []),
    ...sq.filter((p) => !p.inj && p.fit >= 75 && p.form >= 5).sort((a, b) => b.form - a.form).map((p) => [p, <span className="t-micro blu b6">In form · {formDisp(p)}</span>]),
  ].slice(0, 3);
  return (
    <section className="p-watch"><Head title="Squad watch" to="/squad" link={`Squad · ${t.squad.length}`} />
      {items.length ? items.map(([p, tag]) => <Link key={p.id} to={`/player/${p.id}`} className="wrow"><span className="t-small ell">{p.name}</span>{tag}</Link>) : <p className="faint t-small">Everyone is fit.</p>}
    </section>
  );
}

function BoardPortal() {
  const { G } = useGame(); const t = G.teams[G.user]; const bc = t.board;
  return (
    <section className="p-board"><Head title="Board" to="/club" link="Club" />
      <div className="panel stack" style={{ gap: 8, padding: '12px 14px' }}>
        <div className="sechead" style={{ margin: 0 }}><span className="t-small b6">{(t.objective || { txt: '—' }).txt}</span><span className="t-small mut num">{bc} · {boardMood(bc)}</span></div>
        <Meter pct={bc} blue />
        <p className="faint t-micro">Below {G.diff().sack} at the end-of-season review puts your job at risk.</p>
      </div>
    </section>
  );
}

// ===== Phone: Today · Inbox · Club =====
// The next match, decisions answered in place, and alerts.
function MToday() {
  const { G, ui, update, toast } = useGame(); const nav = useNavigate(); const s = G.s;
  const club = !G.s.wd || CR.hasClub(G); const ev = G.s.wd ? CR.nextEvent(G) : null;
  const f = club && (s.phase === 'league' || s.phase === 'playoffs') && !s.sacked ? userNextFixture(G) : null;
  const pending = s.inbox.filter(isPending); const t = G.teams[G.user];
  const answer = (n, i) => update(() => { G.applyEvent(n, i); autosave(G); toast(`${n.choices[i].l}.`); });
  const st = G.standings(); const pos = (id) => ordinal(st.findIndex((x) => x.id === id) + 1);
  const form = (id) => (G.teams[id].form || []).slice(-4).join(' ') || '–';
  const inj = club ? t.squad.map((id) => G.P(id)).filter((p) => p.inj) : [];
  const unread = s.inbox.filter((n) => !n.read && !isPending(n)).length;
  const tasks = club ? G.tasks() : [];
  return (
    <>
      <ClockBar m />
      {ev && ev.clash && ev.day <= G.s.wd.day && <ClashPicker ev={ev} />}
      {ev && ev.kind === 'world' && !(ev.clash && ev.day <= G.s.wd.day) && <WorldCard ev={ev} m />}{ev && ev.kind === 'club' && <ClubEventCard ev={ev} />}
      {club ? (f ? <MNext f={f} pos={pos} form={form} /> : <div style={{ paddingTop: 12 }}><Hero /></div>) : !CR.nationJob(G) && !CR.abroadJob(G) && <div style={{ paddingTop: 12 }}><Hero /></div>}
      {G.s.wd && G.s.wd.offers.length > 0 && <div style={{ paddingTop: 10 }}><OffersPin /></div>}
      {pending.length > 0 && <><p className="mhead">Needs your decision · {pending.length}</p>
        <div className="stack" style={{ gap: 10 }}>{pending.slice(0, 4).map((n) => (
          <div key={n.id} className="panel" style={{ padding: 14 }}>
            <p className="b6">{n.title || n.text}</p>
            <p className="t-small mut" style={{ marginTop: 2 }}>{n.sum || effectLines(G, n, 0).map((e) => e.text).join(' · ')}{n.due != null ? ` · ${dueLabel(G, n).replace(/^Before/, 'before')}` : ''}</p>
            <div className="dchoice-row" style={n.choices.length > 2 ? { gridTemplateColumns: '1fr' } : undefined}>{n.choices.map((c, i) => <button key={i} type="button" className="btn" onClick={() => answer(n, i)}>{c.l}</button>)}</div>
            <button type="button" className="linkbtn t-micro" onClick={() => openDecisions(G, ui, update, n.id)}>See every effect</button>
          </div>))}</div></>}
      <p className="mhead">Also today</p>
      <ul className="mlist">
        {tasks.map((x) => <li key={x.key}><Link to={x.to} className="grow" style={{ color: 'inherit', textDecoration: 'none' }}>{x.text}{x.sub && <><br /><span className="l2">{x.sub}</span></>}</Link><span className="faint" aria-hidden="true">›</span></li>)}
        {inj.slice(0, 3).map((p) => <li key={p.id}><Link to={`/player/${p.id}`} className="grow" style={{ color: 'inherit', textDecoration: 'none' }}><span className="crim">{p.name}</span> out {p.inj} match{p.inj > 1 ? 'es' : ''}</Link></li>)}
        {(s.promises || []).slice(0, 2).map((pr) => <li key={pr.id}><span className="grow">{promiseText(G, pr)}</span><span className={`t-small ${pr.matchesLeft <= 1 ? 'gld' : 'faint'}`}>{pr.matchesLeft <= 1 ? 'Due next match' : `${pr.matchesLeft} left`}</span></li>)}
        {club && <li><span className="grow">Board confidence {nn(G, t.board)}</span><span className="faint t-small">{boardMood(t.board)}</span></li>}
        {CR.nationJob(G) && <li><Link to="/jobs" className="grow" style={{ color: 'inherit', textDecoration: 'none' }}>{CR.nationName(G, CR.userNation(G))} board {nn(G, CR.nationJob(G).board)}</Link><span className="faint t-small">{boardMood(CR.nationJob(G).board)}</span></li>}
        {unread > 0 && <li><Link to="/?tab=inbox" replace className="linkbtn">{unread} more in Inbox</Link></li>}
      </ul>
    </>
  );
}
function MNext({ f, pos, form }) {
  const { G, ui, update, toast } = useGame(); const nav = useNavigate();
  const due = G.decisionsDue(); const live = (ui.live && !ui.live.done && ui.live.started) || !!savedMatchFor(G, f);
  const before = G.s.fixtures.filter((x) => !x.res && x.n < f.n).length;
  const go = async () => { if (due.length) { openDecisions(G, ui, update); return; } if (!live) { if (before) toast('Simulating other matches…'); await simUntilUser(G); autosave(G); if (ui.live && ui.live.done) ui.live = null; } nav(matchPath(G, f, live)); };
  const quick = async () => { if (due.length) { openDecisions(G, ui, update); return; } await simUntilUser(G); const ff = userNextFixture(G); if (ff) { ui.live = null; if (!savedMatchFor(G, ff) && G.s.wd) CR.applyCallUps(G, ff); const m = await quickSimUserMatch(G, ff); autosave(G); toast(`${m.result.text}.`); update(); nav(afterMatchRoute(G, ff)); return; } update(); };
  const T2 = ({ id }) => <span style={{ display: 'flex', alignItems: 'center' }}><Dot id={id} />{tname(G, id)}{f.stage === 'L' && <span className="faint t-small" style={{ fontWeight: 400, marginLeft: 8 }}>{pos(id)}</span>}</span>;
  return (
    <section className="stack" style={{ gap: 8, padding: '14px 0 16px', borderBottom: '1px solid var(--rule)' }}>
      <p className="faint t-small">{f.date} {f.night ? '7:15 pm' : '3:00 pm'} · {f.stage === 'L' ? `Match ${f.n}` : stageName(f)} · Kirtipur</p>
      <p style={{ fontSize: 20, lineHeight: '26px', fontWeight: 600, display: 'flex', flexDirection: 'column' }}><T2 id={f.home} /><T2 id={f.away} /></p>
      <p className="t-small mut">Form <span className="board-f formstr">{form(f.home)}</span> v <span className="board-f formstr">{form(f.away)}</span> · XI {xiStatus(G)}</p>
      {lastMeeting(G, f.home, f.away) && <p className="t-small faint">{lastMeeting(G, f.home, f.away)}</p>}
      {due.length > 0 && <p className="t-small crim b6">{plural(due.length, 'decision')} before this match</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 8, marginTop: 4 }}>
        <button type="button" className="btn btn-primary" style={{ minHeight: 46 }} onClick={go}>{due.length ? 'Answer to play' : live ? 'Back to the match' : 'Go to match'}</button>
        <Link to="/squad" className="btn" style={{ minHeight: 46 }}>Review XI</Link>
      </div>
      {!(ui.live && ui.live.started && !ui.live.done) && <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={quick}>{live ? 'Quick sim the rest' : 'Quick sim'}{before > 0 && !live ? ` · ${before} other match${before > 1 ? 'es' : ''} first` : ''}</button>}
      <OccasionButtons f={f} sm />
    </section>
  );
}
const MFILTERS = [['all', 'All', () => true], ['dec', 'Decisions', isPending], ['injury', 'Injuries', (n) => n.kind === 'injury'], ['news', 'News', (n) => !isPending(n) && !['match', 'injury'].includes(n.kind)], ['match', 'Results', (n) => n.kind === 'match']];
function MInbox() {
  const { G, ui, update } = useGame(); const nav = useNavigate(); const [flt, setFlt] = useTab(['all', 'dec', 'injury', 'news', 'match'], 'all', 'f');
  const test = (MFILTERS.find((x) => x[0] === flt) || MFILTERS[0])[2]; const now = today(G);
  const list = G.s.inbox.filter(test).slice(0, 60);
  const when = (n) => { const a = ageOf(G, n, now); return a === 'Today' || a === 'Yesterday' ? a : n.d || `Season ${seasonNo(n.y)}`; };
  const open = (n) => { if (isPending(n)) { openDecisions(G, ui, update, n.id); return; } update(() => { n.read = true; }); if (n.fix) nav(`/scorecard/${n.fix}`); };
  const title = (n) => (G.s.lang === 'np' && n.ne ? n.ne : n.title || n.text);
  return (
    <>
      <div className="seg" role="group" aria-label="Filter" style={{ margin: '12px 0 4px', display: 'flex', overflowX: 'auto', flexWrap: 'nowrap' }}>
        {MFILTERS.map(([k, l]) => <button key={k} type="button" className={flt === k ? 'on' : ''} onClick={() => setFlt(k)}>{l}</button>)}</div>
      <ul className="mlist">{list.map((n) => (
        <li key={n.id} onClick={() => open(n)} style={{ cursor: 'pointer' }}>
          <span className="grow"><span className={!n.read || isPending(n) ? 'b6' : ''}>{title(n)}</span>{G.s.lang === 'both' && n.ne && <span className="ne nrow-ne">{n.ne}</span>}<br /><span className="l2">{isPending(n) ? 'Decision' : KINDS[kindOf(n)] || 'News'} · {when(n)}{n.detail ? ` · ${n.detail.split('. ')[0].slice(0, 60)}` : ''}</span></span>
          {isPending(n) && <span className="badge">!</span>}</li>))}
        {!list.length && <li className="faint t-small">Nothing here.</li>}</ul>
      <Link to="/news" className="t-small" style={{ display: 'inline-block', marginTop: 8 }}>Full inbox with every filter</Link>
    </>
  );
}
function MClub() {
  const { G } = useGame(); const t = G.teams[G.user]; const st = G.standings();
  const wage = t.squad.reduce((a, id) => a + G.P(id).salary, 0);
  return (
    <>
      <section className="stack" style={{ gap: 8, paddingTop: 14 }}>
        <p className="mhead" style={{ marginTop: 0 }}>Board objective</p>
        <p className="b6">{(t.objective || { txt: '—' }).txt}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between' }} className="t-small"><span className="mut">Confidence</span><span>{nn(G, t.board)} · {boardMood(t.board)}</span></div>
        <Meter pct={t.board} blue />
      </section>
      <p className="mhead">Table</p>
      <table className="tbl compact plain"><tbody>{st.slice(0, 4).map((r, i) => <tr key={r.id} className={`${r.id === G.user ? 'me' : ''}${i === 3 ? ' cut' : ''}`}><td style={{ paddingLeft: 0 }}>{i + 1}</td><td><Dot id={r.id} />{tshort(G, r.id)}</td><td className="r">{r.pts}</td><td className="r faint">{fmtNRR(r.nrr)}</td></tr>)}</tbody></table>
      <Link to="/season" className="t-small" style={{ display: 'inline-block', marginTop: 8 }}>Full table</Link>
      <p className="mhead">Money</p>
      <ul className="mlist">
        <li><span className="grow">Balance</span><span>{fmtL(t.balance)}</span></li>
        <li><span className="grow">Wage bill</span><span>{fmtL(wage)}</span></li>
        <li><span className="grow">Fan support</span><span>{Math.round(t.fans)} · {t.fans >= 70 ? 'Hot' : t.fans >= 55 ? 'Warm' : t.fans >= 40 ? 'Cool' : 'Cold'}</span></li>
      </ul>
      <Link to="/club" className="t-small" style={{ display: 'inline-block', marginTop: 8 }}>Club and finances</Link>
    </>
  );
}
function MNation() {
  return <div style={{ paddingTop: 14 }} className="stack"><ClubPortal /><NationPortal /><CompsPortal /><NationResults /></div>;
}
function HomeMobile() {
  const { G } = useGame(); const club = !G.s.wd || CR.hasClub(G); const third = club ? 'club' : 'nation';
  const [tab, setTab] = useTab(['today', 'inbox', third], 'today');
  const dec = G.s.inbox.filter(isPending).length; const unread = G.s.inbox.filter((n) => !n.read && !isPending(n)).length;
  const top = club ? undefined : { title: <><NDot id={CR.userNation(G)} />{CR.userNation(G) ? CR.nationName(G, CR.userNation(G)) : 'No job'}</>, sub: G.s.wd ? short(G.s.wd.day) : '', right: CR.nationJob(G) ? <>Board <b>{CR.nationJob(G).board}</b></> : <>Rep <b>{Math.round(G.s.manager.rep)}</b></> };
  return (
    <MScreen top={top} label="Home sections" tab={tab} onTab={setTab} tabs={[['today', tn(G, 'Today'), dec], ['inbox', tn(G, 'Inbox'), unread], club ? ['club', tn(G, 'Club')] : ['nation', 'Nation']]}>
      {tab === 'today' && <MToday />}{tab === 'inbox' && <MInbox />}{tab === 'club' && <MClub />}{tab === 'nation' && <MNation />}
    </MScreen>
  );
}

export default function Home() {
  const { G } = useGame(); const narrow = useNarrow();
  if (narrow) return <HomeMobile />;
  const club = !G.s.wd || CR.hasClub(G); const ev = G.s.wd ? CR.nextEvent(G) : null; const wcard = ev && ev.clash && ev.day <= G.s.wd.day ? <ClashPicker ev={ev} /> : ev && ev.kind === 'world' ? <WorldCard ev={ev} /> : ev && ev.kind === 'club' ? <ClubEventCard ev={ev} /> : null;
  if (!club) return (
    <div className="wrap portals">
      <div className="pcol"><ClockBar /><OffersPin />{wcard}<Hero /><NationResults /><NewsPortal /></div>
      <div className="pcol"><ClubPortal /><NationPortal /><CompsPortal /></div>
    </div>
  );
  return (
    <div className="wrap portals">
      <div className="pcol">{G.s.wd && <ClockBar />}<DecisionPin /><OffersPin />{wcard}<Hero /><Promises /><LastAnswer /><NewsPortal /><ResultsPortal /></div>
      <div className="pcol"><TablePortal /><CapRaces /><SquadWatch /><BoardPortal /><NationPortal />{CR.nationJob(G) && <CompsPortal />}</div>
    </div>
  );
}
