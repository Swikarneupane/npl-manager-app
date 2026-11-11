// ===== The international programme (W1) =====
// Registers the international competitions with comps.js and plans every international season of a
// year: the ODI pathway (CWC League 2, Challenge League, Qualifier Play-off, World Cup Qualifier, ODI
// World Cups), the T20 pathway (regional finals, Global Qualifier, T20 World Cups), the Asia Cup and
// ACC Premier Cup, and a Future-Tours-style bilateral programme for every nation.
//
// Two ways seasons are made:
//  - The yearly planner (registerComps) returns every season whose teams are known when the year is
//    planned: bilateral series, tri-series, and events with fixed fields (real ones included).
//  - tick(G) creates the seasons whose teams come from earlier results (a Qualifier from the
//    Play-off, a World Cup from its Qualifier, the next League 2 from the last Qualifier) as soon as
//    those results are in, and before the event's start. Call it after moving the world clock.
// Multi-phase tournaments are one season each: their later phases are rr stages whose groups are
// worked out from the earlier tables when the phase opens (see dyn()). Earlier phase tables are kept
// in S.past[k]; S.dg[k] holds the groups of phase k; def.stages[k].name names it.
//
// State: s.wd.intl = { v, seed, made: {id: 1}, arc: [[id, name, y, a, b, champ, line]], rk: rankings,
//   nsq: {seasonId: squad}, nm: {seasonId: {pid: matches seen}}, ann: {seasonId: 1}, start0 }.
// arc: bilateral series folded away after four months: [seasonId, 'IND 2–1', last day].
import { registerComps, COMPS } from './comps.js';
import { newSeason, standings } from './comp.js';
import { dayOfDate, yearOf, dateOf, MONTHS } from './dates.js';
import { registry, poolOf } from './players.js';
import { onTick as onClockTick } from './state.js';
import { REAL, PROGRAMME, HOME, REGIONS, FULL, regionOf, NEPAL_VENUES, NPL_WINDOW, IPL_WINDOW, WTC, OTHER_TESTS, TROPHY, TEST_LEN, TEST_OTHERS } from '../data/world/calendar.js';
import { NATIONS_DB } from '../data/world/index.js';
import { NATION } from '../game/world-data.js';

const ODI = 'ODI', T20 = 'T20', TEST = 'Test';
const d = (y, m, day) => dayOfDate(y, m, day);
const dA = (a) => d(a[0], a[1], a[2]);
const NAME = Object.fromEntries(NATIONS_DB.map((n) => [n[0], n[1]]));
export const nm = (c) => NAME[c] || c;
export const ALL = NATIONS_DB.map((n) => n[0]);
export const ASSOC = ALL.filter((c) => !FULL.includes(c));
export const isFull = (c) => FULL.includes(c);
const ASIA_FM = ['IND', 'PAK', 'SL', 'BAN', 'AFG'];
const ASIA_ASSOC = REGIONS.Asia.filter((c) => !FULL.includes(c));
// The game's strength estimate for a nation in a format (world-data.js); unknown nations sit low.
// Tests use the ODI estimate (the closer of the two to the long game).
export const strength = (c, fmt) => { const n = NATION[c]; return n ? (fmt === T20 ? n.t20 : n.odi) : 50; };

let ENABLED = true;
export const setIntlEnabled = (on) => { ENABLED = !!on; };

// ----- seeded randomness for planning (the same save always plans the same year) -----
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const shuffled = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ----- state -----
export function st(G) {
  const wd = G.s.wd; if (!wd) return null;
  if (!wd.intl) wd.intl = { v: 1, seed: Math.floor(Math.random() * 1679616).toString(36), made: {}, arc: [], rk: { log: [], pa: { ODI: {}, T20: {} }, dy: yearOf(wd.day), snap: null, prev: null }, nsq: {}, nm: {}, ann: {}, start0: wd.day };
  const I = wd.intl; I.rk.pa.Test ??= {}; if (!I.wtc) seedWTC(I);
  return I;
}

// ----- the world states being simulated, for phases that open mid-advance -----
const LIVE = [];
export function seen(G) { const wd = G && G.s && G.s.wd; if (!wd) return; const i = LIVE.indexOf(wd); if (i >= 0) LIVE.splice(i, 1); LIVE.unshift(wd); if (LIVE.length > 8) LIVE.length = 8; }
function opening(comp, k) {
  for (const wd of LIVE) for (const id in wd.seasons) { const S = wd.seasons[id]; if (S.comp === comp && S.stage === k && !S.done && !S.fx.some((f) => f.stage === k)) return S; }
  return null;
}
// A phase whose groups come from the tables so far. fn(S) -> [[team...] per group]. The earlier tables
// move to S.past[k - 1], so each phase has tables of its own.
function dyn(comp, k, fn, extra) {
  return { type: 'rr', ...extra, get groups() {
    const S = opening(comp, k); if (!S) return null;
    S.dg ??= {};
    if (!S.dg[k]) { let g = []; try { g = fn(S).map((x) => x.filter(Boolean)).filter((x) => x.length >= 2); } catch (e) { console.error('phase', comp, k, e); }
      S.past ??= {}; S.past[k - 1] = S.tables; S.tables = {}; S.dg[k] = g.length ? g : [S.teams.slice(0, 2)];
      if (S.ends && S.ends[k + 1] != null) S.end = S.ends[k + 1]; }
    return S.dg[k];
  } };
}
const order = (tbl) => standings(tbl || {}).map((r) => r.id);
const winOf = (tbl) => order(tbl)[0];
const snake = (teams, n, fmt) => { const by = teams.slice().sort((a, b) => strength(b, fmt) - strength(a, fmt)); const g = Array.from({ length: n }, () => []); by.forEach((c, i) => { const r = Math.floor(i / n); g[r % 2 ? n - 1 - (i % n) : i % n].push(c); }); return g; };
const chunks = (a, n) => { const out = Array.from({ length: n }, () => []); a.forEach((c, i) => out[Math.min(n - 1, Math.floor(i / Math.ceil(a.length / n)))].push(c)); return out; };

