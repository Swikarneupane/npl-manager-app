// ===== Domestic cricket in Asia (W2): first-class, and Nepal's two national competitions =====
// India, Pakistan, Sri Lanka, Bangladesh and Afghanistan (first-class); Nepal (the Jay Trophy, multi-day,
// and the Prime Minister Cup, 50 overs, which decides the Jay Trophy's teams); the UAE (no multi-day
// competition: the Emirates D50) and Oman (the OC 2-Day Tournament). These are AI competitions: nobody
// manages a domestic team yet (W3).
//
// Formats, teams, windows and points were checked in November 2026; sources sit next to each definition.
// Round dates are the real ones of the season named in the comment where they were published, otherwise
// spread over the real window; they are kept, month and day, in later years. Everything played after the
// save starts is simulated.
//
// How seasons are made (the same pattern as domestic-rest.js). The planner is called once per calendar
// year by ensureYear: it records the year, and make() creates the seasons itself with their own round
// dates, returning nothing for ensureYear to make. A season whose teams come from an earlier one (Ranji
// and Quaid-e-Azam promotion and relegation, the Jay Trophy from the Prime Minister Cup) waits until that
// season is finished; the clock tick creates it then. A season whose first round is before the save's
// start date is skipped, so the game never invents results for a finished real season.
//
// Knockouts: comp.js's ko plans have no quarter-finals, no eliminator, and no answer for a drawn
// first-class knockout. So each knockout round here is its own stage of type 'dko' (comp.js opens it and
// makes nothing); the tick makes the round's fixtures when the stage opens, from the tables or the last
// round's winners. A drawn or tied knockout goes to the side ahead on first innings, else the higher seed.
// The final's winner is written over the table leader that comp.js names when the season ends.
//
// Points: comp.js counts one point per bonus threshold. Sri Lanka (0.005 a run, 0.1 a wicket) and the Jay
// Trophy (0.5 a 25 runs, 0.5 a wicket) give fractional points, so their tables are kept in thousandths and
// halves: def.ptsScale (as in domestic-rest.js) is what a table's pts are divided by for real points.
//
// State in the save: s.wd.da = { y: [years still being made], skip: [season ids skipped], from: day }. On a
// season: fin (title settled), cz (no scorecards left), sd (knockout seeds, while the knockouts run).
import { registerComps, COMPS } from './comps.js';
import { blankRow, standings, roundRobin } from './comp.js';
import { onTick } from './state.js';
import { dayOfDate } from './dates.js';

const D = (y, m, d) => dayOfDate(y, m, d);
const rep = (v, n) => Array.from({ length: n }, () => v);
const range = (a, b, step = 1) => Array.from({ length: Math.floor((b - a) / step) + 1 }, (_, i) => a + i * step);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffled = (arr, r) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// [month, day] pairs from the season's start year; months past 11 fall in the next year.
const days = (y, md) => md.map(([m, d]) => D(y, m, d));
const ids = (nat, list) => list.map((s) => `${nat}-${s}`);
const seasonLabel = (y) => `${y}–${String(y + 1).slice(2)}`;

let ENABLED = true;
export const setDomesticAsiaEnabled = (on) => { ENABLED = !!on; };

