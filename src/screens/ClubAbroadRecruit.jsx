// Recruitment by the league's rules: retention, then an auction, a draft or a contract market.
import { useState } from 'react';
import { useGame } from '../lib/store.jsx';
import { autosave } from '../lib/save.js';
import * as CR from '../world/career.js';
import * as K from '../world/club.js';
import * as RC from '../world/recruit.js';
import { short } from '../world/dates.js';
import '../styles/clubabroad.css';

const nm = (G, id) => { const p = RC.player(G, id); return p ? `${p.name} · ${p.role} · ${Math.round(p.bat)}/${Math.round(p.bowl)}${p.nat !== undefined ? ` · ${p.nat}` : ''}` : id; };

function Retain({ j, rec }) {
  const { G, update, toast } = useGame(); const code = j.comp; const keep = rec.keep[j.team]; const lim = RC.keepLimit(code);
  const act = (fn, m) => update(() => { const e = fn(); if (e) toast(e); else { autosave(G); if (m) toast(m); } });
  const toggle = (id) => act(() => RC.setKeep(G, code, j.team, keep.includes(id) ? keep.filter((x) => x !== id) : [...keep, id]));
  return (
    <section className="stack" style={{ gap: 10 }}>
      <div className="sechead"><h2 className="t-h3">Retention</h2><span className="t-small mut">Keeping {keep.length} of {lim >= 99 ? 'any' : lim}</span></div>
      <p className="t-small mut">Players you do not keep go back to the pool. Their wages come off the bill.</p>
      <ul className="mlist">{RC.idsOf(G, j.team).map((id) => <li key={id}><label className="chk grow"><input type="checkbox" checked={keep.includes(id)} onChange={() => toggle(id)} /><span className="t-small">{nm(G, id)}</span></label></li>)}</ul>
      <button type="button" className="btn btn-primary" onClick={() => act(() => RC.confirmRetain(G, code, Math.random), 'Retention confirmed.')}>Confirm retention</button>
    </section>
  );
}
function Auction({ j, rec }) {
  const { G, update, toast } = useGame(); const code = j.comp; const A = rec.auc; const t = j.team; const c = A.cur && !A.cur.done ? A.cur : null;
  const act = (fn) => update(() => { const e = fn(); if (e) toast(e); else autosave(G); });
  const p = c && RC.player(G, c.id);
  return (
    <section className="stack" style={{ gap: 12 }}>
      <div className="sechead"><h2 className="t-h3">Auction · lot {Math.min(A.i + 1, A.lots.length)} of {A.lots.length}</h2><span className="t-small mut">Your purse {A.purse[t]}</span></div>
      {c ? <div className="panel ca-lot"><p className="t-micro faint">On the block</p><p className="t-h3">{p.name}</p><p className="t-small mut">{nm(G, c.id)}{RC.isOS(p, t) ? ' · overseas' : ''}</p>
        <p className="ca-price">{c.price}</p><p className="t-small">{c.lead ? (c.lead === t ? 'You lead' : `${CR.nationName(G, c.lead)} leads`) : 'No bid yet'}</p>
        <div className="ca-row"><button type="button" className="btn btn-primary" onClick={() => act(() => RC.aucBid(G, code, t, Math.random))}>Bid</button><button type="button" className="btn" onClick={() => act(() => { RC.aucPass(G, code, Math.random, t); return null; })}>{c.lead === t ? 'Sold to me' : 'Pass'}</button></div></div>
        : <button type="button" className="btn btn-primary" onClick={() => act(() => { const n = RC.aucNext(G, code, Math.random, t); return n ? null : 'The auction is over.'; })}>{A.i + 1 >= A.lots.length ? 'Finish' : 'Next lot'}</button>}
      <div className="ca-row"><button type="button" className="btn btn-ghost" onClick={() => act(() => { RC.runRest(G, code, Math.random, null); return null; })}>Let the assistant finish</button>{A.i + 1 >= A.lots.length && !c && <button type="button" className="btn" onClick={() => act(() => { RC.finishCycle(G, code, Math.random); return null; })}>Close the room</button>}</div>
    </section>
  );
}
function Draft({ j, rec }) {
  const { G, update, toast } = useGame(); const code = j.comp; const t = j.team; const d = rec.dr; const turn = d.order[d.i]; const mine = turn === t;
  const act = (fn) => update(() => { const e = fn(); if (e) toast(e); else autosave(G); });
  return (
    <section className="stack" style={{ gap: 10 }}>
      <div className="sechead"><h2 className="t-h3">Draft · pick {Math.min(d.i + 1, d.order.length)} of {d.order.length}</h2><span className="t-small mut">{turn ? (mine ? 'Your pick' : 'Waiting for rivals') : 'Done'}</span></div>
      {!mine && turn && <button type="button" className="btn btn-primary" onClick={() => act(() => { RC.draftAuto(G, code, Math.random, t); return null; })}>Run picks until my turn</button>}
      {mine && <ul className="mlist">{rec.pool.slice(0, 40).map((id) => { const e = RC.canSign(G, t, RC.player(G, id), RC.idsOf(G, t)); const cat = RC.catOf(G, code, id);
        return <li key={id}><span className="grow t-small">{nm(G, id)}{cat ? <span className="cr-pill">{cat.name}</span> : null}</span><button type="button" className="btn btn-sm" disabled={!!e} title={e || ''} onClick={() => act(() => RC.draftPick(G, code, t, id))}>Pick</button></li>; })}</ul>}
      <div className="ca-row"><button type="button" className="btn btn-ghost" onClick={() => act(() => { RC.runRest(G, code, Math.random, null); return null; })}>Let the assistant finish</button>{!turn && <button type="button" className="btn" onClick={() => act(() => { RC.finishCycle(G, code, Math.random); return null; })}>Close the draft</button>}</div>
    </section>
  );
}
function Market({ j, rec }) {
  const { G, update, toast } = useGame(); const code = j.comp; const t = j.team; const [pct, setPct] = useState(0.95);
  const act = (fn) => update(() => { const r = fn(); if (typeof r === 'string') toast(r); else if (r && r.text) toast(r.text); autosave(G); });
  const ids = Object.keys(rec.mk.ask).slice(0, 40); const others = RC.teamsOf(code).filter((x) => x !== t).flatMap((x) => RC.idsOf(G, x).slice(0, 4));
  return (
    <section className="stack" style={{ gap: 10 }}>
      <div className="sechead"><h2 className="t-h3">Transfer market</h2><span className="t-small mut">Wage bill {RC.payroll(G, t)} of {RC.rulesOf(code).purse || 'no cap'}</span></div>
      <div className="ca-row"><span className="t-small mut">Offer</span><select className="input" value={pct} onChange={(e) => setPct(Number(e.target.value))} aria-label="Offer as a share of the asking wage"><option value={0.8}>80% of ask</option><option value={0.9}>90% of ask</option><option value={0.95}>95% of ask</option><option value={1}>The asking wage</option></select></div>
      <ul className="mlist">{ids.map((id) => <li key={id}><span className="grow t-small">{nm(G, id)}<br /><span className="l2">Asks {rec.mk.ask[id]}</span></span><button type="button" className="btn btn-sm" onClick={() => act(() => RC.mkOffer(G, code, t, id, Math.round(rec.mk.ask[id] * pct * 100) / 100))}>Offer</button></li>)}</ul>
      <h3 className="t-small b6">Buy from another club</h3>
      <ul className="mlist">{others.slice(0, 12).map((id) => <li key={id}><span className="grow t-small">{nm(G, id)}</span><button type="button" className="btn btn-sm btn-ghost" onClick={() => act(() => RC.transferBuy(G, t, id, Math.round(RC.worth(G, RC.player(G, id), code) * 1.35 * 100) / 100) || 'Transfer agreed.')}>Offer</button></li>)}</ul>
      <div className="ca-row"><button type="button" className="btn btn-ghost" onClick={() => act(() => { RC.runRest(G, code, Math.random, null); return 'Done.'; })}>Let the assistant finish</button><button type="button" className="btn" onClick={() => act(() => { RC.contractAI(G, code, Math.random, t); RC.finishCycle(G, code, Math.random); return 'Window closed.'; })}>Close the window</button></div>
    </section>
  );
}

