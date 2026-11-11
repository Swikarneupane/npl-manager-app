import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import MScreen from '../components/MScreen.jsx';
import { useNarrow } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { nm, today, worldTick, leadersOf, pathState, t20State } from '../game/world.js';
import { info, cupHosts, cupStage, stageTables, sbase, lastDay } from '../world/intl.js';
import { standings } from '../world/comp.js';
import { short, label as dayLabel } from '../world/dates.js';
import { T20WC_2026 } from '../game/world-data.js';
import { Standings, span } from './International.jsx';
import '../styles/world.css';

const cupsOf = (G) => Object.values(G.s.wd ? G.s.wd.seasons : {}).filter((S) => info(S).cup).sort((a, b) => a.start - b.start);
function pick(G, id) {
  const L = cupsOf(G); const t = today(G); if (id) { const S = L.find((x) => x.id === id); if (S) return S; }
  return L.find((S) => !S.done && S.start <= t + 2) || L.filter((S) => S.done && t - (S.endF ?? lastDay(S)) < 60).pop() || L.find((S) => !S.done) || L.filter((S) => S.done).pop() || null;
}
const nepIn = (S) => S.teams.includes('NEP');
// How many go through from a table of each phase.
const cutFor = (name, n) => ({ 'Super Series': 1, 'Group stage': n >= 6 ? 3 : 2, 'Super 10': 3, 'Super 7': 4 }[name] || 1);

