// ===== Zimbabwe's white-ball domestic competitions (W4): the Pro50 Championship and the Domestic T20 =====
// Both are played by the five Zimbabwe Cricket franchises (Mashonaland Eagles, Mountaineers, Matabeleland
// Tuskers, Mid West Rhinos, Southern Rocks), the same ids the Logan Cup uses (ZIM-ME, MOU, MT, MWR, SR).
// Sources (checked Nov 2026): en.wikipedia.org/wiki/2025–26_Pro50_Championship (double round robin, top two to a
// final, 31 Oct 2025 to 11 Apr 2026, Southern Rocks champions); en.wikipedia.org/wiki/2025–26_Zimbabwe_Domestic_Twenty20
// (five teams, double round robin, 8 Dec 2025 to 11 Jan 2026, win 2 / bonus-point win 3 / no result 1, Mid West Rhinos
// champions). The 2026-27 schedules were not found, so the 2025-26 windows are kept (month and day) and the round
// dates are in-game: they are set clear of the Logan Cup's four-day rounds so no franchise plays twice a day.
// Points here: 2 for a win and 1 for a no result (comp.js has no bonus-point win for the T20).
// Not built because nothing could be verified (teams, format, squads): the main white-ball competitions of
// Uganda, Kenya, Tanzania, Papua New Guinea, Nigeria and Botswana. Namibia's Desert Ice T20 League (eight
// club-style sides, May to August 2026, we.com.na) has no registered squads and no matching team ids, so it is left out.
import { registerComps, COMPS } from './comps.js';
import { blankRow, standings, roundRobin } from './comp.js';
import { onTick } from './state.js';
import { dayOfDate } from './dates.js';
import { registry } from './players.js';

const D = (y, m, d) => dayOfDate(y, m, d);
const days = (y, md) => md.map(([m, d]) => D(y, m, d));
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffled = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const PTS = { win: 2, tie: 1, nr: 1, loss: 0 };
const dm = (o) => ({ kind: 'domestic', listA: true, level: 2, host: 'ZIM', points: PTS, ...o });
const DEFS = {
  'ZIM-P50': dm({ id: 'ZIM-P50', name: 'Pro50 Championship', short: 'Pro50', fmt: 'ODI', window: ['Oct 31', 'Apr 11'], stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'final', name: 'Final' }] }),
  'ZIM-T20': dm({ id: 'ZIM-T20', name: 'Zimbabwe Domestic T20', short: 'Domestic T20', fmt: 'T20', window: ['Dec 12', 'Jan 2'], stages: [{ type: 'rr', name: 'League' }] }),
};
const TEAMS = ['ZIM-ME', 'ZIM-MOU', 'ZIM-MT', 'ZIM-MWR', 'ZIM-SR'];
// Round dates (month from 0, 12 = next January). Clear of the Logan Cup rounds (four days from 26 Oct, 9 Nov, 23 Nov, 7 Dec, 11 Jan ...).
const PLAN = [
  { comp: 'ZIM-P50', dates: (y) => days(y, [[9, 31], [10, 3], [10, 6], [10, 15], [10, 18], [10, 28], [11, 1], [11, 4], [12, 17], [12, 20]]), start: (y) => D(y, 9, 31), end: (y) => D(y + 1, 3, 11), fmt: 'ODI' },
  { comp: 'ZIM-T20', dates: (y) => days(y, [[11, 12], [11, 14], [11, 16], [11, 18], [11, 20], [11, 22], [11, 26], [11, 28], [11, 30], [12, 2]]), start: (y) => D(y, 11, 12), end: (y) => D(y + 1, 0, 2), fmt: 'T20' },
];
const PLAN_BY = Object.fromEntries(PLAN.map((p) => [p.comp, p]));
function build(G, p, y) {
  registry(G); const def = COMPS[p.comp]; const id = `${p.comp}-${y}`; const r = rng(hash(id));
  const S = { id, comp: p.comp, y, name: `${def.name} ${y}–${String(y + 1).slice(2)}`, teams: TEAMS.slice(), fx: [], tables: {}, stage: 0, done: false, champ: null, runner: null, start: p.start(y), end: p.end(y) };
  S.tables.all = Object.fromEntries(S.teams.map((t) => [t, blankRow()]));
  const rr = roundRobin(shuffled(S.teams, r), 1); const all = [...rr, ...rr.map((x) => x.map(([a, b]) => [b, a]))]; const ds = p.dates(y);
  ds.forEach((d, i) => all[i % all.length].forEach(([a, b], k) => S.fx.push({ id: `${id}#Z${S.fx.length}`, d, a, b, fmt: p.fmt, stage: 0, grp: 'all', res: null })));
  return S;
}
const zr = (G) => (G.s.wd.zo ??= { skip: [], from: null });
function planner(G, y) {
  const wd = G.s.wd; if (!wd) return []; const R = zr(G); R.from ??= wd.day;
  for (const p of PLAN) { const id = `${p.comp}-${y}`; if (wd.seasons[id] || R.skip.includes(id)) continue; if (p.start(y) < R.from) { R.skip.push(id); continue; } wd.seasons[id] = build(G, p, y); }
  if (R.skip.length > 20) R.skip = R.skip.slice(-20);
  return [];
}
// A league-only season is decided by its table.
function tick(G) {
  const wd = G.s && G.s.wd; if (!wd) return;
  for (const id in wd.seasons) { const S = wd.seasons[id]; if (!PLAN_BY[S.comp] || !S.done || S.champ) continue; const o = standings(S.tables.all).map((r) => r.id); S.champ = o[0]; S.runner = o[1]; }
}
registerComps(DEFS, planner);
onTick(tick);
export const DOMESTIC_OA = Object.keys(DEFS);
