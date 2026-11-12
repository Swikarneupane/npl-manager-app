// ===== India (W3): the Indian Premier League, the Syed Mushtaq Ali Trophy and the Vijay Hazare Trophy =====
// Formats, teams, windows and points were checked in November 2026; sources sit next to each definition.
// These are AI competitions here: taking a club job in them is the career layer's work (rules are on the defs).
//
// How seasons are made (the same pattern as domestic-asia.js). The planner is called once per calendar year
// by ensureYear: it records the year and make() creates the seasons itself, returning nothing for ensureYear
// to make. A season whose teams depend on an earlier one (promotion and relegation between the Elite and
// Plate divisions) waits until that season is finished; the clock tick creates it then. A season whose first
// round is before the save's start date is skipped, so the game never invents a finished real season.
//
// The IPL's 70-game league (not a plain round robin) is built here; its playoffs are comp.js's 'ipl4' plan
// (Qualifier 1, Eliminator, Qualifier 2, Final). The domestic competitions' Super League and knockouts are
// stages of type 'dko' that the tick fills in, as in domestic-asia.js.
//
// State in the save: s.wd.di = { y: [years still being made], skip: [season ids skipped], from: day }.
// On a season: fin (title settled), sd not used.
import { registerComps, COMPS } from './comps.js';
import { blankRow, standings, roundRobin, nrr } from './comp.js';
import { onTick } from './state.js';
import { dayOfDate } from './dates.js';

const D = (y, m, d) => dayOfDate(y, m, d);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffled = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const days = (y, md) => md.map(([m, d]) => D(y, m, d));
const ids = (list) => list.map((s) => `IND-${s}`);

let ENABLED = true;
export const setIndiaEnabled = (on) => { ENABLED = !!on; };

// ----- IPL -----
// 2026 edition (28 March to 31 May 2026, 74 matches): ten franchises in two groups of five, each side plays 14
// league games: twice each of the four in its group, twice its "rival" and once each of the other four. The top four go
// to Qualifier 1, the Eliminator, Qualifier 2 and the Final. en.wikipedia.org/wiki/2026_Indian_Premier_League.
// Groups are the 2026 ones; the rival pairing (CSK-MI, KKR-SRH, RR-GT, RCB-DC, PBKS-LSG) and the fixture order are in-game.
export const IPL_GROUPS = { A: ['CSK', 'KKR', 'RR', 'RCB', 'PBKS'], B: ['MI', 'SRH', 'GT', 'DC', 'LSG'] };
// 2027: the announced window is 14 March to 30 May (BCCI, 2024); later years follow the pattern in-game (14 March, final 30 May).
const IPL_WINDOW = ['Mar 14', 'May 30'];
export const IPL_RULES = { min: 18, max: 25, overseas: { max: 8, xi: 4 }, recruit: 'auction', retain: 'any', purse: 125 };
const ipl = (s) => `IPL-${s}`;
export function iplLeaguePairs() {
  const A = IPL_GROUPS.A, B = IPL_GROUPS.B; const out = [];
  for (const g of [A, B]) for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) { out.push([g[i], g[j]]); out.push([g[j], g[i]]); }
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { if (i === j) { out.push([A[i], B[j]]); out.push([B[j], A[i]]); } else out.push([(i + j) % 2 ? A[i] : B[j], (i + j) % 2 ? B[j] : A[i]]); }
  return out; // 70
}
// One match a day where possible, a side not playing two days running when it can be helped.
function iplOrder(pairs, rnd) {
  const left = shuffled(pairs, rnd); const last = {}; const out = [];
  for (let i = 0; left.length; i++) { let k = left.findIndex(([a, b]) => (last[a] ?? -9) < i - 1 && (last[b] ?? -9) < i - 1); if (k < 0) k = left.findIndex(([a, b]) => (last[a] ?? -9) < i && (last[b] ?? -9) < i); if (k < 0) k = 0; const m = left.splice(k, 1)[0]; last[m[0]] = last[m[1]] = i; out.push(m); }
  return out;
}

// ----- points -----
// SMAT and Vijay Hazare: 4 a win, 2 for a tie or no result, 0 for a loss (en.wikipedia.org/wiki/2025–26_Vijay_Hazare_Trophy).
export const IND_PTS = { win: 4, loss: 0, tie: 2, nr: 2 };

