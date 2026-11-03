import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { ovr, fmtL } from '../game/engine.js';
import { COUNTRY_NAMES } from '../game/data.js';
import { autosave } from '../lib/save.js';

// Which of the team's next n matches a player misses (injury, NOC, national duty).
export function missing(p, n = 7) {
  return Array.from({ length: n }, (_, i) => { const k = i + 1; const d = p.duty;
    if (p.inj && k <= p.inj) return 'inj';
    if (p.nocStatus === 'pending' && k <= (p.nocWait || 1)) return 'noc';
    if (d && (d.started ? k <= d.left : k >= d.at && k < d.at + d.len)) return 'duty';
    return null; });
}
const statusLine = (p) => (p.intlStatus === 'active' ? 'active international' : p.intlStatus === 'retired' ? 'retired from internationals' : 'international status not verified');

export default function Overseas() {
  const { G, update, toast } = useGame(); const t = G.teams[G.user]; const [find, setFind] = useState(null);
  const os = t.squad.map((id) => G.P(id)).filter((p) => p.nat !== 'NEP').sort((a, b) => !!a.temp - !!b.temp || ovr(b) - ovr(a));
  const away = os.filter((p) => !p.temp && missing(p).some((x) => x === 'duty' || x === 'noc'));
  const fas = G.osFreeAgents().slice(0, 12);
  return (
    <div className="ospg stack" style={{ gap: 14 }}>
      <div className="sechead" style={{ alignItems: 'center' }}>
        <Link to="/squad" className="t-small row wide" style={{ gap: 4, alignItems: 'center' }}>‹ Squad</Link>
        <span className="t-small faint">{os.filter((p) => !p.temp).length} of 6–8</span>
      </div>
      <h1 className="t-h1">Overseas players</h1>
      <p className="t-small panel" style={{ padding: '10px 14px' }}><b className="blu">League rule:</b> overseas players need a no-objection certificate (NOC) from their home board, and they can be called away for national duty.</p>
      <ul className="oslist">{os.map((p) => { const miss = missing(p); const n = miss.filter(Boolean).length; return (
        <li key={p.id} className="panel">
          <div className="sechead" style={{ margin: 0, alignItems: 'flex-start' }}><span><Link to={`/player/${p.id}`} className="t-small b6" style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link><br /><span className="t-micro faint">{COUNTRY_NAMES[p.nat] || p.nat} · {statusLine(p)}</span></span>
            {p.temp ? <span className="ptag g">Temporary · for {G.P(p.temp.for).name.split(' ').slice(-1)[0]}</span> : <span className={`ptag ${p.nocStatus === 'pending' ? 'g' : 'b'}`}>NOC {p.nocStatus === 'pending' ? 'pending' : 'received'}</span>}</div>
          <div className="sechead" style={{ margin: '8px 0 4px' }}><span className="t-micro mut">Your next 7 matches</span><span className="t-small b6">{n ? `Misses ${n}` : 'All 7'}</span></div>
          <span className="avail" role="img" aria-label={`Available for ${7 - n} of the next 7 matches`}>{miss.map((x, i) => <i key={i} className={x || 'ok'} />)}</span>
          {p.duty && <p className="t-micro crim" style={{ marginTop: 6 }}>In your game: {p.duty.nation} {p.duty.started ? `have him on national duty for ${p.duty.left} more match${p.duty.left > 1 ? 'es' : ''}` : `will call him up for a series after ${p.duty.at - 1 > 0 ? `${p.duty.at - 1} more match${p.duty.at - 1 > 1 ? 'es' : ''}` : 'this match'}`}.</p>}
          {p.nocStatus === 'pending' && <p className="t-micro crim" style={{ marginTop: 6 }}>He can't play until his board's NOC arrives, usually within a match or two.</p>}
        </li>); })}</ul>
      {away.map((p) => { const n = missing(p).filter((x) => x === 'duty' || x === 'noc').length; const can = G.canSignTemp(p.id); return (
        <section key={p.id} className="panel stack" style={{ gap: 8 }}><p className="t-small b6">{p.name} misses {n} match{n > 1 ? 'es' : ''}</p>
          <p className="t-micro mut">You can sign a temporary replacement from the free agents for those matches. His salary doesn't count against your purse while {p.name.split(' ').slice(-1)[0]} is away.</p>
          {can ? <button type="button" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setFind(find === p.id ? null : p.id)}>{find === p.id ? 'Close' : 'Find a replacement'}</button> : <p className="t-micro faint">Replacement signed.</p>}
          {find === p.id && <ul className="olist">{fas.map((f) => <li key={f.id}><span><span className="t-small b6">{f.name}</span><br /><span className="t-micro faint">{f.role} · {COUNTRY_NAMES[f.nat] || f.nat} · {ovr(f)} · value {fmtL(f.value)}</span></span><span />
            <button type="button" className="btn btn-sm" onClick={() => update(() => { const e = G.signTemp(f.id, p.id); if (e) toast(e); else { toast(`${f.name} signed as a temporary replacement.`); autosave(G); setFind(null); } })}>Sign</button></li>)}
            {!fas.length && <li className="t-small faint">No overseas free agents available.</li>}</ul>}
        </section>); })}
      <p className="t-micro faint">International status comes from public sources where we could verify it; national duty and NOC delays are simulated in your game.</p>
    </div>
  );
}
