// Botswana: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Snapshot: Wikipedia squad list (Jun 2023) cross-checked with the 2025 Africa Qualifier squad.
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and team registrations.
// Records whose fm has gen: 1 are generated placeholders with fictional names (used where too few players could be verified).
export default {
  code: 'BOT', name: 'Botswana', member: 'associate', asOf: '2025-10-01',
  sources: [
    'https://en.wikipedia.org/wiki/Botswana_national_cricket_team',
    'https://www.wisden.com/cricket-news/t20-world-cup-africa-qualifiers-squads-whos-in-whos-out',
  ],
  players: [
    ['bot-karabo-motlhanka', 'Karabo Motlhanka', 'BOT', 1992, 'BAT', 50, 0, '', 'L', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-phemelo-silas', 'Phemelo Silas', 'BOT', 2001, 'BAT', 44, 35, 'LB', 'R', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-vinoo-balakrishnan', 'Vinoo Balakrishnan', 'BOT', 1989, 'BAT', 48, 35, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-ameer-saiyed', 'Ameer Saiyed', 'BOT', 1996, 'BAT', 46, 40, 'SLA', 'L', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-reginald-nehonde', 'Reginald Nehonde', 'BOT', 1990, 'AR', 46, 48, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-thatayaone-tshose', 'Thatayaone Tshose', 'BOT', 1996, 'AR', 46, 50, 'RF', 'R', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-valentine-mbazo', 'Valentine Mbazo', 'BOT', 1999, 'WK', 44, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-rod-mbaiwa', 'Rod Mbaiwa', 'BOT', 2003, 'WK', 42, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-mmoloki-mooketsi', 'Mmoloki Mooketsi', 'BOT', 1997, 'BOWL', 25, 48, 'SLA', 'L', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-dhruv-maisuria', 'Dhruv Maisuria', 'BOT', 1998, 'BOWL', 25, 50, 'LB', 'R', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-katlo-piet', 'Katlo Piet', 'BOT', 2003, 'BOWL', 25, 48, 'SLA', 'L', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-boemo-khumalo', 'Boemo Khumalo', 'BOT', 2002, 'BOWL', 25, 50, 'RFM', 'R', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-boteng-maphosa', 'Boteng Maphosa', 'BOT', 2002, 'BOWL', 25, 48, 'RFM', 'R', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-boemo-kgoseimang', 'Boemo Kgoseimang', 'BOT', 1999, 'BOWL', 25, 46, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['BOT']],
    ['bot-tumo-kalaharian', 'Tumo Kalaharian', 'BOT', 2004, 'BOWL', 25, 44, 'RM', 'R', { t20: 1, odi: 0, fc: -3, gen: 1 }, ['BOT']],
  ],
  teams: [],
  comps: [],
};
