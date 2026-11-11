import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot } from '../components/bits.jsx';
import { CONTRACTS_2026, INTL_SOURCES, INTL_ASOF } from '../game/intl-data.js';
import { nm, nepalEvents, winterWindow, today } from '../game/world.js';
import { info, sbase } from '../world/intl.js';
import { squadFor } from '../world/state.js';
import { poolOf } from '../world/players.js';
import { value } from '../world/squads.js';
import { short, label as dayLabel } from '../world/dates.js';

const ROLE = { BAT: 'batter', BOWL: 'bowler', AR: 'all-rounder', WK: 'wicketkeeper' };
const GRADE_TAG = { 'A+': 'c', A: 'b', B: 'b', C: '', D: '' };
export const gradeLabel = (g) => (g === 'A+' ? 'A Plus' : g === 'D' ? 'D (development)' : g);

// The international year to show: the coming one before and during the NPL, the one just played after it.
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
const venueOf = (S) => { const v = (S.name || '').split(' · ').pop(); return /Kirtipur|Mulpani/.test(v) ? v : S.teams[0] === 'NEP' && info(S).kind !== 'bilat' ? 'Nepal' : info(S).kind === 'bilat' || info(S).kind === 'tri' ? `In ${nm(S.teams[0])}` : ''; };

