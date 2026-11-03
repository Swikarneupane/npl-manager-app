import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { useNarrow } from '../lib/util.js';
import { T, tn } from '../lib/i18n.js';
import { nm, stageTable, leaders, playPendingLive, resolvePending, afterWinter } from '../game/world.js';
import { WORLD_CUPS, T20WC_2026 } from '../game/world-data.js';
import { winProbability } from '../game/winprob.js';
import '../styles/world.css';

const ovs = (b) => `${Math.floor(b / 6)}${b % 6 ? `.${b % 6}` : ''}`;
const nrr = (x) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2);
const EVC = { four: 'ev-four', six: 'ev-six', wkt: 'ev-wkt', crowd: 'ev-crowd', over: 'ev-dot', drop: 'ev-wkt' };

// The chase replayed ball by ball, with the win chance for Nepal.
function useReplay(live) {
  const [i, setI] = useState(0); const [on, setOn] = useState(true); const n = live ? live.lines.length : 0;
  useEffect(() => { setI(0); setOn(true); }, [live]);
  useEffect(() => { if (!on || !live || i >= n) return undefined; const t = setTimeout(() => setI((x) => x + 1), 650); return () => clearTimeout(t); }, [on, i, n, live]);
  const cur = live && n ? live.lines[Math.min(i, n) - 1] : null; const s = i >= n ? (live ? live.end : [0, 0, 0]) : cur ? cur.s : [0, 0, 0];
  const chaseNep = live && live.b === 'NEP'; const p = live ? winProbability({ runs: s[0], wkts: s[1], balls: s[2], maxBalls: live.maxB, target: live.target, par: live.maxB === 120 ? 160 : 265 }) : 0.5;
  const nepP = i >= n && live ? (/^Nepal won/.test(live.result) ? 1 : 0) : chaseNep ? p : 1 - p;
  return { i, n, done: i >= n, s, nepP, shown: live ? live.lines.slice(0, Math.min(i, n)).reverse().slice(0, 14) : [], skip: () => setI(n), on, setOn };
}
function Scoreboard({ wc, live, r }) {
  const chaser = nm(live.b); const need = live.target - r.s[0]; const left = live.maxB - r.s[2]; const pct = Math.round(r.nepP * 100);
  return (
    <section className="board wd-score" aria-label="Scoreboard">
      <div className="wd-th"><span className="blbl" style={{ color: 'var(--wd-gold)' }}>{wc.name} · in-game</span><span className="blbl">{(wc.res.find((x) => x.live) || {}).city || ''}</span></div>
      <p className="blbl" style={{ marginTop: 4 }}>{nm(live.a)} {live.s1[0]}/{live.s1[1]} ({ovs(live.s1[2])}) · {r.done ? live.result : need > 0 ? `${chaser} need ${need} off ${left}` : `${chaser} home`}</p>
      <div className="wd-th" style={{ alignItems: 'flex-end', marginTop: 2 }}>
        <div className="row" style={{ alignItems: 'baseline', gap: 8 }}><span className="bf wd-big">{r.s[0]}/{r.s[1]}</span><span className="bf" style={{ fontSize: 18, color: 'var(--board-ink-2)' }}>{ovs(r.s[2])}</span></div>
        <div className="stack" style={{ textAlign: 'right' }}><span className="blbl">{chaser} batting</span><span className="bf" style={{ fontSize: 20, color: 'var(--wd-gold)' }}>{r.done ? 'Full time' : 'Chase'}</span></div>
      </div>
      <div className="wd-wp"><span className="bf" style={{ fontSize: 14 }}>Nepal {pct}%</span><div className="wp" role="img" aria-label={`Win probability Nepal ${pct} percent`}><i style={{ width: `${pct}%`, background: 'var(--crimson-solid)' }} /><i style={{ width: `${100 - pct}%`, background: 'var(--board-rule)' }} /></div><span className="bf" style={{ fontSize: 14, color: 'var(--board-ink-2)' }}>{100 - pct}%</span></div>
    </section>);
}
function Feed({ r, both }) {
  return <ol className="feed">{r.shown.map((l, k) => <li key={`${r.i}-${k}`} className={`ev ${EVC[l.c] || ''}${k === 0 ? ' ev-new' : ''} wd-ev`}><span className="ov">{l.o}</span><span className="tx">{l.c === 'four' ? <span className="tag">4</span> : l.c === 'six' ? <span className="tag">6</span> : l.c === 'wkt' ? <span className="tag">W</span> : null}{l.t}{l.ne && <span className="ne">{l.ne}</span>}</span></li>)}
    {!r.shown.length && <li className="ev"><span className="ov" /><span className="tx">{both ? 'The chase begins.' : 'Play is about to start.'}</span></li>}</ol>;
}
function Mine({ live }) {
  if (!live.mine.length) return null;
  return <div className="panel stack" style={{ gap: 6, padding: '12px 14px' }}><p className="faint t-micro">Your players tonight</p><p className="t-small">{live.mine.map((m) => `${m[0].split(' ').slice(-1)[0]}${m[1] ? ` ${m[1]}` : ''}${m[2] ? ` · ${m[2]}` : ''}`).join(' · ')}</p></div>;
}

