// ===== Europe and the Americas leagues (W3): The Hundred, Vitality T20 Blast, Metro Bank One-Day Cup, MLC, CPL =====
// Formats, teams, windows and points were checked in Nov 2026 against the 2026 editions (Wikipedia season pages, the
// league sites and news; sources beside each definition and in src/data/world/leagues/<CODE>.js). Round dates
// are the real ones of 2026 where published, otherwise spread over the real window; they are kept, month and day,
// in later years ("in-game"). Everything played after the save starts is simulated. All are AI competitions here;
// the club-job layer reads the same rules from the modules.
//
// THE HUNDRED: 100 balls, 'T20' stand-in. The fast sim has no 100-ball format, so a fixture carries fmt 'T20' and
// balls: 100 (and the definition hundred: true). fastMatch(a, b, fmt, rnd, { balls }) takes the ball count, but
// state.playFast does not pass it yet: until it passes `{ balls: f.balls }` the Hundred is played over 120 balls.
// Request for the engine owner: in playFast, `fastMatch(a, b, f.fmt, rnd, f.balls ? { balls: f.balls } : {})`.
//
// Seasons are made by the planner (like leagues-south.js): it records the year and builds the seasons with their own
// round dates, returning nothing for ensureYear to make. A season whose first round is behind the save's start is
// skipped. State in the save: s.wd.lw = { y, skip, from }.
// Knockouts: MLC and CPL use comp.js's 'ipl4' (Qualifier, Eliminator, second Qualifier, Final). The Hundred (eliminator
// then final), the Blast (quarter-finals, semi-finals, final) and the One-Day Cup (two quarter-finals, two semi-finals,
// final) are 'dko' stages whose fixtures the tick makes when the stage opens.
// The Blast's cross-group matches have no table of their own: the tick rebuilds the three group tables from every
// league fixture.
import { registerComps, COMPS } from './comps.js';
import { blankRow, standings, roundRobin, applyRes } from './comp.js';
import { onTick } from './state.js';
import { dayOfDate } from './dates.js';
import { registry } from './players.js';

const D = (y, m, d) => dayOfDate(y, m, d); // months from 0
const ids = (code, list) => list.map((s) => `${code}-${s}`);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffled = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ----- points -----
// Blast and One-Day Cup 2026: 4 for a win, 2 for a tie or no result (the season pages' tables: winpoints 4, nrpoints 2, tiepoints 2).
const BLAST_PTS = { win: 4, tie: 2, nr: 2, loss: 0 };
// The Hundred, MLC, CPL: 2 for a win, 1 for a tie or no result. The MLC and CPL season pages' tables give no point values: the
// standard ones are assumed.
const STD_PTS = { win: 2, tie: 1, nr: 1, loss: 0 };

// ----- real teams and groups -----
const COUNTY_GROUPS = { // Blast 2026 (Wikipedia, citing Sky Sports): kept in later years
  N: ['DER', 'DUR', 'LAN', 'LEI', 'NOT', 'YOR'], C: ['GLA', 'GLO', 'NHT', 'SOM', 'WAR', 'WOR'], S: ['ESS', 'HAM', 'KEN', 'MDX', 'SUR', 'SUS'] };
const RLC_GROUPS = { // One-Day Cup 2026: Group A, Group B
  A: ['GLO', 'KEN', 'LAN', 'LEI', 'NHT', 'NOT', 'SOM', 'SUR', 'WAR'], B: ['DER', 'DUR', 'ESS', 'GLA', 'HAM', 'MDX', 'SUS', 'WOR', 'YOR'] };
const HUN = ['BP', 'LS', 'MSG', 'MIL', 'SB', 'SL', 'TR', 'WF'];
const HUN_RIVALS = [['LS', 'MIL'], ['MSG', 'SL'], ['TR', 'BP'], ['SB', 'WF']]; // the bonus match against the nearest regional rival (assumed pairs)
const MLC = ['LAKR', 'MINY', 'SFU', 'SO', 'TSK', 'WF'];
const CPL = ['ABF', 'BT', 'GAW', 'JK', 'SKNP', 'SLK', 'TKR'];

