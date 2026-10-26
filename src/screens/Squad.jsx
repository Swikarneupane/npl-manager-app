import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { PageHead, Role, Seg } from '../components/bits.jsx';
import { ovr, fmtL } from '../game/engine.js';
import { formDisp, potRange, tr } from '../lib/util.js';

const FOCUS = ['Balanced', 'Batting', 'Bowling', 'Fitness'];
const INTENS = { Light: 'Faster recovery between matches, slower development.', Normal: 'Balanced load.', Intense: 'Better development and sharper form, more knocks in training.' };

export default function Squad() {
  const { G, update } = useGame();
  const t = G.teams[G.user];
  const xi = t.xi || [];
  const ensure = () => { if (!t.xi) { t.xi = G.autoXI(G.user); t.order = G.autoOrder(t.xi); } };
  const sq = t.squad.map((id) => G.P(id)).sort((a, b) => { const ia = xi.includes(a.id), ib = xi.includes(b.id); if (ia !== ib) return ia ? -1 : 1; return ovr(b) - ovr(a); });
  const order = (t.order || []).filter((id) => xi.includes(id)).concat(xi.filter((id) => !(t.order || []).includes(id)));
  const os = xi.filter((id) => G.P(id).nat !== 'NEP').length, nep = xi.length - os;
  const osAvail = t.squad.filter((id) => G.P(id).nat !== 'NEP' && !G.P(id).inj).length;
  const valid = G.validXI(G.user, xi); const wkOk = xi.some((id) => G.P(id).role === 'WK');
  let rule = '';
  if (!valid) { if (xi.length !== 11) rule = xi.length < 11 ? `Pick ${11 - xi.length} more` : `Pick ${xi.length - 11} fewer`; else if (os > 4) rule = 'Too many overseas'; else if (os < Math.min(4, osAvail)) rule = 'Needs 4 overseas'; else rule = 'Injured player picked'; }
  const wage = t.squad.reduce((a, id) => a + G.P(id).salary, 0);
  const toggle = (id, on) => update(() => { ensure(); if (on) { if (!t.xi.includes(id)) t.xi.push(id); if (!t.order.includes(id)) t.order.push(id); } else { t.xi = t.xi.filter((x) => x !== id); t.order = t.order.filter((x) => x !== id); } G.s.settings.autoXI = false; });
  const move = (id, d) => update(() => { const o = t.order; const i = o.indexOf(id); const j = i + d; if (i >= 0 && j >= 0 && j < o.length) [o[i], o[j]] = [o[j], o[i]]; });
  return (
    <>
      <PageHead title={tr(G, 'Squad')} sub={`${t.squad.length} players · ${t.squad.length - G.osCount(G.user)} Nepali, ${G.osCount(G.user)} overseas · wage bill ${fmtL(wage)}`} style={{ maxWidth: 1220 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <p className="t-small num" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}><span>Playing XI <b>{xi.length}</b>/11</span><span>Nepali <b>{nep}</b>/7</span><span>Overseas <b>{os}</b>/4</span></p>
          {valid ? <span className="phase" style={{ borderColor: 'var(--blue)', color: 'var(--blue)' }}>Legal XI</span> : <span className="phase" style={{ borderColor: 'var(--crimson)', color: 'var(--crimson)' }}>{rule}</span>}
          <button className="btn btn-sm" onClick={() => update(() => { t.xi = G.autoXI(G.user); t.order = G.autoOrder(t.xi); })}>Auto-pick XI</button>
        </div>
      </PageHead>
      <div className="tblwrap" style={{ maxWidth: 1220 }}><table className="tbl compact"><thead><tr><th>XI</th><th className="r">Bat #</th><th>Player</th><th>Nat</th><th className="r">Age</th><th>Role</th><th className="r">Bat</th><th className="r">Bowl</th><th className="r">Potential</th><th className="r">Form</th><th className="r">Fitness</th><th>Injury</th><th className="r">Salary</th><th className="r">Value</th><th>Training focus</th></tr></thead>
        <tbody>{sq.map((p) => { const inXi = xi.includes(p.id); const pos = order.indexOf(p.id); return (
          <tr key={p.id} className={`${inXi ? 'me' : ''}${p.inj ? ' dim' : ''}`}>
            <td><input type="checkbox" checked={inXi} onChange={(e) => toggle(p.id, e.target.checked)} aria-label={`Pick ${p.name} in the XI`} /></td>
            <td className="r faint num">{pos >= 0 ? pos + 1 : ''}</td>
            <td className="name"><Link to={`/player/${p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link> <span className="faint t-small">{t.captainId === p.id ? '(c)' : ''}{p.role === 'WK' ? ' (wk)' : ''}</span></td>
            <td className={p.nat !== 'NEP' ? 'blu' : ''}>{p.nat}</td><td className="r">{p.age}</td><td><Role r={p.role} /></td><td className="r">{p.bat}</td><td className="r">{p.bowl || '–'}</td>
            <td className={`r ${p.scouted ? '' : 'faint'}`}>{potRange(p)}</td><td className="r">{formDisp(p)}</td><td className="r">{Math.round(p.fit)}%</td>
            <td className={p.inj ? 'crim' : 'faint'}>{p.inj ? `${p.inj} match${p.inj > 1 ? 'es' : ''}` : '–'}</td>
            <td className="r">{fmtL(p.salary)}</td><td className="r">{fmtL(p.value)}</td>
            <td><select className="input" value={p.focus} onChange={(e) => update(() => { p.focus = e.target.value; })} aria-label={`Training focus for ${p.name}`}>{FOCUS.map((f) => <option key={f}>{f}</option>)}</select></td>
          </tr>); })}</tbody></table></div>
      <p className="faint t-small" style={{ marginTop: 10 }}>Potential shows as a range until a scout files a report. Form is a 0–10 rating that follows recent matches. Ratings are out of 100. If your XI is not legal at match time, the game picks one for you.</p>
      <div className="cols" style={{ maxWidth: 1220, marginTop: 36, gridTemplateColumns: 'repeat(auto-fit,minmax(min(380px,100%),1fr))' }}>
        <section><h2 className="t-h3" style={{ marginBottom: 10 }}>Batting order</h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>{order.length ? order.map((id, i) => { const p = G.P(id); return (
            <li key={id} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1fr) auto auto', gap: 12, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--rule)' }}>
              <span className="board-f faint" style={{ fontSize: 18, textAlign: 'right' }}>{i + 1}</span><span><span style={{ fontWeight: 500 }}>{p.name}</span> <span className="faint t-small">{p.role} · bat {p.bat}</span></span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(id, -1)} aria-label={`Move ${p.name} up`}>↑</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => move(id, 1)} aria-label={`Move ${p.name} down`}>↓</button>
            </li>); }) : <li className="faint">Pick your XI first.</li>}</ol></section>
        <section className="stack" style={{ gap: 24 }}>
          <div className="row" style={{ gap: 16 }}>
            <div className="field" style={{ flex: '1 1 180px' }}><label htmlFor="cap">Captain</label><select id="cap" className="input" style={{ width: '100%', height: 44 }} value={t.captainId || ''} onChange={(e) => update(() => { t.captainId = e.target.value; })}>{t.squad.map((id) => <option key={id} value={id}>{G.P(id).name}</option>)}</select></div>
            <div className="field" style={{ flex: '1 1 180px' }}><label htmlFor="wk">Wicketkeeper</label><select id="wk" className="input" style={{ width: '100%', height: 44 }} value={t.keeperId || ''} onChange={(e) => update(() => { t.keeperId = e.target.value || null; })}><option value="">Auto</option>{xi.map((id) => <option key={id} value={id}>{G.P(id).name}</option>)}</select></div>
          </div>
          <div className="field"><span className="lbl">Team training intensity</span><Seg options={['Light', 'Normal', 'Intense'].map((x) => [x, x])} value={t.training} onChange={(v) => update(() => { t.training = v; })} label="Training intensity" /><p className="mut t-small" style={{ marginTop: 4 }}>{INTENS[t.training]}</p></div>
          <div className="panel stack" style={{ gap: 8 }}><h3 className="sec" style={{ margin: 0 }}>XI rule</h3>
            <p className="t-small mut">Every playing XI must have exactly <b style={{ color: 'var(--ink)' }}>7 Nepali</b> and <b style={{ color: 'var(--ink)' }}>4 overseas</b> players. The squad must hold 6 to 8 overseas players in total.</p>
            <table className="tbl plain compact" style={{ marginTop: 4 }}><tbody><tr><td style={{ paddingLeft: 0 }}>Nepali</td><td className="r num">{nep} / 7</td></tr><tr><td style={{ paddingLeft: 0 }}>Overseas</td><td className="r num">{os} / 4</td></tr><tr><td style={{ paddingLeft: 0 }}>Wicketkeeper in XI</td><td className="r">{wkOk ? 'Yes' : <span className="crim">No</span>}</td></tr></tbody></table></div>
        </section>
      </div>
    </>
  );
}