// ----- competition definitions -----
const STATIC = {
  BILAT_T20I5: { id: 'BILAT_T20I5', name: 'T20I series', fmt: T20, kind: 'international', stages: [{ type: 'series', n: 5 }] },
  TRI_T20: { id: 'TRI_T20', name: 'T20I tri-series', fmt: T20, kind: 'international', stageShare: 0.8, stages: [{ type: 'rr', legs: 2, perDay: 1, name: 'Round robin' }, { type: 'ko', plan: 'final', gap: 2, name: 'Final' }] },
  TRI_ODI: { id: 'TRI_ODI', name: 'ODI tri-series', fmt: ODI, kind: 'international', stageShare: 0.8, stages: [{ type: 'rr', legs: 2, perDay: 1, name: 'Round robin' }, { type: 'ko', plan: 'final', gap: 2, name: 'Final' }] },
  CWCL2: { id: 'CWCL2', name: 'ICC CWC League 2', fmt: ODI, kind: 'international', stages: [{ type: 'events', size: 3, legs: 2, count: 24, name: 'Tri-series' }] },
  CWCPO: { id: 'CWCPO', name: 'CWC Qualifier Play-off', fmt: ODI, kind: 'international', stages: [{ type: 'rr', perDay: 2, name: 'Round robin' }] },
  T20RQ: { id: 'T20RQ', name: 'T20 World Cup regional final', fmt: T20, kind: 'international', stages: [{ type: 'rr', perDay: 3, name: 'Round robin' }] },
  T20RQ2: { id: 'T20RQ2', name: 'T20 World Cup regional final', fmt: T20, kind: 'international', stages: [{ type: 'rr', legs: 2, perDay: 1, name: 'Double round robin' }] },
  HIST: { id: 'HIST', name: 'Real results', fmt: ODI, kind: 'international', stages: [{ type: 'rr', name: 'Table' }] },
  // Test series of one to five Tests (WTC points in the series table), and the WTC final (a one-off; a draw makes joint winners)
  ...Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`TEST_${n}`, { id: `TEST_${n}`, name: n === 1 ? 'One-off Test' : `${n}-Test series`, fmt: TEST, kind: 'international', points: WTC.points, stages: [{ type: 'series', n, name: n === 1 ? 'Test' : 'Series' }] }])),
  WTCF: { id: 'WTCF', name: 'World Test Championship final', fmt: TEST, kind: 'international', points: WTC.points, stages: [{ type: 'rr', perDay: 1, name: 'Final', labels: ['Final'], ko: true }] },
};
// Per-edition definitions, built from the season's team order. Ids: PREFIX@year[@fmt]@seed.
const BUILD = {
  CL: (id, T) => ({ id, name: 'CWC Challenge League', fmt: ODI, listA: true, kind: 'international', stages: [{ type: 'rr', groups: [T.slice(0, 6), T.slice(6, 12)], legs: 3, perDay: 2, name: 'League', labels: ['League A', 'League B'] }] }),
  CWCQ: (id, T, o) => ({ id, name: 'CWC Qualifier', fmt: ODI, kind: 'international', stageShare: o.share ?? 0.45, stages: [
    { type: 'rr', groups: [T.slice(0, 5), T.slice(5, 10)], perDay: 2, name: 'Group stage' }, { type: 'super', take: 3, carry: true, gap: 2, name: 'Super Six' }, { type: 'ko', plan: 'final', gap: 2, name: 'Final' }] }),
  ASIA: (id, T, o) => { const h = T.length / 2; return { id, name: 'Asia Cup', fmt: o.fmt, kind: 'international', stageShare: o.share ?? 0.4, stages: [
    { type: 'rr', groups: [T.slice(0, h), T.slice(h)], perDay: 1, name: 'Group stage' }, { type: 'super', take: 2, carry: true, gap: 2, name: 'Super Four' }, { type: 'ko', plan: 'final', gap: 2, name: 'Final' }] }; },
  ACCPC: (id, T, o) => { const h = Math.ceil(T.length / 2); return { id, name: "ACC Men's Premier Cup", fmt: o.fmt, kind: 'international', stageShare: o.share ?? 0.7, stages: [
    { type: 'rr', groups: [T.slice(0, h), T.slice(h)], perDay: 4, name: 'Group stage' }, { type: 'ko', plan: 'semis', gap: 2, name: 'Semi-finals and final' }] }; },
  T20GQ: (id, T) => ({ id, name: 'T20 World Cup Global Qualifier', fmt: T20, kind: 'international', stages: [{ type: 'rr', groups: chunks(T, 4), perDay: 4, name: 'Groups' }] }),
  // ODI World Cup (2027 format): Super Series of three, two groups of six, Super 7, semi-finals, final.
  // Team order: [q2, q3, q4 (Super Series), A1..A6 (A6 the Qualifier winner), B1..B5].
  WC50: (id, T, o) => { const A = T.slice(3, 9), B = T.slice(9, 14); return { id, name: 'ODI World Cup', fmt: ODI, kind: 'international', stageShare: o.share ?? 0.24, stages: [
    { type: 'rr', groups: [T.slice(0, 3)], perDay: 1, name: 'Super Series', labels: ['Super Series'] },
    dyn(id, 1, (S) => [A, [...B, winOf(S.tables.A)]], { name: 'Group stage', labels: ['Group A', 'Group B'], perDay: 2, gap: 1 }),
    dyn(id, 2, (S) => { const a = order(S.tables.A), b = order(S.tables.B); const rows = Object.fromEntries([...standings(S.tables.A), ...standings(S.tables.B)].map((r) => [r.id, r]));
      const four = [a[3], b[3]].filter(Boolean).sort((x, y) => rows[y].pts - rows[x].pts || rows[y].w - rows[x].w || rows[y].nrr - rows[x].nrr)[0]; return [[...a.slice(0, 3), ...b.slice(0, 3), four]]; }, { name: 'Super 7', labels: ['Super 7'], perDay: 1, gap: 4 }),
    dyn(id, 3, (S) => { const t = order(S.tables.A); return [[t[0], t[3]], [t[1], t[2]]]; }, { name: 'Semi-finals', labels: ['Semi-final 1', 'Semi-final 2'], perDay: 1, gap: 3, ko: true }),
    dyn(id, 4, (S) => [[winOf(S.tables.A), winOf(S.tables.B)]], { name: 'Final', labels: ['Final'], perDay: 1, gap: 3, ko: true }),
  ] }; },
  // T20 World Cup (2028 format): five groups of four, Super 10 (two groups of five), eliminators
  // (2nd v the other group's 3rd), semi-finals (group winners v eliminator winners), final.
  T20WC: (id, T, o) => ({ id, name: 'T20 World Cup', fmt: T20, kind: 'international', stageShare: o.share ?? 0.45, stages: [
    { type: 'rr', groups: chunks(T, 5), perDay: 3, name: 'Group stage', labels: ['Group A', 'Group B', 'Group C', 'Group D', 'Group E'] },
    dyn(id, 1, (S) => { const g = 'ABCDE'.split('').map((k) => order(S.tables[k])); const p = (i, j) => (g[i] || [])[j];
      return [[p(0, 0), p(1, 1), p(2, 0), p(3, 1), p(4, 0)], [p(0, 1), p(1, 0), p(2, 1), p(3, 0), p(4, 1)]]; }, { name: 'Super 10', labels: ['Super 10 · Group 1', 'Super 10 · Group 2'], perDay: 2, gap: 2 }),
    dyn(id, 2, (S) => { const x = order(S.tables.A), y = order(S.tables.B); return [[x[1], y[2]], [y[1], x[2]]]; }, { name: 'Eliminators', labels: ['Eliminator 1', 'Eliminator 2'], perDay: 2, gap: 2, ko: true }),
    dyn(id, 3, (S) => { const P = S.past[1]; return [[winOf(P.A), winOf(S.tables.B)], [winOf(P.B), winOf(S.tables.A)]]; }, { name: 'Semi-finals', labels: ['Semi-final 1', 'Semi-final 2'], perDay: 1, gap: 3, ko: true }),
    dyn(id, 4, (S) => [[winOf(S.tables.A), winOf(S.tables.B)]], { name: 'Final', labels: ['Final'], perDay: 1, gap: 5, ko: true }),
  ] }),
};
const prefixOf = (comp) => String(comp).split('@')[0];
function buildDef(comp, teams, opts = {}) {
  const parts = String(comp).split('@'); const B = BUILD[parts[0]]; if (!B) return null;
  const fmt = parts.length > 3 ? parts[2] : undefined; const def = B(comp, teams, { ...opts, fmt: fmt || opts.fmt || ODI });
  registerComps({ [comp]: def }); return def;
}
// Definitions for every season in a save (per-edition ones are not static).
export function ensureDefs(G) { const wd = G.s.wd; if (!wd) return; for (const id in wd.seasons) { const S = wd.seasons[id]; if (!COMPS[S.comp]) buildDef(S.comp, S.teams); } }

// ----- what a season is, for the screens -----
const KIND = { CWCL2: 'l2', CL: 'cl', CWCPO: 'po', CWCQ: 'wcq', WC50: 'wc', T20WC: 't20wc', T20GQ: 'gq', T20RQ: 'rq', T20RQ2: 'rq', ASIA: 'asia', ACCPC: 'accpc', TRI_T20: 'tri', TRI_ODI: 'tri', BILAT_ODI: 'bilat', BILAT_T20I: 'bilat', BILAT_T20I5: 'bilat', HIST: 'hist', TEST_1: 'bilat', TEST_2: 'bilat', TEST_3: 'bilat', TEST_4: 'bilat', TEST_5: 'bilat', WTCF: 'wtcf' };
export function info(S) {
  const p = prefixOf(S.comp); const def = COMPS[S.comp] || {}; const kind = S.id === 'CL-2024' ? 'cl' : S.id === 'CWCL2-2023' ? 'l2' : KIND[p] || 'other';
  const fmt = def.fmt || ODI; const listA = !!def.listA || S.id === 'CL-2024';
  // test: a Test series or the WTC final; wtc: the WTC cycle (its first year) a series counts in
  return { kind, fmt, fmtL: listA ? 'List A' : fmt === ODI ? 'ODI' : fmt === TEST ? 'Test' : 'T20I', listA, official: !listA, icc: ['l2', 'cl', 'po', 'wcq', 'wc', 't20wc', 'gq', 'rq', 'wtcf'].includes(kind), cup: kind === 'wc' || kind === 't20wc',
    test: fmt === TEST, wtc: S.wtc ?? null, trophy: S.tr || null,
    real: !!S.real, realFixture: !!S.rf || /^(CWCPO-2026|ASIA-2027|NEPBAN-2027|WC50-2027|CWCQ-2027|T20WC-2028|WTCF-2027)$/.test(S.id), stages: (def.stages || []).map((x) => x.name || ''), labels: (def.stages || []).map((x) => x.labels || null) };
}
export const stageTables = (S, k) => (k === S.stage || k == null ? S.tables : (S.past && S.past[k]) || {});
// Final placings of a season: champion and runner-up, knockout losers, then table order from the last
// phase back to the first.
export function placing(S) {
  if (!S) return []; const out = []; const add = (c) => { if (c && !out.includes(c)) out.push(c); };
  add(S.champ); add(S.runner);
  const ks = S.fx.filter((f) => f.ko && f.res).sort((a, b) => b.d - a.d); for (const f of ks) add(f.res.l);
  const phases = []; for (let k = S.stage; k >= 0; k--) phases.push(stageTables(S, k));
  for (const T of phases) { const keys = Object.keys(T).sort((a, b) => (a === 'super' ? -1 : b === 'super' ? 1 : 0)); if (T.super) { order(T.super).forEach(add); }
    const rows = keys.filter((g) => g !== 'super').map((g) => standings(T[g])); const n = Math.max(0, ...rows.map((r) => r.length));
    for (let i = 0; i < n; i++) rows.map((r) => r[i]).filter(Boolean).sort((a, b) => b.pts - a.pts || b.nrr - a.nrr).forEach((r) => add(r.id)); }
  for (const t of S.teams) if (S.real || S.done) add(t);
  return out;
}

// ----- generated sides for nations the database cannot field yet -----
// Until a nation's module is filled, the game makes a generic XI for it so its fixtures can be played.
// Generated players have placeholder names ("Kenya player 4") and gen: 1; they live only at runtime.
export function injectSides(G) {
  const R = registry(G); if (R._intl) return; R._intl = true;
  for (const c of ALL) {
    // players good enough for the national side (by the game's strength estimate for the nation)
    // only a nation with fewer than 15 players in the database gets placeholders, at its own level:
    // real players are never displaced by generated ones
    const real = (R.nat[c] || []).map((id) => R.by[id]).filter((p) => p && !p.retired); const have = real.length; if (have >= 15) continue;
    const lv = real.map((p) => Math.max(p.bat, p.bowl)).sort((a, b) => b - a); const s = lv.length >= 5 ? lv[Math.floor(lv.length / 2)] : 75 + (strength(c, T20) - 74) * 0.75; const roles = ['WK', 'BAT', 'BAT', 'BAT', 'BAT', 'AR', 'AR', 'BOWL', 'BOWL', 'BOWL', 'BOWL', 'BAT', 'WK', 'BAT', 'AR', 'BOWL'];
    for (let i = 0; i < 16 - have; i++) { const role = roles[i]; const h = hashStr(`${c}${i}`); const lv = Math.round(s + (h % 9) - 4); const id = `gen-${c}-${i}`;
      const bowl = role === 'BAT' || role === 'WK' ? 10 + (h % 15) : lv - (role === 'AR' ? 3 : 1); const bat = role === 'BOWL' ? 20 + (h % 15) : lv - (role === 'AR' ? 3 : 0);
      R.by[id] = { id, name: `${nm(c)} player ${i + 1}`, nat: c, age: 27, role, bat, bowl, type: role === 'BOWL' || role === 'AR' ? ['RFM', 'RF', 'OB', 'LB', 'SLA', 'LFM'][h % 6] : '', hand: h % 4 ? 'R' : 'L', fm: { gen: 1 }, form: 0, fit: 100, morale: 70, inj: 0,
        temper: 60, vsSpin: 0, field: 60, pot: Math.max(bat, bowl), traits: {}, regs: [c], stats: {}, gen: 1, team: null };
      Object.defineProperty(R.by[id], 'fit', { get: () => 100, set() {}, enumerable: true }); // generated players do not tire
      (R.nat[c] ??= []).push(id); }
  }
}

