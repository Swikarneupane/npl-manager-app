import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/club.css';
import { useGame } from '../lib/store.jsx';
import { PageHead, Role } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { useNarrow, nn } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { autosave } from '../lib/save.js';
import { ovr, fmtL } from '../game/engine.js';
import { PROVINCES } from '../game/data.js';
import { GRADE, ACADEMY_MAX, ACADEMY_FEE, academy, scoutBudget, sendScout, signToAcademy, keepWatching, shortlistReport, promote, releaseAcademy, academyTalk, scoutNote, roleLabel, potShown, objective, personalTopic, canTalk } from '../game/club.js';

const PROV_NP = { Koshi: 'कोशी', Madhesh: 'मधेश', Bagmati: 'बागमती', Gandaki: 'गण्डकी', Lumbini: 'लुम्बिनी', Karnali: 'कर्णाली', Sudurpaschim: 'सुदूरपश्चिम' };
const Pot = ({ p }) => { const s = potShown(p); const hi = +String(s).split('–').pop(); return <span className={hi >= 80 ? 'gld' : ''}>{s}</span>; };

function Provinces({ G, act, phone }) {
  const C = G.s.club; const home = G.teams[G.user].province; const idle = C.scouts.filter((s) => !s.prov);
  const best = (prov) => { const ps = C.reports.filter((r) => r.prov === prov).map((r) => G.P(r.pid)).filter(Boolean); return ps.sort((a, b) => (b.potHi ?? b.pot) - (a.potHi ?? a.pot))[0]; };
  const rows = PROVINCES.map((prov) => ({ prov, s: C.scouts.find((x) => x.prov === prov), seen: C.seen[prov] || 0, best: best(prov) }));
  const bestTxt = (r) => (!r.best ? 'Not enough seen' : r.best.team ? `${r.best.name} signed by ${G.teams[r.best.team].name.split(' ')[0]}` : null);
  const send = (prov) => idle.length ? <select className="input cl-send" aria-label={`Send a scout to ${prov}`} value="" onChange={(e) => e.target.value && act(() => sendScout(G, e.target.value, prov))}>
    <option value="">{T(G, 'Send scout', 'स्काउट पठाउनुहोस्')}</option>{idle.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.grade}) · {fmtL(GRADE[s.grade].cost)}</option>)}</select> : null;
  if (phone) return <ul className="mlist">{rows.map((r) => (
    <li key={r.prov} className={r.prov === home ? 'cl-me' : ''}><span className="grow"><span style={{ fontWeight: 500 }}>{T(G, r.prov, PROV_NP[r.prov])}{r.prov === home ? ' · home' : ''}</span> <span className="faint t-micro">· {nn(G, r.seen)} reports</span><br />
      <span className="l2">{r.s ? `${r.s.name} (${r.s.grade}) · ${r.s.days} days left` : '—'}{' · '}{bestTxt(r) || <>{r.best.name} · {r.best.role} · <Pot p={r.best} /></>}</span></span>{!r.s && send(r.prov)}</li>))}</ul>;
  return (
    <div className="tblwrap"><table className="tbl compact">
      <thead><tr><th>Province</th><th>Scout</th><th className="r">Reports</th><th>Best find so far</th><th className="r" /></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.prov} className={r.prov === home ? 'me' : ''}><td className="name">{T(G, r.prov, PROV_NP[r.prov])}{r.prov === home ? ' · home' : ''}</td>
          <td className={r.s ? '' : 'faint'}>{r.s ? `${r.s.name} (${r.s.grade} grade) · ${r.s.days} day${r.s.days === 1 ? '' : 's'} left` : '—'}</td><td className="r num">{nn(G, r.seen)}</td>
          <td className={r.best && !r.best.team ? '' : 'mut'}>{bestTxt(r) || <><span style={{ fontWeight: 500 }}>{r.best.name}</span> · {r.best.role} · <Pot p={r.best} /></>}</td>
          <td className="r">{!r.s && send(r.prov)}</td></tr>))}</tbody></table></div>);
}
function Reports({ G, act }) {
  const C = G.s.club; const L = C.reports.slice(0, 8);
  if (!L.length) return <p className="faint t-small">No reports yet. Send a scout to a province; the first report comes within a few days.</p>;
  return <ul className="inbox">{L.map((r) => { const p = G.P(r.pid); if (!p) return null; const gone = !!p.team && p.team !== G.user;
    const fromTxt = r.from[0] === r.from[1] ? r.from[0] : `${r.from[0]}–${r.from[1]}`, toTxt = r.to[0] === r.to[1] ? r.to[0] : `${r.to[0]}–${r.to[1]}`;
    return (
      <li key={r.id} className={r.st === 'new' && !gone ? 'unread' : ''}><span className="when">{r.d}</span><div>
        <p className="ttl">{p.name}, {p.age} · {roleLabel(p)} · {r.prov}{gone ? ` · signed by ${G.teams[p.team].name.split(' ')[0]}` : ''}</p>
        <p className="mut t-small">{gone ? 'We reported him and did not act.' : <>Potential {fromTxt !== toTxt ? <><span className="faint">{fromTxt}</span> → </> : null}<b className={r.to[1] >= 80 ? 'gld' : ''}>{toTxt}</b>. {scoutNote(G, r)} <span className="faint">({r.by}, {r.grade} grade)</span></>}</p>
        {!gone && !p.team && <div className="acts">
          {p.academy ? <span className="blu t-small">In the academy</span> : p.age <= 19 && <button type="button" className="btn btn-sm btn-primary" onClick={() => act(() => signToAcademy(G, p.id))}>{T(G, 'Sign to academy', 'एकेडेमीमा')} · {fmtL(ACADEMY_FEE)}</button>}
          {!p.academy && <button type="button" className="btn btn-sm" disabled={r.st === 'watch'} onClick={() => act(() => keepWatching(G, p.id))}>{r.st === 'watch' ? 'Watching' : 'Keep watching'}</button>}
          {!p.academy && <button type="button" className="btn btn-sm" disabled={!!G.slEntry(p.id)} onClick={() => act(() => shortlistReport(G, p.id))}>{G.slEntry(p.id) ? 'On the shortlist' : 'Add to auction shortlist'}</button>}
        </div>}
      </div></li>); })}</ul>;
}
function Academy({ G, act }) {
  const A = academy(G).sort((a, b) => b.pot - a.pot); const [said, setSaid] = useState(null);
  const room = G.canAdd(G.user, { nat: 'NEP' });
  return (<>
    <div className="cl-kv"><h2 className="sec">{T(G, 'Academy · under-19', 'एकेडेमी · यू-१९')}</h2><span className="faint t-micro">{nn(G, A.length)} of {nn(G, ACADEMY_MAX)} places</span></div>
    {!A.length ? <p className="faint t-small">The academy is empty. Sign teenagers from scout reports.</p> : <ul className="mlist">{A.map((p) => { const topic = personalTopic(p);
      return (<li key={p.id} style={{ padding: '8px 0' }}><span className="grow"><Link to={`/player/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{p.name}, {p.age}</Link> <Role r={p.role} /><br />
        <span className="l2">Rating {ovr(p)} · potential <Pot p={p} />{p.form > 2 ? ` · form ${((p.form + 10) / 2).toFixed(1)}` : ''}{topic === 'homesick' ? ' · homesick' : topic === 'exams' ? ' · exams soon' : ''}{p.age > 19 ? <span className="crim"> · over-age</span> : ''}</span>
        {said && said.pid === p.id ? <><br /><span className="t-small rise" style={{ fontStyle: 'italic' }}>{said.reply}</span></> : null}</span>
        <span className="cl-acts">
          <button type="button" className="btn btn-sm" disabled={!room} title={room ? '' : 'No room in the senior squad'} onClick={() => act(() => promote(G, p.id))}>{T(G, 'Promote', 'बढुवा')}</button>
          <button type="button" className="btn btn-sm btn-ghost" disabled={!canTalk(G, p.id)} onClick={() => act(() => { const e = academyTalk(G, p.id); if (e) setSaid(e); })}>{T(G, 'Talk', 'कुरा')}</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => act(() => releaseAcademy(G, p.id))}>{T(G, 'Release', 'छोड्नुहोस्')}</button>
        </span></li>); })}</ul>}
  </>);
}
function Side({ G }) {
  const C = G.s.club; const a = C.acad; const o = objective(G); const b = scoutBudget(G);
  return (<>
    <div className="panel stack" style={{ gap: 6 }}><h2 className="sec" style={{ margin: 0 }}>{T(G, 'Last academy match', 'पछिल्लो एकेडेमी खेल')}</h2>
      {a ? <><p className="t-small"><b>{a.d}</b> v {G.teams[a.opp].name} under-19 · <span className={a.won ? 'blu' : 'crim'}>{a.won ? 'won' : 'lost'}</span> <span className="num">{a.us} v {a.them}</span></p>
        <p className="t-small mut">{a.stars.map((s) => `${G.P(s.pid).name} ${s.txt}`).join(' · ')}</p></> : <p className="t-small mut">The under-19s play once a week.</p>}
      <p className="faint t-micro">Academy players who score or take wickets grow faster and catch the board's eye. Results are simulated, in-game.</p></div>
    <div className="panel stack" style={{ gap: 6 }}><h2 className="sec" style={{ margin: 0 }}>{T(G, 'Board objective', 'बोर्डको लक्ष्य')}</h2>
      <p className="t-small">{o.need} academy players in the senior squad by the end of Season {o.season} · <span className={o.got >= o.need ? 'blu' : 'mut'}>{o.got} of {o.need}</span></p><p className="faint t-micro">Feeds the board's youth development pillar.</p></div>
    <div className="panel stack" style={{ gap: 6 }}><h2 className="sec" style={{ margin: 0 }}>{T(G, 'Scouting budget', 'स्काउटिङ बजेट')}</h2>
      <p className="t-small num">{fmtL(b.left)} left of {fmtL(b.total)} this season</p><p className="faint t-micro">A scout trip costs Rs 0.6–1.5 L by grade; an academy place {fmtL(ACADEMY_FEE)}. Paid from the club balance.</p></div>
  </>);
}

export default function Scouting() {
  const { G, update, toast } = useGame(); const narrow = useNarrow(); const [tab, setTab] = useTab(['prov', 'reports', 'academy'], 'prov');
  const C = G.s.club; if (!C) return <PageHead title={tn(G, 'Scouting')} />;
  const act = (fn) => update(() => { const err = fn(); if (typeof err === 'string') toast(err); autosave(G); });
  const out = C.scouts.filter((s) => s.prov).length; const fresh = C.reports.filter((r) => r.st === 'new').length;
  const a = C.acad;
  const sub = `${out} scout${out === 1 ? '' : 's'} out · ${fresh} new report${fresh === 1 ? '' : 's'} · academy match every week${a ? ` · last: ${a.won ? 'won' : 'lost'}` : ''}`;
  const hs = G.staffLevel(G.user, 'scout');
  const foot = <p className="faint t-small" style={{ marginTop: 8 }}>Better scouts narrow potential faster{hs ? `; your head scout (level ${hs}) adds to every report` : '; a head scout would add to every report'}. Scouts are generated staff; prospects they find are generated players.</p>;
  if (narrow) return (
    <MScreen top={{ title: tn(G, 'Scouting'), sub: `${out} out` }} pin={<p className="t-small mut">{sub}</p>} label="Scouting" tab={tab} onTab={setTab}
      tabs={[['prov', T(G, 'Provinces', 'प्रदेश')], ['reports', T(G, 'Reports', 'रिपोर्ट'), fresh || null], ['academy', T(G, 'Academy', 'एकेडेमी'), academy(G).length, true]]}>
      {tab === 'prov' && <><Provinces G={G} act={act} phone />{foot}</>}
      {tab === 'reports' && <div style={{ paddingTop: 8 }}><Reports G={G} act={act} /></div>}
      {tab === 'academy' && <div style={{ paddingTop: 12 }} className="stack"><Academy G={G} act={act} /><Side G={G} /></div>}
    </MScreen>);
  return (
    <div style={{ maxWidth: 1220 }}>
      <PageHead title={T(G, 'Scouting and academy', 'स्काउटिङ र एकेडेमी')} sub={sub} />
      <div className="split" style={{ gap: 40, gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)' }}>
        <section className="stack" style={{ gap: 30 }}>
          <div><h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'Provinces', 'प्रदेश')}</h2><Provinces G={G} act={act} />{foot}</div>
          <div><h2 className="t-h3" style={{ marginBottom: 8 }}>{T(G, 'New reports', 'नयाँ रिपोर्ट')}</h2><Reports G={G} act={act} /></div>
        </section>
        <aside className="stack" style={{ gap: 24 }}><div><Academy G={G} act={act} /></div><Side G={G} /></aside>
      </div>
    </div>);
}
