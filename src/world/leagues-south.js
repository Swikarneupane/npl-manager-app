// ===== Oceania and Africa leagues (W3): BBL, Marsh One-Day Cup, SA20, CSA Pro20 Cup, Super Smash, Ford Trophy =====
// Teams, formats and windows were checked in Nov 2026; the sources are beside each definition and in the data
// modules (src/data/world/leagues/<CODE>.js). Dates from the announced 2026-27 fixtures are kept, month and day,
// in later years; where nothing was published they are assumed and marked "in-game". Everything played after
// the save starts is simulated. All are AI competitions here: the club-job layer (recruit.js) reads the same
// rules from the modules.
//
// Seasons are made by the planner (like domestic-rest.js): it records the year and builds the seasons with their
// own round dates, returning nothing for ensureYear to make. A season whose first round is already behind the
// save's start is skipped. State in the save: s.wd.ls = { y, skip, from }.
//
// Finals: the BBL (Qualifier, Knockout, Challenger, Final) and SA20 (Qualifier 1, Eliminator, Qualifier 2, Final)
// have the same top-four shape as comp.js's 'ipl4' plan. The Marsh Cup final is top two ('final'). The Pro20 Cup
// plays a Super 8s then semi-finals and a final ('super' and 'semis'). The Super Smash and the Ford Trophy let the
// top side wait for the winner of 2nd v 3rd: two 'dko' stages whose fixtures the tick below makes.
import { registerComps, COMPS } from './comps.js';
import { blankRow, standings, roundRobin } from './comp.js';
import { onTick } from './state.js';
import { dayOfDate } from './dates.js';
import { registry } from './players.js';

const D = (y, m, d) => dayOfDate(y, m, d); // months from 0
const ids = (code, list) => list.map((s) => `${code}-${s}`);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffled = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const seasonLabel = (y) => `${y}–${String(y + 1).slice(2)}`;

// ----- points (comp.js has no run-rate bonus point, so it is left out) -----
// SA20: win 4, no result 2, plus 1 bonus for a run-rate 1.25 times the opponent's (left out).
// en.wikipedia.org/wiki/2026_SA20. The Super Smash table (14 = 3 wins + 1 no result) and the Ford Trophy follow
// the same 4 / 2 / 2 + bonus scheme (en.wikipedia.org/wiki/2025–26_Ford_Trophy). Marsh Cup: win 4, tie 2
// (en.wikipedia.org/wiki/2025–26_One-Day_Cup). The BBL's and the Pro20's points could not be verified: the same
// 4 / 2 / 2 is assumed.
const PTS = { win: 4, tie: 2, nr: 2, loss: 0 };

// ----- definitions and rules (copied from the data modules) -----
const fr = (o) => ({ kind: 'franchise', listA: true, level: 1, ...o });
const dm = (o) => ({ kind: 'domestic', listA: true, ...o });
const DEFS = {
  // BBL|16: 12 Dec 2026 (opener in Chennai) to the final on Australia Day, 26 Jan 2027; double round-robin
  // shape of ten games each (three opponents twice, four once), 40 matches; top four: Qualifier 1v2, Knockout 3v4,
  // Challenger, Final. cricket.com.au/news/4534480, en.wikipedia.org/wiki/Big_Bash_League
  BBL: fr({ id: 'BBL', name: 'Big Bash League', short: 'BBL', host: 'AUS', fmt: 'T20', window: ['Dec 12', 'Jan 26'], points: PTS, rules: { min: 18, max: 23, overseas: { max: 5, xi: 3 }, recruit: 'draft', retain: 0, rookies: 2, draftMin: 2, preSign: 1, marquee: 2 },
    stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'ipl4', name: 'Finals' }] }),
  // SA20 season 5: 17 Jan to the final at Newlands, 21 Feb 2027; each side twice (10 games), top four.
  // mediabrief.com/sa20-announces-playoff-venues-and-fixtures/, en.wikipedia.org/wiki/2026_SA20
  SA20: fr({ id: 'SA20', name: 'SA20', short: 'SA20', host: 'SA', fmt: 'T20', window: ['Jan 17', 'Feb 21'], points: PTS, rules: { min: 17, max: 20, overseas: { max: 7, xi: 4 }, recruit: 'auction', retain: 5, purse: null },
    stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'ipl4', name: 'Playoffs' }] }),
  // Marsh One-Day Cup (the 2026-27 Dean Jones Trophy): six states, seven games each, the top two in the final
  // (14 Feb 2027). Round dates after the 18 Sep opening are assumed. en.wikipedia.org/wiki/2025–26_One-Day_Cup
  MARSH: dm({ id: 'MARSH', name: 'Marsh One-Day Cup', short: 'Marsh Cup', host: 'AUS', fmt: 'ODI', level: 1, window: ['Sep 18', 'Feb 14'], points: PTS, rules: { min: 18, max: 25, recruit: 'contract', overseas: { max: 0, xi: 0 } },
    stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'final', name: 'Final' }] }),
  // CSA Pro20 Cup 2026-27 (the T20 Challenge and Knockout merged): 16 sides in two pools of eight, each plays its
  // pool once; the top four of each pool go to a Super 8s against the other pool's qualifiers; top four to the
  // semi-finals; final 14 Nov. timeslive.co.za (2026-09-23). Round dates assumed (25 Sep start is real).
  CSAT20: dm({ id: 'CSAT20', name: 'CSA Pro20 Cup', short: 'Pro20 Cup', host: 'SA', fmt: 'T20', level: 1, window: ['Sep 25', 'Nov 14'], points: PTS, rules: { min: 18, max: 25, recruit: 'contract' },
    stages: [{ type: 'rr', name: 'Pools' }, { type: 'super', take: 4, gap: 2, name: 'Super 8s' }, { type: 'ko', plan: 'semis', name: 'Finals' }] }),
  // Super Smash: six sides, ten games each, top three: 1st to the final, 2nd v 3rd in the Elimination Final.
  // en.wikipedia.org/wiki/2025–26_Super_Smash_(men's_cricket). The 2026-27 schedule was not out (due late
  // September): the window is in-game.
  SMASH: dm({ id: 'SMASH', name: 'Super Smash', short: 'Smash', host: 'NZ', fmt: 'T20', level: 1, window: ['Dec 17', 'Jan 31'], points: PTS, rules: { min: 18, max: 25, recruit: 'contract' },
    stages: [{ type: 'rr', name: 'League' }, { type: 'dko', ko: true, name: 'Elimination Final' }, { type: 'dko', ko: true, name: 'Final' }] }),
  // Ford Trophy 2026-27: six sides, ten rounds (five from 28 Oct, five in February), finals weekend 19 to 21 Feb at
  // the Basin Reserve: Elimination Final 2nd v 3rd, then the Grand Final. nzc.nz (schedule), en.wikipedia.org/wiki/2025–26_Ford_Trophy
  FORD: dm({ id: 'FORD', name: 'Ford Trophy', short: 'Ford Trophy', host: 'NZ', fmt: 'ODI', level: 1, window: ['Oct 28', 'Feb 21'], points: PTS, rules: { min: 18, max: 25, recruit: 'contract' },
    stages: [{ type: 'rr', name: 'League' }, { type: 'dko', ko: true, name: 'Elimination Final' }, { type: 'dko', ko: true, name: 'Final' }] }),
};

