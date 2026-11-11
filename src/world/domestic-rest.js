// ===== Domestic cricket outside Asia (W2): first-class and the associates' main domestic competitions =====
// England, Australia, South Africa, New Zealand, West Indies, Zimbabwe, Ireland, the Netherlands,
// Scotland, Namibia and the USA. Canada has none here: no current national domestic competition could be
// verified (see the note at CAN below). These are AI competitions: nobody manages a domestic team yet (W3).
//
// Formats, teams, windows and points were checked in Nov 2026; sources sit next to each definition.
// Round dates are the real ones for the season named in each comment and are kept, month and day, in
// later years. Everything played after the save starts is simulated.
//
// How seasons are made. The planner (registerComps) is called once per calendar year by ensureYear. It
// records the year and creates the seasons itself, with their own round dates (comp.js's even spread
// can't leave a Big Bash or T20 Blast gap, play partial second legs, or run the West Indies' bilateral
// series), and returns nothing for ensureYear to make. A season whose teams depend on an earlier one
// (County Championship promotion and relegation, the CSA two-season cycle, West Indies pairings) waits
// until that season is finished; the clock tick creates it then. A season whose first round is already
// behind the save's start date is skipped, so the game never invents results for a finished real season.
// The tick also runs the knockouts comp.js has no plan for (the West Indies play-off and final) and
// decides drawn finals. comp.js runs ticks when a season finishes and after each advance, so a knockout
// it opens can be dated a little late when one advance spans the gap before it (the West Indies leave
// eleven days).
//
// Points: comp.js counts one point per bonus threshold. The Sheffield Shield and the CSA series give
// fractional bonus points (0.01 a run, 0.1 a wicket; 0.02 a run), so their tables are kept in hundredths:
// def.ptsScale = 100 means a table's pts divided by 100 is the real points total.
//
// State in the save: s.wd.dr = { y: [years still being made], skip: [season ids skipped] }. Seasons live
// in s.wd.seasons like every other competition's.
import { registerComps, COMPS } from './comps.js';
import { blankRow, standings, roundRobin } from './comp.js';
import { onTick } from './state.js';
import { dayOfDate } from './dates.js';
import { registry } from './players.js';

const D = (y, m, d) => dayOfDate(y, m, d);
const rep = (v, n) => Array.from({ length: n }, () => v);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffled = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// [month, day] pairs from the season's start year; months past 11 fall in the next year.
const days = (y, md) => md.map(([m, d]) => D(y, m, d));
const ids = (nat, list) => list.map((s) => `${nat}-${s}`);
const seasonLabel = (y) => `${y}–${String(y + 1).slice(2)}`;

