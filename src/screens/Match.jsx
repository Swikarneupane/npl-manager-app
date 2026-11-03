import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Modal as ModalBox, Seg } from '../components/bits.jsx';
import { LiveMatch } from '../lib/live.js';
import { ordinal } from '../game/game.js';
import { last, nn, stageName, tname, tshort, userNextFixture, nextUnplayed, useNarrow } from '../lib/util.js';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { Meter } from '../components/bits.jsx';
import { INTENTS } from '../components/MatchPlan.jsx';
import { batComp, fieldComp, compLabel } from '../game/composure.js';
import { tn } from '../lib/i18n.js';
import { simUntilUser, savedMatchFor, afterMatchRoute } from '../lib/flow.js';
import { PhaseRail, CompPanel, Dugout, AlsoLive, KeyModal, KeySheet, KeyActions } from '../components/MatchdayLive.jsx';
import { autosave } from '../lib/save.js';
import { xiStatus } from './Home.jsx';
import { Actions, BatPlan, BowlPlan, nextOver } from '../components/MatchPlan.jsx';
import { openDecisions } from '../components/DecisionSheet.jsx';

const MODES = [['ball', 'Every ball'], ['over', 'Every over'], ['key', 'Key moments'], ['quick', 'Quick sim']];

function Board({ lm }) {
  const { G } = useGame(); const m = lm.m, i = lm.inn;
  if (!i) return <><div className="bf mid">{tname(G, lm.f.home)} v {tname(G, lm.f.away)}</div><p className="blbl" style={{ marginTop: 8 }}>{lm.started ? 'Toss coming up…' : 'Match not started'}</p></>;
  const other = m.inns.length > 1 ? m.inns[0] : null;
  const rr = i.balls ? (i.runs / (i.balls / 6)).toFixed(2) : '0.00';
  const wp = m.winProb();
  let p = wp.p;
  if (lm.done && m.result) p = m.result.winner === i.bat ? 1 : m.result.winner ? 0 : 0.5;
  const a = i.bat, b = i.bowl, pa = Math.round(p * 100);
  const need = i.target ? Math.max(0, i.target - i.runs) : 0, bl = m.maxBalls - i.balls;
  const Cell = ({ l, children }) => <div className="cell"><span className="blbl">{l}</span><span className="bf mid">{children}</span></div>;
  return (
    <>
      <div className="brd-top">
        <div className="stack" style={{ gap: 6 }}>
          <span className="blbl" style={{ display: 'flex', alignItems: 'center' }}><Dot id={a} /><span className="wide">{tname(G, a)}</span><span className="narrow">{tshort(G, a)}</span>{i.target ? `\u00a0· chasing ${i.target}` : '\u00a0· batting'}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}><span className="bf big">{i.runs}/{i.wkts}</span><span className="bf mid" style={{ color: 'var(--board-ink-2)' }}>{m.ovStr(i)} ov</span></div>
        </div>
        <div className="stack narrow brd-r">
          {i.target ? <><span className="blbl">Need</span><span className="bf brd-m">{need} off {bl}</span><span className="blbl">Req {bl ? (need / (bl / 6)).toFixed(2) : '–'} · RR {rr}</span></>
            : <><span className="blbl">Projected</span><span className="bf brd-m">{wp.proj}</span><span className="blbl">RR {rr} · P'ship {i.partnership}</span></>}
        </div>
        <span className="vr wide" />
        <div className="cells wide">
          {i.target && <><Cell l="Need">{need} off {bl}</Cell><Cell l="Target">{i.target}</Cell></>}
          <Cell l="Run rate">{rr}</Cell>
          {i.target ? <Cell l="Required">{bl ? (need / (bl / 6)).toFixed(2) : '–'}</Cell> : <Cell l="Projected">{wp.proj}</Cell>}
          <Cell l="Partnership">{i.partnership}</Cell>
        </div>
        <span className="wide" style={{ flex: '1 1 0' }} />
        <div className="stack wide" style={{ gap: 6, textAlign: 'right' }}>
          <span className="blbl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}><Dot id={b} />{tname(G, b)}</span>
          {other ? <span className="bf mid">{other.runs}/{other.wkts} <span style={{ color: 'var(--board-ink-2)', fontSize: 22 }}>({m.ovStr(other)})</span></span> : <span className="bf mid" style={{ color: 'var(--board-ink-2)' }}>Yet to bat</span>}
        </div>
      </div>
      <div className="wprow" style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) auto', gap: 14, alignItems: 'center' }}>
        <span className="bf" style={{ fontSize: 18 }}>{tshort(G, a)} {pa}%</span>
        <div className="wp" role="img" aria-label={`Win probability ${tshort(G, a)} ${pa} percent`}><i style={{ width: `${pa}%`, background: `var(--t-${a.toLowerCase()})` }} /><i style={{ width: `${100 - pa}%`, background: `var(--t-${b.toLowerCase()})` }} /></div>
        <span className="bf" style={{ fontSize: 18, color: 'var(--board-ink-2)' }}>{100 - pa}% {tshort(G, b)}</span>
      </div>
      {lm.done && m.result && <p className="bf" style={{ fontSize: 22, marginTop: 12 }}>{m.result.text}</p>}
    </>
  );
}