function Hero({ wc, go, busy }) {
  const { G } = useGame(); const p = wc.pending;
  if (p) { const opp = nm(p.a === 'NEP' ? p.b : p.a); return (
    <section className="board occasion wd-occ">
      <div className="wd-hero-in">
        <div className="stack" style={{ gap: 8 }}>
          <span className="blbl" style={{ color: 'var(--wd-gold)', fontSize: 14 }}>{wc.name} · {wc.hosts} · Group {p.st} · in-game</span>
          <span className="bf wd-occ-t">Nepal v {opp}</span>
          <span className="blbl" style={{ fontSize: 14 }}>{p.city ? `${p.city} · ` : ''}{p.scen}</span>
        </div>
        <div className="stack" style={{ gap: 8, alignItems: 'flex-end' }}>
          <span className="blbl">Group decider</span>
          <div className="row" style={{ gap: 8 }}><button type="button" className="btn wd-gold" disabled={busy} onClick={() => go('live')}>{busy ? 'Playing…' : T(G, 'Follow live', 'प्रत्यक्ष हेर्नुहोस्')}</button><button type="button" className="btn wd-ghost" disabled={busy} onClick={() => go('quick')}>{T(G, 'Result only', 'नतिजा मात्र')}</button></div>
        </div>
      </div>
      <p className="t-small wd-fans">Nepali fans have travelled{p.city ? ` to ${p.city}` : ''} from across the region. The stand is crimson and blue.</p>
    </section>); }
  const title = !wc.nepIn ? 'Nepal did not qualify' : `Nepal: ${wc.nepStage || 'Group stage'}`;
  return (
    <section className={`board wd-occ${wc.nepIn && wc.nepStage !== 'Group stage' ? ' occasion' : ''}`}>
      <div className="stack" style={{ gap: 8 }}>
        <span className="blbl" style={{ color: 'var(--wd-gold)', fontSize: 14 }}>{wc.name} · {wc.hosts} · {wc.real ? 'real result' : 'in-game'}</span>
        <span className="bf wd-occ-t">{title}</span>
        <span className="blbl" style={{ fontSize: 14 }}>{wc.champ ? `${nm(wc.champ)} beat ${nm(wc.runner)} ${wc.finalM} in the final` : ''}</span>
      </div>
    </section>);
}

