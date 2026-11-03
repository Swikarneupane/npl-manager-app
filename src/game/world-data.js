// ===== World cricket: static data =====
// League and franchise names are real (checked against each league's 2025-26 or 2026 season).
// Results before the save starts are real only where listed in REAL_2026 (checked against match
// reports); every result after that is simulated by the game and labelled "in-game".
// Team strengths and ranking seeds are the game's own numbers, not ICC ratings.

// The eight foreign T20 leagues, in the order the digest lists them (then the NPL).
// fin: month the final is usually played; start: when the next edition usually begins (winter leagues only).
export const LEAGUES = [
  { k: 'bbl', short: 'BBL', name: 'Big Bash League', fin: 'Jan', start: 'mid-December', winter: true, host: 'Australia',
    teams: ['Adelaide Strikers', 'Brisbane Heat', 'Hobart Hurricanes', 'Melbourne Renegades', 'Melbourne Stars', 'Perth Scorchers', 'Sydney Sixers', 'Sydney Thunder'] },
  { k: 'sa20', short: 'SA20', name: 'SA20', fin: 'Feb', start: 'late December', winter: true, host: 'South Africa',
    teams: ["Durban's Super Giants", 'Joburg Super Kings', 'MI Cape Town', 'Paarl Royals', 'Pretoria Capitals', 'Sunrisers Eastern Cape'] },
  { k: 'ilt20', short: 'ILT20', name: 'ILT20', fin: 'Jan', start: 'early December', winter: true, host: 'UAE',
    teams: ['Abu Dhabi Knight Riders', 'Desert Vipers', 'Dubai Capitals', 'Gulf Giants', 'MI Emirates', 'Sharjah Warriors'] },
  { k: 'bpl', short: 'BPL', name: 'Bangladesh Premier League', fin: 'Jan', start: 'late December', winter: true, host: 'Bangladesh',
    teams: ['Chattogram Royals', 'Dhaka Capitals', 'Noakhali Express', 'Rajshahi Warriors', 'Rangpur Riders', 'Sylhet Titans'] },
  { k: 'ipl', short: 'IPL', name: 'Indian Premier League', fin: 'May', host: 'India',
    teams: ['Chennai Super Kings', 'Delhi Capitals', 'Gujarat Titans', 'Kolkata Knight Riders', 'Lucknow Super Giants', 'Mumbai Indians', 'Punjab Kings', 'Rajasthan Royals', 'Royal Challengers Bengaluru', 'Sunrisers Hyderabad'] },
  { k: 'psl', short: 'PSL', name: 'Pakistan Super League', fin: 'May', host: 'Pakistan',
    teams: ['Hyderabad Kingsmen', 'Islamabad United', 'Karachi Kings', 'Lahore Qalandars', 'Multan Sultans', 'Peshawar Zalmi', 'Quetta Gladiators', 'Rawalpindiz'] },
  { k: 'mlc', short: 'MLC', name: 'Major League Cricket', fin: 'Jul', host: 'USA',
    teams: ['Los Angeles Knight Riders', 'MI New York', 'San Francisco Unicorns', 'Seattle Orcas', 'Texas Super Kings', 'Washington Freedom'] },
  { k: 'cpl', short: 'CPL', name: 'Caribbean Premier League', fin: 'Sep', host: 'West Indies',
    teams: ['Antigua and Barbuda Falcons', 'Barbados Royals', 'Guyana Amazon Warriors', 'Jamaica Kingsmen', 'Saint Lucia Kings', 'St Kitts and Nevis Patriots', 'Trinbago Knight Riders'] },
];
export const LEAGUE_BY = Object.fromEntries(LEAGUES.map((l) => [l.k, l]));

