// ===== Recruitment for clubs in any league: rosters, rules, the annual cycle, auction, draft, contract market =====
// Save (s.wd): ros { team: [id] } changed rosters only; con { team: { id: wage } } contracts that differ from the default;
// newp { id: record } young players made by the cycle; ret { id: year } retired; pg { y, ids } ratings moved this year;
// rec { league: { sid, stage: 'retain'|'recruit'|'done', pool, keep, auc|dr|mk } } the cycle in progress.
// Prices and wages use the league's purse unit (rules.purse); a league with no purse has no wages.
import { registry, rosterOf, teamInfo, leagueData, hydrate } from './players.js';
import { value } from './squads.js';
import { COMPS } from './comps.js';
import { NAME_POOLS } from '../data/world/names.js';
import { OS_NAMES } from '../game/data.js';

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); };
const r2 = (x) => Math.round(x * 100) / 100;

export function rulesOf(code) {
  const r = (leagueData(code) || {}).rules || {};
  return { ...r, min: r.min ?? 18, max: r.max ?? 25, overseas: { max: (r.overseas || {}).max ?? 8, xi: (r.overseas || {}).xi ?? 4 }, recruit: r.recruit || 'contract', retain: r.retain, purse: r.purse || 0 };
}
export const leagueOf = (tid) => { const t = teamInfo(tid); return (t && t.league) || null; };
export const teamsOf = (code) => ((leagueData(code) || {}).teams || []).map((t) => t.id);
export const fmtOf = (code) => { const f = (COMPS[code] && COMPS[code].fmt) || 'T20'; return f === 'T20' || f === 'ODI' ? f : 'Test'; };
const host = (tid) => { const t = teamInfo(tid); return t ? t.nat : null; };
export const isOS = (p, tid) => { const h = host(tid); return !!h && p.nat !== h; };

// ----- rosters in the save -----
export function sync(G) {
  const wd = G.s.wd; if (!wd) return null; const R = registry(G); if (R._sync) return R; R._sync = true;
  for (const [id, rec] of Object.entries(wd.newp || {})) if (!R.by[id]) { const p = hydrate(rec, G.year, (wd.pd || {})[id]); p.gen = 1; p.dom = 1; R.by[id] = p; }
  for (const id in wd.ret || {}) if (R.by[id]) R.by[id].retired = true;
  for (const [tid, ids] of Object.entries(wd.ros || {})) R.team[tid] = ids.filter((id) => R.by[id]);
  return R;
}
export const idsOf = (G, tid) => { const R = sync(G); return ((R && R.team[tid]) || []).filter((id) => R.by[id] && !R.by[id].retired); };
export function setRoster(G, tid, ids) { const wd = G.s.wd; const R = sync(G); (wd.ros ??= {})[tid] = ids.slice(); R.team[tid] = ids.slice(); }
export const roster = (G, tid) => { sync(G); return rosterOf(G, tid); };
export const player = (G, id) => { const R = sync(G); return R.by[id] || null; };

// ----- money -----
export const unit = (code) => rulesOf(code).purse || 100;
export function worth(G, p, code) { const P = unit(code); const v = value(p, fmtOf(code)); return r2(Math.min(P * 0.3, Math.max(P * 0.004, P * 0.0105 * Math.exp((v - 55) / 10)))); }
export const wageOf = (G, p, tid) => { const c = ((G.s.wd.con || {})[tid] || {})[p.id]; return c ?? r2(worth(G, p, leagueOf(tid)) * 0.85); };
export const payroll = (G, tid) => r2(roster(G, tid).reduce((a, p) => a + wageOf(G, p, tid), 0));
const setWage = (G, tid, id, w) => { ((G.s.wd.con ??= {})[tid] ??= {})[id] = r2(w); };