// ----- the programme: what runs when -----
const inYear = (y, m) => [d(y, m[0][0], m[0][1]), d(y, m[1][0], m[1][1])];
const t20Start = (T) => d(T, PROGRAMME.t20Window(T)[0][0], PROGRAMME.t20Window(T)[0][1]);
const gqWindow = (T) => (T === 2028 ? [d(2028, 5, 1), d(2028, 5, 16)] : T === 2030 ? [d(2030, 1, 1), d(2030, 1, 16)] : [d(T - 1, 9, 10), d(T - 1, 9, 25)]);
const RQ_WIN = { Europe: [[6, 8], [6, 20]], Americas: [[7, 1], [7, 10]], Asia: [[7, 20], [8, 3]], Africa: [[8, 10], [8, 22]], EAP: [[8, 25], [9, 4]] };
const RQ_WIN_EARLY = { Asia: [[3, 10], [3, 24]], Africa: [[4, 5], [4, 17]], Europe: [[5, 10], [5, 22]], Americas: [[6, 1], [6, 10]], EAP: [[7, 1], [7, 12]] };
const rqWindow = (T, r) => { const y = T - 1; const w = (T >= 2032 ? RQ_WIN_EARLY : RQ_WIN)[r]; return inYear(y, w); };
const t20Hosts = (T) => (T === 2028 ? REAL.t20wc28.host : T === 2030 ? REAL.hosts.t20wc30.host : []);
const odiHosts = (W) => (W === 2027 ? ['SA', 'ZIM'] : W === 2031 ? REAL.hosts.wc31.host : []);
const t20Name = (T) => (T === 2028 ? REAL.t20wc28.name : T === 2030 ? REAL.hosts.t20wc30.name : `ICC Men's T20 World Cup ${T}`);
const odiName = (W) => (W === 2027 ? REAL.wc27.name : W === 2031 ? REAL.hosts.wc31.name : `ICC Men's Cricket World Cup ${W}`);
export const cupHosts = (S) => { const [p, y] = [prefixOf(S.comp), S.y]; if (p === 'WC50') return y === 2027 ? REAL.wc27.hosts : y === 2031 ? REAL.hosts.wc31.hosts : 'Hosts not announced'; if (p === 'T20WC') return y === 2028 ? REAL.t20wc28.hosts : y === 2030 ? REAL.hosts.t20wc30.hosts : 'Hosts not announced'; return ''; };

// Seasons a resolver reads, by id.
const S_ = (G, id) => G.s.wd.seasons[id] || null;
const assocBy = (fmt, exclude = []) => ASSOC.filter((c) => !exclude.includes(c)).sort((a, b) => strength(b, fmt) - strength(a, fmt));

// Ten automatic places for an ODI World Cup: the 2027 field is real; later, the hosts and the best-rated sides.
// Qualification lists are fixed the first time they are needed (the ranking cut-off), in s.wd.intl.q.
const frozen = (G, key, f) => { const I = st(G); I.q ??= {}; return (I.q[key] ??= f()); };
function odiAuto(G, W) { return W === 2027 ? [...REAL.wc27.groups.A, ...REAL.wc27.groups.B] : frozen(G, `odi${W}`, () => odiAuto0(G, W)); }
function odiAuto0(G, W) {
  const hosts = odiHosts(W).filter((c) => isFull(c)); const R = teamOrder(G, ODI);
  return [...hosts, ...R.filter((c) => !hosts.includes(c))].slice(0, 10);
}
function wcqTeams(G, W) {
  const auto = odiAuto(G, W); const fms = W === 2027 ? REAL.wcq27.full : FULL.filter((c) => !auto.includes(c));
  const l2S = S_(G, `CWCL2-${W - 4}`); const l2 = W === 2027 ? REAL.wcq27.fromL2 : l2S ? placing(l2S).slice(0, 4) : assocBy(ODI).slice(0, 4);
  const poS = S_(G, `CWCPO-${W - 1}`); const need = Math.max(0, 10 - fms.length - l2.length);
  const po = (poS && poS.done ? placing(poS) : assocBy(ODI, [...l2, ...fms])).filter((c) => !l2.includes(c) && !auto.includes(c)).slice(0, need);
  const all = [...fms, ...l2, ...po]; const g = snake(all, 2, ODI); return [...g[0], ...g[1]];
}
function wcTeams(G, W) {
  const auto = odiAuto(G, W); const Q = S_(G, `CWCQ-${W}`); let q = Q && Q.done ? placing(Q).filter((c) => !auto.includes(c)).slice(0, 4) : [];
  if (q.length < 4) q = [...q, ...teamOrder(G, ODI).filter((c) => !auto.includes(c) && !q.includes(c))].slice(0, 4);
  let A, B; if (W === 2027) { A = REAL.wc27.groups.A; B = REAL.wc27.groups.B; } else { const g = snake(auto, 2, ODI); A = g[0]; B = g[1]; }
  return [q[1], q[2], q[3], ...A, q[0], ...B];
}
function l2Teams(G, W) {
  const Q = S_(G, `CWCQ-${W}`); let t = Q ? Q.teams.filter((c) => !isFull(c)) : [];
  if (t.length < 8) t = [...t, ...REAL.l2.table.map((r) => r[0]), ...assocBy(ODI)].filter((c, i, a) => !isFull(c) && a.indexOf(c) === i).slice(0, 8);
  return t.slice(0, 8);
}
function clTeams(G, W) {
  const l2 = l2Teams(G, W); const po = S_(G, `CWCPO-${W - 1}`); const down = po ? placing(po).slice(4) : [];
  let mid, rel;
  if (W === 2027) { mid = ['A', 'B'].flatMap((k) => REAL.cl.groups[k].slice(2, 4).map((r) => r[0])); rel = REAL.cl.relegated; }
  else { const C = S_(G, `CL-${W - 4}`); const g = C ? Object.keys(C.tables).map((k) => order(C.tables[k])) : []; mid = g.flatMap((o) => o.slice(2, 4)); rel = g.flatMap((o) => o.slice(4)); }
  const taken = [...l2, ...down, ...mid]; const up = assocBy(ODI, [...taken, ...rel]).slice(0, 12 - taken.length + l2.length);
  const all = [...down, ...mid, ...up].filter((c, i, a) => a.indexOf(c) === i && !l2.includes(c)).slice(0, 12);
  const g = snake(all, 2, ODI); return [...g[0], ...g[1]];
}
function poTeams(G, y) {
  const l2 = S_(G, `CWCL2-${y - 3}`); const C = S_(G, `CL-${y - 3}`);
  const a = l2 ? placing(l2).slice(4, 8) : []; const b = C ? Object.keys(C.tables).flatMap((k) => order(C.tables[k]).slice(0, 2)) : [];
  return [...a, ...b, ...assocBy(ODI, [...a, ...b])].slice(0, 8);
}
// T20 World Cup: automatic places and the teams that go straight to the Global Qualifier.
function t20Auto(G, T) { return T === 2028 ? { auto: REAL.t20wc28.auto, direct: REAL.t20wc28.gqDirect } : frozen(G, `t20${T}`, () => t20Auto0(G, T)); }
function t20Auto0(G, T) {
  const hosts = t20Hosts(T); const prev = S_(G, `T20WC-${T - 2}`); const pl = prev ? placing(prev) : teamOrder(G, T20);
  const auto = [...hosts]; for (const c of pl) if (auto.length < hosts.length + 7 && !auto.includes(c)) auto.push(c);
  for (const c of teamOrder(G, T20)) if (auto.length < 12 && !auto.includes(c)) auto.push(c);
  const direct = (prev ? prev.teams : []).filter((c) => !auto.includes(c)).slice(0, 8);
  return { auto, direct };
}
const RQ_SPOTS = REAL.t20wc28.regional;
function rqTeams(G, T, r) { const { auto, direct } = t20Auto(G, T); return REGIONS[r].filter((c) => !auto.includes(c) && !direct.includes(c)).sort((a, b) => strength(b, T20) - strength(a, T20)); }
function gqTeams(G, T) {
  const { direct } = t20Auto(G, T); const out = direct.slice(); const spare = [];
  for (const r of Object.keys(RQ_SPOTS)) { const S = S_(G, `T20RQ-${r}-${T}`); const p = S && S.done ? placing(S) : rqTeams(G, T, r); out.push(...p.slice(0, RQ_SPOTS[r])); spare.push(...p.slice(RQ_SPOTS[r])); }
  for (const c of spare.sort((a, b) => strength(b, T20) - strength(a, T20))) if (out.length < 16 && !out.includes(c)) out.push(c);
  const g = snake(out.slice(0, 16), 4, T20); return g.flat();
}
// The Global Qualifier's eight: the best-placed team from each region, then the next three.
export function gqQualifiers(S) {
  if (!S) return []; const T = S.tables; const rows = [];
  for (const k of Object.keys(T)) standings(T[k]).forEach((r, i) => rows.push({ ...r, pos: i }));
  rows.sort((a, b) => a.pos - b.pos || b.pts - a.pts || b.nrr - a.nrr); const out = [];
  for (const r of Object.keys(RQ_SPOTS)) { const x = rows.find((z) => regionOf(z.id) === r && !out.includes(z.id)); if (x) out.push(x.id); }
  for (const x of rows) if (out.length < 8 && !out.includes(x.id)) out.push(x.id);
  return out;
}
function t20wcTeams(G, T) {
  const { auto } = t20Auto(G, T); const GQ = S_(G, `T20GQ-${T}`); let q = GQ && GQ.done ? gqQualifiers(GQ) : [];
  if (q.length < 8) q = [...q, ...teamOrder(G, T20).filter((c) => !auto.includes(c) && !q.includes(c))].slice(0, 8);
  return snake([...auto, ...q].slice(0, 20), 5, T20).flat();
}
function asiaTeams(G, y, fmt) {
  const P = S_(G, `ACCPC-${y - 1}`); const n = fmt === ODI ? 1 : 3; const q = (P && P.done ? placing(P) : assocBy(fmt).filter((c) => ASIA_ASSOC.includes(c))).slice(0, n);
  const g = snake([...ASIA_FM, ...q], 2, fmt); return [...g[0], ...g[1]];
}
// Teams by the in-game ranking (rankings.js registers itself here to avoid a cycle).
let RANK = null; export const setRanker = (f) => { RANK = f; };
export const teamOrder = (G, fmt) => { const r = RANK ? RANK(G, fmt) : null; const by = r && r.length ? r.map((x) => x.code) : []; const rest = ALL.filter((c) => !by.includes(c)).sort((a, b) => strength(b, fmt) - strength(a, fmt)); return [...by, ...rest]; };

