import '../styles/matchday.css';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { fmtNRR, useNarrow } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { autosave } from '../lib/save.js';
import { simFixture } from '../lib/flow.js';
import * as MD from '../game/matchday.js';

const short = (G, id) => G.teams[id].name.split(' ')[0];

// Plays the rest of the user's match day first, so the round-up covers the whole day.
function useRoundup() {
  const { G, update } = useGame(); const [busy, setBusy] = useState(() => { const sc = MD.roundupScope(G); return !!(sc && sc.pending.length && !(G.s.rd && sc.fu.n === G.s.rd.n && G.s.rd.y === G.year)); });
  useEffect(() => { let live = true; (async () => {
    const sc = MD.roundupScope(G); if (!sc) { setBusy(false); return; }
    if (!(G.s.rd && G.s.rd.n === sc.fu.n && G.s.rd.y === G.year)) for (const f of sc.pending) { if (f.res || G.s.fixtures.find((x) => !x.res) !== f) break; await simFixture(G, f); }
    if (!live) return; MD.buildRoundup(G); autosave(G); setBusy(false); update();
  })(); return () => { live = false; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return busy ? null : MD.buildRoundup(G);
}

function Results({ rd, list }) {
  const { G } = useGame();
  if (list) return <ul className="mlist">{rd.results.map((r) => <li key={r.n} style={{ padding: '10px 0' }}><Link to={`/scorecard/${r.n}`} className="grow" style={{ color: 'inherit', textDecoration: 'none' }}>
    {[r.a, r.b].filter(Boolean).map((x, i) => <span key={i} style={{ display: 'flex', alignItems: 'center', fontWeight: r.me ? 600 : 400 }}><Dot id={x.t} />{x.txt} <span className="faint" style={{ marginLeft: 6, fontWeight: 400 }}>{x.ov}</span></span>)}
    <span className="l2">{r.text} · {r.perf}</span></Link></li>)}</ul>;
  return (
    <div className="tblwrap"><table className="tbl"><tbody>{rd.results.map((r) => (
      <tr key={r.n} className={r.me ? 'me' : ''}>
        <td style={{ width: '46%' }}>{[r.a, r.b].filter(Boolean).map((s, i) => <span key={i} style={{ display: 'flex', alignItems: 'center', fontWeight: i === 0 ? 600 : 400 }}><Dot id={s.t} />{s.txt} <span className="faint" style={{ fontWeight: 400, marginLeft: 6 }}>{s.ov}</span></span>)}</td>
        <td><b>{r.text}</b><br /><span className="mut t-small">{r.perf}</span></td>
        <td className="r"><Link to={`/scorecard/${r.n}`} className="t-small">{T(G, 'Scorecard', 'स्कोरकार्ड')}</Link></td></tr>))}</tbody></table></div>);
}
function Stories({ rd }) {
  return <ul className="inbox">{rd.stories.map((s, i) => <li key={i}><span className="when">{s.when}</span><div><p className="ttl" style={{ fontWeight: i === 0 ? 600 : 400 }}>{s.t}</p><p className="mut t-small">{s.s} {s.to && <Link to={s.to}>Player</Link>}</p></div></li>)}
    {!rd.stories.length && <li className="faint t-small">A quiet day around the league.</li>}</ul>;
}
function Table({ rd }) {
  const { G } = useGame();
  return (
    <table className="tbl compact plain"><tbody>{rd.table.map((r) => (
      <tr key={r.id} className={`${r.id === G.user ? 'me' : ''}${r.pos === 4 ? ' cut' : ''}`}><td style={{ paddingLeft: 0 }}>{r.pos}</td><td><Dot id={r.id} />{short(G, r.id)}</td><td className="r">{r.pts}</td><td className="r faint">{fmtNRR(r.nrr)}</td>
        <td className={`t-small ${r.mv > 0 ? 'up' : r.mv < 0 ? 'down' : 'faint'}`}>{r.mv > 0 ? `↑${r.mv}` : r.mv < 0 ? `↓${-r.mv}` : '–'}</td></tr>))}</tbody></table>);
}
function Totr({ rd }) {
  return <ul className="mlist">{rd.totr.map((p) => <li key={p.name} style={{ padding: '8px 0' }}><span className="grow"><Dot id={p.t} />{p.name}</span><span className="board-f" style={{ fontSize: 17 }}>{p.txt}</span></li>)}</ul>;
}

export default function Roundup() {
  const { G } = useGame(); const nav = useNavigate(); const narrow = useNarrow(); const rd = useRoundup();
  const [tab, setTab] = useTab(['day', 'table', 'league'], 'day');
  if (!MD.lastUserFixture(G)) return <div className="wrap"><h1 className="t-h1">{tn(G, 'Round-up')}</h1><p className="mut" style={{ marginTop: 8 }}>The round-up follows your first match.</p></div>;
  if (!rd) return <div className="wrap"><p className="mut">Finishing the day's other matches…</p></div>;
  const home = <button type="button" className="btn btn-primary" style={narrow ? { flex: '1 1 auto' } : undefined} onClick={() => { const to = G.s.rdNext || '/'; G.s.rdNext = null; nav(to); }}>{T(G, 'Continue', 'अगाडि')}</button>;
  const mean = <div className="panel stack" style={{ gap: 8 }}><h2 className="sec" style={{ margin: 0 }}>What it means for you</h2><p style={{ fontWeight: 600 }}>{rd.mean}</p><p className="mut t-small">{rd.meanSub}</p></div>;
  if (narrow) return (
    <MScreen top={{ title: tn(G, 'Round-up'), sub: '', right: <>{rd.date}</> }} label="Round-up" tabs={[['day', T(G, 'Today', 'आज')], ['table', tn(G, 'Table')], ['league', tn(G, 'League')]]} tab={tab} onTab={setTab} actions={home}>
      {tab === 'day' && <div className="stack" style={{ gap: 16, paddingTop: 14 }}><p className="faint t-small">{rd.label} · {rd.date}</p><h1 className="md-head">{rd.head}</h1><p className="t-small">{rd.radio}</p>{mean}<Results rd={rd} list /></div>}
      {tab === 'table' && <div className="stack" style={{ gap: 16, paddingTop: 14 }}><Table rd={rd} /><p className="mhead">Team of the round</p><Totr rd={rd} /></div>}
      {tab === 'league' && <div style={{ paddingTop: 8 }}><Stories rd={rd} /></div>}
    </MScreen>);
  return (
    <div style={{ maxWidth: 1180 }}>
      <p className="faint t-small">{rd.label} · {rd.date}</p>
      <h1 className="md-head">{rd.head}</h1>
      <div className="md-split" style={{ gap: 44 }}>
        <section className="stack" style={{ gap: 28 }}>
          <div className="stack" style={{ gap: 10 }}><p className="md-radio">{rd.radio}</p><p className="faint t-small">Radio wrap · in-game</p></div>
          <div><h2 className="sec">Results</h2><Results rd={rd} /></div>
          <div><h2 className="sec">Around the league</h2><Stories rd={rd} /></div>
        </section>
        <aside className="stack" style={{ gap: 26 }}>
          {mean}
          <div><h2 className="sec">Table move</h2><Table rd={rd} /></div>
          {rd.totr.length > 0 && <div><h2 className="sec">Team of the round</h2><Totr rd={rd} /></div>}
          <div className="row" style={{ gap: 8 }}>{home}<Link to="/season" className="btn">Full table and fixtures</Link></div>
        </aside>
      </div>
    </div>);
}
