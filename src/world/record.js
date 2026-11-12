// ===== Permanent career records for real players =====
// s.wd.pcr[key][bucket] = [m, inn, no, runs, balls, hs, 50s, 100s, 4s, 6s, bowlBalls, conceded, wkts, bestW, bestR]
// key = the database id (an NPL player aliased to the database is keyed by his wid), so one person has
// one record across the NPL, national sides and franchise leagues. Generated players (gen: 1 or
// real === false) have no record. Everything is counted from 0 in this game: no real career figures are
// stored, because no verified figures exist in the data files.
import { registry } from './players.js';
export const BUCKETS = [['T20', 'T20'], ['ODI', 'ODI'], ['Test', 'Tests'], ['FC', 'First-class'], ['LA', 'List A']];
export const bucketOf = (fmt) => (fmt === 'T20' ? 'T20' : fmt === 'ODI' ? 'ODI' : fmt === 'Test' ? 'Test' : /^FC/.test(fmt || '') ? 'FC' : fmt === 'List A' ? 'LA' : fmt ? 'T20' : null);
const keyOf = (p) => (p && !p.gen && p.real !== false ? p.wid || p.id : null);
const blank = () => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const slot = (G, key, b) => { const cr = (G.s.wd.pcr ??= {}); const e = (cr[key] ??= {}); return (e[b] ??= blank()); };
const betterBest = (x, w, r) => w > x[13] || (w > 0 && w === x[13] && r < x[14]);

export function bumpBat(x, r, b, f4, s6, out) { x[1]++; if (!out) x[2]++; x[3] += r; x[4] += b; if (r > x[5]) x[5] = r; if (r >= 100) x[7]++; else if (r >= 50) x[6]++; x[8] += f4 || 0; x[9] += s6 || 0; }
export function bumpBowl(x, balls, r, w) { x[10] += balls; x[11] += r; x[12] += w; if (betterBest(x, w, r)) { x[13] = w; x[14] = r; } }

// World fixtures: the same card addStats reads. byId resolves a card id to a hydrated player.
export function addWorld(G, fmt, card, xiA, xiB) {
  const b = bucketOf(fmt); if (!b || !G.s.wd) return; const R = registry(G);
  const key = (id) => keyOf(R.by[id]);
  for (const p of [...xiA, ...xiB]) { const k = keyOf(p); if (k) slot(G, k, b)[0]++; }
  for (const inn of card.inns) {
    for (const [id, r, bl, f4, s6, how] of inn.bat) { const k = key(id); if (k) bumpBat(slot(G, k, b), r, bl, f4, s6, how !== 'out'); }
    for (const [id, balls, r, w] of inn.bowl) { const k = key(id); if (k) bumpBowl(slot(G, k, b), balls, r, w); }
  }
}
// NPL (engine) matches: T20.
export function addNPL(G, m) {
  if (!G.s.wd) return; const seen = new Set();
  const K = (id) => { const p = G.players[id] || G.P(id); return keyOf(p); };
  for (const side of [m.home, m.away]) for (const id of m.lineups[side].xi) { const k = K(id); if (k && !seen.has(k)) { seen.add(k); slot(G, k, 'T20')[0]++; } }
  for (const inn of m.inns) {
    for (const id in inn.bs) { const s = inn.bs[id]; if (!(s.batted || s.in || s.b > 0 || s.out)) continue; const k = K(id); if (k) bumpBat(slot(G, k, 'T20'), s.r, s.b, s.f, s.s, !!s.out); }
    for (const id in inn.bw) { const s = inn.bw[id]; const k = K(id); if (k) bumpBowl(slot(G, k, 'T20'), s.balls, s.r, s.w); }
  }
}
// The record of one player (any object with id/wid), or null.
export function recordOf(G, p) { const k = keyOf(p); return k && G.s.wd && G.s.wd.pcr ? G.s.wd.pcr[k] || null : null; }
export function rowOf(x) { const out = x[1] - x[2]; return { m: x[0], inn: x[1], no: x[2], runs: x[3], hs: x[5], avg: out > 0 ? (x[3] / out).toFixed(1) : '–', sr: x[4] ? (100 * x[3] / x[4]).toFixed(1) : '–', h: x[6], c: x[7], f4: x[8], s6: x[9], w: x[12], best: x[13] ? `${x[13]}/${x[14]}` : '–', bavg: x[12] ? (x[11] / x[12]).toFixed(1) : '–', econ: x[10] ? (6 * x[11] / x[10]).toFixed(2) : '–' }; }
