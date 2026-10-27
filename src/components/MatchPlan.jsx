import { useState } from 'react';
import { useGame } from '../lib/store.jsx';
import { Meter, Seg } from './bits.jsx';
import { isPace, phaseOf } from '../game/engine.js';
import { formDisp } from '../lib/util.js';

// Batting intents and the engine aggression they map to. Auto keeps autoAggr.
export const INTENTS = [[-1, 'Block'], [-0.5, 'Rotate'], [0, 'Normal'], [1, 'Attack'], [2, 'Hit out']];
const RISK_DOTS = { '-1': ['b', 1], '-0.5': ['b', 2], 0: ['g', 2], 1: ['c', 3], 2: ['c', 4] };
export const FIELDS = [
  ['attack', 'Attacking', 'Slips and close catchers', [[22, 22], [38, 22], [20, 30], [40, 30], [24, 40], [36, 41], [30, 16], [44, 38], [16, 38]]],
  ['balanced', 'Balanced', 'Ring of five', [[18, 18], [42, 18], [14, 32], [46, 32], [30, 12], [22, 44], [38, 44], [30, 50], [50, 46]]],
  ['defend', 'Defensive', 'Five on the rope', [[8, 30], [52, 30], [14, 12], [46, 12], [30, 4], [14, 48], [46, 48], [30, 56], [22, 42]]],
  ['death', 'Death', 'Yorker field, long boundaries', [[10, 20], [50, 20], [6, 34], [54, 34], [30, 56], [18, 52], [42, 52], [30, 18], [30, 42]]],
];
const MODES = [['ball', 'Every ball'], ['over', 'Every over'], ['key', 'Key moments'], ['quick', 'Quick sim']];

// Buckets calibrated on sampled match states: Block is mostly Low, Normal Medium, Hit out High.
export const wktLevel = (p) => (p < 0.04 ? 'Low' : p < 0.06 ? 'Medium' : 'High');
export const bndLevel = (p) => (p < 0.12 ? 'Low' : p < 0.17 ? 'Medium' : 'High');
export const expOver = (P) => (P.one + 2 * P.two + 3 * P.three + 4 * P.four + 6 * P.six) * 6;
const figs = (s) => `${Math.floor(s.balls / 6)}${s.balls % 6 ? `.${s.balls % 6}` : ''}–${s.r}–${s.w}`;
const nearestIntent = (a) => INTENTS.reduce((b, x) => (Math.abs(x[0] - a) < Math.abs(b[0] - a) ? x : b))[0];

function RiskDots({ v }) {
  const [c, n] = RISK_DOTS[v];
  return <span className="rdots" aria-hidden="true">{[0, 1, 2, 3].map((k) => <i key={k} className={k < n ? c : ''} />)}</span>;
}
function Switch({ on, onChange, label, sub }) {
  return (
    <label className="autosw"><span><span className="t-small" style={{ fontWeight: 500 }}>{label}</span><br /><span className="t-micro faint">{sub}</span></span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} aria-label={label} /></label>
  );
}
function Batter({ G, i, id, lbl }) {
  if (!id || !i.bs[id] || i.bs[id].out) return <div className="pbox"><p className="t-micro faint">{lbl}</p><p className="t-small faint">—</p></div>;
  const p = G.P(id), s = i.bs[id];
  return <div className="pbox"><p className="t-micro faint">{lbl}</p><p className="t-small b6 ell">{p.name}{G.teams[i.bat].captainId === id ? ' (c)' : ''}</p><p><span className="board-f pbox-r">{s.r}</span> <span className="board-f faint pbox-b">({s.b})</span></p></div>;
}

