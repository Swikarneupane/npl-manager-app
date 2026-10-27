import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import { Dot } from './bits.jsx';
import Sheet from './Sheet.jsx';
import { ovr, TYPE_LABEL } from '../game/engine.js';
import { BOWL_PHASES, PHASE_CAP } from '../game/game.js';
import { formDisp, tname, tshort, userNextFixture } from '../lib/util.js';

// Batting bands: the slot order is the batting order.
const BANDS = [[0, 'Openers', '1–2'], [2, 'Top order', '3'], [3, 'Middle', '4–5'], [5, 'Finishers', '6–7'], [7, 'Bowlers', '8–11']];
const PHASES = [['pp', 'Powerplay'], ['mid', 'Middle'], ['death', 'Death']];
const FILTERS = [['all', 'All', () => true], ['bat', 'Batters', (p) => p.bat >= 50], ['bowl', 'Bowlers', (p) => p.bowl >= 50], ['os', 'Overseas', (p) => p.nat !== 'NEP']];
const sur = (p) => p.name.split(' ').slice(-1)[0];
const where = (p) => (p.bat >= 65 ? 'bats 1–3' : p.bat >= 55 ? 'bats 4–5' : p.bat >= 45 ? 'bats 6–7' : 'bats 8–11');
const avail = (p) => (p.inj ? `Injured · ${p.inj}` : p.rest ? 'Rested' : p.fit < 80 ? `Fitness ${Math.round(p.fit)}%` : 'Fit');
const sign = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '±0');

// The last five appearances this season from stored scorecards: runs plus 20 a wicket.
function lastFive(G, p) {
  const out = [];
  for (const f of G.s.fixtures) {
    if (!f.card) continue; let v = null;
    for (const c of f.card) { const b = c.bat.find((x) => x[0] === p.name); if (b) v = (v || 0) + b[1]; const w = c.bowl.find((x) => x[0] === p.name); if (w) v = (v || 0) + w[3] * 20; }
    if (v != null) out.push(v);
  }
  return out.slice(-5);
}
function FormBars({ G, p }) {
  const v = lastFive(G, p);
  return <span className="f5" aria-label={v.length ? `Last ${v.length}: ${v.join(', ')}` : 'No matches yet'}>{v.map((x, i) => <i key={i} className={x >= 25 ? 'g' : ''} style={{ height: Math.max(4, Math.min(16, 4 + x / 4)) }} />)}</span>;
}

// What a role means at a slot, unless a warning or promise says more.
function subLine(G, p, n, warn, promised) {
  if (promised) return [promised, 'gld'];
  if (warn) return [warn.kind === 'high' ? 'Should bat higher' : 'Usually bats lower', 'crim'];
  if (n <= 2) return [p.role === 'WK' ? 'Keeper and opener' : 'Opener', 'mut'];
  if (n === 3) return ['Top order', 'mut'];
  if (n <= 5) return ['Middle order', 'mut'];
  if (n <= 7) return [p.bowl >= 50 ? 'Finisher, bowls' : 'Finisher', 'mut'];
  return [TYPE_LABEL[p.type] && p.bowl >= 40 ? TYPE_LABEL[p.type] : 'Tail', 'mut'];
}
const planTag = (pl) => { if (!pl) return null; const n = pl.pp + pl.mid + pl.death; if (!n) return null; const ph = PHASES.filter(([k]) => pl[k]).map(([k]) => ({ pp: 'PP', mid: 'middle', death: 'death' })[k]); return `${n} ov · ${ph.join(' + ')}`; };

