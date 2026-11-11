// ===== The international calendar: real fixed facts, then the game's programme =====
// Everything in REAL is a published fact, checked against the sources listed with it on the asOf date.
// Everything else (the generated Future Tours Programme, formats the ICC has not announced, every
// result after the save starts) is the game's own and is labelled "in-game" on screen.
// Months are 0-based (Jan = 0), as in src/world/dates.js.

export const asOf = '2026-11-11';

export const SOURCES = {
  l2: 'https://en.wikipedia.org/wiki/2023%E2%80%932027_ICC_Cricket_World_Cup_League_2 (final table, all 36 games played, Nov 2026)',
  cl: 'https://en.wikipedia.org/wiki/2024%E2%80%932026_Cricket_World_Cup_Challenge_League (final tables, Oct 2026)',
  po: 'https://en.wikipedia.org/wiki/2026_Cricket_World_Cup_Qualifier_Play-off; https://www.icc-cricket.com/tournaments/icc-cricket-world-cup-2027/news/details-confirmed-for-cricket-world-cup-qualifier-playoff',
  wcq: 'https://wisden.com/cricket-news/four-places-14-contenders-the-battle-to-reach-the-2027-odi-world-cup; https://ianslive.in/2027-odi-world-cup-qualifier-set-to-be-held-from-february-22-to-march-23-report--20260805182210',
  wc27: 'https://www.icc-cricket.com/tournaments/icc-cricket-world-cup-2027/news/when-does-the-2027-cricket-world-cup-start-key-details-ahead-of-tournament; https://www.icc-cricket.com/news/icc-revamp-formats-for-marquee-men-s-events (15 Jul 2026); Wisden (groups)',
  t20wc28: 'https://en.wikipedia.org/wiki/2028_ICC_Men%27s_T20_World_Cup; https://www.icc-cricket.com/news/icc-revamp-formats-for-marquee-men-s-events (format and qualification, 15 Jul 2026)',
  hosts: 'ICC announcement of the 2024–31 hosts (Nov 2021): T20 World Cup 2030 England, Ireland and Scotland; ODI World Cup 2031 India and Bangladesh',
  asia27: 'https://khelnow.com/cricket/nepal-qualify-for-mens-asia-cup-2027-202609; https://propakistani.pk/2026/07/06/bangladesh-set-to-host-asia-cup-2027/',
  nepban: 'https://www.icc-cricket.com/news/nepal-to-host-bangladesh-for-three-match-t20i-series-in-2027; https://myrepublica.nagariknetwork.com/news/bangladesh-to-tour-nepal-for-three-match-t20i-series-in-march-2027-38-48.html',
};

// ICC regions of the nations in the game's database (src/data/world/index.js).
export const REGIONS = {
  Asia: ['AFG', 'BAN', 'IND', 'PAK', 'SL', 'NEP', 'UAE', 'OMA', 'HK', 'KUW', 'QAT', 'BHR', 'SIN', 'MAS', 'KSA'],
  Africa: ['SA', 'ZIM', 'NAM', 'UGA', 'KEN', 'TAN', 'NGA', 'BOT'],
  Americas: ['WI', 'USA', 'CAN', 'BER'],
  EAP: ['AUS', 'NZ', 'PNG', 'VAN', 'SAM'],
  Europe: ['ENG', 'IRE', 'SCO', 'NED', 'ITA', 'JER', 'DEN', 'GER', 'ESP', 'FRA'],
};
export const REGION_NAME = { Asia: 'Asia', Africa: 'Africa', Americas: 'Americas', EAP: 'East Asia-Pacific', Europe: 'Europe' };
export const regionOf = (c) => Object.keys(REGIONS).find((r) => REGIONS[r].includes(c)) || 'Asia';
// The twelve full members.
export const FULL = ['IND', 'AUS', 'ENG', 'SA', 'NZ', 'PAK', 'AFG', 'WI', 'SL', 'BAN', 'ZIM', 'IRE'];