// Every season the international programme holds in year y. Items with `teams` are known when the year
// is planned; items with `resolve` wait for their `deps`.
export function programme(G, y) {
  const out = [];
  // ----- the ODI pathway -----
  if (y === 2026) out.push({ id: 'CWCPO-2026', comp: 'CWCPO', name: `${REAL.po26.name} · ${REAL.po26.venue}`, start: dA(REAL.po26.start), end: dA(REAL.po26.end), teams: REAL.po26.teams });
  const W = PROGRAMME.odiWC(y);
  if (W) {
    out.push({ id: `CWCQ-${W}`, pre: 'CWCQ', name: W === 2027 ? REAL.wcq27.name : `ICC Men's CWC Qualifier ${W}`, start: W === 2027 ? dA(REAL.wcq27.start) : d(W, 1, 22), ends: W === 2027 ? [d(2027, 2, 9), dA(REAL.wcq27.end)] : [d(W, 2, 9), d(W, 2, 23)], deps: [`CWCPO-${W - 1}`, `CWCL2-${W - 4}`], resolve: (g) => wcqTeams(g, W) });
    const s = d(W, 9, 2); out.push({ id: `WC50-${W}`, pre: 'WC50', name: odiName(W), start: s, ends: [s + 5, s + 21, s + 43, s + 47, s + 50], deps: [`CWCQ-${W}`], resolve: (g) => wcTeams(g, W) });
    out.push({ id: `CWCL2-${W}`, comp: 'CWCL2', name: `ICC CWC League 2 ${W}–${String(W + 3).slice(2)}`, start: d(W, 6, 1), ends: [d(W + 3, 9, 31)], deps: [`CWCQ-${W}`], resolve: (g) => l2Teams(g, W) });
    out.push({ id: `CL-${W}`, pre: 'CL', name: `CWC Challenge League ${W}–${String(W + 3).slice(2)}`, start: d(W, 7, 1), ends: [d(W + 3, 8, 30)], deps: [`CWCPO-${W - 1}`, `CWCQ-${W}`], resolve: (g) => clTeams(g, W) });
  }
  if (y > 2026 && PROGRAMME.odiWC(y + 1)) out.push({ id: `CWCPO-${y}`, comp: 'CWCPO', name: `ICC Men's CWC Qualifier Play-off ${y}`, start: d(y, 11, 1), ends: [d(y, 11, 20)], deps: [`CWCL2-${y - 3}`, `CL-${y - 3}`], resolve: (g) => poTeams(g, y) });
  // ----- the T20 pathway -----
  for (const T of [y, y + 1, y + 2]) {
    if (!PROGRAMME.t20WC(T)) continue;
    for (const r of Object.keys(RQ_SPOTS)) { const [s, e] = rqWindow(T, r); if (yearOf(s) !== y) continue;
      out.push({ id: `T20RQ-${r}-${T}`, comp: null, name: `T20 World Cup ${T} ${r === 'EAP' ? 'East Asia-Pacific' : r} Regional Final`, start: s, ends: [e], deps: T === 2028 ? [] : [`T20WC-${T - 2}`], resolve: (g) => rqTeams(g, T, r), rq: true }); }
    const [gs, ge] = gqWindow(T); if (yearOf(gs) === y) out.push({ id: `T20GQ-${T}`, pre: 'T20GQ', name: `T20 World Cup ${T} Global Qualifier`, start: gs, ends: [ge], deps: Object.keys(RQ_SPOTS).map((r) => `T20RQ-${r}-${T}`), resolve: (g) => gqTeams(g, T) });
    if (T === y) { const s = t20Start(T); out.push({ id: `T20WC-${T}`, pre: 'T20WC', name: t20Name(T), start: s, ends: [s + 9, s + 20, s + 23, s + 26, s + 31], deps: [`T20GQ-${T}`], resolve: (g) => t20wcTeams(g, T) }); }
  }
  // ----- Asia -----
  if (y === 2027) out.push({ id: 'ASIA-2027', pre: 'ASIA', fmt: ODI, name: `${REAL.asia27.name} · ${REAL.asia27.hosts}`, start: dA(REAL.asia27.start), ends: [d(2027, 5, 24), dA(REAL.asia27.end)], teams: (() => { const g = snake(REAL.asia27.teams, 2, ODI); return [...g[0], ...g[1]]; })() });
  else if (PROGRAMME.asiaCup(y)) { const fmt = PROGRAMME.asiaFmt(y) === ODI ? ODI : T20; const host = PROGRAMME.asiaHosts[((y - 2029) / 2) % PROGRAMME.asiaHosts.length];
    out.push({ id: `ASIA-${y}`, pre: 'ASIA', fmt, name: `Asia Cup ${y}`, host, start: d(y, 8, 1), ends: [d(y, 8, 9), d(y, 8, 17)], deps: [`ACCPC-${y - 1}`], resolve: (g) => asiaTeams(g, y, fmt) }); }
  if (y >= 2028 && y % 2 === 0) { const fmt = PROGRAMME.asiaFmt(y + 1) === ODI ? ODI : T20; const g = snake(ASIA_ASSOC, 2, fmt);
    out.push({ id: `ACCPC-${y}`, pre: 'ACCPC', fmt, name: `ACC Men's Premier Cup ${y}`, start: d(y, 3, 5), ends: [d(y, 3, 13), d(y, 3, 20)], teams: [...g[0], ...g[1]] }); }
  // ----- Tests and the WTC final -----
  out.push(...testPlan(G, y));
  if (y >= 2027 && y % 2 === 1) { const C = y - 2; const F = wtcFinal(null, C);
    out.push({ id: F.id, comp: 'WTCF', name: `${C === 2025 ? 'ICC World Test Championship final 2027' : `ICC World Test Championship final ${y}`} · ${F.venue}`, start: F.start, ends: [F.end], deps: [`WTC-${C}`], resolve: (g) => wtcTop2(g, C), wtcf: C }); }
  // ----- bilateral cricket -----
  out.push(...bilaterals(G, y));
  return out;
}

