import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { PageHead, Role, Seg } from '../components/bits.jsx';
import TeamSheet from '../components/TeamSheet.jsx';
import { ovr, fmtL } from '../game/engine.js';
import { formDisp, potRange, tr, useNarrow } from '../lib/util.js';
import { gradeOfL } from '../game/office.js';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { tn } from '../lib/i18n.js';
import { autosave } from '../lib/save.js';

const FOCUS = ['Balanced', 'Batting', 'Bowling', 'Fitness'];
// Who runs training: the batting and bowling coaches, by name and grade.
export function coachLine(G, p) {
  const st = G.s.staff[G.user]; const b = st.bat, w = st.bowl;
  const part = (x, who, what) => (x ? `${x.name} (grade ${gradeOfL(x.level)}) works with the ${who}: +${Math.round(x.level / 2)} a season for under-26s, form back ${x.level * 10}% quicker${what}.` : `No ${who === 'batters' ? 'batting' : 'bowling'} coach: ${who} under 26 develop at the normal rate.`);
  if (p) { const bat = p.role === 'BAT' || p.role === 'WK' || (p.role === 'AR' && p.focus !== 'Bowling'); return bat ? part(b, 'batters', '') : part(w, 'bowlers', ', and better death bowling'); }
  return `${part(b, 'batters', '')} ${part(w, 'bowlers', ', and better death bowling')}`;
}
const INTENS = { Light: 'Faster recovery between matches, slower development.', Normal: 'Balanced load.', Intense: 'Better development and sharper form, more knocks in training.' };