// ----- Real facts -----
// Table rows: [team, played, won, lost, tied, no result, points, net run rate].
export const REAL = {
  // ICC CWC League 2, 2023–27: complete. Top four to the Qualifier, bottom four to the Play-off.
  l2: { name: 'ICC CWC League 2 2023–26', from: 2023, to: 2026, fmt: 'ODI', src: SOURCES.l2,
    table: [['USA', 36, 24, 11, 0, 1, 49, 0.653], ['SCO', 36, 19, 10, 0, 7, 45, 0.710], ['NED', 36, 20, 12, 0, 4, 44, 0.315], ['OMA', 36, 15, 18, 0, 3, 33, -0.224],
      ['NAM', 36, 15, 18, 0, 3, 33, -0.278], ['NEP', 36, 14, 20, 0, 2, 30, 0.000], ['CAN', 36, 12, 19, 0, 5, 29, -0.330], ['UAE', 36, 11, 22, 0, 3, 25, -0.778]] },
  // CWC Challenge League 2024–26: complete. Top two of each league to the Play-off; bottom two relegated.
  cl: { name: 'CWC Challenge League 2024–26', from: 2024, to: 2026, fmt: 'List A', src: SOURCES.cl,
    groups: {
      A: [['JER', 15, 12, 2, 1, 0, 25, 1.895], ['KUW', 15, 9, 4, 1, 1, 20, 0.467], ['DEN', 15, 6, 8, 0, 1, 13, -0.269], ['PNG', 15, 5, 8, 0, 2, 12, -1.076], ['QAT', 15, 4, 9, 0, 2, 10, -0.680], ['KEN', 15, 4, 9, 0, 2, 10, -0.685]],
      B: [['ITA', 15, 12, 1, 0, 2, 26, 2.152], ['UGA', 15, 10, 3, 0, 2, 22, 1.204], ['HK', 15, 9, 4, 0, 2, 20, 0.382], ['BHR', 15, 6, 8, 0, 1, 13, -0.249], ['TAN', 15, 3, 10, 0, 2, 8, -1.000], ['SIN', 15, 0, 14, 0, 1, 1, -2.318]],
    },
    relegated: ['QAT', 'KEN', 'TAN', 'SIN'] },
  // The 2026 Qualifier Play-off: Nepal host, 8 teams, a single round robin of 28 ODIs; the top four go to the Qualifier.
  po26: { name: "ICC Men's CWC Qualifier Play-off 2026", host: 'NEP', venue: 'Kirtipur and Mulpani', start: [2026, 11, 4], end: [2026, 11, 21],
    teams: ['CAN', 'NAM', 'NEP', 'UAE', 'JER', 'KUW', 'ITA', 'UGA'], src: SOURCES.po },
  // The 2027 World Cup Qualifier: 10 teams for four places. Host not announced; the format is the game's (the 2023 format).
  wcq27: { name: "ICC Men's CWC Qualifier 2027", start: [2027, 1, 22], end: [2027, 2, 23], full: ['WI', 'IRE'], fromL2: ['USA', 'SCO', 'NED', 'OMA'], src: SOURCES.wcq,
    note: 'Dates as reported in August 2026; host and format not announced. The game uses two groups of five, a Super Six and a final.' },
  // ODI World Cup 2027: 14 teams. Super Series (3), two groups of six, Super 7, semi-finals and final.
  wc27: { name: "ICC Men's Cricket World Cup 2027", hosts: 'South Africa, Zimbabwe and Namibia', start: [2027, 9, 2], ssEnd: [2027, 9, 6], groupEnd: [2027, 9, 23], s7Start: [2027, 9, 25], sf: [2027, 10, 17], final: [2027, 10, 21],
    groups: { A: ['IND', 'AUS', 'PAK', 'AFG', 'ZIM'], B: ['NZ', 'SA', 'SL', 'ENG', 'BAN'] }, src: SOURCES.wc27,
    note: 'The Qualifier winner joins Group A; the next three play the Super Series in Windhoek and its winner joins Group B.' },
  // T20 World Cup 2028: Australia and New Zealand, 12 Oct to 12 Nov 2028. New format announced July 2026.
  t20wc28: { name: "ICC Men's T20 World Cup 2028", hosts: 'Australia and New Zealand', host: ['AUS', 'NZ'], start: [2028, 9, 12], end: [2028, 10, 12],
    auto: ['AUS', 'NZ', 'ENG', 'IND', 'PAK', 'SA', 'SL', 'WI', 'ZIM', 'AFG', 'BAN', 'IRE'],
    gqDirect: ['CAN', 'ITA', 'NAM', 'NEP', 'NED', 'OMA', 'UAE', 'USA'],
    regional: { Africa: 2, Asia: 2, Europe: 2, Americas: 1, EAP: 1 }, src: SOURCES.t20wc28,
    note: 'Five groups of four, a Super 10 in two groups of five, two eliminators, semi-finals and final. Scotland enter the Europe regional final. The Global Qualifier sends the best team from each region and the next three.' },
  hosts: { t20wc30: { name: "ICC Men's T20 World Cup 2030", hosts: 'England, Ireland and Scotland', host: ['ENG', 'IRE', 'SCO'] }, wc31: { name: "ICC Men's Cricket World Cup 2031", hosts: 'India and Bangladesh', host: ['IND', 'BAN'] }, src: SOURCES.hosts },
  // Asia Cup 2027: ODI, Bangladesh, 18 Jun to 4 Jul 2027, six teams (Nepal won the 2026 ACC Premier Cup).
  asia27: { name: 'Asia Cup 2027', host: 'BAN', hosts: 'Bangladesh', start: [2027, 5, 18], end: [2027, 6, 4], fmt: 'ODI', teams: ['IND', 'PAK', 'SL', 'AFG', 'BAN', 'NEP'], src: SOURCES.asia27,
    note: 'Groups not announced; the game uses two groups of three, a Super Four and a final.' },
  accpc26: { name: 'ACC Men\'s Premier Cup 2026', champ: 'NEP', runner: 'UAE', note: 'Nepal beat Oman in the semi-final and UAE in the final.', src: SOURCES.asia27 },
  // Nepal v Bangladesh, three T20Is at Kirtipur, 26, 28 and 30 March 2027.
  nepban27: { name: 'Nepal v Bangladesh T20I series', host: 'NEP', visitor: 'BAN', venue: 'Kirtipur', days: [[2027, 2, 26], [2027, 2, 28], [2027, 2, 30]], src: SOURCES.nepban },
};

