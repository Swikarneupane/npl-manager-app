import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../lib/store.jsx';
import { Dot, Meter, Modal, Role } from '../components/bits.jsx';
import { ovr, fmtL, TYPE_LABEL } from '../game/engine.js';
import { COUNTRY_NAMES } from '../game/data.js';
import { NEEDS, needRoles, DOM_CAP, OS_CAP } from '../game/game.js';
import { AuctionRoom } from '../lib/auction.js';
import { potRange, tname, tshort, useNarrow } from '../lib/util.js';
import { autosave } from '../lib/save.js';

const PRI = [['A', 'A · must'], ['B', 'B · want'], ['C', 'C · cheap']];
const PRI_TAG = { A: 'c', B: 'g', C: '' };
const ROLE_NAME = { AR: 'All-rounder', WK: 'Wicketkeeper', BAT: 'Batter', BOWL: 'Bowler' };
const L = (x) => `Rs ${fmtL(x).replace(/^Rs /, '')}`;
const range = ([a, b]) => `Rs ${a}–${b} L`;

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
  const btns = (
    <div className="bidbtns"><button type="button" className="btn btn-primary b6" disabled={!room.canUserBid()} onClick={() => { const x = room.bid(); if (x) toast(x); }}>Bid {L(nb)}</button>
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
  const pool = Object.values(G.players).filter((p) => !p.team && !p.retired).sort((x, y) => ovr(y) - ovr(x)).slice(0, 40);
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
  const sims = !ended && <div className="row" style={{ gap: 8 }}><button type="button" className="btn" onClick={() => room.skip()}>Skip this lot</button><button type="button" className="btn" disabled={!G.s.shortlist.length} onClick={() => room.jump()}>Sim to my next target</button><button type="button" className="btn btn-ghost" title="Your team bids automatically to fill squad needs" onClick={() => room.simRest()}>Sim rest of auction</button></div>;

  if (narrow) {
    const tabs = [['floor', 'Floor'], ['pool', `Pool · ${G.s.shortlist.length}★`], ['squad', 'My squad'], ['rivals', 'Rivals']];
    const rivalChips = Object.values(G.teams).filter((x) => x.id !== G.user).map((x) => ({ x, s: room.rivalStatus(x.id) })).sort((p, r) => (r.s.k === 'bid') - (p.s.k === 'bid') || (r.s.s === 'Watching') - (p.s.s === 'Watching')).slice(0, 3);
    return (
      <div className="auction">
        <div className="sechead" style={{ alignItems: 'flex-start' }}><div><h1 className="t-h3">{title}</h1><p className="t-micro faint">{sub}</p></div><div style={{ textAlign: 'right' }}><p className="t-micro faint">Your purses</p><p className="t-small">{fmtL(t.purse).replace(/^Rs /, '')} · <span className="blu">{fmtL(t.osPurse).replace(/^Rs /, '')} OS</span></p></div></div>
        <Meter pct={(done / a.lots.length) * 100} blue />
        <div className="tabs" role="tablist" aria-label="Auction sections" style={{ marginTop: 10 }}>{tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setQ(k === 'floor' ? {} : { tab: k }, { replace: true })}>{l}</button>)}</div>
        {ended ? <><Stepper step={3} /><Accelerated room={room} /></> : <>
          {tab === 'floor' && <div className="stack" style={{ gap: 12 }}><HowItWorks /><Board room={room} compact /><Fits room={room} compact />
            <section className="panel stack" style={{ gap: 6, padding: '12px 14px' }}><div className="sechead" style={{ margin: 0 }}><p className="sec" style={{ margin: 0 }}>Rivals still bidding</p><button type="button" className="linkbtn t-micro" onClick={() => setQ({ tab: 'rivals' }, { replace: true })}>All rivals</button></div>
              <div className="row" style={{ gap: 6 }}>{rivalChips.map(({ x, s }) => <span key={x.id} className={`ptag ${s.k === 'bid' ? 'c' : ''}`}><Dot id={x.id} />{tshort(G, x.id)} · {s.k === 'bid' ? `${fmtL(G.P(a.cur.pid).nat === 'NEP' ? x.purse : x.osPurse).replace(/^Rs /, '')} left` : s.s.toLowerCase()}</span>)}</div></section>
            <UpNext room={room} /></div>}
          {tab === 'pool' && <Shortlist room={room} inRoom />}
          {tab === 'squad' && <MySquad room={room} />}
          {tab === 'rivals' && <Rivals room={room} list />}
          {tab !== 'pool' && <div className="bidbar"><BidControls room={room} bar />{a.cur && !a.cur.done && <div className="row" style={{ gap: 4 }}><button type="button" className="btn btn-ghost btn-sm" onClick={() => room.skip()}>Skip lot</button><button type="button" className="btn btn-ghost btn-sm" disabled={!G.s.shortlist.length} onClick={() => room.jump()}>Sim to next target</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => room.simRest()}>Sim rest</button></div>}</div>}
        </>}
        {rtm}
      </div>
    );
  }
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
          <MySquad room={room} />
        </div>
        <section style={{ marginTop: 18 }} aria-label="Rival bidders"><div className="sechead"><h2 className="t-h3">Rivals on this lot</h2><span className="t-micro faint">Purse left for this lot · squad size</span></div><Rivals room={room} /></section>
        <div style={{ marginTop: 14 }}>{sims}</div>
      </>}
      {rtm}
    </div>
  );
}