// The real 2026 finals (calendar year 2026, all before the save starts). Scores from match reports.
export const REAL_2026 = {
  bbl: { champ: 'Perth Scorchers', runner: 'Sydney Sixers', margin: 'by 6 wickets', when: 'Jan', story: 'BBL|15 final at Perth Stadium. The Sixers were bowled out for 132 and Perth chased it down with six wickets in hand.' },
  sa20: { champ: 'Sunrisers Eastern Cape', runner: 'Pretoria Capitals', margin: 'by 6 wickets', when: 'Jan', story: 'Final at Newlands. Pretoria made 158 for 7; the Sunrisers reached 162 for 4 in the 20th over.' },
  ilt20: { champ: 'Desert Vipers', runner: 'MI Emirates', margin: 'by 46 runs', when: 'Jan', story: 'Final in Dubai. The Vipers made 182 for 4 and bowled MI Emirates out for 136 for their first ILT20 title.' },
  bpl: { champ: 'Rajshahi Warriors', runner: 'Chattogram Royals', margin: 'by 63 runs', when: 'Jan', story: 'Final at Mirpur. Rajshahi made 174 for 4 and bowled Chattogram out for 111.',
    nep: 'Sandeep Lamichhane was in the Rajshahi Warriors squad for the season.' },
  ipl: { champ: 'Royal Challengers Bengaluru', runner: 'Gujarat Titans', margin: 'by 5 wickets', when: 'May', story: 'Final in Ahmedabad. Gujarat made 155 for 8 and Bengaluru chased it with five wickets in hand to defend their title.' },
  psl: { champ: 'Peshawar Zalmi', runner: 'Hyderabad Kingsmen', margin: 'by 5 wickets', when: 'May', story: 'Final in Lahore. The debutants Hyderabad were all out for 129; Peshawar reached 130 for 5 in the 16th over.' },
  mlc: { champ: 'Los Angeles Knight Riders', runner: 'Washington Freedom', margin: 'by 1 run', when: 'Jul', story: 'Final in Oakland. Los Angeles were all out for 164; Washington finished on 163 for 9, one run short.' },
  cpl: { champ: 'Antigua and Barbuda Falcons', runner: 'Jamaica Kingsmen', margin: 'by 8 wickets', when: 'Sep', story: 'Final at Kensington Oval. Jamaica made 170 for 9; the Falcons chased 171 in 16.4 overs for their first CPL title.' },
};

// Facts the screens may state about Nepali players abroad (verified).
export const NEP_ABROAD_FACTS = [
  'Sandeep Lamichhane became the first Nepali player in the IPL in 2018.',
  'Sandeep Lamichhane plays in the BPL for Rajshahi Warriors.',
];

// The 2026 T20 World Cup (India and Sri Lanka, 7 Feb to 8 Mar 2026): history, before the save starts.
export const T20WC_2026 = {
  y: 2026, fmt: 'T20I', name: 'T20 World Cup 2026', hosts: 'India and Sri Lanka', when: 'Feb–Mar 2026', real: true,
  champ: 'India', runner: 'New Zealand', finalM: 'by 96 runs',
  nepal: { stage: 'Group stage', wins: 1, group: 'C', place: 5,
    res: [
      { v: 'England', r: 'L' }, { v: 'West Indies', r: 'L' }, { v: 'Italy', r: 'L' },
      { v: 'Scotland', r: 'W', m: 'by 7 wickets', line: 'Mumbai, 17 Feb: Scotland 170 for 7, Nepal chased 171 with four balls to spare' },
    ] },
  note: 'Nepal finished fifth in Group C with one win, against Scotland. West Indies and England went through to the Super 8. India beat New Zealand in the final in Ahmedabad.',
};
export const T20WC_2024 = { y: 2024, fmt: 'T20I', name: 'T20 World Cup 2024', hosts: 'USA and West Indies', when: 'Jun 2024', real: true, nepal: { stage: 'Group stage' } };

// Future World Cups the game simulates. The winter is the off-season they fall in.
// Hosts as announced by the ICC; after 2031 the hosts are not set and the game leaves them open.
export const WORLD_CUPS = [
  { y: 2027, winter: 2027, fmt: 'ODI', name: 'ODI World Cup 2027', hosts: 'South Africa, Zimbabwe and Namibia', when: 'Oct–Nov 2027', cities: ['Johannesburg', 'Cape Town', 'Durban', 'Centurion', 'Harare', 'Bulawayo', 'Windhoek'] },
  { y: 2028, winter: 2027, fmt: 'T20I', name: 'T20 World Cup 2028', hosts: 'Australia and New Zealand', when: 'Early 2028', cities: ['Melbourne', 'Sydney', 'Adelaide', 'Perth', 'Brisbane', 'Hobart', 'Auckland', 'Christchurch', 'Wellington'] },
  { y: 2030, winter: 2029, fmt: 'T20I', name: 'T20 World Cup 2030', hosts: 'England, Ireland and Scotland', when: 'Mid 2030', cities: ['London', 'Birmingham', 'Manchester', 'Southampton', 'Leeds', 'Dublin', 'Belfast', 'Edinburgh'] },
  { y: 2031, winter: 2031, fmt: 'ODI', name: 'ODI World Cup 2031', hosts: 'India and Bangladesh', when: 'Late 2031', cities: ['Mumbai', 'Kolkata', 'Ahmedabad', 'Chennai', 'Bengaluru', 'Delhi', 'Dhaka', 'Chattogram'] },
];
// After 2031: a T20 World Cup every odd winter and an ODI World Cup every four years, hosts not known.
export function worldCupsFor(w) {
  const list = WORLD_CUPS.filter((c) => c.winter === w);
  if (w > 2031 && (w - 2031) % 4 === 0) list.push({ y: w, winter: w, fmt: 'ODI', name: `ODI World Cup ${w}`, hosts: 'Hosts not yet named', when: `${w}`, cities: [] });
  if (w >= 2031 && w % 2 === 1 && !list.some((c) => c.fmt === 'T20I')) list.push({ y: w + 1, winter: w, fmt: 'T20I', name: `T20 World Cup ${w + 1}`, hosts: 'Hosts not yet named', when: `${w + 1}`, cities: [] });
  return list;
}

