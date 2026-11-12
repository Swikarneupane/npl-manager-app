// ===== Franchise leagues of the rest of Asia and the Gulf (W3): PSL, BPL, LPL, ILT20, APL =====
// Teams, formats and windows checked in Nov 2026 (sources are in src/data/world/leagues/<CODE>.js):
//  - PSL 11: 8 teams in two groups of four; each plays 10 league games (twice against its group, once against
//    the other group), then the page playoff (Q1, Eliminator, Q2, Final): 44 matches. 26 Mar to 3 May 2026.
//    en.wikipedia.org/wiki/2026_Pakistan_Super_League
//  - BPL 2025-26: 6 teams, double round robin, then Eliminator, Qualifier 1, Qualifier 2 and Final: 34 matches.
//    26 Dec 2025 to 23 Jan 2026. en.wikipedia.org/wiki/2025–26_Bangladesh_Premier_League
//  - LPL 6 (2026): 5 teams, double round robin (20), top four to the page playoff. 17 Jul to 8 Aug 2026.
//  - ILT20 season 5: 6 teams, 30 league games and 4 playoffs, 22 Nov to 20 Dec 2026 (arabnews.pk, thenews.pk).
//  - APL: revived for 27 Dec 2026 in the UAE with five teams. Its format, points and dates after the start are NOT
//    published: double round robin and a page playoff are an in-game assumption. Two of the five franchises were
//    still unsold in Oct 2026, so APL-PAK and APL-NAN are placeholders.
// Points are 2 for a win, 1 for a no result (the PSL, LPL and BPL tables fit it). Dates are kept, month and day,
// in later years. A season whose first match is before the save's start is skipped. Everything played after the
// save starts is simulated. The seasons are made by the planner the way domestic-asia.js makes its own; the
// knockouts are comp.js's own 'ipl4' plan. State: s.wd.la = { y: [years still being made], skip: [ids], from }.
import { registerComps, COMPS } from './comps.js';
import { blankRow, roundRobin } from './comp.js';
import { onTick } from './state.js';
import { dayOfDate } from './dates.js';
import { st as intlSt, lastDay } from './intl.js';

const D = (y, m, d) => dayOfDate(y, m, d);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffled = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

let ENABLED = true;
export const setLeaguesAsiaEnabled = (on) => { ENABLED = !!on; };

export const POINTS = { win: 2, tie: 1, nr: 1, loss: 0 };
const T = (L, list) => list.map((s) => `${L}-${s}`);
// league: teams, groups (PSL only), window (start [m,d] of the league games, last league day, season end; months
// past 11 fall in the next year) and the recruitment rules (copied from the module).
export const LEAGUE_PLAN = {
  PSL: { teams: T('PSL', ['QUE', 'KAR', 'LHQ', 'PES', 'ISL', 'MUL', 'HYD', 'RWP']), groups: [['QUE', 'KAR', 'LHQ', 'PES'], ['ISL', 'MUL', 'HYD', 'RWP']], from: [2, 26], to: [3, 26], end: [4, 3] },
  BPL: { teams: T('BPL', ['CHR', 'DHC', 'NOX', 'RAJ', 'RAN', 'SYL']), from: [11, 26], to: [12, 18], end: [12, 23] },
  LPL: { teams: T('LPL', ['COL', 'DAM', 'GAL', 'JAF', 'KAN']), from: [6, 17], to: [7, 3], end: [7, 8] },
  ILT20: { teams: T('ILT20', ['ADK', 'DV', 'DC', 'GG', 'MIE', 'SHW']), from: [10, 22], to: [11, 14], end: [11, 20] },
  APL: { teams: T('APL', ['KAB', 'BAL', 'KAN', 'PAK', 'NAN']), from: [11, 27], to: [12, 14], end: [12, 20] },
};
const INFO = {
  PSL: ['Pakistan Super League', 'PAK', 'PSL', 'Mar 26', 'May 3', { min: 18, max: 23, overseas: { max: 9, xi: 4 }, recruit: 'auction', retain: 4 }],
  BPL: ['Bangladesh Premier League', 'BAN', 'BPL', 'Dec 26', 'Jan 23', { min: 18, max: 20, overseas: { max: 6, xi: 4 }, recruit: 'auction', retain: 2 }],
  LPL: ['Lanka Premier League', 'SL', 'LPL', 'Jul 17', 'Aug 8', { min: 17, max: 20, overseas: { max: 9, xi: 4 }, recruit: 'draft', retain: 4 }],
  ILT20: ['International League T20', 'UAE', 'ILT20', 'Nov 22', 'Dec 20', { min: 18, max: 23, overseas: { max: null, xi: null }, recruit: 'auction', retain: 4 }],
  APL: ['Afghanistan Premier League', 'AFG', 'APL', 'Dec 27', 'Jan 20', { min: 18, max: 23, overseas: { max: 8, xi: 4 }, recruit: 'draft', retain: 0 }],
};
export const LEAGUE_COMPS = Object.keys(INFO);
const DEFS = Object.fromEntries(Object.entries(INFO).map(([id, [name, host, short, a, b, squad]]) => [id, {
  id, name, short, host, kind: 'franchise', listA: true, fmt: 'T20', level: id === 'PSL' || id === 'ILT20' ? 1 : 2, window: [a, b], points: POINTS, squad,
  stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'ipl4', name: 'Playoffs' }],
}]));