function Players({ lm, bowlerOnly }) {
  const { G } = useGame(); const i = lm.inn; if (!i) return null;
  const bat = (lbl, id) => { if (!id || !i.bs[id] || i.bs[id].out) return null; const p = G.P(id), s = i.bs[id];
    return <div className="panel" style={{ padding: '14px 16px' }}><p className="faint t-micro">{lbl}</p><p style={{ fontWeight: 600, marginTop: 2 }}>{p.name}{G.teams[i.bat].captainId === id ? ' (c)' : ''}</p><p style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}><span className="board-f" style={{ fontSize: 30, fontWeight: 600 }}>{s.r}</span><span className="mut board-f" style={{ fontSize: 18 }}>({s.b})</span></p><p className="faint t-micro num">4s {s.f} · 6s {s.s} · SR {s.b ? (100 * s.r / s.b).toFixed(1) : '–'}</p></div>; };
  const s = i.cur ? (i.bw[i.cur] || { balls: 0, r: 0, w: 0 }) : null; const left = s ? Math.max(0, 24 - s.balls) : 0;
  return (
    <>
      {!bowlerOnly && <>{bat('On strike', i.striker)}{bat('Non-striker', i.non)}</>}
      {i.cur && <div className="panel" style={{ padding: '14px 16px' }}><p className="faint t-micro">Bowling</p><p style={{ fontWeight: 600, marginTop: 2 }}>{G.P(i.cur).name}</p><p style={{ marginTop: 4 }}><span className="board-f" style={{ fontSize: 30, fontWeight: 600 }}>{Math.floor(s.balls / 6)}.{s.balls % 6}–{s.r}–{s.w}</span></p><p className="faint t-micro num">Econ {s.balls ? (s.r / (s.balls / 6)).toFixed(2) : '–'} · {Math.floor(left / 6)}{left % 6 ? `.${left % 6}` : ''} left</p></div>}
    </>
  );
}

const Ball = ({ x }) => <span className={`ball ${x === '4' ? 'b4' : x === '6' ? 'b6' : x === 'W' ? 'bw' : x === 'wd' || x === 'nb' ? 'bx' : ''}`}>{x}</span>;
function Over({ lm }) {
  const { G } = useGame(); const i = lm.inn; if (!i) return null;
  const legal = i.overSeq.filter((x) => x !== 'wd' && x !== 'nb').length;
  const complete = i.overSeq.length && i.balls % 6 === 0;
  const runs = i.overRuns || 0;
  return (
    <>
      <div className="stack" style={{ gap: 8 }}><span className="t-small mut overline"><span>This over · {ordinal(complete ? i.balls / 6 : Math.floor(i.balls / 6) + 1)}{i.cur ? ` · ${G.P(i.cur).name}` : ''}</span><span>{runs} run{runs === 1 ? '' : 's'}</span></span>
        <div className="balls">{i.overSeq.map((x, k) => <Ball key={k} x={x} />)}{!complete && Array.from({ length: Math.max(0, 6 - legal) }, (_, k) => <span key={`n${k}`} className="ball next" />)}</div></div>
      {lm.prevOver && <div className="stack" style={{ gap: 8, alignItems: 'flex-end' }}><span className="t-small mut">Previous · {ordinal(lm.prevOver.n)} · {last(lm.prevOver.bowler)}</span><div className="balls" style={{ opacity: 0.75 }}>{lm.prevOver.seq.map((x, k) => <Ball key={k} x={x} />)}</div></div>}
    </>
  );
}