// ----- the bilateral programme (a generated Future Tours Programme) -----
const PLAN_CACHE = new Map();
function bilaterals(G, y) {
  const I = st(G); const key = `${I.seed}:${y}`; if (PLAN_CACHE.has(key)) return PLAN_CACHE.get(key);
  const r = rng(hashStr(key)); const out = []; const busy = {};
  const block = (t, s, e) => (busy[t] ??= []).push([s, e]);
  const free = (t, s, e) => (busy[t] || []).every(([a, b]) => e + 3 < a || s > b + 3);
  // fixed windows: ICC events, the Asia Cup, the IPL for full members, the NPL for Nepal
  const T = PROGRAMME.t20WC(y); if (T) { const s = t20Start(T); for (const c of FULL) block(c, s - 6, s + 32); }
  const W = PROGRAMME.odiWC(y); if (W) { for (const c of FULL) block(c, d(y, 9, 1) - 6, d(y, 10, 22)); block('NEP', d(y, 1, 18), d(y, 2, 25)); for (const c of ['WI', 'IRE']) block(c, d(y, 1, 18), d(y, 2, 25)); }
  if (PROGRAMME.asiaCup(y)) { const [s, e] = y === 2027 ? [dA(REAL.asia27.start), dA(REAL.asia27.end)] : [d(y, 8, 1), d(y, 8, 18)]; for (const c of ASIA_FM) block(c, s - 4, e); if (y === 2027) block('NEP', s - 4, e); }
  if (y % 2 === 0 && y >= 2028) for (const c of ASIA_ASSOC) block(c, d(y, 3, 1), d(y, 3, 22));
  for (const c of FULL) block(c, ...inYear(y, IPL_WINDOW));
  block('NEP', ...inYear(y, NPL_WINDOW)); if (y === 2026) block('NEP', d(2026, 10, 25), d(2026, 11, 24));
  if (y === 2027) block('NEP', d(2027, 2, 24), d(2027, 2, 31));
  const games = {}; const nOf = (comp) => (comp === 'BILAT_T20I5' ? 5 : comp.startsWith('TRI') ? 5 : 3);
  // Test series come first: their days are kept clear, and each Test counts against the year's cap
  for (const x of [...testPlan(G, y - 1).filter((t) => t.end >= d(y, 0, 1)), ...testPlan(G, y)]) for (const t of x.teams) { block(t, x.start - 3, x.end + 3); if (yearOf(x.start) === y) games[t] = (games[t] || 0) + x.days.length * 0.3; }
  const add = (comp, teams, s, len, name) => { for (const t of teams) { block(t, s, s + len); games[t] = (games[t] || 0) + nOf(comp); } out.push({ id: null, comp, teams, start: s, end: s + len, name }); };
  // full members' bilateral games a year, kept lower in years with a World Cup and an Asia Cup
  // (in an ODI World Cup year the full members likely to need the Qualifier play least)
  const wcq = PROGRAMME.odiWC(y) ? (y === 2027 ? REAL.wcq27.full : FULL.filter((c) => !odiAuto(G, y).includes(c))) : [];
  const capOf = (t) => (!isFull(t) ? 99 : wcq.includes(t) ? 18 : (PROGRAMME.odiWC(y) || PROGRAMME.t20WC(y)) && ASIA_FM.includes(t) && PROGRAMME.asiaCup(y) ? 19 : (PROGRAMME.odiWC(y) || PROGRAMME.t20WC(y)) ? 23 : 27);
  // a start day for a series of `len` days at `host`, clear for every team, inside the host's home season
  const place = (host, teams, len) => {
    const wins = HOME[host] || [[[0, 15], [11, 15]]]; const cand = [];
    for (const w of wins) { const [s, e] = inYear(y, w); for (let x = s; x + len <= e; x += 3) cand.push(x); }
    if (!cand.length) return null; const off = Math.floor(r() * cand.length);
    for (let i = 0; i < cand.length; i++) { const x = cand[(off + i) % cand.length]; if (teams.every((t) => free(t, x, x + len))) return x; }
    return null;
  };
  const series = (host, vis, fmt, n = 3) => { if ((games[host] || 0) + n > capOf(host) || (games[vis] || 0) + n > capOf(vis)) return false; const len = fmt === ODI ? n * 3 : n * 2 + 1; const s = place(host, [host, vis], len); if (s == null) return false;
    const comp = fmt === ODI ? 'BILAT_ODI' : n === 5 ? 'BILAT_T20I5' : 'BILAT_T20I';
    const venue = host === 'NEP' ? ` · ${NEPAL_VENUES[(y + vis.length) % 2]}` : '';
    add(comp, [host, vis], s, len, `${nm(host)} v ${nm(vis)} · ${n} ${fmt === ODI ? 'ODIs' : 'T20Is'}${venue}`); return true; };
  // Full members: six rounds of the circle method a year, so every pair meets about every two years.
  const rounds = []; { const t = FULL.slice(); const n = t.length; for (let k = 0; k < n - 1; k++) { const pairs = []; for (let i = 0; i < n / 2; i++) pairs.push([t[i], t[n - 1 - i]]); rounds.push(pairs); t.splice(1, 0, t.pop()); } }
  const odiYear = PROGRAMME.odiWC(y) || PROGRAMME.odiWC(y + 1);
  for (let k = 0; k < 6; k++) for (const [a, b] of rounds[(y * 6 + k) % rounds.length]) {
    const h = hashStr(`${a}${b}${y}`); const host = (h >> 3) % 2 ? a : b; const vis = host === a ? b : a;
    const fmt = (h % 10) < (odiYear ? 6 : 4) ? ODI : T20; const n = fmt === T20 && h % 7 === 0 ? 5 : 3;
    if (!series(host, vis, fmt, n)) series(vis, host, fmt, n);
  }
  // Full members and associates: four series a year against the stronger associates.
  const top = assocBy(T20, ['NEP']).slice(0, 10); const fmHosts = ['IRE', 'ZIM', 'AFG', 'WI', 'SL', 'BAN', 'NZ', 'SA'];
  for (let k = 0; k < 4; k++) { const fm = fmHosts[(y * 4 + k) % fmHosts.length]; const as = top[(y * 3 + k * 2) % top.length]; if (k % 2) series(fm, as, T20); else series(as, fm, T20) || series(fm, as, T20); }
  // Associates: three T20I series each, mostly within the region; ODI series between ODI-status teams.
  const pool = ASSOC.filter((c) => c !== 'NEP');
  for (let k = 0; k < 3; k++) {
    const by = shuffled(pool, r).sort((a, b) => regionOf(a).localeCompare(regionOf(b))); const left = [];
    for (let i = 0; i + 1 < by.length; i += 2) { const [a, b] = r() < 0.5 ? [by[i], by[i + 1]] : [by[i + 1], by[i]]; if (!series(a, b, T20) && !series(b, a, T20)) left.push(a, b); }
    if (by.length % 2) left.push(by[by.length - 1]);
    if (left.length >= 3 && k === 0) { const [a, b, c] = left; const s = place(a, [a, b, c], 10); if (s != null) add('TRI_T20', [a, b, c], s, 10, `${nm(a)} T20I tri-series · ${nm(a)}, ${nm(b)} and ${nm(c)}`); }
  }
  const odiTeams = odiStatus(G).filter((c) => c !== 'NEP'); const os = shuffled(odiTeams, r);
  for (let i = 0; i + 1 < os.length; i += 2) series(os[i], os[i + 1], ODI);
  // Nepal: home series at Kirtipur and Mulpani, a tri-series and a tour (the real March 2027 series is separate).
  if (y >= 2027) {
    const opp = ['IRE', 'ZIM', 'SCO', 'NED', 'AFG', 'UAE', 'WI', 'OMA', 'USA', 'HK']; const o1 = opp[y % opp.length], o2 = opp[(y + 3) % opp.length];
    if (y !== 2027) series('NEP', o1, T20, isFull(o1) ? 3 : 5);
    const triHost = y % 2 ? 'NEP' : ['SCO', 'NED', 'IRE'][y % 3]; const others = [o2, ...['UAE', 'OMA', 'HK', 'USA', 'CAN', 'NAM'].filter((c) => c !== o2 && c !== triHost)].slice(0, triHost === 'NEP' ? 2 : 1);
    const tri = triHost === 'NEP' ? ['NEP', ...others] : [triHost, 'NEP', ...others]; const s = place(triHost, tri, 10);
    if (s != null) add('TRI_T20', tri, s, 10, `${nm(triHost)} T20I tri-series · ${tri.map(nm).join(', ')}${triHost === 'NEP' ? ` · ${NEPAL_VENUES[y % 2]}` : ''}`);
    const away = ['UAE', 'OMA', 'USA', 'CAN', 'HK', 'NAM'][y % 6]; series(away, 'NEP', T20) || series('NEP', away, T20);
    if (odiStatus(G).includes('NEP')) { const o = odiTeams[(y * 5) % Math.max(1, odiTeams.length)]; if (o) series('NEP', o, ODI) || series(o, 'NEP', ODI); }
  }
  // every nation plays at least two series
  for (const c of ALL) { if (c === 'NEP') continue; let n = out.filter((x) => x.teams.includes(c)).length; let k = 0; while (n < 2 && k++ < 6) { const o = shuffled(pool.filter((x) => x !== c && regionOf(x) === regionOf(c)).concat(pool.filter((x) => x !== c)), r)[0]; if (series(c, o, T20) || series(o, c, T20)) n++; } }
  // full members keep a white-ball year around their Tests: short series until about fifteen games
  const wbOf = (t) => out.filter((x) => x.teams.includes(t)).reduce((a, x) => a + nOf(x.comp), 0);
  for (const c of FULL) { const opp = shuffled([...FULL, ...top].filter((x) => x !== c), r); for (let k = 0; k < opp.length && wbOf(c) < 15; k++) { const o = opp[k]; const fmt = k % 2 ? ODI : T20; series(c, o, fmt) || series(o, c, fmt); } }
  // ids: year, host, visitor, format, with a counter for repeats
  const seenIds = {}; for (const x of out) { const base = `BIL-${y}-${x.teams.join('-')}-${x.comp === 'BILAT_ODI' || x.comp === 'TRI_ODI' ? 'ODI' : 'T20'}`; seenIds[base] = (seenIds[base] || 0) + 1; x.id = seenIds[base] > 1 ? `${base}-${seenIds[base]}` : base; }
  if (y === 2027) { const R0 = REAL.nepban27; out.push({ id: 'NEPBAN-2027', comp: 'BILAT_T20I', teams: [R0.host, R0.visitor], start: dA(R0.days[0]), end: dA(R0.days[2]) + 1, name: `${nm('NEP')} v ${nm('BAN')} · 3 T20Is · ${R0.venue}` }); }
  PLAN_CACHE.set(key, out); if (PLAN_CACHE.size > 40) PLAN_CACHE.delete(PLAN_CACHE.keys().next().value);
  return out;
}
// ----- Test cricket and the World Test Championship (W2) -----
// Test series are planned a WTC cycle at a time (two years, June to March, then the final in June):
//  - 2025–27 is real (calendar.js): the results before the save started seed the table; the series still
//    to come are played in-game on their real dates (the game picks dates where none are published).
//  - From 2027–29 the nine WTC sides each play six series, three at home and three away, against six of
//    the other eight: the pairs left out form one nine-team ring (never the Ashes, the Border–Gavaskar or
//    India v England), and hosts swap from the last meeting where they can. The 2027 Ashes is real.
// Afghanistan, Ireland and Zimbabwe play a few Tests a year outside the WTC (in-game), as do the real
// one-offs in OTHER_TESTS. Test series are bilateral seasons (kind 'bilat', info(S).test) with ids
// BIL-<year>-<host>-<visitor>-Test; S.wtc is the cycle's first year for WTC series.
// State: s.wd.intl.wtc = { [cycle]: { t: { code: [m, w, l, d, tie, deducted, points, series] }, fin } }.
const WTC_T = WTC.teams;
const pairKey = (a, b) => [a, b].sort().join('-');
const TEST_GAP = 9; // days between the first days of Tests in a generated series
// windows no Test series may use: ICC events, the Asia Cup and the IPL for the sides that play in them
function testBlocked(t, s, e) {
  for (let y = yearOf(s); y <= yearOf(e); y++) {
    const hit = (a, b) => !(e < a || s > b);
    if (FULL.includes(t) && hit(...inYear(y, IPL_WINDOW))) return true;
    const T = PROGRAMME.t20WC(y); if (T && FULL.includes(t)) { const a = t20Start(T); if (hit(a - 6, a + 32)) return true; }
    if (PROGRAMME.odiWC(y) && FULL.includes(t) && hit(d(y, 9, 1) - 6, d(y, 10, 22))) return true;
    if (PROGRAMME.asiaCup(y) && ASIA_FM.includes(t)) { const [a, b] = y === 2027 ? [dA(REAL.asia27.start), dA(REAL.asia27.end)] : [d(y, 8, 1), d(y, 8, 18)]; if (hit(a - 4, b)) return true; }
  }
  return false;
}
function mkTest(h, v, days, wtc, o = {}) {
  const n = days.length; const tr = wtc != null ? TROPHY[pairKey(h, v)] || null : null; const head = o.name || tr;
  return { id: `BIL-${yearOf(days[0])}-${h}-${v}-Test`, comp: `TEST_${n}`, teams: [h, v], start: days[0], end: days[n - 1] + 4, ends: [days[n - 1] + 4], days,
    name: `${head ? `${head} · ` : ''}${nm(h)} v ${nm(v)} · ${n === 1 ? 'one-off Test' : `${n} Tests`}`, test: 1, wtc, tr, ven: o.ven || null, rf: o.rf || 0 };
}
// A series from calendar.js: real dates (rf 1) or a window the game fills (rf 2).
function realSeries(s, wtc) {
  if (s.tests) return mkTest(s.h, s.v, s.tests.map((t) => dA(t[0])), wtc, { ven: s.tests.map((t) => t[1]), rf: 1, name: s.name });
  const a = dA(s.win[0]), b = dA(s.win[1]); const gap = s.n > 1 ? Math.floor((b - a) / (s.n - 1)) : 0;
  return mkTest(s.h, s.v, Array.from({ length: s.n }, (_, i) => a + i * gap), wtc, { ven: s.venues || null, rf: 2, name: s.name });
}
// Hosts that give every side three home series: the directions of an Euler circuit (every degree is six).
function euler(T, pairs, r) {
  const adj = Object.fromEntries(T.map((c) => [c, []])); pairs.forEach((p, i) => { adj[p[0]].push(i); adj[p[1]].push(i); });
  for (const c of T) adj[c] = shuffled(adj[c], r);
  const used = []; const out = []; const stack = [T[Math.floor(r() * T.length)]];
  while (stack.length) { const u = stack[stack.length - 1]; const A = adj[u]; while (A.length && used[A[A.length - 1]]) A.pop();
    if (!A.length) { stack.pop(); continue; } const e = A.pop(); used[e] = true; const v = pairs[e][0] === u ? pairs[e][1] : pairs[e][0]; out.push([u, v]); stack.push(v); }
  return out;
}
const CYCLES = new Map();
// Every series of the cycle starting in year C (2025, 2027, ...), with dates.
export function cyclePlan(G, C) {
  const key = `${st(G).seed}:${C}`; if (CYCLES.has(key)) return CYCLES.get(key);
  const out = C === 2025 ? WTC.c25.series.map((s) => realSeries(s, 2025)) : genCycle(G, C);
  CYCLES.set(key, out); if (CYCLES.size > 30) CYCLES.delete(CYCLES.keys().next().value); return out;
}
function genCycle(G, C) {
  const r = rng(hashStr(`${st(G).seed}:wtc${C}`)); const T = WTC_T;
  const fixed = C === 2027 ? WTC.c27.series.map((s) => realSeries(s, C)) : [];
  const forced = Object.fromEntries(fixed.map((x) => [pairKey(...x.teams), x.teams[0]]));
  const must = new Set(['AUS-ENG', 'AUS-IND', 'ENG-IND']); let ex = new Set();
  for (let k = 0; k < 500; k++) { const p = shuffled(T, r); const e = p.map((c, i) => pairKey(c, p[(i + 1) % p.length])); if (!e.some((x) => must.has(x))) { ex = new Set(e); break; } }
  const pairs = []; for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) if (!ex.has(pairKey(T[i], T[j]))) pairs.push([T[i], T[j]]);
  const prev = {}; for (const x of cyclePlan(G, C - 2)) prev[pairKey(...x.teams)] = x.teams[0];
  let best = null, bs = -Infinity;
  for (let k = 0; k < 80; k++) { const o = euler(T, pairs, r); let sc = 0;
    for (const [h, v] of o) { const kk = pairKey(h, v); if (forced[kk]) sc += forced[kk] === h ? 100 : -100; else if (prev[kk] && prev[kk] !== h) sc += (TEST_LEN[kk] || 2) >= 5 ? 10 : 1; }
    if (sc > bs) { bs = sc; best = o; } }
  // dates: inside the host's home season, clear of ICC events, the IPL and each side's other Tests, spread over the two years
  const lo = d(C, 5, 20), hi = d(C + 2, 2, 31); const busy = {}; const load = {}; const out = [...fixed];
  const occ = (t, s, e, n = 1, count = true) => { (busy[t] ??= []).push([s, e]); if (!count) return; const y = yearOf(s); (load[t] ??= {})[y] = (load[t][y] || 0) + n; };
  const free = (t, s, e) => (busy[t] || []).every(([a, b]) => e + 6 < a || s > b + 6) && !testBlocked(t, s, e);
  // Tests per side per calendar year are balanced, counting the last cycle's Tests early in year C
  for (const x of fixed) for (const t of x.teams) occ(t, x.start, x.end, x.days.length);
  for (const s of OTHER_TESTS) { const x = realSeries(s, null); if (x.end >= lo - 200 && x.start <= hi) for (const t of x.teams) occ(t, x.start, x.end, x.days.length, x.end >= lo); }
  for (const x of cyclePlan(G, C - 2)) if (yearOf(x.start) === C) for (const t of x.teams) occ(t, x.start, x.end, x.days.length, true);
  const list = best.filter(([h, v]) => !forced[pairKey(h, v)]).map(([h, v]) => ({ h, v, n: TEST_LEN[pairKey(h, v)] || 2 })).sort((a, b) => b.n - a.n || hashStr(a.h + a.v) - hashStr(b.h + b.v));
  const ANY = [[[0, 10], [11, 20]]];
  for (const x of list) {
    const len = (x.n - 1) * TEST_GAP + 5; let pick = null, ps = Infinity, host = x.h;
    // the host's home season first; then the other side's (the hosts swap); then any time of year
    for (const [h, wins] of [[x.h, HOME[x.h] || ANY], [x.v, HOME[x.v] || ANY], [x.h, ANY]]) { const v = h === x.h ? x.v : x.h;
      for (let y = C; y <= C + 2; y++) for (const w of wins) { const [s, e] = inYear(y, w);
        for (let q = Math.max(s, lo); q + len <= Math.min(e, hi); q += 4) { if (!free(h, q, q + len) || !free(v, q, q + len)) continue; const yy = yearOf(q);
          const lh = ((load[h] || {})[yy] || 0) + x.n, lv = ((load[v] || {})[yy] || 0) + x.n; const sc = lh * lh + lv * lv + r() * 4; if (sc < ps) { ps = sc; pick = q; host = h; } } }
      if (pick != null) break; }
    if (pick == null) continue; // no room left anywhere in the cycle: the series is not played
    const vis = host === x.h ? x.v : x.h; const it = mkTest(host, vis, Array.from({ length: x.n }, (_, i) => pick + i * TEST_GAP), C); out.push(it); for (const t of [host, vis]) occ(t, it.start, it.end, x.n);
  }
  return out.sort((a, b) => a.start - b.start);
}
// Tests outside the WTC in year y: the real one-offs, and (from 2027) a few for Afghanistan, Ireland and Zimbabwe.
function otherTests(G, y) {
  const out = OTHER_TESTS.map((s) => realSeries(s, null)).filter((x) => yearOf(x.start) === y); if (y < 2027) return out;
  const r = rng(hashStr(`${st(G).seed}:oth${y}`)); const busy = {};
  const occ = (t, s, e) => (busy[t] ??= []).push([s, e]); const free = (t, s, e) => (busy[t] || []).every(([a, b]) => e + 6 < a || s > b + 6) && !testBlocked(t, s, e);
  const n0 = {}; for (let C = 2025; C <= y; C += 2) if (C + 2 >= y) for (const x of cyclePlan(G, C)) for (const t of x.teams) { occ(t, x.start, x.end); if (yearOf(x.start) === y) n0[t] = (n0[t] || 0) + x.days.length; }
  for (const x of out) for (const t of x.teams) occ(t, x.start, x.end);
  const [o1, o2, o3] = [TEST_OTHERS[y % 3], TEST_OTHERS[(y + 1) % 3], TEST_OTHERS[(y + 2) % 3]]; // the two WTC sides with the fewest Tests that year host or visit them
  const [w1, w2] = WTC_T.slice().sort((a, b) => (n0[a] || 0) - (n0[b] || 0) || hashStr(`${a}${y}`) - hashStr(`${b}${y}`));
  const want = [[y % 2 ? 'ZIM' : 'AFG', y % 2 ? 'AFG' : 'ZIM', 2], ['IRE', y % 2 ? 'ZIM' : 'AFG', 1], [w1, o1, y % 2 ? 1 : 2], [o2 === 'IRE' ? o3 : o2, w2, 2]];
  const cnt = { ...n0 }; for (const x of out) for (const t of x.teams) cnt[t] = (cnt[t] || 0) + x.days.length;
  const tryAdd = (h, v, n) => { if (h === v) return false; const len = (n - 1) * TEST_GAP + 5; const cand = [];
    for (const w of HOME[h] || []) { const [s, e] = inYear(y, w); for (let q = s; q + len <= e; q += 4) if (free(h, q, q + len) && free(v, q, q + len)) cand.push(q); }
    if (!cand.length) return false; const q = cand[Math.floor(r() * cand.length)]; const it = mkTest(h, v, Array.from({ length: n }, (_, i) => q + i * TEST_GAP), null); out.push(it);
    for (const t of [h, v]) { occ(t, it.start, it.end); cnt[t] = (cnt[t] || 0) + n; } return true; };
  for (const [h, v, n] of want) tryAdd(h, v, n);
  // a WTC side with a thin year plays a short series against one of the three as well
  for (const t of WTC_T) { if ((cnt[t] || 0) >= 6) continue; const o = TEST_OTHERS.slice().sort((a, b) => (cnt[a] || 0) - (cnt[b] || 0))[0]; if (!tryAdd(t, o, 2)) tryAdd(o, t, 2); }
  return out;
}
const TPLAN = new Map();
// Every Test series starting in year y.
export function testPlan(G, y) {
  const key = `${st(G).seed}:${y}`; if (TPLAN.has(key)) return TPLAN.get(key);
  const out = []; for (let C = 2025; C <= y; C += 2) if (C + 2 >= y) out.push(...cyclePlan(G, C).filter((x) => yearOf(x.start) === y));
  out.push(...otherTests(G, y)); const seenId = {};
  const res = out.map((x) => { const n = (seenId[x.id] = (seenId[x.id] || 0) + 1); return n > 1 ? { ...x, id: `${x.id}-${n}` } : x; });
  TPLAN.set(key, res); if (TPLAN.size > 40) TPLAN.delete(TPLAN.keys().next().value); return res;
}
// Make a Test series' season, with its Tests on their days and the host named first.
function createTest(G, it) {
  const wd = G.s.wd; const I = st(G); if (wd.seasons[it.id]) return null; const def = COMPS[it.comp];
  // a side that cannot field eleven (a test world with a small database) plays no Tests
  if (it.teams.some((c) => poolOf(G, c).filter((p) => !p.inj).length < 11)) { I.made[it.id] = 'skip'; return null; }
  const S = newSeason(def, yearOf(it.start), it.teams, it.start, it.end); S.id = it.id; S.name = it.name; S.endF = it.end;
  S.fx.forEach((f, i) => { f.d = it.days[i] ?? f.d; f.a = it.teams[0]; f.b = it.teams[1]; });
  if (it.wtc != null) S.wtc = it.wtc; if (it.rf) S.rf = it.rf; if (it.tr) S.tr = it.tr; if (it.ven) S.ven = it.ven;
  wd.seasons[S.id] = S; I.made[it.id] = 1; return S;
}
// A season's series score: { a, b, wa, wb, dr, played, n, text }.
export function seriesScore(G, S) {
  const [a, b] = S.teams; const t = (S.tables && S.tables.series) || {}; const wa = (t[a] || {}).w || 0, wb = (t[b] || {}).w || 0; const dr = (t[a] || {}).d || 0;
  const played = S.fx.filter((f) => f.res).length; const n = S.fx.length; const N = (c) => nm(c);
  let text;
  if (!played) text = `${n === 1 ? 'One-off Test' : `${n}-Test series`} · to come`;
  else if (n === 1) text = S.fx[0].res.text;
  else if (S.done) text = wa === wb ? `Series drawn ${wa}–${wb}` : `${N(wa > wb ? a : b)} win ${Math.max(wa, wb)}–${Math.min(wa, wb)}`;
  else text = wa === wb ? `Level ${wa}–${wb} after ${played} of ${n}` : `${N(wa > wb ? a : b)} lead ${Math.max(wa, wb)}–${Math.min(wa, wb)} after ${played} of ${n}`;
  if (n > 1 && dr && played) text += ` (${dr} drawn)`;
  return { a, b, wa, wb, dr, played, n, text };
}