// Teams for rankings and simulated internationals: code, name, T20I and ODI strength (the game's
// scale: the strength of a generated XI, where about 74 is an even match for Nepal's 2026 squad).
// test: plays Test cricket (World Test Championship).
export const NATIONS = [
  ['IND', 'India', 88, 88, 1], ['AUS', 'Australia', 86, 87, 1], ['ENG', 'England', 85, 84, 1], ['SA', 'South Africa', 84, 85, 1],
  ['NZ', 'New Zealand', 83, 84, 1], ['PAK', 'Pakistan', 82, 82, 1], ['AFG', 'Afghanistan', 81, 82, 0], ['WI', 'West Indies', 81, 77, 1],
  ['SL', 'Sri Lanka', 80, 81, 1], ['BAN', 'Bangladesh', 78, 79, 1], ['ZIM', 'Zimbabwe', 77, 76, 0], ['IRE', 'Ireland', 76, 75, 0],
  ['NED', 'Netherlands', 75, 75, 0], ['SCO', 'Scotland', 74, 75, 0], ['NEP', 'Nepal', 74, 74, 0], ['NAM', 'Namibia', 72, 72, 0],
  ['USA', 'USA', 72, 72, 0], ['UAE', 'UAE', 70, 70, 0], ['OMA', 'Oman', 70, 71, 0], ['CAN', 'Canada', 68, 69, 0],
  ['ITA', 'Italy', 66, 62, 0], ['HK', 'Hong Kong', 66, 64, 0], ['PNG', 'Papua New Guinea', 65, 63, 0], ['UGA', 'Uganda', 65, 63, 0],
  ['JER', 'Jersey', 63, 63, 0], ['KEN', 'Kenya', 62, 61, 0], ['KUW', 'Kuwait', 62, 60, 0], ['QAT', 'Qatar', 61, 59, 0],
  ['DEN', 'Denmark', 60, 60, 0], ['BHR', 'Bahrain', 60, 58, 0], ['SIN', 'Singapore', 59, 58, 0], ['TAN', 'Tanzania', 58, 57, 0],
];
export const NATION = Object.fromEntries(NATIONS.map((n) => [n[0], { code: n[0], name: n[1], t20: n[2], odi: n[3], test: !!n[4] }]));
export const CODE_BY_NAME = Object.fromEntries(NATIONS.map((n) => [n[1], n[0]]));
export const FULL_MEMBERS = ['IND', 'AUS', 'ENG', 'SA', 'NZ', 'PAK', 'AFG', 'WI', 'SL', 'BAN', 'ZIM', 'IRE'];
export const TEST_TEAMS = NATIONS.filter((n) => n[4]).map((n) => n[0]);

// The 50-over pathway, top to bottom.
export const PATHWAY = [
  ['wc', 'ODI World Cup', 'The 50-over World Cup'],
  ['wcq', 'World Cup Qualifier', "League 2's top four go straight in, with the Play-off's top four"],
  ['po', 'Qualifier Play-off', "League 2's bottom four and the Challenge League's top four · the bottom teams can drop a tier"],
  ['l2', 'CWC League 2', '8 teams, 144 ODIs in tri-series over four years'],
  ['cl', 'Challenge League', 'The third tier of 50-over cricket · two groups of six'],
];
// CWC League 2, 2023-27: the real eight teams. The table itself is in-game.
export const LEAGUE2_TEAMS = ['CAN', 'NAM', 'NEP', 'NED', 'OMA', 'SCO', 'UAE', 'USA'];
// CWC Challenge League 2024-26: the real groups (the winners and runners-up of each go to the Play-off).
export const CHALLENGE_GROUPS = { A: ['DEN', 'JER', 'KEN', 'KUW', 'PNG', 'QAT'], B: ['BHR', 'HK', 'ITA', 'SIN', 'TAN', 'UGA'] };
