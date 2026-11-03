import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { Dot } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { useNarrow } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { nm, tableOf, teamRank, decideClash, afterWinter } from '../game/world.js';
import { PATHWAY, WORLD_CUPS, T20WC_2026, T20WC_2024 } from '../game/world-data.js';
import '../styles/world.css';

const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const fromCompact = (rows) => rows.map((r) => ({ code: r[0], p: r[1], w: r[2], l: r[3], nr: r[4], pts: r[5] }));

// Where Nepal stand on the 50-over pathway, and what comes next.
export function pathState(G) {
  const w = G.s.world; const nextODI = WORLD_CUPS.filter((c) => c.fmt === 'ODI' && c.y >= G.year - 1).find((c) => !w.wcHist.some((h) => h.y === c.y && h.fmt === 'ODI')) || { y: (w.l2.to || 2031), name: `ODI World Cup ${w.l2.to}`, hosts: 'Hosts not yet named', when: `${w.l2.to}` };
  const q = w.qual[`odi${nextODI.y}`];
  if (!w.po) return { stage: 'po', cup: nextODI, title: `Road to the ${nextODI.y} World Cup`, next: 'Next: ICC CWC Qualifier Play-off · Dec 4–21, 2026 · Kirtipur and Mulpani · a real fixture, played in your save' };
  if (q) return { stage: 'wc', cup: nextODI, title: `Nepal are going to the ${nextODI.y} World Cup`, next: `${nextODI.name} · ${nextODI.hosts} · ${nextODI.when} · qualified in your save` };
  const C = w.tier === 'cl' ? w.cl : w.l2; const name = w.tier === 'cl' ? 'Challenge League' : 'CWC League 2';
  return { stage: w.tier, cup: nextODI, title: `Road to the ${nextODI.y > C.to ? C.to : nextODI.y} World Cup`, next: `Now: ${name} ${C.from}–${String(C.to).slice(2)} · tables and rankings are in-game` };
}

function Table({ rows, cut = 4, status, title, sub }) {
  const { G } = useGame();
  return (
    <div>
      <div className="wd-th"><h2 className="t-h3">{title}</h2><span className="faint t-small">in-game</span></div>
      <table className="tbl compact plain" style={{ marginTop: 6 }}>
        <thead><tr><th style={{ paddingLeft: 0 }}>#</th><th>Team</th><th className="r">P</th><th className="r">W</th><th className="r">L</th><th className="r">NR</th><th className="r">Pts</th>{status && <th />}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.code} className={`${r.code === 'NEP' ? 'me' : ''}${i === cut - 1 ? ' cut' : ''}`}><td style={{ paddingLeft: 0 }}>{i + 1}</td><td style={r.code === 'NEP' ? { fontWeight: 600 } : undefined}>{nm(r.code)}</td><td className="r">{r.p}</td><td className="r">{r.w}</td><td className="r">{r.l}</td><td className="r">{r.nr}</td><td className="r b6">{r.pts}</td>{status && <td className={`t-small ${i < cut ? 'blu' : 'faint'}`}>{status(i)}</td>}</tr>)}</tbody>
      </table>
      {sub && <p className="faint t-micro" style={{ marginTop: 6 }}>{sub}</p>}
    </div>);
}

function Clash() {
  const { G, update, toast } = useGame(); const c = G.s.world.clash; if (!c || c.y !== G.year) return null;
  const names = c.pids.map((id) => G.P(id).name);
  const go = (k) => update(() => { const r = decideClash(G, k); autosave(G); if (r) toast(r.outcome); });
  return (
    <div className="panel stack" style={{ gap: 8 }}>
      <h2 className="sec" style={{ margin: 0 }}>{T(G, 'Clash with your calendar', 'तालिका टकराव')}</h2>
      <p className="t-small">The {c.comp} ({c.when}, in-game) overlaps your pre-season camp by {c.days} days. {names.join(', ')} {names.length > 1 ? 'are' : 'is'} likely to be with Nepal.</p>
      {c.status === 'open' ? <>
        <ul className="wd-fx"><li><span className="blu">Move the camp:</span> Rs 3 L; everyone trains together.</li><li><span className="crim">Train without them:</span> free; they start the NPL 8 fitness down.</li></ul>
        <div className="row" style={{ gap: 8 }}><button type="button" className="btn btn-sm btn-blue" onClick={() => go('move')}>{T(G, 'Move the camp', 'क्याम्प सार्नुहोस्')}</button><button type="button" className="btn btn-sm" onClick={() => go('without')}>{T(G, 'Train without them', 'उनीहरूबिना प्रशिक्षण')}</button></div></>
        : <p className="t-small mut">You chose: {c.status === 'move' ? 'Move the camp' : 'Train without them'}{c.how !== 'you' ? ` (${c.how === 'assistant' ? 'assistant' : 'not answered in time'})` : ''}. {c.outcome}</p>}
    </div>);
}