// ----- points -----
// County Championship (since 2024): win 16, draw 8, tie 8; batting 1 point each at 250, 300, 350, 400, 450;
// bowling 1 each at 3, 6, 9 wickets; first 110 overs of each first innings. en.wikipedia.org/wiki/County_Championship
// An abandoned match counts as a draw.
const CC_PTS = { win: 16, draw: 8, tie: 8, nr: 8, loss: 0, bonus: { overs: 110, bat: [250, 300, 350, 400, 450], bowl: [3, 6, 9] } };
// Sheffield Shield (since 2016-17), in hundredths: win 6, tie 3, draw or abandoned 1; bonus in the first 100
// overs of each first innings: 0.01 a run over 200, 0.1 a wicket. en.wikipedia.org/wiki/Sheffield_Shield
const SHIELD_PTS = { win: 600, tie: 300, draw: 100, nr: 100, loss: 0, bonus: { overs: 100, bat: range(201, 1000), bowl: range(1, 10).flatMap((w) => rep(w, 10)) } };
// Plunket Shield 2025-26: win 12, tie 6, draw 0; batting 1 each at 200, 250, 300, 350 and bowling 1 each at
// 3, 5, 7, 9 wickets, first 110 overs. en.wikipedia.org/wiki/2025–26_Plunket_Shield_season
const PLUNKET_PTS = { win: 12, tie: 6, draw: 0, nr: 0, loss: 0, bonus: { overs: 110, bat: [200, 250, 300, 350], bowl: [3, 5, 7, 9] } };
// CSA 4-Day Series 2025-26 (the latest published values), in hundredths: win 16, tie 8, draw 6; batting
// 1 point at 150 then 0.02 a run; bowling 1 at three wickets, then 1 for each two more. First innings only.
// en.wikipedia.org/wiki/2025–26_CSA_4-Day_Series. The overs window isn't published there: 100 assumed.
const CSA_PTS = { win: 1600, tie: 800, draw: 600, nr: 600, loss: 0, bonus: { overs: 100, bat: [...rep(150, 100), ...range(151, 800).flatMap((r) => [r, r])], bowl: [3, 5, 7, 9].flatMap((w) => rep(w, 100)) } };
// West Indies Championship (official standings page): win 12, tie 6, no outright result 3; batting 2 at 250,
// then 3, 4, 5 at 300, 350, 400; bowling 1, 2, 3 at 3, 6, 9 wickets; first 110 overs of each first innings.
// windiescricket.com/news/WEST-INDIES-CHAMPIONSHIP-2024-OFFICIAL-STANDING/
const WI_PTS = { win: 12, tie: 6, draw: 3, nr: 1, loss: 0, bonus: { overs: 110, bat: [250, 250, 300, 350, 400], bowl: [3, 6, 9] } };
// Logan Cup 2025-26: win 10, tie 6, draw 5, innings win +2 (comp.js also gives it for a 10-wicket win);
// batting 1 each at 200, 250, 300, 350; bowling 1 each at 3, 5, 7, 9. No overs window is published.
// en.wikipedia.org/wiki/2025–26_Logan_Cup
const LOGAN_PTS = { win: 10, tie: 6, draw: 5, nr: 5, loss: 0, bigWin: 2, bonus: { overs: 500, bat: [200, 250, 300, 350], bowl: [3, 5, 7, 9] } };
// One-day competitions: no published points found; the usual 2 for a win, 1 for a tie or no result.
const ONE_DAY = { win: 2, tie: 1, nr: 1, loss: 0 };

// ----- real divisions -----
// County Championship 2026: Division One 10, Division Two 8; two up, two down. 2027 follows from the 2026
// table: Durham and Kent up, Leicestershire and Hampshire down. en.wikipedia.org/wiki/2026_County_Championship
const COUNTIES = ['DER', 'DUR', 'ESS', 'GLA', 'GLO', 'HAM', 'KEN', 'LAN', 'LEI', 'MDX', 'NHT', 'NOT', 'SOM', 'SUR', 'SUS', 'WAR', 'WOR', 'YOR'];
const CC_D1 = { 2026: ['ESS', 'GLA', 'HAM', 'LEI', 'NOT', 'SOM', 'SUR', 'SUS', 'WAR', 'YOR'], 2027: ['DUR', 'ESS', 'GLA', 'KEN', 'NOT', 'SOM', 'SUR', 'SUS', 'WAR', 'YOR'] };
// CSA 2026-27: Division 1 of eight (Knights promoted, KZN Inland down), Division 2 of seven. Promotion and
// relegation now every two seasons, from 2026-27 (sacricketmag.com/?p=205164); one up, one down as in
// 2025-26. CSA decides it on an integrated table across all formats; here only the first-class tables
// count (the other formats come in W3).
const SA_D1 = ['LIO', 'BOL', 'TIT', 'DOL', 'WP', 'WAR', 'KNI', 'NW'];
const SA_ALL = [...SA_D1, 'KZI', 'EAS', 'SWD', 'NC', 'MPU', 'BOR', 'LIM'];
// West Indies Championship 2026: three bilateral series, seeded from the 2025 table.
const WI_PAIRS_2026 = [['WIN', 'GUY'], ['JAM', 'BAR'], ['LEE', 'TT']];

