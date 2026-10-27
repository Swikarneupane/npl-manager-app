import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Ovs } from '../components/bits.jsx';
import { careerOf } from '../game/game.js';
import { seasonNo, tname, tshort, tr } from '../lib/util.js';

// A ranked list with bars scaled to the leader (or to the inverse for "lower is better").
function Ranked({ title, unit, rows, val, fmt = (v) => v, low }) {
  if (!rows.length) return <section><div className="sechead"><h2 className="t-h3">{title}</h2><span className="t-micro faint">{unit}</span></div><p className="t-small faint">No qualifiers yet.</p></section>;
  const vs = rows.map(val); const best = low ? Math.min(...vs) : Math.max(...vs); const worst = low ? Math.max(...vs) : 0;
  const pct = (v) => (low ? (worst === best ? 100 : 30 + (70 * (worst - v)) / (worst - best)) : best ? (v / best) * 100 : 0);
  return (
    <section><div className="sechead"><h2 className="t-h3">{title}</h2><span className="t-micro faint">{unit}</span></div>
      <ol className="ranked">{rows.map((x, i) => (
        <li key={x.p.id} className={x.mine ? 'me' : ''}><span className="t-micro faint">{i + 1}</span>
          <span className="rk-mid"><Link to={`/player/${x.p.id}`} className="t-small rk-name">{x.team && <Dot id={x.team} />}{x.p.name}</Link><span className="rk-bar"><i style={{ width: `${pct(vs[i])}%` }} /></span></span>
          <span className="board-f rk-v">{fmt(vs[i])}</span></li>))}</ol></section>
  );
}

