// ===== Domestic white-ball cricket of Sri Lanka and Bangladesh (W4) =====
// Sri Lanka's Major Clubs T20 and 50-over tournaments; Bangladesh's Dhaka Premier Division League (List A) and
// the new franchise D3 (T20 and one-day). Checked November 2026; every season that ends before the save
// starts is skipped. Seasons are built here (same pattern as leagues-asia.js); comp.js runs the stages.
// Simplifications are named next to each definition.
import { registerComps, COMPS } from './comps.js';
import { blankRow, roundRobin } from './comp.js';
import { onTick } from './state.js';
import { dayOfDate } from './dates.js';

const D = (y, m, d) => dayOfDate(y, m, d);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffled = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const T = (nat, l) => l.map((s) => `${nat}-${s}`);
let ENABLED = true;
export const setDomesticSlBanEnabled = (on) => { ENABLED = !!on; };
export const ONE_DAY = { win: 2, tie: 1, nr: 1, loss: 0 };

// Sri Lanka Major Clubs T20 2026: two groups of seven, six games each, top four of each group to the
// quarter-finals, semi-finals and final; planned 23 to 31 May 2026, then postponed by weather (it ran from
// August). ft.lk, "SLC's Major Club season to start with T20 tourney as relegation battle begins" (May 2026);
// thepapare.com reports. Groups as published. comp.js has no quarter-finals: the top two of each group
// play cross semi-finals and a final (a simplification). Points aren't published: 2 a win assumed.
const SL_T20_GROUPS = [['CCC', 'MOORS', 'BRC', 'TU', 'NUG', 'KYCC', 'BAD'], ['PAN', 'NCC', 'SSC', 'POL', 'COLTS', 'BLM', 'ACE']];
// Major Clubs 50-over 2026: 14 clubs, semi-finals (SSC v CCC, Moors v Colts) and a final Moors beat SSC by
// 25 runs on 11 Sep 2026 (mykhel.com scorecards). The group draw wasn't found: the T20 groups are reused
// (in-game). Same simplification: top two of each group to the semi-finals.
// Bangladesh Dhaka Premier Division Cricket League 2026 (List A): 12 clubs, single round robin, 66 matches,
// 4 May to 13 June 2026, the table decides the title (Mohammedan champions, Abahani runners-up). The bottom
// two go down to the Dhaka First Division, which isn't in the game: the 2026 twelve are kept each year.
// en.wikipedia.org/wiki/2026_Dhaka_Premier_Division_Cricket_League. 2 for a win, 1 for a tie or no result.
const DPL = ['ABA', 'AGR', 'BSH', 'BRU', 'CIT', 'LEO', 'GAZ', 'GUL', 'LEG', 'MOH', 'PBC', 'RUP'];
// D3 (BCB franchise competition, 2026-27): six franchises (Walton, Fortune, ACME, Seven Rings Cement, H
// Bluestar, Citizens Bank), 42 matches: 19 T20 (from 15 Dec 2026), 16 one-day (May 2027), 7 four-day (Jan
// 2027, not built here). sportsdunia.com; crictracker.com. The split fits a single round robin plus the IPL
// playoffs (15+4) for the T20 and plus a final (15+1) for the one-day; those playoff shapes are inferred.
const D3 = ['WAL', 'FOR', 'ACM', 'SRC', 'HBS', 'CTZ'];