// ----- the domestic divisions -----
// Elite: 32 sides in four groups of eight; Plate: six. These are the 2025-26 Syed Mushtaq Ali groups
// (en.wikipedia.org/wiki/2025–26_Syed_Mushtaq_Ali_Trophy); the same sides play the 2026-27 Ranji Elite. The 2026-27 groups were not
// published when checked, and the Vijay Hazare groups are taken to be the same: in-game assumptions.
const ELITE = {
  A: ['MUM', 'VID', 'AP', 'KER', 'RLY', 'ASM', 'CHH', 'ODI'],
  B: ['MP', 'UP', 'CHD', 'JK', 'HYD', 'MAH', 'GOA', 'BIH'],
  C: ['BAR', 'BEN', 'GUJ', 'PUN', 'HAR', 'HP', 'SER', 'PDC'],
  D: ['DEL', 'SAU', 'RAJ', 'JHA', 'KAR', 'TN', 'UKD', 'TRI'],
};
const PLATE = ['MAN', 'MIZ', 'MEG', 'NAG', 'SIK', 'ARP'];

// ----- definitions -----
const base = (o) => ({ kind: 'domestic', listA: true, host: 'IND', ...o });
const ko = (name, code, pairs) => ({ type: 'dko', ko: true, name, code, pairs });
const QF = [['A1', 'B2'], ['C1', 'D2'], ['B1', 'A2'], ['D1', 'C2']];
const DEFS = {
  // IPL: the league of 70 games then comp.js's four-team playoff. kind 'franchise'.
  IPL: { id: 'IPL', name: 'Indian Premier League', short: 'IPL', kind: 'franchise', listA: true, host: 'IND', fmt: 'T20', level: 1, window: IPL_WINDOW, rules: IPL_RULES,
    stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'ipl4', name: 'Playoffs', ko: true }] },
  // Syed Mushtaq Ali Trophy 2025-26 (26 Nov to 18 Dec 2025): four Elite groups of eight, single round robin; the top two of
  // each go to a Super League of two groups of four, whose winners meet in the final. The Plate (six sides) has a final between
  // the top two, the winner promoted. 2026-27: Elite league 14 to 26 Nov, knockouts 30 Nov to 6 Dec in Nagpur, Plate 14 to 24 Nov
  // (BCCI ready reckoner, outlookindia.com, crictracker.com). Super League group make-up (A1 B2 C1 D2 / B1 A2 D1 C2) is in-game.
  'IND-SMAT': base({ id: 'IND-SMAT', name: 'Syed Mushtaq Ali Trophy', short: 'SMAT', fmt: 'T20', level: 1, window: ['Nov 14', 'Dec 6'], points: IND_PTS,
    stages: [{ type: 'rr', name: 'Elite groups', labels: ['Group A', 'Group B', 'Group C', 'Group D'] },
      { type: 'dko', ko: true, name: 'Super League', code: 'SL', sl: { X: ['A1', 'B2', 'C1', 'D2'], Y: ['B1', 'A2', 'D1', 'C2'] } }, ko('Final', 'F', [['X1', 'Y1']])] }),
  'IND-SMAT-PLATE': base({ id: 'IND-SMAT-PLATE', name: 'Syed Mushtaq Ali Trophy Plate', short: 'SMAT Plate', fmt: 'T20', level: 3, window: ['Nov 14', 'Nov 24'], points: IND_PTS,
    stages: [{ type: 'rr', name: 'Plate group' }, ko('Final', 'F', [['1', '2']])] }),
  // Vijay Hazare Trophy 2025-26 (24 Dec 2025 to 18 Jan 2026): the same 38 sides, 50 overs; the top two of each Elite group to the
  // quarter-finals, semi-finals, final. 2026-27: Elite league 14 to 29 Dec, knockouts 2 to 8 Jan 2027; Plate 14 to 24 Dec, final 27 Dec
  // (BCCI ready reckoner). Quarter-final pairings are in-game.
  'IND-VH': base({ id: 'IND-VH', name: 'Vijay Hazare Trophy', short: 'Vijay Hazare', fmt: 'ODI', level: 1, window: ['Dec 14', 'Jan 8'], points: IND_PTS,
    stages: [{ type: 'rr', name: 'Elite groups', labels: ['Group A', 'Group B', 'Group C', 'Group D'] }, ko('Quarter-finals', 'QF', QF), ko('Semi-finals', 'SF', [['W0', 'W1'], ['W2', 'W3']]), ko('Final', 'F', [['W0', 'W1']])] }),
  'IND-VH-PLATE': base({ id: 'IND-VH-PLATE', name: 'Vijay Hazare Trophy Plate', short: 'VH Plate', fmt: 'ODI', level: 3, window: ['Dec 14', 'Dec 27'], points: IND_PTS,
    stages: [{ type: 'rr', name: 'Plate group' }, ko('Final', 'F', [['1', '2']])] }),
};
export const INDIA_COMPS = Object.keys(DEFS);