// ----- rules -----
export const counts = (G, tid, ids) => { const ps = (ids || idsOf(G, tid)).map((id) => player(G, id)).filter(Boolean); return { n: ps.length, os: ps.filter((p) => isOS(p, tid)).length, wk: ps.filter((p) => p.role === 'WK').length }; };
export function squadIssues(G, tid, ids) {
  const R = rulesOf(leagueOf(tid)); const c = counts(G, tid, ids); const out = [];
  if (c.n < R.min) out.push(`Squad has ${c.n} players; the league needs at least ${R.min}.`);
  if (c.n > R.max) out.push(`Squad has ${c.n} players; the league allows ${R.max}.`);
  if (c.os > R.overseas.max) out.push(`${c.os} overseas players; the limit is ${R.overseas.max}.`);
  if (!c.wk && c.n >= 11) out.push('No wicketkeeper in the squad.');
  return out;
}
export function xiIssues(G, tid, xi) {
  const R = rulesOf(leagueOf(tid)); const ps = xi.map((id) => player(G, id)).filter(Boolean); const out = [];
  if (ps.length !== 11) out.push(`Pick eleven (you have ${ps.length}).`);
  const os = ps.filter((p) => isOS(p, tid)).length; if (os > R.overseas.xi) out.push(`${os} overseas players in the XI; the limit is ${R.overseas.xi}.`);
  return out;
}
export function canSign(G, tid, p, ids) {
  const R = rulesOf(leagueOf(tid)); const c = counts(G, tid, ids);
  if (!p || p.retired) return 'Not available.'; if (c.n >= R.max) return `The squad is full (${R.max}).`;
  if (isOS(p, tid) && c.os >= R.overseas.max) return `Overseas limit reached (${R.overseas.max}).`;
  return null;
}
export function release(G, tid, id) {
  const ids = idsOf(G, tid); if (!ids.includes(id)) return 'He is not in the squad.';
  const code = leagueOf(tid); if (ids.length <= 11) return 'You need at least eleven players.';
  setRoster(G, tid, ids.filter((x) => x !== id)); const c = (G.s.wd.con || {})[tid]; if (c) delete c[id];
  const rec = (G.s.wd.rec || {})[code]; if (rec && rec.pool && !rec.pool.includes(id)) rec.pool.push(id);
  return null;
}
// A legal squad of 15 for a match: at most overseas.xi overseas players, so any XI from it is legal.
export function legalPool(pool, tid, maxOs) {
  const by = pool.slice().sort((a, b) => value(b, 'T20') - value(a, 'T20')); let os = 0;
  return by.filter((p) => { if (!isOS(p, tid)) return true; if (os >= maxOs) return false; os++; return true; });
}

// ----- ageing, retirement, young players -----
function progress(G, p, year, rnd, retire) {
  if (!p.world || p.gen && !p.id.startsWith('y')) { /* generated and real players alike age; NPL players do not */ }
  if (!p.world) return false; const age = year - p.born; const h = hash(p.id + year) % 3 - 1;
  const d = age <= 20 ? 3 : age <= 23 ? 2 : age <= 27 ? 1 : age <= 31 ? 0 : age <= 34 ? -1 : age <= 37 ? -2 : -3;
  const wd = G.s.wd; wd.pg = wd.pg && wd.pg.y === year ? wd.pg : { y: year, ids: {} };
  if (!wd.pg.ids[p.id]) { wd.pg.ids[p.id] = 1; const dd = d + (d === 0 ? 0 : Math.sign(d) * (h > 0 ? 1 : 0));
    p.bat = Math.max(10, Math.min(98, p.bat + dd)); if (p.bowl > 25) p.bowl = Math.max(10, Math.min(98, p.bowl + dd));
    const rec = wd.newp && wd.newp[p.id]; if (rec) { rec[5] = p.bat; rec[6] = p.bowl; } }
  return retire && age >= 36 && rnd() < Math.min(1, (age - 35) * 0.14);
}
const pools = (c) => NAME_POOLS[c] || OS_NAMES[c] || OS_NAMES.ENG;
export function makeYoung(G, code, year, rnd, role) {
  const wd = G.s.wd; const nat = (leagueData(code) || {}).host || 'ENG'; const P = pools(nat); const F = P.first || P.f, L = P.last || P.l;
  const seq = Object.keys(wd.newp || {}).length + 1; const id = `y${year}-${code.toLowerCase()}-${seq}`;
  const lv = 40 + Math.floor(rnd() * 16); const bowler = role === 'BOWL', ar = role === 'AR';
  const rec = [id, `${F[Math.floor(rnd() * F.length)]} ${L[Math.floor(rnd() * L.length)]}`, nat, year - 18 - Math.floor(rnd() * 3), role, bowler ? 20 + Math.floor(rnd() * 12) : lv, bowler ? lv : ar ? lv - 4 : 5 + Math.floor(rnd() * 12),
    bowler || ar ? (rnd() < 0.3 ? 'OB' : 'RFM') : '', rnd() < 0.75 ? 'R' : 'L', { gen: 1 }, [nat]];
  (wd.newp ??= {})[id] = rec; const p = hydrate(rec, G.year); p.gen = 1; p.dom = 1; registry(G).by[id] = p; return p;
}

