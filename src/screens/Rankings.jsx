import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { Dot } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { useNarrow } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { nm, today, worldTick } from '../game/world.js';
import { LABEL, teamTable, playerTable, testRecords } from '../world/rankings.js';
import { wtcCurrent } from '../world/intl.js';
import { WTCTable } from './International.jsx';
import { label as dayLabel } from '../world/dates.js';
import '../styles/world.css';

const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const move = (rank, prev) => (prev == null ? ['–', 'faint'] : prev === rank ? ['–', 'faint'] : prev > rank ? [`▲ ${prev - rank}`, 'up'] : [`▼ ${rank - prev}`, 'down']);
const TABS = [['teams', 'Teams', 'टोली'], ['bat', 'Batters', 'ब्याटर'], ['bowl', 'Bowlers', 'बलर'], ['ar', 'All-rounders', 'अलराउन्डर']];
// Tests add the WTC table and the save's Test records
const TEST_TABS = [...TABS, ['wtc', 'WTC', 'WTC'], ['records', 'Records', 'कीर्तिमान']];
const F = (fmt) => (fmt === 'odi' ? 'ODI' : fmt === 'test' ? 'Test' : 'T20');

// Rows for one list: the top ten, then Nepal and Nepali players further down.
function rowsFor(G, tab, fmt, data) {
  if (tab === 'teams') { const L = data.teams; const out = L.slice(0, 10).map((r) => ({ k: r.code, n: r.rank, name: r.name, sub: `${r.matches} game${r.matches === 1 ? '' : 's'}`, rt: r.rating, mv: move(r.rank, r.prev), nep: r.code === 'NEP' }));
    const n = L.find((r) => r.code === 'NEP'); if (n && n.rank > 10) out.push({ k: 'gap', gap: true }, { k: 'NEP', n: n.rank, name: 'Nepal', sub: `${n.matches} games`, rt: n.rating, mv: move(n.rank, n.prev), nep: true }); return out; }
  const L = data.players[tab] || []; const out = []; let gap = false; let extra = 0;
  for (const r of L) { const nep = r.nat === 'NEP'; if (r.rank > 10 && !nep) continue; if (r.rank > 10 && ++extra > 8) break; if (r.rank > 10 && !gap) { out.push({ k: 'gap', gap: true }); gap = true; }
    out.push({ k: r.id, n: r.rank, name: r.name, sub: nm(r.nat), rt: r.rating, mv: move(r.rank, r.prev), nep, mine: r.team === G.user, team: r.team }); }
  return out;
}
function List({ tab, rows }) {
  return (
    <div className="tblwrap"><table className="tbl">
      <thead><tr><th className="r" style={{ width: 50 }}>#</th><th>{tab === 'teams' ? 'Team' : 'Player'}</th><th>{tab === 'teams' ? 'In the window' : 'Team'}</th><th className="r">Rating</th><th className="r">Move</th></tr></thead>
      <tbody>{rows.map((r, i) => r.gap ? <tr key={`gap${i}`} className="dim"><td className="r" /><td>…</td><td /><td /><td /></tr> : (
        <tr key={r.k} className={r.nep ? 'me' : ''}><td className="r">{r.n}</td><td className="name">{r.mine && <><Dot id={r.team} /> </>}{r.name}</td><td className="mut">{r.sub}</td><td className="r num">{r.rt}</td><td className={`r ${r.mv[1]}`}>{r.mv[0]}</td></tr>))}
        {!rows.length && <tr><td colSpan={5} className="faint t-small">No ratings yet. They come from international games played in your save.</td></tr>}</tbody></table></div>);
}
function Glance({ fmt, data, dataOther }) {
  const { G } = useGame(); const tr = (L) => { const r = L.find((x) => x.code === 'NEP'); if (!r) return '—'; const m = move(r.rank, r.prev); return <>{ord(r.rank)} {m[0] !== '–' && <span className={`${m[1]} t-small`}>{m[0]}</span>}</>; };
  const best = (k) => { const r = (data.players[k] || []).find((x) => x.nat === 'NEP'); return r ? `${r.name} · ${ord(r.rank)}` : 'Outside the list'; };
  const t20 = fmt === 't20i' ? data.teams : dataOther.teams, odi = fmt === 'odi' ? data.teams : dataOther.teams;
  return (
    <div className="panel stack" style={{ gap: 8 }}>
      <h2 className="sec" style={{ margin: 0 }}>{T(G, 'Nepal at a glance', 'नेपाल एक नजरमा')}</h2>
      <table className="tbl plain compact"><tbody>
        <tr><td style={{ paddingLeft: 0 }} className="mut">T20I team</td><td className="r">{tr(t20)}</td></tr>
        <tr><td style={{ paddingLeft: 0 }} className="mut">ODI team</td><td className="r">{tr(odi)}</td></tr>
        <tr><td style={{ paddingLeft: 0 }} className="mut">Best batter</td><td className="r">{best('bat')}</td></tr>
        <tr><td style={{ paddingLeft: 0 }} className="mut">Best bowler</td><td className="r">{best('bowl')}</td></tr>
        <tr><td style={{ paddingLeft: 0 }} className="mut">Best all-rounder</td><td className="r">{best('ar')}</td></tr>
      </tbody></table>
    </div>);
}
function How() {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <h2 className="sec" style={{ margin: 0 }}>How the ratings work</h2>
      <p className="t-small mut">Teams: every Test, ODI or T20I of the last three years earns points from the opponent's rating, more for beating a stronger side; the last two years count in full, and a drawn Test counts like a tie. Players: runs, wickets, average, strike rate and economy (in Tests mostly averages), weighted by the strength of the sides, with older seasons fading.</p>
      <p className="t-small mut">The World Test Championship table is the ICC's points system played out in your save. Challenge League games are List A, so they do not count.</p>
    </div>);
}
// Test records since the save began (in-game; real records before it are not counted).
function Records() {
  const { G } = useGame(); const R = useMemo(() => testRecords(G, 10), [G, G.s.wd && G.s.wd.day]); // eslint-disable-line react-hooks/exhaustive-deps
  const Tbl = ({ title, rows, val, sub }) => <section style={{ minWidth: 0 }}><h2 className="sec">{title}</h2><div className="tblwrap"><table className="tbl compact plain"><tbody>
    {rows.map((x, i) => <tr key={x.id} className={x.nat === 'NEP' ? 'me' : ''}><td style={{ paddingLeft: 0, width: 28 }} className="faint">{i + 1}</td><td className="name">{x.name}<span className="faint">, {nm(x.nat)}</span></td><td className="r faint t-small">{sub(x)}</td><td className="r b6 num">{val(x)}</td></tr>)}
    {!rows.length && <tr><td className="faint t-small" style={{ paddingLeft: 0 }}>No Tests played in your save yet.</td></tr>}</tbody></table></div></section>;
  return (
    <div className="stack" style={{ gap: 18 }}>
      <Tbl title="Most runs" rows={R.runs} val={(x) => x.r} sub={(x) => `${x.m} M · avg ${x.avg != null ? x.avg.toFixed(1) : '–'} · ${x.h} 100s`} />
      <Tbl title="Most wickets" rows={R.wkts} val={(x) => x.w} sub={(x) => `${x.m} M · avg ${x.bavg != null ? x.bavg.toFixed(1) : '–'}`} />
      <Tbl title="Highest score" rows={R.hs} val={(x) => x.hs} sub={(x) => `${x.m} M`} />
      <Tbl title="Best bowling in an innings" rows={R.best} val={(x) => `${x.bw}/${x.br}`} sub={(x) => `${x.m} M`} />
      <p className="faint t-micro">Records are {LABEL}: Tests played in your save only, from its start.</p>
    </div>);
}