function MyPlayers() {
  const { G } = useGame(); const N = G.s.nepal; const squad = (N.lastSquad && N.lastSquad.length ? N.lastSquad : G.pickNepal().squad);
  const mine = squad.filter((id) => G.P(id) && G.P(id).team === G.user);
  return (
    <div>
      <h2 className="sec">Your players in the Nepal squad</h2>
      {mine.length ? <ul className="mlist">{mine.map((id) => { const p = G.P(id); const odi = (p.intlLog || []).filter((x) => x.fmt === 'ODI'); const r = odi.reduce((a, x) => a + x.r, 0), w = odi.reduce((a, x) => a + x.w, 0); const first = !(G.intlCaps(p) || 0);
        return <li key={id}><span className="grow"><Link to={`/player/${id}?tab=nepal`} className="b6" style={{ color: 'inherit' }}>{p.name}</Link>{G.teams[G.user].captainId === id ? ' (c)' : ''}<br /><span className="l2">{odi.length ? `ODIs in your save: ${r} runs, ${w} wickets` : 'No ODIs in your save yet'}</span></span><span className={`t-small ${first ? 'gld' : 'blu'}`}>{first ? 'First call-up' : 'Called up'}</span></li>; })}</ul>
        : <p className="t-small faint">None of your players are in the squad.</p>}
      <p className="faint t-micro" style={{ marginTop: 6 }}>A strong winter with Nepal lifts form and can add a rating point; a poor one costs form. Each series also costs fitness.</p>
    </div>);
}

function Record() {
  const { G } = useGame(); const w = G.s.world;
  const list = [...w.wcHist.slice().reverse().map((h) => [`${h.name} · ${h.hosts}`, `${h.nepal}${h.wins ? ` · ${h.wins} win${h.wins > 1 ? 's' : ''}` : ''} · in-game`]),
    [`${T20WC_2026.name} · ${T20WC_2026.hosts}`, 'Group stage · beat Scotland'], [`${T20WC_2024.name} · ${T20WC_2024.hosts}`, 'Group stage']];
  if (w.l2.prev || w.l2.done) { const rows = w.l2.prev ? fromCompact(w.l2.prev.rows) : tableOf(w.l2.rows); const i = rows.findIndex((r) => r.code === 'NEP'); const c = w.l2.prev || w.l2; if (i >= 0) list.push([`CWC League 2 · ${c.from}–${String(c.to).slice(2)}`, `${ord(i + 1)} · in-game`]); }
  return <div><h2 className="sec">Nepal's recent record</h2><ul className="mlist">{list.map(([a, b]) => <li key={a} style={{ padding: '8px 0' }}><span className="grow t-small">{a}</span><span className="t-small mut">{b}</span></li>)}</ul></div>;
}