// ----- competition definitions -----
const base = (o) => ({ kind: 'domestic', listA: true, ...o });
// listA: true keeps these out of the international rankings (intl.info treats them as unofficial).
const DEFS = {
  // County Championship. 2026 round dates (Division One): 3 Apr to 24 Sep, with gaps for the T20 Blast
  // (late May to early June, July) and The Hundred (August). Each Division One side plays 14 of its 9
  // opponents (five twice), Division Two a double round robin. en.wikipedia.org/wiki/2026_County_Championship
  'ENG-CC1': base({ id: 'ENG-CC1', name: 'County Championship Division One', short: 'CC Div 1', host: 'ENG', fmt: 'FC4', level: 1, window: ['Apr 3', 'Sep 27'], points: CC_PTS, stages: [{ type: 'rr', name: 'League' }] }),
  'ENG-CC2': base({ id: 'ENG-CC2', name: 'County Championship Division Two', short: 'CC Div 2', host: 'ENG', fmt: 'FC4', level: 2, window: ['Apr 3', 'Sep 27'], points: CC_PTS, stages: [{ type: 'rr', name: 'League' }] }),
  // Sheffield Shield: six states, home and away, top two to a final at the top side's ground. 2026-27 rounds
  // from 7 Oct, a Big Bash break after 3 Dec, back on 8 Feb, final 25-29 Mar.
  // en.wikipedia.org/wiki/2026–27_Sheffield_Shield_season, en.wikipedia.org/wiki/Sheffield_Shield.
  // The final is five days in reality; the fast sim's longest domestic format is four (FC4).
  'AUS-SS': base({ id: 'AUS-SS', name: 'Sheffield Shield', short: 'Shield', host: 'AUS', fmt: 'FC4', level: 1, window: ['Oct 7', 'Mar 29'], points: SHIELD_PTS, ptsScale: 100, stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'final', name: 'Final' }] }),
  // Plunket Shield: six teams, eight rounds (each side plays three opponents twice), no final. 2026-27:
  // rounds 1-4 from 19 Nov to mid-December, rounds 5-8 in March, the last from 26 Mar.
  // nzc.nz/red-ball-fans-rejoice-plunket-shield-schedule-announced/ (rounds 2-7 dates follow 2025-26's spacing).
  'NZ-PS': base({ id: 'NZ-PS', name: 'Plunket Shield', short: 'Plunket', host: 'NZ', fmt: 'FC4', level: 1, window: ['Nov 19', 'Mar 29'], points: PLUNKET_PTS, stages: [{ type: 'rr', name: 'League' }] }),
  // CSA 1st Class Series (Division 1, the four-day series renamed for 2026-27): eight teams, ten matches
  // each, from 10 Sep 2026, final from 26 Apr 2027. supersport.com (first-class series edges closer...),
  // georgeherald.com (CSA announces new domestic cricket identity). Middle round dates are spread around
  // the SA20 (late Dec to early Feb); the final's qualifiers aren't stated, the top two assumed.
  'SA-FC1': base({ id: 'SA-FC1', name: 'CSA 1st Class Series', short: 'CSA Div 1', host: 'SA', fmt: 'FC4', level: 1, window: ['Sep 10', 'Apr 30'], points: CSA_PTS, ptsScale: 100, stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'final', name: 'Final' }] }),
  // CSA 1st Class Shield (Division 2): seven teams, three-day matches, double round robin (georgeherald.com).
  // No final is described for the new format: the table decides it.
  'SA-FC2': base({ id: 'SA-FC2', name: 'CSA 1st Class Shield', short: 'CSA Div 2', host: 'SA', fmt: 'FC3', level: 2, window: ['Sep 10', 'Apr 30'], points: CSA_PTS, ptsScale: 100, stages: [{ type: 'rr', name: 'League' }] }),
  // West Indies Championship 2026: six franchises in three concurrent three-match bilateral series
  // (12-29 Apr); the three series winners ranked on points; 2nd v 3rd play-off (10-13 May); final 1st v the
  // play-off winner (17-20 May). windiescricket.com/news/cricket-west-indies-confirms-new-format-for-2026-west-indies-championship/
  // The top side's warm-up against the West Indies Academy is left out. Later pairings: 1v6, 2v5, 3v4 on
  // the previous table (the 2026 seeding rule is "seeded 1-6 by final standings", pairing rule not stated).
  'WI-CH': base({ id: 'WI-CH', name: 'West Indies Championship', short: 'WI Champ', host: 'WI', fmt: 'FC4', level: 1, window: ['Apr 12', 'May 20'], points: WI_PTS, stages: [{ type: 'rr', name: 'Bilateral series' }, { type: 'ko', plan: 'wi-po', name: 'Play-off' }, { type: 'ko', plan: 'wi-final', name: 'Final' }] }),
  // Logan Cup: five franchises, double round robin of four-day matches, no final, 26 Oct to late March
  // (2025-26). en.wikipedia.org/wiki/2025–26_Logan_Cup. 2026-27 dates not found: 2025-26's window kept.
  'ZIM-LC': base({ id: 'ZIM-LC', name: 'Logan Cup', short: 'Logan Cup', host: 'ZIM', fmt: 'FC4', level: 1, window: ['Oct 26', 'Mar 30'], points: LOGAN_PTS, stages: [{ type: 'rr', name: 'League' }] }),
  // Ireland: the first-class Inter-Provincial Championship hasn't been held since 2019 (only the one-off
  // Emerald Challenge fixtures in 2024 and 2026): en.wikipedia.org/wiki/Inter-Provincial_Championship.
  // The main domestic competition is the 50-over Inter-Provincial Cup: three teams in 2026, each pair twice,
  // final 23 Jul at Pembroke. crictracker.com/cricket-news/inter-provincial-cup-2026-full-squads-teams-schedule-dates-venues-and-all-you-need-to-know-5819/
  'IRE-IPC': base({ id: 'IRE-IPC', name: 'Inter-Provincial Cup', short: 'Interpro Cup', host: 'IRE', fmt: 'ODI', level: 2, window: ['Jun 30', 'Jul 23'], points: ONE_DAY, stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'final', name: 'Final' }] }),
  // Netherlands: no multi-day domestic cricket. The Topklasse (50 overs): eight clubs from 2026, home and
  // away, 14 rounds, no play-offs, bottom club relegated (not modelled: the Hoofdklasse isn't in the game).
  // tkcricket.com/2025/01/18/topklasse-to-return-to-eight-teams-from-2026/. Round dates approximate
  // (Saturdays, May to August; the exact dates weren't found).
  'NED-TK': base({ id: 'NED-TK', name: 'Topklasse', short: 'Topklasse', host: 'NED', fmt: 'ODI', level: 3, window: ['May 2', 'Aug 29'], points: ONE_DAY, stages: [{ type: 'rr', name: 'League' }] }),
  // Scotland: no multi-day domestic cricket. The Men's Regional Super Series 2026: three regional sides,
  // three T20 triple-headers in June, then three 50-over match days in July, one cumulative table.
  // cricketscotland.com/Article/26986078-81b6-4ece-836a-ec31c8709d97. Exact days approximate.
  'SCO-RSS': base({ id: 'SCO-RSS', name: 'Regional Super Series', short: 'Super Series', host: 'SCO', fmt: 'ODI', level: 3, window: ['Jun 7', 'Jul 19'], points: ONE_DAY, stages: [{ type: 'rr', name: 'League' }] }),
  // Namibia: no multi-day domestic cricket. Cricket Namibia's 50-over Premier League, final in March
  // (2025-26: WHS Old Boys beat Wanderers). Clubs from we.com.na (Jan 2025) and cricketnamibia.com (2026
  // awards). Round structure not published: home and away plus a final, October to March, assumed.
  'NAM-PL': base({ id: 'NAM-PL', name: 'Cricket Namibia Premier League', short: 'Premier League', host: 'NAM', fmt: 'ODI', level: 3, window: ['Oct 11', 'Mar 7'], points: ONE_DAY, stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'final', name: 'Final' }] }),
  // USA: no multi-day domestic cricket. The Men's 50-Over National Championship (latest verified edition
  // 2024, 12-15 Nov, Van Nuys): eight teams in two groups of four, group winners in the final. The placing
  // matches are left out. usacricket.org (schedule-squads... and mid-atlantic-crowned-champions...).
  // The final is comp.js's 'super' stage with one team from each group: a single match, table 'super'.
  'USA-NC': base({ id: 'USA-NC', name: "Men's 50-Over National Championship", short: 'USA Nationals', host: 'USA', fmt: 'ODI', level: 3, window: ['Nov 12', 'Nov 15'], points: ONE_DAY, stages: [{ type: 'rr', name: 'Groups', labels: ['Group A', 'Group B'] }, { type: 'super', take: 1, gap: 1, name: 'Final' }] }),
  // CAN: Canada's men's national championship (20- and 50-over, provincial sides, Aug 2025) is only known from
  // a forum post; its teams and format couldn't be verified, so it isn't modelled.
};