function Groups({ wc }) {
  const keys = [...Object.keys(wc.groups), ...(wc.s8 ? ['X', 'Y'] : [])]; const nepG = keys.find((k) => (wc.groups[k] || []).includes('NEP')) || keys[0];
  const [g, setG] = useState(nepG); const t = stageTable(wc, g); const left = (c) => { const p = wc.pending; return p && p.st === g && (p.a === c || p.b === c) ? `v ${nm(p.a === c ? p.b : p.a)}${c === 'NEP' || p.a === 'NEP' || p.b === 'NEP' ? ' · next' : ''}` : 'Done'; };
  const lbl = (k) => (k === 'X' ? 'Super 8 · 1' : k === 'Y' ? 'Super 8 · 2' : `Group ${k}`);
  return (
    <div>
      <div className="wd-th" style={{ flexWrap: 'wrap', gap: 8 }}><h2 className="t-h3">{wc.fmt === 'ODI' ? 'Groups · top two reach the semi-finals' : 'Groups · top two reach the Super 8'}</h2>
        <div className="seg" role="group" aria-label="Group">{keys.map((k) => <button key={k} type="button" className={g === k ? 'on' : ''} onClick={() => setG(k)}>{lbl(k)}</button>)}</div></div>
      <div className="tblwrap" style={{ marginTop: 10 }}><table className="tbl compact">
        <thead><tr><th>#</th><th>Team</th><th className="r">P</th><th className="r">W</th><th className="r">L</th><th className="r">Pts</th><th className="r">NRR</th><th>Left to play</th></tr></thead>
        <tbody>{t.map((r, i) => <tr key={r.code} className={r.code === 'NEP' ? 'me' : i === 1 ? 'cut' : ''}><td>{i + 1}</td><td className="name">{nm(r.code)}</td><td className="r">{r.p}</td><td className="r">{r.w}</td><td className="r">{r.l}</td><td className="r b6">{r.pts}</td><td className="r faint">{nrr(r.nrr)}</td><td className="t-small mut">{left(r.code)}</td></tr>)}</tbody></table></div>
      <p className="faint t-small" style={{ marginTop: 8 }}>All results are simulated in your save. Ties split by net run rate.</p>
    </div>);
}
function NepalSoFar({ wc }) {
  if (!wc.nepIn) return <p className="t-small faint">Nepal are not at this World Cup.</p>;
  return <ul className="mlist">{wc.nep.map((x, i) => <li key={i}><span className="grow">{x.r === 'W' ? 'Beat' : 'Lost to'} {nm(x.v)} {x.m}<br /><span className="l2">{x.stage} · Nepal {x.nep}, {nm(x.v)} {x.opp}{x.line ? ` · ${x.line}` : ''}</span></span><span className={`t-small ${x.r === 'W' ? 'blu' : 'crim'}`}>{x.r}</span></li>)}
    {!wc.nep.length && <li className="t-small faint">No games yet.</li>}</ul>;
}
function Road({ wc }) {
  const has = (s) => wc.nep.some((x) => x.stage === s); const st = wc.fmt === 'ODI' ? ['Group stage', 'Semi-final', 'Final'] : ['Group stage', 'Super 8', 'Semi-final', 'Final'];
  const lbl = { 'Group stage': 'Group stage', 'Super 8': 'Super 8 · two groups of four', 'Semi-final': 'Semi-finals', Final: 'Final' };
  return <ol className="mlist">{st.map((s, i) => { const reached = s === 'Group stage' ? wc.nepIn : has(s); const now = wc.pending && s === 'Group stage';
    return <li key={s} style={{ padding: '8px 0' }}><span className="grow">{lbl[s]}</span><span className={`t-small ${now ? 'crim' : reached ? 'blu' : 'faint'}`}>{now ? 'Now' : reached ? (wc.champ === 'NEP' && s === 'Final' ? 'Won' : 'Reached') : wc.pending && i === 1 ? 'Win the decider' : '—'}</span></li>; })}</ol>;
}
function Leaders({ wc }) {
  const L = leaders(wc); const row = (lbl, x, v) => x ? <tr key={lbl}><td style={{ paddingLeft: 0 }} className="mut">{lbl}</td><td className={x.code === 'NEP' ? 'b6' : ''}>{x.name}, {nm(x.code)}</td><td className="r">{v}</td></tr> : null;
  const nepRuns = L.runs.find((x) => x.code === 'NEP');
  return <div><h2 className="sec">Tournament leaders · in-game</h2><table className="tbl compact plain"><tbody>
    {row('Most runs', L.runs[0], L.runs[0] && L.runs[0].r)}{row('Most wickets', L.wkts[0], L.wkts[0] && L.wkts[0].w)}{row('Best economy', L.econ[0], L.econ[0] && L.econ[0].econ.toFixed(1))}
    {nepRuns && nepRuns !== L.runs[0] && row(`Nepal's top scorer`, nepRuns, nepRuns.r)}</tbody></table>
    <p className="faint t-micro" style={{ marginTop: 6 }}>Counts Nepal and the players of other nations who are in your save.</p></div>;
}
function MyPlayers({ wc }) {
  const { G } = useGame(); if (!wc.nepIn) return null; const mine = G.pickNepal().squad.filter((id) => G.P(id).team === G.user);
  return <div className="panel stack" style={{ gap: 8 }}><h2 className="sec" style={{ margin: 0 }}>Your {G.teams[G.user].name.split(' ')[0]} players here</h2>
    <p className="t-small">{mine.length ? mine.map((id) => G.P(id).name).join(' · ') : 'None of your players are in the squad.'}</p>
    <p className="faint t-micro">A strong World Cup lifts their form and value; the workload costs fitness before the NPL. You follow Nepal as a club manager; you don't pick the national side.</p></div>;
}