function Feed({ lm }) {
  const { G } = useGame(); const lang = G.s.lang; const animate = G.s.settings.animate;
  const seen = useRef(0); const log = lm.m.log; const fresh = log.length - seen.current;
  useEffect(() => { seen.current = log.length; });
  const items = log.slice(-160).map((e, idx, arr) => ({ e, key: log.length - arr.length + idx })).reverse();
  return (
    <ol className="feed" aria-live="polite">{items.map(({ e, key }, idx) => {
      const nw = animate && idx < fresh ? ' ev-new' : '';
      const ne = lang === 'both' && e.ne ? <span className="ne">{nn(G, e.ne)}</span> : null;
      const txt = lang === 'np' ? nn(G, e.t) : e.t;
      if (e.c === 'over' && e.ov) { const o = e.ov; return <li key={key} className={`ev-over${nw}`}><b>End of over {o.n}</b><span>{o.runs} run{o.runs === 1 ? '' : 's'}</span><span>{o.score}</span>{o.bats.map((b) => <span key={b}>{b}</span>)}<span>{o.need}</span><span>{o.bowler}</span></li>; }
      if (e.c === 'head' || e.c === 'result') return <li key={key} className={`ev-over${nw}`}><b className={e.c === 'result' ? 'crim' : ''}>{txt}</b></li>;
      if (e.c && e.c.includes('rain')) return <li key={key} className={`ev-rain${nw}`}>{txt}</li>;
      if (/^comp/.test(e.c || '')) return <li key={key} className={`ev${nw}`}><span className="ov" /><span className="tx mut"><i>{txt}</i>{ne}</span></li>;
      if (e.c === 'crowd') return <li key={key} className={`ev ev-crowd${nw}`}><span className="ov" /><span className="tx">{lang === 'en' ? txt : <span className="ne" style={{ margin: 0 }}>{nn(G, e.t)}</span>}</span></li>;
      if (e.c === 'mile') { const tag = /HAT|ह्याट/.test(e.t) ? 'HAT' : /FIVE|पाँच/.test(e.t) ? '5W' : /HUNDRED|शतक/.test(e.t) ? '100' : '50'; return <li key={key} className={`ev ev-mile${nw}`}><span className="ov" /><span className="tx"><span className="tag">{tag}</span>{txt}{ne}</span></li>; }
      if (e.c === 'expert') return <li key={key} className={`ev${nw}`}><span className="ov" /><span className="tx md-x">Expert: “{txt}”</span></li>;
      if (e.c === 'info key') return <li key={key} className={`ev ev-mile${nw}`}><span className="ov" /><span className="tx"><span className="tag gld">KEY</span>{txt}</span></li>;
      if (e.c === 'drs') return <li key={key} className={`ev ev-drs${nw}`}><span className="ov" /><span className="tx"><span className="tag">DRS</span>{txt}{ne}</span></li>;
      if (e.c === 'drop') return <li key={key} className={`ev${nw}`}><span className="ov">{e.o}</span><span className="tx"><span className="tag gld">DROP</span>{txt}{ne}</span></li>;
      if (e.ball) {
        const ev = e.ev; const cls = ev === '4' ? 'ev-four' : ev === '6' ? 'ev-six' : ev === 'W' ? 'ev-wkt' : ev === 'dot' ? 'ev-dot' : '';
        const tag = ev === 'dot' ? '·' : ev; const tagc = ['1', '2', '3'].includes(ev) ? 'tag faint' : ev === 'wd' || ev === 'nb' ? 'tag gld' : 'tag';
        return <li key={key} className={`ev ${cls}${nw}`}><span className="ov">{e.o}</span><span className="tx"><span className={tagc}>{tag}</span>{e.bw && e.bt ? `${last(e.bw)} to ${last(e.bt)}: ` : ''}{txt}{ne}{e.x && <span className="md-x">Expert: “{e.x}”</span>}</span></li>;
      }
      return <li key={key} className={`ev${nw}`}><span className="ov" /><span className={`tx ${e.c && e.c.includes('inj') ? 'crim' : 'mut'}`}>{txt}{ne}</span></li>;
    })}</ol>
  );
}

// Before the first ball and after the last: start or leave the match.
function StartDone({ lm }) {
  const { G, update, ui } = useGame(); const nav = useNavigate();
  if (lm.error) return <p className="crim">Match error: {lm.error}</p>;
  const due = !lm.started && !lm.done ? G.decisionsDue() : [];
  if (due.length) return (
    <section className="panel plan">
      <p className="t-small crim b6">{due.length} decision{due.length > 1 ? 's' : ''} before this match</p>
      <p className="t-small mut">Answer {due.length > 1 ? 'them' : 'it'} to start the match. Not answering in time picks the cautious option for you, and the board notices.</p>
      <div className="acts-row"><button className="btn btn-primary btn-lg" onClick={() => openDecisions(G, ui, update)}>Decide</button><button className="btn btn-lg" disabled>{lm.resumed ? 'Resume match' : 'Start match'}</button></div>
    </section>);
  if (lm.done) return <div className="acts-row"><button className="btn btn-primary btn-lg" onClick={() => { ui.liveSeen = true; ui.live = null; update(); nav(lm.afterPath || afterMatchRoute(G, lm.f)); }}>Continue</button><Link className="btn btn-lg" to={`/scorecard/${lm.f.n}`}>Full scorecard</Link></div>;
  return (
    <section className="panel plan">
      <div className="acts-row"><button className="btn btn-primary btn-lg" onClick={() => lm.start()}>{lm.resumed ? 'Resume match' : 'Start match'}</button></div>
      {lm.resumed ? <p className="faint t-small">Picking up where you left off.</p> : <p className="faint t-small">Your XI: {xiStatus(G)}. <Link to="/squad">Change</Link></p>}
      <div className="field"><span className="lbl">Control mode</span><Seg options={MODES} value={lm.mode} onChange={(v) => lm.setMode(v)} label="Control mode" /></div>
      <div className="field"><span className="lbl">Playback speed</span><Seg options={[['0.5', '0.5×'], ['1', '1×'], ['2', '2×'], ['4', '4×']]} value={String(G.s.settings.speed)} onChange={(v) => update(() => { G.s.settings.speed = +v; })} label="Playback speed" /></div>
    </section>
  );
}

// The plan card sits directly under the scoreboard: batting intent or bowling plan.
// On desktop the action buttons ride inside it as one control strip.
function Plan({ lm }) {
  const { G } = useGame(); const i = lm.inn;
  if (!lm.started || lm.done || lm.error) return <StartDone lm={lm} />;
  const strip = <div className="wide strip-wrap"><Actions lm={lm} strip /></div>;
  if (!i) return <section className="panel plan">{strip}</section>;
  const m = lm.m; const note = `${m.weather && m.weather.type === 'pre' ? `Reduced to ${m.overs} overs. ` : ''}${m.dew ? 'Dew tonight. ' : ''}`;
  if (i.bat === G.user) return <BatPlan lm={lm}><p className="t-micro faint">{note}Reviews left: {i.reviews}</p>{strip}</BatPlan>;
  return <BowlPlan lm={lm}>{note && <p className="t-micro faint">{note}</p>}{strip}</BowlPlan>;
}