// ----- schedules: round dates and team lists, per season start year -----
// teams(G, y) returns null while the teams depend on an unfinished season.
const S_ = (G, id) => G.s.wd.seasons[id] || null;
const tableOrder = (S) => standings(S.tables.all || Object.values(S.tables)[0]).map((r) => r.id);
function ccD1(G, y) {
  const p1 = S_(G, `ENG-CC1-${y - 1}`), p2 = S_(G, `ENG-CC2-${y - 1}`);
  if (p1 && p2) { if (!p1.done || !p2.done) return null; const o1 = tableOrder(p1), o2 = tableOrder(p2); return [...o1.slice(0, o1.length - 2), ...o2.slice(0, 2)].map((t) => t.slice(4)); }
  return CC_D1[y] || CC_D1[2027];
}
function saD1(G, y) {
  const prev = S_(G, `SA-FC1-${y - 1}`), prev2 = S_(G, `SA-FC2-${y - 1}`);
  if (!prev) return SA_D1;
  const short = (list) => list.map((t) => t.slice(3));
  if (y < 2028 || (y - 2026) % 2) return short(prev.teams); // mid-cycle: the same divisions
  if (!prev.done || !prev2 || !prev2.done) return null;
  // end of a two-season cycle: the bottom side on points over both seasons goes down, the top one comes up
  const pts = {}; for (const id of [`SA-FC1-${y - 1}`, `SA-FC1-${y - 2}`, `SA-FC2-${y - 1}`, `SA-FC2-${y - 2}`]) { const S = S_(G, id); if (!S) continue; for (const [t, r] of Object.entries(S.tables.all || {})) pts[t] = (pts[t] || 0) + r.pts; }
  const by = (list) => list.slice().sort((a, b) => (pts[b] || 0) - (pts[a] || 0) || (a < b ? -1 : 1));
  const d1 = by(prev.teams), d2 = by(prev2.teams);
  return short([...d1.slice(0, -1), d2[0]]);
}
function wiPairs(G, y) {
  const prev = S_(G, `WI-CH-${y - 1}`); if (!prev) return WI_PAIRS_2026; if (!prev.done) return null;
  const top = prev.champ ? [prev.champ, prev.runner, ...tableOrder(prev).filter((t) => t !== prev.champ && t !== prev.runner)] : tableOrder(prev);
  const o = top.map((t) => t.slice(3)); return [[o[0], o[5]], [o[1], o[4]], [o[2], o[3]]];
}

