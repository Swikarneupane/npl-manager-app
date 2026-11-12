// ===== Domestic white-ball competitions, Ireland and the West Indies (W4) =====
// Same pattern as domestic-rest.js: the planner (called once a year by ensureYear) builds each season with its own
// round dates and returns nothing; a season whose first round is behind the save's start is skipped.
// State in the save: s.wd.dw2 = { pend: [years still to make], skip: [season ids skipped], from }.
//
// Built here:
//  - Inter-Provincial Trophy (Ireland, T20): three provinces, triple round robin (9 matches), no final. Munster Reds
//    were dropped in 2026. 2026 dates and pairings are the real ones (crictracker.com Inter-Provincial 2026 schedule);
//    en.wikipedia.org/wiki/Inter-Provincial_Trophy (format: the infobox says triple, the text says double; the nine
//    listed 2026 fixtures are a triple round robin). Points are not published: the usual 2/1/1 assumed.
//  - Super50 Cup (West Indies, 50 overs): six regional sides, single round robin, final between the top two
//    (2025-26: 19-29 Nov, all in Trinidad; Barbados Pride beat Trinidad and Tobago Red Force in the final). Points
//    4 a win, 2 a no-result (inferred from the 2025-26 table). en.wikipedia.org/wiki/2025-26_Super50_Cup. Round
//    days within the window are assumed (every second day); the 2026 edition's dates were not announced: in-game.
// Not built, because it could not be verified: Canada's national championship, the West Indies' men's domestic T20
// (the T20 Blaze found was the women's), Dutch and Scottish T20 leagues, a USA 2026 national championship squad list.
import { registerComps, COMPS } from './comps.js';
import { blankRow, roundRobin } from './comp.js';
import { dayOfDate } from './dates.js';
import { registry } from './players.js';

const D = (y, m, d) => dayOfDate(y, m, d); // months from 0
const ids = (code, list) => list.map((s) => `${code}-${s}`);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const STD = { win: 2, tie: 1, nr: 1, loss: 0 };
const S50_PTS = { win: 4, tie: 2, nr: 2, loss: 0 };

const DEFS = {
  'IRE-IPT': { id: 'IRE-IPT', name: 'Inter-Provincial Trophy', short: 'Interpro T20', kind: 'domestic', listA: true, host: 'IRE', fmt: 'T20', level: 2, window: ['Jun 2', 'Jun 17'], points: STD, stages: [{ type: 'rr', name: 'League' }] },
  'WI-S50': { id: 'WI-S50', name: 'CG United Super50 Cup', short: 'Super50', kind: 'domestic', listA: true, host: 'WI', fmt: 'ODI', level: 1, window: ['Nov 19', 'Nov 29'], points: S50_PTS, stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'final', name: 'Final' }] },
};

const IPT_TEAMS = ['LEI', 'NK', 'NWW'];
// 2026 fixtures: [month0, day, home, away] (crictracker.com)
const IPT = [[5, 2, 'NWW', 'LEI'], [5, 3, 'LEI', 'NK'], [5, 3, 'NWW', 'NK'], [5, 10, 'NK', 'NWW'], [5, 11, 'NWW', 'LEI'], [5, 11, 'NK', 'LEI'], [5, 16, 'LEI', 'NK'], [5, 17, 'NK', 'NWW'], [5, 17, 'LEI', 'NWW']];
const S50_TEAMS = ['BAR', 'GUY', 'JAM', 'LEE', 'TT', 'WIN'];

const PLAN = [
  { comp: 'IRE-IPT', start: (y) => D(y, 5, 2), end: (y) => D(y, 5, 17), teams: () => ids('IRE', IPT_TEAMS),
    layout(S, y) { for (const [m, d, a, b] of IPT) S.fx.push({ id: `${S.id}#R${S.fx.length}`, d: D(y, m, d), a: `IRE-${a}`, b: `IRE-${b}`, fmt: 'T20', stage: 0, grp: 'all', res: null }); } },
  { comp: 'WI-S50', start: (y) => D(y, 10, 19), end: (y) => D(y, 10, 29), teams: () => ids('WI', S50_TEAMS),
    layout(S, y, rnd) { const days = [19, 21, 23, 25, 27]; roundRobin(S.teams, 1).forEach((round, i) => round.forEach(([a, b]) => S.fx.push({ id: `${S.id}#R${S.fx.length}`, d: D(y, 10, days[i]), a, b, fmt: 'ODI', stage: 0, grp: 'all', res: null }))); } },
];
const PLAN_BY = Object.fromEntries(PLAN.map((p) => [p.comp, p]));

function build(p, y) {
  const def = COMPS[p.comp]; const id = `${p.comp}-${y}`;
  const S = { id, comp: p.comp, y, name: `${def.name} ${y}`, teams: p.teams(), fx: [], tables: {}, stage: 0, done: false, champ: null, runner: null, start: p.start(y), end: p.end(y) };
  S.tables.all = Object.fromEntries(S.teams.map((t) => [t, blankRow()]));
  p.layout(S, y, hash(id)); return S;
}
const st = (G) => (G.s.wd.dw2 ??= { pend: [], skip: [] });
function make(G) {
  const wd = G.s.wd; if (!wd) return; const R = st(G); registry(G);
  for (const y of R.pend || []) for (const p of PLAN) { const id = `${p.comp}-${y}`; if (wd.seasons[id] || R.skip.includes(id)) continue; if (p.start(y) < (R.from ?? wd.day)) { R.skip.push(id); continue; } wd.seasons[id] = build(p, y); }
  R.pend = [];
  if (R.skip.length > 60) R.skip = R.skip.slice(-60);
}
function planner(G, y) { const wd = G.s.wd; if (!wd) return []; const R = st(G); R.from ??= wd.day; (R.pend ??= []).push(y); make(G); return []; }
registerComps(DEFS, planner);
export const DOMESTIC_WEST2 = Object.keys(DEFS);
