// Papua New Guinea: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Snapshot: 2024 T20 World Cup squad, Wikipedia squad list, and the 2026 East Asia-Pacific Qualifier squad (players whose styles could be confirmed).
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and team registrations.
// Records whose fm has gen: 1 are generated placeholders with fictional names (used where too few players could be verified).
export default {
  code: 'PNG', name: 'Papua New Guinea', member: 'associate', asOf: '2026-05-08',
  sources: [
    'https://en.wikipedia.org/wiki/Papua_New_Guinea_national_cricket_team',
    'https://www.nbc.com.pg/post/35356/barramundis-depart-for-japan',
  ],
  players: [
    ['png-assad-vala', 'Assad Vala', 'PNG', 1987, 'AR', 62, 56, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-sese-bau', 'Sese Bau', 'PNG', 1992, 'BAT', 60, 30, 'RM', 'L', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-tony-ura', 'Tony Ura', 'PNG', 1989, 'BAT', 62, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-lega-siaka', 'Lega Siaka', 'PNG', 1993, 'BAT', 58, 35, 'LB', 'R', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-hiri-hiri', 'Hiri Hiri', 'PNG', 1995, 'BAT', 52, 40, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-gaudi-toka', 'Gaudi Toka', 'PNG', 1994, 'BAT', 52, 30, 'RM', 'L', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-norman-vanua', 'Norman Vanua', 'PNG', 1994, 'AR', 52, 58, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-charles-amini', 'Charles Amini', 'PNG', 1992, 'AR', 56, 54, 'LB', 'L', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-chad-soper', 'Chad Soper', 'PNG', 1992, 'AR', 50, 58, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-simon-atai', 'Simon Atai', 'PNG', 1999, 'AR', 50, 52, 'SLA', 'L', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-kiplin-doriga', 'Kiplin Doriga', 'PNG', 1995, 'WK', 50, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-hila-vare', 'Hila Vare', 'PNG', 2001, 'WK', 52, 0, '', 'L', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-john-kariko', 'John Kariko', 'PNG', 2004, 'BOWL', 30, 56, 'SLA', 'L', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-riley-hekure', 'Riley Hekure', 'PNG', 1995, 'BOWL', 25, 54, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-semo-kamea', 'Semo Kamea', 'PNG', 2001, 'BOWL', 25, 58, 'LF', 'L', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-kabua-morea', 'Kabua Morea', 'PNG', 1993, 'BOWL', 30, 58, 'LM', 'R', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-alei-nao', 'Alei Nao', 'PNG', 1994, 'BOWL', 30, 60, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
    ['png-damien-ravu', 'Damien Ravu', 'PNG', 1994, 'BOWL', 25, 54, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['PNG']],
  ],
  teams: [],
  comps: [],
};