function PendingModal({ lm, sheet }) {
  const { G } = useGame(); const p = lm.pending; if (!p) return null;
  const Modal = sheet ? BottomSheet : ModalBox;
  if (p.type === 'toss') return (
    <Modal><p className="faint t-small">Toss · {tname(G, lm.f.home)} v {tname(G, lm.f.away)}</p><h2 className="t-h2" style={{ marginTop: 6 }}>You won the toss.</h2>
      <p className="mut" style={{ marginTop: 8 }}>{lm.m.dew ? 'Dew is expected later tonight, which helps the side batting second.' : `Conditions look even. The pitch ${lm.m.pitch > 1.03 ? 'favours batters' : lm.m.pitch < 0.97 ? 'has something for bowlers' : 'looks true'}.`}</p>
      <div className="acts"><button className="btn btn-primary btn-lg" onClick={() => lm.resolvePending('bat')}>Bat first</button><button className="btn btn-lg" onClick={() => lm.resolvePending('field')}>Bowl first</button></div></Modal>);
  if (p.type === 'drs') {
    const i = p.info; const mineBat = i.side === 'bat'; const revLeft = mineBat ? lm.inn.reviews : ((lm.m.bowlRev || {})[lm.inn.bat] ?? 2);
    const hint = i.hint === 'doubt' ? (mineBat ? `${i.bat}: “Looked high.”` : 'Keeper: “Not sure, it might be sliding down.”') : (mineBat ? `${i.bat}: “I think that was hitting.”` : 'Bowler: “That’s plumb!”');
    return (
      <Modal><p className="faint t-small">{p.ov} · {p.bowler} to {i.bat}</p><h2 className="t-h2" style={{ marginTop: 6 }}>Umpire says <span className="crim">{mineBat ? 'OUT' : 'NOT OUT'}</span>, {i.how === 'lbw' ? 'LBW' : 'caught behind'}.</h2>
        <p className="mut" style={{ marginTop: 8 }}>Review? You have <b style={{ color: 'var(--ink)' }}>{revLeft} review{revLeft === 1 ? '' : 's'} left</b>.</p>
        <div className="panel" style={{ marginTop: 16, padding: '12px 14px', background: 'var(--sunk)' }}><p className="t-small mut"><i>{hint}</i></p></div>
        <div className="acts"><button className="btn btn-primary btn-lg" onClick={() => lm.resolvePending(true)}>Review</button><button className="btn btn-lg" onClick={() => lm.resolvePending(false)}>{mineBat ? 'Accept, walk off' : 'Accept the decision'}</button></div></Modal>);
  }
  return null;
}

// Phone: DRS and the toss open as a bottom sheet.
function BottomSheet({ children }) { return <div className="scrim" style={{ position: 'fixed', alignItems: 'flex-end', padding: 0 }}><div className="modal" role="dialog" aria-modal="true" style={{ width: '100%', maxWidth: 'none', borderRadius: '14px 14px 0 0', borderWidth: '1px 0 0', padding: '20px 16px calc(24px + env(safe-area-inset-bottom,0px))' }}>{children}</div></div>; }

// ===== Phone: pinned scoreboard, Live · Commentary · Card · Tactics, action bar =====
const AGGR = [['-1', 'Defend'], ['0', 'Normal'], ['1', 'Attack'], ['2', 'All-out'], ['auto', 'Auto']];
const nearest = (a) => INTENTS.reduce((b, x) => (Math.abs(x[0] - a) < Math.abs(b[0] - a) ? x : b))[0];
function aggrShort(lm) { const i = lm.inn; if (!i || i.bat !== lm.G.user) return 'Field'; if (i.aggr === 'auto') return 'Auto'; const v = String(nearest(+i.aggr)); return (AGGR.find((x) => x[0] === v) || AGGR[1])[1]; }