// ----- the WTC table -----
const blankW = () => [0, 0, 0, 0, 0, 0, 0, 0];
function addW(T, team, kind, ded = 0) { const x = (T[team] ??= blankW()); x[0]++; const P = WTC.points;
  if (kind === 'w') { x[1]++; x[6] += P.win; } else if (kind === 'l') { x[2]++; x[6] += P.loss; } else if (kind === 'd') { x[3]++; x[6] += P.draw; } else if (kind === 't') { x[4]++; x[6] += P.tie; }
  if (ded) { x[5] += ded; x[6] -= ded; } }
// The real 2025–27 table from the results of Tests finished before `cut` (a day number).
export function wtcRealTable(cut) {
  const T = {};
  for (const s of WTC.c25.series) { if (!s.tests) continue; let any = false;
    for (const [dt, , res, , ded] of s.tests) { if (!res || dA(dt) + 4 >= cut) continue; any = true;
      const [kh, kv] = res === 'H' ? ['w', 'l'] : res === 'A' ? ['l', 'w'] : ['d', 'd']; addW(T, s.h, kh, (ded || {})[s.h]); addW(T, s.v, kv, (ded || {})[s.v]); }
    if (any) { T[s.h][7]++; T[s.v][7]++; } }
  return T;
}
function seedWTC(I) { I.wtc = { 2025: { t: wtcRealTable(I.start0 ?? 0), seed: I.start0 ?? 0 } }; }
// Simulated WTC Tests go into the table once (f.w9), the final's result into the cycle.
function wtcTick(G) {
  const I = st(G); const wd = G.s.wd;
  for (const S of Object.values(wd.seasons)) {
    if (S.wtc != null && !S.real) { const C = (I.wtc[S.wtc] ??= { t: {} }); let first = !S.w9;
      for (const f of S.fx) { if (!f.res || f.w9) continue; f.w9 = 1; const r = f.res;
        const ka = r.draw || r.nr ? 'd' : r.tie && !r.w ? 't' : r.w === f.a ? 'w' : 'l'; const kb = ka === 'w' ? 'l' : ka === 'l' ? 'w' : ka; addW(C.t, f.a, ka); addW(C.t, f.b, kb);
        if (first) { C.t[f.a][7]++; C.t[f.b][7]++; S.w9 = 1; first = false; } } }
    if (S.wtcf != null && S.done && !(I.wtc[S.wtcf] && I.wtc[S.wtcf].fin)) {
      const f = S.fx[0]; const joint = !!(f && f.res && (f.res.draw || f.res.nr || (f.res.tie && !f.res.w)));
      if (joint) { S.joint = 1; S.champ = S.teams[0]; S.runner = S.teams[1]; } else if (f && f.res) { S.champ = f.res.w; S.runner = f.res.l; }
      (I.wtc[S.wtcf] ??= { t: {} }).fin = { id: S.id, champ: S.champ, runner: S.runner, joint: joint ? 1 : 0 };
    }
  }
  // a cycle is complete when every series is played (or was before the save): its final can be drawn
  const y0 = yearOf(wd.day);
  for (let C = 2025; C <= y0; C += 2) { if (I.made[`WTC-${C}`]) continue; const L = cyclePlan(G, C);
    if (L.every((it) => { const S = wd.seasons[it.id]; return S ? S.done : !!I.made[it.id] || it.end < (I.start0 ?? 0); })) I.made[`WTC-${C}`] = 1; }
}
// Table rows for cycle C, best first: { code, name, m, w, l, d, t, ded, pts, con, pct, ser, pos }.
export function wtcTable(G, C) {
  const I = st(G); const T = (I && I.wtc && I.wtc[C] && I.wtc[C].t) || {};
  const rows = WTC_T.map((c) => { const x = T[c] || blankW(); const con = x[0] * WTC.points.win; return { code: c, name: nm(c), m: x[0], w: x[1], l: x[2], d: x[3], t: x[4], ded: x[5], pts: x[6], con, pct: con ? Math.round((x[6] / con) * 10000) / 100 : 0, ser: x[7] }; });
  rows.sort((a, b) => b.pct - a.pct || b.w - a.w || a.l - b.l || b.m - a.m || a.code.localeCompare(b.code)); rows.forEach((r, i) => { r.pos = i + 1; }); return rows;
}
export const wtcTop2 = (G, C) => wtcTable(G, C).slice(0, 2).map((r) => r.code);
export const wtcName = (C) => (C === 2025 ? WTC.c25.name : `ICC World Test Championship ${C}–${String(C + 2).slice(2)}`);
// When and where a cycle's final is played.
export function wtcFinal(G, C) {
  const y = C + 2; const real = C === 2025 ? WTC.c25.final : null; const start = real ? dA(real.start) : d(y, 5, 10); const end = real ? dA(real.end) : start + 4;
  const S = G && G.s.wd ? G.s.wd.seasons[`WTCF-${y}`] || null : null; const fin = G && st(G) && st(G).wtc[C] ? st(G).wtc[C].fin || null : null;
  return { id: `WTCF-${y}`, y, start, end, venue: WTC.finalHost(y), real: !!real, S, fin };
}
// The cycle in progress (its final not yet played), and every cycle the save knows.
export function wtcCurrent(G) { const I = st(G); let C = 2025; while (I && I.wtc[C] && I.wtc[C].fin) C += 2; return C; }
export function wtcCycles(G) { const I = st(G); return Object.keys((I && I.wtc) || {}).map(Number).sort((a, b) => a - b); }
// The cycle's series for the screens: [{ it, S, line, real, done }] in date order. Played-before-the-save series
// carry their real result; archived ones their archive line.
export function wtcSeries(G, C) {
  const I = st(G); const wd = G.s.wd; const arc = Object.fromEntries((I.arc || []).map((a) => [a[0], a[1]]));
  return cyclePlan(G, C).map((it) => { const S = wd.seasons[it.id] || null; const src = C === 2025 ? WTC.c25.series.find((s) => s.h === it.teams[0] && s.v === it.teams[1]) : null;
    if (S) { const sc = seriesScore(G, S); return { it, S, line: sc.text, real: false, done: S.done }; }
    if (src && src.tests && it.end < (I.start0 ?? 0)) { let h = 0, v = 0, dr = 0; for (const t of src.tests) { if (t[2] === 'H') h++; else if (t[2] === 'A') v++; else if (t[2] === 'D') dr++; }
      const line = h === v ? `Series drawn ${h}–${v}` : `${nm(h > v ? it.teams[0] : it.teams[1])} won ${Math.max(h, v)}–${Math.min(h, v)}`; return { it, S: null, line: `${line}${dr && it.days.length > 1 ? ` (${dr} drawn)` : ''}`, real: true, done: true }; }
    if (arc[it.id]) { const [w, sc] = String(arc[it.id]).split(' '); return { it, S: null, line: sc ? `${nm(w)} won ${sc}` : `Series drawn ${w}`, real: false, done: true }; }
    const made = I.made[it.id]; return { it, S: null, line: made && made !== 1 ? 'Not played' : it.start < wd.day ? 'Not played' : 'To come', real: false, done: it.start < wd.day };
  });
}