export function BatPlan({ lm, children }) {
  const { G } = useGame(); const m = lm.m, i = lm.inn;
  const auto = i.aggr === 'auto'; const cur = auto ? nearestIntent(m.aggrFor(i)) : +i.aggr;
  const P = m.preview(i); const rem = i.order.filter((id) => !i.bs[id].out && !i.bs[id].in && !i.bs[id].batted);
  const nb = lm.nextBat && rem.includes(lm.nextBat) ? lm.nextBat : rem[0];
  const set = (v) => { i.aggr = v; lm.refresh(); };
  const ev = P ? expOver(P) : null; const wl = P ? wktLevel(P.wkt) : null;
  return (
    <section className="panel plan" aria-label="Batting plan">
      <div className="plan-h"><div><p className="t-h3">Your batting plan</p><p className="t-micro faint">Takes effect from the next ball</p></div><span className="ptag b">You're batting</span></div>
      <div className="plan-body"><div className="plan-a">
      <div className="intents" role="radiogroup" aria-label="Intent">
        {INTENTS.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={!auto && cur === v} className={`intent${!auto && cur === v ? ' on' : ''}${auto && cur === v ? ' auto' : ''}`} onClick={() => set(String(v))}><span>{l}</span><RiskDots v={v} /></button>)}
      </div>
      <div className="readouts">
        <div><p className="t-micro faint">Expected scoring</p><p className="board-f ro-v">{ev != null ? ev.toFixed(1) : '—'} <span className="t-small mut ro-u">an over</span></p><div style={{ marginTop: 4 }}><Meter pct={ev != null ? (ev / 12) * 100 : 0} blue /></div></div>
        <div><p className="t-micro faint">Wicket risk</p><p className={`board-f ro-v${wl === 'High' ? ' crim' : ''}`}>{wl || '—'}</p><div style={{ marginTop: 4 }} className={wl === 'High' ? 'meter-c' : ''}><Meter pct={P ? (P.wkt / 0.1) * 100 : 0} blue /></div></div>
      </div>
      </div><div className="plan-b">
      <Switch on={auto} onChange={(v) => set(v ? 'auto' : String(cur))} label="Auto intent" sub={i.target ? 'Follows the required rate for you' : 'Raises the tempo in the powerplay and at the death'} />
      <div className="pboxes narrow"><Batter G={G} i={i} id={i.striker} lbl="On strike" /><Batter G={G} i={i} id={i.non} lbl="Non-striker" /></div>
      {rem.length > 0 && <div><p className="t-micro faint" style={{ marginBottom: 6 }}>Next batter in</p>
        <div className="chips nbchips narrow" role="radiogroup" aria-label="Next batter in">{rem.slice(0, 3).concat(rem.slice(3).includes(nb) ? [nb] : []).map((id) => { const p = G.P(id); return <button key={id} type="button" role="radio" aria-checked={id === nb} className={`chip${id === nb ? ' on' : ''}`} onClick={() => { lm.nextBat = id === rem[0] ? null : id; lm.refresh(); }}>{p.name} · {formDisp(p)}</button>; })}</div>
        <select className="input wide" aria-label="Next batter in" value={nb} onChange={(e) => { lm.nextBat = e.target.value === rem[0] ? null : e.target.value; lm.refresh(); }}>
          {rem.map((id) => { const p = G.P(id); return <option key={id} value={id}>{p.name} · {p.role} · bat {p.bat} · form {formDisp(p)}</option>; })}</select></div>}
      </div></div>
      {children}
    </section>
  );
}

function FieldSvg({ dots, on }) {
  return (
    <svg viewBox="0 0 60 60" width="56" height="56" aria-hidden="true" className="fsvg">
      <circle cx="30" cy="30" r="27" fill="none" className="fs-l" strokeWidth="1.2" /><circle cx="30" cy="30" r="15" fill="none" className="fs-l" strokeDasharray="2 2" />
      <rect x="28" y="25" width="4" height="10" rx="1" className="fs-p" />
      {dots.map(([x, y], k) => <circle key={k} cx={x} cy={y} r="2.6" className={on ? 'fs-on' : 'fs-d'} />)}
    </svg>
  );
}

// Next over to be bowled, and whether the game is waiting for the user to pick its bowler.
export function nextOver(lm) {
  const i = lm.inn; const pend = lm.pending && lm.pending.type === 'bowler';
  const inProgress = i.balls % 6 !== 0 || i.overStart === i.balls;
  return { pend, n: Math.floor(i.balls / 6) + (pend || !inProgress ? 1 : 2) };
}
// The bowler the next over will go to (pending pick, or a choice made ahead of time).
export function plannedBowler(lm) { const { pend } = nextOver(lm); return pend ? lm.pending.pick : lm.nextBowler; }