// A league stage: a round robin, then a second leg with home and away reversed, cut to the number of rounds
// the competition plays. Rounds land on the given dates.
function league(S, teams, dates, rnd, fmt) {
  const rr = roundRobin(shuffled(teams, rnd), 1); const all = [...rr, ...rr.map((r) => r.map(([a, b]) => [b, a]))];
  dates.forEach((d, i) => { for (const [a, b] of all[i % all.length]) addFx(S, a, b, d, fmt, 'all', 0); });
}
function addFx(S, a, b, d, fmt, grp, stage, extra) { S.fx.push({ id: `${S.id}#R${S.fx.length}`, d, a, b, fmt, stage, grp, res: null, ...(extra || {}) }); }
function blank(S, key, teams) { S.tables[key] = Object.fromEntries(teams.map((t) => [t, blankRow()])); }

// Each competition: id, the season's dates, its teams, how its fixtures are laid out.
const PLAN = [
  { comp: 'ENG-CC1', split: false, dates: (y) => days(y, [[3, 3], [3, 10], [3, 17], [3, 24], [4, 1], [4, 8], [4, 15], [5, 7], [5, 19], [7, 20], [7, 27], [8, 8], [8, 15], [8, 24]]), end: (y) => D(y, 8, 27),
    teams: (G, y) => { const d1 = ccD1(G, y); return d1 && ids('ENG', d1); } },
  { comp: 'ENG-CC2', split: false, dates: (y) => days(y, [[3, 3], [3, 10], [3, 17], [3, 24], [4, 1], [4, 8], [4, 15], [5, 7], [5, 19], [7, 20], [7, 27], [8, 8], [8, 15], [8, 24]]), end: (y) => D(y, 8, 27),
    teams: (G, y) => { const d1 = ccD1(G, y); return d1 && ids('ENG', COUNTIES.filter((c) => !d1.includes(c))); } },
  { comp: 'AUS-SS', split: true, dates: (y) => days(y, [[9, 7], [9, 19], [9, 28], [10, 11], [10, 22], [11, 3], [13, 8], [13, 20], [14, 2], [14, 14]]), end: (y) => D(y + 1, 2, 25),
    teams: () => ids('AUS', ['NSW', 'QLD', 'VIC', 'WA', 'SA', 'TAS']) },
  { comp: 'NZ-PS', split: true, dates: (y) => days(y, [[10, 19], [10, 27], [11, 5], [11, 13], [14, 2], [14, 10], [14, 18], [14, 26]]), end: (y) => D(y + 1, 2, 29),
    teams: () => ids('NZ', ['AUC', 'NDI', 'CTD', 'WEL', 'CAN', 'OTA']) },
  { comp: 'SA-FC1', split: true, dates: (y) => days(y, [[8, 10], [8, 24], [9, 8], [9, 22], [10, 5], [10, 19], [13, 18], [14, 4], [14, 18], [15, 8]]), end: (y) => D(y + 1, 3, 26),
    teams: (G, y) => { const d1 = saD1(G, y); return d1 && ids('SA', d1); } },
  { comp: 'SA-FC2', split: true, dates: (y) => days(y, [[8, 10], [8, 24], [9, 8], [9, 22], [10, 5], [10, 19], [11, 3], [12, 14], [12, 28], [13, 11], [13, 25], [14, 11], [14, 25], [15, 8]]), end: (y) => D(y + 1, 3, 11),
    teams: (G, y) => { const d1 = saD1(G, y); return d1 && ids('SA', SA_ALL.filter((t) => !d1.includes(t))); } },
  { comp: 'WI-CH', split: false, dates: (y) => days(y, [[3, 12], [3, 19], [3, 26]]), end: (y) => D(y, 4, 17), po: (y) => D(y, 4, 10),
    teams: (G, y) => { const p = wiPairs(G, y); return p && ids('WI', p.flat()); },
    layout(S, G, y) { const p = wiPairs(G, y).map((x) => ids('WI', x)); S.pairs = p; this.dates(y).forEach((d, i) => { for (const [a, b] of p) addFx(S, i % 2 ? b : a, i % 2 ? a : b, d, 'FC4', 'all', 0); }); } },
  { comp: 'ZIM-LC', split: true, dates: (y) => days(y, [[9, 26], [10, 9], [10, 23], [11, 7], [12, 11], [12, 25], [13, 8], [13, 22], [14, 8], [14, 22]]), end: (y) => D(y + 1, 2, 25),
    teams: () => ids('ZIM', ['ME', 'MOU', 'MT', 'MWR', 'SR']) },
  { comp: 'IRE-IPC', split: false, dates: (y) => days(y, [[5, 30], [6, 2], [6, 7], [6, 9], [6, 14], [6, 16]]), end: (y) => D(y, 6, 23),
    teams: () => ids('IRE', ['LEI', 'NK', 'NWW']) },
  { comp: 'NED-TK', split: false, dates: (y) => days(y, [[4, 2], [4, 9], [4, 16], [4, 23], [4, 30], [5, 6], [5, 13], [5, 27], [6, 4], [6, 11], [6, 25], [7, 8], [7, 22], [7, 29]]), end: (y) => D(y, 7, 29),
    teams: () => ids('NED', ['KAM', 'VRA', 'RCC', 'VCC', 'HCC', 'HBS', 'HDV', 'VOC']) },
  { comp: 'SCO-RSS', split: false, dates: (y) => days(y, [[5, 7], [5, 14], [5, 21], [6, 5], [6, 12], [6, 19]]), end: (y) => D(y, 6, 19),
    teams: () => ids('SCO', ['CH', 'EK', 'WW']),
    layout(S, G, y, rnd) { const [a, b, c] = shuffled(S.teams, rnd); const pairs = [[a, b], [b, c], [c, a]]; const ds = this.dates(y);
      for (let k = 0; k < 3; k++) pairs.forEach(([x, z]) => addFx(S, k % 2 ? z : x, k % 2 ? x : z, ds[k], 'T20', 'all', 0)); // triple-headers
      pairs.forEach(([x, z], k) => addFx(S, x, z, ds[3 + k], 'ODI', 'all', 0)); } },
  { comp: 'NAM-PL', split: true, dates: (y) => days(y, [[9, 11], [9, 25], [10, 8], [12, 17], [12, 31], [13, 14]]), end: (y) => D(y + 1, 2, 7),
    teams: () => ids('NAM', ['WAN', 'TU', 'WHS', 'CCD']) },
  { comp: 'USA-NC', split: false, dates: (y) => days(y, [[10, 12], [10, 13], [10, 14]]), end: (y) => D(y, 10, 15),
    teams: () => ids('USA', ['MA', 'SW', 'S', 'W', 'E', 'MW', 'RED', 'BLU']),
    layout(S, G, y, rnd) { const t = shuffled(S.teams, rnd); const g = [t.slice(0, 4), t.slice(4)]; const ds = this.dates(y); S.tables = {};
      g.forEach((grp, gi) => { const key = 'AB'[gi]; blank(S, key, grp); roundRobin(grp, 1).forEach((round, ri) => round.forEach(([a, b]) => addFx(S, a, b, ds[ri], 'ODI', key, 0))); }); } },
];
const PLAN_BY = Object.fromEntries(PLAN.map((p) => [p.comp, p]));