const base = (o) => ({ listA: true, ...o });
const DEFS = {
  // The Hundred (men): eight teams, 100 balls. 2026: 21 Jul to 16 Aug; 32 group matches (each team plays the other seven once
  // and a regional rival again); the top three go through, the second and third play an eliminator and the winner meets the top
  // side in the final (14 and 16 Aug). en.wikipedia.org/wiki/2026_The_Hundred_season. Recruitment: up to four pre-auction
  // signings or retentions, an auction (11-12 Mar 2026), then the Vitality Wildcard from Blast form (thehundred.com/info/how-player-selection-works).
  HUN: base({ id: 'HUN', name: 'The Hundred', short: 'The Hundred', kind: 'franchise', host: 'ENG', fmt: 'T20', hundred: true, balls: 100, level: 1, window: ['Jul 21', 'Aug 16'], points: STD_PTS,
    rules: { min: 16, max: 18, overseas: { max: 4, xi: 3, dataMax: 6, from2027: { max: 5, xi: 4 }, by: 'nationality' }, recruit: 'auction', retain: 4, purse: 2050000, currency: 'GBP', wildcard: true },
    stages: [{ type: 'rr', name: 'League' }, { type: 'dko', ko: true, name: 'Eliminator' }, { type: 'dko', ko: true, name: 'Final' }] }),
  // Vitality T20 Blast: 18 counties in three groups of six (North, Central & West, South: new in 2026, replacing two groups of nine);
  // 12 group matches each (home and away against the other five, one home and one away against counties outside the group);
  // the top two of each group and the two best third-placed counties reach the quarter-finals (15 Jul); Finals Day (18 Jul) has
  // the semi-finals and the final. en.wikipedia.org/wiki/2026_T20_Blast. The quarter-final pairings are not published on the
  // page: seeds 1 v 8, 2 v 7, 3 v 6, 4 v 5 are assumed (in-game). The user's brief said two groups: that was the 2025 format.
  BLAST: base({ id: 'BLAST', name: 'Vitality T20 Blast', short: 'T20 Blast', kind: 'domestic', host: 'ENG', fmt: 'T20', level: 1, window: ['May 22', 'Jul 18'], points: BLAST_PTS,
    rules: { min: 18, max: 25, recruit: 'contract' },
    stages: [{ type: 'rr', name: 'Groups', labels: ['North', 'Central & West', 'South'] }, { type: 'dko', ko: true, name: 'Quarter-finals' }, { type: 'dko', ko: true, name: 'Semi-finals' }, { type: 'dko', ko: true, name: 'Final' }] }),
  // Metro Bank One-Day Cup: all 18 counties, two groups of nine, each county plays the other eight once; group winners go straight
  // to the semi-finals, 2nd and 3rd of each group play quarter-finals (A2 v B3, B2 v A3, 14 Aug); semi-finals 16 Aug; final 20 Sep (2026:
  // Middlesex beat Leicestershire). 50 overs. en.wikipedia.org/wiki/2026_One-Day_Cup
  RLC: base({ id: 'RLC', name: 'Metro Bank One-Day Cup', short: 'One-Day Cup', kind: 'domestic', host: 'ENG', fmt: 'ODI', level: 1, window: ['Jul 21', 'Sep 20'], points: BLAST_PTS,
    rules: { min: 18, max: 25, recruit: 'contract' },
    stages: [{ type: 'rr', name: 'Groups', labels: ['Group A', 'Group B'] }, { type: 'dko', ko: true, name: 'Quarter-finals' }, { type: 'dko', ko: true, name: 'Semi-finals' }, { type: 'dko', ko: true, name: 'Final' }] }),
  // Major League Cricket: six franchises, a double round robin (30 matches) and four play-offs (Qualifier, Eliminator, Challenger,
  // Final: comp.js's 'ipl4'); 2026: 18 Jun to 18 Jul, final at Oakland. en.wikipedia.org/wiki/2026_Major_League_Cricket_season.
  // Squads of 15 to 18 with up to nine overseas, at least six US-qualified players in the XI; domestic players by draft, overseas
  // signed directly (mykhel.com MLC 2026 explainer; the draft and cap figures are not confirmed).
  MLC: base({ id: 'MLC', name: 'Major League Cricket', short: 'MLC', kind: 'franchise', host: 'USA', fmt: 'T20', level: 2, window: ['Jun 18', 'Jul 18'], points: STD_PTS,
    rules: { min: 15, max: 20, overseas: { max: 9, xi: 5, dataMax: 14, by: 'nationality' }, recruit: 'draft', retain: 6, purse: 1150000, currency: 'USD', usMinXI: 6 },
    stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'ipl4', gap: 3, name: 'Play-offs' }] }),
  // Caribbean Premier League: seven franchises in 2026 (Jamaica Kingsmen are new; Barbados Tridents returned): 35 league matches (each
  // team plays ten) and four play-offs (Qualifier 1, Eliminator, Qualifier 2, Final: 'ipl4'); 7 Aug to 20 Sep. en.wikipedia.org/wiki/2026_Caribbean_Premier_League.
  // Squads of 17: nine West Indians, five overseas (four in the XI), three breakout players (one in every XI); a draft (15 May 2026)
  // with right-to-match options and one breakout retention (jamaica-gleaner.com, 1 May 2026). The league-stage pairing (who plays whom
  // twice) is not published on the page: each side meets the four teams two and three places away a second time (in-game).
  CPL: base({ id: 'CPL', name: 'Caribbean Premier League', short: 'CPL', kind: 'franchise', host: 'WI', fmt: 'T20', level: 2, window: ['Aug 7', 'Sep 20'], points: STD_PTS,
    rules: { min: 17, max: 19, overseas: { max: 5, xi: 4, dataMax: 7, by: 'nationality' }, recruit: 'draft', retain: 1, rmo: 4, breakout: 3, xiBreakout: 1, wi: 9 },
    stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'ipl4', gap: 3, name: 'Play-offs' }] }),
};

