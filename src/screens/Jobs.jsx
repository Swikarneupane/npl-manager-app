// Jobs: the ones you hold (one club, one nation at most), offers on the table, national boards you can
// apply to, and the jobs you have had.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { Dot, Meter } from '../components/bits.jsx';
import { NDot } from '../components/NationBits.jsx';
import { useNarrow, boardMood } from '../lib/util.js';
import { autosave } from '../lib/save.js';
import * as CR from '../world/career.js';
import * as ST from '../world/state.js';
import LevelPicker from '../components/LevelPicker.jsx';
import { short, yearOf } from '../world/dates.js';
import '../styles/career.css';

const HOW = { resigned: 'Resigned', sacked: 'Dismissed', left: 'Left for another job' };

function Current() {
  const { G, update, toast } = useGame(); const [ask, setAsk] = useState(null);
  const c = CR.clubJob(G), n = CR.nationJob(G); const ab = c && CR.abroadJob(G) === c; const t = c && !ab && G.teams[c.team];
  const leave = (kind) => update(() => { const e = CR.resign(G, kind); if (e) toast(e); else { autosave(G); toast(kind === 'club' ? 'The club carries on under a caretaker.' : 'The board will appoint a successor.'); } setAsk(null); });
  const only = CR.jobs(G).length === 1;
  const Resign = ({ kind, name }) => (ask === kind
    ? <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><button type="button" className="btn btn-sm btn-primary" onClick={() => leave(kind)}>Leave {name}</button><button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsk(null)}>Stay</button>{only && <span className="t-micro crim">You will have no job until an offer comes.</span>}</div>
    : <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setAsk(kind)}>Resign</button>);
  return (
    <div className="cr-jobs">
      {ab ? <section className="panel cr-job"><p className="t-micro faint">Club · {c.comp} · since {c.since}</p><p className="t-h3">{CR.nationName(G, c.team)}</p>
        <p className="t-small">Record P{c.rec.p} W{c.rec.w} L{c.rec.l}</p><div className="sechead" style={{ margin: 0 }}><span className="t-small mut">Board confidence</span><span className="t-small num">{c.board} · {boardMood(c.board)}</span></div><Meter pct={c.board} blue />
        {c.obj.length ? <ul className="mlist">{c.obj.map((o) => <li key={o.sid} style={{ minHeight: 36, padding: '6px 0' }}><Link to={`/comp/${o.sid}`} className="grow t-small">{o.t}</Link><span className={`t-micro b6 ${o.done === true ? 'blu' : o.done === false ? 'crim' : 'faint'}`}>{o.done === true ? 'Met' : o.done === false ? 'Missed' : 'Open'}</span></li>)}</ul> : null}
        <div className="row" style={{ gap: 8 }}><Link to="/clubabroad" className="btn btn-sm">Club</Link><Resign kind="club" name={CR.nationName(G, c.team)} /></div></section>
        : c ? <section className="panel cr-job"><p className="t-micro faint">Club · NPL · since {c.since}</p><p className="t-h3" style={{ display: 'flex', alignItems: 'center' }}><Dot id={c.team} />{t.name}</p>
        <p className="t-small">{(t.objective || {}).txt || 'No objective set'}</p>
        <div className="sechead" style={{ margin: 0 }}><span className="t-small mut">Board confidence</span><span className="t-small num">{t.board} · {boardMood(t.board)}</span></div><Meter pct={t.board} blue />
        <Link to="/club" className="t-small">Club and board</Link><Resign kind="club" name={t.name} /></section>
        : <section className="panel cr-job"><p className="t-micro faint">Club</p><p className="t-h3">No club</p><p className="t-small mut">The NPL runs without you; {G.teams[G.user].name} is an AI side. Clubs call when your reputation is 40 or more.</p></section>}
      {n ? <section className="panel cr-job"><p className="t-micro faint">National team · since {n.sinceDay != null ? `${short(n.sinceDay)} ${yearOf(n.sinceDay)}` : n.since}</p><p className="t-h3" style={{ display: 'flex', alignItems: 'center' }}><NDot id={n.team} big />{CR.nationName(G, n.team)}</p>
        <p className="t-small">Record P{n.rec.p} W{n.rec.w} L{n.rec.l}</p>
        <div className="sechead" style={{ margin: 0 }}><span className="t-small mut">Board confidence</span><span className="t-small num">{n.board} · {boardMood(n.board)}</span></div><Meter pct={n.board} blue />
        {n.obj.length ? <ul className="mlist">{n.obj.map((o) => <li key={o.sid} style={{ minHeight: 36, padding: '6px 0' }}><Link to={`/comp/${o.sid}`} className="grow t-small">{o.t}</Link><span className={`t-micro b6 ${o.done === true ? 'blu' : o.done === false ? 'crim' : 'faint'}`}>{o.done === true ? 'Met' : o.done === false ? 'Missed' : 'Open'}</span></li>)}</ul> : <p className="t-small faint">No competitions this year yet.</p>}
        <p className="t-micro faint">A missed objective with confidence under {CR.sackLine(G)} ends the job.</p>
        <div className="row" style={{ gap: 8 }}><Link to="/nation" className="btn btn-sm">Squad</Link><Resign kind="nation" name={CR.nationName(G, n.team)} /></div></section>
        : <section className="panel cr-job"><p className="t-micro faint">National team</p><p className="t-h3">No national team</p><p className="t-small mut">Apply below, or wait for a board to call.</p></section>}
    </div>
  );
}
function Levels() {
  const { G, update } = useGame();
  return <section className="panel" style={{ padding: 14, marginTop: 12 }}><LevelPicker levels={G.s.wd.levels} onChange={(g, v) => update(() => { ST.setLevel(G, g, v); autosave(G); })} /></section>;
}
function Offers() {
  const { G, update, toast } = useGame(); const list = G.s.wd.offers;
  const take = (o) => update(() => { const cur = o.kind === 'club' ? CR.clubJob(G) : CR.nationJob(G); const e = CR.accept(G, o.id, { replace: !!cur }); if (e) toast(e); else { autosave(G); toast(`You are now with ${CR.nationName(G, o.team)}.`); } });
  if (!list.length) return <p className="t-small faint">No offers right now. Boards look again every few months, more often when your reputation grows.</p>;
  return <ul className="mlist">{list.map((o) => { const cur = o.kind === 'club' ? CR.clubJob(G) : CR.nationJob(G); return (
    <li key={o.id} style={{ flexWrap: 'wrap', gap: 8 }}><span className="grow">{o.kind === 'club' ? (o.comp && o.comp !== 'NPL' ? null : <Dot id={o.team} />) : <NDot id={o.team} />}<b>{CR.nationName(G, o.team)}</b> · {o.kind === 'club' ? `${o.comp && o.comp !== 'NPL' ? o.comp : 'NPL'} head coach` : 'national team'}<br /><span className="l2">{o.applied ? 'After your application' : 'They called you'} · open until {short(o.until)}{cur ? ` · you would leave ${CR.nationName(G, cur.team)}` : ''}</span></span>
      <span className="row" style={{ gap: 6 }}><button type="button" className="btn btn-sm btn-primary" onClick={() => take(o)}>Accept</button><button type="button" className="btn btn-sm btn-ghost" onClick={() => update(() => { CR.decline(G, o.id); autosave(G); })}>Decline</button></span></li>); })}</ul>;
}
function Apply() {
  const { G, update, toast } = useGame(); const [all, setAll] = useState(false); const r = G.s.manager.rep; const me = CR.userNation(G);
  const list = Object.keys(CR.MEMBER).filter((c) => c !== me).map((c) => ({ c, need: CR.needRep(G, c) })).sort((a, b) => a.need - b.need || CR.NATION_NAME[a.c].localeCompare(CR.NATION_NAME[b.c]));
  const shown = all ? list : list.filter((x) => x.need <= r + 10).slice(0, 14);
  const go = (c) => update(() => { const res = CR.apply(G, c); autosave(G); toast(res.text); });
  return (
    <>
      <ul className="mlist">{shown.map(({ c, need }) => { const ok = r >= need; const last = G.s.wd.cr.apps[c]; const wait = last != null && G.s.wd.day - last < 60; return (
        <li key={c}><span className="grow"><NDot id={c} />{CR.NATION_NAME[c]}<span className="cr-pill">{CR.MEMBER[c] === 'full' ? 'Test nation' : 'Associate'}</span><br /><span className={`l2 ${ok ? '' : 'faint'}`}>Looks for about {need}{c === 'NEP' && need < 50 ? ' (your NPL record counts)' : ''}{wait ? ` · applied ${short(last)}` : ''}</span></span>
          <button type="button" className={`btn btn-sm${ok ? '' : ' btn-ghost'}`} disabled={wait || r < need - 8} onClick={() => go(c)}>Apply</button></li>); })}</ul>
      {!all && list.length > shown.length && <button type="button" className="linkbtn t-small" onClick={() => setAll(true)}>Show all {list.length} nations</button>}
      <p className="t-micro faint" style={{ marginTop: 6 }}>Your reputation is {Math.round(r)}. A board says yes most of the time when you meet its level, sometimes when you are close.</p>
    </>
  );
}
export function JobHistory({ compact }) {
  const { G } = useGame(); const H = (G.s.wd && G.s.wd.jobHist) || []; const cur = CR.jobs(G);
  const rows = [...cur.map((j) => ({ ...j, cur: true })), ...H.slice().reverse()];
  if (!rows.length) return <p className="t-small faint">No jobs yet.</p>;
  return (
    <ul className="mlist">{rows.slice(0, compact ? 6 : 50).map((j, i) => (
      <li key={i}><span className="grow">{j.kind === 'club' && (!j.comp || j.comp === 'NPL') ? <Dot id={j.team} /> : j.kind === 'club' ? null : <NDot id={j.team} />}{CR.nationName(G, j.team)} <span className="faint t-small">· {j.kind === 'club' ? `${j.comp && j.comp !== 'NPL' ? j.comp : 'NPL'} club` : 'national team'}</span><br />
        <span className="l2">{j.since ?? j.from}{j.cur ? ' to now' : ` to ${j.to}`}{j.rec && j.rec.p != null ? ` · P${j.rec.p} W${j.rec.w} L${j.rec.l}` : ''}</span></span>
        <span className={`t-small ${j.cur ? 'blu' : j.how === 'sacked' ? 'crim' : 'faint'}`}>{j.cur ? 'Current' : HOW[j.how] || j.how}</span></li>))}</ul>
  );
}