// Effect of putting `inP` in place of `outId`: strength deltas, bowling options, and whether it is legal.
function swapEffect(G, t, order, outId, inP) {
  const next = order.map((id) => (id === outId ? inP.id : id));
  const a = G.teamStrength(order, order), b = G.teamStrength(next, next);
  const opts = (o) => o.filter((id) => G.P(id).bowl >= 50).length;
  const os = next.filter((id) => G.P(id).nat !== 'NEP').length; const out = G.P(outId);
  let why = null;
  if (inP.inj) why = `Injured for ${inP.inj} more match${inP.inj > 1 ? 'es' : ''}.`;
  else if (inP.rest) why = 'Rested for this match.';
  else if (os > 4) why = `Would make ${os} overseas. Swap him for an overseas player instead.`;
  else if (os < 4 && out.nat !== 'NEP' && t.squad.filter((id) => G.P(id).nat !== 'NEP' && !G.P(id).inj).length >= 4) why = 'Would leave 3 overseas. Swap him for another overseas player.';
  const wkLost = out.role === 'WK' && inP.role !== 'WK' && !next.some((id) => G.P(id).role === 'WK');
  return { next, bat: b.bat - a.bat, bowl: b.bowl - a.bowl, o0: opts(order), o1: opts(next), why, wkLost, gain: b.bat - a.bat + b.bowl - a.bowl };
}
const Tags = ({ e }) => (
  <span className="row" style={{ gap: 4 }}>
    {e.bat !== 0 && <span className={`ptag ${e.bat > 0 ? 'b' : 'c'}`}>Batting {sign(e.bat)}</span>}
    {e.bowl !== 0 && <span className={`ptag ${e.bowl > 0 ? 'b' : 'c'}`}>Bowling {sign(e.bowl)}</span>}
    <span className={`ptag${e.o1 < 5 ? ' c' : ''}`}>Bowling options {e.o0} → {e.o1}</span>
    {e.wkLost && <span className="ptag c">No keeper left</span>}
  </span>
);