// ----- layout helpers -----
function addFx(S, a, b, d, fmt, grp, stage, extra) { S.fx.push({ id: `${S.id}#R${S.fx.length}`, d, a, b, fmt, stage, grp, res: null, ...(extra || {}) }); }
const spread = (n, from, to) => Array.from({ length: n }, (_, i) => from + Math.round((n < 2 ? 0 : (i * (to - from)) / (n - 1))));
// Rounds of pairings on the given dates.
function rounds(S, list, dates, fmt, grp, extra) { list.forEach((round, i) => { for (const [a, b] of round) addFx(S, a, b, dates[i], fmt, grp, 0, extra); }); }
// Greedy rounds from a match list: each round has every team at most once.
function slotRounds(matches) { const left = matches.slice(); const out = []; while (left.length) { const used = new Set(); const r = []; for (let i = 0; i < left.length;) { const [a, b] = left[i]; if (!used.has(a) && !used.has(b)) { used.add(a); used.add(b); r.push([a, b]); left.splice(i, 1); } else i++; } out.push(r); } return out; }

// Blast: three groups of six; each group plays a double round robin (10 rounds); two more rounds play across groups.
function blastLayout(S, y, r) {
  const G = Object.fromEntries(Object.entries(COUNTY_GROUPS).map(([k, v]) => [k, shuffled(ids('ENG', v), r)]));
  const dates = [D(y, 4, 22), D(y, 4, 29), D(y, 5, 3), D(y, 5, 5), D(y, 5, 12), D(y, 5, 14), D(y, 5, 26), D(y, 6, 1), D(y, 6, 3), D(y, 6, 5), D(y, 6, 8), D(y, 6, 10)];
  const rr = {}; for (const k in G) { const one = roundRobin(G[k], 1); rr[k] = [...one, ...one.map((x) => x.map(([a, b]) => [b, a]))]; }
  for (let i = 0; i < 10; i++) for (const k in G) for (const [a, b] of rr[k][i]) addFx(S, a, b, dates[i], 'T20', k, 0);
  const [N, C, Sx] = [G.N, G.C, G.S];
  const m1 = [...[0, 1, 2].map((i) => [N[i], C[i]]), ...[0, 1, 2].map((i) => [N[3 + i], Sx[i]]), ...[0, 1, 2].map((i) => [C[3 + i], Sx[3 + i]])];
  const m2 = [...[0, 1, 2].map((i) => [N[i], C[3 + i]]), ...[0, 1, 2].map((i) => [N[3 + i], Sx[3 + i]]), ...[0, 1, 2].map((i) => [C[i], Sx[i]])];
  for (const [a, b] of m1) addFx(S, a, b, dates[10], 'T20', 'x', 0);
  for (const [a, b] of m2) addFx(S, b, a, dates[11], 'T20', 'x', 0);
  S.groups = Object.fromEntries(Object.entries(G).map(([k, v]) => [k, v.slice()])); S.tables = {}; for (const k in G) S.tables[k] = Object.fromEntries(G[k].map((t) => [t, blankRow()]));
}
// One-Day Cup: two groups of nine; each group plays a single round robin in nine rounds (one county rests each round).
function rlcLayout(S, y, r) {
  const G = Object.fromEntries(Object.entries(RLC_GROUPS).map(([k, v]) => [k, shuffled(ids('ENG', v), r)]));
  const dates = [D(y, 6, 21), D(y, 6, 24), D(y, 6, 26), D(y, 6, 29), D(y, 6, 31), D(y, 7, 2), D(y, 7, 5), D(y, 7, 7), D(y, 7, 9)];
  S.tables = {}; for (const k in G) { S.tables[k] = Object.fromEntries(G[k].map((t) => [t, blankRow()])); roundRobin(G[k], 1).forEach((round, i) => { for (const [a, b] of round) addFx(S, a, b, dates[i], 'ODI', k, 0); }); }
  S.groups = G;
}

