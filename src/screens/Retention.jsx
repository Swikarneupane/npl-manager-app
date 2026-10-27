import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { PageHead, Role } from '../components/bits.jsx';
import { ovr, fmtL } from '../game/engine.js';
import { SLABS, DOM_CAP, OS_CAP } from '../game/game.js';
import { autosave } from '../lib/save.js';
import { OFF_STEPS } from './Offseason.jsx';

export default function Retention() {
  const { G, update, ui } = useGame(); const nav = useNavigate(); const s = G.s, t = G.teams[G.user]; const [all, setAll] = useState(false); const steps = OFF_STEPS.length;
  if (s.phase !== 'retention') return <p className="mut">Retention is not open right now.</p>;
  const sq = t.squad.map((id) => G.P(id)).sort((a, b) => ovr(b) - ovr(a));
  const confirm = () => { update(() => { G.applyRetention(); G.setupAuction(); autosave(G); ui.auc = null; }); nav('/auction'); };
  if (s.mega) {
    const sel = t.retainSel; const osSel = sel.filter((id) => G.P(id).nat !== 'NEP').length; const max = s.settings.retain;
    const slab = (p, i) => (p.nat === 'NEP' ? SLABS.NEP[i] : SLABS.OS[i]);
    const domAfter = DOM_CAP - sel.reduce((a, id, i) => a + (G.P(id).nat === 'NEP' ? SLABS.NEP[i] : 0), 0);
    const osAfter = OS_CAP - sel.reduce((a, id, i) => a + (G.P(id).nat !== 'NEP' ? SLABS.OS[i] : 0), 0);
    const keep = (id) => update(() => { t.retainSel = [...t.retainSel.filter((x) => x !== id), id]; });
    const drop = (id) => update(() => { t.retainSel = t.retainSel.filter((x) => x !== id); });
    // worth keeping: likely auction price minus what the next slot costs
    const lp = (p) => { const [a, b] = G.likelyPrice(p); return Math.round((a + b) / 2); };
    const cands = sq.filter((p) => !sel.includes(p.id)).map((p) => ({ p, gain: lp(p) - slab(p, Math.min(sel.length, max - 1)) })).sort((a, b) => b.gain - a.gain);
    const shown = all ? cands : cands.slice(0, 5);
    return (
      <div className="retpg stack" style={{ gap: 14 }}>
        <div className="sechead" style={{ alignItems: 'center' }}><div><h1 className="t-h1">Retention</h1><p className="t-micro faint">Before the {G.year} mega auction</p></div><span className="ptag c">Step {steps} of {steps}</span></div>
        <p className="t-small mut">Keep up to {max} players. Everyone else goes into the auction. Each slot you leave empty becomes a Right to Match card.</p>
        <ol className="slots">{Array.from({ length: max }, (_, i) => { const id = sel[i]; const p = id && G.P(id); return (
          <li key={i} className={`panel${p ? ' on' : ''}`}><span className="board-f slot-n">{i + 1}</span>
            {p ? <><span><span className="t-small b6">{p.name}</span><br /><span className="t-micro faint">{p.role} · {p.age} · {ovr(p)}{p.nat !== 'NEP' ? ' · overseas' : ''} · costs {fmtL(slab(p, i))}</span></span><button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove ${p.name}`} onClick={() => drop(p.id)}>Remove</button></>
              : <span><span className="t-small b6 faint">Empty slot</span><br /><span className="t-micro faint">Pick a player below, or keep it as a Right to Match card</span></span>}</li>); })}</ol>
        <section><div className="sechead"><h2 className="t-h3">Worth keeping</h2><button type="button" className="linkbtn t-small" onClick={() => setAll(!all)}>{all ? 'Best five' : 'Whole squad'}</button></div>
          <ul className="olist">{shown.map(({ p }) => { const i = Math.min(sel.length, max - 1); const full = sel.length >= max; const osBlock = p.nat !== 'NEP' && osSel >= 1; const price = lp(p); return (
            <li key={p.id}><span><Link to={`/player/${p.id}`} className="t-small b6" style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link><br /><span className="t-micro faint">{p.role} · {p.age} · {ovr(p)}{p.nat !== 'NEP' ? ' · overseas' : ''}</span><br /><span className="t-micro blu">Likely price at auction {fmtL(price)}{p.nat !== 'NEP' ? ' · max 1 overseas' : ''}</span></span>
              <button type="button" className="btn btn-sm" disabled={full || osBlock} title={full ? 'All slots are used' : osBlock ? 'Only one overseas retention' : ''} onClick={() => keep(p.id)}>Keep · {fmtL(slab(p, i))}{p.nat !== 'NEP' ? ' OS' : ''}</button></li>); })}</ul>
          <p className="t-micro faint" style={{ marginTop: 6 }}>Slabs: {SLABS.NEP.map((x) => fmtL(x)).join(' / ')} Nepali, {SLABS.OS.map((x) => fmtL(x)).join(' / ')} overseas, by slot.</p></section>
        <div className="stepbar ret-bar"><div className="three"><div><p className="t-micro faint">Domestic purse</p><p className="t-small b6">{fmtL(domAfter)}</p></div><div><p className="t-micro faint">Overseas purse</p><p className="t-small b6">{fmtL(osAfter)}</p></div><div><p className="t-micro faint">RTM cards</p><p className="t-small b6">{max - sel.length}</p></div></div>
          <button type="button" className="btn btn-primary b6" onClick={confirm}>Confirm and scout the auction</button></div>
      </div>);
  }
  const rel = t.releaseSel; const freed = rel.reduce((a, id) => a + G.P(id).salary, 0);
  const toggle = (id, on) => update(() => { t.releaseSel = on ? [...t.releaseSel.filter((x) => x !== id), id] : t.releaseSel.filter((x) => x !== id); });
  return (
    <div style={{ maxWidth: 1220 }}>
      <PageHead title="Releases" sub={`Before the ${G.year} mini auction. Everyone not released stays on their contract. Released salaries go back into the purse.`}><div className="row" style={{ gap: 8, alignItems: 'center' }}><span className="ptag c">Step {steps} of {steps}</span><button className="btn btn-primary btn-lg" onClick={confirm}>Confirm and scout the auction</button></div></PageHead>
      <div className="tblwrap"><table className="tbl compact"><thead><tr><th>Release</th><th>Player</th><th>Nat</th><th className="r">Age</th><th>Role</th><th className="r">Rating</th><th className="r">Salary</th><th className="r">Value</th></tr></thead>
        <tbody>{sq.map((p) => <tr key={p.id} className={rel.includes(p.id) ? 'dim' : ''}><td><input type="checkbox" checked={rel.includes(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} aria-label={`Release ${p.name}`} /></td><td className="name">{p.name}</td><td>{p.nat}</td><td className="r">{p.age}</td><td><Role r={p.role} /></td><td className="r">{ovr(p)}</td><td className="r">{fmtL(p.salary)}</td><td className="r">{fmtL(p.value)}</td></tr>)}</tbody></table></div>
      <p className="mut t-small" style={{ marginTop: 10 }}>Releasing {rel.length} frees {fmtL(freed)}. Purses now: domestic {fmtL(t.purse)}, overseas {fmtL(t.osPurse)}.</p>
    </div>);
}