// Associates with ODI status now: the League 2 sides (and the Play-off and Qualifier teams in their year).
export function odiStatus(G) {
  const wd = G.s.wd; const cur = Object.values(wd.seasons).filter((S) => prefixOf(S.comp) === 'CWCL2' || S.id === 'CWCL2-2023').sort((a, b) => b.y - a.y)[0];
  return cur ? cur.teams.slice() : REAL.l2.table.map((r) => r[0]);
}

// ----- planner (registered with comps.js) -----
function compFor(G, it, teams) {
  if (it.comp) return it.comp; if (it.rq) return teams.length <= 4 ? 'T20RQ2' : 'T20RQ';
  const I = st(G); const fmt = it.fmt ? `@${it.fmt}` : ''; return `${it.pre}@${it.id.split('-').pop()}${fmt}@${I.seed}`;
}
function planner(G, y) {
  if (!ENABLED || !G.s.wd) return []; seen(G); injectSides(G); const day = G.s.wd.day; const I = st(G); const out = [];
  for (const it of programme(G, y)) {
    if (!it.teams || it.start < day || I.made[it.id] || G.s.wd.seasons[it.id]) continue;
    if (it.test) { createTest(G, it); continue; } // made here so the Tests keep their own days
    const comp = compFor(G, it, it.teams); const end = it.ends ? it.ends[Math.min(1, it.ends.length - 1)] : it.end;
    if (!COMPS[comp]) buildDef(comp, it.teams, { share: it.ends && it.ends.length > 1 ? (it.ends[0] - it.start) / Math.max(1, it.ends[1] - it.start) : undefined });
    if (!/^(BILAT|TRI)/.test(comp)) I.made[it.id] = 1; out.push({ comp, id: it.id, name: it.name, teams: it.teams, start: it.start, end });
  }
  return out;
}
registerComps(STATIC, planner);
onClockTick(tick); // the clock opens results-driven events as soon as they're decided

// Create a season now (for items whose teams come from earlier results).
function create(G, it, day) {
  const I = st(G); let teams; try { teams = it.teams || it.resolve(G); } catch (e) { console.error('intl resolve', it.id, e); teams = null; }
  teams = (teams || []).filter((c, i, a) => c && a.indexOf(c) === i);
  if (it.rq && teams.length <= (RQ_SPOTS[it.id.split('-')[1]] || 1)) { I.made[it.id] = 'bye'; return null; }
  if (teams.length < 2) { I.made[it.id] = 'skip'; return null; }
  const comp = compFor(G, it, teams); let start = it.start; let ends = (it.ends || [it.end]).slice();
  if (start <= day) { const sh = day + 2 - start; start += sh; ends = ends.map((x) => x + sh); }
  const share = ends.length > 1 ? (ends[0] - start) / Math.max(1, ends[1] - start) : undefined;
  const def = COMPS[comp] && !BUILD[prefixOf(comp)] ? COMPS[comp] : buildDef(comp, teams, { share });
  const S = newSeason(def, yearOf(start), teams, start, ends[Math.min(1, ends.length - 1)]);
  S.id = it.id; S.name = it.name; if (ends.length > 2) { S.ends = ends; } S.endF = ends[ends.length - 1]; if (it.host) S.host = it.host; if (it.wtcf != null) S.wtcf = it.wtcf;
  G.s.wd.seasons[S.id] = S; I.made[it.id] = 1; return S;
}

