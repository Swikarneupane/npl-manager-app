import { useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { PageHead, Role } from '../components/bits.jsx';
import { ovr, fmtL } from '../game/engine.js';
import { SLABS, DOM_CAP, OS_CAP } from '../game/game.js';
import { autosave } from '../lib/save.js';

export default function Retention() {
  const { G, update, ui } = useGame(); const nav = useNavigate(); const s = G.s, t = G.teams[G.user];
  if (s.phase !== 'retention') return <p className="mut">Retention is not open right now.</p>;
  const sq = t.squad.map((id) => G.P(id)).sort((a, b) => ovr(b) - ovr(a));
  const confirm = () => { update(() => { G.applyRetention(); G.setupAuction(); autosave(G); ui.auc = null; }); nav('/auction'); };
  if (s.mega) {
    const sel = t.retainSel; const osSel = sel.filter((id) => G.P(id).nat !== 'NEP').length;
    const domAfter = DOM_CAP - sel.reduce((a, id, i) => a + (G.P(id).nat === 'NEP' ? SLABS.NEP[i] : 0), 0);
    const osAfter = OS_CAP - sel.reduce((a, id, i) => a + (G.P(id).nat !== 'NEP' ? SLABS.OS[i] : 0), 0);
    const toggle = (id, on) => update(() => { t.retainSel = on ? [...t.retainSel.filter((x) => x !== id), id] : t.retainSel.filter((x) => x !== id); });
    return (
      <div style={{ maxWidth: 1220 }}>
        <PageHead title="Retention before the mega auction" sub={`Keep up to ${s.settings.retain} players. Each retention costs its slab price from the purse. Every unused slot becomes a Right to Match card for the auction.`}><button className="btn btn-primary btn-lg" onClick={confirm}>Confirm and go to auction</button></PageHead>
        <div className="split">
          <div className="tblwrap"><table className="tbl compact"><thead><tr><th>Keep</th><th>Player</th><th>Nat</th><th className="r">Age</th><th>Role</th><th className="r">Rating</th><th className="r">Value</th><th>Slab</th></tr></thead>
            <tbody>{sq.map((p) => { const i = sel.indexOf(p.id); const dis = i < 0 && (sel.length >= s.settings.retain || (p.nat !== 'NEP' && osSel >= 1)); return (
              <tr key={p.id} className={i >= 0 ? 'me' : ''}><td><input type="checkbox" checked={i >= 0} disabled={dis} onChange={(e) => toggle(p.id, e.target.checked)} aria-label={`Retain ${p.name}`} /></td><td className="name">{p.name}</td><td>{p.nat}</td><td className="r">{p.age}</td><td><Role r={p.role} /></td><td className="r">{ovr(p)}</td><td className="r">{fmtL(p.value)}</td>
                <td>{i >= 0 ? `Slab ${i + 1} · ${fmtL(p.nat === 'NEP' ? SLABS.NEP[i] : SLABS.OS[i])}` : <span className="faint">—</span>}</td></tr>); })}</tbody></table></div>
          <aside className="stack" style={{ gap: 20 }}>
            <div className="panel"><h2 className="sec">Slab costs</h2><table className="tbl plain compact"><tbody>{[0, 1, 2].map((i) => <tr key={i}><td style={{ paddingLeft: 0 }}>Slab {i + 1}{i === 0 ? ' · first retention' : ''}</td><td className="r">{fmtL(SLABS.NEP[i])} Nepali</td><td className="r faint">{fmtL(SLABS.OS[i])} overseas</td></tr>)}</tbody></table><p className="faint t-small" style={{ marginTop: 6 }}>At most one overseas retention. Overseas slabs come out of the overseas purse.</p></div>
            <div className="panel"><h2 className="sec">After retention</h2><table className="tbl plain compact"><tbody><tr><td style={{ paddingLeft: 0 }}>Retained</td><td className="r">{sel.length} of {s.settings.retain}</td></tr><tr><td style={{ paddingLeft: 0 }}>RTM cards</td><td className="r">{s.settings.retain - sel.length}</td></tr><tr><td style={{ paddingLeft: 0 }}>Domestic purse</td><td className="r">{fmtL(domAfter)}</td></tr><tr><td style={{ paddingLeft: 0 }}>Overseas purse</td><td className="r">{fmtL(osAfter)}</td></tr></tbody></table></div>
          </aside>
        </div>
      </div>);
  }
  const rel = t.releaseSel; const freed = rel.reduce((a, id) => a + G.P(id).salary, 0);
  const toggle = (id, on) => update(() => { t.releaseSel = on ? [...t.releaseSel.filter((x) => x !== id), id] : t.releaseSel.filter((x) => x !== id); });
  return (
    <div style={{ maxWidth: 1220 }}>
      <PageHead title="Release players before the mini auction" sub="Everyone not released stays on their contract. Released salaries go back into the purse."><button className="btn btn-primary btn-lg" onClick={confirm}>Confirm releases</button></PageHead>
      <div className="tblwrap"><table className="tbl compact"><thead><tr><th>Release</th><th>Player</th><th>Nat</th><th className="r">Age</th><th>Role</th><th className="r">Rating</th><th className="r">Salary</th><th className="r">Value</th></tr></thead>
        <tbody>{sq.map((p) => <tr key={p.id} className={rel.includes(p.id) ? 'dim' : ''}><td><input type="checkbox" checked={rel.includes(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} aria-label={`Release ${p.name}`} /></td><td className="name">{p.name}</td><td>{p.nat}</td><td className="r">{p.age}</td><td><Role r={p.role} /></td><td className="r">{ovr(p)}</td><td className="r">{fmtL(p.salary)}</td><td className="r">{fmtL(p.value)}</td></tr>)}</tbody></table></div>
      <p className="mut t-small" style={{ marginTop: 10 }}>Releasing {rel.length} frees {fmtL(freed)}. Purses now: domestic {fmtL(t.purse)}, overseas {fmtL(t.osPurse)}.</p>
    </div>);
}
