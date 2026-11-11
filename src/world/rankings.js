// ===== Rankings from in-game results (in-game, not ICC) =====
// Team ratings: ICC-style. Every ODI or T20I in the last three years earns points from the opponent's
// rating (win +50, loss −50; when the gap is 40 or more the stronger side gets +10 for a win and −90 for
// a loss, the weaker side the reverse), matches in the last two years count in full and the year
// before at half; the rating is points over matches. It is solved by a few passes from the game's
// strength estimates, which also act as a small prior (two pseudo-matches).
// Player ratings: from the season stats in s.wd.st (live seasons) plus a decaying aggregate of
// finished ones (s.wd.intl.rk.pa), with runs and wickets weighted by the strength of the sides.
// Tests (W2) use the same team method over the same window, a draw counting like a tie; Test players are
// rated from averages (batting) and average and strike rate (bowling). Test records since the save
// began are kept in rk.tr and never decay.
// State in s.wd.intl.rk = { log: [[day, f, a, b, r]], pa: { ODI: {pid: agg}, T20: {...}, Test: {...} }, tr, dy, snap, prev }
//   f: 1 ODI, 2 T20I, 3 Test; r: 1 a won, 2 b won, 0 tie, draw or no result.
//   tr: { pid: [m, inn, no, runs, hs, 100s, balls, rc, w, bestW, bestR] } (Test records).
//   agg: [m, inn, no, r, b, balls, rc, w, qr, qw] (qr, qw: runs and wickets times the quality factor).
import { st, info, strength, ODI, T20, setRanker, onTick, nm, ALL, wtcTick } from './intl.js';
import { registry } from './players.js';
import { yearOf, dateOf } from './dates.js';

export const LABEL = 'in-game, not ICC';
const TEST = 'Test';
const FCODE = { ODI: 1, T20: 2, Test: 3 };
const WINDOW = 1095, FULLW = 730;
const seedOf = (c, fmt) => Math.max(0, Math.round((strength(c, fmt) - 55) * 3.6));

// Log every new international result once (called from the tick).
export function logResults(G) {
  const I = st(G); if (!I) return; const L = I.rk.log; try { wtcTick(G); } catch (e) { console.error('wtc', e); } // the WTC table counts before the archive folds a series away
  for (const S of Object.values(G.s.wd.seasons)) { if (S.real) continue; const inf = info(S); if (!inf.official) { for (const f of S.fx) if (f.res && !f.k) f.k = 1; continue; }
    for (const f of S.fx) { if (!f.res || f.k) continue; f.k = 1; const r = f.res.nr || f.res.draw || (f.res.tie && !f.res.w) ? 0 : f.res.w === f.a ? 1 : 2; L.push([f.d, FCODE[f.fmt] || 2, f.a, f.b, r]); } }
  const cut = G.s.wd.day - WINDOW; if (L.length && L[0][0] < cut) { L.sort((a, b) => a[0] - b[0]); let i = 0; while (i < L.length && L[i][0] < cut) i++; L.splice(0, i); }
}

function points(ra, rb, res) { // res: 1 a won, -1 b won, 0 tie
  if (Math.abs(ra - rb) < 40) return [rb + 50 * res, ra - 50 * res];
  const aS = ra > rb;
  if (res === 0) return aS ? [ra - 40, rb + 40] : [ra + 40, rb - 40];
  if (aS) return res > 0 ? [ra + 10, rb - 10] : [ra - 90, rb + 90];
  return res > 0 ? [ra + 90, rb - 90] : [ra - 10, rb + 10];
}
// [{code, name, rating, matches, rank, prev}] for 'ODI' or 'T20', best first.
const MEMO = new WeakMap();
export function teamTable(G, fmt) {
  const I = st(G); if (!I) return []; const key = `${fmt}:${I.rk.log.length}:${G.s.wd.day}`; const m = MEMO.get(I); if (m && m[key]) return m[key];
  const day = G.s.wd.day; const f = FCODE[fmt] || 2; const L = I.rk.log.filter((x) => x[1] === f && x[0] >= day - WINDOW);
  const teams = new Set(); for (const x of L) { teams.add(x[2]); teams.add(x[3]); }
  if (fmt === T20) for (const c of ALL) teams.add(c);
  const r = {}; const n = {}; for (const c of teams) { r[c] = seedOf(c, fmt); n[c] = 0; }
  for (const x of L) { const w = x[0] >= day - FULLW ? 1 : 0.5; n[x[2]] += w; n[x[3]] += w; }
  for (let pass = 0; pass < 6; pass++) {
    const acc = {}; for (const c of teams) acc[c] = seedOf(c, fmt) * 2;
    for (const x of L) { const w = x[0] >= day - FULLW ? 1 : 0.5; const [pa, pb] = points(r[x[2]], r[x[3]], x[4] === 1 ? 1 : x[4] === 2 ? -1 : 0); acc[x[2]] += w * pa; acc[x[3]] += w * pb; }
    for (const c of teams) r[c] = acc[c] / (n[c] + 2);
  }
  const prev = I.rk.prev && I.rk.prev[fmt] ? I.rk.prev[fmt] : {};
  const out = [...teams].filter((c) => fmt === T20 || n[c] > 0).map((c) => ({ code: c, name: nm(c), rating: Math.max(0, Math.round(r[c])), matches: Math.round(n[c]) })).sort((a, b) => b.rating - a.rating || a.code.localeCompare(b.code));
  out.forEach((x, i) => { x.rank = i + 1; x.prev = prev[x.code] || null; });
  MEMO.set(I, { ...(m || {}), [key]: out }); return out;
}
export const teamRank = (G, fmt, code = 'NEP') => { const t = teamTable(G, fmt); const x = t.find((r) => r.code === code); return x ? { pos: x.rank, pts: x.rating, prev: x.prev } : null; };
setRanker((G, fmt) => teamTable(G, fmt));

