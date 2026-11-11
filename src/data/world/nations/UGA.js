// Uganda: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Snapshot: 2024 T20 World Cup squad, 2025 Africa Qualifier squad, and the March 2026 Namibia tour squad.
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and team registrations.
// Records whose fm has gen: 1 are generated placeholders with fictional names (used where too few players could be verified).
export default {
  code: 'UGA', name: 'Uganda', member: 'associate', asOf: '2026-03-03',
  sources: [
    'https://en.wikipedia.org/wiki/Uganda_national_cricket_team',
    'https://www.wisden.com/cricket-news/t20-world-cup-africa-qualifiers-squads-whos-in-whos-out',
    'https://nbssport.co.ug/2026/03/03/cricket-uganda-name-youthful-squad-for-crucial-namibia-tour/',
  ],
  players: [
    ['uga-riazat-ali-shah', 'Riazat Ali Shah', 'UGA', 1998, 'AR', 62, 56, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-brian-masaba', 'Brian Masaba', 'UGA', 1991, 'AR', 56, 52, 'LB', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-kenneth-waiswa', 'Kenneth Waiswa', 'UGA', 1998, 'AR', 56, 56, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-alpesh-ramjani', 'Alpesh Ramjani', 'UGA', 1994, 'AR', 56, 62, 'SLA', 'L', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-simon-ssesazi', 'Simon Ssesazi', 'UGA', 1996, 'BAT', 58, 20, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-ronak-patel', 'Ronak Patel', 'UGA', 1988, 'BAT', 54, 40, 'SLA', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-roger-mukasa', 'Roger Mukasa', 'UGA', 1989, 'BAT', 54, 30, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-robinson-obuya', 'Robinson Obuya', 'UGA', 2001, 'BAT', 56, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-ronald-lutaaya', 'Ronald Lutaaya', 'UGA', 2003, 'BAT', 50, 30, 'RM', 'L', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-pascal-murungi', 'Pascal Murungi', 'UGA', 2004, 'BAT', 50, 30, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-arnold-otwani', 'Arnold Otwani', 'UGA', 1995, 'BAT', 48, 30, 'SLA', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-fred-achelam', 'Fred Achelam', 'UGA', 2001, 'WK', 50, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-cyrus-kakuru', 'Cyrus Kakuru', 'UGA', 2003, 'WK', 54, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-henry-ssenyondo', 'Henry Ssenyondo', 'UGA', 1993, 'BOWL', 30, 62, 'SLA', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-cosmas-kyewuta', 'Cosmas Kyewuta', 'UGA', 2002, 'BOWL', 30, 58, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-joseph-baguma', 'Joseph Baguma', 'UGA', 2004, 'BOWL', 25, 54, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-frank-nsubuga', 'Frank Nsubuga', 'UGA', 1980, 'BOWL', 30, 58, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-dinesh-nakrani', 'Dinesh Nakrani', 'UGA', 1991, 'BOWL', 40, 58, 'LM', 'L', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-juma-miyaji', 'Juma Miyaji', 'UGA', 2003, 'BOWL', 30, 58, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
    ['uga-bilal-hassan', 'Bilal Hassan', 'UGA', 1990, 'BOWL', 25, 58, 'RFM', 'R', { t20: 1, odi: 0, fc: -3 }, ['UGA']],
  ],
  teams: [],
  comps: [],
};
