import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/occasions.css';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { Dot, PageHead } from '../components/bits.jsx';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { T, tn } from '../lib/i18n.js';
import { seasonNo, tshort, useNarrow, sleep } from '../lib/util.js';
import { afterFixture, simFixture, simToSeasonEnd, simUntilUser, matchPath } from '../lib/flow.js';
import { lastMeeting } from '../game/depth.js';
import * as O from '../game/occasions.js';
import { ChoiceGrid } from './FinalWeek.jsx';

const LABEL = { Q1: 'Qualifier 1', EL: 'Eliminator', Q2: 'Qualifier 2', F: 'Final' };
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const EVC = { wkt: 'ev-wkt', four: 'ev-four', six: 'ev-six', mile: 'ev-mile', drs: 'ev-drs', result: 'ev-mile', head: 'ev-mile', comp: 'ev-crowd' };
const TAG = { wkt: 'W', four: '4', six: '6', mile: '★', drs: 'DRS' };

// Steps through Qualifier 2's real commentary an over at a time. It plays on by itself unless the
// viewer prefers reduced motion; "To the end" shows everything.
function Replay({ log, onDone }) {
  const groups = useRef(null);
  if (!groups.current) { const g = [[]]; for (const e of log) { g[g.length - 1].push(e); if (e[2] === 'over') g.push([]); } groups.current = g.filter((x) => x.length); }
  const G2 = groups.current; const [n, setN] = useState(1); const auto = useRef(!reduced());
  const done = n >= G2.length;
  useEffect(() => { if (done) { onDone(); return undefined; } if (!auto.current) return undefined; const t = setTimeout(() => setN((x) => x + 1), 900); return () => clearTimeout(t); }, [n, done]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = G2.slice(0, n).flat().reverse();
  return (
    <section className="panel stack" style={{ gap: 10 }} aria-label="Qualifier 2 commentary">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 className="t-h3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{!done && <span className="live" aria-hidden="true" />}Qualifier 2 {done ? '· full time' : '· live'}</h2>
        {!done && <span className="row" style={{ gap: 6 }}><button type="button" className="btn btn-sm" onClick={() => { auto.current = false; setN((x) => x + 1); }}>Next over</button><button type="button" className="btn btn-sm" onClick={() => setN(G2.length)}>To the end</button></span>}
      </div>
      <ol className="feed occ-replay" aria-live="polite">{shown.map((e, i) => e[2] === 'over'
        ? <li key={shown.length - i} className="ev-over"><b>{e[1].split(':')[0]}</b>{e[1].split(':').slice(1).join(':')}</li>
        : <li key={shown.length - i} className={`ev ${EVC[e[2]] || ''}`}><span className="ov">{e[0] || (TAG[e[2]] ? '' : '·')}</span><span className="tx">{TAG[e[2]] && <span className="tag" style={{ marginRight: 6 }}>{TAG[e[2]]}</span>}{e[2] === 'result' || e[2] === 'head' ? <b>{e[1]}</b> : e[1]}</span></li>)}</ol>
    </section>
  );
}

function FixPanel({ G, st, f, hide, ph, children, occasion }) {
  const res = f && f.res && !hide ? f.res : null; const w = res ? O.winnerOf(G, f) : null;
  const sc = (tid) => { const x = res && res.sc && res.sc.find((s) => s.t === tid); return x ? `${x.r}/${x.w}` : ''; };
  const line = (tid, note) => (
    <p className={w === tid ? 'win' : ''}><span><Dot id={tid} />{tshort(G, tid)}{note && <span className="faint t-small" style={{ marginLeft: 6 }}>{note}</span>}</span><span className="board-f" style={{ fontSize: 18 }}>{sc(tid)}</span></p>);
  const next = st === 'F' ? 'champions' : st === 'EL' ? 'Q2' : st === 'Q1' ? 'Final' : 'Final';
  const lose = st === 'Q1' ? 'Q2' : 'out';
  return (
    <div className={`panel stack occ-fx${occasion ? ' occasion' : ''}${f && !res ? ' next' : ''}`} style={{ gap: 6 }}>
      <span className={`${occasion ? 'gld' : 'faint'} t-small`} style={occasion ? { fontWeight: 600 } : undefined}>{T(G, LABEL[st], O.STAGE_NE[st])}{f ? ` · ${f.date}` : ''} · {res ? 'played' : hide ? <span className="crim">live</span> : '7:15 pm'}</span>
      {f ? <>{line(f.home, ph && ph[0])}{line(f.away, ph && ph[1])}</> : ph.map((x, i) => <p key={i} className="mut">{x}</p>)}
      {res ? <span className={`t-small ${w === G.user ? 'blu' : f.home === G.user || f.away === G.user ? 'crim' : 'mut'}`}>{res.nr ? 'No result: the higher seed goes through' : `${tshort(G, w)} ${res.text.replace(/^.* won/, 'won')}`} → {next === 'champions' ? 'champions' : next}{st !== 'F' && ` · ${tshort(G, w === f.home ? f.away : f.home)} ${lose === 'out' ? 'out' : '→ Q2'}`}</span>
        : <span className="t-small mut">{st === 'F' ? 'Kirtipur · sold out' : st === 'Q2' ? 'Winner to the final' : st === 'Q1' ? 'Winner to the final, loser to Q2' : 'Loser is out'}</span>}
      {res && !hide && <Link to={`/scorecard/${f.n}`} className="t-small">Scorecard</Link>}
      {children}
    </div>
  );
}

function Bracket({ G, P, hideQ2, q2Btn }) {
  const u = G.user; const st = G.standings();
  const fph = P.F ? null : [O.poStatus(G).st === 'wait' ? `${G.teams[u].name}` : 'Winner of Qualifier 1', 'v winner of Qualifier 2'];
  return (
    <section className="occ-bracket" aria-label="Playoff bracket">
      <div className="stack" style={{ gap: 28 }}>
        <FixPanel G={G} st="Q1" f={P.Q1} ph={[`1st`, `2nd`]} />
        <FixPanel G={G} st="EL" f={P.EL} ph={[`3rd`, `4th`]} />
      </div>
      <div className="bk-l" aria-hidden="true" />
      <FixPanel G={G} st="Q2" f={P.Q2} hide={hideQ2} ph={P.Q2 ? ['loser of Q1', 'winner of Eliminator'] : ['Loser of Qualifier 1', 'v winner of the Eliminator']}>{q2Btn}</FixPanel>
      <div className="bk-h" aria-hidden="true" />
      <FixPanel G={G} st="F" f={hideQ2 ? null : P.F} ph={hideQ2 && P.F ? [tshort(G, P.F.home), 'v winner of Qualifier 2'] : fph} occasion />
      {!st.length && null}
    </section>
  );
}

function Compare({ G, opps }) {
  const rows = opps.map((tid) => O.compareRow(G, tid)); const o = O.occ(G); const rep = o.q2w ? opps.map((tid) => O.q2Report(G, tid)) : null;
  const one = opps.length === 1;
  return (
    <section>
      <h2 className="t-h3" style={{ marginBottom: 8 }}>{one ? `Your final opponent` : opps.length ? 'Who would you rather face?' : 'Possible opponents'}</h2>
      <div className="tblscroll"><table className="tbl plain compact">
        <thead><tr><th style={{ paddingLeft: 0 }} />{rows.map((r) => <th key={r.tid}><Dot id={r.tid} />{tshort(G, r.tid)}</th>)}</tr></thead>
        <tbody>
          <tr><td style={{ paddingLeft: 0 }} className="mut">Against you this season</td>{rows.map((r) => <td key={r.tid}>{r.vs.w}–{r.vs.l}</td>)}</tr>
          <tr><td style={{ paddingLeft: 0 }} className="mut">Last meeting</td>{rows.map((r) => <td key={r.tid} className="t-small">{(lastMeeting(G, G.user, r.tid) || '—').replace(/^last meeting: /, '')}</td>)}</tr>
          <tr><td style={{ paddingLeft: 0 }} className="mut">Form</td>{rows.map((r) => <td key={r.tid} className="board-f">{r.form.join(' ') || '—'}</td>)}</tr>
          <tr><td style={{ paddingLeft: 0 }} className="mut">Danger player</td>{rows.map((r) => <td key={r.tid}>{r.danger ? <>{r.danger.name}<br /><span className="t-micro faint">{r.danger.fig}</span></> : '—'}</td>)}</tr>
          <tr><td style={{ paddingLeft: 0 }} className="mut">Model's final odds for you</td>{rows.map((r) => <td key={r.tid} className={`board-f ${r.odds >= 0.5 ? 'blu' : 'crim'}`} style={{ fontSize: 17 }}>{Math.round(r.odds * 100)}%</td>)}</tr>
          {rep && rep.some(Boolean) && <>
            <tr><td style={{ paddingLeft: 0 }} className="mut">Top bat in Q2</td>{rep.map((x, i) => <td key={i} className="t-small">{x ? x.bat || '—' : '—'}</td>)}</tr>
            <tr><td style={{ paddingLeft: 0 }} className="mut">Top bowler in Q2</td>{rep.map((x, i) => <td key={i} className="t-small">{x ? x.bowl || '—' : '—'}</td>)}</tr>
            <tr><td style={{ paddingLeft: 0 }} className="mut">Where to hit them</td>{rep.map((x, i) => <td key={i} className="t-small">{x ? x.weak || '—' : '—'}</td>)}</tr>
          </>}
        </tbody></table></div>
      <p className="faint t-micro" style={{ marginTop: 6 }}>{o.q2w ? 'Fuller report from watching Qualifier 2.' : 'Watch Qualifier 2 to unlock a fuller report.'} Odds from both current XIs.</p>
    </section>
  );
}

function Tasks({ G, st, P, pick, onWatch, watching }) {
  const o = O.occ(G); const stage = st === 'wait' || st === 'final' ? 'F' : st; const restDone = stage === 'F' ? O.fwChoice(G, 'rest') : o.rest[stage];
  const restTask = O.fwTasks(G).find((t) => t.id === 'rest'); const media = O.fwTasks(G).find((t) => t.id === 'media'); const mDone = O.fwChoice(G, 'media');
  const [open, setOpen] = useState(null);
  const q2 = P.Q2; const q2Mine = q2 && (q2.home === G.user || q2.away === G.user);
  return (
    <section>
      <h2 className="t-h3" style={{ marginBottom: 8 }}>{stage === 'F' ? 'Before the final' : `Before ${LABEL[stage]}`}</h2>
      <ul className="mlist">
        <li className="occ-task"><div className="hd"><span className="grow">{stage === 'F' ? 'Rest or train before the final' : `Training plan for ${LABEL[stage]}`}<br /><span className="l2">{restTask.sub}</span></span>
          {restDone ? <span className="blu t-small">Done · {restTask.opts.find((x) => x.k === (restDone.k || restDone)).l}</span> : <button type="button" className="btn btn-sm" aria-expanded={open === 'rest'} onClick={() => setOpen(open === 'rest' ? null : 'rest')}>Plan</button>}</div>
          {!restDone && open === 'rest' && <ChoiceGrid task={restTask} onPick={(k) => { pick('rest', stage, k); setOpen(null); }} />}</li>
        {!q2Mine && <li><span className="grow">Watch Qualifier 2 live<br /><span className="l2">{o.q2w ? 'Watched: the fuller opposition report is unlocked' : 'Unlocks a fuller opposition report for the final'}</span></span>
          {o.q2w ? <span className="blu t-small">Done</span> : q2 ? <button type="button" className="btn btn-sm" disabled={watching} onClick={onWatch}>{q2.res ? 'Step through it' : 'Watch live'}</button> : <span className="faint t-small">After the Eliminator</span>}</li>}
        <li className="occ-task"><div className="hd"><span className="grow">Media day<br /><span className="l2">{stage === 'F' ? 'Both captains and managers, before the final' : 'Only for the two finalists'}</span></span>
          {mDone ? <span className="blu t-small">Done · {mDone.pick}</span> : stage === 'F' ? <button type="button" className="btn btn-sm" aria-expanded={open === 'media'} onClick={() => setOpen(open === 'media' ? null : 'media')}>Prepare</button> : <span className="faint t-small">If you reach the final</span>}</div>
          {!mDone && open === 'media' && <><p className="t-small mut" style={{ margin: '6px 0 0' }}>{media.sub}</p><ChoiceGrid task={media} onPick={(k) => { pick('media', 'F', k); setOpen(null); }} /></>}</li>
      </ul>
    </section>
  );
}

function usePlayoffs() {
  const { G, update, toast } = useGame(); const nav = useNavigate();
  const { st, P, next, outAt } = O.poStatus(G);
  const [watching, setWatching] = useState(false); const [busy, setBusy] = useState(false);
  const pick = (id, stage, k) => update(() => { const out = id === 'rest' ? O.choosePoRest(G, stage, k) : O.chooseFw(G, id, k); autosave(G); if (out) toast(out); });
  const watch = async () => {
    const q2 = P.Q2; if (!q2) return;
    if (!q2.res) { setBusy(true); await sleep(0); await G.playFixture(q2, null); afterFixture(G); autosave(G); setBusy(false); }
    if (!O.occ(G).q2log) { update(() => { O.markQ2Watched(G); autosave(G); }); toast('No commentary was kept for this match; the report is unlocked from the scorecard.'); return; }
    setWatching(true); update();
  };
  const doneWatching = () => update(() => { O.markQ2Watched(G); autosave(G); });
  const simEL = async () => { setBusy(true); await simFixture(G, P.EL); autosave(G); setBusy(false); update(); };
  const simRest = async () => { setBusy(true); toast('Simulating the playoffs…'); await simToSeasonEnd(G, false); autosave(G); setBusy(false); update(); };
  const goMatch = async () => { setBusy(true); await simUntilUser(G); autosave(G); setBusy(false); update(); const f = O.poStatus(G).next; if (f) nav(O.preMatchPath(G, f) || matchPath(G, f, false)); };
  // the primary action for each state
  let act = null;
  if (st === 'final') act = { to: '/final', l: T(G, 'Final week plan', 'फाइनल हप्ता') };
  else if (['Q1', 'EL', 'Q2'].includes(st)) act = { on: goMatch, l: `Go to ${LABEL[next ? next.stage : st]}` };
  else if (st === 'wait') act = !P.EL.res ? { on: simEL, l: 'Play the Eliminator' } : P.Q2 && !P.Q2.res && !watching ? { on: watch, l: 'Watch Qualifier 2' } : null;
  else if (st === 'champion') act = { to: '/trophy', l: 'Trophy ceremony' };
  else if (st === 'runner' || G.s.phase === 'seasonEnd') act = { to: '/review', l: tn(G, 'Season review') };
  else if (st === 'out' || st === 'missed') act = { on: simRest, l: 'Sim to the end of the playoffs' };
  const sub = {
    none: 'The league is still on. The top four reach the playoffs.', missed: `${G.teams[G.user].name} missed the top four. The playoffs go on without you.`,
    Q1: 'You play Qualifier 1: win it and you go straight to the final.', EL: 'You play the Eliminator: lose and the season is over.', Q2: 'You play Qualifier 2: the winner reaches the final.',
    wait: 'You won Qualifier 1. Your final opponent is decided in Qualifier 2.', final: 'You are in the final.', out: `Out in the ${outAt === 'Q2' ? 'Qualifier 2' : 'Eliminator'}. The playoffs go on without you.`,
    champion: 'Champions.', runner: 'Beaten in the final.',
  }[st];
  return { G, st, P, next, act, sub, pick, watch, watching, doneWatching, busy, setWatching };
}
const Act = ({ act, busy, lg }) => (act ? act.to ? <Link to={act.to} className={`btn btn-primary${lg ? ' btn-lg' : ''}`} style={lg ? { flex: '1 1 auto' } : undefined}>{act.l}</Link> : <button type="button" className={`btn btn-primary${lg ? ' btn-lg' : ''}`} style={lg ? { flex: '1 1 auto' } : undefined} disabled={busy} onClick={act.on}>{busy ? 'Simulating…' : act.l}</button> : null);

function PlayoffsDesktop(x) {
  const { G, st, P, act, sub, pick, watch, watching, doneWatching, busy } = x;
  const opps = O.finalOpponents(G); const alive = ['Q1', 'EL', 'Q2', 'wait', 'final'].includes(st);
  const q2Mine = P.Q2 && (P.Q2.home === G.user || P.Q2.away === G.user);
  const q2Btn = P.Q2 && !q2Mine && !watching ? <div className="row" style={{ gap: 6, marginTop: 4 }}><button type="button" className="btn btn-sm" disabled={busy} onClick={watch}>{P.Q2.res ? (O.occ(G).q2w ? 'Replay' : 'Step through it') : 'Watch live'}</button></div> : null;
  return (
    <div style={{ maxWidth: 1220 }}>
      <PageHead title={T(G, 'Playoff week', 'प्लेअफ हप्ता')} sub={sub}><Act act={act} busy={busy} /></PageHead>
      {watching && O.occ(G).q2log && <div style={{ marginBottom: 24 }}><Replay log={O.occ(G).q2log} onDone={doneWatching} /></div>}
      {st === 'none' ? <p className="mut">The bracket appears when the league ends. <Link to="/season?tab=playoffs">If the league ended today</Link>.</p> : <Bracket G={G} P={P} hideQ2={watching && !O.occ(G).q2w} q2Btn={q2Btn} />}
      {alive && st !== 'none' && (
        <div className="cols" style={{ marginTop: 36, gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px,100%),1fr))', gap: 32 }}>
          {!(watching && !O.occ(G).q2w) && <Compare G={G} opps={opps} />}
          <Tasks G={G} st={st} P={P} pick={pick} onWatch={watch} watching={watching} />
        </div>)}
      {!alive && st !== 'none' && G.s.phase === 'seasonEnd' && <p style={{ marginTop: 24 }}><Link to="/review">{tn(G, 'Season review')}</Link></p>}
    </div>
  );
}
function PlayoffsMobile(x) {
  const { G, st, P, act, sub, pick, watch, watching, doneWatching, busy } = x;
  const alive = ['Q1', 'EL', 'Q2', 'wait', 'final'].includes(st);
  const [tab, setTab] = useTab(alive ? ['bracket', 'opps', 'tasks'] : ['bracket'], 'bracket');
  const q2Mine = P.Q2 && (P.Q2.home === G.user || P.Q2.away === G.user);
  const q2Btn = P.Q2 && !q2Mine && !watching ? <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={watch}>{P.Q2.res ? 'Step through it' : 'Watch live'}</button> : null;
  const left = alive ? [O.fwChoice(G, 'rest') || O.occ(G).rest[st], P.Q2 && !q2Mine ? O.occ(G).q2w : true].filter((v) => !v).length : 0;
  return (
    <MScreen top={{ title: T(G, 'Playoff week', 'प्लेअफ हप्ता'), sub: `Season ${seasonNo(G.year)}` }} pin={<p className="t-small" style={{ margin: 0 }}>{sub}</p>}
      label="Playoff week" tab={tab} onTab={setTab} tabs={alive ? [['bracket', T(G, 'Bracket', 'तालिका')], ['opps', T(G, 'Opponents', 'प्रतिद्वन्द्वी')], ['tasks', T(G, 'Tasks', 'काम'), left || null]] : undefined}
      actions={act ? <Act act={act} busy={busy} lg /> : null}>
      {watching && O.occ(G).q2log && <div style={{ marginTop: 12 }}><Replay log={O.occ(G).q2log} onDone={doneWatching} /></div>}
      {tab === 'bracket' && (st === 'none' ? <p className="mut t-small" style={{ paddingTop: 12 }}>The bracket appears when the league ends.</p> : <div style={{ paddingTop: 12 }}><Bracket G={G} P={P} hideQ2={watching && !O.occ(G).q2w} q2Btn={q2Btn} /></div>)}
      {tab === 'opps' && !(watching && !O.occ(G).q2w) && <div style={{ paddingTop: 12 }}><Compare G={G} opps={O.finalOpponents(G)} /></div>}
      {tab === 'tasks' && <div style={{ paddingTop: 12 }}><Tasks G={G} st={st} P={P} pick={pick} onWatch={watch} watching={watching} /></div>}
    </MScreen>
  );
}

export default function Playoffs() {
  const narrow = useNarrow(); const x = usePlayoffs();
  useEffect(() => { if (x.st !== 'none') O.markSeen(x.G, 'po'); }, [x.G, x.st]);
  return narrow ? <PlayoffsMobile {...x} /> : <PlayoffsDesktop {...x} />;
}
