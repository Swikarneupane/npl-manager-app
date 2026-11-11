// Vanuatu: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Snapshot: Wikipedia squad list (updated 5 May 2026).
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and team registrations.
// Records whose fm has gen: 1 are generated placeholders with fictional names (used where too few players could be verified).
export default {
  code: 'VAN', name: 'Vanuatu', member: 'associate', asOf: '2026-05-05',
  sources: [
    'https://en.wikipedia.org/wiki/Vanuatu_national_cricket_team',
  ],
  players: [
    ['van-joshua-rasu', 'Joshua Rasu', 'VAN', 1994, 'AR', 48, 52, 'RFM', 'R', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-junior-kaltapau', 'Junior Kaltapau', 'VAN', 1999, 'BAT', 46, 30, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-andrew-mansale', 'Andrew Mansale', 'VAN', 1988, 'BAT', 46, 30, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-rodrick-lekai', 'Rodrick Lekai', 'VAN', 2007, 'BAT', 40, 30, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-womejo-wotu', 'Womejo Wotu', 'VAN', 2004, 'BAT', 42, 35, 'RFM', 'L', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-tim-cutler', 'Tim Cutler', 'VAN', 1982, 'AR', 42, 46, 'SLA', 'R', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-patrick-matautaava', 'Patrick Matautaava', 'VAN', 1991, 'AR', 46, 48, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-nalin-nipiko', 'Nalin Nipiko', 'VAN', 1995, 'AR', 48, 48, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-jarryd-allan', 'Jarryd Allan', 'VAN', 1991, 'WK', 42, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-clement-tommy', 'Clement Tommy', 'VAN', 1997, 'WK', 42, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-ala-viraliliu', 'Ala Viraliliu', 'VAN', 2002, 'WK', 38, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-williamsing-nalisa', 'Williamsing Nalisa', 'VAN', 2000, 'BOWL', 25, 50, 'LB', 'R', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-nicholas-venables', 'Nicholas Venables', 'VAN', 1983, 'BOWL', 25, 46, 'LFM', 'L', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-darren-wotu', 'Darren Wotu', 'VAN', 1998, 'BOWL', 25, 48, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['VAN']],
    ['van-kalo-efatewind', 'Kalo Efatewind', 'VAN', 2003, 'BOWL', 25, 42, 'RM', 'R', { t20: 1, odi: 0, fc: -3, gen: 1 }, ['VAN']],
    ['van-ioane-tannaroa', 'Ioane Tannaroa', 'VAN', 2004, 'BOWL', 25, 42, 'OB', 'R', { t20: 1, odi: 0, fc: -3, gen: 1 }, ['VAN']],
  ],
  teams: [],
  comps: [],
};
