// Bermuda: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and teams.
// Wikipedia "Current squad" (updated 15 Jun 2025).
export default {
  code: 'BER', name: 'Bermuda', member: 'associate', asOf: '2025-06-15',
  sources: ['https://en.wikipedia.org/wiki/Bermuda_national_cricket_team#Current_squad'],
  players: [
    ['ber-onias-bascome', 'Onias Bascome', 'BER', 1995, 'BAT', 50, 25, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['BER']],
    ['ber-alex-dore', 'Alex Dore', 'BER', 1997, 'BAT', 46, 0, '', 'L', { t20: 0, odi: 0, fc: 0 }, ['BER']],
    ['ber-tre-manders', 'Tre Manders', 'BER', 1995, 'BAT', 48, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['BER']],
    ['ber-zeko-burgess', 'Zeko Burgess', 'BER', 1982, 'AR', 44, 46, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['BER']],
    ['ber-derrick-brangman', 'Derrick Brangman', 'BER', 1987, 'AR', 46, 50, 'SLA', 'L', { t20: 0, odi: 0, fc: 0 }, ['BER']],
    ['ber-delray-rawlins', 'Delray Rawlins', 'BER', 1997, 'AR', 58, 50, 'SLA', 'L', { t20: 1, odi: 0, fc: -1 }, ['BER']],
    ['ber-dominic-sabir', 'Dominic Sabir', 'BER', 2003, 'AR', 46, 48, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['BER']],
    ['ber-jonte-smith', 'Jonté Smith', 'BER', 1994, 'AR', 46, 48, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['BER']],
    ['ber-terryn-fray', 'Terryn Fray', 'BER', 1991, 'WK', 48, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['BER']],
    ['ber-sinclair-smith', 'Sinclair Smith', 'BER', 1991, 'WK', 46, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['BER']],
    ['ber-jarryd-richardson', 'Jarryd Richardson', 'BER', 2003, 'WK', 42, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['BER']],
    ['ber-marcus-scotland', 'Marcus Scotland', 'BER', 2003, 'WK', 42, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['BER']],
    ['ber-kevon-fubler', 'Kevon Fubler', 'BER', 1992, 'BOWL', 25, 50, 'LFM', 'L', { t20: 0, odi: 0, fc: 0 }, ['BER']],
    ['ber-jermal-proctor', 'Jermal Proctor', 'BER', 2005, 'BOWL', 25, 46, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['BER']],
    ['ber-chare-smith', 'Chare Smith', 'BER', 1997, 'BOWL', 25, 50, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['BER']],
  ],
  teams: [],
  comps: [],
};