// ----- players -----
const quality = (S) => { const s = S.teams.reduce((a, c) => a + strength(c, info(S).fmt), 0) / Math.max(1, S.teams.length); return Math.max(0.5, Math.min(1.1, 0.55 + (0.45 * (s - 50)) / 38)); };
const fromSt = (x, q) => [x[0], x[1], x[2], x[3], x[4], x[8], x[9], x[10], Math.round(x[3] * q), Math.round(x[10] * q * 10) / 10];
const addAgg = (A, id, v) => { const a = (A[id] ??= [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]); for (let i = 0; i < 10; i++) a[i] += v[i]; };
// Merge a finished season's stats into the decaying aggregate (called when it is archived).
export function mergeSeason(G, S) {
  const I = st(G); const inf = info(S); if (!inf.official || S.real) return; const T = G.s.wd.st[S.id]; if (!T) return; const q = quality(S); const A = I.rk.pa[inf.fmt];
  for (const id in T) addAgg(A, id, fromSt(T[id], q));
  if (inf.fmt === TEST) { const R = (I.rk.tr ??= {}); for (const id in T) addRec(R, id, T[id]); }
}
// Test records: st row [m, inn, no, r, b, hs, 50s, 100s, balls, rc, w, bestW, bestR, 4s, 6s]
function addRec(R, id, x) { const a = (R[id] ??= [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 999]); a[0] += x[0]; a[1] += x[1]; a[2] += x[2]; a[3] += x[3]; a[4] = Math.max(a[4], x[5]); a[5] += x[7]; a[6] += x[8]; a[7] += x[9]; a[8] += x[10];
  if (x[11] > a[9] || (x[11] === a[9] && x[12] < a[10])) { a[9] = x[11]; a[10] = x[12]; } }