function History2026() {
  const { G } = useGame(); const up = WORLD_CUPS.filter((c) => c.y >= G.year - 1);
  return (
    <div className="split wd-split">
      <section className="stack" style={{ gap: 20, minWidth: 0 }}>
        <div><h2 className="t-h3" style={{ marginBottom: 8 }}>Nepal at the {T20WC_2026.name}</h2>
          <ul className="mlist">{T20WC_2026.nepal.res.map((x) => <li key={x.v}><span className="grow">{x.r === 'W' ? `Beat ${x.v} ${x.m}` : `Lost to ${x.v}`}{x.line && <><br /><span className="l2">{x.line}</span></>}</span><span className={`t-small ${x.r === 'W' ? 'blu' : 'crim'}`}>{x.r}</span></li>)}</ul>
          <p className="t-small mut" style={{ marginTop: 8 }}>{T20WC_2026.note}</p></div>
      </section>
      <aside className="stack" style={{ gap: 18, minWidth: 0 }}>
        <div><h2 className="sec">Next World Cups</h2><ul className="mlist">{up.map((c) => <li key={c.name} style={{ padding: '8px 0' }}><span className="grow">{c.name}<br /><span className="l2">{c.hosts} · {c.when}</span></span><span className="t-small faint">{c.fmt === 'ODI' ? 'Via the Qualifier' : 'Via the regional qualifier'}</span></li>)}</ul></div>
        <p className="faint t-micro">The next editions are simulated in your save, in the off-season they fall in. <Link to="/international">The 50-over pathway ›</Link></p>
      </aside>
    </div>);
}