// ----- the pool -----
function buildPool(G, code, extra) {
  const R = sync(G); const taken = new Set(); for (const t of teamsOf(code)) for (const id of idsOf(G, t)) taken.add(id);
  const h = (leagueData(code) || {}).host; const f = fmtOf(code); const score = (p) => value(p, f);
  const cands = Object.values(R.by).filter((p) => p && !p.retired && !taken.has(p.id) && !p.gen && !(p.id in (G.players || {})));
  const home = cands.filter((p) => p.nat === h).sort((a, b) => score(b) - score(a)).slice(0, 70); const away = cands.filter((p) => p.nat !== h).sort((a, b) => score(b) - score(a)).slice(0, 40);
  return [...new Set([...extra, ...home.map((p) => p.id), ...away.map((p) => p.id)])];
}
const need = (G, tid, id) => { const ps = idsOf(G, tid).map((x) => player(G, x)).filter(Boolean); const p = player(G, id); if (!p) return 1; const has = (r) => ps.filter((q) => q.role === r).length;
  return (p.role === 'WK' && has('WK') < 2 ? 1.25 : 1) * (p.bowl >= 50 && ps.filter((q) => q.bowl >= 50).length < 6 ? 1.15 : 1) * (p.role === 'BAT' && has('BAT') > 6 ? 0.85 : 1); };
const noise = (tid, id) => 0.85 + (hash(tid + id) % 40) / 100;