function build(G, p, y, teams) {
  registry(G); // players.js fills its domestic team list when the registry is built; poolOf needs it before the first match
  const def = COMPS[p.comp]; const id = `${p.comp}-${y}`; const rnd = rng(hash(id)); const ds = p.dates(y);
  const S = { id, comp: p.comp, y, name: `${def.name} ${p.split ? seasonLabel(y) : y}`, teams: teams.slice(), fx: [], tables: {}, stage: 0, done: false, champ: null, runner: null, start: ds[0], end: p.end(y) };
  blank(S, 'all', S.teams);
  if (p.layout) p.layout(S, G, y, rnd); else league(S, S.teams, ds, rnd, def.fmt);
  return S;
}
const dr = (G) => (G.s.wd.dr ??= { y: [], skip: [] });
// Create every season of the planned years whose teams are known.
function make(G) {
  const wd = G.s.wd; if (!wd) return; const R = dr(G);
  R.y = R.y.filter((y) => {
    let waiting = false;
    for (const p of PLAN) { const id = `${p.comp}-${y}`; if (wd.seasons[id] || R.skip.includes(id)) continue;
      if (p.dates(y)[0] < (R.from ?? wd.day)) { R.skip.push(id); continue; }
      const teams = p.teams(G, y); if (!teams) { waiting = true; continue; }
      wd.seasons[id] = build(G, p, y, teams); }
    return waiting;
  });
  if (R.skip.length > 60) R.skip = R.skip.slice(-60);
}
function planner(G, y) { const wd = G.s.wd; if (!wd) return []; const R = dr(G); R.from ??= wd.day; if (!R.y.includes(y)) R.y.push(y); make(G); return []; }