// ----- teams: promotion and relegation between the divisions -----
const S_ = (G, id) => G.s.wd.seasons[id] || null;
const order = (S, key) => standings(S.tables[key] || Object.values(S.tables)[0]).map((r) => r.id);
// The worst Elite side (points, wins, run rate) swaps with the Plate champion once both of last year's seasons are settled.
function divisions(G, topId, lowId, y) {
  const t = S_(G, `${topId}-${y - 1}`), l = S_(G, `${lowId}-${y - 1}`);
  const real = { top: Object.fromEntries(Object.entries(ELITE).map(([k, v]) => [k, ids(v)])), low: { all: ids(PLATE) } };
  if (!t || !l) return real; if (!t.fin || !l.fin) return null;
  const rows = []; for (const k of ['A', 'B', 'C', 'D']) for (const [id, r] of Object.entries(t.tables[k] || {})) rows.push({ id, ...r, nrr: nrr(r) });
  rows.sort((a, b) => a.pts - b.pts || a.w - b.w || a.nrr - b.nrr); const down = rows[0].id, up = l.champ;
  const sw = (S, keys, from, to) => Object.fromEntries(keys.map((k) => [k, Object.keys(S.tables[k] || {}).map((x) => (x === from ? to : x))]));
  return { top: sw(t, ['A', 'B', 'C', 'D'], down, up), low: sw(l, ['all'], up, down) };
}

// ----- schedules, per season start year -----
// rounds: league round dates (one per round); sl: Super League round dates; ko: one date per knockout round; end: the last day.
const PLAN = [
  { comp: 'IND-SMAT', top: true, rounds: (y) => days(y, [[10, 14], [10, 16], [10, 18], [10, 20], [10, 22], [10, 24], [10, 26]]), sl: (y) => days(y, [[10, 30], [11, 2], [11, 4]]), ko: (y) => days(y, [[11, 6]]), end: (y) => D(y, 11, 6), label: (y) => `${y}–${String(y + 1).slice(2)}`, div: 'IND-SMAT-PLATE' },
  { comp: 'IND-SMAT-PLATE', rounds: (y) => days(y, [[10, 14], [10, 16], [10, 18], [10, 20], [10, 22]]), ko: (y) => days(y, [[10, 24]]), end: (y) => D(y, 10, 24), label: (y) => `${y}–${String(y + 1).slice(2)}`, div: 'IND-SMAT' },
  { comp: 'IND-VH', top: true, rounds: (y) => days(y, [[11, 14], [11, 16], [11, 18], [11, 21], [11, 23], [11, 26], [11, 29]]), ko: (y) => days(y + 1, [[0, 2], [0, 5], [0, 8]]), end: (y) => D(y + 1, 0, 8), label: (y) => `${y}–${String(y + 1).slice(2)}`, div: 'IND-VH-PLATE' },
  { comp: 'IND-VH-PLATE', rounds: (y) => days(y, [[11, 14], [11, 16], [11, 19], [11, 21], [11, 24]]), ko: (y) => days(y, [[11, 27]]), end: (y) => D(y, 11, 27), label: (y) => `${y}–${String(y + 1).slice(2)}`, div: 'IND-VH' },
];
const PLAN_BY = Object.fromEntries(PLAN.map((p) => [p.comp, p]));
const addFx = (S, a, b, d, fmt, grp, stage, extra) => S.fx.push({ id: `${S.id}#R${S.fx.length}`, d, a, b, fmt, stage, grp, res: null, ...(extra || {}) });
const newS = (id, comp, y, name, teams, start, end) => ({ id, comp, y, name, teams, fx: [], tables: {}, stage: 0, done: false, champ: null, runner: null, start, end });

function buildIPL(y) {
  const def = COMPS.IPL; const id = `IPL-${y}`; const rnd = rng(hash(id)); const teams = [...IPL_GROUPS.A, ...IPL_GROUPS.B].map(ipl);
  const [start, end] = [D(y, 2, 14), D(y, 4, 30)]; const S = newS(id, 'IPL', y, `Indian Premier League ${y}`, teams, start, end);
  S.tables.all = Object.fromEntries(teams.map((t) => [t, blankRow()]));
  const order_ = iplOrder(iplLeaguePairs(), rnd); const last = end - 6; // the league ends about a week before the final
  order_.forEach(([a, b], i) => addFx(S, ipl(a), ipl(b), start + Math.floor((i * (last - start)) / (order_.length - 1)), def.fmt, 'all', 0));
  return S;
}
function buildDomestic(p, y, groups) {
  const def = COMPS[p.comp]; const id = `${p.comp}-${y}`; const rnd = rng(hash(id)); const ds = p.rounds(y); const keys = Object.keys(groups);
  const S = newS(id, p.comp, y, `${def.name} ${p.label(y)}`, keys.flatMap((k) => groups[k]), ds[0], p.end(y));
  for (const k of keys) { S.tables[k] = Object.fromEntries(groups[k].map((t) => [t, blankRow()]));
    roundRobin(shuffled(groups[k], rnd), 1, rnd).forEach((round, ri) => { for (const [a, b] of round) addFx(S, a, b, ds[Math.min(ri, ds.length - 1)], def.fmt, k, 0); }); }
  S.fx.sort((a, b) => a.d - b.d); return S;
}

