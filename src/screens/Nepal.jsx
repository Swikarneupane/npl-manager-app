import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot } from '../components/bits.jsx';
import { CONTRACTS_2026, INTL_SOURCES, INTL_ASOF } from '../game/intl-data.js';

const ROLE = { BAT: 'batter', BOWL: 'bowler', AR: 'all-rounder', WK: 'wicketkeeper' };
const GRADE_TAG = { 'A+': 'c', A: 'b', B: 'b', C: '', D: '' };
export const gradeLabel = (g) => (g === 'A+' ? 'A Plus' : g === 'D' ? 'D (development)' : g);

// Upcoming winter for the hub: this year's (after the NPL final), or the one just played in the off-season.
export function nextWinter(G) { const ph = G.s.phase; const off = ['offseason', 'retention', 'auction'].includes(ph); return off ? G.year - 1 : G.year; }

// The selectors' view of a player, from his rank in the current Nepal ranking.
export function selectorView(G, p, ranked) {
  const i = ranked.indexOf(p.id);
  if (i < 0) return ['Outside the squad', 'Unlikely'];
  if (i < 8) return [p.role === 'WK' ? 'First-choice keeper' : `First-choice ${ROLE[p.role]}`, 'Certain'];
  if (i < 15) return ['In the squad', 'Probable'];
  if (i < 18) return ['On the fringe', 'Fringe'];
  return ['Outside the squad', 'Unlikely'];
}

