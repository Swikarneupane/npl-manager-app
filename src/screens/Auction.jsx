import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Meter, Modal, Role } from '../components/bits.jsx';
import { ovr, fmtL, TYPE_LABEL } from '../game/engine.js';
import { COUNTRY_NAMES } from '../game/data.js';
import { NEEDS, needRoles, DOM_CAP, OS_CAP, MIN_OS, MAX_SQUAD, MIN_SQUAD, MAX_OS, MIN_BASE } from '../game/game.js';
import MScreen, { useTab } from '../components/MScreen.jsx';
import { tn } from '../lib/i18n.js';
import { AuctionRoom } from '../lib/auction.js';
import { potRange, tname, tshort, useNarrow } from '../lib/util.js';
import { autosave } from '../lib/save.js';

const PRI = [['A', 'A · must'], ['B', 'B · want'], ['C', 'C · cheap']];
const PRI_TAG = { A: 'c', B: 'g', C: '' };
const ROLE_NAME = { AR: 'All-rounder', WK: 'Wicketkeeper', BAT: 'Batter', BOWL: 'Bowler' };
const L = (x) => `Rs ${fmtL(x).replace(/^Rs /, '')}`;
const range = ([a, b]) => `Rs ${a}–${b} L`;


// ===== needs, your max and what's coming =====
// Squad against 18-22, Nepali with room left, overseas against the minimum 6, and the most you can
// bid on this lot (G.lotMax: the purse minus a base-price reserve for every slot still required).
export function needsInfo(G, p) {
  const t = G.teams[G.user]; const os = G.osCount(G.user); const nep = t.squad.length - os; const req = G.requiredSlots(G.user);
  return { squad: t.squad.length, nep, nepRoom: Math.max(0, Math.min(MAX_SQUAD - t.squad.length, 14 - nep)), os, osNeed: req.os, osRoom: Math.max(0, MAX_OS - os), req, max: p ? G.lotMax(G.user, p) : null };
}
// Tags on an upcoming lot: the need he fills, your RTM on an ex-player, your shortlist max.
export function lotTags(G, p, needs) {
  const A = G.s.auction; const t = G.teams[G.user]; const e = G.slEntry(p.id); const out = [];
  // a saved recruitment plan drives the tags: the first gap (not Low priority) this player fits
  const plan = G.s.office && G.s.office.plan; const gaps = plan && plan.saved && plan.y === G.year && plan.gaps ? plan.gaps.filter((g) => g.pr !== 'Low' || g.young) : null;
  const fit = (g) => (g.pool === 'os') === (p.nat !== 'NEP') && (!g.need || needRoles(p).includes(g.need)) && (!g.bat || p.bat >= g.bat) && (!g.bowl || p.bowl >= g.bowl) && (!g.young || (p.age <= 21 && p.pot >= 70));
  const gap = gaps && gaps.find(fit);
  const role = !gaps && (needs || G.userNeeds()).find((n) => n.left > 0 && needRoles(p).includes(n.k));
  if (gap) out.push([`Fits your ${gap.name.toLowerCase()} gap${gap.pr === 'High' ? ' · high' : ''}`, 'blu']);
  else if (gaps) { /* the plan decides what fits */ }
  else if (role && role.k === 'wk') out.push(['Fills your WK need', 'blu']);
  else if (p.nat !== 'NEP' && G.requiredSlots(G.user).os > 0) out.push(['Fills an overseas need', 'blu']);
  else if (role) out.push([`Fills your ${role.short.toLowerCase()} need`, 'blu']);
  const gold = [];
  if (A && A.kind === 'mega' && p.prevTeam === G.user && t.rtm > 0) gold.push('Ex-player · your RTM');
  if (e && e.max) gold.push(`your max ${L(e.max)}`);
  if (gold.length) out.push([gold.join(' · ').replace(/^your/, 'Your'), 'gld']);
  return out;
}
const startIdx = (A) => A.i + (A.cur && !A.cur.done ? 1 : 0);
// The next lots, and how far away your next shortlisted lot is.
export function upcoming(G, n = 6) {
  const A = G.s.auction; const st = startIdx(A); const lots = A.lots.slice(st, st + n).map((l, k) => ({ ...l, no: st + k + 1, p: G.P(l.pid) }));
  const k = A.lots.slice(st).findIndex((l) => G.slEntry(l.pid)); const star = k >= 0 ? { no: st + k + 1, away: k + 1, p: G.P(A.lots[st + k].pid) } : null;
  return { lots, star };
}
// Set names numbered in the order they come up: "Set 4 · Overseas set 2".
function setNo(A, set) { const names = []; for (const l of A.lots) if (!names.includes(l.set)) names.push(l.set); return names.indexOf(set) + 1; }

// ===== shared pieces =====
function Stepper({ step }) {
  const steps = ['Retention', 'Main auction', 'Accelerated round', 'Pre-season'];
  return (
    <ol className="stepper-steps" aria-label="Auction phases">{steps.map((s, i) => (
      <li key={s} className={i + 1 < step ? 'done' : i + 1 === step ? 'on' : ''} aria-current={i + 1 === step ? 'step' : undefined}><span className="st-n">{i + 1 < step ? '✓' : i + 1}</span><span className="t-small">{s}</span></li>))}</ol>
  );
}
function HowItWorks() {
  const { G, update } = useGame(); if (G.s.settings.aucHelpSeen) return null;
  return (
    <div className="howto"><span className="t-small blu b6">How it works</span><span className="t-small"><b>1</b> Star your targets in the pool</span><span className="t-small"><b>2</b> Bid on the floor, or set an auto-bid limit</span><span className="t-small"><b>3</b> Watch your purse and squad needs</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => update(() => { G.s.settings.aucHelpSeen = true; })}>Got it</button></div>
  );
}
function Star({ G, p, update }) {
  const on = !!G.slEntry(p.id);
  return <button type="button" className={`star${on ? ' on' : ''}`} aria-pressed={on} aria-label={on ? `Remove ${p.name} from shortlist` : `Add ${p.name} to shortlist`} onClick={() => update(() => { G.toggleShortlist(p.id); })}>{on ? '★' : '☆'}</button>;
}
// − Rs 48 L + in the bid increment for that price
function MaxStepper({ G, p, update }) {
  const e = G.slEntry(p.id); const v = e ? e.max : 0; const step = Math.max(0.5, G.incr(p, v));
  return (
    <span className="maxstep"><button type="button" className="btn btn-sm" aria-label={`Lower max bid for ${p.name}`} disabled={!v} onClick={() => update(() => { G.setShortlist(p.id, { max: Math.max(0, Math.round((v - step) * 10) / 10) }); })}>−</button>
      <span className="board-f">{v ? L(v) : 'No max'}</span>
      <button type="button" className="btn btn-sm" aria-label={`Raise max bid for ${p.name}`} onClick={() => update(() => { G.setShortlist(p.id, { max: v ? Math.round((v + step) * 10) / 10 : G.likelyPrice(p)[0] }); })}>+</button></span>
  );
}
function Priority({ G, p, update, short }) {
  const e = G.slEntry(p.id); if (!e) return null;
  return <span className="row" style={{ gap: 4 }} role="radiogroup" aria-label={`Priority for ${p.name}`}>{PRI.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={e.priority === k} className={`chip chip-sm${e.priority === k ? ' on' : ''}`} onClick={() => update(() => { e.priority = k; })}>{short ? k : l}</button>)}</span>;
}
// Status of a player in the room: sold (to whom, for how much), unsold, on the block, up next.
function lotStatus(G, p) {
  const A = G.s.auction; if (!A || !A.lots) return null;
  const sale = A.sold.find((x) => x.pid === p.id); if (sale) return { k: 'sold', team: sale.team, price: sale.price };
  if (A.unsold.includes(p.id)) return { k: 'unsold' };
  if (A.cur && !A.cur.done && A.cur.pid === p.id) return { k: 'block' };
  const nx = A.lots[A.i + (A.cur && !A.cur.done ? 1 : 0)]; if (nx && nx.pid === p.id && !A.prep) return { k: 'next' };
  return null;
}
const StatusTag = ({ G, st }) => (!st ? null : st.k === 'sold' ? <span className="t-micro row" style={{ gap: 4 }}><Dot id={st.team} />{L(st.price)}</span> : st.k === 'unsold' ? <span className="t-micro faint">Unsold</span> : st.k === 'block' ? <span className="ptag c">On the block</span> : <span className="ptag">Up next</span>);