// The league games as [a, b] pairs: PSL's own scheme, else a double round robin.
function pairs(L, y, rnd) {
  const p = LEAGUE_PLAN[L];
  if (p.groups) { const out = []; const g = p.groups.map((x) => x.map((s) => `${L}-${s}`));
    for (const grp of g) for (const r of roundRobin(shuffled(grp, rnd), 2, rnd)) out.push(...r);
    const [A, B] = g; for (const a of shuffled(A, rnd)) for (const b of shuffled(B, rnd)) out.push(rnd() < 0.5 ? [a, b] : [b, a]);
    return shuffled(out, rnd); }
  return roundRobin(shuffled(p.teams, rnd), 2, rnd).flat();
}
function build(L, y) {
  const p = LEAGUE_PLAN[L]; const def = COMPS[L]; const id = `${L}-${y}`; const rnd = rng(hash(id)); const list = pairs(L, y, rnd);
  const s0 = D(y, p.from[0], p.from[1]), l1 = D(y + (p.to[0] > 11 ? 1 : 0), p.to[0] % 12, p.to[1]), end = D(y + (p.end[0] > 11 ? 1 : 0), p.end[0] % 12, p.end[1]);
  const S = { id, comp: L, y, name: `${def.name} ${y}`, teams: p.teams.slice(), fx: [], tables: { all: Object.fromEntries(p.teams.map((t) => [t, blankRow()])) }, stage: 0, done: false, champ: null, runner: null, start: s0, end };
  list.forEach(([a, b], i) => S.fx.push({ id: `${id}#R${i}`, d: s0 + Math.floor((i * (l1 - s0)) / Math.max(1, list.length - 1)), a, b, fmt: 'T20', stage: 0, grp: 'all', res: null }));
  S.fx.sort((x, z) => x.d - z.d); return S;
}
const la = (G) => (G.s.wd.la ??= { y: [], skip: [] });
export function leaguesAsiaMake(G) {
  const wd = G.s.wd; if (!wd || !ENABLED) return; const R = la(G);
  for (const y of R.y) for (const L of LEAGUE_COMPS) { const id = `${L}-${y}`; if (wd.seasons[id] || R.skip.includes(id)) continue;
    const p = LEAGUE_PLAN[L]; if (D(y, p.from[0], p.from[1]) < (R.from ?? wd.day)) { R.skip.push(id); continue; } wd.seasons[id] = build(L, y); }
  R.y = []; if (R.skip.length > 40) R.skip = R.skip.slice(-40);
}
function planner(G, y) { const wd = G.s.wd; if (!wd || !ENABLED) return []; const R = la(G); R.from ??= wd.day; if (!R.y.includes(y)) R.y.push(y); leaguesAsiaMake(G); return []; }

// Compaction (world.js's archive only knows 'domestic' seasons): scorecards go after 3 days; 45 days after the
// end only the knockouts and tables stay; after three years the season is one archive line.
function tick(G) {
  const wd = G.s && G.s.wd; if (!wd || !ENABLED) return; const day = wd.day;
  for (const id of Object.keys(wd.seasons)) { const S = wd.seasons[id]; if (!INFO[S.comp]) continue;
    for (const f of S.fx) { if (f.card && day - f.d > 3) delete f.card; if (f.res && day - f.d > 14) { delete f.res.top; delete f.res.pom; } }
    if (!S.done) continue; const last = lastDay(S); S.mg = 1;
    if (!S.old && day - last > 45) { S.old = 1; S.fx = S.fx.filter((f) => f.ko); for (const f of S.fx) { delete f.card; if (f.res) { delete f.res.top; delete f.res.pom; } } }
    if (day - last > 1095) { intlSt(G).arc.push([id, `${S.champ || ''} won${S.runner ? `, ${S.runner} runners-up` : ''}`, last]); delete wd.seasons[id]; if (wd.st) delete wd.st[id]; } }
  leaguesAsiaMake(G);
}
registerComps(DEFS, planner);
onTick(tick);
export { tick as leaguesAsiaTick };