// ----- after the clock moves -----
// Creates the seasons that are ready, logs results for the rankings, handles Nepal's games and news.
export function tick(G) {
  if (!ENABLED || !G.s || !G.s.wd) return; seen(G); ensureDefs(G); injectSides(G); const wd = G.s.wd; const I = st(G); const day = wd.day; const y0 = yearOf(day);
  for (let y = y0 - 1; y <= y0 + 1; y++) for (const it of programme(G, y)) {
    // a save whose year was planned before Tests existed gets them now, where the dates are clear
    if (it.test) { if (!I.made[it.id] && !wd.seasons[it.id] && wd.years[yearOf(it.start)] && it.start > day && it.start - day <= 200) { if (clashes(G, it)) I.made[it.id] = 'clash'; else createTest(G, it); } continue; }
    if (it.teams || I.made[it.id] || wd.seasons[it.id]) continue; if (it.ends[it.ends.length - 1] < day) { I.made[it.id] = 'missed'; continue; }
    const ready = (it.deps || []).every((id) => { const S = wd.seasons[id]; return S ? S.done : !!I.made[id] || id === 'CWCL2-2023' || id === 'CL-2024'; });
    if (ready || it.start - day <= 7) create(G, it, day);
  }
  try { wtcTick(G); } catch (e) { console.error('wtc', e); }
  for (const h of hooks) { try { h(G); } catch (e) { console.error('intl hook', e); } }
  announce(G);
}
// Other modules (rankings, Nepal's games) add work to the tick.
const clashes = (G, it) => Object.values(G.s.wd.seasons).some((S) => !S.done && S.fx.some((f) => !f.res && (it.teams.includes(f.a) || it.teams.includes(f.b)) && f.d >= it.start - 1 && f.d <= it.end + 1));
export { wtcTick };
const hooks = []; export const onTick = (f) => { if (!hooks.includes(f)) hooks.push(f); };

// News when a big event finishes (in-game).
function announce(G) {
  const I = st(G); const wd = G.s.wd;
  for (const S of Object.values(wd.seasons)) { if (!S.done || I.ann[S.id] || S.real) continue; const k = info(S).kind;
    if (k === 'wtcf') { I.ann[S.id] = 1; if (S.wtcf != null) wtcTick(G); const C = S.wtcf ?? S.y - 2;
      G.news(S.joint ? `${nm(S.teams[0])} and ${nm(S.teams[1])} share the World Test Championship` : `${nm(S.champ)} win the World Test Championship`, 'intl', { to: '/international?tab=tests', sub: 'World', detail: `In-game. ${wtcName(C)} final${S.joint ? ' drawn: joint winners' : `: ${nm(S.champ)} beat ${nm(S.runner)}`}.` }); continue; } if (!['wc', 't20wc', 'asia', 'wcq', 'po', 'gq', 'l2', 'cl', 'accpc', 'rq'].includes(k)) { I.ann[S.id] = 1; continue; }
    I.ann[S.id] = 1; const nep = S.teams.includes('NEP'); const pl = placing(S); const pos = pl.indexOf('NEP');
    const big = k === 'wc' || k === 't20wc' || k === 'asia';
    let head = big ? `${nm(S.champ)} win the ${sbase(S)}` : `${sbase(S)}: ${nm(S.champ)} finish top`;
    let detail = `In-game. ${S.runner ? `${nm(S.champ)} beat ${nm(S.runner)}${big ? ' in the final' : ''}.` : ''}`;
    if (nep) { const q = nepalOutcome(G, S); if (q) { head = q.head; detail += ` ${q.detail}`; } else detail += ` Nepal finished ${ordinal(pos + 1)}.`; }
    if (big || nep) G.news(head, 'intl', { to: big ? '/worldcup' : '/international', sub: nep ? 'Pathway' : 'World', detail, ne: nep ? 'नेपालको अन्तर्राष्ट्रिय यात्रा' : undefined });
  }
}
const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
// What a finished pathway event means for Nepal, for the news.
function nepalOutcome(G, S) {
  const k = info(S).kind; const pl = placing(S); const pos = pl.indexOf('NEP'); if (pos < 0) return null; const p = ordinal(pos + 1);
  if (k === 'po') return pos < 4 ? { head: `Nepal finish ${p} in the Qualifier Play-off and go through to the World Cup Qualifier`, detail: 'The top four go through.' } : { head: `Nepal finish ${p} in the Qualifier Play-off and drop to the Challenge League`, detail: 'Only the top four go through.' };
  if (k === 'wcq') { const q = pl.slice(0, 4).includes('NEP'); return q ? { head: `Nepal qualify for the ${S.y} ODI World Cup`, detail: pl[0] === 'NEP' ? 'As Qualifier winners they go straight to the group stage.' : 'They start in the Super Series.' } : { head: `Nepal miss out at the World Cup Qualifier`, detail: `They finished ${p}.` }; }
  if (k === 'gq') { const q = gqQualifiers(S).includes('NEP'); return { head: q ? `Nepal qualify for the ${S.id.split('-')[1]} T20 World Cup` : 'Nepal miss out at the T20 World Cup Global Qualifier', detail: q ? '' : `They finished ${p}.` }; }
  if (k === 'l2') return { head: `CWC League 2 ends: Nepal finish ${p}`, detail: pos < 4 ? 'Straight to the World Cup Qualifier.' : 'Next: the Qualifier Play-off.' };
  if (k === 'cl') return { head: `Challenge League ends: Nepal finish ${p} in their league`, detail: '' };
  if (k === 'wc' || k === 't20wc') return { head: S.champ === 'NEP' ? `Nepal win the ${sbase(S)}!` : `${nm(S.champ)} win the ${sbase(S)}. Nepal: ${cupStage(S, 'NEP').toLowerCase()}`, detail: '' };
  if (k === 'asia') return { head: S.champ === 'NEP' ? 'Nepal win the Asia Cup!' : `${nm(S.champ)} win the ${sbase(S)}. Nepal finish ${p}`, detail: '' };
  return null;
}
// How far a team got in a cup season.
export function cupStage(S, c) {
  if (!S.teams.includes(c)) return 'Not there'; if (S.champ === c) return 'Champions'; if (S.done && S.runner === c) return 'Runners-up';
  const names = info(S).stages; let best = -1; for (const f of S.fx) if (f.a === c || f.b === c) best = Math.max(best, f.stage);
  if (best < 0) return 'Not started'; const n = names[best] || 'Group stage'; return n === 'Super Series' && S.dg && S.dg[1] && S.dg[1].flat().includes(c) ? 'Group stage' : n;
}

// A season's display name (seasons from other modules may have none).
export const sname = (S) => S.name || (COMPS[S.comp] && COMPS[S.comp].name) || S.id;
export const sbase = (S) => sname(S).split(' · ')[0];
// Seasons of a kind, newest first.
export const seasonsOf = (G, kind) => Object.values(G.s.wd ? G.s.wd.seasons : {}).filter((S) => info(S).kind === kind).sort((a, b) => b.y - a.y || b.start - a.start);
export const monthOf = (day) => { const t = dateOf(day); return `${MONTHS[t.m]} ${t.y}`; };
export const lastDay = (S) => (S.fx.length ? Math.max(...S.fx.map((f) => f.d)) : S.end);

// ----- real history: the finished 2023–26 League 2 and 2024–26 Challenge League -----
const realRow = (r) => { const [, p, w, l, t, nr, pts, nrr] = r; return { p, w, l, t, nr, d: 0, pts, rf: Math.round(Math.max(0, nrr) * 1000), bf: 6000, ra: Math.round(Math.max(0, -nrr) * 1000), ba: 6000 }; };
export function seedHistory(G) {
  const wd = G.s.wd; const I = st(G); if (I.hist) return; I.hist = 1;
  const mk = (id, name, y, tables, champ, runner, teams) => { wd.seasons[id] ??= { id, comp: 'HIST', name, y, teams, fx: [], tables, stage: 0, done: true, champ, runner, start: d(y, 0, 1), end: d(2026, 10, 4), real: 1 }; I.made[id] = 1; I.ann[id] = 1; };
  const L = REAL.l2.table; mk('CWCL2-2023', `${REAL.l2.name} · final table`, 2023, { all: Object.fromEntries(L.map((r) => [r[0], realRow(r)])) }, L[0][0], L[1][0], L.map((r) => r[0]));
  const C = REAL.cl.groups; mk('CL-2024', `${REAL.cl.name} · final tables`, 2024, { A: Object.fromEntries(C.A.map((r) => [r[0], realRow(r)])), B: Object.fromEntries(C.B.map((r) => [r[0], realRow(r)])) }, C.A[0][0], C.B[0][0], [...C.A, ...C.B].map((r) => r[0]));
}
// The T20 World Cup route for year T without fixing it early: null until it is known.
export function t20Route(G, T) { if (T === 2028) return { auto: REAL.t20wc28.auto, direct: REAL.t20wc28.gqDirect }; const I = st(G); return (I.q && I.q[`t20${T}`]) || null; }
export function odiRoute(G, W) { if (W === 2027) return { auto: odiAuto(G, 2027) }; const I = st(G); return I.q && I.q[`odi${W}`] ? { auto: I.q[`odi${W}`] } : null; }
export { odiHosts, t20Hosts, t20Start, odiName, t20Name };
export function init(G) { if (!G.s.wd) return; st(G); seen(G); seedHistory(G); ensureDefs(G); if (ENABLED && G.s.players && Object.keys(G.s.players).length) injectSides(G); }
export { ODI, T20, FULL, REGIONS };

// How many teams go through from a qualifying event (for objectives); null when it isn't a qualifier.
export function qualifyingPlaces(S) {
  if (/^CWCPO/.test(S.id) || /^CWCQ/.test(S.id)) return 4;
  const m = /^T20RQ-(\w+)-/.exec(S.id); if (m) return RQ_SPOTS[m[1]] || 2;
  return null;
}
