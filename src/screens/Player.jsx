import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Meter } from '../components/bits.jsx';
import { Icon } from '../components/icons.jsx';
import { ovr, fmtL, clamp, TYPE_LABEL } from '../game/engine.js';
import { careerOf } from '../game/game.js';
import { COUNTRY_NAMES } from '../game/data.js';
import { formDisp, potRange, seasonNo, tname, tshort } from '../lib/util.js';
import { appearances } from '../lib/form.js';
import { coachLine } from './Squad.jsx';
import { gradeLabel, selectorView } from './Nepal.jsx';
import { INTL_ASOF } from '../game/intl-data.js';

const ROLE = { BAT: 'batter', BOWL: 'bowler', AR: 'all-rounder', WK: 'wicketkeeper' };
const FOCUS = ['Balanced', 'Batting', 'Bowling', 'Fitness'];

// Last five appearances as bars: runs for batters, wickets for bowlers (both for all-rounders).
function LastFive({ G, p }) {
  const apps = appearances(G, p).slice(-5); const bowler = p.role === 'BOWL';
  if (!apps.length) return <p className="t-small faint">No matches yet this season.</p>;
  const val = (e) => (bowler ? e.w || 0 : e.r || 0); const max = Math.max(bowler ? 4 : 60, ...apps.map(val));
  return (
    <div className="panel l5">{apps.map((e, i) => (
      <Link key={i} to={`/scorecard/${e.n}`} className="l5-col" aria-label={`Match ${e.n}: ${bowler ? `${e.w ?? 0} wickets` : `${e.r ?? 'did not bat'}${e.r != null && !e.out ? ' not out' : ''}`} v ${tshort(G, e.opp)}`}>
        <span className="board-f l5-v">{bowler ? `${e.w ?? 0}/${e.rc ?? 0}` : e.r == null ? 'dnb' : `${e.r}${e.out ? '' : '*'}`}</span>
        <span className="l5-bar"><i style={{ height: `${Math.max(4, (val(e) / max) * 100)}%` }} className={val(e) >= (bowler ? 2 : 30) ? 'g' : ''} /></span>
        <span className="t-micro faint">v {e.opp}</span></Link>))}</div>
  );
}

// Nepal tab: real caps at game start (— when not verified) plus caps won in this game.
function NepalTab({ G, p }) {
  const I = p.intl || {}; const g = p.intlG || { t20i: 0, odi: 0 }; const ranked = G.pickNepal().ranked; const [view, next] = selectorView(G, p, ranked);
  const cap = (fmt) => <p className="board-f nt-caps">{I[fmt] == null ? <span className="faint">—</span> : I[fmt]}{g[fmt] ? <span className="nt-plus"> + {g[fmt]}</span> : null}</p>;
  const d = I.debut; const debut = d ? `${d.fmt} · ${d.date ? d.date : d.year}${d.v ? ` v ${d.v}` : ''}${d.game ? ' (in your game)' : ''}` : (I.t20i == null ? '—' : 'Not yet capped');
  const byEvt = []; for (const e of p.intlLog || []) { const k = `${e.y}|${e.evt}`; let r = byEvt.find((x) => x.k === k); if (!r) { r = { k, month: e.month, evt: e.evt, fmt: e.fmt, n: 0, r: 0, w: 0 }; byEvt.push(r); } r.n++; r.r += e.r; r.w += e.w; }
  return (
    <div className="stack" style={{ gap: 16 }}>
      <section className="panel stack" style={{ gap: 12 }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}><span className="staff-ic" aria-hidden="true"><Icon name="nepal" size={20} /></span><h2 className="t-h3">International career</h2></div>
        <div className="two"><div><p className="t-micro faint">T20Is</p>{cap('t20i')}<p className="t-micro faint">at game start{g.t20i ? ' · + in your game' : ''}</p></div><div><p className="t-micro faint">ODIs</p>{cap('odi')}<p className="t-micro faint">at game start{g.odi ? ' · + in your game' : ''}</p></div></div>
        <div className="pcontract">
          <div><p className="t-micro faint">Debut</p><p className="t-small">{debut}</p></div>
          <div><p className="t-micro faint">Central contract</p><p className="t-small">{I.grade ? <>Grade {gradeLabel(I.grade)} <span className="t-micro faint">(CAN {I.gradeYear}{I.gradeYear > 2026 ? ', in your game' : ''})</span></> : 'None'}</p></div>
          <div><p className="t-micro faint">Selectors' view</p><p className="t-small">{view}</p></div>
          <div><p className="t-micro faint">Next squad</p><p className="t-small">{next}</p></div>
        </div>
        <p className="t-micro faint">{I.real ? `Caps at game start: T20Is as of ${INTL_ASOF.t20i}, ODIs as of ${INTL_ASOF.odi} (Wikipedia, citing ESPNcricinfo). A dash means we could not verify it.` : 'A fictional player: no international career before the game.'}</p>
      </section>
      <section><h2 className="t-h3" style={{ marginBottom: 6 }}>Nepal games in your career</h2>
        <ul className="olist">{byEvt.slice().reverse().map((r) => <li key={r.k}><span><span className="t-micro faint">{r.month}</span><br /><span className="t-small b6">{r.evt} · {r.n} {r.fmt === 'ODI' ? 'ODI' : r.fmt === 'T20' ? 'T20' : 'T20I'}{r.n > 1 ? 's' : ''}</span><br /><span className="t-micro mut">{r.r} runs · {r.w} wkt{r.w === 1 ? '' : 's'}</span></span><span /><span /></li>)}
          {!byEvt.length && <li className="t-small faint">No Nepal games in your career yet.</li>}</ul></section>
      <section className="panel coachnote"><p className="t-small gld b6">Why it matters</p><p className="t-small">Each Nepal series adds experience (+1 to +2 rating). Capped players are worth more at auction and leave the uncapped set.</p></section>
    </div>
  );
}

