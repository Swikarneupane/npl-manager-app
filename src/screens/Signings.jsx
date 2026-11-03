import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { PageHead, Role } from '../components/bits.jsx';
import { R, ovr, fmtL } from '../game/engine.js';
import { hash, potRange, seasonNo } from '../lib/util.js';
import { autosave } from '../lib/save.js';
import { completeSquad, startSeason } from '../lib/flow.js';

export const interest = (G, p) => { const h = hash(p.id + G.year) % 10; const fans = G.teams[G.user].fans; return h < 3 + (fans > 65 ? 2 : 0) ? 'Keen' : h < 8 ? 'Open' : 'Reluctant'; };

export default function Signings() {
  const { G, ui, update, toast } = useGame(); const nav = useNavigate(); const t = G.teams[G.user];
  const os = G.osCount(G.user); const fa = G.osFreeAgents().slice(0, 40); const open = G.s.phase === 'preseason';
  const canStart = os >= 6 || !fa.some((p) => p.value <= t.osPurse);
  const mine = t.squad.map((id) => G.P(id)).filter((p) => p.nat !== 'NEP');
  const dom = Object.values(G.players).filter((p) => !p.team && !p.retired && !p.academy && p.nat === 'NEP').sort((a, b) => ovr(b) - ovr(a)).slice(0, 15);
  const offer = (p) => {
    const amt = ui.offers[p.id] ?? p.value;
    if (!G.canAdd(G.user, p)) return toast('No room: squads hold at most 22 players and 8 overseas.');
    if (amt > t.osPurse) return toast(`You only have ${fmtL(t.osPurse)} in the overseas purse.`);
    const it = interest(G, p); const need = it === 'Keen' ? 0.85 : it === 'Open' ? 0.95 : 1.15; const ratio = amt / p.value;
    update(() => {
      if (ratio >= need || (ratio >= need - 0.08 && R() < 0.4)) { G.signPlayer(p, G.user, Math.round(amt * 2) / 2); G.news(`${p.name} signs for ${t.name} for ${fmtL(amt)}.`, 'league'); toast(`${p.name} signed.`); autosave(G); }
      else { p.refusedBy = G.user; toast(`${p.name} turned down ${fmtL(amt)}.`); }
    });
  };
  return (
    <div style={{ maxWidth: 1220 }}>
      <PageHead title="Overseas signing window" sub="Free agents not picked at the auction. Squads must hold 6 to 8 overseas players before the first match.">
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <span className="phase">Overseas in squad <b style={{ color: 'var(--ink)' }}>{os}</b> / 6–8</span>
          {os < 6 && <span className="crim t-small">Sign at least {6 - os} more</span>}
          {open && (t.squad.length < 18 || os < 6) && <button className="btn" onClick={() => update(() => { const n = completeSquad(G); autosave(G); toast(n ? `Signed ${n} free agent${n > 1 ? 's' : ''} at base price.` : 'No affordable free agents left.'); })}>Auto-complete squad</button>}
          {open && <button className="btn btn-primary" disabled={!canStart} onClick={() => { update(() => { const n = startSeason(G); autosave(G); if (n) toast(`${n} free agent${n > 1 ? 's' : ''} signed at base price to complete your squad.`); }); nav('/'); }}>Start Season {seasonNo(G.year)}</button>}
        </div>
      </PageHead>
      {!open && <p className="crim" style={{ marginBottom: 12 }}>The signing window is closed until the next pre-season.</p>}
      <div className="tblwrap"><table className="tbl compact"><thead><tr><th>Player</th><th>Nat</th><th className="r">Age</th><th>Role</th><th className="r">Bat</th><th className="r">Bowl</th><th className="r">Potential</th><th>Interest</th><th className="r">Asking price</th><th>Offer (Rs L)</th></tr></thead>
        <tbody>{fa.length ? fa.map((p) => { const it = interest(G, p); return (
          <tr key={p.id}><td className="name"><Link to={`/player/${p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link></td><td>{p.nat}</td><td className="r">{p.age}</td><td><Role r={p.role} /></td><td className="r">{p.bat}</td><td className="r">{p.bowl || '–'}</td><td className="r">{potRange(p)}</td>
            <td className={it === 'Keen' ? 'up' : it === 'Reluctant' ? 'crim' : 'mut'}>{it}{p.refusedBy ? ' · refused you' : ''}</td><td className="r">{fmtL(p.value)}</td>
            <td><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input className="input" type="number" min="1" step="0.5" defaultValue={p.value} style={{ width: 84, height: 34 }} onChange={(e) => { ui.offers[p.id] = +e.target.value; }} aria-label={`Offer for ${p.name}`} /><button className="btn btn-sm" disabled={!open || !!p.refusedBy} onClick={() => offer(p)}>Offer</button></div></td></tr>); })
          : <tr><td colSpan={10} className="faint">No overseas free agents left.</td></tr>}</tbody></table></div>
      <p className="faint t-small" style={{ marginTop: 8 }}>Overseas purse left: {fmtL(t.osPurse)}. Offers below the asking price may be refused. A reluctant player needs a higher offer.</p>
      <div className="cols" style={{ marginTop: 32 }}>
        <section><h2 className="t-h3" style={{ marginBottom: 10 }}>Overseas already signed</h2><table className="tbl plain compact"><tbody>{mine.map((p) => <tr key={p.id}><td style={{ paddingLeft: 0 }}>{p.name}</td><td>{p.nat}</td><td><Role r={p.role} /></td><td className="r">{fmtL(p.salary)}</td>{open && <td className="r"><button className="btn btn-ghost btn-sm" onClick={() => update(() => { G.releasePlayer(p.id); toast(`${p.name} released.`); })}>Release</button></td>}</tr>)}</tbody></table></section>
        <section><h2 className="t-h3" style={{ marginBottom: 10 }}>Nepali free agents</h2><table className="tbl plain compact"><tbody>{dom.map((p) => <tr key={p.id}><td style={{ paddingLeft: 0 }}><Link to={`/player/${p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link></td><td className="r">{p.age}</td><td><Role r={p.role} /></td><td className="r">{ovr(p)}</td><td className="r">{fmtL(G.basePrice(p))}</td><td className="r"><button className="btn btn-sm" disabled={!open} onClick={() => update(() => { const e = G.signFA(p.id, G.user); if (e) toast(e); else { toast(`${p.name} signed.`); autosave(G); } })}>Sign</button></td></tr>)}</tbody></table>
          <p className="faint t-small" style={{ marginTop: 6 }}>Nepali free agents sign at their base price from the domestic purse ({fmtL(t.purse)} left).</p></section>
      </div>
    </div>
  );
}
