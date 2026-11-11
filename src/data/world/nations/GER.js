// Germany: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and teams.
// Wikipedia "Current squad" (updated 3 Jul 2025): 14 verified players; one generated wicket-keeper ({ gen: 1 }, fictional name) gives a second keeper.
export default {
  code: 'GER', name: 'Germany', member: 'associate', asOf: '2025-07-03',
  sources: ['https://en.wikipedia.org/wiki/Germany_national_cricket_team#Current_squad'],
  players: [
    ['ger-harmanjot-singh', 'Harmanjot Singh', 'GER', 1994, 'BAT', 52, 30, 'LB', 'R', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-hassan-khan', 'Hassan Khan', 'GER', 2002, 'BAT', 48, 0, '', 'L', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-sachin-mandy', 'Sachin Mandy', 'GER', 1991, 'BAT', 48, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-shahid-afridi', 'Shahid Afridi', 'GER', 1999, 'AR', 46, 48, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-fayaz-khan', 'Fayaz Khan', 'GER', 1997, 'AR', 48, 48, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-mussadiq-ahmed', 'Mussadiq Ahmed', 'GER', 1989, 'AR', 46, 52, 'RF', 'R', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-muslim-yar', 'Muslim Yar', 'GER', 1999, 'AR', 48, 52, 'SLA', 'R', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-kyle-klasse', 'Kyle Klasse', 'GER', 2002, 'WK', 48, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-abdul-shakoor', 'Abdul Shakoor', 'GER', 1999, 'BOWL', 25, 48, 'OB', 'R', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-ghulam-ahmadi', 'Ghulam Ahmadi', 'GER', 1997, 'BOWL', 30, 50, 'OB', 'R', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-jatinder-kumar', 'Jatinder Kumar', 'GER', 1992, 'BOWL', 25, 48, 'SLA', 'L', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-abdul-bashir', 'Abdul Bashir', 'GER', 1998, 'BOWL', 25, 48, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-adil-khan', 'Adil Khan', 'GER', 2004, 'BOWL', 25, 46, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-sajid-liaqat', 'Sajid Liaqat', 'GER', 1985, 'BOWL', 25, 46, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['GER']],
    ['ger-lukas-feldwirt', 'Lukas Feldwirt', 'GER', 2000, 'WK', 44, 0, '', 'R', { t20: 0, odi: 0, fc: 0, gen: 1 }, ['GER']],
  ],
  teams: [],
  comps: [],
};
