import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Ovs, PageHead, Seg } from '../components/bits.jsx';
import { careerOf } from '../game/game.js';
import { seasonNo, tshort, tr } from '../lib/util.js';

export default function Stats() {
  const { G, ui, update } = useGame();
  const years = [...new Set(Object.values(G.players).flatMap((p) => Object.keys(p.stats)))].map(Number).sort((a, b) => b - a);
  if (!years.length) years.push(G.year);
  const y = ui.statsAll ? null : (ui.statsYear || years[0]);
  const ps = Object.values(G.players).map((p) => ({ p, s: y ? p.stats[y] : (Object.keys(p.stats).length ? careerOf(p) : null) })).filter((x) => x.s && x.s.m > 0);
  const team = (x) => y ? x.s.team : x.p.team;
  const Tm = ({ x }) => (team(x) ? <><Dot id={team(x)} />{tshort(G, team(x))}</> : <span className="faint">—</span>);
  const Nm = ({ x }) => <Link to={`/player/${x.p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{x.p.name}</Link>;
  const bat = ps.slice().sort((a, b) => b.s.r - a.s.r).slice(0, 15);
  const bowl = ps.filter((x) => x.s.bb > 0).sort((a, b) => b.s.w - a.s.w || a.s.rc / a.s.bb - b.s.rc / b.s.bb).slice(0, 15);
  const sixes = ps.slice().sort((a, b) => b.s.s - a.s.s).slice(0, 8);
  const sr = ps.filter((x) => x.s.b >= 60).sort((a, b) => b.s.r / b.s.b - a.s.r / a.s.b).slice(0, 8);
  const eco = ps.filter((x) => x.s.bb >= 60).sort((a, b) => a.s.rc / a.s.bb - b.s.rc / b.s.bb).slice(0, 8);
  const Mini = ({ title, rows, val }) => <section><h2 className="sec">{title}</h2><table className="tbl plain compact"><tbody>{rows.map((x) => <tr key={x.p.id}><td style={{ paddingLeft: 0 }}><Nm x={x} /></td><td><Tm x={x} /></td><td className="r num">{val(x)}</td></tr>)}</tbody></table></section>;
  return (
    <div style={{ maxWidth: 1200 }}>
      <PageHead title={tr(G, 'Stats')} sub={y ? `Season ${seasonNo(y)} · ${y}` : 'All seasons played in this game'}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <select className="input" value={y || years[0]} onChange={(e) => update(() => { ui.statsYear = +e.target.value; ui.statsAll = false; })}>{years.map((v) => <option key={v} value={v}>Season {seasonNo(v)} · {v}</option>)}</select>
          <Seg options={[['0', 'Season'], ['1', 'All-time']]} value={ui.statsAll ? '1' : '0'} onChange={(v) => update(() => { ui.statsAll = v === '1'; })} label="Range" />
        </div>
      </PageHead>
      <div className="cols">
        <section><h2 className="t-h3" style={{ marginBottom: 10 }}>Most runs{y ? ' · Platinum Cap race' : ''}</h2><div className="tblwrap"><table className="tbl compact"><thead><tr><th>Player</th><th>Team</th><th className="r">M</th><th className="r">R</th><th className="r">HS</th><th className="r">Avg</th><th className="r">SR</th><th className="r">50/100</th></tr></thead>
          <tbody>{bat.length ? bat.map((x) => <tr key={x.p.id} className={team(x) === G.user ? 'me' : ''}><td className="name"><Nm x={x} /></td><td><Tm x={x} /></td><td className="r">{x.s.m}</td><td className="r"><b>{x.s.r}</b></td><td className="r">{x.s.hs}{x.s.hsNo ? '*' : ''}</td><td className="r">{x.s.inn - x.s.no > 0 ? (x.s.r / (x.s.inn - x.s.no)).toFixed(1) : '–'}</td><td className="r">{x.s.b ? (100 * x.s.r / x.s.b).toFixed(1) : '–'}</td><td className="r">{x.s.ff}/{x.s.h}</td></tr>) : <tr><td colSpan={8} className="faint">No matches played yet.</td></tr>}</tbody></table></div></section>
        <section><h2 className="t-h3" style={{ marginBottom: 10 }}>Most wickets{y ? ' · Golden Cap race' : ''}</h2><div className="tblwrap"><table className="tbl compact"><thead><tr><th>Player</th><th>Team</th><th className="r">M</th><th className="r">O</th><th className="r">W</th><th className="r">Econ</th><th className="r">Best</th></tr></thead>
          <tbody>{bowl.length ? bowl.map((x) => <tr key={x.p.id} className={team(x) === G.user ? 'me' : ''}><td className="name"><Nm x={x} /></td><td><Tm x={x} /></td><td className="r">{x.s.m}</td><td className="r"><Ovs balls={x.s.bb} /></td><td className="r"><b>{x.s.w}</b></td><td className="r">{(x.s.rc / (x.s.bb / 6)).toFixed(2)}</td><td className="r">{x.s.bw}/{x.s.br === 999 ? 0 : x.s.br}</td></tr>) : <tr><td colSpan={7} className="faint">No matches played yet.</td></tr>}</tbody></table></div></section>
        <Mini title="Most sixes" rows={sixes} val={(x) => x.s.s} />
        <Mini title="Best strike rate · min 60 balls" rows={sr} val={(x) => (100 * x.s.r / x.s.b).toFixed(1)} />
        <Mini title="Best economy · min 10 overs" rows={eco} val={(x) => (x.s.rc / (x.s.bb / 6)).toFixed(2)} />
      </div>
    </div>
  );
}