export function BowlPlan({ lm, children }) {
  const { G } = useGame(); const m = lm.m, i = lm.inn; const { pend, n } = nextOver(lm);
  const lastId = pend ? i.last : i.cur; const pick = plannedBowler(lm);
  const lu = m.lineups[i.bowl];
  const [all, setAll] = useState(false);
  const pool = lu.xi.map((id) => G.P(id)).filter((p) => i.bw[p.id] || p.bowl >= 30).sort((a, b) => b.bowl - a.bowl);
  const front = pool.filter((p) => i.bw[p.id] || p.bowl >= 50 || p.id === pick);
  const list = all ? pool : front; const extra = pool.length - front.length;
  const choose = (id) => { if (pend) lm.pending.pick = id; else lm.nextBowler = lm.nextBowler === id ? null : id; lm.refresh(); };
  const auto = i.field === 'auto'; const fcur = auto ? m.fieldFor(i, phaseOf(i.balls)) : i.field;
  const P = m.preview(i, pend && pick ? { bowler: pick } : {});
  const st = i.striker && i.bs[i.striker] ? G.P(i.striker) : null; const ns = i.non && i.bs[i.non] ? G.P(i.non) : null;
  const rev = (m.bowlRev || {})[i.bat] ?? 2;
  return (
    <section className="panel plan" aria-label="Bowling plan">
      <div className="plan-h"><div><p className="t-h3">Over {n} · your bowling plan</p><p className="t-micro faint">{pend ? 'Pick a bowler and a field, then bowl' : 'Pick who bowls the next over. Field changes apply from the next ball.'}</p></div><span className="ptag b">You're bowling</span></div>
      <div><p className="t-micro faint" style={{ marginBottom: 6 }}>Bowler{pend ? '' : ` for over ${n}`}</p>
        <div className="bowlers" role="radiogroup" aria-label="Bowler">
          {list.map((p) => {
            const s = i.bw[p.id] || { balls: 0, r: 0, w: 0 }; const left = Math.floor((24 - s.balls) / 6);
            const done = s.balls + 6 > 24, last = p.id === lastId, inj = s.injured, now = !pend && p.id === i.cur && (i.balls % 6 !== 0 || i.overStart === i.balls);
            const dis = done || last || inj; const on = !dis && pick === p.id;
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} disabled={dis} className={`bcard${on ? ' on' : ''}`} onClick={() => choose(p.id)}>
                <span className="t-small b6 ell">{p.name}</span><span className="board-f bc-f">{figs(s)}</span>
                <span className="t-micro faint">{p.type} · {p.bowl}</span><span className={`t-micro bc-l ${on ? 'crim' : 'mut'}`}>{inj ? 'Injured' : done ? 'Done' : `${left} left`}</span>
                {(isPace(p.type) && p.bowl >= 68 && !done) || (last && !done) || now ? <span className="bc-tags">{isPace(p.type) && p.bowl >= 68 && !done && <span className="ptag g">Death specialist</span>}{now ? <span className="ptag b">Bowling now</span> : last && !done && <span className="ptag c">Bowled last over</span>}</span> : null}
              </button>);
          })}
        </div>{extra > 0 && <button type="button" className="linkbtn t-small" onClick={() => setAll(!all)}>{all ? 'Show front-line bowlers only' : `Show ${extra} more`}</button>}</div>
      <div><p className="t-micro faint" style={{ marginBottom: 6 }}>Field</p>
        <div className="fields" role="radiogroup" aria-label="Field">
          {FIELDS.map(([k, l, sub, dots]) => { const on = !auto && fcur === k; return (
            <button key={k} type="button" role="radio" aria-checked={on} className={`ftile${on ? ' on' : ''}${auto && fcur === k ? ' auto' : ''}`} onClick={() => { i.field = k; lm.refresh(); }}>
              <FieldSvg dots={dots} on={on} /><span><span className={`t-small b6${on ? ' crim' : ''}`} style={{ display: 'block' }}>{l}</span><span className="t-micro faint">{sub}</span></span></button>); })}
        </div></div>
      <Switch on={auto} onChange={(v) => { i.field = v ? 'auto' : fcur; lm.refresh(); }} label="Auto field" sub="The captain sets it for the phase" />
      <div className="riskrow">
        <div><p className="t-micro faint">Boundary risk</p><p className="t-small b6">{P ? bndLevel(P.four + P.six) : '—'}</p></div>
        <div><p className="t-micro faint">Wicket chance</p><p className="t-small b6">{P ? wktLevel(P.wkt) : '—'}</p></div>
        <div><p className="t-micro faint">Reviews left</p><p className="t-small b6">{rev}</p></div>
      </div>
      {st && <p className="t-micro faint">On strike: {st.name} {i.bs[st.id].r} ({i.bs[st.id].b}), {st.hand === 'L' ? 'left' : 'right'}-handed.{ns ? ` ${ns.name} ${i.bs[ns.id].r} (${i.bs[ns.id].b}) at the other end.` : ''}</p>}
      {children}
    </section>
  );
}

