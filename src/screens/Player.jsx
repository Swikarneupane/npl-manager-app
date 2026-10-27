import { Link, useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Meter, Seg } from '../components/bits.jsx';
import { ovr, fmtL, clamp, TYPE_LABEL } from '../game/engine.js';
import { careerOf } from '../game/game.js';
import { coachLine } from './Squad.jsx';
import { COUNTRY_NAMES } from '../game/data.js';
import { formDisp, potRange, seasonNo, tname } from '../lib/util.js';

export default function Player() {
  const { G, update, toast } = useGame(); const { id } = useParams(); const nav = useNavigate();
  const p = G.P(id); if (!p) return <p>Player not found.</p>;
  const mine = p.team === G.user; const o = ovr(p);
  const attr = [['Batting', p.bat], ['Against spin', clamp(p.bat + p.vsSpin, 0, 99)], ['Against pace', clamp(p.bat - p.vsSpin, 0, 99)], ['Bowling', p.bowl || 0], ['Fielding', p.field], ['Temperament', p.temper]];
  const outlook = p.age < 24 ? 'Still developing. Biggest gains come before 24.' : p.age < 29 ? 'Entering his peak. Development slows after 28 and declines from about 32.' : p.age < 33 ? 'At his peak, but decline usually starts around 32.' : 'In the later years of his career. Ratings tend to fall each season now.';
  const ret = p.age < 33 ? `Retirement window 35–40. No retirement risk for at least ${35 - p.age} season${35 - p.age > 1 ? 's' : ''}.` : p.age < 35 ? 'Retirement window 35–40. Risk starts soon.' : 'Retirement odds rise every year from 35. He will retire by 40.';
  const years = Object.keys(p.stats).sort((a, b) => b - a);
  const real = [];
  for (const h of G.s.history.filter((x) => x.real)) { const r = h.runs.find((x) => x[0] === p.name); const w = h.wkts.find((x) => x[0] === p.name); if (r || w) real.push({ y: h.year, team: (r || w)[1], r: r ? r[2] : null, w: w ? w[2] : null }); }
  const c = careerOf(p);
  const canRelease = mine && ['preseason', 'offseason'].includes(G.s.phase);
  const isCap = p.team && G.teams[p.team].captainId === p.id;
  // shortlist from the profile while the auction is ahead (off-season, retention) or running
  const canStar = !mine && !p.retired && ['offseason', 'retention', 'auction'].includes(G.s.phase) && !(G.s.auction && G.s.auction.done && G.s.phase === 'auction');
  const starred = canStar && !!G.slEntry(p.id);
  return (
    <div style={{ maxWidth: 1100 }} className="stack">
      <Link to={mine ? '/squad' : '/stats'} className="t-small" style={{ marginBottom: 12 }}>← {mine ? 'Squad' : 'Back'}</Link>
      <div className="pagehead">
        <div className="stack" style={{ gap: 4 }}><h1 className="t-h1">{p.name}{isCap ? ' (c)' : ''}</h1>
          <p className="mut">{p.team ? <><Dot id={p.team} />{tname(G, p.team)}</> : p.retired ? 'Retired' : 'Free agent'} · {COUNTRY_NAMES[p.nat] || p.nat} · {p.age} · {p.role} · {p.hand === 'L' ? 'left' : 'right'}-hand bat{p.type ? `, ${TYPE_LABEL[p.type].toLowerCase()}` : ''}{p.prov ? ` · ${p.prov} Province` : ''}</p></div>
        <div className="row" style={{ gap: 8 }}>
          {canStar && <button className={`btn${starred ? ' btn-blue' : ''}`} aria-pressed={starred} onClick={() => update(() => { const on = G.toggleShortlist(p.id); toast(on ? `${p.name} added to your shortlist.` : `${p.name} removed from your shortlist.`); })}>{starred ? '★ On your shortlist' : '☆ Add to shortlist'}</button>}
          {!p.scouted && p.pot > o && <button className="btn" onClick={() => update(() => { G.teams[G.user].balance -= 0.5; p.scouted = true; toast('Scout report filed.'); })}>Scout report · Rs 0.5 L</button>}
          {canRelease && <button className="btn" onClick={() => { update(() => G.releasePlayer(p.id)); toast(`${p.name} released.`); nav('/squad'); }}>Release</button>}
        </div>
      </div>
      <div className="cols">
        <section className="panel stack" style={{ gap: 10 }}><h2 className="sec" style={{ margin: 0 }}>Attributes</h2>
          <table className="tbl plain compact"><tbody>{attr.map(([k, v]) => <tr key={k}><td style={{ paddingLeft: 0 }}>{k}</td><td style={{ width: '55%' }}><Meter pct={v} /></td><td className="r num">{v || '–'}</td></tr>)}</tbody></table>
          <p className="t-small mut">Potential {potRange(p)}{p.scouted ? ' · scouted' : ''} · form {formDisp(p)} · fitness {Math.round(p.fit)}% · morale {Math.round(p.morale)}</p></section>
        <section className="stack" style={{ gap: 20 }}>
          <div className="panel stack" style={{ gap: 8 }}><h2 className="sec" style={{ margin: 0 }}>Age and outlook</h2><p className="t-small">{outlook}</p><p className="t-small mut">{ret}</p></div>
          <div className="panel"><h2 className="sec">Contract</h2><table className="tbl plain compact"><tbody>
            <tr><td style={{ paddingLeft: 0 }}>Salary</td><td className="r">{p.team ? `${fmtL(p.salary)} a season` : '—'}</td></tr>
            <tr><td style={{ paddingLeft: 0 }}>Ends</td><td className="r">{p.team ? `Before the ${G.s.settings.nextMega} mega auction` : '—'}</td></tr>
            <tr><td style={{ paddingLeft: 0 }}>Market value</td><td className="r">{fmtL(p.value)}</td></tr></tbody></table></div>
          {mine && <div className="field"><span className="lbl">Training focus</span><Seg options={['Balanced', 'Batting', 'Bowling', 'Fitness'].map((f) => [f, f])} value={p.focus} onChange={(f) => update(() => { p.focus = f; })} label="Training focus" /><p className="t-small mut" style={{ marginTop: 6 }}>{coachLine(G, p)}{p.age >= 26 ? ' He is 26 or older, so the coach helps his form, not his development.' : ''}</p></div>}
        </section>
      </div>
      <section style={{ marginTop: 32 }}><h2 className="t-h3" style={{ marginBottom: 10 }}>Career by season</h2>
        <div className="tblwrap"><table className="tbl compact"><thead><tr><th>Season</th><th>Team</th><th className="r">M</th><th className="r">Runs</th><th className="r">Avg</th><th className="r">SR</th><th className="r">HS</th><th className="r">50/100</th><th className="r">Wkts</th><th className="r">Econ</th><th className="r">Ct</th></tr></thead>
          <tbody>
            {years.map((y) => { const s = p.stats[y]; return (
              <tr key={y}><td>{seasonNo(+y)} · {y}</td><td>{s.team ? <><Dot id={s.team} />{tname(G, s.team)}</> : '—'}</td><td className="r">{s.m}</td><td className="r">{s.r}</td><td className="r">{s.inn - s.no > 0 ? (s.r / (s.inn - s.no)).toFixed(1) : '–'}</td><td className="r">{s.b ? (100 * s.r / s.b).toFixed(1) : '–'}</td><td className="r">{s.hs}{s.hsNo ? '*' : ''}</td><td className="r">{s.ff}/{s.h}</td><td className="r">{s.w}</td><td className="r">{s.bb ? (s.rc / (s.bb / 6)).toFixed(2) : '–'}</td><td className="r">{s.ct}</td></tr>); })}
            {real.map((r) => <tr key={r.y} className="dim"><td>{seasonNo(r.y)} · {r.y}</td><td><Dot id={r.team} />{tname(G, r.team)}</td><td className="r">–</td><td className="r">{r.r ?? '–'}</td><td className="r">–</td><td className="r">–</td><td className="r">–</td><td className="r">–</td><td className="r">{r.w ?? '–'}</td><td className="r">–</td><td className="r">–</td></tr>)}
            {!years.length && !real.length && <tr><td colSpan={11} className="faint">No NPL matches yet.</td></tr>}
          </tbody></table></div>
        <p className="faint t-small" style={{ marginTop: 8 }}>In-game career: {c.m} matches, {c.r} runs, {c.w} wickets.{real.length ? ' Grey rows are real NPL seasons; only top-five tallies from those seasons are on file.' : ''}</p>
      </section>
    </div>
  );
}