function MBoard({ lm, gold }) {
  const { G } = useGame(); const m = lm.m, i = lm.inn; const f = lm.f;
  const head = <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="blbl" style={{ display: 'flex', alignItems: 'center' }}>{i && <Dot id={i.bat} />}{tshort(G, f.home)} v {tshort(G, f.away)}{i ? (i.target ? ` · chasing ${i.target}` : ' · batting') : ''}</span><span className="blbl">{f.stage === 'L' ? `Match ${f.n}` : stageName(f)}</span></div>;
  if (!i) return <section className="board" style={{ borderRadius: 0, borderWidth: '0 0 1px', padding: '12px 16px', flex: 'none' }} aria-label="Scoreboard">{head}<p className="bf" style={{ fontSize: 28, marginTop: 6 }}>{lm.started ? 'Toss coming up' : 'Match not started'}</p></section>;
  const rr = i.balls ? (i.runs / (i.balls / 6)).toFixed(2) : '0.00'; const wp = m.winProb();
  let p = wp.p; if (lm.done && m.result) p = m.result.winner === i.bat ? 1 : m.result.winner ? 0 : 0.5;
  const pa = Math.round(p * 100); const need = i.target ? Math.max(0, i.target - i.runs) : 0; const bl = m.maxBalls - i.balls;
  const C = ({ l, children }) => <div className="stack"><span className="blbl">{l}</span><span className="bf" style={{ fontSize: 18 }}>{children}</span></div>;
  return (
    <section className={`board${gold ? ' md-km-board' : ''}`} style={{ borderRadius: 0, borderWidth: '0 0 1px', padding: '12px 16px', flex: 'none' }} aria-label="Scoreboard">
      {head}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span className="bf" style={{ fontSize: 48, lineHeight: 0.95 }}>{i.runs}/{i.wkts}</span><span className="bf" style={{ fontSize: 18, color: 'var(--board-ink-2)' }}>{m.ovStr(i)} ov</span></div>
        <div className="stack" style={{ textAlign: 'right' }}>{i.target ? <><span className="blbl">Need</span><span className="bf" style={{ fontSize: 22, lineHeight: 1.1 }}>{need} off {bl}</span></> : <><span className="blbl">Projected</span><span className="bf" style={{ fontSize: 22, lineHeight: 1.1 }}>{wp.proj}</span></>}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8, marginTop: 8 }}>
        <C l="Run rate">{rr}</C>{i.target ? <C l="Required">{bl ? (need / (bl / 6)).toFixed(2) : '–'}</C> : <C l="Par">{wp.par}</C>}<C l="Partnership">{i.partnership}</C>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr) auto', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <span className="bf" style={{ fontSize: 14 }}>{pa}%</span>
        <div className="wp" role="img" aria-label={`Win probability: ${tshort(G, i.bat)} ${pa} percent, ${tshort(G, i.bowl)} ${100 - pa} percent`}><i style={{ width: `${pa}%`, background: `var(--t-${i.bat.toLowerCase()})` }} /><i style={{ width: `${100 - pa}%`, background: `var(--t-${i.bowl.toLowerCase()})` }} /></div>
        <span className="bf" style={{ fontSize: 14, color: 'var(--board-ink-2)' }}>{100 - pa}%</span>
      </div>
      {lm.done && m.result && <p className="bf" style={{ fontSize: 18, marginTop: 8 }}>{m.result.text}</p>}
    </section>
  );
}
function CompGauge({ v, label }) { return <div className={`gauge${v < 40 ? ' low' : v >= 70 ? ' high' : ''}`}><span style={{ minWidth: 72 }}>{label}</span><Meter pct={v} /><span className="num" style={{ minWidth: 70, textAlign: 'right' }}>{compLabel(v)}</span></div>; }
function MLive({ lm, toFeed }) {
  const { G } = useGame(); const i = lm.inn; const m = lm.m;
  if (!lm.started) return <div style={{ paddingTop: 12 }}><StartDone lm={lm} /></div>;
  if (!i) return <p className="mut" style={{ paddingTop: 16 }}>{lm.pending && lm.pending.type === 'toss' ? 'You won the toss: choose to bat or bowl.' : 'Toss coming up…'}</p>;
  const bat = (id, strike) => { if (!id || !i.bs[id] || i.bs[id].out) return null; const p = G.P(id), s = i.bs[id];
    return <li key={id}><span className="grow"><b style={{ fontWeight: 600 }}>{p.name}{strike ? '*' : ''}</b> <span className="faint t-small">{s.f ? `4s ${s.f}` : ''}{s.f && s.s ? ' · ' : ''}{s.s ? `6s ${s.s}` : ''}</span></span><span className="board-f" style={{ fontSize: 20, fontWeight: 600 }}>{s.r} <span className="faint" style={{ fontWeight: 500 }}>({s.b})</span></span></li>; };
  const bw = i.cur ? i.bw[i.cur] || { balls: 0, r: 0, w: 0 } : null;
  const legal = i.overSeq.filter((x) => x !== 'wd' && x !== 'nb').length; const complete = i.overSeq.length && i.balls % 6 === 0;
  const recent = m.log.filter((e) => e.ball || e.c === 'over' || e.c === 'mile' || /^comp/.test(e.c || '')).slice(-4).reverse();
  return (
    <>
      <ul className="mlist">{bat(i.striker, true)}{bat(i.non, false)}
        {i.cur && <li><span className="grow">{G.P(i.cur).name} <span className="faint t-small">bowling</span></span><span className="board-f" style={{ fontSize: 20, fontWeight: 600 }}>{Math.floor(bw.balls / 6)}.{bw.balls % 6}–{bw.r}–{bw.w}</span></li>}</ul>
      <div className="stack" style={{ gap: 6, padding: '10px 0', borderBottom: '1px solid var(--rule)' }}>
        {[i.striker, i.non].filter((id) => id && i.bs[id] && !i.bs[id].out).map((id) => <CompGauge key={id} v={batComp(m, i, id)} label={last(G.P(id).name)} />)}
        <CompGauge v={fieldComp(m, i.bowl)} label={`${tshort(G, i.bowl)} field`} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>
        <span className="t-small mut">This over</span>
        <div className="balls" style={{ gap: 5 }}>{i.overSeq.map((x, k) => <Ball key={k} x={x} />)}{!complete && Array.from({ length: Math.max(0, 6 - legal) }, (_, k) => <span key={`n${k}`} className="ball next" />)}</div>
      </div>
      <div style={{ padding: '10px 0', borderBottom: '1px solid var(--rule)' }}><PhaseRail lm={lm} compact /></div>
      <AlsoLive lm={lm} line />
      <FeedList lm={lm} items={recent} />
      <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 6, color: 'var(--blue)' }} onClick={toFeed}>All commentary</button>
    </>
  );
}
// A few recent lines in the phone feed style (ball number, tag, text).
function FeedList({ lm, items }) {
  const { G } = useGame(); const lang = G.s.lang;
  return (
    <ol className="feed" aria-live="polite">{items.map((e, k) => {
      const txt = lang === 'np' ? nn(G, e.t) : e.t; const ne = lang === 'both' && e.ne ? <span className="ne">{nn(G, e.ne)}</span> : null;
      if (e.c === 'over' && e.ov) return <li key={k} className="ev-over"><b>Over {e.ov.n}</b><span>{e.ov.runs} run{e.ov.runs === 1 ? '' : 's'}</span><span>{e.ov.need}</span></li>;
      if (/^comp/.test(e.c || '')) return <li key={k} className="ev" style={{ gridTemplateColumns: '38px minmax(0,1fr)', gap: '4px 10px' }}><span className="ov" /><span className="tx mut"><i>{txt}</i></span></li>;
      if (e.c === 'mile') return <li key={k} className="ev ev-mile" style={{ gridTemplateColumns: '38px minmax(0,1fr)', gap: '4px 10px' }}><span className="ov" /><span className="tx">{txt}{ne}</span></li>;
      const ev = e.ev; const cls = ev === '4' ? 'ev-four' : ev === '6' ? 'ev-six' : ev === 'W' ? 'ev-wkt' : ev === 'dot' ? 'ev-dot' : '';
      const tag = ev === 'dot' ? '·' : ev; const tagc = ['1', '2', '3'].includes(ev) ? 'tag faint' : ev === 'wd' || ev === 'nb' ? 'tag gld' : 'tag';
      return <li key={k} className={`ev ${cls}${k === 0 ? ' ev-new' : ''}`} style={{ gridTemplateColumns: '38px minmax(0,1fr)', gap: '4px 10px' }}><span className="ov">{e.o}</span><span className="tx"><span className={tagc}>{tag}</span>{e.bw && e.bt ? `${last(e.bw)} to ${last(e.bt)}: ` : ''}{txt}{ne}{e.x && <span className="md-x">Expert: “{e.x}”</span>}</span></li>;
    })}</ol>
  );
}
function MCard({ lm }) {
  const { G } = useGame(); const m = lm.m; const [k, setK] = useState(m.inns.length - 1);
  if (!m.inns.length) return <p className="faint t-small" style={{ paddingTop: 12 }}>The scorecard starts with the first ball.</p>;
  const inn = m.inns[Math.min(k, m.inns.length - 1)];
  const rows = inn.order.filter((id) => inn.bs[id].batted || inn.bs[id].in || inn.bs[id].b > 0 || inn.bs[id].out);
  return (
    <>
      <div className="seg" role="group" aria-label="Innings" style={{ margin: '12px 0 6px', display: 'grid', gridTemplateColumns: `repeat(${m.inns.length},1fr)` }}>{m.inns.map((x, j) => <button key={j} type="button" className={inn === x ? 'on' : ''} onClick={() => setK(j)}>{tshort(G, x.bat)} {x.runs}/{x.wkts}</button>)}</div>
      <table className="tbl compact plain"><thead><tr><th style={{ paddingLeft: 0 }}>Batter</th><th className="r">R</th><th className="r">B</th><th className="r">SR</th></tr></thead>
        <tbody>{rows.map((id) => { const b = inn.bs[id]; const live = !b.out; return <tr key={id}><td style={{ paddingLeft: 0, fontWeight: live ? 500 : 400 }}>{G.P(id).name}{live && (id === inn.striker) ? '*' : ''} <span className="faint t-micro">{b.out ? b.how : 'not out'}</span></td><td className="r b6">{b.r}</td><td className="r">{b.b}</td><td className="r faint">{b.b ? ((100 * b.r) / b.b).toFixed(1) : '–'}</td></tr>; })}
          <tr><td style={{ paddingLeft: 0 }} className="faint">Extras</td><td className="r">{inn.extras}</td><td /><td /></tr></tbody></table>
      {inn.fow.length > 0 && <p className="t-small mut" style={{ marginTop: 10 }}><span className="faint">FoW</span> {inn.fow.map((x) => x.split(' ')[0]).join(', ')}</p>}
      {lm.started && <Link to={`/scorecard/${lm.f.n}`} className="t-small" style={{ display: 'inline-block', marginTop: 8 }}>Full scorecard with bowling</Link>}
    </>
  );
}
const NOTES = { '-1': 'Protect wickets, about 6 an over.', 0: 'Rotate strike, punish bad balls.', 1: 'Look for boundaries.', 2: 'Swing at everything. High wicket risk.', auto: 'Matched to the situation and the required rate.' };
function MTactics({ lm }) {
  const { G, update } = useGame(); const i = lm.inn;
  const batting = i && i.bat === G.user;
  const cur = !i ? 'auto' : i.aggr === 'auto' ? 'auto' : String(nearest(+i.aggr));
  const rem = i ? i.order.filter((id) => !i.bs[id].out && !i.bs[id].in && !i.bs[id].batted) : [];
  if (lm.done) return <div className="stack" style={{ gap: 8, paddingTop: 14 }}><p className="b6">{lm.m.result ? `${lm.m.result.text}.` : 'Match over.'}</p><p className="faint t-small">Tactics are set again in the next build-up.</p></div>;
  const nb = lm.nextBat && rem.includes(lm.nextBat) ? lm.nextBat : rem[0];
  const need = i && i.target ? (i.target - i.runs) / (Math.max(1, lm.m.maxBalls - i.balls) / 6) : null;
  return (
    <div className="stack" style={{ gap: 18, paddingTop: 14 }}>
      {batting && <div className="field"><span className="lbl" id="agg">Batting aggression</span>
        <div className="seg" role="group" aria-labelledby="agg" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))' }}>{AGGR.map(([v, l]) => <button key={v} type="button" className={cur === v ? 'on' : ''} style={{ padding: '0 2px', minHeight: 40, fontSize: 13 }} onClick={() => { i.aggr = v; lm.refresh(); }}>{l}</button>)}</div>
        <p className="faint t-small">{NOTES[cur]}{cur === '1' && need ? ` Needed: ${need.toFixed(2)} an over.` : ''}</p></div>}
      {batting && rem.length > 0 && <div className="field"><label htmlFor="nb">Next batter in</label>
        <select id="nb" className="input" style={{ width: '100%', height: 44 }} value={nb} onChange={(e) => { lm.nextBat = e.target.value === rem[0] ? null : e.target.value; lm.refresh(); }}>{rem.map((id) => { const p = G.P(id); return <option key={id} value={id}>{p.name} · {p.role} · {p.bat}</option>; })}</select></div>}
      {i && !batting && <BowlPlan lm={lm} />}
      {!i && <p className="faint t-small">Tactics open once the match starts.</p>}
      {i && lm.started && !lm.done && <Dugout lm={lm} />}
      {lm.started && !lm.done && <div className="field"><span className="lbl">Simulate</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><button type="button" className="btn" style={{ minHeight: 44 }} onClick={() => lm.sim('innings')}>Sim innings</button><button type="button" className="btn" style={{ minHeight: 44 }} onClick={() => lm.sim('match')}>Sim match</button></div>
        <p className="faint t-small">Your plan, the captain's bowling and the recommended key-moment calls play out to the end.</p></div>}
      <hr className="hr" style={{ margin: 0 }} />
      <div className="field"><span className="lbl" id="cm">Pause the game</span>
        <div className="seg" role="group" aria-labelledby="cm" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>{[['ball', 'Ball'], ['over', 'Over'], ['key', 'Key'], ['quick', 'Sim']].map(([k, l]) => <button key={k} type="button" className={lm.mode === k ? 'on' : ''} style={{ padding: '0 2px', minHeight: 40, fontSize: 12.5 }} onClick={() => lm.setMode(k)}>{l}</button>)}</div></div>
      <div className="field"><span className="lbl" id="sp">Playback speed</span>
        <div className="seg" role="group" aria-labelledby="sp" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>{[['0.5', '0.5×'], ['1', '1×'], ['2', '2×'], ['4', '4×']].map(([k, l]) => <button key={k} type="button" className={String(G.s.settings.speed) === k ? 'on' : ''} style={{ minHeight: 40 }} onClick={() => update(() => { G.s.settings.speed = +k; })}>{l}</button>)}</div></div>
    </div>
  );
}
function MActions({ lm, toTac }) {
  const { G, update, ui } = useGame(); const nav = useNavigate(); const i = lm.inn;
  if (lm.error) return null;
  if (lm.done) return <><button type="button" className="btn btn-primary" style={{ flex: '1 1 auto' }} onClick={() => { ui.liveSeen = true; ui.live = null; update(); nav(lm.afterPath || afterMatchRoute(G, lm.f)); }}>Continue</button><Link className="btn" to={`/scorecard/${lm.f.n}`}>Scorecard</Link></>;
  if (!lm.started) { const due = G.decisionsDue(); return due.length ? <button type="button" className="btn btn-primary" style={{ flex: '1 1 auto' }} onClick={() => openDecisions(G, ui, update)}>Answer {due.length} decision{due.length > 1 ? 's' : ''} to play</button> : <button type="button" className="btn btn-primary" style={{ flex: '1 1 auto' }} onClick={() => lm.start()}>{lm.resumed ? 'Resume match' : 'Start match'}</button>; }
  const { pend, n } = i ? nextOver(lm) : {};
  if (pend && i.bowl === G.user) { const pick = lm.pending.pick; return <><button type="button" className="btn btn-primary" style={{ flex: '1 1 auto' }} onClick={() => lm.resolvePending(pick)}>Bowl over {n} · {pick ? last(G.P(pick).name) : 'captain'}</button><button type="button" className="btn" onClick={() => lm.resolvePending(null)}>Captain</button></>; }
  return (
    <>
      {lm.wait ? <button type="button" className="btn btn-primary" style={{ flex: '1 1 auto' }} onClick={() => lm.resume()}>{lm.wait.label}</button> : <button type="button" className="btn" style={{ flex: '1 1 auto' }} onClick={() => { lm.pauseReq = true; }}>Pause</button>}
      <button type="button" className="btn" onClick={() => lm.sim('over')}>End of over</button>
      <button type="button" className="btn" onClick={toTac} aria-label={`Tactics: ${aggrShort(lm)}`}>{aggrShort(lm)}</button>
    </>
  );
}
function MatchMobile({ lm }) {
  const { G } = useGame(); const [tab, setTab] = useTab(['live', 'feed', 'card', 'tac'], 'live');
  const key = lm.pending && lm.pending.type === 'key';

  return (
    <MScreen top={false} pinRaw={<MBoard lm={lm} gold={key} />} label="Match sections" tab={tab} onTab={setTab}
      tabs={[['live', tn(G, 'Live')], ['feed', tn(G, 'Commentary')], ['card', tn(G, 'Card')], ['tac', tn(G, 'Tactics'), lm.inn ? aggrShort(lm) : null, true]]}
      actions={key ? <KeyActions lm={lm} /> : <MActions lm={lm} toTac={() => setTab('tac')} />}>
      {key && <KeySheet lm={lm} />}
      {!key && tab === 'live' && <MLive lm={lm} toFeed={() => setTab('feed')} />}
      {!key && tab === 'feed' && <div style={{ paddingTop: 4 }}><Feed lm={lm} /></div>}
      {!key && tab === 'card' && <MCard lm={lm} />}
      {!key && tab === 'tac' && <MTactics lm={lm} />}
      <PendingModal lm={lm} sheet />
    </MScreen>
  );
}