// ----- schedules -----
const S_ = (G, id) => G.s.wd.seasons[id] || null;
let fxN = 0;
function addFx(S, a, b, d, fmt, grp, stage, extra) { S.fx.push({ id: `${S.id}#L${(fxN++).toString(36)}`, d, a, b, fmt, stage, grp, res: null, ...(extra || {}) }); }
const rounds = (S, teams, plan, dates, fmt, grp = 'all') => plan.forEach((r, i) => r.forEach(([a, b]) => addFx(S, a, b, dates[i], fmt, grp, 0)));
const flip = (r) => r.map(([a, b]) => [b, a]);
const days = (y, md) => md.map(([m, d]) => D(y, m, d));
const step = (start, n, k) => Array.from({ length: n }, (_, i) => start + i * k);

const PLAN = [
  { comp: 'BBL', start: (y) => D(y, 11, 12), end: (y) => D(y + 1, 0, 26), teams: () => ids('BBL', ['ADS', 'HEA', 'HUR', 'REN', 'STA', 'SCO', 'SIX', 'THU']),
    layout(S, y, r) { const t = shuffled(S.teams, r); const single = roundRobin(t, 1);
      const p = (i, j) => [t[i], t[j]]; const extra = [[0, 1, 2, 3].map((i) => p(i, i + 4)), [p(0, 1), p(2, 3), p(4, 5), p(6, 7)], [p(1, 2), p(3, 4), p(5, 6), p(7, 0)]];
      const all = [...single.slice(0, 3), extra[0], ...single.slice(3, 5), extra[1], ...single.slice(5), extra[2]].map((x, i) => (i % 2 ? flip(x) : x));
      rounds(S, S.teams, all, days(y, [[11, 12], [11, 15], [11, 19], [11, 24], [11, 27], [11, 31], [12, 3], [12, 7], [12, 11], [12, 16]]), 'T20'); } },
  { comp: 'SA20', start: (y) => D(y, 0, 17), end: (y) => D(y, 1, 21), teams: () => ids('SA20', ['DSG', 'JSK', 'MICT', 'PRL', 'PRC', 'SEC']),
    layout(S, y, r) { rounds(S, S.teams, roundRobin(shuffled(S.teams, r), 2), step(D(y, 0, 17), 10, 3).map((d, i) => d + (i === 9 ? 1 : 0)), 'T20'); } },
  { comp: 'MARSH', start: (y) => D(y, 8, 18), end: (y) => D(y + 1, 1, 14), teams: () => ids('MARSH', ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS']),
    layout(S, y, r) { const t = shuffled(S.teams, r); const single = roundRobin(t, 1); const p = (i, j) => [t[i], t[j]];
      const all = [...single, [p(0, 1), p(2, 3), p(4, 5)], [p(1, 2), p(3, 4), p(5, 0)]].map((x, i) => (i % 2 ? flip(x) : x));
      rounds(S, S.teams, all, days(y, [[8, 18], [8, 25], [9, 3], [9, 10], [9, 17], [9, 24], [10, 1]]), 'ODI'); } },
  { comp: 'CSAT20', start: (y) => D(y, 8, 25), end: (y) => D(y, 10, 14), teams: () => ids('CSAT20', ['WP', 'BOL', 'KNI', 'TIT', 'MPU', 'EAS', 'KZI', 'EME', 'NW', 'LIO', 'WAR', 'DOL', 'LIM', 'SWD', 'BOR', 'NC']),
    layout(S, y, r) { const pools = [S.teams.slice(0, 8), S.teams.slice(8)]; S.tables = {}; const ds = step(D(y, 8, 25), 7, 3);
      pools.forEach((g, gi) => { const key = 'AB'[gi]; S.tables[key] = Object.fromEntries(g.map((t) => [t, blankRow()])); rounds(S, g, roundRobin(shuffled(g, r), 1), ds, 'T20', key); }); } },
  { comp: 'SMASH', start: (y) => D(y, 11, 17), end: (y) => D(y + 1, 0, 31), el: (y) => D(y + 1, 0, 25), teams: () => ids('SMASH', ['AUC', 'NDI', 'CTD', 'WEL', 'CAN', 'OTA']),
    layout(S, y, r) { rounds(S, S.teams, roundRobin(shuffled(S.teams, r), 2), step(D(y, 11, 17), 10, 4), 'T20'); } },
  { comp: 'FORD', start: (y) => D(y, 9, 28), end: (y) => D(y + 1, 1, 21), el: (y) => D(y + 1, 1, 20), teams: () => ids('FORD', ['AUC', 'NDI', 'CTD', 'WEL', 'CAN', 'OTA']),
    layout(S, y, r) { rounds(S, S.teams, roundRobin(shuffled(S.teams, r), 2), [...step(D(y, 9, 28), 5, 4), ...step(D(y + 1, 1, 3), 5, 3)], 'ODI'); } },
];
const PLAN_BY = Object.fromEntries(PLAN.map((p) => [p.comp, p]));

function build(G, p, y) {
  registry(G); const def = COMPS[p.comp]; const id = `${p.comp}-${y}`; const rnd = rng(hash(id)); const franchise = def.kind === 'franchise';
  const S = { id, comp: p.comp, y, name: `${def.name} ${franchise && p.comp === 'BBL' ? seasonLabel(y) : p.comp === 'SA20' ? y : ['SMASH', 'FORD', 'MARSH'].includes(p.comp) ? seasonLabel(y) : y}`, teams: p.teams(), fx: [], tables: {}, stage: 0, done: false, champ: null, runner: null, start: p.start(y), end: p.end(y) };
  S.tables.all = Object.fromEntries(S.teams.map((t) => [t, blankRow()])); if (p.comp === 'CSAT20') delete S.tables.all;
  p.layout(S, y, rnd); return S;
}
const ls = (G) => (G.s.wd.ls ??= { y: [], skip: [] });
function planner(G, y) {
  const wd = G.s.wd; if (!wd) return []; const R = ls(G); R.from ??= wd.day;
  for (const p of PLAN) { const id = `${p.comp}-${y}`; if (wd.seasons[id] || R.skip.includes(id)) continue; if (p.start(y) < R.from) { R.skip.push(id); continue; } wd.seasons[id] = build(G, p, y); }
  if (R.skip.length > 40) R.skip = R.skip.slice(-40);
  return [];
}

// ----- the Super Smash and Ford Trophy knockouts -----
const koW = (f) => f.res.w || f.a;
function tick(G) {
  const wd = G.s && G.s.wd; if (!wd) return;
  for (const id in wd.seasons) { const S = wd.seasons[id]; const p = PLAN_BY[S.comp]; if (!p || !p.el || S.fin) continue; const def = COMPS[S.comp]; const k = S.stage; const st = def.stages[k];
    if (!S.done && st && st.type === 'dko' && !S.fx.some((f) => f.stage === k)) {
      const T = standings(S.tables.all).map((r) => r.id);
      if (k === 1) { const d = Math.max(p.el(S.y), wd.day); S.end = Math.max(S.end, d + 1); addFx(S, T[1], T[2], d, def.fmt, 'ko', 1, { ko: 'EL' }); }
      else { const el = S.fx.find((f) => f.ko === 'EL'); const d = Math.max(S.end, wd.day, el.d + 1); S.end = d; addFx(S, T[0], koW(el), d, def.fmt, 'ko', 2, { ko: 'F' }); }
      continue; }
    if (S.done) { const F = S.fx.find((f) => f.ko === 'F' && f.res); if (F) { S.champ = koW(F); S.runner = S.champ === F.a ? F.b : F.a; } S.fin = 1; }
  }
}
registerComps(DEFS, planner);
onTick(tick);
export const LEAGUES_SOUTH = Object.keys(DEFS);
export { tick as leaguesSouthTick };