function SwapSheet({ G, t, order, slot, benchIn, apply, onClose }) {
  const [tab, setTab] = useState('bench');
  const bench = t.squad.filter((id) => !order.includes(id)).map((id) => G.P(id));
  // Two modes: a slot going out (pick who comes in), or a bench player coming in (pick who goes out).
  if (benchIn) {
    const inP = G.P(benchIn);
    const rows = order.map((id, i) => ({ p: G.P(id), i, e: swapEffect(G, t, order, id, inP) })).sort((a, b) => (!!a.e.why - !!b.e.why) || b.e.gain - a.e.gain);
    return (
      <Sheet title={`Bring in ${sur(inP)}`} onClose={onClose}>
        <div className="panel swap-cur"><span className="board-f faint">+</span><span><span className="t-small b6">{inP.name}</span><br /><span className="t-micro faint">{inP.role} · {ovr(inP)} · form {formDisp(inP)} · {where(inP)}</span></span><span className="ptag b">Coming in</span></div>
        <p className="t-micro faint">Who makes way?</p>
        <ul className="swap-list">{rows.map(({ p, i, e }, k) => (
          <li key={p.id} className={`panel${e.why ? ' off' : ''}`}><span><span className="t-small b6">{i + 1}. {p.name}</span>{k === 0 && !e.why && <span className="ptag b" style={{ marginLeft: 6 }}>Best fit</span>}<br /><span className="t-micro faint">{p.role} · {ovr(p)} · form {formDisp(p)}</span></span>
            <button type="button" className={`btn btn-sm${k === 0 && !e.why ? ' btn-blue' : ''}`} disabled={!!e.why} onClick={() => { apply(e.next); onClose(); }}>Swap out</button>
            <Tags e={e} />{e.why && <span className="t-micro crim swap-why">{e.why}</span>}</li>))}</ul>
      </Sheet>
    );
  }
  const out = G.P(order[slot]);
  const cands = bench.map((p) => ({ p, e: swapEffect(G, t, order, out.id, p) })).sort((a, b) => (!!a.e.why - !!b.e.why) || b.e.gain - a.e.gain);
  const warnsNow = G.orderWarnings(order).length;
  return (
    <Sheet title={`Swap No. ${slot + 1}`} onClose={onClose}>
      <div className="panel swap-cur"><span className="board-f faint">{slot + 1}</span><span><span className="t-small b6">{out.name}</span><br /><span className="t-micro faint">{out.role} · {ovr(out)} · {where(out)}</span></span><span className="ptag">Going out</span></div>
      <div className="tabs" role="tablist" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))', margin: 0 }}>
        <button type="button" role="tab" aria-selected={tab === 'bench'} className={tab === 'bench' ? 'on' : ''} onClick={() => setTab('bench')}>From the bench</button>
        <button type="button" role="tab" aria-selected={tab === 'move'} className={tab === 'move' ? 'on' : ''} onClick={() => setTab('move')}>Move within the XI</button>
      </div>
      {tab === 'bench' ? (
        <ul className="swap-list">{cands.map(({ p, e }, k) => (
          <li key={p.id} className={`panel${e.why ? ' off' : ''}`}><span><span className="t-small b6">{p.name}</span>{p.nat !== 'NEP' && <span className="ptag b" style={{ marginLeft: 6 }}>OS</span>}{k === 0 && !e.why && <span className="ptag b" style={{ marginLeft: 6 }}>Best fit</span>}<br /><span className="t-micro faint">{p.role} · {ovr(p)} · form {formDisp(p)} · {where(p)}</span></span>
            <button type="button" className={`btn btn-sm${k === 0 && !e.why ? ' btn-blue' : ''}`} disabled={!!e.why} onClick={() => { apply(e.next); onClose(); }}>Swap in</button>
            <Tags e={e} />{e.why && <span className="t-micro crim swap-why">{e.why}</span>}</li>))}
          {!cands.length && <li className="faint t-small">Nobody on the bench.</li>}</ul>
      ) : (
        <ul className="swap-list">{order.map((id, j) => { if (j === slot) return null; const p = G.P(id); const next = order.slice(); [next[slot], next[j]] = [next[j], next[slot]]; const w = G.orderWarnings(next).length; return (
          <li key={id} className="panel"><span><span className="t-small b6">No. {j + 1} · {p.name}</span><br /><span className="t-micro faint">{sur(out)} would bat {j + 1}, {sur(p)} {slot + 1}</span></span>
            <button type="button" className="btn btn-sm" onClick={() => { apply(next); onClose(); }}>Swap places</button>
            <span className="row" style={{ gap: 4 }}><span className={`ptag${w > warnsNow ? ' c' : w < warnsNow ? ' b' : ''}`}>Order warnings {warnsNow} → {w}</span></span></li>); })}</ul>
      )}
    </Sheet>
  );
}

function PlanEditor({ G, t, order, onClose, update }) {
  const plan = t.bowlPlan || {};
  const ps = order.map((id) => G.P(id)).filter((p) => p.bowl >= 30 || plan[p.id]).sort((a, b) => b.bowl - a.bowl);
  const used = (k) => Object.entries(plan).filter(([id]) => order.includes(id)).reduce((a, [, x]) => a + (x[k] || 0), 0);
  const tot = (id) => (plan[id] ? plan[id].pp + plan[id].mid + plan[id].death : 0);
  const step = (id, k, d) => update(() => { const x = (t.bowlPlan[id] ??= { pp: 0, mid: 0, death: 0 }); x[k] += d; });
  return (
    <Sheet title="Bowling plan" onClose={onClose} wide foot={<div className="row" style={{ gap: 8, justifyContent: 'space-between', alignItems: 'center' }}><span className="t-small b6">{PHASES.map(([k, l]) => `${l} ${used(k)}/${BOWL_PHASES[k]}`).join(' · ')}</span><button type="button" className="btn" onClick={() => update(() => { t.bowlPlan = G.defaultBowlPlan(order); })}>Reset from ratings</button></div>}>
      <p className="t-micro faint">Powerplay 6, middle 9, death 5 overs. At most 4 overs a bowler, and no more than {PHASE_CAP.pp} / {PHASE_CAP.mid} / {PHASE_CAP.death} in one phase.</p>
      <table className="tbl plain compact plan-ed"><thead><tr><th>Bowler</th>{PHASES.map(([k, l]) => <th key={k} className="c">{l}</th>)}<th className="r">Overs</th></tr></thead>
        <tbody>{ps.map((p) => <tr key={p.id}><td className="wrapcell"><span className="t-small b6">{p.name}</span><br /><span className="t-micro faint">{p.type} · {p.bowl}</span></td>
          {PHASES.map(([k]) => { const v = (plan[p.id] && plan[p.id][k]) || 0; return <td key={k} className="c"><span className="stepper">
            <button type="button" className="btn btn-ghost btn-sm" aria-label={`One fewer ${k} over for ${p.name}`} disabled={v <= 0} onClick={() => step(p.id, k, -1)}>−</button><span className="board-f">{v}</span>
            <button type="button" className="btn btn-ghost btn-sm" aria-label={`One more ${k} over for ${p.name}`} disabled={tot(p.id) >= 4 || v >= PHASE_CAP[k] || used(k) >= BOWL_PHASES[k]} onClick={() => step(p.id, k, 1)}>+</button></span></td>; })}
          <td className="r board-f">{tot(p.id)}</td></tr>)}</tbody></table>
    </Sheet>
  );
}

