import '../styles/matchday.css';
import { useState } from 'react';
import { useGame } from '../lib/store.jsx';
import { Meter } from './bits.jsx';
import { batComp, fieldComp, compLabel } from '../game/composure.js';
import * as MD from '../game/matchday.js';

const sur = (p) => p.name.split(' ').slice(-1)[0];
const pc = (p) => `${Math.round(p * 100)}%`;

// Each phase of the current innings: score, the plan, and whether it worked.
export function PhaseRail({ lm, compact }) {
  const { G } = useGame(); const i = lm.inn; if (!i) return null;
  const rail = MD.phaseRail(G, lm.m, i);
  return (
    <div className="md-rail" aria-label="Innings phases">{rail.map((r) => (
      <div key={r.k} className="stack" style={{ gap: 4 }}>
        <div className={`meter${r.started && (r.ok || !r.verdict) ? ' blue' : ''}`}><i className={r.verdict && !r.ok ? 'c' : ''} style={{ width: `${Math.round(r.fill * 100)}%` }} /></div>
        <span className="t-small"><b>{r.l}</b>{r.started && <span className="mut"> {r.r}/{r.w}{!compact && r.plan ? ` · ${r.plan}` : ''}{r.verdict ? ` · ${r.verdict}` : r.live ? ' so far' : ''}</span>}</span>
      </div>))}</div>);
}

