import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { Dot } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { useNarrow } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { nm, LABEL, wtcTable, afterWinter, whoRanked } from '../game/world.js';
import { COUNTRY_NAMES } from '../game/data.js';
import '../styles/world.css';

const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const move = (rank, prev) => (prev == null ? ['new', 'faint'] : prev === rank ? ['–', 'faint'] : prev > rank ? [`▲ ${prev - rank}`, 'up'] : [`▼ ${rank - prev}`, 'down']);
const TABS = [['teams', 'Teams', 'टोली'], ['bat', 'Batters', 'ब्याटर'], ['bowl', 'Bowlers', 'बलर'], ['ar', 'All-rounders', 'अलराउन्डर']];

// Rows for one list: the top ten, then Nepal and Nepali players further down.
function rowsFor(G, tab, fmt) {
  const w = G.s.world;
  if (tab === 'teams') { const L = w.trk[fmt] || []; const out = L.slice(0, 10).map((r, i) => ({ k: r[0], n: i + 1, name: nm(r[0]), sub: '', rt: r[1], mv: move(i + 1, r[2]), nep: r[0] === 'NEP' }));
    const i = L.findIndex((r) => r[0] === 'NEP'); if (i >= 10) out.push({ k: 'gap', gap: true }, { k: 'NEP', n: i + 1, name: 'Nepal', sub: '', rt: L[i][1], mv: move(i + 1, L[i][2]), nep: true }); return out; }
  const L = (w.prk && w.prk[fmt] && w.prk[fmt][tab]) || []; const out = []; let gap = false; let extra = 0;
  for (const r of L) { const p = whoRanked(G, r[0]); if (!p) continue; const nep = p.nat === 'NEP'; if (r[2] > 10 && !nep) continue; if (r[2] > 10 && ++extra > 8) break; if (r[2] > 10 && !gap) { out.push({ k: 'gap', gap: true }); gap = true; }
    out.push({ k: p.id, n: r[2], name: p.name, sub: COUNTRY_NAMES[p.nat] || nm(p.nat), rt: r[1], mv: move(r[2], r[3]), nep, mine: p.team === G.user, team: p.team }); }
  return out;
}
function bestNep(G, fmt, k) { const L = (G.s.world.prk && G.s.world.prk[fmt] && G.s.world.prk[fmt][k]) || []; const r = L.find((x) => G.P(x[0]) && G.P(x[0]).nat === 'NEP'); return r ? `${G.P(r[0]).name} · ${ord(r[2])}` : 'Outside the list'; }

