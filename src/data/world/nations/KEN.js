// Kenya: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Snapshot: Wikipedia squad list (Jersey series, Aug 2025) and the 2025 Africa Qualifier squad.
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and team registrations.
// Records whose fm has gen: 1 are generated placeholders with fictional names (used where too few players could be verified).
export default {
  code: 'KEN', name: 'Kenya', member: 'associate', asOf: '2025-08-31',
  sources: [
    'https://en.wikipedia.org/wiki/Kenya_national_cricket_team',
    'https://www.wisden.com/cricket-news/t20-world-cup-africa-qualifiers-squads-whos-in-whos-out',
  ],
  players: [
    ['ken-dhiren-gondaria', 'Dhiren Gondaria', 'KEN', 1996, 'BAT', 58, 35, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-pushkar-sharma', 'Pushkar Sharma', 'KEN', 2002, 'BAT', 56, 30, 'LM', 'L', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-sachin-bhudia', 'Sachin Bhudia', 'KEN', 1995, 'BAT', 52, 30, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-jasraj-kundi', 'Jasraj Kundi', 'KEN', 2000, 'BAT', 52, 30, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-nelson-odhiambo', 'Nelson Odhiambo', 'KEN', 1990, 'AR', 52, 52, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-rakep-patel', 'Rakep Patel', 'KEN', 1990, 'AR', 58, 50, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-sukhdeep-singh', 'Sukhdeep Singh', 'KEN', 2002, 'WK', 50, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-irfan-karim', 'Irfan Karim', 'KEN', 1993, 'WK', 52, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-shem-ngoche', 'Shem Ngoche', 'KEN', 1990, 'BOWL', 35, 60, 'SLA', 'R', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-vraj-patel', 'Vraj Patel', 'KEN', 2003, 'BOWL', 30, 58, 'SLA', 'L', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-vishil-patel', 'Vishil Patel', 'KEN', 2006, 'BOWL', 25, 54, 'LB', 'R', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-lucas-oluoch', 'Lucas Oluoch', 'KEN', 1992, 'BOWL', 25, 58, 'LM', 'R', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-peter-langat', 'Peter Langat', 'KEN', 1995, 'BOWL', 25, 54, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-francis-mutua', 'Francis Mutua', 'KEN', 2003, 'BOWL', 25, 54, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
    ['ken-tanzeel-sheikh', 'Tanzeel Sheikh', 'KEN', 1997, 'BOWL', 25, 54, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['KEN']],
  ],
  teams: [],
  comps: [],
};
