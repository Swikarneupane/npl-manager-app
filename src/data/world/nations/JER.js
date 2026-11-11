// Jersey: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and teams.
// Wikipedia "Current squad" (updated 5 Jul 2025). No newer verified squad found.
export default {
  code: 'JER', name: 'Jersey', member: 'associate', asOf: '2025-07-05',
  sources: ['https://en.wikipedia.org/wiki/Jersey_cricket_team#Current_squad'],
  players: [
    ['jer-charlie-brennan', 'Charlie Brennan', 'JER', 2005, 'BAT', 50, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-jonty-jenner', 'Jonty Jenner', 'JER', 1997, 'BAT', 54, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-asa-tribe', 'Asa Tribe', 'JER', 2004, 'BAT', 56, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-zak-tribe', 'Zak Tribe', 'JER', 2001, 'BAT', 52, 30, 'LB', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-charles-perchard', 'Charles Perchard', 'JER', 1992, 'AR', 50, 52, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-dominic-blampied', 'Dominic Blampied', 'JER', 1996, 'AR', 48, 50, 'LB', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-harrison-carlyon', 'Harrison Carlyon', 'JER', 2001, 'AR', 52, 50, 'OB', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-nick-greenwood', 'Nick Greenwood', 'JER', 1999, 'AR', 50, 50, 'OB', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-william-perchard', 'William Perchard', 'JER', 2005, 'AR', 44, 48, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-julius-sumerauer', 'Julius Sumerauer', 'JER', 2001, 'AR', 46, 52, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-benjamin-ward', 'Benjamin Ward', 'JER', 1998, 'AR', 48, 52, 'LB', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-jake-dunford', 'Jake Dunford', 'JER', 1994, 'WK', 52, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-patrick-gouge', 'Patrick Gouge', 'JER', 2003, 'WK', 48, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-theo-pullman', 'Theo Pullman', 'JER', 2006, 'BOWL', 25, 48, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
    ['jer-george-richardson', 'George Richardson', 'JER', 2004, 'BOWL', 25, 50, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['JER']],
  ],
  teams: [],
  comps: [],
};