function PlanSquares({ G, order, plan }) {
  const ps = order.map((id) => G.P(id)).filter((p) => plan[p.id] && planTag(plan[p.id]));
  return <ul className="plan-sq">{ps.map((p) => <li key={p.id}><span className="t-micro ell">{sur(p)}</span><span className="sq">{PHASES.flatMap(([k]) => Array.from({ length: plan[p.id][k] }, (_, i) => <i key={k + i} className={k} />))}</span></li>)}</ul>;
}

export default function TeamSheet() {
  const { G, update, toast } = useGame();
  const t = G.teams[G.user]; const f = userNextFixture(G);
  if (!t.xi || t.xi.length !== 11 || !t.order || t.order.length !== 11 || !t.order.every((id) => t.xi.includes(id) && t.squad.includes(id))) {
    const xi = t.xi && t.xi.length === 11 && t.xi.every((id) => t.squad.includes(id)) ? t.xi : G.autoXI(G.user);
    t.xi = xi.slice(); t.order = (t.order && t.order.length === 11 && t.order.every((id) => xi.includes(id))) ? t.order : G.autoOrder(xi);
  }
  if (!t.bowlPlan || Object.keys(t.bowlPlan).some((id) => !t.order.includes(id))) G.syncBowlPlan(G.user);
  const order = t.order; const plan = t.bowlPlan || {};
  const [swap, setSwap] = useState(null); const [planOpen, setPlanOpen] = useState(false); const [benchOpen, setBenchOpen] = useState(false); const [flt, setFlt] = useState('all');
  const [drag, setDrag] = useState(null); const [over, setOver] = useState(null); const listRef = useRef(null);

  const apply = (next) => update(() => { t.order = next.slice(); t.xi = next.slice(); G.s.settings.autoXI = false; G.syncBowlPlan(G.user); });
  const move = (from, to) => { if (to < 0 || to > 10 || from === to) return; const next = order.slice(); const [x] = next.splice(from, 1); next.splice(to, 0, x); apply(next); };
  const dropBench = (pid, slot) => { const e = swapEffect(G, t, order, order[slot], G.P(pid)); if (e.why) { toast(e.why); return; } apply(e.next); };

  const warns = G.orderWarnings(order); const wBy = Object.fromEntries(warns.filter((w) => w.pid).map((w) => [w.pid, w]));
  const rules = G.xiRules(G.user, order); const legal = G.validXI(G.user, order) && rules.every((r) => r.ok);
  const promised = Object.fromEntries((G.s.promises || []).map((pr) => [pr.pid, pr.kind === 'debut' ? 'Promised a debut' : 'Promised a start']));
  const opp = f ? (f.home === G.user ? f.away : f.home) : null;
  const me = G.teamStrength(order, order); const them = opp ? G.teamStrength(G.autoXI(opp)) : null; const win = them ? G.winChance(me, them) : null;
  const bench = t.squad.filter((id) => !order.includes(id)).map((id) => G.P(id)).sort((a, b) => (!!a.inj - !!b.inj) || ovr(b) - ovr(a));
  const benchShown = bench.filter(FILTERS.find(([k]) => k === flt)[2]);
  const planUsed = (k) => Object.entries(plan).filter(([id]) => order.includes(id)).reduce((a, [, x]) => a + (x[k] || 0), 0);
  const planTot = planUsed('pp') + planUsed('mid') + planUsed('death'); const nBowlers = Object.entries(plan).filter(([id, x]) => order.includes(id) && x.pp + x.mid + x.death > 0).length;
  const scout = f ? G.scoutReport(f) : null;
  const last = t.lastXI && t.lastXI.order && t.lastXI.order.length === 11 ? t.lastXI.order : null;
  const lastOk = last && last.every((id) => t.squad.includes(id) && !G.P(id).inj && !G.P(id).rest) && G.validXI(G.user, last);
  const confirm = () => { G.s.settings.autoXI = false; t.sheetFor = f ? f.n : null; autosave(G); toast(f ? `Team sheet confirmed for ${f.stage === 'L' ? `Match ${f.n}` : 'the next match'}.` : 'Team sheet saved.'); update(); };
  const autoPick = () => apply(G.autoOrder(G.autoXI(G.user)));

  // phone: drag by the handle with a finger (pointer events), or ↑ / ↓. Refs, not state, carry the
  // drag between events so a quick pointerup never reads a stale target.
  const fdrag = useRef(null);
  // desktop drag source (HTML5 drag events); dataTransfer is set too, as Firefox needs it to start a drag
  const hdrag = useRef(null);
  const pdown = (i) => (e) => { if (e.pointerType === 'mouse') return; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ } fdrag.current = { from: i, to: i }; setDrag({ from: 'xi', i }); setOver(i); };
  const pmove = (e) => { const d = fdrag.current; if (!d) return; const el = document.elementFromPoint(e.clientX, e.clientY); const row = el && el.closest('[data-slot]'); if (row && +row.dataset.slot !== d.to) { d.to = +row.dataset.slot; setOver(d.to); } };
  const pup = () => { const d = fdrag.current; if (!d) return; fdrag.current = null; setDrag(null); setOver(null); move(d.from, d.to); };
  const pcancel = () => { fdrag.current = null; setDrag(null); setOver(null); };
  const keys = (i) => (e) => { if (e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1); } if (e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1); } };

  const Row = (id, i) => {
    const p = G.P(id); const [sub, cls] = subLine(G, p, i + 1, wBy[id], promised[id]);
    return (
      <li key={id} data-slot={i} className={`ts-row${over === i && drag ? ' over' : ''}${drag && drag.from === 'xi' && drag.i === i ? ' dragging' : ''}`}
        draggable onDragStart={(e) => { hdrag.current = { from: 'xi', i }; e.dataTransfer.setData('text/plain', JSON.stringify({ from: 'xi', i })); e.dataTransfer.effectAllowed = 'move'; setDrag({ from: 'xi', i }); }}
        onDragEnd={() => { hdrag.current = null; setDrag(null); setOver(null); }}
        onDragOver={(e) => { e.preventDefault(); if (over !== i) setOver(i); }}
        onDrop={(e) => { e.preventDefault(); let d = hdrag.current; if (!d) { try { d = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { /* not ours */ } } hdrag.current = null; setDrag(null); setOver(null); if (!d) return; if (d.from === 'xi') move(d.i, i); else if (d.from === 'bench') dropBench(d.id, i); }}>
        <button type="button" className="ts-handle" aria-label={`Drag to reorder ${p.name}. Arrow keys move him.`} onPointerDown={pdown(i)} onPointerMove={pmove} onPointerUp={pup} onPointerCancel={pcancel} onKeyDown={keys(i)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg></button>
        <span className="board-f ts-n">{i + 1}</span>
        <button type="button" className="ts-who" onClick={() => setSwap({ slot: i })} aria-label={`Swap ${p.name}, number ${i + 1}`}>
          <span className="t-small b6 ts-name">{p.name}{p.role === 'WK' && <span className="ptag">(wk)</span>}{t.captainId === id && <span className="ptag">(c)</span>}{p.nat !== 'NEP' && <span className="ptag b">OS</span>}</span>
          <span className={`t-micro ${cls}`}>{sub}<span className="narrow"> · {p.role} · form {formDisp(p)}</span></span></button>
        <span className="row wide ts-meta" style={{ gap: 8 }}><span className="ptag">{p.role}</span><FormBars G={G} p={p} /></span>
        <span className="wide ts-plan">{planTag(plan[id]) && <span className="ptag">{planTag(plan[id])}</span>}</span>
        <span className="ts-acts"><span className="narrow ts-ud"><button type="button" className="btn btn-ghost btn-sm" aria-label={`Move ${p.name} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button><button type="button" className="btn btn-ghost btn-sm" aria-label={`Move ${p.name} down`} disabled={i === 10} onClick={() => move(i, i + 1)}>↓</button></span>
          <button type="button" className="btn btn-sm wide" onClick={() => setSwap({ slot: i })}>Swap</button></span>
      </li>);
  };
  const benchList = (
    <>
      <div className="chips" style={{ margin: '8px 0' }}>{FILTERS.map(([k, l]) => <button key={k} type="button" className={`chip chip-sm${flt === k ? ' on' : ''}`} aria-pressed={flt === k} onClick={() => setFlt(k)}>{l}</button>)}</div>
      <ul className="bench">{benchShown.map((p) => (
        <li key={p.id} draggable={!p.inj} onDragStart={(e) => { hdrag.current = { from: 'bench', id: p.id }; e.dataTransfer.setData('text/plain', JSON.stringify({ from: 'bench', id: p.id })); setDrag({ from: 'bench', id: p.id }); }} onDragEnd={() => { hdrag.current = null; setDrag(null); setOver(null); }}>
          <span className="t-small">{p.name}{p.nat !== 'NEP' && <span className="ptag b" style={{ marginLeft: 6 }}>OS</span>}<br /><span className={`t-micro ${p.inj ? 'crim' : 'faint'}`}>{p.role} · {ovr(p)} · {avail(p)}</span></span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={!!p.inj || !!p.rest} aria-label={`Add ${p.name} to the XI`} onClick={() => { setBenchOpen(false); setSwap({ benchIn: p.id }); }}>Add</button></li>))}
        {!benchShown.length && <li className="faint t-small">Nobody here.</li>}</ul>
    </>
  );
  const ruleRows = (
    <ul className="rules">{rules.map((r) => <li key={r.k}><span className="t-small">{r.label}</span><span className={`t-small b6 ${r.ok ? 'blu' : 'crim'}`}>{r.value} {r.ok ? '✓' : '✗'}</span></li>)}</ul>
  );
  const capKeeper = (
    <div className="row" style={{ gap: 10 }}>
      <label className="field" style={{ flex: '1 1 140px' }}><span className="lbl">Captain</span><select className="input" value={t.captainId && order.includes(t.captainId) ? t.captainId : ''} onChange={(e) => update(() => { t.captainId = e.target.value; })}><option value="" disabled>Pick a captain</option>{order.map((id) => <option key={id} value={id}>{G.P(id).name}</option>)}</select></label>
      <label className="field" style={{ flex: '1 1 140px' }}><span className="lbl">Wicketkeeper</span><select className="input" value={t.keeperId && order.includes(t.keeperId) ? t.keeperId : ''} onChange={(e) => update(() => { t.keeperId = e.target.value || null; })}><option value="">Auto</option>{order.map((id) => <option key={id} value={id}>{G.P(id).name}</option>)}</select></label>
    </div>
  );
  const Bar = ({ l, a, b }) => (
    <div><div className="sechead" style={{ margin: 0 }}><span className="t-small">{l}</span><span className="t-small"><b>{a}</b>{b != null && <span className="faint"> v {b}</span>}</span></div>
      <div className="sbar"><i style={{ width: `${a}%`, background: `var(--t-${G.user.toLowerCase()})` }} />{b != null && <i className="mk" style={{ left: `${b}%`, background: `var(--t-${opp.toLowerCase()})` }} />}</div></div>
  );
  return (
    <div className="tsheet">
      <div className="ts-head">
        <div><p className="t-small faint">Team sheet · {f ? `${f.stage === 'L' ? `Match ${f.n}` : f.stage} · ${f.date}${f.night ? ', 7:15 pm' : ', 3:00 pm'}` : 'no match scheduled'}</p>
          {f && <h1 className="t-h1 ts-title"><Dot id={G.user} />{tshort(G, G.user)} <span className="faint" style={{ fontWeight: 400 }}>v</span> <Dot id={opp} /><span className="wide">{tname(G, opp)}</span><span className="narrow">{tshort(G, opp)}</span></h1>}</div>
        <div className="row" style={{ gap: 8 }}><button type="button" className="btn wide" disabled={!lastOk} title={lastOk ? '' : 'Last XI is not available'} onClick={() => apply(last)}>Copy last XI</button><button type="button" className="btn" onClick={autoPick}>Auto-pick</button><button type="button" className="btn btn-primary wide" disabled={!legal} onClick={confirm}>Confirm team sheet</button></div>
      </div>
      <div className="ruletags narrow">{rules.map((r) => <span key={r.k} className={`ptag ${r.ok ? 'b' : 'c'}`}>{r.k === 'nep' ? `${r.value.replace(' of ', '/')} Nepali` : r.k === 'os' ? `${r.value.replace(' of ', '/')} overseas` : r.k === 'wk' ? 'Keeper' : r.k === 'bowl' ? `${r.value} bowlers` : 'Captain'} {r.ok ? '✓' : '✗'}</span>)}</div>
      {them && <div className="panel strength-sm narrow"><div><p className="t-micro faint">Batting</p><p className="board-f">{me.bat} <span className="t-micro faint">v {them.bat}</span></p></div><div><p className="t-micro faint">Bowling</p><p className="board-f">{me.bowl} <span className="t-micro faint">v {them.bowl}</span></p></div><div><p className="t-micro faint">Win chance</p><p className="board-f">{Math.round(win * 100)}%</p></div></div>}
      {scout && <div className="scout wide"><span className="t-small blu b6">Scout report</span><span className="t-small">{scout}</span></div>}
      <div className="ts-grid">
        <section className="panel ts-bench wide" aria-label="Bench"><div className="sechead" style={{ margin: 0 }}><h2 className="t-h3">Bench · {bench.length}</h2><span className="t-micro faint">Drag onto the sheet</span></div>{benchList}</section>
        <section className="ts-sheet" aria-label="Team sheet">
          <div className="ts-band-h"><span className="board-f">PLAYING XI · BATTING ORDER</span><span className="blbl"><span className="wide">Drag a row to change the order</span><span className="narrow">Tap to swap</span></span></div>
          <ol ref={listRef}>{BANDS.map(([start, label, nums], b) => { const end = b + 1 < BANDS.length ? BANDS[b + 1][0] : 11; return [<li key={`b${b}`} className="ts-band"><span className="sec">{label}<span className="wide"> · {nums}</span></span></li>, ...order.slice(start, end).map((id, k) => Row(id, start + k))]; })}</ol>
          {warns.length > 0 && <div className="ts-warn"><span className="t-small crim b6">{warns.length} order warning{warns.length > 1 ? 's' : ''}</span><span className="t-small">{warns.map((w) => w.text).join('. ')}.</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => apply(G.autoOrder(order))}>Fix the order for me</button></div>}
        </section>
        <aside className="ts-aside">
          <section className="panel wide"><h2 className="t-h3">Rules</h2>{ruleRows}<div style={{ marginTop: 10 }}>{capKeeper}</div></section>
          {them && <section className="panel stack wide" style={{ gap: 10 }}><div className="sechead" style={{ margin: 0 }}><h2 className="t-h3">Team strength</h2><span className="t-micro"><i className="mkey" style={{ background: `var(--t-${opp.toLowerCase()})` }} />{tshort(G, opp)}</span></div>
            <Bar l="Batting" a={me.bat} b={them.bat} /><Bar l="Bowling" a={me.bowl} b={them.bowl} /><Bar l="Fielding" a={me.field} b={them.field} />
            <p className="t-micro faint">Win chance today: <b style={{ color: 'var(--ink)' }}>{Math.round(win * 100)}%</b></p></section>}
          <section className="panel ts-plan-card"><div className="sechead" style={{ margin: 0 }}><h2 className="t-h3">Bowling plan</h2><span className={`t-small b6 ${planTot === 20 ? 'blu' : 'crim'}`}>{planTot} / 20 overs {planTot === 20 ? '✓' : ''}</span></div>
            <p className="t-micro faint narrow">{nBowlers} bowlers · powerplay {planUsed('pp')} · middle {planUsed('mid')} · death {planUsed('death')}</p>
            <div className="wide"><p className="t-micro faint pkey">{PHASES.map(([k, l]) => <span key={k}><i className={k} />{l}</span>)}</p><PlanSquares G={G} order={order} plan={plan} /></div>
            <p className="t-micro faint">Your captain follows this plan unless you pick bowlers yourself.</p>
            <button type="button" className="btn btn-sm" onClick={() => setPlanOpen(true)}>Edit plan</button></section>
          <section className="panel narrow ts-bench-card"><div className="sechead" style={{ margin: 0, alignItems: 'center' }}><span><span className="t-small b6">Bench · {bench.length}</span><br /><span className="t-micro faint">{bench.filter((p) => p.inj).length} injured · {bench.filter((p) => !p.inj).slice(0, 2).map(sur).join(' and ') || 'nobody'} available</span></span><button type="button" className="btn btn-sm" onClick={() => setBenchOpen(true)}>Open</button></div></section>
          <section className="panel narrow">{capKeeper}</section>
          {scout && <p className="t-micro narrow"><b className="blu">Scout report:</b> {scout}</p>}
        </aside>
      </div>
      <div className="tsbar narrow"><button type="button" className="btn btn-primary b6" disabled={!legal} onClick={confirm}>Confirm team sheet</button><button type="button" className="btn" disabled={!lastOk} onClick={() => apply(last)}>Copy last XI</button></div>
      {!legal && <p className="t-micro crim" style={{ marginTop: 8 }}>Fix the rules marked ✗ to confirm. If the XI is not legal at match time, the captain picks one for you.</p>}
      {swap && <SwapSheet G={G} t={t} order={order} slot={swap.slot} benchIn={swap.benchIn} apply={apply} onClose={() => setSwap(null)} />}
      {planOpen && <PlanEditor G={G} t={t} order={order} update={update} onClose={() => setPlanOpen(false)} />}
      {benchOpen && <Sheet title={`Bench · ${bench.length}`} onClose={() => setBenchOpen(false)}>{benchList}</Sheet>}
      <p className="t-micro faint" style={{ marginTop: 12 }}>Ratings are out of 100. <Link to="/squad?tab=list">Squad list</Link> has training, wages and contracts.</p>
    </div>
  );
}
