import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Modal, Seg } from '../components/bits.jsx';
import { LiveMatch } from '../lib/live.js';
import { ordinal } from '../game/game.js';
import { formDisp, last, nn, stageName, tname, tshort, userNextFixture, nextUnplayed } from '../lib/util.js';
import { simUntilUser, savedMatchFor } from '../lib/flow.js';
import { autosave } from '../lib/save.js';
import { xiStatus } from './Home.jsx';

const MODES = [['ball', 'Every ball'], ['over', 'Every over'], ['key', 'Key moments'], ['quick', 'Quick sim']];
const AGGR = [['-1', 'Defend'], ['0', 'Normal'], ['1', 'Attack'], ['2', 'All-out'], ['auto', 'Auto']];
const FIELD = [['attack', 'Attacking'], ['balanced', 'Balanced'], ['defend', 'Defensive'], ['death', 'Death'], ['auto', 'Auto']];

function Board({ lm }) {
  const { G } = useGame(); const m = lm.m, i = lm.inn;
  if (!i) return <><div className="bf mid">{tname(G, lm.f.home)} v {tname(G, lm.f.away)}</div><p className="blbl" style={{ marginTop: 8 }}>{lm.started ? 'Toss coming up…' : 'Match not started'}</p></>;
  const other = m.inns.length > 1 ? m.inns[0] : null;
  const rr = i.balls ? (i.runs / (i.balls / 6)).toFixed(2) : '0.00';
  const wp = m.winProb();
  let p = i.target ? wp.p : 1 / (1 + Math.exp(-(wp.proj - 158) / 20));
  if (lm.done && m.result) p = m.result.winner === i.bat ? 1 : m.result.winner ? 0 : 0.5;
  const a = i.bat, b = i.bowl, pa = Math.round(p * 100);
  const need = i.target ? Math.max(0, i.target - i.runs) : 0, bl = m.maxBalls - i.balls;
  const Cell = ({ l, children }) => <div className="cell"><span className="blbl">{l}</span><span className="bf mid">{children}</span></div>;
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '18px 36px' }}>
        <div className="stack" style={{ gap: 6 }}>
          <span className="blbl" style={{ display: 'flex', alignItems: 'center' }}><Dot id={a} />{tname(G, a)}{i.target ? ' · chasing' : ''}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}><span className="bf big">{i.runs}/{i.wkts}</span><span className="bf mid" style={{ color: 'var(--board-ink-2)' }}>{m.ovStr(i)} ov</span></div>
        </div>
        <span className="vr" />
        <div className="cells">
          {i.target && <><Cell l="Need">{need} off {bl}</Cell><Cell l="Target">{i.target}</Cell></>}
          <Cell l="Run rate">{rr}</Cell>
          {i.target ? <Cell l="Required">{bl ? (need / (bl / 6)).toFixed(2) : '–'}</Cell> : <Cell l="Projected">{wp.proj}</Cell>}
          <Cell l="Partnership">{i.partnership}</Cell>
        </div>
        <span style={{ flex: '1 1 0' }} />
        <div className="stack" style={{ gap: 6, textAlign: 'right' }}>
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

function Players({ lm }) {
  const { G } = useGame(); const i = lm.inn; if (!i) return null;
  const bat = (lbl, id) => { if (!id || !i.bs[id] || i.bs[id].out) return null; const p = G.P(id), s = i.bs[id];
    return <div className="panel" style={{ padding: '14px 16px' }}><p className="faint t-micro">{lbl}</p><p style={{ fontWeight: 600, marginTop: 2 }}>{p.name}{G.teams[i.bat].captainId === id ? ' (c)' : ''}</p><p style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}><span className="board-f" style={{ fontSize: 30, fontWeight: 600 }}>{s.r}</span><span className="mut board-f" style={{ fontSize: 18 }}>({s.b})</span></p><p className="faint t-micro num">4s {s.f} · 6s {s.s} · SR {s.b ? (100 * s.r / s.b).toFixed(1) : '–'}</p></div>; };
  const s = i.cur ? (i.bw[i.cur] || { balls: 0, r: 0, w: 0 }) : null; const left = s ? Math.max(0, 24 - s.balls) : 0;
  return (
    <>
      {bat('On strike', i.striker)}{bat('Non-striker', i.non)}
      {i.cur && <div className="panel" style={{ padding: '14px 16px' }}><p className="faint t-micro">Bowling</p><p style={{ fontWeight: 600, marginTop: 2 }}>{G.P(i.cur).name}</p><p style={{ marginTop: 4 }}><span className="board-f" style={{ fontSize: 30, fontWeight: 600 }}>{Math.floor(s.balls / 6)}.{s.balls % 6}–{s.r}–{s.w}</span></p><p className="faint t-micro num">Econ {s.balls ? (s.r / (s.balls / 6)).toFixed(2) : '–'} · {Math.floor(left / 6)}{left % 6 ? `.${left % 6}` : ''} left</p></div>}
    </>
  );
}

