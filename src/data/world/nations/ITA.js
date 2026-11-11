// Italy: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and teams.
// Wikipedia "Current squad" (updated 19 Feb 2026) and the 2026 T20 World Cup squad; Joe Burns from his Wikipedia article (Italy international from 2024).
export default {
  code: 'ITA', name: 'Italy', member: 'associate', asOf: '2026-02-19',
  sources: ['https://en.wikipedia.org/wiki/Italy_national_cricket_team#Current_squad', 'https://en.wikipedia.org/wiki/2026_Men%27s_T20_World_Cup_squads', 'https://en.wikipedia.org/wiki/Joe_Burns'],
  players: [
    ['ita-anthony-mosca', 'Anthony Mosca', 'ITA', 1991, 'BAT', 60, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-justin-mosca', 'Justin Mosca', 'ITA', 1994, 'BAT', 60, 0, '', 'L', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-syed-naqvi', 'Syed Naqvi', 'ITA', 2002, 'BAT', 54, 25, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-zain-ali', 'Zain Ali', 'ITA', 2001, 'BAT', 56, 25, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-wayne-madsen', 'Wayne Madsen', 'ITA', 1984, 'AR', 66, 40, 'OB', 'R', { t20: 0, odi: 0, fc: 1 }, ['ITA']],
    ['ita-grant-stewart', 'Grant Stewart', 'ITA', 1994, 'AR', 60, 62, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-jj-smuts', 'JJ Smuts', 'ITA', 1988, 'AR', 64, 58, 'SLA', 'R', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-jaspreet-singh', 'Jaspreet Singh', 'ITA', 1993, 'BOWL', 30, 58, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-ben-manenti', 'Ben Manenti', 'ITA', 1997, 'AR', 56, 58, 'OB', 'R', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-harry-manenti', 'Harry Manenti', 'ITA', 2000, 'AR', 58, 56, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-marcus-campopiano', 'Marcus Campopiano', 'ITA', 1995, 'WK', 56, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-gian-piero-meade', 'Gian-Piero Meade', 'ITA', 1996, 'WK', 54, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-crishan-kalugamage', 'Crishan Kalugamage', 'ITA', 1991, 'BOWL', 25, 60, 'LB', 'R', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-thomas-draca', 'Thomas Draca', 'ITA', 2000, 'BOWL', 25, 62, 'RF', 'R', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-ali-hasan', 'Ali Hasan', 'ITA', 2002, 'BOWL', 20, 56, 'LFM', 'L', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
    ['ita-joe-burns', 'Joe Burns', 'ITA', 1989, 'BAT', 68, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['ITA']],
  ],
  teams: [],
  comps: [],
};