// The full squad: ratings, training focus, wages and contracts. The XI itself lives on the team sheet.
function SquadList() {
  const { G, update } = useGame();
  const t = G.teams[G.user]; const xi = t.xi || [];
  const sq = t.squad.map((id) => G.P(id)).sort((a, b) => { const ia = xi.includes(a.id), ib = xi.includes(b.id); if (ia !== ib) return ia ? -1 : 1; return ovr(b) - ovr(a); });
  const wage = t.squad.reduce((a, id) => a + G.P(id).salary, 0);
  return (
    <>
      <p className="mut t-small" style={{ marginBottom: 12 }}>{t.squad.length} players · {t.squad.length - G.osCount(G.user)} Nepali, {G.osCount(G.user)} overseas · wage bill {fmtL(wage)}</p>
      <div className="tblwrap" style={{ maxWidth: 1220 }}><table className="tbl compact"><thead><tr><th>Player</th><th>Nat</th><th className="r">Age</th><th>Role</th><th className="r">Bat</th><th className="r">Bowl</th><th className="r">Potential</th><th className="r">Form</th><th className="r">Fitness</th><th>Injury</th><th className="r">Salary</th><th className="r">Value</th><th>Training focus</th></tr></thead>
        <tbody>{sq.map((p) => (
          <tr key={p.id} className={`${xi.includes(p.id) ? 'me' : ''}${p.inj ? ' dim' : ''}`}>
            <td className="name"><Link to={`/player/${p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link> <span className="faint t-small">{t.captainId === p.id ? '(c)' : ''}{p.role === 'WK' ? ' (wk)' : ''}</span></td>
            <td className={p.nat !== 'NEP' ? 'blu' : ''}>{p.nat}</td><td className="r">{p.age}</td><td><Role r={p.role} /></td><td className="r">{p.bat}</td><td className="r">{p.bowl || '–'}</td>
            <td className={`r ${p.scouted ? '' : 'faint'}`}>{potRange(p)}</td><td className="r">{formDisp(p)}</td><td className="r">{Math.round(p.fit)}%</td>
            <td className={p.inj ? 'crim' : 'faint'}>{p.inj ? `${p.inj} match${p.inj > 1 ? 'es' : ''}` : '–'}</td>
            <td className="r">{fmtL(p.salary)}</td><td className="r">{fmtL(p.value)}</td>
            <td><select className="input" value={p.focus} onChange={(e) => update(() => { p.focus = e.target.value; })} aria-label={`Training focus for ${p.name}`}>{FOCUS.map((f) => <option key={f}>{f}</option>)}</select></td>
          </tr>))}</tbody></table></div>
      <p className="faint t-small" style={{ marginTop: 10 }}>Highlighted rows are in the current XI. Potential shows as a range until a scout files a report. Form is a 0–10 rating that follows recent matches. Ratings are out of 100.</p>
      <div className="field" style={{ marginTop: 24, maxWidth: 520 }}><span className="lbl">Team training intensity</span><Seg options={['Light', 'Normal', 'Intense'].map((x) => [x, x])} value={t.training} onChange={(v) => update(() => { t.training = v; })} label="Training intensity" /><p className="mut t-small" style={{ marginTop: 4 }}>{INTENS[t.training]}</p><p className="t-small" style={{ marginTop: 6 }}>{coachLine(G)} <Link to="/staff">Staff</Link></p></div>
    </>
  );
}

// ===== Phone: XI · Squad · Order · Training, with the XI rule check pinned =====
const key = (p) => (p.role === 'BOWL' ? `Bowl ${p.bowl}` : p.role === 'AR' ? `Bat ${p.bat} · Bowl ${p.bowl}` : `Bat ${p.bat}`);
// The rule chip: "Legal XI", or what is wrong with it.
export function xiCheck(G, xi) {
  const nep = xi.filter((id) => G.P(id).nat === 'NEP').length, os = xi.length - nep;
  const osAvail = G.teams[G.user].squad.filter((id) => G.P(id).nat !== 'NEP' && G.available(G.P(id))).length;
  let msg = 'Legal XI', ok = false;
  if (os > 4) msg = 'Too many overseas'; else if (nep > 11 - Math.min(4, osAvail)) msg = 'Too many Nepali';
  else if (xi.length < 11) msg = `Pick ${11 - xi.length} more`; else if (!G.validXI(G.user, xi)) msg = `Need ${Math.min(4, osAvail)} overseas`;
  else { const r = G.xiRules(G.user, xi).find((x) => !x.ok && x.k !== 'cap' && x.k !== 'nep' && x.k !== 'os'); if (r) msg = r.k === 'wk' ? 'No keeper' : 'Need 5 bowlers'; else ok = true; }
  return { nep, os, ok, msg };
}
function SquadMobile() {
  const { G, update } = useGame(); const t = G.teams[G.user]; const [tab, setTab] = useTab(['xi', 'squad', 'order', 'train'], 'xi');
  const [sort, setSort] = useState('rating');
  const xi = t.xi && t.xi.length ? t.xi.filter((id) => t.squad.includes(id)) : G.autoXI(G.user);
  const chk = xiCheck(G, xi);
  const setXI = (next) => update(() => { t.xi = next; if (next.length === 11) { const keep = (t.order || []).filter((id) => next.includes(id)); t.order = keep.concat(next.filter((id) => !keep.includes(id))); G.syncBowlPlan(G.user); } autosave(G); });
  const toggle = (id) => { if (xi.includes(id)) setXI(xi.filter((x) => x !== id)); else if (xi.length < 11) setXI(xi.concat([id])); };
  const order = t.order && t.order.length === 11 && t.order.every((id) => xi.includes(id)) ? t.order : xi.length === 11 ? G.autoOrder(xi) : xi;
  const move = (i, d) => { const o = order.slice(); const j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; update(() => { t.order = o; autosave(G); }); };
  const mark = (p) => `${t.captainId === p.id ? '(c)' : ''}${(t.keeperId ? t.keeperId === p.id : p.role === 'WK' && xi.includes(p.id)) ? ' (wk)' : ''}`;
  const sq = t.squad.map((id) => G.P(id));
  const sorters = { rating: (a, b) => ovr(b) - ovr(a), form: (a, b) => b.form - a.form, fit: (a, b) => b.fit - a.fit, value: (a, b) => b.value - a.value };
  const bench = sq.filter((p) => !xi.includes(p.id)).sort(sorters.rating);
  const ruleColor = chk.ok ? 'var(--blue)' : 'var(--crimson)';
  const pin = <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><p className="t-small num" style={{ display: 'flex', gap: 12 }}><span>XI <b>{xi.length}</b>/11</span><span>Nepali <b>{chk.nep}</b>/7</span><span>Overseas <b>{chk.os}</b>/4</span></p><span className="phase" style={{ fontSize: 12, borderColor: ruleColor, color: ruleColor }}>{chk.msg}</span></div>;
  return (
    <MScreen top={{ title: tn(G, 'Squad'), sub: `${t.squad.length} players` }} pin={pin} label="Squad sections" tab={tab} onTab={setTab}
      tabs={[['xi', tn(G, 'XI')], ['squad', tn(G, 'Squad')], ['order', tn(G, 'Order')], ['train', tn(G, 'Training')]]}>
      {tab === 'xi' && <>
        <p className="mhead">Playing XI · tap to drop</p>
        <ul className="mlist">{xi.map((id, i) => { const p = G.P(id); return (
          <li key={id}><span className="board-f faint" style={{ width: 18, textAlign: 'right', fontSize: 16 }}>{i + 1}</span>
            <Link to={`/player/${id}`} className="grow" style={{ color: 'inherit', textDecoration: 'none' }}><span style={{ fontWeight: 500 }}>{p.name}</span> <span className="faint t-small">{mark(p)}</span><br /><span className="l2">{p.nat} · {p.role} · {key(p)}</span></Link>
            <input type="checkbox" checked onChange={() => toggle(id)} aria-label={`Drop ${p.name}`} style={{ width: 22, height: 22 }} /></li>); })}</ul>
        <p className="mhead">Bench · tap to pick</p>
        <ul className="mlist">{bench.map((p) => { const off = !G.available(p); return (
          <li key={p.id} className={off ? 'dim' : ''}><Link to={`/player/${p.id}`} className="grow" style={{ color: 'inherit', textDecoration: 'none' }}><span>{p.name}</span><br /><span className="l2">{p.nat} · {p.role} · {key(p)}{p.inj ? <span className="crim"> · injured {p.inj}</span> : p.rest ? ' · rested' : p.duty && p.duty.started ? ' · national duty' : p.nocStatus === 'pending' ? ' · waiting for NOC' : ''}</span></Link>
            <input type="checkbox" checked={false} disabled={off || xi.length >= 11} onChange={() => toggle(p.id)} aria-label={`Pick ${p.name}`} style={{ width: 22, height: 22 }} /></li>); })}</ul>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setXI(G.autoXI(G.user))}>Let the assistant pick</button>
      </>}
      {tab === 'squad' && <>
        <div className="seg" role="group" aria-label="Sort by" style={{ margin: '12px 0 4px', display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>{[['rating', 'Rating'], ['form', 'Form'], ['fit', 'Fitness'], ['value', 'Value']].map(([k, l]) => <button key={k} type="button" className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{l}</button>)}</div>
        <ul className="mlist">{sq.slice().sort(sorters[sort]).map((p) => (
          <li key={p.id}><Link to={`/player/${p.id}`} className="grow" style={{ color: 'inherit', textDecoration: 'none' }}><span style={{ fontWeight: 500 }}>{p.name}</span> <span className="faint t-small">{p.nat} · {p.age} · {p.role}</span><br />
            <span className="l2">Bat {p.bat} · Bowl {p.bowl || '–'} · Pot <span className={p.scouted ? '' : 'faint'}>{potRange(p)}</span> · Form {formDisp(p)} · Fit {Math.round(p.fit)}%</span>{p.inj ? <><br /><span className="crim t-small">Injured · {p.inj} match{p.inj > 1 ? 'es' : ''}</span></> : null}</Link>
            <span className="t-small mut num" style={{ textAlign: 'right' }}>{fmtL(p.value)}</span></li>))}</ul>
      </>}
      {tab === 'order' && <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 12 }}>
          <div className="field"><label htmlFor="cap">Captain</label><select id="cap" className="input" style={{ width: '100%', height: 44 }} value={t.captainId || ''} onChange={(e) => update(() => { t.captainId = e.target.value; autosave(G); })}>{xi.map((id) => <option key={id} value={id}>{G.P(id).name}</option>)}</select></div>
          <div className="field"><label htmlFor="wk">Wicketkeeper</label><select id="wk" className="input" style={{ width: '100%', height: 44 }} value={t.keeperId && xi.includes(t.keeperId) ? t.keeperId : (xi.find((id) => G.P(id).role === 'WK') || '')} onChange={(e) => update(() => { t.keeperId = e.target.value; autosave(G); })}>{xi.map((id) => <option key={id} value={id}>{G.P(id).name}</option>)}</select></div>
        </div>
        <p className="mhead">Batting order</p>
        {xi.length < 11 && <p className="t-small crim">Pick a full XI to set the order.</p>}
        <ol className="mlist">{order.map((id, i) => { const p = G.P(id); return (
          <li key={id} style={{ padding: '4px 0' }}><span className="board-f faint" style={{ width: 18, textAlign: 'right', fontSize: 16 }}>{i + 1}</span><span className="grow"><span style={{ fontWeight: 500 }}>{p.name}</span> <span className="faint t-small">{p.role}</span></span>
            <button type="button" className="btn btn-ghost" style={{ minHeight: 44, width: 44, padding: 0 }} disabled={i === 0 || xi.length < 11} onClick={() => move(i, -1)} aria-label={`Move ${p.name} up`}>↑</button>
            <button type="button" className="btn btn-ghost" style={{ minHeight: 44, width: 44, padding: 0 }} disabled={i === order.length - 1 || xi.length < 11} onClick={() => move(i, 1)} aria-label={`Move ${p.name} down`}>↓</button></li>); })}</ol>
        {G.orderWarnings(order, G.user).slice(0, 2).map((w) => <p key={w.text} className="t-small crim" style={{ marginTop: 6 }}>{w.text}</p>)}
      </>}
      {tab === 'train' && <>
        <div className="field" style={{ paddingTop: 12 }}><span className="lbl" id="ti">Team intensity</span>
          <div className="seg" role="group" aria-labelledby="ti" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>{['Light', 'Normal', 'Intense'].map((x) => <button key={x} type="button" className={t.training === x ? 'on' : ''} style={{ minHeight: 40 }} onClick={() => update(() => { t.training = x; })}>{x}</button>)}</div>
          <p className="faint t-small">{INTENS[t.training]}</p>
          <Link to="/week" className="t-small">Plan the training week</Link></div>
        <p className="mhead">Focus by player</p>
        <ul className="mlist">{sq.map((p) => (
          <li key={p.id} style={{ padding: '6px 0' }}><span className="grow"><span>{p.name}</span><br /><span className="l2">{p.role} · {key(p)}</span></span>
            <select className="input" style={{ height: 40 }} value={p.focus} aria-label={`Training focus for ${p.name}`} onChange={(e) => update(() => { p.focus = e.target.value; })}>{FOCUS.map((f) => <option key={f}>{f}</option>)}</select></li>))}</ul>
      </>}
    </MScreen>
  );
}

export default function Squad() {
  const { G } = useGame(); const [q, setQ] = useSearchParams(); const tab = q.get('tab') === 'list' ? 'list' : 'sheet'; const narrow = useNarrow();
  if (narrow) return <SquadMobile />;
  return (
    <div style={{ maxWidth: 1220 }}>
      <PageHead title={tr(G, 'Squad')} style={{ marginBottom: 12 }}>
        <div className="tabs" role="tablist" aria-label="Squad" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))', margin: 0, minWidth: 260 }}>
          <button type="button" role="tab" aria-selected={tab === 'sheet'} className={tab === 'sheet' ? 'on' : ''} onClick={() => setQ({}, { replace: true })}>Team sheet</button>
          <button type="button" role="tab" aria-selected={tab === 'list'} className={tab === 'list' ? 'on' : ''} onClick={() => setQ({ tab: 'list' }, { replace: true })}>Squad list</button>
        </div>
      </PageHead>
      {tab === 'sheet' ? <TeamSheet /> : <SquadList />}
    </div>
  );
}