function NepalTab() {
  const { G } = useGame(); const w = G.s.world; const ps = pathState(G);
  const C = w.tier === 'cl' ? w.cl : w.l2; const cur = tableOf(C.rows); const curName = w.tier === 'cl' ? 'Challenge League' : 'CWC League 2';
  const finalL2 = w.l2.prev ? { ...w.l2.prev, rows: fromCompact(w.l2.prev.rows) } : w.l2.done ? { from: w.l2.from, to: w.l2.to, rows: tableOf(w.l2.rows) } : null;
  return (
    <div className="split wd-split">
      <section className="stack" style={{ gap: 28, minWidth: 0 }}>
        <div>
          <h2 className="t-h3" style={{ marginBottom: 4 }}>The 50-over pathway</h2>
          <p className="mut t-small" style={{ marginBottom: 12 }}>Three tiers feed the World Cup. The highlighted step is where Nepal are in your save.</p>
          <ol className="wd-path">{PATHWAY.map(([k, label, sub]) => { const on = k === ps.stage; return (
            <li key={k} className={on ? 'on' : ''}><span className={k === 'wc' ? 'gld b6' : 'b6'}>{k === 'wc' ? ps.cup.name : label}</span><span className={`t-small${on ? '' : ' mut'}`}>{on && <b>Nepal are here. </b>}{k === 'wc' ? `${ps.cup.hosts} · ${ps.cup.when}` : sub}</span></li>); })}</ol>
        </div>
        {!finalL2 || (C !== w.l2 || !w.l2.done) ? <Table title={`${curName} · ${C.from}–${String(C.to).slice(2)}${C.done ? ' · final table' : ''}`} rows={cur} cut={w.tier === 'cl' ? 2 : 4} status={cur.every((r) => !r.p) ? null : (i) => (w.tier === 'cl' ? (i < 2 ? 'Play-off' : '') : i < 4 ? 'Qualifier' : 'Play-off')} sub={cur.every((r) => !r.p) ? 'The cycle starts with the tri-series in your next pre-season.' : 'Simulated in your save, including Nepal’s ODIs played with the match engine.'} /> : null}
        {finalL2 && <Table title={`CWC League 2 · ${finalL2.from}–${String(finalL2.to).slice(2)} · final table`} rows={finalL2.rows} status={(i) => (i < 4 ? 'Qualifier' : 'Play-off')} sub={finalL2.from === 2023 ? 'The eight teams are the real 2023–27 field. The table is in-game, not the real standings; Nepal’s place in the bottom four matches the real December 2026 Play-off in Kathmandu.' : 'In-game.'} />}
        {w.po && <Table title={`Qualifier Play-off · ${w.po.y}`} rows={fromCompact(w.po.rows)} status={(i) => (i < 4 ? 'Qualifier' : 'Drops a tier')} sub={w.po.nepW != null ? `Nepal's ${w.po.nepW} wins come from the five Play-off games played with the match engine.` : 'In-game.'} />}
        {w.wcq && <Table title={`World Cup Qualifier · ${w.wcq.y}`} rows={fromCompact(w.wcq.rows)} status={(i) => (i < 4 ? 'World Cup' : '')} sub={`The top four go to the ${w.wcq.cup} in your save.`} />}
      </section>
      <aside className="stack" style={{ gap: 22, minWidth: 0 }}>
        <MyPlayers />
        <Clash />
        <Record />
        <p className="t-small"><Link to="/nepal">Squad, calendar and central contracts ›</Link></p>
      </aside>
    </div>);
}

function CompsTab() {
  const { G } = useGame(); const w = G.s.world; const ps = pathState(G);
  const rows = [[T20WC_2026.name, T20WC_2026.when, T20WC_2026.hosts, 'Group stage, 1 win', 'Played', 'faint']];
  const l2 = w.l2.prev || (w.l2.done ? w.l2 : null);
  if (l2) { const t = w.l2.prev ? fromCompact(w.l2.prev.rows) : tableOf(w.l2.rows); const i = t.findIndex((r) => r.code === 'NEP'); rows.push([`CWC League 2`, `${l2.from}–${String(l2.to).slice(2)}`, 'Tri-series', i >= 0 ? ord(i + 1) : '—', 'Finished · in-game', 'blu', i >= 0]); }
  rows.push(['Qualifier Play-off', w.po ? `Dec ${w.po.y}` : 'Dec 4–21, 2026', 'Kirtipur and Mulpani', w.po ? (w.po.top.includes('NEP') ? 'Through' : w.po.rows.some((r) => r[0] === 'NEP') ? 'Out' : 'Not needed') : 'Playing', w.po ? 'Played · in-game' : 'Next', w.po ? 'faint' : 'crim', true]);
  if (w.wcq) rows.push(['World Cup Qualifier', `${w.wcq.y}`, 'In-game venue', w.wcq.top.includes('NEP') ? 'Qualified' : w.wcq.rows.some((r) => r[0] === 'NEP') ? 'Missed out' : 'Not reached', 'Played · in-game', 'faint', true]);
  if (!w.l2.done) rows.push([w.tier === 'cl' ? 'Challenge League' : 'CWC League 2', `${(w.tier === 'cl' ? w.cl : w.l2).from}–${String((w.tier === 'cl' ? w.cl : w.l2).to).slice(2)}`, 'Tri-series', 'Playing', 'Under way · in-game', 'blu', true]);
  for (const c of WORLD_CUPS.filter((c) => c.y >= G.year - 1)) { const h = w.wcHist.find((x) => x.y === c.y && x.fmt === c.fmt); const q = w.qual[`${c.fmt === 'ODI' ? 'odi' : 't20'}${c.y}`];
    rows.push([c.name, c.when, c.hosts, h ? h.nepal : q === true ? 'Qualified' : q === false ? 'Did not qualify' : c.fmt === 'ODI' ? 'Needs a top finish at the Qualifier' : 'Route through the regional qualifier', h ? `${h.champ} won · in-game` : 'Later', 'faint']); }
  rows.push(['World Test Championship', `${w.wtc.from}–${String(w.wtc.to).slice(2)}`, 'Full members only', 'Not eligible', 'Long-term goal', 'dim']);
  return (
    <div style={{ marginTop: 24 }}>
      <div className="tblwrap"><table className="tbl"><thead><tr><th>Competition</th><th>When</th><th>Where</th><th>Nepal</th><th>Status</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0] + r[1]} className={r[5] === 'dim' ? 'dim' : r[6] ? 'me' : ''}><td className="name">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td><td className={r[5] === 'dim' ? '' : r[5]}>{r[4]}</td></tr>)}</tbody></table></div>
      <p className="faint t-small" style={{ marginTop: 8 }}>Hosts follow the ICC's announcements; field sizes and formats after October 2026 are the game's. Everything after the save starts is simulated. Next for Nepal: {ps.next.replace(/^Next: |^Now: /, '')}.</p>
    </div>);
}