export default function Player() {
  const { G, update, toast } = useGame(); const { id } = useParams(); const nav = useNavigate(); const [q, setQ] = useSearchParams();
  const p = G.P(id); if (!p) return <p>Player not found.</p>;
  const nep = p.nat === 'NEP';
  const tab = q.get('tab') === 'npl' ? 'npl' : q.get('tab') === 'nepal' && nep ? 'nepal' : 'overview';
  const t = G.teams[G.user]; const mine = p.team === G.user; const o = ovr(p);
  const attr = [['Batting', p.bat], ['Against spin', clamp(p.bat + p.vsSpin, 0, 99)], ['Against pace', clamp(p.bat - p.vsSpin, 0, 99)], ['Bowling', p.bowl || 0], ['Fielding', p.field], ['Temperament', p.temper]];
  const retire = p.retired ? 'Retired' : p.age < 35 ? `Not before ${G.year + (35 - p.age)}` : p.age < 40 ? 'Possible after this season' : 'This is his last season';
  const years = Object.keys(p.stats).sort((a, b) => b - a);
  const real = [];
  for (const h of G.s.history.filter((x) => x.real)) { const r = h.runs.find((x) => x[0] === p.name); const w = h.wkts.find((x) => x[0] === p.name); if (r || w) real.push({ y: h.year, team: (r || w)[1], r: r ? r[2] : null, w: w ? w[2] : null }); }
  const c = careerOf(p); const s = p.stats[G.year] || p.stats[G.year - 1]; const sy = p.stats[G.year] ? G.year : G.year - 1;
  const canRelease = mine && ['preseason', 'offseason'].includes(G.s.phase);
  const isCap = p.team && G.teams[p.team].captainId === p.id;
  const canStar = !mine && !p.retired && ['offseason', 'retention', 'auction'].includes(G.s.phase) && !(G.s.auction && G.s.auction.done && G.s.phase === 'auction');
  const starred = canStar && !!G.slEntry(p.id);
  const caps = nep ? G.intlCaps(p) : 0;
  const tags = [nep && caps > 0 && 'Nepal international', nep && caps > 0 && 'Capped', isCap && 'Captain', p.inj ? `Injured · ${p.inj}` : null, p.form >= 5 ? 'In form' : p.form <= -5 ? 'Out of form' : null, p.uncapped ? 'Uncapped' : null].filter(Boolean);
  // squad position for prev / next when viewing your own players
  const order = mine ? t.squad.slice().sort((a, b) => ovr(G.P(b)) - ovr(G.P(a))) : null; const idx = order ? order.indexOf(p.id) : -1;
  const go = (d) => { const next = G.P(order[(idx + d + order.length) % order.length]); nav(`/player/${next.id}${tab === 'npl' || (tab === 'nepal' && next.nat === 'NEP') ? `?tab=${tab}` : ''}`, { replace: true }); };
  const avg = s && s.inn - s.no > 0 ? (s.r / (s.inn - s.no)).toFixed(1) : '–'; const sr = s && s.b ? (100 * s.r / s.b).toFixed(1) : '–';
  const coach = mine && p.age < 26 ? (() => { const st = G.s.staff[G.user]; const bat = p.role !== 'BOWL'; const x = bat ? st.bat : st.bowl; return x ? `With your level ${x.level} ${bat ? 'batting' : 'bowling'} coach: about +${Math.round(x.level / 2)} ${bat ? 'batting' : 'bowling'} by next season on top of normal growth.` : null; })() : null;
  return (
    <div className="playerpg stack" style={{ gap: 16 }}>
      <div className="sechead" style={{ alignItems: 'center' }}>
        <Link to={mine ? '/squad' : '/stats'} className="t-small row" style={{ gap: 4, alignItems: 'center' }}><Icon name="back" size={18} />{mine ? 'Squad' : 'Back'}</Link>
        {order && <span className="row" style={{ gap: 4, alignItems: 'center' }}><button type="button" className="btn btn-ghost btn-sm" aria-label="Previous player" onClick={() => go(-1)}>‹</button><span className="t-small faint">{idx + 1} of {order.length}</span><button type="button" className="btn btn-ghost btn-sm" aria-label="Next player" onClick={() => go(1)}>›</button></span>}
      </div>
      <section className="board pboard">
        {tags.length > 0 && <div className="row" style={{ gap: 6 }}>{tags.map((x) => <span key={x} className="btag">{x}</span>)}</div>}
        <h1 className="bf pb-name">{p.name}</h1>
        <p className="blbl">{p.team ? tname(G, p.team) : p.retired ? 'Retired' : 'Free agent'} · {COUNTRY_NAMES[p.nat] || p.nat} · {p.age} · {ROLE[p.role]} · {p.hand === 'L' ? 'left' : 'right'}-hand bat{p.type ? `, ${(TYPE_LABEL[p.type] || p.type).toLowerCase()}` : ''}{p.prov ? ` · ${p.prov} Province` : ''}</p>
        <div className="pb-cells"><div><p className="blbl">Overall</p><p className="bf pb-v">{o}</p></div><div><p className="blbl">Potential</p><p className="bf pb-v">{potRange(p)}</p></div><div><p className="blbl">Form</p><p className="bf pb-v">{formDisp(p)}</p></div><div className="wide"><p className="blbl">Fitness</p><p className="bf pb-v">{Math.round(p.fit)}%</p></div><div className="wide"><p className="blbl">Morale</p><p className="bf pb-v">{Math.round(p.morale)}</p></div></div>
      </section>
      <div className="tabs" role="tablist" aria-label="Player" style={{ gridTemplateColumns: `repeat(${nep ? 3 : 2},minmax(0,1fr))`, margin: 0, maxWidth: nep ? 480 : 360 }}>
        {[['overview', 'Overview'], ['npl', 'NPL'], ...(nep ? [['nepal', 'Nepal']] : [])].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setQ(k === 'overview' ? {} : { tab: k }, { replace: true })}>{l}</button>)}
      </div>
      {tab === 'nepal' ? <NepalTab G={G} p={p} /> : tab === 'overview' ? (
        <div className="pgrid">
          <div className="stack" style={{ gap: 16, minWidth: 0 }}>
            <section><div className="sechead"><h2 className="t-h3">Last 5 {p.role === 'BOWL' ? 'matches' : 'innings'}</h2><span className="t-micro faint">{p.role === 'BOWL' ? 'wickets' : 'runs'}</span></div><LastFive G={G} p={p} /></section>
            <section><h2 className="t-h3" style={{ marginBottom: 6 }}>{s ? (sy === G.year ? 'This season' : `Season ${seasonNo(sy)}`) : 'This season'}</h2>
              <div className="tiles">{[['Runs', s ? s.r : 0], ['Average', s ? avg : '–'], ['Strike rate', s ? sr : '–'], ['Wickets', s ? s.w : 0]].map(([k, v]) => <div key={k} className="panel tile4"><p className="t-micro faint">{k}</p><p className="board-f">{v}</p></div>)}</div></section>
            <section className="panel stack" style={{ gap: 6 }}><h2 className="t-h3">Attributes</h2>
              <ul className="attrs">{attr.map(([k, v]) => <li key={k}><span className="t-small">{k}</span><Meter pct={v} blue /><span className="t-small b6 num">{v || '–'}</span></li>)}</ul>
              <p className="t-micro faint">Potential {potRange(p)}{p.scouted ? ' · scouted' : ''}. Ratings are out of 100.</p></section>
          </div>
          <div className="stack" style={{ gap: 16, minWidth: 0 }}>
            {mine && <section className="panel stack" style={{ gap: 8 }}><h2 className="t-h3">Training focus</h2>
              <div className="chips" role="radiogroup" aria-label="Training focus" style={{ margin: 0 }}>{FOCUS.map((f) => <button key={f} type="button" role="radio" aria-checked={p.focus === f} className={`chip${p.focus === f ? ' on' : ''}`} onClick={() => update(() => { p.focus = f; })}>{f}</button>)}</div>
              <p className="t-micro faint">{coach || coachLine(G, p)}{p.age >= 26 ? ' He is 26 or older, so the coach helps his form, not his development.' : ''}</p></section>}
            <section className="panel pcontract">
              <div><p className="t-micro faint">Salary</p><p className="t-small">{p.team ? `${fmtL(p.salary)} / season` : '—'}</p></div>
              <div><p className="t-micro faint">Contract</p><p className="t-small">{p.team ? `Until the ${G.s.settings.nextMega} mega auction` : '—'}</p></div>
              <div><p className="t-micro faint">Market value</p><p className="t-small">{fmtL(p.value)}</p></div>
              <div><p className="t-micro faint">Retirement</p><p className="t-small">{retire}</p></div>
            </section>
            <div className="row" style={{ gap: 8 }}>
              {mine && !isCap && <button className="btn" onClick={() => update(() => { t.captainId = p.id; toast(`${p.name} is your new captain.`); })}>Make captain</button>}
              {canStar && <button className={`btn${starred ? ' btn-blue' : ''}`} aria-pressed={starred} onClick={() => update(() => { const on = G.toggleShortlist(p.id); toast(on ? `${p.name} added to your shortlist.` : `${p.name} removed from your shortlist.`); })}>{starred ? '★ On your shortlist' : '☆ Add to shortlist'}</button>}
              {!p.scouted && p.pot > o && <button className="btn" onClick={() => update(() => { t.balance -= 0.5; p.scouted = true; toast('Scout report filed.'); })}>Scout report · Rs 0.5 L</button>}
              {canRelease && <button className="btn btn-ghost" onClick={() => { update(() => G.releasePlayer(p.id)); toast(`${p.name} released.`); nav('/squad'); }}>Release</button>}
            </div>
          </div>
        </div>
      ) : (
        <section>
          <div className="tiles" style={{ marginBottom: 12 }}>{[['Matches', c.m], ['Runs', c.r], ['Wickets', c.w], ['Seasons', years.length]].map(([k, v]) => <div key={k} className="panel tile4"><p className="t-micro faint">{k}</p><p className="board-f">{v}</p></div>)}</div>
          <div className="tblwrap"><table className="tbl compact"><thead><tr><th>Season</th><th>Team</th><th className="r">M</th><th className="r">Runs</th><th className="r">Avg</th><th className="r">SR</th><th className="r">HS</th><th className="r">50/100</th><th className="r">Wkts</th><th className="r">Econ</th><th className="r">Ct</th></tr></thead>
            <tbody>
              {years.map((y) => { const x = p.stats[y]; return (
                <tr key={y}><td>{seasonNo(+y)} · {y}</td><td>{x.team ? <><Dot id={x.team} />{tshort(G, x.team)}</> : '—'}</td><td className="r">{x.m}</td><td className="r">{x.r}</td><td className="r">{x.inn - x.no > 0 ? (x.r / (x.inn - x.no)).toFixed(1) : '–'}</td><td className="r">{x.b ? (100 * x.r / x.b).toFixed(1) : '–'}</td><td className="r">{x.hs}{x.hsNo ? '*' : ''}</td><td className="r">{x.ff}/{x.h}</td><td className="r">{x.w}</td><td className="r">{x.bb ? (x.rc / (x.bb / 6)).toFixed(2) : '–'}</td><td className="r">{x.ct}</td></tr>); })}
              {real.map((r) => <tr key={r.y} className="dim"><td>{seasonNo(r.y)} · {r.y}</td><td><Dot id={r.team} />{tshort(G, r.team)}</td><td className="r">–</td><td className="r">{r.r ?? '–'}</td><td className="r">–</td><td className="r">–</td><td className="r">–</td><td className="r">–</td><td className="r">{r.w ?? '–'}</td><td className="r">–</td><td className="r">–</td></tr>)}
              {!years.length && !real.length && <tr><td colSpan={11} className="faint">No NPL matches yet.</td></tr>}
            </tbody></table></div>
          <p className="faint t-small" style={{ marginTop: 8 }}>{real.length ? 'Grey rows are real NPL seasons; only top-five tallies from those seasons are on file.' : 'Seasons played in this game.'}</p>
        </section>
      )}
    </div>
  );
}