const Ball = ({ x }) => <span className={`ball ${x === '4' ? 'b4' : x === '6' ? 'b6' : x === 'W' ? 'bw' : x === 'wd' || x === 'nb' ? 'bx' : ''}`}>{x}</span>;
function Over({ lm }) {
  const i = lm.inn; if (!i) return null;
  const legal = i.overSeq.filter((x) => x !== 'wd' && x !== 'nb').length;
  const complete = i.overSeq.length && i.balls % 6 === 0;
  const runs = i.overRuns || 0;
  return (
    <>
      <div className="stack" style={{ gap: 8 }}><span className="t-small mut">This over · {ordinal(complete ? i.balls / 6 : Math.floor(i.balls / 6) + 1)} · {runs} run{runs === 1 ? '' : 's'}</span>
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
      if (e.c === 'crowd') return <li key={key} className={`ev ev-crowd${nw}`}><span className="ov" /><span className="tx">{lang === 'en' ? txt : <span className="ne" style={{ margin: 0 }}>{nn(G, e.t)}</span>}</span></li>;
      if (e.c === 'mile') { const tag = /HAT|ह्याट/.test(e.t) ? 'HAT' : /FIVE|पाँच/.test(e.t) ? '5W' : /HUNDRED|शतक/.test(e.t) ? '100' : '50'; return <li key={key} className={`ev ev-mile${nw}`}><span className="ov" /><span className="tx"><span className="tag">{tag}</span>{txt}{ne}</span></li>; }
      if (e.c === 'drs') return <li key={key} className={`ev ev-drs${nw}`}><span className="ov" /><span className="tx"><span className="tag">DRS</span>{txt}{ne}</span></li>;
      if (e.c === 'drop') return <li key={key} className={`ev${nw}`}><span className="ov">{e.o}</span><span className="tx"><span className="tag gld">DROP</span>{txt}{ne}</span></li>;
      if (e.ball) {
        const ev = e.ev; const cls = ev === '4' ? 'ev-four' : ev === '6' ? 'ev-six' : ev === 'W' ? 'ev-wkt' : ev === 'dot' ? 'ev-dot' : '';
        const tag = ev === 'dot' ? '·' : ev; const tagc = ['1', '2', '3'].includes(ev) ? 'tag faint' : ev === 'wd' || ev === 'nb' ? 'tag gld' : 'tag';
        return <li key={key} className={`ev ${cls}${nw}`}><span className="ov">{e.o}</span><span className="tx"><span className={tagc}>{tag}</span>{e.bw && e.bt ? `${last(e.bw)} to ${last(e.bt)}: ` : ''}{txt}{ne}</span></li>;
      }
      return <li key={key} className={`ev${nw}`}><span className="ov" /><span className={`tx ${e.c && e.c.includes('inj') ? 'crim' : 'mut'}`}>{txt}{ne}</span></li>;
    })}</ol>
  );
}

function MainAction({ lm }) {
  const { G } = useGame(); const m = lm.m, i = lm.inn;
  let main;
  if (lm.pending && lm.pending.type === 'bowler') {
    let opts = m.bowlerOptions(i).map((id) => G.P(id)).sort((a, b) => b.bowl - a.bowl); const real = opts.filter((p) => p.bowl >= 30); if (real.length) opts = real;
    main = <div className="panel stack" style={{ gap: 8 }}><p className="sec" style={{ margin: 0 }}>Choose the bowler for over {Math.floor(i.balls / 6) + 1}</p>
      <table className="tbl plain compact"><tbody>{opts.map((p) => { const s = i.bw[p.id] || { balls: 0, r: 0, w: 0 }; return <tr key={p.id}><td style={{ paddingLeft: 0 }}>{p.name} <span className="faint t-micro">{p.type} · {p.bowl}</span></td><td className="r faint num">{Math.floor(s.balls / 6)}–{s.r}–{s.w}</td><td className="r"><button className="btn btn-sm" onClick={() => lm.resolvePending(p.id)}>Bowl</button></td></tr>; })}</tbody></table>
      <button className="btn btn-ghost btn-sm" onClick={() => lm.resolvePending(null)}>Let the captain choose</button></div>;
  } else if (lm.wait) main = <div className="row" style={{ gap: 10 }}><button type="button" className="btn btn-primary btn-lg" style={{ flex: '1 1 auto' }} onClick={() => lm.resume()}>{lm.wait.label}</button><button type="button" className="btn btn-lg" onClick={() => lm.sim('over')}>Sim to end of over</button></div>;
  else main = <div className="row" style={{ gap: 10 }}><button type="button" className="btn btn-lg" style={{ flex: '1 1 auto' }} onClick={() => { lm.pauseReq = true; }}>Pause</button><button type="button" className="btn btn-lg" onClick={() => lm.sim('over')}>Sim to end of over</button></div>;
  return main;
}