const PLAN = [
  { comp: 'HUN', start: (y) => D(y, 6, 21), end: (y) => D(y, 7, 16), teams: () => ids('HUN', HUN),
    layout(S, y, r) { const T = shuffled(S.teams, r); const rr = roundRobin(T, 1); const bonus = HUN_RIVALS.map(([a, b]) => [`HUN-${a}`, `HUN-${b}`]);
      const dates = Array.from({ length: 8 }, (_, i) => D(y, 6, 21) + 3 * i);
      rounds(S, [...rr, bonus], dates, 'T20', 'all', { balls: 100 }); } },
  { comp: 'BLAST', start: (y) => D(y, 4, 22), end: (y) => D(y, 6, 18), teams: () => ids('ENG', Object.values(COUNTY_GROUPS).flat()), layout: blastLayout },
  { comp: 'RLC', start: (y) => D(y, 6, 21), end: (y) => D(y, 8, 20), teams: () => ids('ENG', Object.values(RLC_GROUPS).flat()), layout: rlcLayout },
  { comp: 'MLC', start: (y) => D(y, 5, 18), end: (y) => D(y, 6, 18), teams: () => ids('MLC', MLC),
    layout(S, y, r) { const rr = roundRobin(shuffled(S.teams, r), 2); rounds(S, rr, spread(rr.length, D(y, 5, 18), D(y, 6, 11)), 'T20', 'all'); } },
  { comp: 'CPL', start: (y) => D(y, 7, 7), end: (y) => D(y, 8, 20), teams: () => ids('CPL', CPL),
    layout(S, y, r) { const T = shuffled(S.teams, r); const n = T.length; const once = []; const extra = [];
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { once.push([T[i], T[j]]); const g = j - i; if (g === 2 || g === 3 || n - g === 2 || n - g === 3) extra.push([T[j], T[i]]); }
      const rs = slotRounds([...once, ...extra]); rounds(S, rs, spread(rs.length, D(y, 7, 7), D(y, 8, 13)), 'T20', 'all'); } },
];
const PLAN_BY = Object.fromEntries(PLAN.map((p) => [p.comp, p]));

function build(G, p, y) {
  registry(G); const def = COMPS[p.comp]; const id = `${p.comp}-${y}`; const rnd = rng(hash(id));
  const S = { id, comp: p.comp, y, name: `${def.name} ${y}`, teams: p.teams(), fx: [], tables: {}, stage: 0, done: false, champ: null, runner: null, start: p.start(y), end: p.end(y) };
  S.tables.all = Object.fromEntries(S.teams.map((t) => [t, blankRow()])); p.layout(S, y, rnd);
  if (p.comp === 'BLAST' || p.comp === 'RLC') delete S.tables.all;
  return S;
}
const lw = (G) => (G.s.wd.lw ??= { y: [], skip: [] });
function planner(G, y) {
  const wd = G.s.wd; if (!wd) return []; const R = lw(G); R.from ??= wd.day;
  for (const p of PLAN) { const id = `${p.comp}-${y}`; if (wd.seasons[id] || R.skip.includes(id)) continue; if (p.start(y) < R.from) { R.skip.push(id); continue; } wd.seasons[id] = build(G, p, y); }
  if (R.skip.length > 40) R.skip = R.skip.slice(-40);
  return [];
}