// Next ball / Sim over / ⋯ (phone sticky bar), or the full row of buttons (desktop strip).
export function Actions({ lm, strip }) {
  const { G, update } = useGame(); const [more, setMore] = useState(false);
  const i = lm.inn; const bowling = i && i.bowl === G.user; const { pend, n } = i ? nextOver(lm) : {};
  if (pend && bowling) {
    const pick = lm.pending.pick;
    return <div className="acts-row"><button type="button" className="btn btn-primary b6" onClick={() => lm.resolvePending(pick)}>Bowl over {n} · {pick ? G.P(pick).name.split(' ').slice(-1)[0] : 'captain'}</button><button type="button" className="btn" onClick={() => lm.resolvePending(null)}>Let captain pick</button></div>;
  }
  const main = lm.wait ? <button type="button" className="btn btn-primary b6" onClick={() => lm.resume()}>{lm.wait.label}</button> : <button type="button" className="btn b6" onClick={() => { lm.pauseReq = true; }}>Pause</button>;
  const settings = (
    <div className="stack" style={{ gap: 12 }}>
      <div className="field"><span className="lbl">Control mode</span><Seg options={MODES} value={lm.mode} onChange={(v) => lm.setMode(v)} label="Control mode" /></div>
      <div className="field"><span className="lbl">Playback speed</span><Seg options={[['0.5', '0.5×'], ['1', '1×'], ['2', '2×'], ['4', '4×']]} value={String(G.s.settings.speed)} onChange={(v) => update(() => { G.s.settings.speed = +v; })} label="Playback speed" /></div>
    </div>);
  if (strip) return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="acts-row strip">{main}<button type="button" className="btn" onClick={() => lm.sim('over')}>Sim over</button><button type="button" className="btn btn-ghost" onClick={() => lm.sim('innings')}>Sim innings</button><button type="button" className="btn btn-ghost" onClick={() => lm.sim('match')}>Sim match</button>
        <button type="button" className="btn btn-ghost" aria-expanded={more} onClick={() => setMore(!more)}>{more ? 'Hide settings' : 'Settings'}</button></div>
      {more && settings}
    </div>);
  return (
    <div className="stack" style={{ gap: 10 }}>
      {more && <div className="mact-more stack" style={{ gap: 12 }}><div className="row" style={{ gap: 8 }}><button type="button" className="btn" onClick={() => { setMore(false); lm.sim('innings'); }}>Sim innings</button><button type="button" className="btn" onClick={() => { setMore(false); lm.sim('match'); }}>Sim match</button></div>{settings}</div>}
      <div className="acts-row bar">{main}<button type="button" className="btn" onClick={() => lm.sim('over')}>Sim over</button><button type="button" className="btn dots" aria-label="More simulation options" aria-expanded={more} onClick={() => setMore(!more)}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></button></div>
    </div>
  );
}