function Hero({ S }) {
  const inf = info(S); const st = S.done ? 'Finished' : S.fx.some((f) => f.res) ? `Now: ${inf.stages[S.stage]}` : `Starts ${dayLabel(S.start)}`;
  const title = !nepIn(S) ? 'Nepal did not qualify' : `Nepal: ${cupStage(S, 'NEP')}`;
  return (
    <section className={`board wd-occ${nepIn(S) && S.done && !['Group stage', 'Super Series'].includes(cupStage(S, 'NEP')) ? ' occasion' : ''}`}>
      <div className="wd-hero-in">
        <div className="stack" style={{ gap: 8 }}>
          <span className="blbl" style={{ color: 'var(--wd-gold)', fontSize: 14 }}>{sbase(S)} · {cupHosts(S)} · {span(S.start, S.endF ?? lastDay(S))} · in-game</span>
          <span className="bf wd-occ-t">{title}</span>
          <span className="blbl" style={{ fontSize: 14 }}>{S.done ? `${nm(S.champ)} beat ${nm(S.runner)} in the final` : st}{S.done ? '' : ` · ${S.teams.length} teams`}</span>
        </div>
        <div className="stack" style={{ gap: 6, alignItems: 'flex-end' }}><Link className="btn wd-ghost btn-sm" to={`/comp/${encodeURIComponent(S.id)}`}>All fixtures ›</Link></div>
      </div>
    </section>);
}
// The phases opened so far, with their tables and games.
function Phases({ S }) {
  const inf = info(S); const opened = inf.stages.map((n, k) => k).filter((k) => k <= S.stage);
  const nepK = [...opened].reverse().find((k) => S.fx.some((f) => f.stage === k && (f.a === 'NEP' || f.b === 'NEP')));
  const [k, setK] = useState(nepK ?? S.stage); const T0 = stageTables(S, k); const labels = inf.labels[k] || [];
  const groups = Object.keys(T0).map((g, i) => ({ g, label: labels[i] || (g === 'super' ? inf.stages[k] : `Group ${g}`), rows: standings(T0[g]) }));
  const ko = groups.length && groups.every((x) => x.rows.length === 2) && /Semi|Final|Elim/.test(inf.stages[k]);
  const fx = S.fx.filter((f) => f.stage === k).sort((a, b) => a.d - b.d);
  return (
    <div>
      <div className="wd-th" style={{ flexWrap: 'wrap', gap: 8 }}><h2 className="t-h3">{inf.stages[k]}</h2>
        <div className="seg" role="group" aria-label="Phase">{opened.map((x) => <button key={x} type="button" className={x === k ? 'on' : ''} onClick={() => setK(x)}>{inf.stages[x]}</button>)}</div></div>
      {!ko && <div className="stack" style={{ gap: 18, marginTop: 10 }}>{groups.map((x) => <Standings key={x.g} title={x.label || inf.stages[k]} rows={x.rows} cut={cutFor(inf.stages[k], x.rows.length)} />)}</div>}
      <ul className="mlist" style={{ marginTop: 14 }}>{fx.map((f) => { const r = f.res; const sc = (t) => { const x = r && r.sc.find((z) => z[0] === t); return x ? `${x[1]}/${x[2]}` : ''; }; const nep = f.a === 'NEP' || f.b === 'NEP';
        return <li key={f.id} style={{ padding: '7px 0', ...(nep ? { boxShadow: 'inset 3px 0 0 var(--crimson-solid)', paddingLeft: 10 } : {}) }}><span className="grow t-small"><span className={r && r.w === f.a ? 'b6' : ''}>{nm(f.a)} {sc(f.a)}</span> v <span className={r && r.w === f.b ? 'b6' : ''}>{nm(f.b)} {sc(f.b)}</span>{f.ko || ko ? <span className="faint"> · {labels[groups.findIndex((x) => x.g === f.grp)] || inf.stages[k]}</span> : null}<br /><span className="l2">{r ? r.text : 'To play'}</span></span><span className="t-micro faint">{short(f.d)}</span></li>; })}</ul>
    </div>);
}
function NepalHere({ S }) {
  if (!nepIn(S)) return <p className="t-small faint">Nepal are not at this World Cup.</p>;
  const fx = S.fx.filter((f) => f.a === 'NEP' || f.b === 'NEP').sort((a, b) => a.d - b.d); const names = info(S).stages;
  return <ul className="mlist">{fx.map((f) => { const o = f.a === 'NEP' ? f.b : f.a; const r = f.res; const won = r && r.w === 'NEP'; const sc = (t) => { const x = r && r.sc.find((z) => z[0] === t); return x ? `${x[1]}/${x[2]}` : ''; };
    return <li key={f.id}><span className="grow">{r ? `${won ? 'Beat' : 'Lost to'} ${nm(o)}` : `v ${nm(o)}`}<br /><span className="l2">{names[f.stage]} · {short(f.d)}{r ? ` · Nepal ${sc('NEP')}, ${nm(o)} ${sc(o)}` : ''}</span></span><span className={`t-small ${r ? (won ? 'blu' : 'crim') : 'faint'}`}>{r ? (won ? 'W' : 'L') : 'Next'}</span></li>; })}</ul>;
}
function Road({ S }) {
  const names = info(S).stages; const reached = (k) => S.fx.some((f) => f.stage === k && (f.a === 'NEP' || f.b === 'NEP')) || (S.dg && S.dg[k] && S.dg[k].flat().includes('NEP'));
  return <ol className="mlist">{names.map((n, k) => <li key={n} style={{ padding: '8px 0' }}><span className="grow">{n}</span><span className={`t-small ${reached(k) ? 'blu' : 'faint'}`}>{S.champ === 'NEP' && k === names.length - 1 ? 'Won' : reached(k) ? 'Reached' : k > S.stage ? 'To come' : '—'}</span></li>)}</ol>;
}
function Leaders({ S }) {
  const { G } = useGame(); const L = leadersOf(G, S, 5); const row = (x, v) => <tr key={x.id}><td className={x.nat === 'NEP' ? 'b6' : ''}>{x.name}<span className="faint">, {nm(x.nat)}</span></td><td className="r">{v}</td></tr>;
  return <div><h2 className="sec">Leaders · in-game</h2>
    <table className="tbl compact plain"><thead><tr><th>Most runs</th><th /></tr></thead><tbody>{L.runs.map((x) => row(x, x.r))}</tbody></table>
    <table className="tbl compact plain" style={{ marginTop: 10 }}><thead><tr><th>Most wickets</th><th /></tr></thead><tbody>{L.wkts.map((x) => row(x, x.w))}</tbody></table>
    {!L.runs.length && <p className="t-small faint">No games yet.</p>}</div>;
}
function Others({ cur, onPick }) {
  const { G } = useGame(); const L = cupsOf(G);
  return <div><h2 className="sec">World Cups in your save</h2><ul className="mlist">{L.map((S) => <li key={S.id} style={{ padding: '8px 0', ...(S === cur ? { boxShadow: 'inset 3px 0 0 var(--crimson-solid)', paddingLeft: 10 } : {}) }}><span className="grow t-small"><button type="button" className="linkbtn" onClick={() => onPick(S.id)}>{sbase(S).replace("ICC Men's ", '')}</button><br /><span className="l2">{S.done ? `${nm(S.champ)} won` : 'In-game'}</span></span><span className="t-small mut">{nepIn(S) ? `Nepal: ${cupStage(S, 'NEP')}` : 'Nepal not there'}</span></li>)}
    <li style={{ padding: '8px 0' }}><span className="grow t-small"><Link to="/international?tab=tests">World Test Championship</Link><br /><span className="l2">The table, the series and the final</span></span><span className="t-small mut">Tests</span></li>
    {(G.s.world.wcHist || []).map((h) => <li key={h.name} style={{ padding: '8px 0' }}><span className="grow t-small">{h.name}<br /><span className="l2">{h.champ} won · an older save's light simulation</span></span><span className="t-small mut">Nepal: {h.nepal}</span></li>)}</ul></div>;
}
// Before the first World Cup of the save: the real 2026 tournament and the road to the next ones.
function Before() {
  const { G } = useGame(); const ps = pathState(G); const t2 = t20State(G);
  return (
    <div className="split wd-split">
      <section className="stack" style={{ gap: 20, minWidth: 0 }}>
        <div><h2 className="t-h3" style={{ marginBottom: 8 }}>Nepal at the {T20WC_2026.name}</h2>
          <ul className="mlist">{T20WC_2026.nepal.res.map((x) => <li key={x.v}><span className="grow">{x.r === 'W' ? `Beat ${x.v} ${x.m}` : `Lost to ${x.v}`}{x.line && <><br /><span className="l2">{x.line}</span></>}</span><span className={`t-small ${x.r === 'W' ? 'blu' : 'crim'}`}>{x.r}</span></li>)}</ul>
          <p className="t-small mut" style={{ marginTop: 8 }}>{T20WC_2026.note}</p></div>
      </section>
      <aside className="stack" style={{ gap: 18, minWidth: 0 }}>
        <div><h2 className="sec">Next World Cups</h2><ul className="mlist">
          <li style={{ padding: '8px 0' }}><span className="grow">{ps.cup.name}<br /><span className="l2">{ps.cup.hosts} · Oct–Nov {ps.W}</span></span><span className="t-small faint">{ps.title.replace(/^Road to the \d+ World Cup$/, 'Via the Qualifier')}</span></li>
          <li style={{ padding: '8px 0' }}><span className="grow">{t2.name}<br /><span className="l2">{t2.hosts} · from {dayLabel(t2.start)}</span></span><span className="t-small faint">{t2.status}</span></li></ul></div>
        <p className="faint t-micro">Hosts and formats as announced by the ICC; the fields are decided in your save. <Link to="/international">The pathway ›</Link></p>
      </aside>
    </div>);
}

export default function WorldCup() {
  const { G, update } = useGame(); const narrow = useNarrow(); const [q, setQ] = useSearchParams();
  useEffect(() => { worldTick(G); autosave(G); update(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const S = G.s.wd ? pick(G, q.get('id')) : null; const onPick = (id) => setQ({ id });
  if (!S) {
    const hero = <section className="board wd-occ"><div className="stack" style={{ gap: 8 }}><span className="blbl" style={{ color: 'var(--wd-gold)', fontSize: 14 }}>{T20WC_2026.name} · {T20WC_2026.hosts} · {T20WC_2026.when} · real result</span><span className="bf wd-occ-t">Nepal: group stage, one win</span><span className="blbl" style={{ fontSize: 14 }}>India beat New Zealand {T20WC_2026.finalM} in the final</span></div></section>;
    if (narrow) return <MScreen top={{ title: tn(G, 'World Cup'), sub: '2026 · history' }} pinRaw={<div className="wd-mhero">{hero}</div>}><Before /></MScreen>;
    return <div className="wd" style={{ maxWidth: 1220 }}>{hero}<div style={{ marginTop: 28 }}><Before /></div></div>;
  }
  const main = <section className="stack" style={{ gap: 26, minWidth: 0 }}><Phases key={S.id} S={S} /><div><h2 className="t-h3" style={{ marginBottom: 8 }}>Nepal at this World Cup</h2><NepalHere S={S} /></div></section>;
  const side = <aside className="stack" style={{ gap: 22, minWidth: 0 }}>{nepIn(S) && <div><h2 className="sec">Nepal's road</h2><Road S={S} /></div>}<Leaders S={S} /><Others cur={S} onPick={onPick} />
    <p className="faint t-micro">Hosts, dates and format follow the ICC's announcements; the field and every result are simulated in your save.</p></aside>;
  if (narrow) return (
    <MScreen top={{ title: tn(G, 'World Cup'), sub: `${S.y} · in-game` }} pinRaw={<div className="wd-mhero"><Hero S={S} /></div>}>
      <div className="stack" style={{ gap: 22, paddingTop: 8 }}>{main}{side}</div>
    </MScreen>);
  return (
    <div className="wd" style={{ maxWidth: 1220 }}>
      <Hero S={S} />
      <div className="split wd-split">{main}{side}</div>
    </div>);
}