export default function Match() {
  const { G, ui, update, toast } = useGame(); const nav = useNavigate(); const narrow = useNarrow();
  let lm = ui.live;
  const f = userNextFixture(G);
  if ((!lm || (lm.done && ui.liveSeen)) && f && f === nextUnplayed(G)) { lm = ui.live = new LiveMatch(G, f, update, savedMatchFor(G, f)); ui.liveSeen = false; }
  if (lm) lm.onChange = update;
  if (!lm) {
    if (!f) return <><h1 className="t-h1">No match to play</h1><p className="mut" style={{ marginTop: 8 }}>{G.s.phase === 'preseason' ? 'The season has not started yet.' : 'Your next match will appear here.'}</p></>;
    return <><h1 className="t-h1">Next: {tname(G, f.home)} v {tname(G, f.away)}</h1><p className="mut" style={{ marginTop: 8 }}>Other matches come first.</p>
      <div className="row" style={{ marginTop: 16 }}><button className="btn btn-primary btn-lg" onClick={async () => { toast('Simulating other matches…'); await simUntilUser(G); autosave(G); ui.live = null; update(); }}>Simulate to this match</button><button className="btn btn-lg" onClick={() => nav('/')}>Home</button></div></>;
  }
  if (narrow) return <MatchMobile lm={lm} />;
  const m = lm.m; const toss = m.toss ? `${tname(G, m.toss.win)} won the toss and chose to ${m.toss.dec}` : 'Toss to come';
  const live = lm.started && !lm.done && !lm.error;
  return (
    <div style={{ maxWidth: 1220 }} className="stack matchpg">
      <div className="mhd narrow"><div className="stack"><p className="t-h3">{tshort(G, lm.f.home)} v {tshort(G, lm.f.away)}</p><p className="t-micro faint">{lm.f.stage === 'L' ? `Match ${lm.f.n}` : stageName(lm.f)} · Kirtipur · {lm.f.night ? 'under lights' : 'day match'}</p></div>{live && <span className="ptag c">● LIVE</span>}</div>
      <p className="faint t-small wide" style={{ marginBottom: 10 }}>{stageName(lm.f)} · TU International Cricket Ground, Kirtipur · {lm.f.night ? 'Under lights' : 'Day match'} · {toss}</p>
      <section className="board" aria-label="Scoreboard"><Board lm={lm} /></section>
      {lm.inn && <PhaseRail lm={lm} />}
      <div className="plan-slot"><Plan lm={lm} /></div>
      <div className="overrow"><Over lm={lm} /></div>
      <div className="split msplit" style={{ marginTop: 20, gap: 36 }}>
        <section><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--rule-strong)', paddingBottom: 8 }}><h2 className="t-h3">Commentary</h2>{lm.started && <Link to={`/scorecard/${lm.f.n}`} className="t-small">Scorecard</Link>}</div><Feed lm={lm} /></section>
        <aside className="stack wide" style={{ gap: 12, alignContent: 'start' }}><CompPanel lm={lm} />{live && <Dugout lm={lm} />}<AlsoLive lm={lm} /><Players lm={lm} bowlerOnly /></aside>
      </div>
      {live && <div className="mact"><Actions lm={lm} /></div>}
      <PendingModal lm={lm} /><KeyModal lm={lm} />
    </div>
  );
}
