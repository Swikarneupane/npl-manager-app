// Tanzania: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Snapshot: Wikipedia squad list (Aug 2023) cross-checked with the 2025 Africa Qualifier squad.
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and team registrations.
// Records whose fm has gen: 1 are generated placeholders with fictional names (used where too few players could be verified).
export default {
  code: 'TAN', name: 'Tanzania', member: 'associate', asOf: '2025-10-01',
  sources: [
    'https://en.wikipedia.org/wiki/Tanzania_national_cricket_team',
    'https://www.wisden.com/cricket-news/t20-world-cup-africa-qualifiers-squads-whos-in-whos-out',
  ],
  players: [
    ['tan-kassim-nassoro', 'Kassim Nassoro', 'TAN', 1988, 'AR', 52, 52, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-ivan-selemani', 'Ivan Selemani', 'TAN', 2000, 'BAT', 50, 30, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-omary-kitunda', 'Omary Kitunda', 'TAN', 1999, 'BAT', 48, 30, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-abhik-patwa', 'Abhik Patwa', 'TAN', 1987, 'BAT', 52, 30, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-jitin-singh', 'Jitin Singh', 'TAN', 1984, 'BAT', 48, 30, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-dhrumit-mehta', 'Dhrumit Mehta', 'TAN', 2003, 'BAT', 48, 30, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-yunusu-issa', 'Yunusu Issa', 'TAN', 2001, 'AR', 46, 48, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-shaik-basha', 'Shaik Basha', 'TAN', 2006, 'AR', 44, 48, 'LWS', 'L', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-amal-rajeevan', 'Amal Rajeevan', 'TAN', 1997, 'WK', 50, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-yalinde-nkanya', 'Yalinde Nkanya', 'TAN', 2003, 'BOWL', 25, 52, 'SLA', 'R', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-sanjay-thakor', 'Sanjay Thakor', 'TAN', 1990, 'BOWL', 30, 50, 'LB', 'R', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-akhil-anil', 'Akhil Anil', 'TAN', 1998, 'BOWL', 30, 50, 'OB', 'L', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-ally-kimote', 'Ally Kimote', 'TAN', 1992, 'BOWL', 25, 52, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-salum-jumbe', 'Salum Jumbe', 'TAN', 1997, 'BOWL', 25, 52, 'RFM', 'L', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-johnson-nyambo', 'Johnson Nyambo', 'TAN', 2005, 'BOWL', 25, 48, 'RFM', 'R', { t20: 1, odi: 0, fc: -3 }, ['TAN']],
    ['tan-juma-kilimahewa', 'Juma Kilimahewa', 'TAN', 2002, 'WK', 42, 0, '', 'R', { t20: 1, odi: 0, fc: -3, gen: 1 }, ['TAN']],
  ],
  teams: [],
  comps: [],
};