// ===== Scout and shortlist =====
function Shortlist({ room, inRoom }) {
  const { G, update } = useGame(); const narrow = useNarrow(); const nav = useNavigate(); const [, setQ] = useSearchParams();
  const A = G.s.auction; const t = G.teams[G.user];
  const [q, setSearch] = useState(''); const [chip, setChip] = useState('all'); const [role, setRole] = useState('any'); const [sort, setSort] = useState('lot');
  const needs = G.userNeeds(); const lotOf = useMemo(() => Object.fromEntries((A && A.lots ? A.lots : []).map((l, i) => [l.pid, i + 1])), [A]);
  const pool = G.auctionPool().filter((p) => p && !p.retired);
  const rows = pool.map((p) => ({ p, lot: lotOf[p.id], lp: G.likelyPrice(p), fit: G.fitTags(p, needs), e: G.slEntry(p.id), st: lotStatus(G, p) }));
  const chips = [['all', `All ${pool.length}`], ['sl', `My shortlist · ${G.s.shortlist.length}`], ['fit', 'Fits my needs'], ['os', 'Overseas'], ['nep', 'Nepali'], ['u23', 'Under 23'], ['unc', 'Uncapped']];
  const test = { all: () => true, sl: (r) => !!r.e, fit: (r) => r.fit.some((x) => x.c === 'b'), os: (r) => r.p.nat !== 'NEP', nep: (r) => r.p.nat === 'NEP', u23: (r) => r.p.age < 23, unc: (r) => !!r.p.uncapped }[chip];
  const needle = q.trim().toLowerCase();
  let shown = rows.filter((r) => test(r) && (role === 'any' || needRoles(r.p).includes(role)) && (!needle || r.p.name.toLowerCase().includes(needle)));
  const sorters = { lot: (a, b) => (a.lot || 999) - (b.lot || 999), rating: (a, b) => ovr(b.p) - ovr(a.p), price: (a, b) => b.lp[1] - a.lp[1], age: (a, b) => a.p.age - b.p.age };
  shown = shown.slice().sort(sorters[sort]);
  const mine = G.s.shortlist.map((e) => ({ e, p: G.P(e.pid) })).filter((x) => x.p).sort((a, b) => a.e.priority.localeCompare(b.e.priority) || (lotOf[a.p.id] || 999) - (lotOf[b.p.id] || 999));
  const bc = G.budgetCheck();
  const cover = needs.map((n) => ({ ...n, targets: mine.filter((x) => !x.p.team && needRoles(x.p).includes(n.k)).length }));
  const gap = cover.find((n) => n.left > 0 && n.targets === 0);
  const find = (k) => { setChip('all'); setRole(k); };
  const enter = () => { if (inRoom) { setQ({}, { replace: true }); return; } room.enter(); update(); };
  const mainBtn = inRoom ? `Back to the floor${A.cur && !A.cur.done ? ` · lot ${A.i + 1} is live` : ''}` : 'Enter the auction room';
  const filters = (
    <>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <label className="search" style={{ flex: '1 1 220px' }}><input type="search" className="input" placeholder={`Search ${pool.length} players`} aria-label="Search players" value={q} onChange={(e) => setSearch(e.target.value)} /></label>
        <label className="t-small row wide" style={{ gap: 6, alignItems: 'center' }}>Role <select className="input" value={role} onChange={(e) => setRole(e.target.value)}><option value="any">Any</option>{NEEDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="t-small row wide" style={{ gap: 6, alignItems: 'center' }}>Sort <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}><option value="lot">Auction order</option><option value="rating">Rating</option><option value="price">Likely price</option><option value="age">Age</option></select></label>
      </div>
      <div className="chips" role="group" aria-label="Filter players">{(narrow ? chips.filter(([k]) => ['all', 'fit', 'sl', 'os'].includes(k)) : chips).map(([k, l]) => <button key={k} type="button" className={`chip${chip === k ? ' on' : ''}`} aria-pressed={chip === k} onClick={() => setChip(k)}>{narrow && k === 'sl' ? 'Shortlist' : narrow && k === 'all' ? 'All' : l}</button>)}</div>
      {role !== 'any' && <p className="t-micro">Showing {NEEDS.find((n) => n[0] === role)[1].toLowerCase()} · <button type="button" className="linkbtn t-micro" onClick={() => setRole('any')}>show everyone</button></p>}
    </>
  );
  const aside = (
    <aside className="sl-aside" aria-label="Your plan">
      <section className="panel"><div className="sechead" style={{ margin: 0 }}><h2 className="t-h3">My shortlist · {mine.length}</h2><span className="t-micro faint">By priority</span></div>
        <ul className="sl-mine">{mine.map(({ e, p }) => <li key={p.id}><span className={`ptag ${PRI_TAG[e.priority]}`}>{e.priority}</span><span className="t-small ell">{p.name}</span><span className="t-micro faint">{lotOf[p.id] ? `lot ${lotOf[p.id]}` : p.team ? 'signed' : '—'}</span><span className="t-small b6">{e.max ? L(e.max) : <span className="faint">No max set</span>}</span></li>)}
          {!mine.length && <li className="faint t-small">Star players in the pool to add them.</li>}</ul>
        <p className="t-micro faint">A = must have · B = want · C = only if cheap. In the room, "Sim to my next target" stops at each of these.</p></section>
      <section className="panel"><h2 className="t-h3">Budget check</h2>
        {[['os', 'Overseas'], ['dom', 'Domestic']].map(([k, l]) => <div key={k} style={{ marginTop: 8 }}><div className="sechead" style={{ margin: 0 }}><span className="t-small">{l}: max bids {L(bc[k].sum)}</span><span className="t-small faint">of {L(bc[k].purse)}</span></div><Meter pct={bc[k].purse ? (bc[k].sum / bc[k].purse) * 100 : 0} blue /></div>)}
        {bc.warn.slice(0, 3).map((w, i) => <p key={i} className="t-micro crim" style={{ marginTop: 6 }}>{w}</p>)}</section>
      <section className="panel"><h2 className="t-h3">Do your targets cover your needs?</h2>
        <ul className="rules">{cover.map((n) => <li key={n.k}><span className="t-small">{n.label}</span><span className="row" style={{ gap: 8, alignItems: 'center' }}><span className={`t-micro${n.left > 0 && n.targets < n.left ? ' crim' : ''}`}>{n.targets} target{n.targets === 1 ? '' : 's'} · {n.left} slot{n.left === 1 ? '' : 's'}</span>{n.left > n.targets && <button type="button" className="linkbtn t-micro" onClick={() => find(n.k)}>Find</button>}</span></li>)}</ul></section>
    </aside>
  );
  const head = (
    <div className="pagehead" style={{ marginBottom: 12 }}>
      <div className="stack" style={{ gap: 4 }}><h1 className="t-h1">Scout and shortlist</h1><p className="mut t-small">{A && A.kind === 'mega' ? 'Mega' : 'Mini'} auction {G.year} · {pool.length} players · star the ones you want and set the most you'll pay</p></div>
      <div className="row" style={{ gap: 8 }}><button type="button" className="btn" onClick={() => update(() => { G.autoSuggest(); })}>Auto-suggest targets</button>{!narrow && <button type="button" className="btn btn-primary" onClick={enter}>{mainBtn}</button>}</div>
    </div>
  );
  if (narrow) return (
    <div className="stack" style={{ gap: 12 }}>
      {!inRoom && head}{filters}
      <p className="t-micro faint">Tap ☆ to shortlist. Tap a starred player to set the most you'll pay.</p>
      <ul className="sl-cards">{shown.slice(0, 80).map(({ p, lot, lp, fit, e, st }) => (
        <li key={p.id} className={`panel${e ? ' on' : ''}`}>
          <div className="sl-card-top"><span className="stack" style={{ minWidth: 0 }}><span className="t-small b6">{p.name} {st && <StatusTag G={G} st={st} />}</span><span className="t-micro faint">{p.role} · {p.nat} · {p.age} · rating {ovr(p)}{lot ? ` · lot ${lot}` : ''}{p.age <= 21 && p.pot >= 78 ? ` · potential ${potRange(p)}` : ''}</span>
            <span className="t-micro">Likely <b>{range(lp)}</b> {fit.slice(0, 1).map((f) => <span key={f.t} className={`ptag ${f.c}`}>{f.t}</span>)}</span></span><Star G={G} p={p} update={update} /></div>
          {e && <div className="sl-card-edit"><div className="sechead" style={{ margin: 0, alignItems: 'center' }}><span className="t-micro faint">Most you'll pay</span><MaxStepper G={G} p={p} update={update} /></div>
            <div className="sechead" style={{ margin: 0, alignItems: 'center' }}><span className="t-micro faint">Priority</span><Priority G={G} p={p} update={update} /></div></div>}
        </li>))}
        {shown.length > 80 && <li className="faint t-small">Showing 80 of {shown.length}. Search or filter to narrow it down.</li>}</ul>
      <details className="panel"><summary className="t-small b6">Budget and needs</summary>{aside}</details>
      <div className="slbar"><div className="sechead" style={{ margin: 0 }}><span className="t-small"><b>{mine.length} target{mine.length === 1 ? '' : 's'}</b> · {L(bc.os.sum + bc.dom.sum)} of max bids planned</span>{gap && <span className="t-micro crim">No {gap.short.toLowerCase()} yet</span>}</div>
        <button type="button" className="btn btn-primary b6" onClick={enter}>{mainBtn}</button></div>
    </div>
  );
  return (
    <div>
      {head}
      <div className="sl-grid">
        <section aria-label="Player pool" className="stack" style={{ gap: 10, minWidth: 0 }}>{filters}
          <div className="tblwrap"><table className="tbl compact sl-tbl"><thead><tr><th>★</th><th className="r">Lot</th><th>Player</th><th>Role</th><th>Nat</th><th className="r">Age</th><th className="r">Rating</th><th className="r">Potential</th><th className="r">Base</th><th>Likely price</th><th>Fit</th><th>Your max</th><th>Priority</th></tr></thead>
            <tbody>{shown.map(({ p, lot, lp, fit, e, st }) => (
              <tr key={p.id} className={e ? 'me' : st && (st.k === 'sold' || st.k === 'unsold') ? 'dim' : ''}><td><Star G={G} p={p} update={update} /></td><td className="r faint">{lot || '—'}</td>
                <td className="name"><Link to={`/player/${p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link> {st && <StatusTag G={G} st={st} />}</td><td><Role r={p.role} /></td><td>{p.nat}</td><td className="r">{p.age}</td><td className="r">{ovr(p)}</td><td className="r faint">{potRange(p)}</td>
                <td className="r">{L(G.basePrice(p))}</td><td>{range(lp)}</td><td>{fit.slice(0, 1).map((f) => <span key={f.t} className={`ptag ${f.c}`}>{f.t}</span>)}{fit.length > 1 && <span className="t-micro faint"> +{fit.length - 1}</span>}</td>
                <td>{e ? <input className="input maxin" type="number" min="0" step="0.5" value={e.max || ''} placeholder="Max" aria-label={`Max bid for ${p.name}`} onChange={(ev) => update(() => { G.setShortlist(p.id, { max: +ev.target.value || 0 }); })} /> : <span className="faint">—</span>}</td>
                <td>{e ? <Priority G={G} p={p} update={update} short /> : null}</td></tr>))}
              {!shown.length && <tr><td colSpan={13} className="faint">No players match.</td></tr>}</tbody></table></div>
          <p className="t-micro faint">Likely price is the game's estimate from value and how many teams need that player. Click a name for the full profile and the "Add to shortlist" button there too.</p>
        </section>
        {aside}
      </div>
    </div>
  );
}

// ===== Auction room =====
function Board({ room, compact }) {
  const { G } = useGame(); const a = room.A, c = a.cur; if (!c) return null;
  const p = G.P(c.pid); const st = p.stats[G.year - 1];
  const lastS = st ? `Last season: ${st.r} runs, ${st.w} wickets${st.team ? ` for ${tname(G, st.team)}` : ''}` : p.uncapped ? 'Uncapped' : 'No NPL matches last season';
  const lead = c.leader;
  const status = c.done ? (lead ? 'Sold' : 'Unsold') : room.count === 1 ? 'Going once' : room.count >= 2 ? 'Going twice' : lead ? 'Bidding' : 'Awaiting opening bid';
  const type = TYPE_LABEL[p.type] && p.bowl >= 40 ? TYPE_LABEL[p.type].toLowerCase() : null;
  const skill = p.role === 'BOWL' ? `bowl ${p.bowl}` : p.role === 'AR' ? `bat ${p.bat} · bowl ${p.bowl}` : `bat ${p.bat}`;
  return (
    <section className="board aboard" aria-label="Auction floor">
      {compact ? <><p className="blbl">{ROLE_NAME[p.role]} · {COUNTRY_NAMES[p.nat] || p.nat} · {p.age}{type ? ` · ${type}` : ''}</p><p className="bf ab-name">{p.name}</p>
        <div className="row" style={{ gap: 14 }}><span className="blbl">{skill.replace(/^\w/, (x) => x.toUpperCase())}</span><span className="blbl">Potential <b>{potRange(p)}</b></span><span className="blbl">Base <b>{L(c.base)}</b></span></div></>
        : <div className="ab-top"><div className="stack" style={{ gap: 4, minWidth: 0 }}><p className="blbl">Lot {a.i + (c.done ? 0 : 1)} · {c.set} · {ROLE_NAME[p.role]}</p><p className="bf ab-name">{p.name}</p><p className="blbl">{COUNTRY_NAMES[p.nat] || p.nat} · {p.age}{type ? ` · ${type}` : ''} · {skill} · potential {potRange(p)}</p><p className="blbl">{lastS}</p></div>
          <div className="stack" style={{ gap: 4, textAlign: 'right' }}><p className="blbl">Base price</p><p className="bf ab-mid">{L(c.base)}</p></div></div>}
      <div className="ab-bid">
        <div><p className="blbl">{c.bid == null ? 'Opening at' : c.done && lead ? 'Sold for' : 'Current bid'}</p><p className="bf ab-big"><span key={c.hist.length} className={room.tickCls}>{L(c.bid == null ? c.base : c.bid)}</span></p></div>
        <div style={{ textAlign: 'right' }}><p className="blbl">{c.done ? (lead ? 'Sold to' : '') : 'Leading'}</p><p className="bf ab-mid row" style={{ justifyContent: 'flex-end', gap: 6 }}>{lead ? <><Dot id={lead} />{compact ? tshort(G, lead) : tname(G, lead)}</> : '—'}</p>
          <p className={`ab-count${!c.done && room.count ? ' hot' : ''}`} aria-live="polite">{status}</p></div>
      </div>
    </section>
  );
}

function Fits({ room, compact }) {
  const { G } = useGame(); const c = room.A.cur; if (!c) return null;
  const p = G.P(c.pid); const os = p.nat !== 'NEP'; const t = G.teams[G.user];
  const fit = G.fitTags(p); const lp = G.likelyPrice(p); const bid = c.bid == null ? c.base : c.bid;
  const count = os ? G.osCount(G.user) : t.squad.length - G.osCount(G.user); const max = os ? 8 : 14;
  const purse = G.budgetOf(G.user, p); const need = G.userNeeds().find((n) => needRoles(p).includes(n.k) && n.left > 0);
  const lo = lp[0] * 0.7, hi = lp[1] * 1.3; const pos = (x) => `${Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100))}%`;
  const verdict = bid < lp[0] ? 'this bid is a bargain' : bid <= lp[1] ? 'this bid is fair' : 'this bid is above his value';
  if (compact) return (
    <section className="panel stack" style={{ gap: 6, padding: '12px 14px' }}><p className="sec" style={{ margin: 0 }}>For your squad</p>
      {need ? <p className="t-small"><span className="ptag b">Fills a need</span> {need.short} {need.have + 1} of {need.target}</p> : fit.length ? <p className="t-small">{fit.map((f) => <span key={f.t} className={`ptag ${f.c}`}>{f.t}</span>)}</p> : <p className="t-small mut">No squad need for this role</p>}
      <p className="t-small">{os ? 'Overseas' : 'Nepali'} {count} → {count + 1} of {max} · purse {L(purse)} → {L(Math.max(0, purse - bid))}</p>
      <p className="t-small">Fair value <b>{range(lp)}</b> · {verdict}</p></section>
  );
  return (
    <section className="panel stack" style={{ gap: 8 }}><p className="sec" style={{ margin: 0 }}>How he fits your squad</p>
      {need ? <p className="t-small"><span className="ptag b">Fills a need</span> {need.short} {need.have + 1} of {need.target}</p> : <p className="t-small mut">{fit.length ? fit.map((f) => f.t).join(' · ') : 'No squad need for this role'}</p>}
      <p className="t-small">{os ? 'Overseas' : 'Nepali'} players {count} → <b>{count + 1}</b> of {max}</p>
      <p className="t-small">{os ? 'Overseas' : 'Domestic'} purse {L(purse)} → <b>{L(Math.max(0, purse - bid))}</b> at this bid</p>
      <p className="t-micro faint">Fair value</p>
      <div className="fvbar"><i className="fv-r" style={{ left: pos(lp[0]), width: `calc(${pos(lp[1])} - ${pos(lp[0])})` }} /><i className="fv-m" style={{ left: pos(bid) }} /></div>
      <p className="t-micro faint sechead" style={{ margin: 0 }}><span>{L(lp[0])}</span><span className={bid > lp[1] ? 'crim' : 'blu'}>bid {L(bid)}</span><span>{L(lp[1])}</span></p>
    </section>
  );
}

function MySquad({ room }) {
  const { G } = useGame(); const t = G.teams[G.user]; const n = G.slotsNeeded(G.user); const os = G.osCount(G.user);
  return (
    <section className="panel stack" style={{ gap: 12 }} aria-label="My squad"><h2 className="t-h3">My squad</h2>
      <div><div className="sechead" style={{ margin: 0 }}><span className="t-small">Domestic purse</span><span className="t-small b6">{L(t.purse)}</span></div><Meter pct={(t.purse / DOM_CAP) * 100} blue /><p className="t-micro faint">of {L(DOM_CAP)}{n.nep ? ` · keep ${L(n.nep * 2)} for ${n.nep} Nepali slot${n.nep > 1 ? 's' : ''}` : ''}</p></div>
      <div><div className="sechead" style={{ margin: 0 }}><span className="t-small">Overseas purse</span><span className="t-small b6">{L(t.osPurse)}</span></div><Meter pct={(t.osPurse / OS_CAP) * 100} blue /><p className="t-micro faint">of {L(OS_CAP)}{n.os ? ` · ${n.os} overseas still needed` : ''}</p></div>
      <div className="two"><div><p className="t-micro faint">Squad</p><p className="board-f ab-mid">{t.squad.length} <span className="t-small faint">/ 18–22</span></p></div><div><p className="t-micro faint">Overseas</p><p className="board-f ab-mid">{os} <span className="t-small faint">/ 6–8</span></p></div></div>
      <div><p className="sec" style={{ margin: '0 0 4px' }}>Still needed</p><ul className="rules">{G.userNeeds().map((x) => <li key={x.k}><span className="t-small">{x.label}</span><span className={`t-small b6 ${x.left ? '' : 'blu'}`}>{Math.min(x.have, x.target)}/{x.target}{x.left ? '' : ' ✓'}</span></li>)}</ul></div>
      {room.A.kind === 'mega' && <p className="t-small">RTM cards left: <b>{t.rtm || 0}</b> <span className="t-micro faint">· for your {G.year - 1} players</span></p>}
      <Link to="/squad?tab=list" className="t-small">View full squad</Link>
    </section>
  );
}

function Rivals({ room, list }) {
  const { G } = useGame(); const c = room.A.cur; const p = c ? G.P(c.pid) : null;
  const teams = Object.values(G.teams).filter((t) => t.id !== G.user);
  return (
    <div className={list ? 'rivals-list' : 'rivals'}>{teams.map((t) => { const s = room.rivalStatus(t.id); return (
      <div key={t.id} className={`panel rival${s.k ? ` r-${s.k}` : ''}`}><p className="t-small b6 row" style={{ gap: 6, alignItems: 'center' }}><Dot id={t.id} />{tshort(G, t.id)}</p>
        <p className="t-micro faint">{p && p.nat === 'NEP' ? `Purse ${L(t.purse)}` : `OS purse ${L(t.osPurse)}`} · {t.squad.length} players</p><p className="t-micro b6">{s.s}</p></div>); })}</div>
  );
}

function Pool({ room }) {
  const { G, update } = useGame(); const [, setQ] = useSearchParams(); const A = room.A;
  const [chip, setChip] = useState('all'); const [q, setSearch] = useState('');
  const chips = [['all', `All ${A.lots.length}`], ['t', `Targets ${G.s.shortlist.length}`], ['os', 'Overseas'], ['nep', 'Nepali'], ['bowl', 'Bowlers'], ['bat', 'Batters'], ['wk', 'WK']];
  const test = { all: () => true, t: (p) => !!G.slEntry(p.id), os: (p) => p.nat !== 'NEP', nep: (p) => p.nat === 'NEP', bowl: (p) => p.bowl >= 50, bat: (p) => p.bat >= 55, wk: (p) => p.role === 'WK' }[chip];
  const needle = q.trim().toLowerCase();
  const list = A.lots.map((l) => G.P(l.pid)).filter((p) => test(p) && (!needle || p.name.toLowerCase().includes(needle)));
  return (
    <section className="panel stack apool" style={{ gap: 8 }} aria-label="Player pool">
      <div className="sechead" style={{ margin: 0 }}><h2 className="t-h3">Player pool</h2><span className="t-micro faint">In auction order</span></div>
      <input type="search" className="input" placeholder={`Search ${A.lots.length} players`} aria-label="Search players" value={q} onChange={(e) => setSearch(e.target.value)} />
      <div className="chips" style={{ margin: 0 }}>{chips.map(([k, l]) => <button key={k} type="button" className={`chip chip-sm${chip === k ? ' on' : ''}`} aria-pressed={chip === k} onClick={() => setChip(k)}>{l}</button>)}</div>
      <ul className="apool-list">{list.map((p) => { const st = lotStatus(G, p); return (
        <li key={p.id} className={st && (st.k === 'sold' || st.k === 'unsold') ? 'dim' : st && st.k === 'block' ? 'block' : ''}><span className="stack" style={{ minWidth: 0 }}><span className="t-small ell">{p.name}</span><span className="t-micro faint">{p.role} · {p.nat} · rating {ovr(p)}</span></span>
          <StatusTag G={G} st={st} />{(!st || st.k === 'block' || st.k === 'next') && <Star G={G} p={p} update={update} />}</li>); })}</ul>
      <button type="button" className="btn btn-sm" onClick={() => setQ({ view: 'shortlist' }, { replace: true })}>Scout and shortlist</button>
    </section>
  );
}

// Bid, Jump to, Pass and the auto-bid limit (the shortlist max for this player).
function BidControls({ room, bar }) {
  const { G, update, toast } = useGame(); const c = room.A.cur; const [edit, setEdit] = useState(false);
  if (!c) return null;
  if (c.done) return <div className="acts-row"><button type="button" className="btn btn-blue btn-lg" onClick={() => room.next()}>{room.A.lots[room.A.i] ? 'Next lot' : 'Go to the accelerated round'}</button></div>;
  const p = G.P(c.pid); const e = G.slEntry(p.id); const auto = !!(e && e.max); const nb = G.nextBidAmount(); const jb = G.jumpBidAmount();
  const setAuto = (on) => update(() => { if (on) G.setShortlist(p.id, { max: e && e.max ? e.max : Math.max(nb, G.likelyPrice(p)[1]) }); else if (e) e.max = 0; });
  const max = G.lotMax(G.user, p); const over = nb > max;
  const btns = (
    <div className="bidbtns"><button type="button" className="btn btn-primary b6" disabled={!room.canUserBid()} onClick={() => { const x = room.bid(); if (x) toast(x); }}>{c.leader === G.user ? 'You lead' : over ? 'Over your limit' : `Bid ${L(nb)}`} <span className="sub">· your max {L(max)}</span></button>
      <button type="button" className="btn" disabled={!room.canJump()} onClick={() => { const x = room.jumpBid(); if (x) toast(x); }}>{bar ? `To ${fmtL(jb).replace(/^Rs /, '')}` : `Jump to ${fmtL(jb).replace(/^Rs /, '')}`}</button>
      <button type="button" className="btn" disabled={c.userPassed} onClick={() => room.pass()}>{c.userPassed ? 'Passed' : 'Pass'}</button></div>
  );
  const autoRow = (
    <div className="row autobid" style={{ gap: 10, alignItems: 'center' }}>
      <label className="row chk" style={{ gap: 8 }}><input type="checkbox" checked={auto} onChange={(ev) => setAuto(ev.target.checked)} aria-label="Auto-bid" /><span className={bar ? 't-micro' : 't-small'}>Auto-bid {bar ? 'up to' : 'for me up to'}{bar && auto && !edit ? <> <b>{L(e.max)}</b></> : null}</span></label>
      {(!bar || edit) && <input className="input maxin" type="number" min="0" step="0.5" value={e && e.max ? e.max : ''} placeholder="Max" aria-label="Auto-bid limit" onChange={(ev) => update(() => { G.setShortlist(p.id, { max: +ev.target.value || 0 }); })} />}
      {bar ? <button type="button" className="linkbtn t-micro" onClick={() => setEdit(!edit)}>{edit ? 'Done' : 'Change'}</button> : <span className="t-micro faint">The game bids for you, one step at a time, until this price</span>}
    </div>
  );
  return bar ? <>{autoRow}{btns}</> : <section className="panel stack" style={{ gap: 12 }}>{btns}{autoRow}</section>;
}


function NeedsPanel({ room }) {
  const { G } = useGame(); const c = room.A.cur; const p = c ? G.P(c.pid) : null; const n = needsInfo(G, p); const needs = G.userNeeds();
  const t = G.teams[G.user]; const wk = needs.find((x) => x.k === 'wk');
  const nextWk = wk && wk.left > 0 ? room.A.lots.slice(startIdx(room.A)).findIndex((l) => G.P(l.pid).role === 'WK') : -1;
  const per = (purse, k) => (k > 0 ? `≈ ${L(Math.floor((purse / k) * 2) / 2)}` : '—');
  const domLeft = Math.max(n.req.nep, 0) || Math.max(0, MIN_SQUAD - n.squad - n.osNeed);
  return (
    <section className="panel stack" style={{ gap: 10, minWidth: 0 }} aria-label="Your needs"><h2 className="sec" style={{ margin: 0 }}>Your needs</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
        <div className="stack"><span className="faint t-micro">Squad</span><span className="board-f" style={{ fontSize: 22, fontWeight: 600 }}>{n.squad} <span className="faint" style={{ fontSize: 15 }}>/ 18–22</span></span></div>
        <div className="stack"><span className="faint t-micro">Nepali</span><span className="board-f" style={{ fontSize: 22, fontWeight: 600 }}>{n.nep} <span className="faint" style={{ fontSize: 15 }}>+{n.nepRoom} max</span></span></div>
        <div className="stack"><span className="faint t-micro">Overseas</span><span className={`board-f${n.osNeed ? ' crim' : ''}`} style={{ fontSize: 22, fontWeight: 600 }}>{n.os} <span style={{ fontSize: 15 }} className={n.osNeed ? '' : 'faint'}>{n.osNeed ? `need ${n.osNeed}` : `/ ${MIN_OS}–${MAX_OS}`}</span></span></div>
      </div>
      <table className="tbl plain compact"><tbody>
        {wk && wk.have === 0 && <tr><td style={{ paddingLeft: 0 }} className="crim wrapcell">No wicketkeeper yet</td><td className="r faint t-small wrapcell">{nextWk >= 0 ? `keepers from lot ${startIdx(room.A) + nextWk + 1}` : 'none left in the pool'}</td></tr>}
        {p && <tr><td style={{ paddingLeft: 0 }} className="mut wrapcell">Your max on this lot</td><td className="r b6">{L(n.max)}</td></tr>}
        <tr><td style={{ paddingLeft: 0 }} className="mut wrapcell">Per slot left</td><td className="r t-small wrapcell">OS {per(t.osPurse, n.osNeed || Math.max(0, MIN_OS - n.os))} · Nepali {per(t.purse, domLeft)}</td></tr>
      </tbody></table>
      <p className="faint t-micro">Max keeps {L(MIN_BASE.OS)} back for each other overseas player you must still sign, and {L(MIN_BASE.NEP)} for each Nepali.</p>
    </section>
  );
}
function UpNextList({ room }) {
  const { G } = useGame(); const { lots } = upcoming(G, 6); const needs = G.userNeeds(); if (!lots.length) return null;
  const sets = [...new Set(lots.map((l) => l.set))];
  return (
    <section aria-label="Up next"><div className="sechead"><h2 className="sec" style={{ margin: 0 }}>Up next</h2><span className="faint t-micro">{sets.map((x) => `Set ${setNo(room.A, x)}`).join(', then ')}</span></div>
      <table className="tbl plain compact"><tbody>{lots.map((l) => { const e = G.slEntry(l.pid); const tag = lotTags(G, l.p, needs)[0]; return (
        <tr key={l.pid}><td className={e ? 'gld' : 'faint'} style={{ paddingLeft: 0 }}>{e ? '★ ' : ''}{l.no}</td><td className="wrapcell" style={{ fontWeight: e ? 500 : 400 }}>{l.p.name} <span className="role">{l.p.role}</span> <span className="faint t-micro">{l.p.nat} · {ovr(l.p)}</span></td><td className="r num">{L(G.basePrice(l.p))}</td><td className={`t-micro ${e ? 'gld' : tag ? tag[1] : 'faint'}`}>{e ? 'shortlist' : tag ? tag[0].replace(/^Fills (your |an )?/, '').replace(' need', ' need') : ''}</td></tr>); })}</tbody></table>
    </section>
  );
}

function History({ room }) {
  const { G } = useGame(); const c = room.A.cur; if (!c) return null;
  return (
    <section className="panel"><p className="sec" style={{ margin: '0 0 6px' }}>Bid history</p>
      <ul className="rules">{c.hist.slice().reverse().slice(0, 6).map((h, i) => <li key={i}><span className={`t-small row ${i ? 'mut' : ''}`} style={{ gap: 6 }}><Dot id={h[0]} />{h[0] === G.user ? 'You' : tshort(G, h[0])}{h[2] ? ' · RTM' : ''}</span><span className={`t-small ${i ? 'mut' : 'b6'}`}>{L(h[1])}</span></li>)}
        <li><span className="t-small faint">Base price</span><span className="t-small faint">{L(c.base)}</span></li></ul>
    </section>
  );
}

function UpNext({ room }) {
  const { G } = useGame(); const A = room.A; const start = A.i + (A.cur && !A.cur.done ? 1 : 0);
  const next = A.lots.slice(start, start + 3).map((l) => G.P(l.pid));
  if (!next.length) return null;
  return (
    <section><div className="sechead"><p className="sec" style={{ margin: 0 }}>Up next</p></div>
      {next.map((p, i) => { const e = G.slEntry(p.id); return <div key={p.id} className="wrow"><span className="ell"><span className="t-small">{p.name}</span> <span className="t-micro faint">{p.role} · {p.nat} · {ovr(p)}</span></span>{e ? <span className="ptag g">★ Target{e.max ? ` · max ${L(e.max)}` : ''}</span> : i === 0 ? <span className="ptag">Next</span> : null}</div>; })}
    </section>
  );
}

function Accelerated({ room }) {
  const { G, update, toast, ui } = useGame(); const nav = useNavigate();
  const pool = Object.values(G.players).filter((p) => !p.team && !p.retired && !p.academy).sort((x, y) => ovr(y) - ovr(x)).slice(0, 40);
  const n = G.slotsNeeded(G.user); const t = G.teams[G.user];
  // Pre-season fairness: AI teams sign overseas free agents only when the user starts the season.
  const finish = () => { update(() => { G.finishAuction(); G.s.phase = 'preseason'; G.setObjectives(); autosave(G); ui.auc = null; }); nav('/signings'); };
  return (
    <section className="stack" style={{ gap: 16 }}>
      <div className="panel stack" style={{ gap: 8 }}><h2 className="t-h3">Accelerated round</h2>
        <p className="t-small mut">Sign unsold players at their base price. You need {n.nep} more Nepali and {n.os} more overseas to reach the minimum (18 players, 6 overseas). Purses: domestic {fmtL(t.purse)}, overseas {fmtL(t.osPurse)}.</p>
        <div className="row"><button className="btn btn-primary btn-lg" onClick={finish}>Finish auction</button></div>
        <p className="faint t-small">Other franchises fill their Nepali slots when you finish. You get first pick of the overseas free agents in the pre-season window; the others sign theirs when you start the season.</p></div>
      <div className="tblwrap"><table className="tbl compact"><thead><tr><th>Player</th><th>Nat</th><th className="r">Age</th><th>Role</th><th className="r">Rating</th><th className="r">Base</th><th /></tr></thead>
        <tbody>{pool.map((p) => <tr key={p.id}><td className="name"><Link to={`/player/${p.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{p.name}</Link></td><td>{p.nat}</td><td className="r">{p.age}</td><td><Role r={p.role} /></td><td className="r">{ovr(p)}</td><td className="r">{fmtL(p.nat === 'NEP' ? G.basePrice(p) : p.value)}</td>
          <td className="r"><button className="btn btn-sm" onClick={() => update(() => { const e = G.signFA(p.id, G.user); if (e) toast(e); else { room.A.sold.push({ pid: p.id, team: G.user, price: p.salary, set: 'Accelerated' }); toast(`${p.name} signed at ${fmtL(p.salary)}.`); } })}>Sign</button></td></tr>)}</tbody></table></div>
    </section>
  );
}

// ===== Phone: lot board, needs strip, up-next line, then Lot · Up next · My squad · Rivals · Sold =====
function MLotBoard({ room }) {
  const { G } = useGame(); const c = room.A.cur; if (!c) return null; const p = G.P(c.pid); const lead = c.leader;
  const status = c.done ? (lead ? 'Sold to' : 'Unsold') : room.count === 1 ? 'Going once…' : room.count >= 2 ? 'Going twice…' : lead ? 'Leading' : 'Awaiting opening bid';
  const skill = p.role === 'BOWL' ? `bowl ${p.bowl}` : p.role === 'AR' ? `bat ${p.bat} · bowl ${p.bowl}` : `bat ${p.bat}`;
  return (
    <section className="board" style={{ borderRadius: 0, borderWidth: '0 0 1px', padding: '10px 16px 12px', flex: 'none' }} aria-label="Current lot">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}><span className="bf" style={{ fontSize: 24, lineHeight: 1.1 }}>{p.name}</span><span className="blbl">Base {L(c.base)}</span></div>
      <span className="blbl">{p.nat === 'NEP' ? 'Nepali' : 'Overseas'} {p.role} · {p.nat} · {p.age} · {skill}</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
        <span className="bf" style={{ fontSize: 48, lineHeight: 0.95 }}><span key={c.hist.length} className={room.tickCls}>{L(c.bid == null ? c.base : c.bid)}</span></span>
        <div className="stack" style={{ textAlign: 'right', gap: 2 }}><span className="blbl" aria-live="polite">{status}</span><span className="bf" style={{ fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{lead ? <><Dot id={lead} />{lead === G.user ? 'You' : tshort(G, lead)}</> : '—'}</span></div>
      </div>
    </section>
  );
}
function MNeedsStrip({ room, onClick }) {
  const { G } = useGame(); const c = room.A.cur; const p = c && !c.done ? G.P(c.pid) : null; const n = needsInfo(G, p);
  return (
    <button type="button" className="mstrip grid4" onClick={onClick} aria-label="My squad needs">
      <span className="stack"><span className="faint t-micro">Squad</span><span className="big">{n.squad} <small className="faint">/ 18–22</small></span></span>
      <span className="stack"><span className="faint t-micro">Nepali</span><span className="big">{n.nep} <small className="faint">+{n.nepRoom} max</small></span></span>
      <span className="stack"><span className="faint t-micro">Overseas</span><span className={`big${n.osNeed ? ' crim' : ''}`}>{n.os} <small className={n.osNeed ? '' : 'faint'}>{n.osNeed ? `need ${n.osNeed}` : 'ok'}</small></span></span>
      <span className="stack" style={{ textAlign: 'right' }}><span className="faint t-micro">Your max here</span><span className="big">{p ? L(n.max) : '—'}</span></span>
    </button>
  );
}
function MUpNextLine({ onClick }) {
  const { G } = useGame(); const { lots, star } = upcoming(G, 2);
  if (!lots.length) return null;
  return (
    <button type="button" className="mstrip line" onClick={onClick}>
      <span className="faint t-small" style={{ flex: 'none' }}>Up next</span>
      <span className="t-small" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: '1 1 auto' }}>{lots.map((l) => `${l.no} ${l.p.name}`).join(' · ')}{star && star.away > 2 && <> · <span className="gld">★ {star.no} {star.p.name} in {star.away} lots</span></>}</span>
      <span className="faint" aria-hidden="true">›</span>
    </button>
  );
}
function MLot({ room }) {
  const { G } = useGame(); const A = room.A; const c = A.cur; if (!c) return null; const p = G.P(c.pid);
  const tags = lotTags(G, p); const pt = p.prevTeam && A.kind === 'mega' && G.teams[p.prevTeam] && G.teams[p.prevTeam].rtm > 0 && p.prevTeam !== G.user ? p.prevTeam : null;
  const lp = G.likelyPrice(p); const e = G.slEntry(p.id);
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {tags.map(([t, cls]) => <span key={t} className="phase" style={{ fontSize: 12, ...(cls === 'blu' ? { borderColor: 'var(--blue)', color: 'var(--blue)' } : cls === 'gld' ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}) }}>{t}</span>)}
        {pt && <span className="phase" style={{ fontSize: 12 }}>{tshort(G, pt)} hold RTM</span>}
        <span className="phase" style={{ fontSize: 12 }}>Fair value {range(lp)}</span>
        {p.age >= 36 && <span className="phase" style={{ fontSize: 12 }}>Age {p.age} · 1–2 seasons left</span>}
        {p.age <= 21 && p.pot >= 75 && <span className="phase" style={{ fontSize: 12 }}>Potential {potRange(p)}</span>}
      </div>
      <p className="mhead">Bid history</p>
      <ul className="mlist">{c.hist.slice().reverse().slice(0, 6).map((h, i) => <li key={c.hist.length - i} className={i === 0 ? 'ev-new' : ''} style={{ minHeight: 36, padding: '7px 0' }}><span className="grow"><Dot id={h[0]} />{h[0] === G.user ? `${tname(G, h[0])} (you)` : tname(G, h[0])}{h[2] ? ' · RTM' : ''}</span><span className="num">{L(h[1])}</span></li>)}
        <li className="dim" style={{ minHeight: 36, padding: '7px 0' }}><span className="grow">Opened at base</span><span className="num">{L(c.base)}</span></li></ul>
      {!c.done && <AutoBid p={p} e={e} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
        <button type="button" className="btn" style={{ minHeight: 44 }} onClick={() => room.skip()}>Skip lot</button>
        <button type="button" className="btn btn-ghost" style={{ minHeight: 44 }} onClick={() => room.simRest()}>Sim rest</button>
        <button type="button" className="btn btn-ghost" style={{ minHeight: 44, gridColumn: '1/-1' }} disabled={!upcoming(G).star} onClick={() => room.jump()}>Jump to my next shortlisted lot{upcoming(G).star ? ` · lot ${upcoming(G).star.no}` : ''}</button>
      </div>
    </>
  );
}
function AutoBid({ p, e }) {
  const { G, update } = useGame(); const auto = !!(e && e.max);
  return (
    <div className="row autobid" style={{ gap: 10, alignItems: 'center', marginTop: 10 }}>
      <label className="row chk" style={{ gap: 8 }}><input type="checkbox" checked={auto} onChange={(ev) => update(() => { if (ev.target.checked) G.setShortlist(p.id, { max: Math.min(G.lotMax(G.user, p), Math.max(G.nextBidAmount(), G.likelyPrice(p)[1])) }); else if (e) e.max = 0; })} aria-label="Auto-bid" /><span className="t-small">Auto-bid up to</span></label>
      <input className="input maxin" type="number" min="0" step="0.5" value={e && e.max ? e.max : ''} placeholder="Max" aria-label="Auto-bid limit" onChange={(ev) => update(() => { G.setShortlist(p.id, { max: +ev.target.value || 0 }); })} />
    </div>
  );
}
function MUpNext() {
  const { G, update } = useGame(); const A = G.s.auction; const [flt, setFlt] = useState('all'); const needs = G.userNeeds();
  const st = startIdx(A); const rest = A.lots.slice(st).map((l, k) => ({ ...l, no: st + k + 1, p: G.P(l.pid) }));
  const fits = (l) => lotTags(G, l.p, needs).some(([, c]) => c === 'blu');
  const curSet = rest.length ? rest[0].set : null; const nextSet = rest.find((l) => l.set !== curSet); const nextName = nextSet ? nextSet.set : null;
  const keep = (l) => (flt === 'sl' ? !!G.slEntry(l.pid) : flt === 'fit' ? fits(l) : l.set === curSet || l.set === nextName || !!G.slEntry(l.pid));
  const groups = [];
  for (const l of rest) { if (!keep(l)) continue; const g = flt !== 'all' || l.set === curSet || l.set === nextName ? l.set : 'later'; let G2 = groups.find((x) => x.k === g); if (!G2) groups.push(G2 = { k: g, lots: [] }); G2.lots.push(l); }
  const title = (g) => { if (g.k === 'later') return 'Later · shortlisted'; const all = rest.filter((l) => l.set === g.k); return `Set ${setNo(A, g.k)} · ${g.k} · ${all.length > 1 ? `lots ${all[0].no}–${all[all.length - 1].no}` : `lot ${all[0].no}`}`; };
  return (
    <>
      <div className="seg" role="group" aria-label="Filter lots" style={{ margin: '12px 0 2px', display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>{[['all', 'All'], ['sl', 'Shortlist'], ['fit', 'Fits needs']].map(([k, l]) => <button key={k} type="button" className={flt === k ? 'on' : ''} onClick={() => setFlt(k)}>{l}</button>)}</div>
      {groups.map((g) => (
        <div key={g.k}><p className="mhead">{title(g)}</p>
          <ul className="mlist">{g.lots.slice(0, 40).map((l) => { const on = !!G.slEntry(l.pid); const tags = lotTags(G, l.p, needs); return (
            <li key={l.pid} style={{ padding: '8px 0' }}>
              <span className="board-f faint" style={{ width: 26, textAlign: 'right', fontSize: 16, flex: 'none' }}>{l.no}</span>
              <span className="grow"><span style={{ fontWeight: 500 }}>{l.p.name}</span> <span className="role">{l.p.role}</span><br /><span className="l2">{l.p.nat} · {l.p.age} · rating {ovr(l.p)} · base {L(G.basePrice(l.p))}</span>
                {tags.map(([t, cls]) => <span key={t}><br /><span className={`t-micro ${cls}`}>{t}</span></span>)}</span>
              <button type="button" className="btn btn-ghost" style={{ minHeight: 44, width: 44, padding: 0, fontSize: 20, color: on ? 'var(--gold)' : 'var(--ink-3)' }} onClick={() => update(() => { G.toggleShortlist(l.pid); })} aria-label={`${on ? 'Remove' : 'Shortlist'} ${l.p.name}`} aria-pressed={on}>{on ? '★' : '☆'}</button>
            </li>); })}</ul></div>))}
      {!groups.length && <p className="faint t-small" style={{ padding: '20px 0' }}>Nothing here yet. Tap ☆ on a lot to shortlist it.</p>}
    </>
  );
}
function MMySquad() {
  const { G } = useGame(); const t = G.teams[G.user]; const A = G.s.auction; const n = needsInfo(G, null); const needs = G.userNeeds();
  const st = startIdx(A); const sq = t.squad.map((id) => G.P(id)); const roles = ['BAT', 'BOWL', 'AR', 'WK'].map((r) => `${r} ${sq.filter((p) => p.role === r).length}`).join(' · ');
  const sale = (p) => A.sold.find((x) => x.pid === p.id); const fromLot = (role) => { const k = A.lots.slice(st).findIndex((l) => G.P(l.pid).role === role); return k >= 0 ? `next keepers from lot ${st + k + 1}` : 'none left in the pool'; };
  const wk = needs.find((x) => x.k === 'wk'); const domSlots = Math.max(0, MIN_SQUAD - n.squad - n.osNeed); const osOther = Math.max(0, n.osNeed - 1);
  return (
    <>
      <p className="mhead">Still to fill</p>
      <ul className="mlist">
        <li><span className="grow">Overseas<br /><span className="l2">{n.os} of a minimum {MIN_OS} · room for {n.osRoom}</span></span>{n.osNeed ? <span className="crim t-small b6">Need {n.osNeed}</span> : <span className="faint t-small">OK</span>}</li>
        {needs.filter((x) => x.left > 0).map((x) => <li key={x.k}><span className="grow">{x.label.replace(/s$/, '')}<br /><span className="l2">{x.have ? `${x.have} in the squad` : 'None in the squad'}{x.k === 'wk' ? ` · ${fromLot('WK')}` : ''}</span></span><span className={`t-small b6${x.k === 'wk' && wk.have === 0 ? ' crim' : ''}`}>Need {x.left}</span></li>)}
        <li><span className="grow">Squad size<br /><span className="l2">{n.squad} of a minimum {MIN_SQUAD} · maximum {MAX_SQUAD}</span></span><span className="t-small b6">{n.squad >= MIN_SQUAD ? 'OK' : `${MIN_SQUAD - n.squad}–${MAX_SQUAD - n.squad} more`}</span></li>
        <li><span className="grow">Nepali<br /><span className="l2">{n.nep} signed · room for {n.nepRoom} more</span></span><span className="faint t-small">{n.req.nep ? `Need ${n.req.nep}` : 'OK'}</span></li>
      </ul>
      <p className="mhead">Money per slot</p>
      <ul className="mlist">
        <li><span className="grow">Overseas purse {L(t.osPurse)}<br /><span className="l2">{osOther ? `${L(osOther * MIN_BASE.OS)} kept back for the ${osOther} other overseas you must still sign` : 'No overseas slots still required'}</span></span><span className="t-small">{n.osNeed ? `≈ ${L(Math.floor((t.osPurse / n.osNeed) * 2) / 2)} each` : '—'}</span></li>
        <li><span className="grow">Domestic purse {L(t.purse)}<br /><span className="l2">For {domSlots ? `${domSlots} to ${n.nepRoom}` : `up to ${n.nepRoom}`} more Nepali players</span></span><span className="t-small">{domSlots ? `≈ ${L(Math.floor((t.purse / domSlots) * 2) / 2)} each` : '—'}</span></li>
      </ul>
      <p className="mhead">Signed · {sq.length}</p>
      <ul className="mlist">{sq.map((p) => { const x = sale(p); return <li key={p.id} style={{ padding: '8px 0' }}><span className="grow">{p.name} <span className="role">{p.role}</span>{p.nat !== 'NEP' && <span className="blu t-micro"> OS</span>}</span><span className={x ? 't-small' : 'faint t-small'}>{x ? L(x.price) : `Retained · ${L(p.salary)}`}</span></li>; })}</ul>
      <p className="faint t-small" style={{ marginTop: 8 }}>By role: {roles}</p>
      {A.kind === 'mega' && <p className="t-small" style={{ marginTop: 6 }}>RTM cards left: <b>{t.rtm || 0}</b></p>}
    </>
  );
}
function MRivals({ room }) {
  const { G } = useGame(); const c = room.A.cur; const p = c ? G.P(c.pid) : null; const os = !p || p.nat !== 'NEP';
  const teams = Object.values(G.teams).slice().sort((a, b) => (p ? G.lotMax(b.id, p) - G.lotMax(a.id, p) : 0));
  return (
    <>
      <p className="faint t-small" style={{ marginTop: 12 }}>Who can still afford this lot. Amounts in Rs.</p>
      <table className="tbl compact plain" style={{ marginTop: 4 }}><thead><tr><th style={{ paddingLeft: 0 }}>Team</th><th className="r">{os ? 'OS purse' : 'Purse'}</th><th className="r">{os ? 'OS open' : 'Open'}</th><th className="r">Max here</th></tr></thead>
        <tbody>{teams.map((t) => { const bidding = room.rivalStatus(t.id).k === 'bid' && t.id !== G.user; const osN = G.osCount(t.id); const nep = t.squad.length - osN;
          return <tr key={t.id} className={t.id === G.user ? 'me' : ''}><td style={{ paddingLeft: 0 }}><Dot id={t.id} />{tshort(G, t.id)}{t.id === G.user ? ' (you)' : ''}{bidding && <span className="crim t-micro"> bidding</span>}</td><td className="r">{fmtL(os ? t.osPurse : t.purse).replace(/^Rs /, '')}</td><td className="r">{os ? Math.max(0, MAX_OS - osN) : Math.max(0, Math.min(MAX_SQUAD - t.squad.length, 14 - nep))}</td><td className="r">{p ? fmtL(G.lotMax(t.id, p)).replace(/^Rs /, '') : '—'}</td></tr>; })}</tbody></table>
      <p className="mhead">{os ? 'Domestic purses' : 'Overseas purses'}</p>
      <p className="t-small mut">{Object.values(G.teams).slice().sort((a, b) => (os ? b.purse - a.purse : b.osPurse - a.osPurse)).map((t) => `${tshort(G, t.id)} ${fmtL(os ? t.purse : t.osPurse).replace(/^Rs /, '')}`).join(' · ')}</p>
    </>
  );
}
function MSold() {
  const { G } = useGame(); const A = G.s.auction; const log = A.log || [];
  return <ul className="mlist">{log.map((x, i) => { const p = G.P(x.pid); return <li key={`${x.pid}${i}`} className={i === 0 ? 'ev-new' : ''}><span className="grow"><span style={{ fontWeight: 500 }}>{p.name}</span><br /><span className="l2"><span className={x.team ? 'blu' : 'faint'}>{x.team ? 'Sold' : 'Unsold'}</span> {x.team ? `→ ${tshort(G, x.team)}${x.team === G.user ? ' (you)' : ''}` : `base ${L(G.basePrice(p))}`}</span></span><span className="num mut">{x.team ? L(x.price) : '—'}</span></li>; })}
    {!log.length && <li className="faint t-small">No lots sold yet.</li>}</ul>;
}
function MBidBar({ room }) {
  const { G, toast } = useGame(); const A = room.A; const c = A.cur; if (!c) return null;
  if (c.done) { const nx = A.lots[A.i]; return <button type="button" className="btn btn-blue" style={{ flex: '1 1 auto' }} onClick={() => room.next()}>{nx ? `Next lot · ${A.i + 1} ${G.P(nx.pid).name}` : 'Go to the accelerated round'}</button>; }
  const p = G.P(c.pid); const nb = G.nextBidAmount(); const max = G.lotMax(G.user, p); const lead = c.leader === G.user; const over = nb > max;
  return (
    <>
      <button type="button" className="btn btn-primary" style={{ flex: '1 1 auto', fontSize: 15 }} disabled={c.userPassed || lead || !room.canUserBid()} onClick={() => { const x = room.bid(); if (x) toast(x); }}>
        <span>{lead ? 'You lead' : over ? 'Over your limit' : `Bid ${L(nb)}`}</span><span className="sub">{over ? `Your max is ${L(max)}` : `Max ${L(max)}${max - nb >= 0 ? ` · ${L(Math.round((max - nb) * 10) / 10)} to spare` : ''}`}</span></button>
      <button type="button" className="btn" style={{ flex: '0 0 96px' }} disabled={c.userPassed} onClick={() => room.pass()}>{c.userPassed ? 'Passed' : 'Pass'}</button>
    </>
  );
}
function AuctionMobile({ room, ended, rtm }) {
  const { G } = useGame(); const A = room.A; const [tab, setTab] = useTab(['lot', 'next', 'squad', 'rivals', 'sold'], 'lot');
  const lotN = Math.min(A.lots.length, A.i + (A.cur && !A.cur.done ? 1 : 0));
  const top = { title: <>{A.kind === 'mega' ? 'Mega' : 'Mini'} auction</>, sub: ended ? 'Main auction done' : `Lot ${lotN} / ${A.lots.length}` };
  if (ended) return <MScreen top={top}><Stepper step={3} /><Accelerated room={room} />{rtm}</MScreen>;
  return (
    <MScreen top={top} pinRaw={<><MLotBoard room={room} /><MNeedsStrip room={room} onClick={() => setTab('squad')} /><MUpNextLine onClick={() => setTab('next')} /></>}
      label="Auction sections" tab={tab} onTab={setTab} tabs={[['lot', tn(G, 'Lot')], ['next', tn(G, 'Up next')], ['squad', tn(G, 'My squad')], ['rivals', tn(G, 'Rivals')], ['sold', tn(G, 'Sold')]]}
      actions={<MBidBar room={room} />}>
      {tab === 'lot' && <MLot room={room} />}{tab === 'next' && <MUpNext />}{tab === 'squad' && <MMySquad />}{tab === 'rivals' && <MRivals room={room} />}{tab === 'sold' && <MSold />}
      {rtm}
    </MScreen>
  );
}

export default function Auction() {
  const { G, ui, update } = useGame(); const narrow = useNarrow(); const [q, setQ] = useSearchParams();
  const a = G.s.auction;
  if (G.s.phase === 'auction' && a && (!ui.auc || ui.auc.G !== G)) ui.auc = new AuctionRoom(G, update);
  const room = ui.auc;
  useEffect(() => { if (!room) return undefined; room.onChange = update; room.ensureLot(); update(); return () => room.stop(); }, [room, update]);
  if (G.s.phase !== 'auction' || !a || !room) return <><h1 className="t-h1">Auction</h1><p className="mut" style={{ marginTop: 8 }}>The auction opens in the off-season, after retention.</p></>;
  if (a.prep) return <div className="auction"><Stepper step={2} /><Shortlist room={room} /></div>;
  const ended = (!a.lots[a.i] && (!a.cur || a.cur.done) && room.state !== 'done') || room.state === 'end';
  const done = a.sold.length + a.unsold.length; const lotN = Math.min(a.lots.length, a.i + (a.cur && !a.cur.done ? 1 : 0));
  const sub = ended ? 'Main auction complete' : `Lot ${lotN} of ${a.lots.length} · ${(a.lots[a.i] || a.lots[a.i - 1] || {}).set || ''}`;
  const title = `${a.kind === 'mega' ? 'Mega' : 'Mini'} auction ${G.year}`;
  const tab = q.get('tab') || 'floor'; const view = q.get('view');
  const rtm = room.rtmAsk && <Modal><p className="faint t-small">Right to Match</p><h2 className="t-h2" style={{ marginTop: 6 }}>{G.P(room.rtmAsk.pid).name} sold to {tname(G, room.rtmAsk.team)} for {fmtL(room.rtmAsk.price)}.</h2>
    <p className="mut" style={{ marginTop: 8 }}>He played for you last season. Use one of your {G.teams[G.user].rtm} RTM card{G.teams[G.user].rtm > 1 ? 's' : ''} to match the price and keep him?</p>
    <div className="acts"><button className="btn btn-primary btn-lg" onClick={() => room.answerRTM(true)}>Use RTM · {fmtL(room.rtmAsk.price)}</button><button className="btn btn-lg" onClick={() => room.answerRTM(false)}>Let him go</button></div></Modal>;
  const t = G.teams[G.user];
  const sims = !ended && <div className="row" style={{ gap: 8 }}><button type="button" className="btn" onClick={() => room.skip()}>Skip this lot</button><button type="button" className="btn" disabled={!upcoming(G).star} onClick={() => room.jump()}>Jump to my next shortlisted lot{upcoming(G).star ? <span className="sub faint"> · Lot {upcoming(G).star.no}</span> : null}</button><button type="button" className="btn btn-ghost" title="Your team bids automatically to fill squad needs" onClick={() => room.simRest()}>Sim rest of auction</button></div>;

  if (narrow) return <AuctionMobile room={room} ended={ended} rtm={rtm} />;
  if (view === 'shortlist') return <div className="auction"><Stepper step={2} /><Shortlist room={room} inRoom /></div>;
  return (
    <div className="auction">
      <div className="pagehead" style={{ marginBottom: 10 }}><div className="stack" style={{ gap: 2 }}><h1 className="t-h1">{title}</h1><p className="mut t-small">{sub} · {a.sold.length} sold, {a.unsold.length} unsold</p></div><Stepper step={ended ? 3 : 2} /></div>
      <Meter pct={(done / a.lots.length) * 100} blue />
      <div style={{ margin: '12px 0' }}><HowItWorks /></div>
      {ended ? <Accelerated room={room} /> : <>
        <div className="aroom">
          <Pool room={room} />
          <section className="stack" style={{ gap: 14, minWidth: 0 }}><Board room={room} /><BidControls room={room} /><div className="two-col"><Fits room={room} /><History room={room} /></div></section>
          <div className="stack" style={{ gap: 20, minWidth: 0 }}><NeedsPanel room={room} /><UpNextList room={room} /><MySquad room={room} /></div>
        </div>
        <section style={{ marginTop: 18 }} aria-label="Rival bidders"><div className="sechead"><h2 className="t-h3">Rivals on this lot</h2><span className="t-micro faint">Purse left for this lot · squad size</span></div><Rivals room={room} /></section>
        <div style={{ marginTop: 14 }}>{sims}</div>
      </>}
      {rtm}
    </div>
  );
}