export default function WorldCup() {
  const { G, update, toast } = useGame(); const narrow = useNarrow(); const [busy, setBusy] = useState(false); const [q] = useSearchParams(); const [watch, setWatch] = useState(q.get('watch') === '1');
  useEffect(() => { if (afterWinter(G)) { autosave(G); update(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const wc = G.s.world.wc; const live = wc && wc.live; const r = useReplay(watch ? live : null);
  const [tab, setTab] = useTab(['nepal', 'groups', 'leaders'], 'nepal');
  const go = async (mode) => {
    if (mode === 'quick') { update(() => { const x = resolvePending(G); autosave(G); if (x) toast(`${x.win === 'NEP' ? 'Nepal won' : 'Nepal lost'} ${x.m}.`); }); return; }
    setBusy(true); await playPendingLive(G); autosave(G); setBusy(false); setWatch(true); update();
  };
  const hist = G.s.world.wcHist.slice().reverse();
  if (!wc) {
    const hero = <section className="board wd-occ"><div className="stack" style={{ gap: 8 }}><span className="blbl" style={{ color: 'var(--wd-gold)', fontSize: 14 }}>{T20WC_2026.name} · {T20WC_2026.hosts} · {T20WC_2026.when} · real result</span><span className="bf wd-occ-t">Nepal: group stage, one win</span><span className="blbl" style={{ fontSize: 14 }}>India beat New Zealand {T20WC_2026.finalM} in the final</span></div></section>;
    if (narrow) return <MScreen top={{ title: tn(G, 'World Cup'), sub: '2026 · history' }} pinRaw={<div className="wd-mhero">{hero}</div>}><History2026 /></MScreen>;
    return <div className="wd" style={{ maxWidth: 1220 }}>{hero}<div style={{ marginTop: 28 }}><History2026 /></div></div>;
  }
  // phone: the live chase as a match screen
  if (narrow && watch && live) return (
    <MScreen top={false} pinRaw={<Scoreboard wc={wc} live={live} r={r} />}
      actions={<><button type="button" className="btn wd-gold" style={{ flex: '1 1 auto' }} onClick={() => (r.done ? setWatch(false) : r.on ? r.setOn(false) : r.setOn(true))}>{r.done ? T(G, 'Back to the World Cup', 'विश्वकपमा फर्कनुहोस्') : r.on ? T(G, 'Pause', 'रोक्नुहोस्') : T(G, 'Keep listening', 'सुन्दै जानुहोस्')}</button>{!r.done && <button type="button" className="btn" onClick={r.skip}>Skip to the end</button>}</>}>
      <ul className="mlist">{(r.done ? live.bats : []).map((b) => <li key={b[0]} style={{ padding: '8px 0' }}><span className="grow b6">{b[0]}{b[3] ? '' : '*'}</span><span className="board-f" style={{ fontSize: 18 }}>{b[1]} ({b[2]})</span></li>)}</ul>
      <Feed r={r} both />
      <div style={{ marginTop: 12 }}><Mine live={live} /></div>
      <p className="faint t-micro" style={{ marginTop: 10 }}>You follow Nepal's games as a fan and club manager; you don't pick the national side.</p>
    </MScreen>);
  const replay = watch && live ? <section className="stack" style={{ gap: 12 }}><Scoreboard wc={wc} live={live} r={r} /><div className="row" style={{ gap: 8 }}><button type="button" className="btn btn-sm" onClick={() => (r.done ? setWatch(false) : r.setOn(!r.on))}>{r.done ? 'Close' : r.on ? 'Pause' : 'Keep listening'}</button>{!r.done && <button type="button" className="btn btn-sm" onClick={r.skip}>Skip to the end</button>}</div><Feed r={r} both /><Mine live={live} /></section> : null;
  const pastList = hist.length > 0 && <div><h2 className="sec">World Cups in your save</h2><ul className="mlist">{hist.map((h) => <li key={h.name} style={{ padding: '8px 0' }}><span className="grow t-small">{h.name}<br /><span className="l2">{h.champ} beat {h.runner} {h.finalM}</span></span><span className="t-small mut">Nepal: {h.nepal}</span></li>)}</ul></div>;
  if (narrow) return (
    <MScreen top={{ title: tn(G, 'World Cup'), sub: `${wc.y} · in-game` }} pinRaw={<div className="wd-mhero"><Hero wc={wc} go={go} busy={busy} /></div>}
      tabs={[['nepal', tn(G, 'Nepal')], ['groups', T(G, 'Groups', 'समूह')], ['leaders', T(G, 'Leaders', 'अग्रणी')]]} tab={tab} onTab={setTab} label="World Cup sections">
      {tab === 'nepal' && <div className="stack" style={{ gap: 16, paddingTop: 8 }}>{live && !watch && <button type="button" className="btn" onClick={() => setWatch(true)}>Replay Nepal's decider</button>}<NepalSoFar wc={wc} /><Road wc={wc} /><MyPlayers wc={wc} /></div>}
      {tab === 'groups' && <div style={{ paddingTop: 8 }}><Groups wc={wc} /></div>}
      {tab === 'leaders' && <div className="stack" style={{ gap: 16, paddingTop: 8 }}><Leaders wc={wc} />{pastList}</div>}
    </MScreen>);
  return (
    <div className="wd" style={{ maxWidth: 1220 }}>
      <Hero wc={wc} go={go} busy={busy} />
      <div className="split wd-split">
        <section className="stack" style={{ gap: 26, minWidth: 0 }}>
          {replay}
          <Groups wc={wc} />
          <div><div className="wd-th"><h2 className="t-h3" style={{ marginBottom: 8 }}>Nepal so far</h2>{live && !watch && <button type="button" className="linkbtn t-small" onClick={() => setWatch(true)}>Replay the decider</button>}</div><NepalSoFar wc={wc} /></div>
        </section>
        <aside className="stack" style={{ gap: 22, minWidth: 0 }}>
          <div><h2 className="sec">Road to the final</h2><Road wc={wc} /></div>
          <Leaders wc={wc} />
          <MyPlayers wc={wc} />
          {pastList}
        </aside>
      </div>
    </div>);
}