function Controls({ lm }) {
  const { G, update, ui } = useGame(); const nav = useNavigate(); const m = lm.m, i = lm.inn;
  const modeSeg = <div className="field"><span className="lbl">Control mode</span><Seg options={MODES} value={lm.mode} onChange={(v) => lm.setMode(v)} label="Control mode" /></div>;
  const speedSeg = <div className="field"><span className="lbl">Playback speed</span><Seg options={[['0.5', '0.5×'], ['1', '1×'], ['2', '2×'], ['4', '4×']]} value={String(G.s.settings.speed)} onChange={(v) => update(() => { G.s.settings.speed = +v; })} label="Playback speed" /></div>;
  if (lm.error) return <p className="crim">Match error: {lm.error}</p>;
  if (!lm.started) return <>{<button className="btn btn-primary btn-lg" onClick={() => lm.start()}>{lm.resumed ? 'Resume match' : 'Start match'}</button>}{lm.resumed ? <p className="faint t-small">Picking up where you left off.</p> : <p className="faint t-small">Your XI: {xiStatus(G)}. <Link to="/squad">Change</Link></p>}{modeSeg}{speedSeg}</>;
  if (lm.done) return <div className="row" style={{ gap: 10 }}><button className="btn btn-primary btn-lg" style={{ flex: '1 1 auto' }} onClick={() => { ui.liveSeen = true; ui.live = null; update(); nav('/'); }}>Continue</button><Link className="btn btn-lg" to={`/scorecard/${lm.f.n}`}>Full scorecard</Link></div>;
  const main = <div className="mainact stack" style={{ gap: 10 }}><MainAction lm={lm} /></div>;
  const bat = i && i.bat === G.user, bowl = i && i.bowl === G.user;
  const rem = bat ? i.order.filter((id) => !i.bs[id].out && !i.bs[id].in && !i.bs[id].batted) : [];
  const lu = i ? m.lineups[i.bowl] : null;
  const urev = i ? (i.bat === G.user ? i.reviews : ((m.bowlRev || {})[i.bat] ?? 2)) : 2;
  const aggrNote = i && i.target ? `Need ${i.target - i.runs} off ${m.maxBalls - i.balls}. Auto plays to the required rate.` : 'Auto raises the tempo in the powerplay and the death overs.';
  return (
    <>
      {main}
      <div className="row" style={{ gap: 8 }}><button className="btn btn-ghost btn-sm" onClick={() => lm.sim('innings')}>Sim innings</button><button className="btn btn-ghost btn-sm" onClick={() => lm.sim('match')}>Sim match</button></div>
      {modeSeg}{speedSeg}
      <hr className="hr" style={{ margin: 0 }} />
      <div className="field"><span className="lbl">Batting aggression</span><Seg options={AGGR} value={bat ? String(i.aggr) : 'auto'} disabled={!bat} style={bat ? undefined : { opacity: 0.5 }} onChange={(v) => { i.aggr = v; lm.refresh(); }} label="Batting aggression" /><p className="faint t-small">{bat ? aggrNote : `Used while ${tshort(G, G.user)} bat.`}</p></div>
      <div className="field"><span className="lbl">Field setting</span><Seg options={FIELD} value={bowl ? i.field : 'auto'} disabled={!bowl} style={bowl ? undefined : { opacity: 0.5 }} onChange={(v) => { i.field = v; lm.refresh(); }} label="Field setting" /><p className="faint t-small">{bowl ? 'Attacking takes more wickets but leaks boundaries.' : `Used while ${tshort(G, G.user)} bowl.`}</p></div>
      {rem.length > 0 && <div className="field"><label htmlFor="nextbat">Next batter in</label><select id="nextbat" className="input" style={{ width: '100%', height: 44 }} value={lm.nextBat || ''} onChange={(e) => { lm.nextBat = e.target.value || null; lm.refresh(); }}>
        <option value="">Batting order ({G.P(rem[0]).name})</option>{rem.map((id) => { const p = G.P(id); return <option key={id} value={id}>{p.name} · {p.role} · bat {p.bat} · form {formDisp(p)}</option>; })}</select></div>}
      {lu && <div className="panel stack" style={{ gap: 6 }}><p className="sec" style={{ margin: 0 }}>{tshort(G, i.bowl)} overs left</p>
        <table className="tbl plain compact"><tbody>{lu.xi.map((id) => G.P(id)).filter((p) => i.bw[p.id] || p.bowl >= 50).map((p) => { const s = i.bw[p.id] || { balls: 0, r: 0, w: 0 }; const left = 24 - s.balls; return <tr key={p.id}><td style={{ paddingLeft: 0 }}>{p.name}</td><td className="r">{s.injured ? <span className="crim">injured</span> : left <= 0 ? 'done' : `${Math.floor(left / 6)}${left % 6 ? `.${left % 6}` : ''} left`}</td><td className="r faint">{Math.floor(s.balls / 6)}.{s.balls % 6}–{s.r}–{s.w}</td></tr>; })}</tbody></table>
        <p className="faint t-micro">Reviews left: {tshort(G, G.user)} {urev}{m.weather && m.weather.type === 'pre' ? ` · Reduced to ${m.overs} overs` : ''}{m.dew ? ' · Dew tonight' : ''}</p></div>}
    </>
  );
}