export default function ClubAbroadRecruit({ j }) {
  const { G } = useGame(); const code = j.comp; const R = RC.rulesOf(code); const rec = RC.recOf(G, code); const ev = K.clubEvent(G);
  const mode = { auction: 'Auction', draft: 'Draft', contract: 'Contract market' }[R.recruit];
  const issues = RC.squadIssues(G, j.team);
  if (!rec || rec.stage === 'done' || !ev) return (
    <section className="stack" style={{ gap: 10 }}>
      <h2 className="t-h3">Recruitment · {mode}</h2>
      <p className="t-small mut">{ev ? `The window opens ${short(ev.day)}.` : 'Your squad is registered for this season.'} Squads change between seasons: players retire or age, young players arrive, and every club retains, then recruits by the league's rules ({R.recruit}{R.retain ? `, retain up to ${R.retain}` : ''}).</p>
      {issues.length ? <ul className="t-small ca-bad">{issues.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="t-small blu">Squad is legal: {RC.counts(G, j.team).n} players, {RC.counts(G, j.team).os} overseas.</p>}
    </section>);
  if (rec.stage === 'retain') return <Retain j={j} rec={rec} />;
  if (R.recruit === 'auction') return <Auction j={j} rec={rec} />;
  if (R.recruit === 'draft') return <Draft j={j} rec={rec} />;
  return <Market j={j} rec={rec} />;
}