// ----- points -----
// Ranji Trophy: win 6, innings or 10-wicket win +1, tie 3, no result 1; a draw gives 3 to the side ahead on
// first innings and 1 to the other (and 1 each with no first-innings result).
// en.wikipedia.org/wiki/2025–26_Ranji_Trophy (points table key), confirmed by the 2026-27 results.
export const RANJI_PTS = { win: 6, loss: 0, tie: 3, nr: 1, draw: 1, leadDraw: [2, 0], bigWin: 1 };
// Quaid-e-Azam Trophy 2025-26: win 16, draw (play started) 5, tie 8, plus first-innings bonus inside the first
// 100 overs: batting 1 each at 250, 300, 350, 400, 450; bowling 1 each at 6, 7, 8, 9 wickets. The extra
// bowling bonus for bowling a side out for 300, 250 or 200 can't be expressed in comp.js and is left out.
// wisden.com, "Quaid-e-Azam Trophy 2025-26 points table".
export const QEA_PTS = { win: 16, loss: 0, tie: 8, draw: 5, nr: 5, bonus: { overs: 100, bat: [250, 300, 350, 400, 450], bowl: [6, 7, 8, 9] } };
// Sri Lanka (in thousandths): outright win 12, first-innings lead in a draw 8, tie 6; 0.1 a wicket and 0.005 a
// run, at most 400 runs an innings in three-day cricket. Cricinfo archive of SLC's domestic points system
// (i.imgci.com/link_to_database/ARCHIVE/2001-02/SL_LOCAL/PTT/points.html); the fractional totals reported in
// 2025/26 (Colts 12.975 from a draw, Daily FT) fit it. comp.js counts first innings only, and a tie on first
// innings (4 each) isn't modelled.
export const SL_PTS = { win: 12000, loss: 0, tie: 6000, draw: 0, nr: 0, leadDraw: [8000, 0], bonus: { overs: 999, bat: range(1, 400).flatMap((r) => rep(r, 5)), bowl: range(1, 10).flatMap((w) => rep(w, 100)) } };
// National Cricket League 2025-26: 8 for an outright win, 2 each for a draw, from the match points listed
// (en.wikipedia.org/wiki/2025–26_National_Cricket_League). A few wins were worth 9 or 10, so a bonus exists,
// but its rules weren't found and it is left out; a tie (none happened) is given 4.
export const NCL_PTS = { win: 8, loss: 0, tie: 4, draw: 2, nr: 2 };
// Ahmad Shah Abdali: no points system is published (the 2025 table has 22 for a win with bonus points), so
// the Quaid-e-Azam scheme is used as the nearest documented one. An assumption.
export const ASA_PTS = QEA_PTS;
// Jay Trophy (in halves): outright win 6, first-innings lead 4, draw or no result 1, loss 0; batting 0.5 a 25
// runs and bowling 0.5 a wicket in the first innings (the second-innings batting bonus, up to 4, is left out).
// The lead side is taken to get 4 in all and the other side 1. en.wikipedia.org/wiki/2025–26_Jay_Trophy
export const JAY_PTS = { win: 12, loss: 0, tie: 6, draw: 2, nr: 2, leadDraw: [6, 0], bonus: { overs: 70, bat: range(25, 700, 25), bowl: range(1, 10) } };
// Limited-overs: 2 for a win, 1 for a tie or no result (the 2026 PM Cup table: 8 wins and a no result = 17).
export const ONE_DAY = { win: 2, tie: 1, nr: 1, loss: 0 };
// OC 2-Day Tournament: not published; 5 a win and 1 a draw fit the 2024-25 table (Renaissance 22 from four wins
// and two draws, Muscat CT 14 from two wins). Inferred.
export const OMA_PTS = { win: 5, loss: 0, tie: 3, draw: 1, nr: 1 };