const PLAN = {
  'SL-T20': { host: 'SL', name: 'Major Clubs T20 Tournament', short: 'Major T20', fmt: 'T20', level: 1, groups: SL_T20_GROUPS.map((g) => T('SL', g)), from: [4, 23], to: [5, 3], end: [5, 7], ko: 'semis' },
  'SL-50': { host: 'SL', name: 'Major Clubs 50-over Tournament', short: 'Major 50', fmt: 'ODI', level: 1, groups: SL_T20_GROUPS.map((g) => T('SL', g)), from: [7, 15], to: [8, 5], end: [8, 12], ko: 'semis' },
  'BAN-DPL': { host: 'BAN', name: 'Dhaka Premier Division Cricket League', short: 'DPL', fmt: 'ODI', level: 1, teams: T('BAN', DPL), from: [4, 4], to: [5, 13], end: [5, 13], ko: null },
  'BAN-D3T': { host: 'BAN', name: 'D3 T20', short: 'D3 T20', fmt: 'T20', level: 1, teams: T('BAN', D3), from: [11, 15], to: [0, 3], end: [0, 10], ko: 'ipl4' },
  'BAN-D3L': { host: 'BAN', name: 'D3 One-Day', short: 'D3 50', fmt: 'ODI', level: 1, teams: T('BAN', D3), from: [4, 5], to: [4, 26], end: [4, 28], ko: 'top2' },
};
export const SLBAN_COMPS = Object.keys(PLAN);
const DEFS = Object.fromEntries(Object.entries(PLAN).map(([id, p]) => [id, { id, kind: 'domestic', listA: true, name: p.name, short: p.short, host: p.host, fmt: p.fmt, level: p.level, window: [p.from, p.end], points: ONE_DAY,
  stages: [{ type: 'rr', name: 'League', ...(p.groups ? { groups: p.groups } : {}) }, ...(p.ko ? [{ type: 'ko', plan: p.ko, name: 'Playoffs' }] : [])] }]));
for (const d of Object.values(DEFS)) { const [a, b] = d.window; const nm = (x) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][x[0]] + ' ' + x[1]; d.window = [nm(a), nm(b)]; }

const dd = (y, [m, d]) => D(y, m, d);
function build(id0, y) {
  const p = PLAN[id0]; const id = `${id0}-${y}`; const rnd = rng(hash(id));
  const groups = p.groups || [p.teams]; const teams = groups.flat(); const s0 = dd(y, p.from); const l1 = dd(y + (p.to[0] < p.from[0] ? 1 : 0), p.to); const end = dd(y + (p.end[0] < p.from[0] ? 1 : 0), p.end);
  const S = { id, comp: id0, y, name: `${COMPS[id0].name} ${y}`, teams, fx: [], tables: {}, stage: 0, done: false, champ: null, runner: null, start: s0, end };
  const list = [];
  groups.forEach((g, gi) => { const key = p.groups ? String.fromCharCode(65 + gi) : 'all'; S.tables[key] = Object.fromEntries(g.map((t) => [t, blankRow()]));
    roundRobin(shuffled(g, rnd), 1, rnd).forEach((r, ri) => r.forEach(([a, b]) => list.push({ a, b, grp: key, ri }))); });
  list.sort((x, z) => x.ri - z.ri);
  list.forEach((x, i) => S.fx.push({ id: `${id}#R${i}`, d: s0 + Math.floor((i * (l1 - s0)) / Math.max(1, list.length - 1)), a: x.a, b: x.b, fmt: p.fmt, stage: 0, grp: x.grp, res: null }));
  return S;
}
const ds = (G) => (G.s.wd.dsb ??= { y: [], skip: [] });
export function domesticSlBanMake(G) {
  const wd = G.s.wd; if (!wd || !ENABLED) return; const R = ds(G);
  for (const y of R.y) for (const c of SLBAN_COMPS) { const id = `${c}-${y}`; if (wd.seasons[id] || R.skip.includes(id)) continue;
    if (dd(y, PLAN[c].from) < (R.from ?? wd.day)) { R.skip.push(id); continue; } wd.seasons[id] = build(c, y); }
  R.y = []; if (R.skip.length > 40) R.skip = R.skip.slice(-40);
}
function planner(G, y) { const wd = G.s.wd; if (!wd || !ENABLED) return []; const R = ds(G); R.from ??= wd.day; if (!R.y.includes(y)) R.y.push(y); domesticSlBanMake(G); return []; }
// Scorecards go after 3 days; the league's own archive (world.js) handles old seasons.
function tick(G) {
  const wd = G.s && G.s.wd; if (!wd || !ENABLED) return;
  for (const id of Object.keys(wd.seasons)) { const S = wd.seasons[id]; if (!PLAN[S.comp]) continue; for (const f of S.fx) { if (f.card && wd.day - f.d > 3) delete f.card; if (f.res && wd.day - f.d > 14) { delete f.res.top; delete f.res.pom; } } }
  domesticSlBanMake(G);
}
registerComps(DEFS, planner);
onTick(tick);
export { tick as domesticSlBanTick };
