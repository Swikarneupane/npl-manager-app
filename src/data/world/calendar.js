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