// ----- real teams -----
// Ranji Trophy 2026-27 (11 Oct 2026 to 3 Mar 2027): Elite groups A-D of eight, Plate of six; Bihar up,
// Nagaland down from 2025-26. en.wikipedia.org/wiki/2026–27_Ranji_Trophy
const RANJI_2026 = {
  A: ['VID', 'BAR', 'UP', 'MP', 'JK', 'PDC', 'GOA', 'BIH'],
  B: ['HYD', 'SAU', 'PUN', 'KAR', 'ASM', 'CHH', 'AP', 'TRI'],
  C: ['BEN', 'MAH', 'GUJ', 'KER', 'JHA', 'DEL', 'SER', 'ODI'],
  D: ['MUM', 'TN', 'HAR', 'RAJ', 'UKD', 'RLY', 'CHD', 'HP'],
  P: ['MAN', 'MEG', 'SIK', 'MIZ', 'NAG', 'ARP'],
};
// Quaid-e-Azam Trophy 2026-27: Gold of eight, Silver of twelve in two groups of six; the Silver winner goes up.
// wisden.com, "Quaid-e-Azam Trophy 2026: all you need to know" (Nov 2026). Relegation from Gold isn't stated:
// the bottom Gold side is assumed to go down so that Gold stays at eight.
const QEA_2026 = { G: ['KHB', 'FSD', 'FATA', 'LHW', 'ISB', 'PES', 'MUL', 'SKT'], A: ['LHB', 'RWP', 'LRK', 'QTA', 'BWP', 'PEW'], B: ['KHW', 'AJK', 'HYD', 'DMJ', 'ABT', 'SKW'] };
// Sri Lanka Major Clubs 3-day Tier A 2026-27: the fourteen 2025/26 clubs with SSC (Tier B champions) for
// Chilaw Marians (relegated). Daily FT, "Chilaw Marians CC relegated to Tier B 3-Day League" (Feb 2026); the
// fourteen as listed by The Papare for the May 2026 Major Clubs limited-overs tournament. The 3-day groups
// for 2026-27 weren't published when checked: the limited-overs tournament's groups are used.
const SL_GROUPS = { A: ['MOORS', 'BAD', 'CCC', 'NUG', 'TU', 'KYCC', 'BRC'], B: ['SSC', 'NCC', 'POL', 'COLTS', 'ACE', 'BLM', 'PAN'] };
// National Cricket League 2026-27: the eight divisions (Mymensingh in for Dhaka Metropolis since 2025-26).
const NCL_TEAMS = ['DHK', 'CTG', 'RAJ', 'KHU', 'SYL', 'RAN', 'BAR', 'MYM'];
// Ahmad Shah Abdali 2026: four teams. acb.af, "Ahmad Shah Abdali First Class Tournament 2026 begins on August 29".
const ASA_TEAMS = ['MWC', 'MPS', 'HKS', 'PML'];
// Prime Minister Cup 2026: seven provinces and three departmental sides. en.wikipedia.org/wiki/2026_Prime_Minister_Cup
const PMC_TEAMS = ['ARMY', 'SUD', 'APF', 'MAD', 'POL', 'LUM', 'GAN', 'BAG', 'KAR', 'KOS'];
// Jay Trophy: 2025-26 was the top four of the 2025 PM Cup; from 2026-27 the top six of the PM Cup play.
// 2026 PM Cup: Army (champions), Sudurpashchim (runners-up), APF, Madhesh, Police, Lumbini.
// en.wikipedia.org/wiki/2025–26_Jay_Trophy; kathmandupost.com (11 Apr 2026, "CAN expands Jay Trophy").
const JAY_TEAMS = { 2026: ['APF', 'BAG', 'POL', 'ARMY'], 2027: ['ARMY', 'SUD', 'APF', 'MAD', 'POL', 'LUM'] };
// Emirates D50: six teams (emiratescricket.com, "Emirates D50 Tournament to begin from Wednesday"; the 2024 and
// 2025 editions had the same six, sportskeeda.com and thenationalnews.com).
const D50_TEAMS = ['ABU', 'AJM', 'DXB', 'EMB', 'FUJ', 'SHJ'];
// OC 2-Day Tournament 2024-25: four Premier Division sides (omancricket.org, "Renaissance Cricket crowned
// champions in OC 2-Day Tournament"). No later edition was found; it is assumed to recur each year.
const OMA_TEAMS = ['REN', 'MCT', 'MAJ', 'IAS'];