export default function Nepal() {
  const { G } = useGame(); const [all, setAll] = useState(false);
  const w = nextWinter(G); const N = G.s.nepal; const t = G.s.wd ? today(G) : 0;
  const evts = G.s.wd ? nepalEvents(G, ...winterWindow(w)) : [];
  const next = evts.find((e) => e.played < e.n) || null; const e0 = next || evts[evts.length - 1] || null;
  const fmt = next ? next.S.fx[0].fmt : 'T20';
  const { squad, fringe } = useMemo(() => { if (!G.s.wd) return { squad: [], fringe: [] }; try { const sq = squadFor(G, 'NEP', fmt).filter((p) => G.P(p.id)); const rest = poolOf(G, 'NEP').filter((p) => !sq.includes(p) && G.P(p.id) && !p.inj).sort((a, b) => value(b, fmt) - value(a, fmt)).slice(0, 3); return { squad: sq.map((p) => p.id), fringe: rest.map((p) => p.id) }; } catch { return { squad: [], fringe: [] }; } }, [G, fmt, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = squad.filter((id) => G.P(id).team === G.user); const myFringe = fringe.filter((id) => G.P(id).team === G.user);
  const W = evts.reduce((a, e) => a + e.w, 0), L = evts.reduce((a, e) => a + e.l, 0);
  const contractYear = N.contractYear && N.contractYear > CONTRACTS_2026.year ? N.contractYear : CONTRACTS_2026.year;
  const graded = contractYear === CONTRACTS_2026.year ? CONTRACTS_2026.grades : Object.fromEntries(['A+', 'A', 'B', 'C', 'D'].map((g) => [g, Object.values(G.players).filter((p) => p.intl && p.intl.grade === g).map((p) => p.name)]));
  const fringeNote = (p) => { const st = p.stats[G.year] || p.stats[G.year - 1]; return p.bowl >= 55 ? `${st ? `${st.w} NPL wickets this season. ` : ''}A few more good games could earn a call-up.` : `${st ? `${st.r} NPL runs this season. ` : ''}Needs runs to force his way in.`; };
  return (
    <div className="nepalpg stack" style={{ gap: 16 }}>
      <div className="sechead" style={{ alignItems: 'center' }}><div><h1 className="t-h1">Nepal</h1><p className="t-micro faint">National team · men</p></div>
        <div className="row" style={{ gap: 8 }}><Link className="btn btn-sm" to="/international">Pathway and tables</Link><Link className="btn btn-sm" to="/worldcup">World Cup</Link><Link className="btn btn-sm" to="/rankings">Rankings</Link></div></div>
      <section className="board nboard">
        <p className="blbl">{next ? `Next for Nepal · ${dayLabel(next.first)}` : evts.length ? `Nepal's international year ${w}–${String(w + 1).slice(2)} · played` : `Nepal's international year ${w}–${String(w + 1).slice(2)}`}</p>
        <p className="bf nb-title">{e0 ? sbase(e0.S) : 'No fixtures yet'}</p><p className="blbl">{e0 ? `${e0.first === e0.last ? short(e0.first) : `${short(e0.first)} – ${short(e0.last)}`} · ${venueOf(e0.S) || 'Away'} · ${info(e0.S).fmtL}${info(e0.S).realFixture ? ' · real fixture' : ' · in your game'}` : 'The programme is drawn as the year goes on.'}</p>
        <div className="ob-cells"><div><p className="blbl">This year</p><p className="bf ob-v">{evts.length ? `W ${W} · L ${L}` : '—'}</p></div><div><p className="blbl">Your players</p><p className="bf ob-v">{mine.length}</p></div><div><p className="blbl">On the fringe</p><p className="bf ob-v">{myFringe.length}</p></div></div>
      </section>
      <div className="pgrid">
        <div className="stack" style={{ gap: 16, minWidth: 0 }}>
          <section><div className="sechead"><h2 className="t-h2">Your players in the squad</h2><span className="ptag b">Likely</span></div>
            <ul className="olist">{mine.map((id) => { const p = G.P(id); return <li key={id}><Link to={`/player/${id}?tab=nepal`} className="t-small b6 row" style={{ gap: 6, alignItems: 'center', color: 'var(--ink)', textDecoration: 'none' }}><Dot id={G.user} />{p.name}</Link><span className="t-micro faint">{G.teams[G.user].captainId === id ? 'Captain · ' : ''}{ROLE[p.role]}</span><span /></li>; })}
              {!mine.length && <li className="t-small faint">None of your players are in the squad.</li>}</ul>
            {myFringe.length > 0 && <div className="panel coachnote" style={{ marginTop: 10 }}><p className="t-small gld b6">On the fringe</p>{myFringe.map((id) => { const p = G.P(id); return <p key={id} className="t-small"><b>{p.name}</b>: {fringeNote(p)}</p>; })}</div>}</section>
          <section><div className="sechead"><h2 className="t-h2">Likely squad · {fmt === 'ODI' ? 'ODI' : 'T20I'}</h2><button type="button" className="linkbtn t-small" onClick={() => setAll(!all)}>{all ? 'Fewer' : `All ${squad.length}`}</button></div>
            <div className="row" style={{ gap: 6 }}>{(all ? squad : squad.slice(0, 6)).map((id) => { const p = G.P(id); return <Link key={id} to={`/player/${id}?tab=nepal`} className="ptag row" style={{ gap: 4, alignItems: 'center', textDecoration: 'none' }}>{p.team && <Dot id={p.team} />}{p.name}</Link>; })}{!all && squad.length > 6 && <span className="ptag">+ {squad.length - 6} more</span>}</div>
            <p className="t-micro faint" style={{ marginTop: 6 }}>In the game, selectors pick on ratings and form for the format.</p></section>
          <section><h2 className="t-h2" style={{ marginBottom: 6 }}>Calendar · {w}–{String(w + 1).slice(2)}</h2>
            <ul className="olist">{evts.map((e) => { const inf = info(e.S); return (
              <li key={e.S.id}><span><span className="t-micro faint">{e.first === e.last ? short(e.first) : `${short(e.first)} – ${short(e.last)}`}</span><br /><Link to={`/comp/${encodeURIComponent(e.S.id)}`} className="t-small b6" style={{ color: 'var(--ink)', textDecoration: 'none' }}>{sbase(e.S)}</Link><br /><span className="t-micro mut">{venueOf(e.S) ? `${venueOf(e.S)} · ` : ''}{inf.fmtL}{inf.official ? '' : ' · not a full international'}{inf.realFixture ? ' · real fixture' : ' · in your game'}</span></span>
                {e.played ? <span className="board-f ob-chg">W {e.w} · L {e.l}{e.played < e.n ? ` · ${e.n - e.played} to play` : ''}</span> : <span className="t-micro faint">{e.n} game{e.n > 1 ? 's' : ''}</span>}<span /></li>); })}
              {!evts.length && <li className="t-small faint">No Nepal fixtures in this window yet.</li>}</ul>
            <p className="t-micro faint" style={{ marginTop: 6 }}>Nepal's games are the world's real fixtures where they are known (the 2026 Play-off, the 2027 Asia Cup, Bangladesh in March 2027) and the game's programme after that. Results are simulated.</p></section>
        </div>
        <div className="stack" style={{ gap: 16, minWidth: 0 }}>
          <section className="panel stack" style={{ gap: 8 }}><div className="sechead" style={{ margin: 0 }}><h2 className="t-h3">Central contracts</h2><span className="t-micro faint">CAN {contractYear}{contractYear > CONTRACTS_2026.year ? ' · in your game' : ''}</span></div>
            {['A+', 'A', 'B', 'C', 'D'].map((g) => <p key={g} className="t-small"><span className={`ptag ${GRADE_TAG[g]}`}>{gradeLabel(g)}</span> {(graded[g] || []).join(', ') || <span className="faint">—</span>}</p>)}
            {contractYear === CONTRACTS_2026.year && <p className="t-micro faint">Monthly pay: A Plus Rs 1,20,000 (one report says Rs 1,50,000), A Rs 1,00,000, B Rs 75,000, C Rs 55,000, D Rs 35,000. Players not in the game: {CONTRACTS_2026.grades.C.filter((n) => !Object.values(G.players).some((p) => p.name === n)).join(', ')}.</p>}
            <p className="t-micro faint">CAN re-grades the contracts after each international year.</p></section>
          <section className="panel stack" style={{ gap: 6 }}><p className="t-small blu b6">What national duty does for your club</p>
            <ul className="sfx"><li className="t-small"><span className="blu b6">+</span>Each event adds experience: often +1 rating, at most +3 a year, up to his potential.</li><li className="t-small"><span className="blu b6">+</span>A first cap makes a player "capped": his value rises about 50% and he leaves the uncapped auction set.</li><li className="t-small"><span className="crim b6">−</span>Every international costs fitness. Call-ups lift morale (+8); being dropped hurts it (−6).</li></ul></section>
          <section className="panel stack" style={{ gap: 4 }}><p className="t-micro faint b6">Sources</p>
            <p className="t-micro faint">Caps at game start: {INTL_SOURCES.t20i}; {INTL_SOURCES.odi}. Debuts: {INTL_SOURCES.debut}. Contracts: {INTL_SOURCES.contracts}. Figures we could not verify show as —.</p>
            <p className="t-micro faint">Caps are as of {INTL_ASOF.t20i} (T20I) and {INTL_ASOF.odi} (ODI); games in your career are added on top.</p></section>
        </div>
      </div>
    </div>
  );
}
