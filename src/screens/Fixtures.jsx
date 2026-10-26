import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, PageHead, Seg } from '../components/bits.jsx';
import { seasonNo, tname, tshort, tr } from '../lib/util.js';

export default function Fixtures() {
  const { G, ui, update } = useGame(); const flt = ui.fixFilter;
  let list = G.s.fixtures;
  if (flt === 'mine') list = list.filter((f) => f.home === G.user || f.away === G.user); else if (flt === 'up') list = list.filter((f) => !f.res);
  return (
    <div style={{ maxWidth: 1100 }}>
      <PageHead title={tr(G, 'Fixtures')} sub={`Season ${seasonNo(G.year)} · ${G.year}`}>
        <Seg options={[['all', 'All'], ['mine', tshort(G, G.user)], ['up', 'Upcoming']]} value={flt} onChange={(v) => update(() => { ui.fixFilter = v; })} label="Filter fixtures" />
      </PageHead>
      <div className="tblwrap"><table className="tbl"><thead><tr><th>#</th><th>Date</th><th>Match</th><th>Result</th></tr></thead>
        <tbody>{list.length ? list.map((f) => { const live = ui.live && !ui.live.done && ui.live.started && ui.live.f === f; const i = live ? ui.live.m.inns[ui.live.m.inns.length - 1] : null;
          return (
            <tr key={f.n} className={f.home === G.user || f.away === G.user ? 'me' : ''}>
              <td className="faint">{f.stage === 'L' ? f.n : f.stage}</td><td>{f.date} · {f.night ? '7:15 pm' : '3:00 pm'}</td>
              <td><Dot id={f.home} />{tname(G, f.home)} <span className="faint">v</span> <Dot id={f.away} />{tname(G, f.away)}</td>
              <td>{f.res ? <>{f.res.text} · <Link to={`/scorecard/${f.n}`}>Scorecard</Link></> : live ? <><span className="crim">Live</span>{i && ` · ${i.runs}/${i.wkts} (${ui.live.m.ovStr(i)})`}</> : '—'}</td>
            </tr>); }) : <tr><td colSpan={4} className="faint">No fixtures.</td></tr>}</tbody></table></div>
      <p className="faint t-small" style={{ marginTop: 8 }}>All matches at TU International Cricket Ground, Kirtipur.</p>
    </div>
  );
}
