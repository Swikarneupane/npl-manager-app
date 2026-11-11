// Nigeria: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Snapshot: Wikipedia squad list (Oct 2023) cross-checked with the 2025 Africa Qualifier squad.
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and team registrations.
// Records whose fm has gen: 1 are generated placeholders with fictional names (used where too few players could be verified).
export default {
  code: 'NGA', name: 'Nigeria', member: 'associate', asOf: '2025-10-01',
  sources: [
    'https://en.wikipedia.org/wiki/Nigeria_national_cricket_team',
    'https://www.wisden.com/cricket-news/t20-world-cup-africa-qualifiers-squads-whos-in-whos-out',
  ],
  players: [
    ['nga-sylvester-okpe', 'Sylvester Okpe', 'NGA', 2000, 'BOWL', 40, 54, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-isaac-danladi', 'Isaac Danladi', 'NGA', 2002, 'BAT', 48, 35, 'LB', 'R', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-sesan-adedeji', 'Sesan Adedeji', 'NGA', 1996, 'BAT', 48, 30, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-akhere-isesele', 'Akhere Isesele', 'NGA', 2001, 'BAT', 44, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-daniel-ajekun', 'Daniel Ajekun', 'NGA', 1997, 'BAT', 44, 30, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-selim-salau', 'Selim Salau', 'NGA', 2005, 'BAT', 44, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-ali-rahmon', 'Ali Rahmon', 'NGA', 2008, 'AR', 40, 40, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-sulaimon-runsewe', 'Sulaimon Runsewe', 'NGA', 2001, 'BAT', 46, 30, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-isaac-okpe', 'Isaac Okpe', 'NGA', 1995, 'WK', 46, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-ridwan-abdulkareem', 'Ridwan Abdulkareem', 'NGA', 2005, 'BOWL', 25, 50, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-joshua-asia', 'Joshua Asia', 'NGA', 2006, 'BOWL', 25, 50, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-peter-aho', 'Peter Aho', 'NGA', 2003, 'BOWL', 25, 54, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-chiemelie-udekwe', 'Chiemelie Udekwe', 'NGA', 2005, 'BOWL', 25, 48, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-prosper-useni', 'Prosper Useni', 'NGA', 2006, 'BOWL', 25, 50, 'LM', 'L', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-mohameed-taiwo', 'Mohameed Taiwo', 'NGA', 2002, 'BOWL', 25, 48, 'LM', 'L', { t20: 1, odi: 0, fc: -3 }, ['NGA']],
    ['nga-obinna-lagosmere', 'Obinna Lagosmere', 'NGA', 2003, 'WK', 40, 0, '', 'R', { t20: 1, odi: 0, fc: -3, gen: 1 }, ['NGA']],
  ],
  teams: [],
  comps: [],
};