// ----- knockouts comp.js has no plan for, and drawn finals -----
const mine = (S) => !!PLAN_BY[S.comp];
const by = (S, ko) => S.fx.find((f) => f.ko === ko);
const winnerOr = (f, seed) => (f.res.w || seed);
// Shield final drawn or tied: the side with more first-innings bonus points (regular-season system) wins.
function shieldBonus(f) { const out = { [f.a]: 0, [f.b]: 0 }; const fi = {}; for (const row of f.res.sc || []) if (!fi[row[0]]) fi[row[0]] = row;
  for (const [t, row] of Object.entries(fi)) { const [, r, w, b] = row; const share = b > 600 ? 600 / b : 1; const o = t === f.a ? f.b : f.a; out[t] += Math.max(0, Math.floor(r * share) - 200) / 100; out[o] += Math.round(w * share) / 10; }
  return out; }
function tick(G) {
  const wd = G.s.wd; if (!wd) return; make(G); const day = wd.day;
  for (const id in wd.seasons) { const S = wd.seasons[id]; if (!mine(S) || (S.done && S.champ)) continue;
    const ko = S.fx.filter((f) => f.stage > 0);
    if (S.comp === 'WI-CH') {
      if (S.stage === 1 && !ko.length) { // rank the three series winners on points; 2nd v 3rd in the play-off
        const T = S.tables.all; const pts = (t) => T[t].pts * 100 + T[t].w; const win = S.pairs.map(([a, b]) => (pts(b) > pts(a) ? b : a)).sort((a, b) => pts(b) - pts(a));
        S.seed = win; addFx(S, win[1], win[2], Math.max(PLAN_BY['WI-CH'].po(S.y), day), 'FC4', 'ko', 1, { ko: 'PO' }); }
      if (S.stage === 2 && !ko.some((f) => f.stage === 2)) { const po = by(S, 'PO'); addFx(S, S.seed[0], winnerOr(po, po.a), Math.max(S.end, day), 'FC4', 'ko', 2, { ko: 'F' }); }
    }
    // a drawn or tied final: the higher seed (the home side) keeps it, except in the Shield
    const F = by(S, 'F'); if (S.done && !S.champ && F && F.res) {
      let champ = F.a; if (S.comp === 'AUS-SS') { const bp = shieldBonus(F); champ = bp[F.b] > bp[F.a] ? F.b : F.a; }
      S.champ = champ; S.runner = champ === F.a ? F.b : F.a; S.decided = S.comp === 'AUS-SS' ? 'first-innings bonus points' : 'higher-placed side';
    } else if (S.done && !S.champ) { const o = tableOrder(S); S.champ = o[0]; S.runner = o[1]; }
  }
}

registerComps(DEFS, planner);
onTick(tick);

export const DOMESTIC_REST = Object.keys(DEFS);
export const domesticRestPlan = PLAN.map((p) => p.comp);
// For screens: a table's points in real units (the Shield and CSA tables are kept in hundredths).
export const realPts = (S, pts) => { const d = COMPS[S.comp]; return d && d.ptsScale ? pts / d.ptsScale : pts; };
export { tick as domesticRestTick };