// ----- competition definitions -----
// listA: true keeps these out of the international rankings (intl.info treats them as unofficial).
const base = (o) => ({ kind: 'domestic', listA: true, ...o });
// A knockout round: its name, short code (fixture.ko; the final is 'F'), pairings and an optional format.
const ko = (name, code, pairs, fmt) => ({ type: 'dko', ko: true, name, code, pairs, ...(fmt ? { fmt } : {}) });
const DEFS = {
  // Ranji Trophy Elite: four groups of eight, single round robin of four-day games; the top two of each group
  // to the quarter-finals (A1 v B2, C1 v D2, B1 v A2, D1 v C2 here: the real pairing is by overall seeding,
  // not published as a rule), semi-finals and final. The lowest Elite side across the groups (points, then
  // quotient) goes down to the Plate and the Plate winner comes up. Regrouping each year isn't modelled: the
  // promoted side takes the relegated side's group. en.wikipedia.org/wiki/2025–26_Ranji_Trophy, /2026–27_Ranji_Trophy
  'IND-RANJI': base({ id: 'IND-RANJI', name: 'Ranji Trophy', short: 'Ranji', host: 'IND', fmt: 'FC4', level: 1, window: ['Oct 11', 'Mar 3'], points: RANJI_PTS,
    stages: [{ type: 'rr', name: 'Elite groups', labels: ['Group A', 'Group B', 'Group C', 'Group D'] },
      ko('Quarter-finals', 'QF', [['A1', 'B2'], ['C1', 'D2'], ['B1', 'A2'], ['D1', 'C2']]), ko('Semi-finals', 'SF', [['W0', 'W1'], ['W2', 'W3']]), ko('Final', 'F', [['W0', 'W1']])] }),
  // Ranji Trophy Plate: six teams, single round robin, top four to semi-finals and a final (24-28 Jan 2027).
  // The third- and fifth-place play-offs are left out.
  'IND-RANJI-PLATE': base({ id: 'IND-RANJI-PLATE', name: 'Ranji Trophy Plate', short: 'Ranji Plate', host: 'IND', fmt: 'FC4', level: 3, window: ['Oct 11', 'Jan 28'], points: RANJI_PTS,
    stages: [{ type: 'rr', name: 'Plate group' }, ko('Semi-finals', 'SF', [['1', '4'], ['2', '3']]), ko('Final', 'F', [['W0', 'W1']])] }),
  // Quaid-e-Azam Trophy Gold: eight teams, single round robin (3 Nov to 12 Dec 2026), top two in the final
  // (15-19 Dec). Silver: two groups of six (3-30 Nov), group winners in the final (3-7 Dec); the Silver winner
  // is promoted. wisden.com (Nov 2026). Four-day matches.
  'PAK-QEA': base({ id: 'PAK-QEA', name: 'Quaid-e-Azam Trophy', short: 'QeA Gold', host: 'PAK', fmt: 'FC4', level: 1, window: ['Nov 3', 'Dec 19'], points: QEA_PTS,
    stages: [{ type: 'rr', name: 'Gold league' }, ko('Final', 'F', [['1', '2']])] }),
  'PAK-QEA-SILVER': base({ id: 'PAK-QEA-SILVER', name: 'Quaid-e-Azam Trophy Silver', short: 'QeA Silver', host: 'PAK', fmt: 'FC4', level: 2, window: ['Nov 3', 'Dec 7'], points: QEA_PTS,
    stages: [{ type: 'rr', name: 'Silver groups', labels: ['Group A', 'Group B'] }, ko('Final', 'F', [['A1', 'B1']])] }),
  // Sri Lanka Major Clubs 3-day tournament (Tier A, first-class): two groups of seven, single round robin; the
  // top four of each group to the Super Eight, which carries their games against each other and adds the
  // four against the other group's qualifiers (seven games each, as reported for Colts in 2025/26); the top
  // of the Super Eight are champions, no final. 2025/26 ran from about 5 Dec to 30 Mar. The six others play
  // a Plate with relegation to Tier B; Tier B isn't in the game, so the Plate isn't modelled.
  // srilankasports.com (Colts win the 2025/26 title), ft.lk (Super Eights, Major Plate), sundaytimes.lk.
  'SL-MCT': base({ id: 'SL-MCT', name: 'Major Clubs 3-Day Tournament', short: 'Major Clubs', host: 'SL', fmt: 'FC3', level: 1, window: ['Dec 5', 'Mar 30'], points: SL_PTS, ptsScale: 1000,
    stages: [{ type: 'rr', name: 'Groups', labels: ['Group A', 'Group B'] }, { type: 'super', take: 4, carry: true, name: 'Super Eight' }] }),
  // National Cricket League: eight divisions, single round robin of four-day games, no final (2025-26: 25 Oct
  // to 9 Dec). The 28th edition began on 3 Oct 2026 (thefinancialexpress.com.bd, "NCL to kick off on October 3").
  // Its round dates weren't found; 2025-26's weekly spacing is used. The Bangladesh Cricket League is not
  // current: its first-class and List A events were folded into the franchise D3 from 2026-27 (crictracker.com,
  // Sept 2026), whose six franchises' names and squads weren't known; D3 is left for W3.
  'BAN-NCL': base({ id: 'BAN-NCL', name: 'National Cricket League', short: 'NCL', host: 'BAN', fmt: 'FC4', level: 1, window: ['Oct 3', 'Nov 20'], points: NCL_PTS,
    stages: [{ type: 'rr', name: 'League' }] }),
  // Ahmad Shah Abdali First Class Tournament 2026: four teams, double round robin, top two in the final from
  // 4 Oct; 29 Aug to 8 Oct, 13 matches (acb.af). Four-day matches.
  'AFG-ASA': base({ id: 'AFG-ASA', name: 'Ahmad Shah Abdali 4-day Tournament', short: 'Abdali 4-day', host: 'AFG', fmt: 'FC4', level: 1, window: ['Aug 29', 'Oct 8'], points: ASA_PTS,
    stages: [{ type: 'rr', name: 'League' }, ko('Final', 'F', [['1', '2']])] }),
  // Jay Trophy (Men's Elite Cup): two-day league games and a three-day final between the top two; four
  // teams in 2025-26 (20 Feb to 19 Mar 2026, the final postponed from 1-3 Mar), six from 2026-27: the top six
  // of the Prime Minister Cup. A drawn final goes to the first-innings lead (assumed; not published).
  'NEP-JAY': base({ id: 'NEP-JAY', name: 'Jay Trophy', short: 'Jay Trophy', host: 'NEP', fmt: 'FC2', level: 1, window: ['Feb 20', 'Mar 10'], points: JAY_PTS, ptsScale: 2,
    stages: [{ type: 'rr', name: 'League' }, ko('Final', 'F', [['1', '2']], 'FC3')] }),
  // Prime Minister Cup: Nepal's national one-day championship, 50 overs. 2026: ten teams (seven provinces,
  // three departmental sides), single round robin, top two in the final, 21 Mar to 17 Apr.
  // en.wikipedia.org/wiki/2026_Prime_Minister_Cup
  'NEP-PMC': base({ id: 'NEP-PMC', name: 'Prime Minister Cup', short: 'PM Cup', host: 'NEP', fmt: 'ODI', level: 1, window: ['Mar 21', 'Apr 18'], points: ONE_DAY,
    stages: [{ type: 'rr', name: 'League' }, ko('Final', 'F', [['1', '2']])] }),
  // UAE: no multi-day domestic competition was found. The main domestic one-day event is the Emirates D50: six
  // teams, single round robin, 2nd v 3rd in a play-off, the top side v its winner in the final (2023: 3-14 May;
  // 2025: final in April). emiratescricket.com; thenationalnews.com (Team Abu Dhabi, 2025 D50 title).
  'UAE-D50': base({ id: 'UAE-D50', name: 'Emirates D50', short: 'D50', host: 'UAE', fmt: 'ODI', level: 1, window: ['Apr 20', 'May 3'], points: ONE_DAY,
    stages: [{ type: 'rr', name: 'League' }, ko('Play-off', 'PO', [['2', '3']]), ko('Final', 'F', [['1', 'W0']])] }),
  // Oman: the OC 2-Day Tournament, Oman Cricket's first multi-day competition (inaugural 2024-25, won by
  // Renaissance Cricket; 70 overs a side in the first innings): four Premier Division sides, each pair twice
  // (six games each), no final; decided early March 2025. omanobserver.om, timesofoman.com (5 Mar 2025).
  'OMA-2DAY': base({ id: 'OMA-2DAY', name: 'OC 2-Day Tournament', short: 'OC 2-Day', host: 'OMA', fmt: 'FC2', level: 1, window: ['Jan 24', 'Mar 1'], points: OMA_PTS,
    stages: [{ type: 'rr', name: 'League' }] }),
};