function SeriesTab() {
  const { G } = useGame(); const f = G.s.world.feed;
  return (
    <div style={{ marginTop: 20 }}>
      <p className="faint t-small">Around the world · in-game</p>
      {f.length ? <ul className="inbox">{f.map((x, i) => <li key={i}><span className="when">{x.when}</span><div><p className="ttl">{x.nep && <span className="crim b6">Nepal · </span>}{x.t}</p>{x.sub && <p className="mut t-small">{x.sub}</p>}</div></li>)}</ul>
        : <p className="t-small faint">The first series around the world are played after the NPL final, alongside Nepal's winter.</p>}
    </div>);
}

export default function International() {
  const { G, update } = useGame(); const narrow = useNarrow();
  useEffect(() => { if (afterWinter(G)) { autosave(G); update(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useTab(['nepal', 'comps', 'series'], 'nepal'); const w = G.s.world; const ps = pathState(G);
  const C = w.tier === 'cl' ? w.cl : w.l2; const pos = (() => { const src = C.done && w.l2.done && !w.l2.prev ? tableOf(w.l2.rows) : tableOf(C.rows); const i = src.findIndex((r) => r.code === 'NEP'); return src.every((r) => !r.p) ? '—' : i >= 0 ? ord(i + 1) : '—'; })();
  const odi = teamRank(G, 'odi'), t20 = teamRank(G, 't20i');
  const tabs = [['nepal', tn(G, 'Nepal')], ['comps', T(G, 'Competitions', 'प्रतियोगिता')], ['series', T(G, 'Series around the world', 'विश्वभरका शृंखला')]];
  const hero = (
    <section className="board wd-hero" aria-label="Nepal">
      <div className="wd-hero-in">
        <div className="stack" style={{ gap: 6 }}>
          <span className="blbl wd-flagline"><span className="wd-flag" aria-hidden="true" />Nepal · men's team</span>
          <span className="bf wd-hero-t">{ps.title}</span>
          <span className="blbl" style={{ fontSize: 14 }}>{ps.next}</span>
        </div>
        <div className="cells" style={{ gap: '10px 28px' }}>
          <div className="cell"><span className="blbl">{w.tier === 'cl' ? 'Challenge League' : 'League 2'}</span><span className="bf mid">{pos}</span></div>
          <div className="cell"><span className="blbl">ODI ranking</span><span className="bf mid">{odi ? odi.pos : '—'}</span></div>
          <div className="cell"><span className="blbl">T20I ranking</span><span className="bf mid">{t20 ? t20.pos : '—'}</span></div>
        </div>
      </div>
    </section>);
  const body = tab === 'nepal' ? <NepalTab /> : tab === 'comps' ? <CompsTab /> : <SeriesTab />;
  if (narrow) return (
    <MScreen top={{ title: <><Dot id={G.user} />{tn(G, 'International')}</>, sub: 'in-game', right: <>ODI {odi ? odi.pos : '—'}<br />T20I {t20 ? t20.pos : '—'}</> }} pinRaw={<div className="wd-mhero">{hero}</div>}
      tabs={[['nepal', tn(G, 'Nepal')], ['comps', T(G, 'Competitions', 'प्रतियोगिता')], ['series', T(G, 'Series', 'शृंखला')]]} tab={tab} onTab={setTab} label="International sections">
      {body}
    </MScreen>);
  return (
    <div className="wd" style={{ maxWidth: 1220 }}>
      {hero}
      <div className="tabs wd-tabs" role="tablist" aria-label="International sections">
        {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        <span style={{ flex: 1 }} /><Link className="btn btn-sm" to="/worldcup">{tn(G, 'World Cup')}</Link><Link className="btn btn-sm" to="/rankings">{tn(G, 'Rankings')}</Link>
      </div>
      {body}
    </div>);
}