// ----- knockouts and tables -----
const koW = (f) => f.res.w || f.a;
const add = (a, b) => { for (const k in a) a[k] += b[k]; };
// Blast: group tables from every league fixture (cross-group matches count for both counties' own groups).
function rebuildBlast(S, def) {
  const grpOf = {}; for (const k in S.groups) for (const t of S.groups[k]) grpOf[t] = k;
  const T = {}; for (const k in S.groups) T[k] = Object.fromEntries(S.groups[k].map((t) => [t, blankRow()]));
  for (const f of S.fx) { if (f.stage !== 0 || !f.res) continue; const tmp = {}; applyRes(tmp, f, def.points); for (const t of [f.a, f.b]) if (tmp[t]) add(T[grpOf[t]][t], tmp[t]); }
  S.tables = T;
}
const rank = (S, k) => standings(S.tables[k]);
function blastQF(S, d) { // seeds: the three group winners, the three runners-up, the two best thirds (by points, wins, run rate)
  const g = Object.keys(S.groups).map((k) => rank(S, k)); const cmp = (x, y) => y.pts - x.pts || y.w - x.w || y.nrr - x.nrr;
  const w = g.map((x) => x[0]).sort(cmp), r = g.map((x) => x[1]).sort(cmp), t = g.map((x) => x[2]).sort(cmp).slice(0, 2); const s = [...w, ...r, ...t].map((x) => x.id);
  [[0, 7], [1, 6], [2, 5], [3, 4]].forEach(([a, b], i) => addFx(S, s[a], s[b], d, 'T20', 'ko', 1, { ko: `QF${i + 1}` }));
}
function tick(G) {
  const wd = G.s && G.s.wd; if (!wd) return;
  for (const id in wd.seasons) { const S = wd.seasons[id]; const p = PLAN_BY[S.comp]; if (!p || S.fin) continue; const def = COMPS[S.comp]; const k = S.stage; const st = def.stages[k]; const day = wd.day; const y = S.y;
    const by = (ko) => S.fx.find((f) => f.ko === ko); const at = (want) => Math.max(want, day);
    if (S.comp === 'BLAST' && !S.done && k === 0) rebuildBlast(S, def);
    if (!S.done && st && st.type === 'dko' && !S.fx.some((f) => f.stage === k)) {
      if (S.comp === 'HUN') {
        const T = standings(S.tables.all).map((r) => r.id);
        if (k === 1) addFx(S, T[1], T[2], at(D(y, 7, 14)), 'T20', 'ko', 1, { ko: 'EL', balls: 100 });
        else { const el = by('EL'); addFx(S, T[0], koW(el), at(Math.max(D(y, 7, 16), el.d + 1)), 'T20', 'ko', 2, { ko: 'F', balls: 100 }); }
      } else if (S.comp === 'BLAST') {
        if (k === 1) blastQF(S, at(D(y, 6, 15)));
        else if (k === 2) { const d = at(Math.max(D(y, 6, 18), Math.max(...S.fx.filter((f) => f.stage === 1).map((f) => f.d)) + 1)); addFx(S, koW(by('QF1')), koW(by('QF4')), d, 'T20', 'ko', 2, { ko: 'SF1' }); addFx(S, koW(by('QF2')), koW(by('QF3')), d, 'T20', 'ko', 2, { ko: 'SF2' }); }
        else addFx(S, koW(by('SF1')), koW(by('SF2')), at(Math.max(D(y, 6, 18), by('SF1').d)), 'T20', 'ko', 3, { ko: 'F' });
      } else if (S.comp === 'RLC') {
        const A = rank(S, 'A').map((r) => r.id), B = rank(S, 'B').map((r) => r.id);
        if (k === 1) { addFx(S, B[1], A[2], at(D(y, 7, 14)), 'ODI', 'ko', 1, { ko: 'QF1' }); addFx(S, A[1], B[2], at(D(y, 7, 14)), 'ODI', 'ko', 1, { ko: 'QF2' }); }
        else if (k === 2) { const d = at(Math.max(D(y, 7, 16), by('QF1').d + 1)); addFx(S, A[0], koW(by('QF1')), d, 'ODI', 'ko', 2, { ko: 'SF1' }); addFx(S, B[0], koW(by('QF2')), d, 'ODI', 'ko', 2, { ko: 'SF2' }); }
        else addFx(S, koW(by('SF1')), koW(by('SF2')), at(Math.max(D(y, 8, 20), by('SF1').d + 1)), 'ODI', 'ko', 3, { ko: 'F' });
      }
      S.end = Math.max(S.end, Math.max(...S.fx.map((f) => f.d))); continue;
    }
    if (S.done) { const F = by('F'); if (F && F.res) { S.champ = koW(F); S.runner = S.champ === F.a ? F.b : F.a; } if (!S.champ) { const o = standings(S.tables.all || Object.values(S.tables)[0]); S.champ = o[0].id; S.runner = o[1] && o[1].id; } S.fin = 1; }
  }
}

registerComps(DEFS, planner);
onTick(tick);
export const LEAGUES_WEST = Object.keys(DEFS);
export { tick as leaguesWestTick };