// ----- schedules: round dates, knockout dates and teams, per season start year -----
// teams(G, y) returns { key: [team ids] } (one key per group), or null while it waits for an earlier season.
const S_ = (G, id) => G.s.wd.seasons[id] || null;
const order = (S, key) => standings(S.tables[key || 'all'] || Object.values(S.tables)[0]).map((r) => r.id);
// Final placings: champion, runner-up, then the table.
const placing = (S) => { const o = order(S); return S.champ ? [S.champ, S.runner, ...o.filter((t) => t !== S.champ && t !== S.runner)] : o; };
// Runs per wicket scored over runs per wicket conceded (the Ranji quotient), from the table's runs and balls.
const quotient = (r) => (r.ra ? (r.rf / Math.max(1, r.bf)) / (r.ra / Math.max(1, r.ba)) : 0);
// Promotion and relegation between two seasons of one year (once the tick has settled both, S.fin): the worst top-tier side across its groups
// swaps places with the lower tier's champion. Returns { top: groups, low: groups } or null while waiting.
function swap(G, topId, lowId, topKeys, lowKeys, real) {
  const t = S_(G, topId), l = S_(G, lowId); if (!t || !l) return real; if (!t.fin || !l.fin) return null;
  const rows = []; for (const k of topKeys) for (const [id, r] of Object.entries(t.tables[k] || {})) rows.push({ id, k, ...r });
  rows.sort((a, b) => a.pts - b.pts || a.w - b.w || quotient(a) - quotient(b)); const down = rows[0].id, up = l.champ;
  const group = (S, keys) => Object.fromEntries(keys.map((k) => [k, Object.keys(S.tables[k] || {})]));
  const top = group(t, topKeys), low = group(l, lowKeys);
  for (const k of topKeys) top[k] = top[k].map((x) => (x === down ? up : x));
  for (const k of lowKeys) low[k] = low[k].map((x) => (x === up ? down : x));
  return { top, low };
}
const strip = (g, n) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.map((t) => t.slice(n))]));
function ranji(G, y) {
  const r = swap(G, `IND-RANJI-${y - 1}`, `IND-RANJI-PLATE-${y - 1}`, ['A', 'B', 'C', 'D'], ['all'], 'real');
  if (r === 'real') { const { P, ...elite } = RANJI_2026; return { top: elite, low: { all: P } }; }
  return r && { top: strip(r.top, 4), low: strip(r.low, 4) };
}
function qea(G, y) {
  const r = swap(G, `PAK-QEA-${y - 1}`, `PAK-QEA-SILVER-${y - 1}`, ['all'], ['A', 'B'], 'real');
  if (r === 'real') return { top: { all: QEA_2026.G }, low: { A: QEA_2026.A, B: QEA_2026.B } };
  return r && { top: strip(r.top, 4), low: strip(r.low, 4) };
}
function jayTeams(G, y) {
  if (JAY_TEAMS[y]) return JAY_TEAMS[y];
  const pm = S_(G, `NEP-PMC-${y - 1}`); if (!pm) return JAY_TEAMS[2027]; if (!pm.fin) return null;
  return placing(pm).slice(0, 6).map((t) => t.slice(4));
}
const prefix = (nat, g) => g && Object.fromEntries(Object.entries(g).map(([k, v]) => [k, ids(nat, v)]));
// rounds: league round dates; ko: one date per knockout round; end: the season's last day.
const PLAN = [
  // 2026-27 rounds 1 (11 Oct) and 7 (1-4 Feb) are the real ones; 2-6 follow 2025-26's spacing (five rounds
  // before the white-ball break, two after). Knockouts as 2025-26 (6, 15, 24 Feb), the final moved so the
  // season ends on 3 Mar.
  { comp: 'IND-RANJI', split: true, rounds: (y) => days(y, [[9, 11], [9, 18], [9, 25], [10, 1], [10, 8], [12, 25], [13, 1]]), ko: (y) => days(y, [[13, 8], [13, 17], [13, 27]]), end: (y) => D(y + 1, 2, 3),
    teams: (G, y) => { const r = ranji(G, y); return r && prefix('IND', r.top); } },
  { comp: 'IND-RANJI-PLATE', split: true, rounds: (y) => days(y, [[9, 11], [9, 18], [9, 25], [10, 1], [10, 8]]), ko: (y) => days(y, [[12, 15], [12, 24]]), end: (y) => D(y + 1, 0, 28),
    teams: (G, y) => { const r = ranji(G, y); return r && prefix('IND', r.low); } },
  { comp: 'PAK-QEA', split: true, rounds: (y) => days(y, [[10, 3], [10, 9], [10, 15], [10, 21], [10, 27], [11, 3], [11, 9]]), ko: (y) => days(y, [[11, 15]]), end: (y) => D(y, 11, 19),
    teams: (G, y) => { const r = qea(G, y); return r && prefix('PAK', r.top); } },
  { comp: 'PAK-QEA-SILVER', split: true, rounds: (y) => days(y, [[10, 3], [10, 9], [10, 15], [10, 21], [10, 27]]), ko: (y) => days(y, [[11, 3]]), end: (y) => D(y, 11, 7),
    teams: (G, y) => { const r = qea(G, y); return r && prefix('PAK', r.low); } },
  // group rounds weekly from 5 Dec (2025/26's weekly round-ups: 8, 14, 21, 29 Dec, 4, 11 Jan); the Super Eight
  // (made by comp.js) runs from the end of January to 30 March.
  { comp: 'SL-MCT', split: true, rounds: (y) => days(y, [[11, 5], [11, 12], [11, 19], [11, 26], [12, 2], [12, 9], [12, 16]]), end: (y) => D(y + 1, 2, 30),
    teams: () => prefix('SL', SL_GROUPS) },
  { comp: 'BAN-NCL', split: true, rounds: (y) => days(y, [[9, 3], [9, 10], [9, 17], [9, 24], [9, 31], [10, 7], [10, 14]]), end: (y) => D(y, 10, 20),
    teams: () => ({ all: ids('BAN', NCL_TEAMS) }) },
  { comp: 'AFG-ASA', split: false, rounds: (y) => days(y, [[7, 29], [8, 4], [8, 10], [8, 16], [8, 22], [8, 28]]), legs: 2, ko: (y) => days(y, [[9, 4]]), end: (y) => D(y, 9, 8),
    teams: () => ({ all: ids('AFG', ASA_TEAMS) }) },
  // Jay Trophy y is the "(y-1)–y" season, played in February and March of y.
  { comp: 'NEP-JAY', split: false, label: (y) => seasonLabel(y - 1),
    rounds: (y) => days(y, y === 2026 ? [[1, 20], [1, 23], [1, 26]] : [[1, 20], [1, 23], [1, 26], [2, 1], [2, 4]]), ko: (y) => days(y, y === 2026 ? [[2, 17]] : [[2, 8]]), end: (y) => D(y, 2, y === 2026 ? 19 : 10),
    teams: (G, y) => { const t = jayTeams(G, y); return t && { all: ids('NEP', t) }; } },
  { comp: 'NEP-PMC', split: false, rounds: (y) => days(y, [[2, 21], [2, 24], [2, 27], [2, 30], [3, 2], [3, 5], [3, 8], [3, 11], [3, 14]]), ko: (y) => days(y, [[3, 17]]), end: (y) => D(y, 3, 18),
    teams: () => ({ all: ids('NEP', PMC_TEAMS) }) },
  { comp: 'UAE-D50', split: false, rounds: (y) => days(y, [[3, 20], [3, 22], [3, 24], [3, 26], [3, 28]]), ko: (y) => days(y, [[4, 1], [4, 3]]), end: (y) => D(y, 4, 3),
    teams: () => ({ all: ids('UAE', D50_TEAMS) }) },
  { comp: 'OMA-2DAY', split: false, rounds: (y) => days(y, [[0, 24], [0, 31], [1, 7], [1, 14], [1, 21], [1, 28]]), legs: 2, end: (y) => D(y, 2, 1),
    teams: () => ({ all: ids('OMA', OMA_TEAMS) }) },
];
const PLAN_BY = Object.fromEntries(PLAN.map((p) => [p.comp, p]));
export const ASIA_COMPS = Object.keys(DEFS);