export default function Nepal() {
  const { G } = useGame(); const [all, setAll] = useState(false);
  const w = nextWinter(G); const evts = G.winterEvents(w); const N = G.s.nepal; const played = N.winter === w && N.results;
  const sel = G.pickNepal(); const squad = played ? (N.results[0].squad || sel.squad) : sel.squad; const fringe = played ? (N.results[0].fringe || sel.fringe) : sel.fringe;
  const mine = squad.filter((id) => G.P(id).team === G.user); const myFringe = fringe.filter((id) => G.P(id).team === G.user);
  const e0 = evts[0];
  const contractYear = N.contractYear && N.contractYear > CONTRACTS_2026.year ? N.contractYear : CONTRACTS_2026.year;
  const graded = contractYear === CONTRACTS_2026.year ? CONTRACTS_2026.grades : Object.fromEntries(['A+', 'A', 'B', 'C', 'D'].map((g) => [g, Object.values(G.players).filter((p) => p.intl && p.intl.grade === g).map((p) => p.name)]));
  const fringeNote = (p) => { const st = p.stats[G.year] || p.stats[G.year - 1]; return p.bowl >= 55 ? `${st ? `${st.w} NPL wickets this season. ` : ''}A couple more good NPL games could earn a call-up.` : `${st ? `${st.r} NPL runs this season. ` : ''}Needs runs to force his way in.`; };
  return (
    <div className="nepalpg stack" style={{ gap: 16 }}>
      <div className="sechead" style={{ alignItems: 'center' }}><div><h1 className="t-h1">Nepal</h1><p className="t-micro faint">National team · men</p></div>
        <div className="row" style={{ gap: 8 }}><Link className="btn btn-sm" to="/international">Pathway and tables</Link><Link className="btn btn-sm" to="/worldcup">World Cup</Link><Link className="btn btn-sm" to="/rankings">Rankings</Link></div></div>
      <section className="board nboard">
        <p className="blbl">{played ? `Nepal's winter ${w}–${String(w + 1).slice(2)} · played` : `Next for Nepal · ${G.s.phase === 'preseason' || G.s.phase === 'league' || G.s.phase === 'playoffs' ? 'after the NPL final' : 'this winter'}`}</p>
        <p className="bf nb-title">{e0.name}</p><p className="blbl">{e0.dates} · {e0.venue} · {e0.fmt}{e0.real ? '' : ' · in your game'}</p>
        <div className="ob-cells"><div><p className="blbl">Squad named</p><p className="bf ob-v">{e0.squadDate}</p></div><div><p className="blbl">Your players</p><p className="bf ob-v">{mine.length}</p></div><div><p className="blbl">On the fringe</p><p className="bf ob-v">{myFringe.length}</p></div></div>
      </section>
      <div className="pgrid">
        <div className="stack" style={{ gap: 16, minWidth: 0 }}>
          <section><div className="sechead"><h2 className="t-h2">Your players in the squad</h2><span className="ptag b">{played ? 'Selected' : 'Probable'}</span></div>
            <ul className="olist">{mine.map((id) => { const p = G.P(id); return <li key={id}><Link to={`/player/${id}?tab=nepal`} className="t-small b6 row" style={{ gap: 6, alignItems: 'center', color: 'var(--ink)', textDecoration: 'none' }}><Dot id={G.user} />{p.name}</Link><span className="t-micro faint">{G.teams[G.user].captainId === id ? 'Captain · ' : ''}{ROLE[p.role]}</span><span /></li>; })}
              {!mine.length && <li className="t-small faint">None of your players are in the squad.</li>}</ul>
            {myFringe.length > 0 && <div className="panel coachnote" style={{ marginTop: 10 }}><p className="t-small gld b6">On the fringe</p>{myFringe.map((id) => { const p = G.P(id); return <p key={id} className="t-small"><b>{p.name}</b>: {fringeNote(p)}</p>; })}</div>}</section>
          <section><div className="sechead"><h2 className="t-h2">{played ? 'The squad' : 'Likely squad'}</h2><button type="button" className="linkbtn t-small" onClick={() => setAll(!all)}>{all ? 'Fewer' : `All ${squad.length}`}</button></div>
            <div className="row" style={{ gap: 6 }}>{(all ? squad : squad.slice(0, 6)).map((id) => { const p = G.P(id); return <Link key={id} to={`/player/${id}?tab=nepal`} className="ptag row" style={{ gap: 4, alignItems: 'center', textDecoration: 'none' }}>{p.team && <Dot id={p.team} />}{p.name}</Link>; })}{!all && squad.length > 6 && <span className="ptag">+ {squad.length - 6} more</span>}</div>
            <p className="t-micro faint" style={{ marginTop: 6 }}>In the game, selectors pick from NPL form, ratings and central contracts.</p></section>
          <section><h2 className="t-h2" style={{ marginBottom: 6 }}>Calendar</h2>
            <ul className="olist">{evts.map((e) => { const r = played && N.results.find((x) => x.id === e.id); return (
              <li key={e.id}><span><span className="t-micro faint">{e.dates}</span><br /><span className="t-small b6">{e.name}</span><br /><span className="t-micro mut">{e.venue} · {e.fmt}{e.note ? ` · ${e.note}` : ''}{e.official ? '' : ' · not a full international'}{e.real ? '' : ' · in your game'}</span></span>
                {r ? <span className="board-f ob-chg">W {r.w} · L {r.l}</span> : <span />}<span /></li>); })}</ul>
            <p className="t-micro faint" style={{ marginTop: 6 }}>{evts.some((e) => e.real) ? "Nepal's real fixtures; results are simulated in your game." : 'Fixtures generated by the game for this winter.'}</p></section>
        </div>
        <div className="stack" style={{ gap: 16, minWidth: 0 }}>
          <section className="panel stack" style={{ gap: 8 }}><div className="sechead" style={{ margin: 0 }}><h2 className="t-h3">Central contracts</h2><span className="t-micro faint">CAN {contractYear}{contractYear > CONTRACTS_2026.year ? ' · in your game' : ''}</span></div>
            {['A+', 'A', 'B', 'C', 'D'].map((g) => <p key={g} className="t-small"><span className={`ptag ${GRADE_TAG[g]}`}>{gradeLabel(g)}</span> {(graded[g] || []).join(', ') || <span className="faint">—</span>}</p>)}
            {contractYear === CONTRACTS_2026.year && <p className="t-micro faint">Monthly pay: A Plus Rs 1,20,000 (one report says Rs 1,50,000), A Rs 1,00,000, B Rs 75,000, C Rs 55,000, D Rs 35,000. Players not in the game: {CONTRACTS_2026.grades.C.filter((n) => !Object.values(G.players).some((p) => p.name === n)).join(', ')}.</p>}
            <p className="t-micro faint">Contracted players get the nod from the selectors more often.</p></section>
          <section className="panel stack" style={{ gap: 6 }}><p className="t-small blu b6">What national duty does for your club</p>
            <ul className="sfx"><li className="t-small"><span className="blu b6">+</span>Each series adds experience: about +1 to +2 rating, up to his potential.</li><li className="t-small"><span className="blu b6">+</span>A first cap makes a player "capped": his value rises about 50% and he leaves the uncapped auction set.</li><li className="t-small"><span className="crim b6">−</span>Each series costs 10 fitness. Call-ups lift morale (+8); being dropped hurts it (−6).</li></ul></section>
          <section className="panel stack" style={{ gap: 4 }}><p className="t-micro faint b6">Sources</p>
            <p className="t-micro faint">Caps at game start: {INTL_SOURCES.t20i}; {INTL_SOURCES.odi}. Debuts: {INTL_SOURCES.debut}. Contracts: {INTL_SOURCES.contracts}. Figures we could not verify show as —.</p>
            <p className="t-micro faint">Caps are as of {INTL_ASOF.t20i} (T20I) and {INTL_ASOF.odi} (ODI); games in your career are added on top.</p></section>
        </div>
      </div>
    </div>
  );
}