export default function Rankings() {
  const { G, update } = useGame(); const narrow = useNarrow();
  useEffect(() => { worldTick(G); autosave(G); update(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab0, setTab] = useTab(TEST_TABS.map((t) => t[0]), 'teams'); const [fmt, setFmt] = useTab(['t20i', 'odi', 'test'], 't20i', 'fmt');
  const test = fmt === 'test'; const tabsNow = test ? TEST_TABS : TABS; const tab = !test && (tab0 === 'wtc' || tab0 === 'records') ? 'teams' : tab0;
  const day = G.s.wd ? today(G) : 0;
  const data = useMemo(() => (G.s.wd ? { teams: teamTable(G, F(fmt)), players: playerTable(G, F(fmt)) } : { teams: [], players: {} }), [G, fmt, day]); // eslint-disable-line react-hooks/exhaustive-deps
  const dataOther = useMemo(() => (G.s.wd ? { teams: teamTable(G, F(fmt === 't20i' ? 'odi' : 't20i')) } : { teams: [] }), [G, fmt, day]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = tab === 'wtc' || tab === 'records' ? [] : rowsFor(G, tab, fmt, data);
  const seg = <div className="seg" role="group" aria-label="Format" style={{ display: 'inline-flex', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>{[['t20i', 'T20I'], ['odi', 'ODI'], ['test', 'Test']].map(([k, l]) => <button key={k} type="button" className={fmt === k ? 'on' : ''} onClick={() => setFmt(k)}>{l}</button>)}</div>;
  const foot = <p className="faint t-small" style={{ marginTop: 8 }}>Nepal and Nepali players are highlighted; your players carry a dot. Ratings are {LABEL}, from international results in your save{day ? ` (as of ${dayLabel(day)})` : ''}. Players from the game's database and the NPL; movement is since the start of the month.</p>;
  const main = tab === 'wtc' ? (G.s.wd ? <WTCTable C={wtcCurrent(G)} /> : null) : tab === 'records' ? <Records /> : <><List tab={tab} rows={rows} />{foot}</>;
  const aside = <>{test ? (tab !== 'wtc' && G.s.wd ? <WTCTable C={wtcCurrent(G)} compact /> : null) : <Glance fmt={fmt} data={data} dataOther={dataOther} />}<How /></>;
  if (narrow) return (
    <MScreen top={{ title: tn(G, 'Rankings'), sub: LABEL, right: seg }} tabs={tabsNow.map(([k, l, n]) => [k, T(G, l, n)])} tab={tab} onTab={setTab} label="Ranking lists">
      <div style={{ paddingTop: 8 }}>{main}</div>
      <div className="stack" style={{ gap: 18, marginTop: 16 }}>{aside}</div>
    </MScreen>);
  return (
    <div className="wd" style={{ maxWidth: 1220 }}>
      <div className="pagehead">
        <div className="stack" style={{ gap: 4 }}><h1 className="t-h1">{tn(G, 'Rankings')}</h1><p className="mut">The game's own ratings, not the ICC's. Real players and teams; every result from October 2026 on is simulated.</p></div>
        {seg}
      </div>
      <div className="tabs wd-tabs" role="tablist" aria-label="Ranking">{tabsNow.map(([k, l, n]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{T(G, l, n)}</button>)}<span style={{ flex: 1 }} /><Link className="btn btn-sm" to="/international">{tn(G, 'International')}</Link></div>
      <div className="split wd-split">
        <section style={{ minWidth: 0 }}>{main}</section>
        <aside className="stack" style={{ gap: 24, minWidth: 0 }}>{aside}</aside>
      </div>
    </div>);
}