function addFx(S, a, b, d, fmt, grp, stage, extra) { S.fx.push({ id: `${S.id}#R${S.fx.length}`, d, a, b, fmt, stage, grp, res: null, ...(extra || {}) }); }
function build(G, p, y, groups) {
  const def = COMPS[p.comp]; const id = `${p.comp}-${y}`; const rnd = rng(hash(id)); const ds = p.rounds(y); const keys = Object.keys(groups);
  const S = { id, comp: p.comp, y, name: `${def.name} ${p.label ? p.label(y) : p.split ? seasonLabel(y) : y}`, teams: keys.flatMap((k) => groups[k]), fx: [], tables: {}, stage: 0, done: false, champ: null, runner: null, start: ds[0], end: p.end(y) };
  for (const k of keys) {
    S.tables[k] = Object.fromEntries(groups[k].map((t) => [t, blankRow()]));
    const rr = roundRobin(shuffled(groups[k], rnd), p.legs || 1, rnd);
    rr.forEach((round, ri) => { for (const [a, b] of round) addFx(S, a, b, ds[Math.min(ri, ds.length - 1)], def.fmt, k, 0); });
  }
  S.fx.sort((a, b) => a.d - b.d);
  return S;
}
const da = (G) => (G.s.wd.da ??= { y: [], skip: [] });
// Create every season of the planned years whose teams are known.
function make(G) {
  const wd = G.s.wd; if (!wd || !ENABLED) return; const R = da(G);
  R.y = R.y.filter((y) => {
    let waiting = false;
    for (const p of PLAN) { const id = `${p.comp}-${y}`; if (wd.seasons[id] || R.skip.includes(id)) continue;
      if (p.rounds(y)[0] < (R.from ?? wd.day)) { R.skip.push(id); continue; }
      const groups = p.teams(G, y); if (!groups) { waiting = true; continue; }
      wd.seasons[id] = build(G, p, y, groups); }
    return waiting;
  });
  if (R.skip.length > 40) R.skip = R.skip.slice(-40);
}
function planner(G, y) { const wd = G.s.wd; if (!wd || !ENABLED) return []; const R = da(G); R.from ??= wd.day; if (!R.y.includes(y)) R.y.push(y); make(G); return []; }