// ----- The game's programme (in-game) -----
// Windows the game uses where the real one is not known. [month, day] pairs; in-game.
export const PROGRAMME = {
  // ODI World Cups after 2027: every four years, with the 2027 format. Window Oct–Nov.
  odiWC: (y) => (y >= 2027 && (y - 2027) % 4 === 0 ? y : null),
  // T20 World Cups: 2028, 2030, then every two years (Feb–Mar from 2032; in-game).
  t20WC: (y) => (y >= 2028 && y % 2 === 0 ? y : null),
  t20Window: (y) => (y === 2028 ? [[9, 12], [10, 12]] : y === 2030 ? [[5, 6], [6, 7]] : [[1, 7], [2, 8]]),
  // Asia Cup every odd year from 2027; its format follows the next ICC event (ODI in ODI World Cup years).
  asiaCup: (y) => (y >= 2027 && y % 2 === 1 ? y : null),
  asiaFmt: (y) => ((y - 2027) % 4 === 0 ? 'ODI' : 'T20'),
  asiaHosts: ['IND', 'PAK', 'SL', 'BAN', 'AFG', 'UAE'], // rotation for editions without a named host (in-game)
};

// Home seasons for bilateral series: [[month, day], [month, day]] windows in which a host usually plays at home.
export const HOME = {
  AUS: [[[0, 5], [2, 10]], [[9, 1], [11, 20]]], NZ: [[[0, 5], [3, 5]], [[10, 1], [11, 20]]], SA: [[[0, 5], [2, 20]], [[9, 1], [11, 15]]], ZIM: [[[1, 1], [3, 20]], [[6, 1], [9, 10]]],
  ENG: [[[4, 20], [8, 20]]], IRE: [[[4, 20], [8, 15]]], SCO: [[[5, 1], [7, 31]]], NED: [[[5, 1], [7, 31]]], ITA: [[[5, 1], [8, 15]]], JER: [[[5, 1], [7, 31]]], DEN: [[[5, 1], [7, 31]]], GER: [[[5, 1], [7, 31]]], ESP: [[[4, 1], [9, 15]]], FRA: [[[5, 1], [7, 31]]],
  IND: [[[0, 10], [2, 15]], [[8, 15], [11, 20]]], PAK: [[[0, 10], [2, 10]], [[8, 25], [11, 15]]], BAN: [[[0, 10], [2, 15]], [[9, 1], [11, 20]]], SL: [[[0, 10], [3, 10]], [[5, 15], [7, 31]]], AFG: [[[0, 15], [2, 15]], [[8, 1], [10, 15]]],
  WI: [[[0, 15], [3, 10]], [[5, 20], [7, 31]]], USA: [[[4, 15], [6, 31]]], CAN: [[[5, 1], [8, 15]]], BER: [[[5, 1], [7, 31]]],
  NEP: [[[1, 1], [4, 10]], [[8, 1], [9, 15]]], UAE: [[[0, 10], [3, 15]], [[9, 1], [11, 15]]], OMA: [[[0, 10], [2, 31]], [[9, 15], [11, 15]]], HK: [[[1, 1], [3, 30]], [[9, 15], [11, 15]]],
  KUW: [[[0, 15], [2, 31]], [[10, 1], [11, 15]]], QAT: [[[0, 15], [2, 31]], [[10, 1], [11, 15]]], BHR: [[[0, 15], [2, 31]], [[10, 1], [11, 15]]], SIN: [[[1, 1], [4, 15]], [[8, 1], [9, 31]]], MAS: [[[1, 1], [4, 15]], [[8, 1], [9, 31]]], KSA: [[[0, 15], [2, 31]], [[10, 1], [11, 15]]],
  NAM: [[[1, 15], [4, 31]], [[7, 15], [9, 31]]], UGA: [[[3, 1], [5, 30]], [[7, 1], [9, 31]]], KEN: [[[3, 1], [5, 30]], [[7, 1], [9, 31]]], TAN: [[[3, 1], [5, 30]], [[7, 1], [9, 31]]], NGA: [[[2, 1], [4, 31]], [[9, 15], [11, 15]]], BOT: [[[3, 1], [5, 30]], [[7, 15], [8, 31]]],
  PNG: [[[6, 1], [9, 15]]], VAN: [[[7, 1], [9, 30]]], SAM: [[[7, 1], [9, 30]]],
};
// Nepal's home grounds (the two international venues in the Kathmandu valley).
export const NEPAL_VENUES = ['Kirtipur', 'Mulpani'];
// The NPL window, which Nepal's bilateral programme keeps clear (in-game).
export const NPL_WINDOW = [[9, 20], [11, 5]];
// The IPL window, which full members keep clear of bilateral cricket (in-game).
export const IPL_WINDOW = [[2, 25], [4, 31]];

