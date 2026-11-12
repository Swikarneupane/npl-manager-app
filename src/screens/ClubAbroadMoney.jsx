// Wage bill against the league's purse, revenue, and the board's verdict on the books each season.
import { useGame } from '../lib/store.jsx';
import * as K from '../world/club.js';
import * as RC from '../world/recruit.js';
import '../styles/clubabroad.css';

export default function ClubAbroadMoney({ j }) {
  const { G } = useGame(); const f = K.finances(G, j.team); const ps = RC.roster(G, j.team).map((p) => ({ p, w: RC.wageOf(G, p, j.team) })).sort((a, b) => b.w - a.w);
  if (!f.cap) return <p className="t-small mut">This league has no purse or wage cap, so there are no club finances to manage.</p>;
  return (
    <div className="ca-grid">
      <section className="stack" style={{ gap: 12 }}>
        <div className="panel ca-stats" style={{ padding: 16 }}>
          <div><span className="t-micro faint">Purse</span><span className="v">{f.cap}</span></div><div><span className="t-micro faint">Wage bill</span><span className="v">{f.payroll}</span></div>
          <div><span className="t-micro faint">Headroom</span><span className={`v ${f.headroom < 0 ? 'ca-bad' : ''}`}>{f.headroom}</span></div><div><span className="t-micro faint">Revenue (est.)</span><span className="v">{f.revenue}</span></div>
        </div>
        <p className="t-small mut">Revenue follows the board's confidence. At the end of each season the board looks at wages against revenue: a loss past the purse costs you confidence.</p>
        <h2 className="t-h3">Seasons on the books</h2>
        {(j.fin || []).length ? <ul className="mlist">{j.fin.map((x) => <li key={x.y}><span className="grow t-small">{x.y}<br /><span className="l2">Wages {x.payroll} · revenue {x.revenue}</span></span><span className={`t-small b6 ${x.profit >= 0 ? 'blu' : 'crim'}`}>{x.profit >= 0 ? '+' : ''}{x.profit}</span></li>)}</ul> : <p className="t-small faint">No season finished yet.</p>}
      </section>
      <section><h2 className="t-h3" style={{ marginBottom: 8 }}>Wages</h2><ul className="mlist">{ps.slice(0, 14).map(({ p, w }) => <li key={p.id}><span className="grow t-small">{p.name}</span><span className="num t-small">{w}</span></li>)}</ul></section>
    </div>
  );
}