// Composure gauges for both batters and the fielding side.
export function CompPanel({ lm }) {
  const { G } = useGame(); const i = lm.inn; const m = lm.m; if (!i) return null;
  const row = (label, v, sub) => <div className="stack" style={{ gap: 4 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{label}</span><span className={`t-small ${v < 40 ? 'crim' : v >= 70 ? 'blu' : 'mut'}`}>{compLabel(v)}</span></div>
    <div className={`gauge${v < 40 ? ' low' : v >= 70 ? ' high' : ''}`}><Meter pct={v} /><span className="num">{Math.round(v)}</span></div>{sub && <span className="faint t-micro">{sub}</span>}</div>;
  return (
    <div className="panel stack" style={{ gap: 12 }}><h2 className="sec" style={{ margin: 0 }}>Composure at the crease</h2>
      {[i.striker, i.non].filter((id) => id && i.bs[id] && !i.bs[id].out).map((id) => { const p = G.P(id), s = i.bs[id]; return <div key={id}>{row(<><b style={{ fontWeight: 600 }}>{p.name}{id === i.striker ? '*' : ''}</b> {s.r} ({s.b})</>, batComp(m, i, id))}</div>; })}
      {row(`${G.teams[i.bowl].name.split(' ')[0]} fielders`, fieldComp(m, i.bowl))}
    </div>);
}

// Impact Player, timeouts, reviews and a message out.
export function Dugout({ lm }) {
  const { G } = useGame(); const m = lm.m; const i = lm.inn; const [pick, setPick] = useState({ out: '', in: '' });
  if (!i || lm.done) return null; const D = m.dug || {}; const imp = MD.impactOptions(G, m);
  const revs = i.bat === G.user ? i.reviews : ((m.bowlRev || {})[i.bat] ?? 2);
  const act = (fn) => { fn(); lm.refresh(); };
  const outId = pick.out || (imp && imp.outs[imp.outs.length - 1]) || ''; const inOpt = imp ? imp.ins.filter((x) => outId && x.ok(outId)) : [];
  const inId = pick.in && inOpt.some((x) => x.id === pick.in) ? pick.in : (inOpt[0] && inOpt[0].id) || '';
  return (
    <div className="panel stack" style={{ gap: 8 }}><h2 className="sec" style={{ margin: 0 }}>Dugout</h2>
      <ul className="mlist">
        <li style={{ minHeight: 36, padding: '6px 0', flexWrap: 'wrap', gap: 6 }}><span className="grow">Impact Player</span>
          {D.imp ? <span className="mut t-small">Used · {G.P(D.imp.in).name} for {G.P(D.imp.out).name}, over {D.imp.ov}</span>
            : !imp || !imp.outs.length || !inOpt.length ? <span className="mut t-small">{(m.opt.subs || []).length ? 'Available · nobody to swap right now' : 'No substitutes named'}</span>
              : <span className="row" style={{ gap: 6 }}>
                <select className="input md-sel" aria-label="Impact player off" value={outId} onChange={(e) => setPick({ out: e.target.value, in: '' })}>{imp.outs.map((id) => <option key={id} value={id}>Off: {sur(G.P(id))}</option>)}</select>
                <select className="input md-sel" aria-label="Impact player on" value={inId} onChange={(e) => setPick({ ...pick, in: e.target.value })}>{inOpt.map((x) => <option key={x.id} value={x.id}>On: {sur(G.P(x.id))}</option>)}</select>
                <button type="button" className="btn btn-sm" onClick={() => act(() => MD.useImpact(G, m, outId, inId))}>Bring on</button></span>}</li>
        <li style={{ minHeight: 36, padding: '6px 0' }}><span className="grow">Strategic timeout</span>{MD.timeoutLeft(m) ? <button type="button" className="btn btn-sm" onClick={() => act(() => MD.callTimeout(G, m))}>Call timeout</button> : <span className="mut t-small">Used this innings</span>}</li>
        <li style={{ minHeight: 36, padding: '6px 0' }}><span className="grow">Reviews</span><span className="mut t-small">{revs} left</span></li>
        <li style={{ minHeight: 36, padding: '6px 0' }}><span className="grow">Send a message out</span>{MD.messageReady(m) ? <button type="button" className="btn btn-sm" onClick={() => act(() => MD.sendMessage(G, m))}>{i.bat === G.user ? 'Drinks runner' : 'To the captain'}</button> : <span className="mut t-small">Sent recently</span>}</li>
      </ul>
    </div>);
}

// The other game on the same date, in step with this one.
export function AlsoLive({ lm, line }) {
  const { G } = useGame(); const a = MD.alsoLine(G, lm.also, lm.progress(), lm.done); if (!a) return null;
  if (line) return <p className="t-small mut" style={{ padding: '8px 0', borderBottom: '1px solid var(--rule)' }}><span className={a.done ? 'faint' : 'crim'}>{a.done ? '' : '● '}</span>{a.head}: <b style={{ color: 'var(--ink)', fontWeight: 600 }}>{a.text}</b></p>;
  return <div className="panel stack" style={{ gap: 4, padding: '12px 16px' }}><p className="t-micro faint">{!a.done && <span className="crim">● </span>}{a.head}</p><p className="t-small b6">{a.text}</p></div>;
}

// The gold key-moment card: one decision, 2-3 options with the change in win chance.
export function KeyChoices({ lm, sheet }) {
  const p = lm.pending; const km = p.km;
  return (
    <div className="stack md-km" style={{ gap: 8, marginTop: sheet ? 0 : 16 }}>{km.opts.map((o, k) => (
      <button key={o.k} type="button" className={`choice${p.pick === k ? ' on' : ''}`} style={sheet ? { padding: '10px 12px' } : undefined} onClick={() => { p.pick = k; lm.refresh(); }}>
        <span style={{ fontWeight: 600 }}>{o.label}</span><span className="fx">{o.how}</span>
        <span className="fx">Win chance <span className={o.dir}>{pc(km.wp0)} → {pc(o.wp1)}</span>{o.risk ? ` · ${o.risk}` : ''}</span></button>))}</div>);
}
export function KeyModal({ lm }) {
  const p = lm.pending; if (!p || p.type !== 'key') return null; const km = p.km;
  return (
    <div className="scrim" style={{ position: 'fixed' }}><div className="modal occasion" role="dialog" aria-modal="true" aria-labelledby="km" style={{ width: 'min(620px, 100%)' }}>
      <p className="gld t-small" style={{ fontWeight: 600 }}>Key moment · over {km.ov}</p>
      <h2 id="km" className="t-h2" style={{ marginTop: 6 }}>{km.title}</h2>
      <p className="mut t-small" style={{ marginTop: 6 }}>{km.sub}</p>
      <KeyChoices lm={lm} />
      <div className="acts"><button type="button" className="btn btn-primary btn-lg" onClick={() => lm.resolvePending(p.pick)}>Send the message out</button><button type="button" className="btn btn-ghost" onClick={() => lm.resolvePending(km.rec)}>Let the assistant decide</button></div>
    </div></div>);
}
// Phone: the decision fills the screen under the scoreboard.
export function KeySheet({ lm }) {
  const { G } = useGame(); const p = lm.pending; const km = p.km; const i = lm.inn; const m = lm.m;
  return (
    <div style={{ paddingTop: 12 }}>
      <ul className="mlist">{[i.striker, i.non].filter((id) => id && i.bs[id] && !i.bs[id].out).map((id) => { const v = batComp(m, i, id); return <li key={id} style={{ padding: '8px 0' }}><span className="grow"><b style={{ fontWeight: id === i.striker ? 600 : 400 }}>{G.P(id).name}{id === i.striker ? '*' : ''}</b> {i.bs[id].r} ({i.bs[id].b})</span><span className={`gauge${v < 40 ? ' low' : v >= 70 ? ' high' : ''}`} style={{ width: 120 }}><Meter pct={v} />{Math.round(v)}</span></li>; })}</ul>
      <p className="t-small mut" style={{ margin: '10px 0 6px', fontStyle: 'italic' }}>{km.title} {km.sub}</p>
      <p className="mhead" style={{ color: 'var(--gold)' }}>Over {km.ov} · your call</p>
      <KeyChoices lm={lm} sheet />
    </div>);
}
export function KeyActions({ lm }) {
  const p = lm.pending; const o = p.km.opts[p.pick] || p.km.opts[0];
  return <><button type="button" className="btn md-gold" style={{ flex: '1 1 auto' }} onClick={() => lm.resolvePending(p.pick)}>Go: {o.label.length > 28 ? `${o.label.slice(0, 27)}…` : o.label}</button><button type="button" className="btn btn-ghost" onClick={() => lm.resolvePending(p.km.rec)}>Assistant</button></>;
}