// ----- the cycle -----
export const recOf = (G, code) => (G.s.wd.rec || {})[code] || null;
export function beginCycle(G, code, sid, year, rnd, ut) {
  const wd = G.s.wd; sync(G); const R = rulesOf(code); const out = [];
  for (const tid of teamsOf(code)) {
    const keep = []; for (const id of idsOf(G, tid)) { const p = player(G, id); if (progress(G, p, year, rnd, true)) { (wd.ret ??= {})[id] = year; p.retired = true; } else keep.push(id); }
    const roles = ['BAT', 'BOWL', 'AR', 'BOWL', 'BAT']; const n = Math.max(0, Math.min(2, R.min - keep.length + 1));
    for (let k = 0; k < n; k++) keep.push(makeYoung(G, code, year, rnd, roles[(keep.length + k) % roles.length]).id);
    setRoster(G, tid, keep);
  }
  const rec = { sid, y: year, stage: 'retain', pool: [], keep: {} }; (wd.rec ??= {})[code] = rec;
  for (const tid of teamsOf(code)) rec.keep[tid] = suggestKeep(G, tid, code).map((p) => p.id);
  if (!ut) { for (const tid of teamsOf(code)) releaseRest(G, code, tid); rec.stage = 'recruit'; initEngine(G, code, rnd); }
  return rec;
}
function suggestKeep(G, tid, code) {
  const R = rulesOf(code); const ps = roster(G, tid).sort((a, b) => value(b, fmtOf(code)) - value(a, fmtOf(code)));
  const n = R.retain != null && R.retain > 0 ? R.retain : R.recruit === 'contract' ? Math.ceil(ps.length * 0.8) : Math.floor(R.max * 0.7);
  return ps.slice(0, Math.min(n, ps.length));
}
export const keepLimit = (code) => { const R = rulesOf(code); return R.retain != null && R.retain > 0 ? R.retain : R.recruit === 'contract' ? 99 : Math.floor(R.max * 0.7); };
function releaseRest(G, code, tid) {
  const rec = recOf(G, code); const keep = new Set(rec.keep[tid]); const ids = idsOf(G, tid);
  for (const id of ids) if (!keep.has(id)) { rec.pool.push(id); const c = (G.s.wd.con || {})[tid]; if (c) delete c[id]; }
  setRoster(G, tid, ids.filter((id) => keep.has(id)));
}
export function setKeep(G, code, tid, ids) { const rec = recOf(G, code); if (!rec || rec.stage !== 'retain') return 'Retention is closed.'; if (ids.length > keepLimit(code)) return `You may keep ${keepLimit(code)}.`; rec.keep[tid] = ids.slice(); return null; }
export function confirmRetain(G, code, rnd, ut) {
  const rec = recOf(G, code); if (!rec || rec.stage !== 'retain') return 'Retention is closed.';
  for (const tid of teamsOf(code)) releaseRest(G, code, tid); rec.stage = 'recruit'; initEngine(G, code, rnd); return null;
}
function initEngine(G, code, rnd) {
  const rec = recOf(G, code); const R = rulesOf(code); rec.pool = buildPool(G, code, rec.pool).filter((id) => player(G, id)); const teams = teamsOf(code);
  const f = fmtOf(code); rec.pool.sort((a, b) => value(player(G, b), f) - value(player(G, a), f));
  if (R.recruit === 'auction') {
    const purse = {}; for (const t of teams) purse[t] = r2(Math.max(R.purse * 0.25, R.purse - payroll(G, t)));
    rec.auc = { lots: rec.pool.slice(0, 90), i: -1, cur: null, purse, sold: 0 };
  } else if (R.recruit === 'draft') {
    const kept = Math.min(...teams.map((t) => idsOf(G, t).length)); const rounds = R.draftRounds || Math.max(1, R.min - kept);
    const order = []; const base = teams.slice().sort(() => rnd() - 0.5); for (let r = 0; r < rounds; r++) order.push(...(r % 2 ? base.slice().reverse() : base));
    const cat = {}; let at = 0; (R.cats || []).forEach((c, ci) => { rec.pool.slice(at, at + c.size).forEach((id) => { cat[id] = ci; }); at += c.size; });
    rec.dr = { order, i: 0, cat };
  } else {
    const ask = {}; for (const id of rec.pool) ask[id] = r2(worth(G, player(G, id), code) * 0.95); rec.mk = { ask };
  }
  if (!R.purse && R.recruit === 'auction') rec.auc.purse = Object.fromEntries(teams.map((t) => [t, 100]));
}
// the assistant (or an AI-only league) runs the rest of the cycle
export function runRest(G, code, rnd, ut) {
  const rec = recOf(G, code); if (!rec || rec.stage === 'done') return;
  if (rec.stage === 'retain') confirmRetain(G, code, rnd);
  const R = rulesOf(code);
  if (R.recruit === 'auction') { while (aucNext(G, code, rnd, ut)) aucPass(G, code, rnd, ut); }
  else if (R.recruit === 'draft') draftAuto(G, code, rnd, ut, true);
  else contractAI(G, code, rnd, ut);
  finishCycle(G, code, rnd);
}
export function finishCycle(G, code, rnd) {
  const rec = recOf(G, code); if (!rec) return; const R = rulesOf(code); const f = fmtOf(code); const year = rec.y;
  for (const tid of teamsOf(code)) {
    let ids = idsOf(G, tid);
    // too many: release the weakest, overseas first when over the limit
    for (let g = 0; g < 60 && (ids.length > R.max || counts(G, tid, ids).os > R.overseas.max); g++) {
      const over = counts(G, tid, ids).os > R.overseas.max; const ps = ids.map((id) => player(G, id)).filter((p) => !over || isOS(p, tid)).sort((a, b) => value(a, f) - value(b, f)); ids = ids.filter((id) => id !== ps[0].id); }
    // too few: sign the best free player the rules allow, then a young one
    const free = rec.pool.filter((id) => !teamsOf(code).some((t) => idsOf(G, t).includes(id)) && !ids.includes(id));
    for (let g = 0; g < 80 && ids.length < R.min; g++) {
      const p = free.map((id) => player(G, id)).filter((q) => q && !q.retired && !ids.includes(q.id) && !canSign(G, tid, q, ids)).sort((a, b) => value(b, f) - value(a, f))[0];
      if (p) { ids.push(p.id); free.splice(free.indexOf(p.id), 1); setWage(G, tid, p.id, worth(G, p, code) * 0.5); } else ids.push(makeYoung(G, code, year, rnd, ['BAT', 'BOWL', 'AR', 'WK'][ids.length % 4]).id); }
    if (!counts(G, tid, ids).wk && ids.length) { const wk = makeYoung(G, code, year, rnd, 'WK'); if (ids.length >= R.max) { const w = ids.map((id) => player(G, id)).sort((a, b) => value(a, f) - value(b, f))[0]; ids = ids.filter((id) => id !== w.id); } ids.push(wk.id); }
    setRoster(G, tid, ids);
  }
  G.s.wd.rec[code] = { sid: rec.sid, y: rec.y, stage: 'done' };
}