const di = (G) => (G.s.wd.di ??= { y: [], skip: [] });
function make(G) {
  const wd = G.s.wd; if (!wd || !ENABLED) return; const R = di(G);
  R.y = R.y.filter((y) => {
    let waiting = false; const iplId = `IPL-${y}`;
    if (!wd.seasons[iplId] && !R.skip.includes(iplId)) { if (D(y, 2, 14) < (R.from ?? wd.day)) R.skip.push(iplId); else wd.seasons[iplId] = buildIPL(y); }
    for (const p of PLAN) { const id = `${p.comp}-${y}`; if (wd.seasons[id] || R.skip.includes(id)) continue;
      if (p.rounds(y)[0] < (R.from ?? wd.day)) { R.skip.push(id); continue; }
      const dv = divisions(G, p.top ? p.comp : p.div, p.top ? p.div : p.comp, y); if (!dv) { waiting = true; continue; }
      wd.seasons[id] = buildDomestic(p, y, p.top ? dv.top : dv.low); }
    return waiting;
  });
  if (R.skip.length > 40) R.skip = R.skip.slice(-40);
}
function planner(G, y) { const wd = G.s.wd; if (!wd || !ENABLED) return []; const R = di(G); R.from ??= wd.day; if (!R.y.includes(y)) R.y.push(y); make(G); return []; }

// ----- knockouts and the Super League -----
// A drawn or tied knockout goes to the side listed first (the higher seed).
export const koWinner = (f) => f.res.w || f.a;
function resolve(S, ref, prev) {
  const w = /^W(\d+)$/.exec(ref); if (w) { const f = prev[+w[1]]; return f ? koWinner(f) : null; }
  const m = /^([A-Z]?)(\d+)$/.exec(ref); const row = standings(S.tables[m[1] || 'all'])[+m[2] - 1]; return row ? row.id : null;
}
function runStage(G, S, def) {
  const k = S.stage; const st = def.stages[k]; if (!st || st.type !== 'dko' || S.fx.some((f) => f.stage === k)) return;
  const p = PLAN_BY[S.comp]; const day = G.s.wd.day;
  if (st.sl) { const ds = p.sl(S.y); const put = (a, b, i, key) => { const d = Math.max(ds[Math.min(i, ds.length - 1)], day); S.end = Math.max(S.end, d); addFx(S, a, b, d, def.fmt, key, k); };
    const slots = []; for (const [key, refs] of Object.entries(st.sl)) { const ts = refs.map((r) => resolve(S, r, [])); if (ts.some((t) => !t)) return; S.tables[key] = Object.fromEntries(ts.map((t) => [t, blankRow()]));
      roundRobin(ts, 1, () => 0).forEach((round, ri) => round.forEach(([a, b]) => slots.push([a, b, ri, key]))); }
    for (const [a, b, ri, key] of slots) put(a, b, ri, key); return; }
  const ko_ = p.ko(S.y); const prev = S.fx.filter((f) => f.stage === k - 1 && f.grp === 'ko');
  st.pairs.forEach(([x, z], i) => { const a = resolve(S, x, prev), b = resolve(S, z, prev); if (!a || !b) return;
    const d = Math.max(ko_[def.stages.slice(0, k).filter((x) => x.pairs).length] ?? S.end, day); S.end = Math.max(S.end, d);
    addFx(S, a, b, d, def.fmt, 'ko', k, { ko: st.pairs.length > 1 ? `${st.code}${i + 1}` : st.code }); });
}
const mine = (S) => !!PLAN_BY[S.comp];
function tick(G) {
  const wd = G.s && G.s.wd; if (!wd || !ENABLED) return;
  for (const id in wd.seasons) { const S = wd.seasons[id]; if (!mine(S) || S.fin) continue; const def = COMPS[S.comp];
    if (!S.done) { runStage(G, S, def); continue; }
    const F = S.fx.find((f) => f.ko === 'F' && f.res); if (F) { const w = koWinner(F); S.champ = w; S.runner = w === F.a ? F.b : F.a; } else if (!S.champ) { const o = order(S); S.champ = o[0]; S.runner = o[1]; }
    S.fin = 1; }
  make(G); // after the titles are settled: promotion reads them
}

registerComps(DEFS, planner);
onTick(tick);
export { tick as indiaTick, make as indiaMake, PLAN as INDIA_PLAN };