export default function Stats() {
  const { G, ui, update } = useGame(); const [q, setQ] = useSearchParams(); const [full, setFull] = useState(false);
  const tab = ['bowling', 'records'].includes(q.get('tab')) ? q.get('tab') : 'batting';
  const [who, setWho] = useState('all');
  const years = [...new Set(Object.values(G.players).flatMap((p) => Object.keys(p.stats)))].map(Number).sort((a, b) => b - a);
  if (!years.length) years.push(G.year);
  const y = ui.statsAll ? null : (ui.statsYear || years[0]);
  const all = Object.values(G.players).map((p) => ({ p, s: y ? p.stats[y] : (Object.keys(p.stats).length ? careerOf(p) : null) })).filter((x) => x.s && x.s.m > 0)
    .map((x) => ({ ...x, team: y ? x.s.team : x.p.team })).map((x) => ({ ...x, mine: x.team === G.user }));
  const ps = all.filter((x) => (who === 'all' ? true : who === 'mine' ? x.mine : x.p.nat === 'NEP'));
  const top = (arr, n = 5) => arr.slice(0, n);
  const by = (f, d = -1) => ps.slice().sort((a, b) => d * (f(a) - f(b)));
  const runs = top(by((x) => x.s.r)), wk = top(ps.filter((x) => x.s.w > 0).sort((a, b) => b.s.w - a.s.w || a.s.rc / a.s.bb - b.s.rc / b.s.bb));
  const srs = top(ps.filter((x) => x.s.b >= 60).sort((a, b) => b.s.r / b.s.b - a.s.r / a.s.b), 3);
  const sixes = top(by((x) => x.s.s), 3).filter((x) => x.s.s > 0);
  const avgs = top(ps.filter((x) => x.s.inn - x.s.no >= 3 && x.s.b >= 60).sort((a, b) => b.s.r / (b.s.inn - b.s.no) - a.s.r / (a.s.inn - a.s.no)), 3);
  const eco = top(ps.filter((x) => x.s.bb >= 60).sort((a, b) => a.s.rc / a.s.bb - b.s.rc / b.s.bb), 3);
  const dots = top(ps.filter((x) => x.s.bb >= 60 && x.s.w > 0).sort((a, b) => a.s.bb / a.s.w - b.s.bb / b.s.w), 3);
  const R = G.s.records || {};
  const chips = [['all', 'All teams'], ['mine', `${tshort(G, G.user)} only`], ['nep', 'Nepali']];
  const Tm = ({ x }) => (x.team ? <><Dot id={x.team} />{tshort(G, x.team)}</> : <span className="faint">—</span>);
  const Nm = ({ x }) => <Link to={`/player/${x.p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{x.p.name}</Link>;
  const batAll = by((x) => x.s.r).slice(0, 40); const bowlAll = ps.filter((x) => x.s.bb > 0).sort((a, b) => b.s.w - a.s.w || a.s.rc / a.s.bb - b.s.rc / b.s.bb).slice(0, 40);
  return (
    <div className="statspg">
      <div className="sechead" style={{ alignItems: 'center', marginBottom: 10 }}>
        <h1 className="t-h1">{tr(G, 'Stats')}</h1>
        <label className="chip season-pick"><span className="sr-only">Season</span>
          <select value={ui.statsAll ? 'all' : String(y)} onChange={(e) => update(() => { if (e.target.value === 'all') ui.statsAll = true; else { ui.statsYear = +e.target.value; ui.statsAll = false; } })} aria-label="Season">
            {years.map((v) => <option key={v} value={v}>Season {seasonNo(v)} · {v}</option>)}<option value="all">All-time in this game</option></select> ▾</label>
      </div>
      <div className="tabs" role="tablist" aria-label="Stats" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))', maxWidth: 420 }}>
        {[['batting', 'Batting'], ['bowling', 'Bowling'], ['records', 'Records']].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setFull(false); setQ(k === 'batting' ? {} : { tab: k }, { replace: true }); }}>{l}</button>)}
      </div>
      {tab !== 'records' && <div className="chips" role="group" aria-label="Filter players">{chips.map(([k, l]) => <button key={k} type="button" className={`chip${who === k ? ' on' : ''}`} aria-pressed={who === k} onClick={() => setWho(k)}>{l}</button>)}</div>}
      {tab === 'batting' && <div className="rgrid">
        <Ranked title={y ? 'Platinum Cap' : 'Most runs'} unit="runs" rows={runs} val={(x) => x.s.r} />
        <Ranked title="Best strike rate" unit="min 60 balls" rows={srs} val={(x) => (100 * x.s.r) / x.s.b} fmt={(v) => v.toFixed(0)} />
        <Ranked title="Most sixes" unit="" rows={sixes} val={(x) => x.s.s} />
        <Ranked title="Best average" unit="min 3 dismissals" rows={avgs} val={(x) => x.s.r / (x.s.inn - x.s.no)} fmt={(v) => v.toFixed(1)} />
      </div>}
      {tab === 'bowling' && <div className="rgrid">
        <Ranked title={y ? 'Golden Cap' : 'Most wickets'} unit="wickets" rows={wk} val={(x) => x.s.w} />
        <Ranked title="Best economy" unit="min 10 overs" rows={eco} val={(x) => x.s.rc / (x.s.bb / 6)} fmt={(v) => v.toFixed(2)} low />
        <Ranked title="Best strike rate" unit="balls per wicket · min 10 overs" rows={dots} val={(x) => x.s.bb / x.s.w} fmt={(v) => v.toFixed(1)} low />
      </div>}
      {tab === 'records' && <section className="panel"><ul className="rules">
        {[['Highest score', R.hs && `${R.hs.v}${R.hs.no ? '*' : ''} (${R.hs.b}) · ${R.hs.who}`, R.hs], ['Best bowling', R.bb && `${R.bb.w}/${R.bb.r} · ${R.bb.who}`, R.bb], ['Highest team total', R.ht && `${R.ht.v}/${R.ht.w} · ${tname(G, R.ht.team)} v ${tshort(G, R.ht.opp)}`, R.ht], ['Lowest all-out total', R.lt && `${R.lt.v} · ${tname(G, R.lt.team)} v ${tshort(G, R.lt.opp)}`, R.lt]]
          .map(([k, v, r]) => <li key={k}><span className="t-small">{k}</span><span className="t-small b6" style={{ textAlign: 'right' }}>{v || <span className="faint">—</span>}{r && <span className="t-micro faint"> · {r.y}</span>}</span></li>)}</ul>
        <p className="t-micro faint" style={{ marginTop: 8 }}>Records set in this game. <Link to="/history">History</Link> has champions and the hall of fame.</p></section>}
      {tab !== 'records' && <div style={{ marginTop: 16 }}><button type="button" className="btn" onClick={() => setFull(!full)}>{full ? 'Hide the full table' : `Full ${tab} table`}</button></div>}
      {full && tab === 'batting' && <div className="tblwrap" style={{ marginTop: 12 }}><table className="tbl compact"><thead><tr><th>Player</th><th>Team</th><th className="r">M</th><th className="r">R</th><th className="r">HS</th><th className="r">Avg</th><th className="r">SR</th><th className="r">50/100</th></tr></thead>
        <tbody>{batAll.map((x) => <tr key={x.p.id} className={x.mine ? 'me' : ''}><td className="name"><Nm x={x} /></td><td><Tm x={x} /></td><td className="r">{x.s.m}</td><td className="r"><b>{x.s.r}</b></td><td className="r">{x.s.hs}{x.s.hsNo ? '*' : ''}</td><td className="r">{x.s.inn - x.s.no > 0 ? (x.s.r / (x.s.inn - x.s.no)).toFixed(1) : '–'}</td><td className="r">{x.s.b ? (100 * x.s.r / x.s.b).toFixed(1) : '–'}</td><td className="r">{x.s.ff}/{x.s.h}</td></tr>)}</tbody></table></div>}
      {full && tab === 'bowling' && <div className="tblwrap" style={{ marginTop: 12 }}><table className="tbl compact"><thead><tr><th>Player</th><th>Team</th><th className="r">M</th><th className="r">O</th><th className="r">W</th><th className="r">Econ</th><th className="r">Best</th></tr></thead>
        <tbody>{bowlAll.map((x) => <tr key={x.p.id} className={x.mine ? 'me' : ''}><td className="name"><Nm x={x} /></td><td><Tm x={x} /></td><td className="r">{x.s.m}</td><td className="r"><Ovs balls={x.s.bb} /></td><td className="r"><b>{x.s.w}</b></td><td className="r">{(x.s.rc / (x.s.bb / 6)).toFixed(2)}</td><td className="r">{x.s.bw}/{x.s.br === 999 ? 0 : x.s.br}</td></tr>)}</tbody></table></div>}
    </div>
  );
}