// ----- Test cricket and the World Test Championship -----
// Facts below are checked against the sources listed with them on the asOf date. Results are real up to
// the save's start (15 Sep 2026 for a new game); everything after it is simulated in-game, even where
// the real result is known (those are kept here for the check in scripts/unit/tests-wtc.test.mjs).
export const TEST_SOURCES = {
  wtc: 'https://en.wikipedia.org/wiki/2025%E2%80%932027_ICC_World_Test_Championship (table "updated to match(es) played on 9 November 2026"; series, dates, venues, results and over-rate deductions)',
  ded: 'ESPNcricinfo/ICC reports cited there: "England docked WTC points for slow over rate in Lord\'s Test" (16 Jul 2025), "… in Oval Test" (21 Jun 2026), "West Indies docked WTC points for slow over-rate" (8 Jul 2026), "Pakistan docked WTC points for slow over-rate in Mirpur Test" (15 May 2026), "Pakistan hit with dual World Test Championship sanction" (14 Sep 2026)',
  final27: 'https://www.icc-cricket.com/news/venue-and-dates-for-world-test-championship-2027-final-revealed (The Oval, 9–13 June 2027)',
  hosts: 'https://www.skysports.com/cricket/news/12040/13399291/world-test-championship-icc-confirm-next-three-finals-to-be-held-in-england (ICC annual conference, 20 Jul 2025: England host the 2027, 2029 and 2031 finals)',
  points: 'ICC World Test Championship playing conditions: 12 points for a win, 6 for a tie, 4 for a draw; teams ranked by percentage of points won',
  eng27: 'https://www.wisden.com/cricket-news/england-home-schedule-for-2027-announced-complete-list-of-tests-odis-and-t20is-for-the-summer (ECB, 23 Jul 2026)',
  mcg150: 'https://www.cricket.com.au/news/4231356 (150th Anniversary Test, MCG, day-night, 11–15 March 2027; a one-off outside the WTC)',
  tbc: 'Wisden, "WTC 2025-27: what is England\'s schedule" and South Africa\'s WTC schedule (chaseyoursport.com): Bangladesh v England (Feb 2027), Sri Lanka v South Africa (Feb–Mar 2027) and Pakistan v New Zealand (Mar 2027) have no published dates; the game picks dates in those windows',
};
// Real trophies for Test series between these pairs (sorted codes). Series without one are named by the teams.
export const TROPHY = {
  'AUS-ENG': 'The Ashes', 'AUS-IND': 'Border–Gavaskar Trophy', 'ENG-IND': 'Anderson–Tendulkar Trophy', 'AUS-WI': 'Frank Worrell Trophy',
  'AUS-NZ': 'Trans-Tasman Trophy', 'ENG-SA': "Basil D'Oliveira Trophy", 'ENG-NZ': 'Crowe–Thorpe Trophy', 'SL-WI': 'Sobers–Tissera Trophy',
  'IND-SA': 'Freedom Trophy', 'ENG-WI': 'Richards–Botham Trophy', 'AUS-PAK': 'Benaud–Qadir Trophy', 'AUS-SL': 'Warne–Muralitharan Trophy',
  'NZ-SA': 'Tangiwai Shield', 'SA-WI': 'Sir Vivian Richards Trophy',
};
// A Test: [[y, m, d] first day, venue, result for the host ('H' won, 'A' lost, 'D' drawn, null to come), margin, { team: points deducted }].
// A series: { h: host, v: visitor, tests } or, with dates not announced, { h, v, n, win: [[y, m, d], [y, m, d]] }.
export const WTC = {
  teams: ['IND', 'AUS', 'ENG', 'SA', 'NZ', 'PAK', 'SL', 'WI', 'BAN'],
  points: { win: 12, tie: 6, draw: 4, loss: 0 },
  // first-day order for teams level on percentage (in-game tie-break): wins, then fewer losses
  c25: {
    name: 'ICC World Test Championship 2025–27', from: 2025, to: 2027, src: TEST_SOURCES.wtc,
    final: { venue: 'The Oval, London', start: [2027, 5, 9], end: [2027, 5, 13], src: TEST_SOURCES.final27 },
    series: [
      { h: 'SL', v: 'BAN', tests: [[[2025, 5, 17], 'Galle', 'D'], [[2025, 5, 25], 'Colombo (SSC)', 'H', 'an innings and 78 runs']] },
      { h: 'ENG', v: 'IND', tests: [[[2025, 5, 20], 'Headingley', 'H', '5 wickets'], [[2025, 6, 2], 'Edgbaston', 'A', '336 runs'], [[2025, 6, 10], "Lord's", 'H', '22 runs', { ENG: 2 }], [[2025, 6, 23], 'Old Trafford', 'D'], [[2025, 6, 31], 'The Oval', 'A', '6 runs']] },
      { h: 'WI', v: 'AUS', tests: [[[2025, 5, 25], 'Bridgetown', 'A', '159 runs'], [[2025, 6, 3], "St George's, Grenada", 'A', '133 runs'], [[2025, 6, 12], 'Kingston', 'A', '176 runs']] },
      { h: 'IND', v: 'WI', tests: [[[2025, 9, 2], 'Ahmedabad', 'H', 'an innings and 140 runs'], [[2025, 9, 10], 'Delhi', 'H', '7 wickets']] },
      { h: 'PAK', v: 'SA', tests: [[[2025, 9, 12], 'Lahore', 'H', '93 runs'], [[2025, 9, 20], 'Rawalpindi', 'A', '8 wickets']] },
      { h: 'IND', v: 'SA', tests: [[[2025, 10, 14], 'Kolkata', 'A', '30 runs'], [[2025, 10, 22], 'Guwahati', 'A', '408 runs']] },
      { h: 'AUS', v: 'ENG', tests: [[[2025, 10, 21], 'Perth', 'H', '8 wickets'], [[2025, 11, 4], 'Brisbane', 'H', '8 wickets'], [[2025, 11, 17], 'Adelaide', 'H', '82 runs'], [[2025, 11, 26], 'Melbourne', 'A', '4 wickets'], [[2026, 0, 4], 'Sydney', 'H', '5 wickets']] },
      { h: 'NZ', v: 'WI', tests: [[[2025, 11, 2], 'Christchurch', 'D'], [[2025, 11, 10], 'Wellington', 'H', '9 wickets'], [[2025, 11, 18], 'Mount Maunganui', 'H', '323 runs']] },
      { h: 'BAN', v: 'PAK', tests: [[[2026, 4, 8], 'Dhaka', 'H', '104 runs', { PAK: 8 }], [[2026, 4, 16], 'Sylhet', 'H', '78 runs']] },
      { h: 'ENG', v: 'NZ', tests: [[[2026, 5, 4], "Lord's", 'H', '115 runs'], [[2026, 5, 17], 'The Oval', 'A', '253 runs', { ENG: 12 }], [[2026, 5, 25], 'Trent Bridge', 'A', '160 runs']] },
      { h: 'WI', v: 'SL', tests: [[[2026, 5, 25], 'North Sound', 'H', 'an innings and 217 runs'], [[2026, 6, 3], 'North Sound', 'D', '', { WI: 2 }]] },
      { h: 'WI', v: 'PAK', tests: [[[2026, 6, 25], 'San Fernando', 'H', '90 runs'], [[2026, 7, 2], 'Port of Spain', 'A', '8 wickets']] },
      { h: 'AUS', v: 'BAN', tests: [[[2026, 7, 13], 'Darwin', 'A', '9 wickets'], [[2026, 7, 22], 'Mackay', 'H', 'an innings and 51 runs']] },
      { h: 'SL', v: 'IND', tests: [[[2026, 7, 15], 'Galle', 'A', '165 runs'], [[2026, 7, 23], 'Colombo (SSC)', 'D']] },
      { h: 'ENG', v: 'PAK', tests: [[[2026, 7, 19], 'Headingley', 'H', 'an innings and 103 runs'], [[2026, 7, 27], "Lord's", 'H', '194 runs'], [[2026, 8, 9], 'Edgbaston', 'H', '8 wickets', { PAK: 11 }]] },
      // ----- after a new game's start (15 Sep 2026): played in-game -----
      { h: 'SA', v: 'AUS', tests: [[[2026, 9, 9], 'Durban', 'A', '214 runs'], [[2026, 9, 18], 'Gqeberha', 'H', 'an innings and 31 runs'], [[2026, 9, 27], 'Cape Town', 'H', '176 runs']] },
      { h: 'BAN', v: 'WI', tests: [[[2026, 9, 28], 'Dhaka', 'A', '8 wickets'], [[2026, 10, 5], 'Sylhet', 'D']] },
      { h: 'PAK', v: 'SL', tests: [[[2026, 10, 9], 'Rawalpindi', null], [[2026, 10, 17], 'Lahore', null]] },
      { h: 'SA', v: 'BAN', tests: [[[2026, 10, 15], 'Johannesburg', null], [[2026, 10, 23], 'Centurion', null]] },
      { h: 'NZ', v: 'IND', tests: [[[2026, 10, 19], 'Wellington', null], [[2026, 10, 27], 'Christchurch', null]] },
      { h: 'AUS', v: 'NZ', tests: [[[2026, 11, 9], 'Perth', null], [[2026, 11, 17], 'Adelaide', null], [[2026, 11, 26], 'Melbourne', null], [[2027, 0, 4], 'Sydney', null]] },
      { h: 'SA', v: 'ENG', tests: [[[2026, 11, 17], 'Johannesburg', null], [[2026, 11, 26], 'Centurion', null], [[2027, 0, 3], 'Cape Town', null]] },
      { h: 'IND', v: 'AUS', tests: [[[2027, 0, 21], 'Nagpur', null], [[2027, 0, 29], 'Chennai', null], [[2027, 1, 11], 'Guwahati', null], [[2027, 1, 19], 'Ranchi', null], [[2027, 1, 27], 'Ahmedabad', null]] },
      { h: 'NZ', v: 'SL', tests: [[[2027, 1, 4], 'Mount Maunganui', null], [[2027, 1, 12], 'Hamilton', null]] },
      { h: 'BAN', v: 'ENG', n: 2, win: [[2027, 1, 10], [2027, 1, 22]], venues: ['Dhaka', 'Chattogram'], src: TEST_SOURCES.tbc },
      { h: 'SL', v: 'SA', n: 2, win: [[2027, 1, 24], [2027, 2, 9]], src: TEST_SOURCES.tbc },
      { h: 'PAK', v: 'NZ', n: 2, win: [[2027, 2, 4], [2027, 2, 16]], src: TEST_SOURCES.tbc },
    ],
    // The published table after the matches of 9 Nov 2026: [team, played, won, lost, drawn, tied, deducted, points, PCT].
    table: [['NZ', 6, 4, 1, 1, 0, 0, 52, 72.22], ['SA', 7, 5, 2, 0, 0, 0, 60, 71.43], ['AUS', 13, 9, 4, 0, 0, 0, 108, 69.23], ['IND', 11, 5, 4, 2, 0, 0, 68, 51.52],
      ['BAN', 8, 3, 3, 2, 0, 0, 44, 45.83], ['ENG', 16, 7, 8, 1, 0, 14, 74, 38.54], ['SL', 6, 1, 2, 3, 0, 0, 24, 33.33], ['WI', 14, 3, 8, 3, 0, 2, 46, 27.38], ['PAK', 9, 2, 7, 0, 0, 19, 5, 4.63]],
    tableAsOf: [2026, 10, 9],
  },
  // Later finals: England hosts 2029 and 2031 (venues not chosen yet); after that, not announced.
  finalHost: (y) => (y === 2027 ? 'The Oval, London' : y === 2029 || y === 2031 ? 'England (venue not announced)' : 'Hosts not announced'),
  // The 2027 Ashes opens the game's 2027–29 cycle (the ICC has not published that cycle's schedule).
  c27: { series: [{ h: 'ENG', v: 'AUS', tests: [[[2027, 5, 18], 'Trent Bridge', null], [[2027, 5, 30], "Lord's", null], [[2027, 6, 8], 'Edgbaston', null], [[2027, 6, 21], 'Southampton', null], [[2027, 6, 29], 'The Oval', null]], src: TEST_SOURCES.eng27 }] },
};
// Real Tests outside the WTC.
export const OTHER_TESTS = [
  { h: 'AUS', v: 'ENG', name: '150th Anniversary Test', tests: [[[2027, 2, 11], 'Melbourne (day-night)', null]], src: TEST_SOURCES.mcg150 },
  { h: 'ENG', v: 'BAN', tests: [[[2027, 4, 28], "Lord's", null]], src: TEST_SOURCES.eng27 },
];
// Series lengths the game uses for generated WTC series (sorted pair -> Tests); other pairs play two.
export const TEST_LEN = { 'AUS-ENG': 5, 'AUS-IND': 5, 'ENG-IND': 5, 'AUS-SA': 3, 'AUS-NZ': 3, 'ENG-SA': 3, 'ENG-NZ': 3, 'ENG-WI': 3, 'ENG-PAK': 3, 'ENG-SL': 3, 'AUS-PAK': 3, 'AUS-WI': 3, 'IND-SA': 3, 'IND-NZ': 3, 'NZ-SA': 2 };
// Nations that play Tests outside the WTC (fewer, generated in-game).
export const TEST_OTHERS = ['AFG', 'IRE', 'ZIM'];
