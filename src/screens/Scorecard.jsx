import { Link, useParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Ovs } from '../components/bits.jsx';
import { stageName, tname, tshort } from '../lib/util.js';

function Innings({ c }) {
  const { G } = useGame(); const rr = c.b ? (c.r / (c.b / 6)).toFixed(2) : '0.00';
  return (
    <section style={{ marginTop: 28 }}>
      <h2 className="t-h3" style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}><Dot id={c.t} />{tname(G, c.t)} innings</h2>
      <div className="tblwrap"><table className="tbl compact"><thead><tr><th>Batter</th><th /><th className="r">R</th><th className="r">B</th><th className="r">4s</th><th className="r">6s</th><th className="r">SR</th></tr></thead>
        <tbody>{c.bat.map((b, i) => <tr key={i}><td className="name">{b[0]}</td><td className="mut t-small">{b[5]}</td><td className="r"><b>{b[1]}</b></td><td className="r">{b[2]}</td><td className="r">{b[3]}</td><td className="r">{b[4]}</td><td className="r">{b[2] ? (100 * b[1] / b[2]).toFixed(1) : '–'}</td></tr>)}
          <tr><td>Extras</td><td /><td className="r">{c.ex}</td><td colSpan={4} /></tr>
          <tr><td><b>Total</b></td><td className="mut t-small">{c.w} wkts, <Ovs balls={c.b} /> ov, RR {rr}</td><td className="r"><b>{c.r}</b></td><td colSpan={4} /></tr></tbody></table></div>
      {c.fow.length > 0 && <p className="faint t-small" style={{ marginTop: 8 }}>Fall of wickets: {c.fow.join(', ')}</p>}
      <div className="tblwrap" style={{ marginTop: 14 }}><table className="tbl compact"><thead><tr><th>Bowling</th><th className="r">O</th><th className="r">R</th><th className="r">W</th><th className="r">Econ</th><th className="r">Extras</th></tr></thead>
        <tbody>{c.bowl.map((b, i) => <tr key={i}><td className="name">{b[0]}</td><td className="r"><Ovs balls={b[1]} /></td><td className="r">{b[2]}</td><td className="r"><b>{b[3]}</b></td><td className="r">{b[1] ? (b[2] / (b[1] / 6)).toFixed(2) : '–'}</td><td className="r">{b[4]}</td></tr>)}</tbody></table></div>
    </section>
  );
}

export default function Scorecard() {
  const { G, ui } = useGame(); const { n } = useParams();
  const f = G.s.fixtures.find((x) => String(x.n) === String(n));
  let card, res;
  if (f && f.card) { card = f.card; res = f.res; } else if (f && ui.live && ui.live.f === f) { card = G.compactCard(ui.live.m); res = ui.live.m.result; }
  if (!f || !card) return <p>No scorecard for that match yet.</p>;
  const mom = res && res.mom ? G.P(res.mom) : null;
  return (
    <div style={{ maxWidth: 1000 }}>
      <Link to="/fixtures" className="t-small">← Fixtures</Link>
      <p className="faint t-small" style={{ marginTop: 12 }}>{stageName(f)} · {f.date} · Kirtipur</p>
      <h1 className="t-h1" style={{ marginTop: 6 }}>{res ? res.text : 'In progress'}</h1>
      <div className="row" style={{ gap: 28, marginTop: 14, alignItems: 'flex-end' }}>
        {card.map((c, i) => <div key={i} className="stack"><span className="faint t-small" style={{ display: 'flex', alignItems: 'center' }}><Dot id={c.t} />{tshort(G, c.t)}</span><span className="board-f" style={{ fontSize: 34, fontWeight: 600 }}>{c.r}/{c.w} <span className="mut" style={{ fontSize: 20 }}>(<Ovs balls={c.b} />)</span></span></div>)}
        {mom && <div className="stack" style={{ marginLeft: 'auto' }}><span className="faint t-small">Player of the match</span><span style={{ fontWeight: 600 }}>{mom.name}</span></div>}
      </div>
      {card.map((c, i) => <Innings key={i} c={c} />)}
    </div>
  );
}