// ----- knockouts -----
// The side ahead on first innings in a drawn or tied match (null when level or a first innings is missing).
function firstInnLead(f) { const fi = {}; for (const row of f.res.sc || []) if (!fi[row[0]]) fi[row[0]] = row; const a = fi[f.a], b = fi[f.b]; if (!a || !b || a[1] === b[1]) return null; return a[1] > b[1] ? f.a : f.b; }
// Who goes through: the winner; in a draw, tie or no result the first-innings leader, else the higher seed.
export function koWinner(S, f) { if (f.res.w) return f.res.w; const lead = firstInnLead(f); if (lead) return lead; const sd = S.sd || {}; return (sd[f.b] ?? 99) < (sd[f.a] ?? 99) ? f.b : f.a; }
function resolve(S, ref, prev) {
  const w = /^W(\d+)$/.exec(ref); if (w) { const f = prev[+w[1]]; return f ? koWinner(S, f) : null; }
  const m = /^([A-Z]?)(\d+)$/.exec(ref); const key = m[1] || 'all'; const row = standings(S.tables[key])[+m[2] - 1]; return row ? row.id : null;
}
// Seeds for drawn knockouts: group winners first (A1, B1, ...), then runners-up.
function seed(S, def) {
  const refs = def.stages.filter((x) => x.type === 'dko').flatMap((x) => x.pairs.flat()).filter((r) => !/^W/.test(r)).sort((a, b) => +a.replace(/\D/g, '') - +b.replace(/\D/g, '') || (a < b ? -1 : 1));
  S.sd ??= {}; refs.forEach((r, i) => { const t = resolve(S, r, []); if (t && S.sd[t] == null) S.sd[t] = i; });
}
function runKO(G, S, def) {
  const k = S.stage; const st = def.stages[k]; if (!st || st.type !== 'dko' || S.fx.some((f) => f.stage === k)) return;
  const p = PLAN_BY[S.comp]; const ko = p.ko ? p.ko(S.y) : []; const first = def.stages.findIndex((x) => x.type === 'dko');
  if (k === first) seed(S, def);
  const prev = S.fx.filter((f) => f.stage === k - 1 && f.grp === 'ko'); const day = G.s.wd.day;
  st.pairs.forEach(([x, z], i) => { let a = resolve(S, x, prev), b = resolve(S, z, prev); if (!a || !b) return;
    if ((S.sd[b] ?? 99) < (S.sd[a] ?? 99)) [a, b] = [b, a]; // the higher seed at home
    // the tick runs when an advance ends or a season finishes, so a round can be made a few days after its
    // planned date: it is then played as soon as it can be, and the season's end moves with it
    const d = Math.max(ko[k - first] ?? S.end, day); S.end = Math.max(S.end, d);
    addFx(S, a, b, d, st.fmt || def.fmt, 'ko', k, { ko: st.pairs.length > 1 ? `${st.code}${i + 1}` : st.code }); });
}
const mine = (S) => !!PLAN_BY[S.comp];
const CARD_DAYS = 3;
function tick(G) {
  const wd = G.s && G.s.wd; if (!wd || !ENABLED) return;
  for (const id in wd.seasons) { const S = wd.seasons[id]; if (!mine(S)) continue;
    // scorecards: a multi-day card is about 2.5 KB, so these keep theirs for three days, not world.js's two weeks
    if (!S.cz) { let left = 0; for (const f of S.fx) if (f.card) { if (wd.day - f.d > CARD_DAYS) delete f.card; else left++; } if (S.fin && !left) S.cz = 1; }
    if (S.fin) continue; const def = COMPS[S.comp];
    if (!S.done) { runKO(G, S, def); continue; }
    // the season is over: the final decides the title (comp.js named the table leader)
    const F = S.fx.find((f) => f.ko === 'F' && f.res);
    if (F) { const w = koWinner(S, F); S.champ = w; S.runner = w === F.a ? F.b : F.a; if (!F.res.w) S.decided = firstInnLead(F) ? 'first-innings lead' : 'higher seed'; }
    else if (!S.champ) { const o = order(S, S.tables.super ? 'super' : null); S.champ = o[0]; S.runner = o[1]; }
    S.fin = 1; delete S.sd;
  }
  make(G); // after the titles are settled: promotion and the Jay Trophy's teams read them
}

registerComps(DEFS, planner);
onTick(tick);

// For screens: a table's points in real units (Sri Lanka's tables are kept in thousandths, the Jay Trophy's in halves).
export const realPts = (S, pts) => { const d = COMPS[S.comp]; return d && d.ptsScale ? pts / d.ptsScale : pts; };
export { tick as domesticAsiaTick, make as domesticAsiaMake, PLAN as ASIA_PLAN };
