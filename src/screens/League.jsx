import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { Dot } from '../components/bits.jsx';
import { managerOf, STYLES, secLabel, relLabel, rivalries, heatLabel, weekGames } from '../game/living.js';
import { useNarrow, tshort } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import MScreen, { useTab } from '../components/MScreen.jsx';
import '../styles/living.css';

const lately = (G, tid) => { const f = G.teams[tid].form || []; if (!f.length) return 'No games yet'; let n = 0; const last = f[f.length - 1]; for (let i = f.length - 1; i >= 0 && f[i] === last; i--) n++; return last === 'W' ? (n > 1 ? `Won ${n} in a row` : 'Won last time') : last === 'L' ? (n > 1 ? `Lost ${n} in a row` : 'Lost last time') : 'No result last time'; };
const Gauge = ({ pct, cls, label, w, stack }) => <div className={`gauge ${cls || ''}${stack ? ' lv-gst' : ''}`} style={w ? { width: w, flex: '0 0 auto' } : undefined}><div className="meter"><i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>{label}</div>;
const secCls = (m) => (m.care || m.sec < 40 ? 'low' : m.sec >= 75 ? 'high' : '');

function Managers({ G, narrow }) {
  const ids = Object.keys(G.teams).filter((t) => t !== G.user);
  if (narrow) return (
    <ul className="mlist">{ids.map((tid) => { const m = managerOf(G, tid); if (!m) return null; const r = relLabel(G, tid);
      return <li key={tid} style={{ alignItems: 'flex-start' }}><span className="grow"><Dot id={tid} /><b style={{ fontWeight: 600 }}>{tshort(G, tid)}</b> · {m.care ? `Interim: ${m.name}` : m.name}<br /><span className="l2">{STYLES[m.style].label} · <span className={r.c}>{r.t}</span> · {lately(G, tid)}</span></span><Gauge pct={m.care ? 20 : m.sec} cls={secCls(m)} label={secLabel(m)} w={96} stack /></li>; })}</ul>);
  return (
    <div className="tblwrap"><table className="tbl lv-mgr"><thead><tr><th>Club</th><th>Manager</th><th>Style</th><th style={{ width: 170 }}>Job security</th><th>With you</th><th>Lately</th></tr></thead>
      <tbody>{ids.map((tid) => { const m = managerOf(G, tid); if (!m) return null; const r = relLabel(G, tid);
        return <tr key={tid}><td className="name"><Dot id={tid} />{tshort(G, tid)}</td><td>{m.care ? `Interim: ${m.name}` : m.name}<br /><span className="t-micro faint">since {m.since}</span></td><td className="t-small">{STYLES[m.style].label}</td><td><Gauge pct={m.care ? 20 : m.sec} cls={secCls(m)} label={secLabel(m)} /></td><td className={`t-small ${r.c}`}>{r.t}<br /><span className="t-micro faint">respect {Math.round((G.s.rel[tid] || { respect: 50 }).respect)}</span></td><td className="mut t-small">{lately(G, tid)}</td></tr>; })}</tbody></table></div>);
}
function Wire({ G }) {
  const W = G.s.living.wire.slice(0, 14);
  if (!W.length) return <p className="t-small faint">Quiet so far. Sackings, press spats, transfer interest and record chases appear here.</p>;
  return <ul className="inbox">{W.map((w, i) => <li key={i} className={w.y === G.year && i < 3 ? 'unread' : ''}><span className="when">{w.y === G.year ? w.d : w.y}</span><div><p className="ttl">{w.t}</p>{w.sub && <p className="mut t-small">{w.sub}</p>}</div></li>)}</ul>;
}
function Rivals({ G }) {
  const R = rivalries(G);
  return (<>
    {R.length ? <ul className="mlist">{R.map((r) => <li key={r.tid}><span className="grow"><Dot id={r.tid} />{G.teams[r.tid].name}<br /><span className="l2">{r.why[0] ? r.why[0].t : 'History between the clubs'}{r.why[1] ? ` · ${r.why[1].t}` : ''}</span></span><Gauge pct={r.heat} cls={r.heat >= 60 ? 'low' : ''} label={heatLabel(r.heat)} w={110} stack /></li>)}</ul>
      : <p className="t-small faint">No rivalries yet. Finals, press spats and transfers build them.</p>}
    <p className="faint t-micro" style={{ marginTop: 6 }}>Rivalry games (heat 50+) bring bigger crowds, more pressure and louder headlines.</p>
  </>);
}
function Week({ G, update, toast }) {
  const list = weekGames(G); const A = G.s.living.alerts;
  if (!list.length) return <p className="t-small faint">No other games scheduled.</p>;
  const toggle = (n) => update(() => { if (A[n]) delete A[n]; else A[n] = true; autosave(G); });
  return (<>
    <ul className="mlist">{list.map(({ f, notes }) => <li key={f.n}><span className="grow t-small">{f.date} · <Dot id={f.home} />{tshort(G, f.home)} v <Dot id={f.away} />{tshort(G, f.away)}{notes.length > 0 && <span className="faint"> · {notes.join(', ')}</span>}</span>
      <button type="button" className={`btn btn-sm${A[f.n] ? ' btn-blue' : ''}`} aria-pressed={!!A[f.n]} onClick={() => toggle(f.n)}>{A[f.n] ? 'Alert on' : 'Alert'}</button></li>)}</ul>
    <button type="button" className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => { update(() => { for (const { f } of list) A[f.n] = true; autosave(G); }); toast('You will get the result of each game in your inbox.'); }}>Set alerts for these games</button>
  </>);
}