// ----- auction -----
const incOf = (code, price) => Math.max(unit(code) * 0.002, r2(price * 0.1));
export function aucNext(G, code, rnd, ut) {
  const A = recOf(G, code).auc; if (A.cur && !A.cur.done) return A.cur; A.i++;
  if (A.i >= A.lots.length) { A.cur = null; return null; }
  const p = player(G, A.lots[A.i]); A.cur = { id: p.id, price: r2(Math.max(unit(code) * 0.004, worth(G, p, code) * 0.25)), lead: null, done: false };
  aiStep(G, code, rnd, ut); return A.cur;
}
const nextBid = (code, c) => (c.lead ? r2(c.price + incOf(code, c.price)) : c.price);
function wants(G, code, t, c) {
  const A = recOf(G, code).auc; const p = player(G, c.id); const nb = nextBid(code, c); const ids = idsOf(G, t);
  if (c.lead === t || A.purse[t] < nb || canSign(G, t, p, ids)) return false;
  const slots = Math.max(0, rulesOf(code).min - ids.length); return worth(G, p, code) * need(G, t, c.id) * noise(t, c.id) >= nb && A.purse[t] - nb >= (slots - 1) * unit(code) * 0.004;
}
function aiStep(G, code, rnd, ut) {
  const rec = recOf(G, code); const c = rec.auc.cur; const cands = teamsOf(code).filter((t) => t !== ut && wants(G, code, t, c));
  if (!cands.length) return false; const t = cands[Math.floor(rnd() * cands.length)]; c.price = nextBid(code, c); c.lead = t; return true;
}
export function aucBid(G, code, tid, rnd) {
  const rec = recOf(G, code); const A = rec.auc; const c = A.cur; if (!c || c.done) return 'No lot open.';
  const nb = nextBid(code, c); if (c.lead === tid) return 'You already lead.'; if (A.purse[tid] < nb) return 'Not enough purse.';
  const e = canSign(G, tid, player(G, c.id), idsOf(G, tid)); if (e) return e; c.price = nb; c.lead = tid; aiStep(G, code, rnd, tid); return null;
}
// the user passes (or the AI-only lot runs out): the other teams bid until nobody will
export function aucPass(G, code, rnd, ut) {
  const rec = recOf(G, code); const A = rec.auc; const c = A.cur; if (!c) return;
  for (let g = 0; g < 80; g++) if (!aiStep(G, code, rnd, ut)) break;
  c.done = true; if (c.lead) { const p = player(G, c.id); setRoster(G, c.lead, [...idsOf(G, c.lead), c.id]); A.purse[c.lead] = r2(A.purse[c.lead] - c.price); setWage(G, c.lead, c.id, c.price); A.sold++; }
}