export default function Jobs() {
  const { G } = useGame(); const narrow = useNarrow(); const [tab, setTab] = useTab(['now', 'offers', 'apply', 'past'], 'now');
  if (!G.s.wd) return <p className="mut">Jobs start with the world.</p>;
  CR.ensure(G); const n = G.s.wd.offers.length; const r = Math.round(G.s.manager.rep);
  if (narrow) return (
    <MScreen top={{ title: 'Jobs', sub: `Reputation ${r}` }} tabs={[['now', 'Your jobs'], ['offers', 'Offers', n], ['apply', 'Apply'], ['past', 'History']]} tab={tab} onTab={setTab} label="Jobs">
      <div style={{ paddingTop: 12 }}>{tab === 'now' && <><Current /><Levels /></>}{tab === 'offers' && <Offers />}{tab === 'apply' && <Apply />}{tab === 'past' && <JobHistory />}</div>
    </MScreen>);
  return (
    <div className="wrap" style={{ maxWidth: 1180 }}>
      <div className="cr-head"><div><h1 className="t-h1">Jobs</h1><p className="mut t-small">One club and one national team at most. Reputation {r}: associates look for about {CR.REP.associate}, Test nations about {CR.REP.full}.</p></div><Link to="/career" className="t-small">Career</Link></div>
      <Current />
      <Levels />
      <div className="cr-split" style={{ marginTop: 28 }}>
        <section><h2 className="t-h3" style={{ marginBottom: 8 }}>Offers{n ? ` · ${n}` : ''}</h2><Offers /><h2 className="t-h3" style={{ margin: '24px 0 8px' }}>Apply to a national board</h2><Apply /></section>
        <aside><h2 className="t-h3" style={{ marginBottom: 8 }}>Your jobs so far</h2><JobHistory /></aside>
      </div>
    </div>
  );
}