export default function League() {
  const { G, update, toast } = useGame(); const narrow = useNarrow();
  const [tab, setTab] = useTab(['managers', 'wire', 'rivals', 'week'], 'managers');
  if (narrow) return (
    <MScreen top={{ title: tn(G, 'League hub'), sub: '' }} tabs={[['managers', T(G, 'Managers', 'प्रशिक्षक')], ['wire', T(G, 'Wire', 'समाचार')], ['rivals', tn(G, 'Rivals')], ['week', T(G, 'This week', 'यो हप्ता')]]} tab={tab} onTab={setTab} label="League hub">
      <div style={{ paddingTop: 8 }}>
        {tab === 'managers' && <><Managers G={G} narrow /><p className="faint t-micro" style={{ marginTop: 8 }}>Rival managers are generated characters.</p></>}
        {tab === 'wire' && <Wire G={G} />}
        {tab === 'rivals' && <Rivals G={G} />}
        {tab === 'week' && <Week G={G} update={update} toast={toast} />}
      </div>
    </MScreen>);
  return (
    <div className="lv-wrap">
      <div className="pagehead"><div className="stack" style={{ gap: 4 }}><h1 className="t-h1">{tn(G, 'League hub')}</h1><p className="mut">The other seven clubs, their managers and what is brewing · rival managers are generated characters</p></div><Link to="/season" className="t-small">Table and fixtures</Link></div>
      <section><h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'Rival managers', 'प्रतिद्वन्द्वी प्रशिक्षक')}</h2><Managers G={G} /></section>
      <div className="lv-split" style={{ marginTop: 32, gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
        <section><h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'News wire', 'समाचार')}</h2><Wire G={G} /></section>
        <aside className="lv-side">
          <div><h2 className="sec">{T(G, 'Your rivalries', 'तपाईंका प्रतिद्वन्द्वी')}</h2><Rivals G={G} /></div>
          <div className="panel stack" style={{ gap: 6 }}><h2 className="sec" style={{ margin: 0 }}>{T(G, 'Other games this week', 'यस हप्ताका अन्य खेल')}</h2><Week G={G} update={update} toast={toast} /></div>
        </aside>
      </div>
    </div>
  );
}