// ----- draft -----
export const catOf = (G, code, id) => { const R = rulesOf(code); const i = (recOf(G, code).dr.cat || {})[id]; return i == null ? null : (R.cats || [])[i]; };
function draftOk(G, code, tid, id) {
  const rec = recOf(G, code); const p = player(G, id); const e = canSign(G, tid, p, idsOf(G, tid)); if (e) return e;
  const c = catOf(G, code, id); if (c && c.per != null) { const have = idsOf(G, tid).filter((x) => catOf(G, code, x) === c).length; if (have >= c.per) return `Limit of ${c.per} ${c.name} players.`; }
  return rec.pool.includes(id) ? null : 'Not in the draft pool.';
}
export const draftTurn = (G, code) => { const d = recOf(G, code).dr; return d.order[d.i] || null; };
export function draftPick(G, code, tid, id) {
  const rec = recOf(G, code); const d = rec.dr; if (d.order[d.i] !== tid) return 'It is not your pick.'; const e = draftOk(G, code, tid, id); if (e) return e;
  setRoster(G, tid, [...idsOf(G, tid), id]); rec.pool = rec.pool.filter((x) => x !== id); setWage(G, tid, id, worth(G, player(G, id), code) * 0.8); d.i++; return null;
}
// AI picks until it is the user's turn (or the draft ends; all: even the user's turns)
export function draftAuto(G, code, rnd, ut, all) {
  const rec = recOf(G, code); const d = rec.dr; const f = fmtOf(code);
  while (d.i < d.order.length) {
    const tid = d.order[d.i]; if (tid === ut && !all) return;
    const best = rec.pool.filter((id) => !draftOk(G, code, tid, id)).sort((a, b) => value(player(G, b), f) * need(G, tid, b) * noise(tid, b) - value(player(G, a), f) * need(G, tid, a) * noise(tid, a))[0];
    if (best) { setRoster(G, tid, [...idsOf(G, tid), best]); rec.pool = rec.pool.filter((x) => x !== best); setWage(G, tid, best, worth(G, player(G, best), code) * 0.8); }
    d.i++;
  }
}

// ----- contract market -----
export function mkOffer(G, code, tid, id, wage) {
  const rec = recOf(G, code); const ask = rec && rec.mk && rec.mk.ask[id]; if (ask == null) return { ok: false, text: 'He is no longer available.' };
  const p = player(G, id); const e = canSign(G, tid, p, idsOf(G, tid)); if (e) return { ok: false, text: e };
  const R = rulesOf(code); if (R.purse && payroll(G, tid) + wage > R.purse) return { ok: false, text: 'That is over the wage cap.' };
  if (wage < ask * 0.85) return { ok: false, text: `${p.name} wants about ${ask}.` };
  if (wage < ask * 0.98) return { ok: false, counter: ask, text: `${p.name} will sign for ${ask}.` };
  setRoster(G, tid, [...idsOf(G, tid), id]); setWage(G, tid, id, wage); delete rec.mk.ask[id]; rec.pool = rec.pool.filter((x) => x !== id); return { ok: true, text: `${p.name} signs.` };
}
export function contractAI(G, code, rnd, ut) {
  const rec = recOf(G, code); const R = rulesOf(code); const f = fmtOf(code); const teams = teamsOf(code).filter((t) => t !== ut);
  for (let round = 0; round < R.max; round++) { let any = false;
    for (const tid of teams.slice().sort(() => rnd() - 0.5)) { if (idsOf(G, tid).length >= R.min) continue; const ids = idsOf(G, tid);
      const best = Object.keys(rec.mk.ask).map((id) => player(G, id)).filter((p) => !canSign(G, tid, p, ids) && (!R.purse || payroll(G, tid) + rec.mk.ask[p.id] <= R.purse)).sort((a, b) => value(b, f) * need(G, tid, b.id) * noise(tid, b.id) - value(a, f) * need(G, tid, a.id) * noise(tid, a.id))[0];
      if (best) { mkOffer(G, code, tid, best.id, rec.mk.ask[best.id]); any = true; } }
    if (!any) break; }
}
// A transfer: buy a player from another club for a fee (the seller wants about 1.3 times his worth).
export function transferBuy(G, tid, id, fee) {
  const code = leagueOf(tid); const from = teamsOf(code).find((t) => t !== tid && idsOf(G, t).includes(id)); if (!from) return 'He is not at another club.';
  const p = player(G, id); const e = canSign(G, tid, p, idsOf(G, tid)); if (e) return e; if (idsOf(G, from).length <= 12) return 'That club cannot spare him.';
  if (fee < worth(G, p, code) * 1.3) return `They want about ${r2(worth(G, p, code) * 1.3)}.`;
  setRoster(G, from, idsOf(G, from).filter((x) => x !== id)); setRoster(G, tid, [...idsOf(G, tid), id]); setWage(G, tid, id, wageOf(G, p, from)); return null;
}
