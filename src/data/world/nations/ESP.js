// Spain: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and teams.
// Wikipedia "Current squad" (updated 28 Aug 2024, the newest verified list): 15 players; one generated wicket-keeper ({ gen: 1 }, fictional name) gives a second keeper.
export default {
  code: 'ESP', name: 'Spain', member: 'associate', asOf: '2024-08-28',
  sources: ['https://en.wikipedia.org/wiki/Spain_national_cricket_team#Current_squad'],
  players: [
    ['esp-christian-munoz-mills', 'Christian Munoz-Mills', 'ESP', 1991, 'BAT', 52, 25, 'OB', 'R', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-daniel-doyle-calle', 'Daniel Doyle-Calle', 'ESP', 1998, 'BAT', 48, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-mohammad-ihsan', 'Mohammad Ihsan', 'ESP', 1996, 'BAT', 50, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-hamza-dar', 'Hamza Dar', 'ESP', 1995, 'BAT', 52, 25, 'RM', 'L', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-mohammad-yasin', 'Mohammad Yasin', 'ESP', 1989, 'BAT', 48, 0, '', 'L', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-yasir-ali', 'Yasir Ali', 'ESP', 1991, 'AR', 48, 50, 'OB', 'R', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-shafat-ali-syed', 'Shafat Ali Syed', 'ESP', 1996, 'AR', 46, 48, 'LM', 'L', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-alec-davidson-soler', 'Alec Davidson-Soler', 'ESP', 2004, 'WK', 46, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-lorne-burns', 'Lorne Burns', 'ESP', 1993, 'BOWL', 30, 52, 'LB', 'R', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-charlie-rumistrzewicz', 'Charlie Rumistrzewicz', 'ESP', 2005, 'BOWL', 25, 46, 'SLA', 'R', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-sebastian-hughes-pinan', 'Sebastian Hughes-Piñan', 'ESP', 2006, 'BOWL', 25, 44, 'SLA', 'L', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-atif-mehmood', 'Atif Mehmood', 'ESP', 1987, 'BOWL', 30, 50, 'LFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-mohammad-kamran', 'Mohammad Kamran', 'ESP', 1987, 'BOWL', 25, 48, 'LFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-raja-adeel', 'Raja Adeel', 'ESP', 1987, 'BOWL', 30, 50, 'RF', 'R', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-mohammad-atif', 'Mohammad Atif', 'ESP', 2000, 'BOWL', 25, 46, 'LM', 'R', { t20: 0, odi: 0, fc: 0 }, ['ESP']],
    ['esp-mateo-cordillas', 'Mateo Cordillas', 'ESP', 2001, 'WK', 42, 0, '', 'R', { t20: 0, odi: 0, fc: 0, gen: 1 }, ['ESP']],
  ],
  teams: [],
  comps: [],
};