function List({ tab, fmt }) {
  const { G } = useGame(); const rows = rowsFor(G, tab, fmt);
  return (
    <div className="tblwrap"><table className="tbl">
      <thead><tr><th className="r" style={{ width: 50 }}>#</th><th>{tab === 'teams' ? 'Team' : 'Player'}</th>{tab !== 'teams' && <th>Team</th>}<th className="r">Rating</th><th className="r">Move</th></tr></thead>
      <tbody>{rows.map((r) => r.gap ? <tr key={`gap${r.n || ''}`} className="dim"><td className="r" /><td>…</td>{tab !== 'teams' && <td />}<td /><td /></tr> : (
        <tr key={r.k} className={r.nep ? 'me' : ''}><td className="r">{r.n}</td><td className="name">{r.mine && <><Dot id={r.team} /> </>}{r.name}</td>{tab !== 'teams' && <td className="mut">{r.sub}</td>}<td className="r num">{r.rt}</td><td className={`r ${r.mv[1]}`}>{r.mv[0]}</td></tr>))}
        {!rows.length && <tr><td colSpan={5} className="faint t-small">No ratings yet.</td></tr>}</tbody></table></div>);
}
function Glance({ fmt }) {
  const { G } = useGame(); const w = G.s.world; const tr = (f) => { const L = w.trk[f] || []; const i = L.findIndex((r) => r[0] === 'NEP'); if (i < 0) return '—'; const m = move(i + 1, L[i][2]); return <>{ord(i + 1)} {m[0] !== '–' && m[0] !== 'new' && <span className={`${m[1]} t-small`}>{m[0]}</span>}</>; };
  const F = fmt === 'odi' ? 'ODI' : 'T20I';
  return (
    <div className="panel stack" style={{ gap: 8 }}>
      <h2 className="sec" style={{ margin: 0 }}>{T(G, 'Nepal at a glance', 'नेपाल एक नजरमा')}</h2>
      <table className="tbl plain compact"><tbody>
        <tr><td style={{ paddingLeft: 0 }} className="mut">T20I team</td><td className="r">{tr('t20i')}</td></tr>
        <tr><td style={{ paddingLeft: 0 }} className="mut">ODI team</td><td className="r">{tr('odi')}</td></tr>
        <tr><td style={{ paddingLeft: 0 }} className="mut">Best batter</td><td className="r">{bestNep(G, fmt, 'bat')} {F}</td></tr>
        <tr><td style={{ paddingLeft: 0 }} className="mut">Best bowler</td><td className="r">{bestNep(G, fmt, 'bowl')} {F}</td></tr>
        <tr><td style={{ paddingLeft: 0 }} className="mut">Best all-rounder</td><td className="r">{bestNep(G, fmt, 'ar')} {F}</td></tr>
      </tbody></table>
    </div>);
}
function WTC() {
  const { G } = useGame(); const C = G.s.world.wtc; const t = wtcTable(C); const last = C.past && C.past[C.past.length - 1];
  return (
    <div>
      <div className="wd-th"><h2 className="sec">World Test Championship {C.from}–{String(C.to).slice(2)}</h2><span className="faint t-micro">in-game</span></div>
      {t.length ? <table className="tbl compact plain"><thead><tr><th style={{ paddingLeft: 0 }}>#</th><th>Team</th><th className="r">Played</th><th className="r">PCT</th></tr></thead>
        <tbody>{t.map((r, i) => <tr key={r.code} className={i === 1 ? 'cut' : ''}><td style={{ paddingLeft: 0 }}>{i + 1}</td><td>{nm(r.code)}</td><td className="r">{r.p}</td><td className="r">{r.pct.toFixed(1)}</td></tr>)}</tbody></table>
        : <p className="t-small faint">No Tests played yet in this cycle. The table starts with the save; real results before it are not included.</p>}
      <p className="faint t-micro" style={{ marginTop: 6 }}>Top two meet in the final.{last ? ` Last final: ${last.champ} beat ${last.runner} (in-game).` : ''} Nepal play no Tests; Test status is a long-term goal.</p>
    </div>);
}

export default function Rankings() {
  const { G, update } = useGame(); const narrow = useNarrow();
  useEffect(() => { if (afterWinter(G)) { autosave(G); update(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useTab(TABS.map((t) => t[0]), 'teams'); const [fmt, setFmt] = useTab(['t20i', 'odi'], 't20i', 'fmt');
  const seg = <div className="seg" role="group" aria-label="Format">{[['t20i', 'T20I'], ['odi', 'ODI']].map(([k, l]) => <button key={k} type="button" className={fmt === k ? 'on' : ''} onClick={() => setFmt(k)}>{l}</button>)}</div>;
  const foot = <p className="faint t-small" style={{ marginTop: 8 }}>Nepal and Nepali players are highlighted; your players carry a dot. Players from the save and generated players for the stronger nations. Ratings are {LABEL}, recalculated after each simulated international{G.s.world.rankAt ? ` (last: off-season ${G.s.world.rankAt})` : ''}.</p>;
  if (narrow) return (
    <MScreen top={{ title: tn(G, 'Rankings'), sub: LABEL, right: seg }} tabs={TABS.map(([k, l, n]) => [k, T(G, l, n)])} tab={tab} onTab={setTab} label="Ranking lists">
      <div style={{ paddingTop: 8 }}><List tab={tab} fmt={fmt} />{foot}</div>
      <div className="stack" style={{ gap: 18, marginTop: 16 }}><Glance fmt={fmt} /><WTC /></div>
    </MScreen>);
  return (
    <div className="wd" style={{ maxWidth: 1220 }}>
      <div className="pagehead">
        <div className="stack" style={{ gap: 4 }}><h1 className="t-h1">{tn(G, 'Rankings')}</h1><p className="mut">The game's own ratings, not the ICC's. Real players and teams, simulated results from October 2026 on.</p></div>
        {seg}
      </div>
      <div className="tabs wd-tabs" role="tablist" aria-label="Ranking">{TABS.map(([k, l, n]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{T(G, l, n)}</button>)}<span style={{ flex: 1 }} /><Link className="btn btn-sm" to="/international">{tn(G, 'International')}</Link></div>
      <div className="split wd-split">
        <section style={{ minWidth: 0 }}><List tab={tab} fmt={fmt} />{foot}</section>
        <aside className="stack" style={{ gap: 24, minWidth: 0 }}><Glance fmt={fmt} /><WTC /></aside>
      </div>
    </div>);
}
