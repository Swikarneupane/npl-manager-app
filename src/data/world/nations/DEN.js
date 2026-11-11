// Denmark: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and teams.
// Wikipedia "Current squad" (updated 18 Aug 2025): 13 verified players; two generated players ({ gen: 1 }, fictional names) fill the squad to 15.
export default {
  code: 'DEN', name: 'Denmark', member: 'associate', asOf: '2025-08-18',
  sources: ['https://en.wikipedia.org/wiki/Denmark_national_cricket_team#Current_squad'],
  players: [
    ['den-shangeev-thanikaithasan', 'Shangeev Thanikaithasan', 'DEN', 1998, 'BAT', 50, 25, 'LB', 'R', { t20: 0, odi: 0, fc: 0 }, ['DEN']],
    ['den-hamid-shah', 'Hamid Shah', 'DEN', 1992, 'BAT', 54, 25, 'OB', 'R', { t20: 0, odi: 0, fc: 0 }, ['DEN']],
    ['den-musa-shaheen', 'Musa Shaheen', 'DEN', 2004, 'BAT', 46, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['DEN']],
    ['den-surya-anand', 'Surya Anand', 'DEN', 1998, 'AR', 48, 48, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['DEN']],
    ['den-lucky-ali', 'Lucky Ali', 'DEN', 2003, 'AR', 46, 50, 'SLA', 'L', { t20: 0, odi: 0, fc: 0 }, ['DEN']],
    ['den-delawar-khan', 'Delawar Khan', 'DEN', 1997, 'AR', 48, 50, 'LM', 'R', { t20: 0, odi: 0, fc: 0 }, ['DEN']],
    ['den-mustakin-aslam', 'Mustakin Aslam', 'DEN', 2008, 'AR', 42, 44, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['DEN']],
    ['den-taranjit-bharaj', 'Taranjit Bharaj', 'DEN', 1993, 'WK', 50, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['DEN']],
    ['den-sebastian-heath', 'Sebastian Heath', 'DEN', 2006, 'WK', 42, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['DEN']],
    ['den-abdullah-mahmood', 'Abdullah Mahmood', 'DEN', 2002, 'BOWL', 25, 50, 'OB', 'R', { t20: 0, odi: 0, fc: 0 }, ['DEN']],
    ['den-eshan-karimi', 'Eshan Karimi', 'DEN', 2005, 'BOWL', 25, 48, 'SLA', 'R', { t20: 0, odi: 0, fc: 0 }, ['DEN']],
    ['den-saud-munir', 'Saud Munir', 'DEN', 1998, 'BOWL', 30, 50, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['DEN']],
    ['den-shakeel-zeb', 'Shakeel Zeb', 'DEN', 2002, 'BOWL', 25, 48, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['DEN']],
    ['den-torvin-halbeck', 'Torvin Halbeck', 'DEN', 1999, 'BAT', 44, 0, '', 'R', { t20: 0, odi: 0, fc: 0, gen: 1 }, ['DEN']],
    ['den-anders-quillmark', 'Anders Quillmark', 'DEN', 2001, 'BOWL', 25, 44, 'RM', 'R', { t20: 0, odi: 0, fc: 0, gen: 1 }, ['DEN']],
  ],
  teams: [],
  comps: [],
};
