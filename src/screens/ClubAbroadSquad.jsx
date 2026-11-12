// The registered squad against the league's rules, the XI, captain, keeper, batting order and bowling preference.
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import * as K from '../world/club.js';
import * as RC from '../world/recruit.js';
import '../styles/clubabroad.css';

export default function ClubAbroadSquad({ j }) {
  const { G, update, toast } = useGame(); const t = j.team; const fmt = RC.fmtOf(j.comp); const R = RC.rulesOf(j.comp);
  const sel = K.selection(G, t, fmt); const stored = (G.s.wd.cxi && G.s.wd.cxi[t] && G.s.wd.cxi[t][fmt]) || {}; const bowl = stored.bowl || [];
  const inXI = new Set(sel.xi.map((p) => p.id)); const issues = RC.squadIssues(G, t); const c = RC.counts(G, t);
  const act = (fn, msg) => update(() => { const e = fn(); if (e) toast(e); else { autosave(G); if (msg) toast(msg); } });
  const toggle = (p) => act(() => { const ids = sel.xi.map((x) => x.id); return K.setXI(G, t, fmt, { xi: inXI.has(p.id) ? ids.filter((x) => x !== p.id) : [...ids, p.id].slice(0, 11) }); });
  const move = (i, d) => act(() => { const o = sel.order.map((x) => x.id); const k = i + d; if (k < 0 || k >= o.length) return null; [o[i], o[k]] = [o[k], o[i]]; return K.setXI(G, t, fmt, { ord: o }); });
  const fix = () => act(() => K.setXI(G, t, fmt, { xi: sel.xi.map((p) => p.id) }), 'XI saved.');
  const ps = sel.squad.slice().sort((a, b) => (inXI.has(b.id) - inXI.has(a.id)) || (b.bat + b.bowl) - (a.bat + a.bowl));
  return (
    <div className="ca-grid">
      <section>
        <div className="sechead"><h2 className="t-h3">Squad · {c.n} of {R.max}</h2><span className="t-small mut">Overseas {c.os} of {R.overseas.max} · XI up to {R.overseas.xi}</span></div>
        {issues.length > 0 && <ul className="t-small ca-bad" style={{ marginBottom: 8 }}>{issues.map((x) => <li key={x}>{x}</li>)}</ul>}
        <div className="tblwrap"><table className="tbl ca-tbl"><thead><tr><th>Player</th><th>Role</th><th className="r">Bat</th><th className="r">Bowl</th><th className="r hide-m">Fit</th><th>XI</th><th>C</th><th>WK</th><th>Bowl</th><th /></tr></thead>
          <tbody>{ps.map((p) => <tr key={p.id} className={inXI.has(p.id) ? 'me' : ''}>
            <td className="name">{p.name}{RC.isOS(p, t) && <span className="cr-pill">OS</span>}{p.inj ? <span className="cr-pill c">Inj</span> : null}</td><td>{p.role}</td><td className="r num">{Math.round(p.bat)}</td><td className="r num">{Math.round(p.bowl)}</td><td className="r num hide-m">{Math.round(p.fit ?? 100)}</td>
            <td><input type="checkbox" aria-label={`${p.name} in XI`} checked={inXI.has(p.id)} disabled={!!p.inj} onChange={() => toggle(p)} /></td>
            <td><input type="radio" name="cap" aria-label={`${p.name} captain`} checked={sel.cap === p} disabled={!inXI.has(p.id)} onChange={() => act(() => K.setXI(G, t, fmt, { cap: p.id }))} /></td>
            <td><input type="radio" name="wk" aria-label={`${p.name} keeper`} checked={sel.wk === p} disabled={!inXI.has(p.id)} onChange={() => act(() => K.setXI(G, t, fmt, { wk: p.id }))} /></td>
            <td><input type="checkbox" aria-label={`${p.name} bowling plan`} checked={bowl.includes(p.id)} disabled={p.bowl < 35} onChange={() => act(() => K.setXI(G, t, fmt, { bowl: bowl.includes(p.id) ? bowl.filter((x) => x !== p.id) : [...bowl, p.id] }))} /></td>
            <td><button type="button" className="btn btn-sm btn-ghost" onClick={() => act(() => RC.release(G, t, p.id), `${p.name} released.`)}>Release</button></td></tr>)}</tbody></table></div>
      </section>
      <aside className="stack" style={{ gap: 12 }}>
        <div className="sechead"><h2 className="t-h3">Batting order</h2><span className="t-small mut">{sel.picked ? 'Picked by you' : 'Picked by the assistant'}</span></div>
        {sel.asst && <p className="t-micro faint">The assistant is on: it picks the XI for you.</p>}
        <ol className="mlist" style={{ listStyle: 'none', padding: 0 }}>{sel.order.map((p, i) => <li key={p.id}><span className="grow t-small">{i + 1}. {p.name}{sel.cap === p ? ' (c)' : ''}{sel.wk === p ? ' (wk)' : ''}</span>
          <button type="button" className="btn btn-sm btn-ghost" aria-label="Move up" onClick={() => move(i, -1)}>Up</button><button type="button" className="btn btn-sm btn-ghost" aria-label="Move down" onClick={() => move(i, 1)}>Down</button></li>)}</ol>
        <button type="button" className="btn" onClick={fix}>Save this XI</button>
        <p className="t-micro faint">Bowling plan: tick the bowlers you want used first (up to six).</p>
      </aside>
    </div>
  );
}