function PendingModal({ lm }) {
  const { G } = useGame(); const p = lm.pending; if (!p) return null;
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

export default function Match() {
  const { G, ui, update, toast } = useGame(); const nav = useNavigate();
  let lm = ui.live;
  const f = userNextFixture(G);
  if ((!lm || (lm.done && ui.liveSeen)) && f && f === nextUnplayed(G)) { lm = ui.live = new LiveMatch(G, f, update, savedMatchFor(G, f)); ui.liveSeen = false; }
  if (lm) lm.onChange = update;
  if (!lm) {
    if (!f) return <><h1 className="t-h1">No match to play</h1><p className="mut" style={{ marginTop: 8 }}>{G.s.phase === 'preseason' ? 'The season has not started yet.' : 'Your next match will appear here.'}</p></>;
    return <><h1 className="t-h1">Next: {tname(G, f.home)} v {tname(G, f.away)}</h1><p className="mut" style={{ marginTop: 8 }}>Other matches come first.</p>
      <div className="row" style={{ marginTop: 16 }}><button className="btn btn-primary btn-lg" onClick={async () => { toast('Simulating other matches…'); await simUntilUser(G); autosave(G); ui.live = null; update(); }}>Simulate to this match</button><button className="btn btn-lg" onClick={() => nav('/')}>Home</button></div></>;
  }
  const m = lm.m; const toss = m.toss ? `${tname(G, m.toss.win)} won the toss and chose to ${m.toss.dec}` : 'Toss to come';
  return (
    <div style={{ maxWidth: 1220 }} className="stack">
      <p className="faint t-small" style={{ marginBottom: 10 }}>{stageName(lm.f)} · TU International Cricket Ground, Kirtipur · {lm.f.night ? 'Under lights' : 'Day match'} · {toss}</p>
      <section className="board" aria-label="Scoreboard"><Board lm={lm} /></section>
      <div className="split msplit" style={{ marginTop: 24, gap: 36 }}>
        <div className="stack" style={{ gap: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(200px,100%),1fr))', gap: 12 }}><Players lm={lm} /></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Over lm={lm} /></div>
          <section><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--rule-strong)', paddingBottom: 8 }}><h2 className="t-h3">Commentary</h2>{lm.started && <Link to={`/scorecard/${lm.f.n}`} className="t-small">Full scorecard</Link>}</div><Feed lm={lm} /></section>
        </div>
        <aside className="stack mctl" style={{ gap: 22 }}><Controls lm={lm} /></aside>
      </div>
      {lm.started && !lm.done && !lm.error && <div className="mact"><MainAction lm={lm} /></div>}
      <PendingModal lm={lm} />
    </div>
  );
}