// Test records since the save began, finished and live series together: { runs, wkts, hs, best } lists of
// { id, name, nat, m, r, hs, avg, w, bw, br, h }. Generated players are left out.
export function testRecords(G, n = 10) {
  const I = st(G); const R = {}; for (const id in (I.rk.tr || {})) R[id] = I.rk.tr[id].slice();
  for (const S of Object.values(G.s.wd.seasons)) { if (S.mg || S.real || info(S).fmt !== TEST) continue; const T = G.s.wd.st[S.id]; if (T) for (const id in T) addRec(R, id, T[id]); }
  const reg = registry(G); const L = [];
  for (const id in R) { const p = G.players[id] || reg.by[id]; if (!p || p.gen || (p.fm && p.fm.gen)) continue; const a = R[id]; const outs = a[1] - a[2];
    L.push({ id, name: p.name, nat: p.nat, m: a[0], r: a[3], hs: a[4], h: a[5], avg: outs > 0 ? a[3] / outs : null, w: a[8], bw: a[9], br: a[10] === 999 ? null : a[10], bavg: a[8] ? a[7] / a[8] : null }); }
  return { runs: L.filter((x) => x.r).sort((a, b) => b.r - a.r).slice(0, n), wkts: L.filter((x) => x.w).sort((a, b) => b.w - a.w || a.bavg - b.bavg).slice(0, n),
    hs: L.filter((x) => x.hs).sort((a, b) => b.hs - a.hs).slice(0, n), best: L.filter((x) => x.bw).sort((a, b) => b.bw - a.bw || a.br - b.br).slice(0, n) };
}
// Once a year the aggregate halves, so the lists follow recent form.
export function decay(G) {
  const I = st(G); const y = yearOf(G.s.wd.day); if ((I.rk.dy ?? y) >= y) { I.rk.dy ??= y; return; } I.rk.dy = y;
  for (const f of [ODI, T20, TEST]) { const A = (I.rk.pa[f] ??= {}); for (const id in A) { const a = A[id].map((v) => Math.round(v * 0.5)); if (a[0] < 1 && a[1] < 1) delete A[id]; else A[id] = a; } }
}
function aggregates(G, fmt) {
  const I = st(G); const A = {}; for (const id in (I.rk.pa[fmt] || {})) A[id] = I.rk.pa[fmt][id].slice();
  for (const S of Object.values(G.s.wd.seasons)) { if (S.mg || S.real) continue; const inf = info(S); if (!inf.official || inf.fmt !== fmt) continue; const T = G.s.wd.st[S.id]; if (!T) continue; const q = quality(S); for (const id in T) addAgg(A, id, fromSt(T[id], q)); }
  return A;
}
export function playerRatings(a, fmt) {
  const [, inn, no, r, b, balls, rc, w, qr, qw] = a; const odi = fmt === ODI; const outs = Math.max(0, inn - no);
  let bat = 0, bowl = 0;
  if (fmt === TEST) { // average first; strike rate matters little in Tests
    if (inn >= 4) { const avg = (qr + 30 * 3) / (outs + 3); bat = Math.round(Math.max(0, Math.min(950, (avg * 17) * (0.5 + 0.5 * Math.min(1, inn / 16))))); }
    if (balls >= 360) { const avgB = (rc + 34 * 3) / (qw + 3); const sr = balls / Math.max(1, qw + 1); bowl = Math.round(Math.max(0, Math.min(950, (420 + (36 - avgB) * 16 + (70 - sr) * 2.5) * (0.5 + 0.5 * Math.min(1, balls / 1500))))); }
    const ar = bat > 150 && bowl > 150 ? Math.round((bat * bowl) / 1000) : 0; return { bat, bowl, ar };
  }
  if (inn >= 3) { const avg = (qr + (odi ? 20 : 15) * 3) / (outs + 3); const sr = b ? (r / b) * 100 : 0; const base = odi ? avg * 13 + (sr - 85) * 3 : avg * 15 + (sr - 125) * 3.5; bat = Math.round(Math.max(0, Math.min(950, base * (0.5 + 0.5 * Math.min(1, inn / 12))))); }
  if (balls >= (odi ? 120 : 60)) { const avgB = (rc + (odi ? 35 : 28) * 3) / (qw + 3); const eco = rc / (balls / 6); const base = odi ? 300 + (40 - avgB) * 15 + (5.5 - eco) * 80 : 300 + (30 - avgB) * 14 + (8 - eco) * 70; bowl = Math.round(Math.max(0, Math.min(950, base * (0.5 + 0.5 * Math.min(1, balls / (odi ? 300 : 150)))))); }
  const ar = bat > 150 && bowl > 150 ? Math.round((bat * bowl) / 1000) : 0;
  return { bat, bowl, ar };
}
// { bat, bowl, ar }: [{id, name, nat, team, rating, rank, prev}] best first, top `n` plus every Nepali.
export function playerTable(G, fmt, n = 40) {
  const R = registry(G); const who = (id) => G.players[id] || R.by[id] || null; const A = aggregates(G, fmt); const out = { bat: [], bowl: [], ar: [] };
  const prev = (st(G).rk.prev && st(G).rk.prev.p && st(G).rk.prev.p[fmt]) || {};
  for (const id in A) { const p = who(id); if (!p || p.gen || (p.fm && p.fm.gen)) continue; const x = playerRatings(A[id], fmt);
    for (const k of ['bat', 'bowl', 'ar']) if (x[k] > 0) out[k].push({ id, name: p.name, nat: p.nat, team: p.team || null, rating: x[k] }); }
  for (const k of ['bat', 'bowl', 'ar']) { out[k].sort((a, b) => b.rating - a.rating); out[k].forEach((x, i) => { x.rank = i + 1; x.prev = (prev[k] || {})[x.id] || null; }); out[k] = out[k].filter((x) => x.rank <= n || x.nat === 'NEP'); }
  return out;
}
// A monthly snapshot of ranks, for the movement column.
export function snapshot(G) {
  const I = st(G); const t = dateOf(G.s.wd.day); const mk = t.y * 12 + t.m; if (I.rk.snapM === mk) return; I.rk.snapM = mk;
  const p = {}; for (const f of [ODI, T20, TEST]) { const L = playerTable(G, f, 30); p[f] = {}; for (const k of ['bat', 'bowl', 'ar']) p[f][k] = Object.fromEntries(L[k].map((x) => [x.id, x.rank])); }
  I.rk.prev = { ODI: Object.fromEntries(teamTable(G, ODI).map((x) => [x.code, x.rank])), T20: Object.fromEntries(teamTable(G, T20).map((x) => [x.code, x.rank])), Test: Object.fromEntries(teamTable(G, TEST).map((x) => [x.code, x.rank])), p };
}
onTick((G) => { logResults(G); decay(G); });
