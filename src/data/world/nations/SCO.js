// Scotland: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and teams.
// Players for Scotland Dec 2024 - Feb 2026 (Wikipedia, updated 13 Aug 2026) plus the 2026 T20 World Cup squad. Domestic teams: the three Regional Super Series sides of 2026 (Cricket Scotland); player registrations to them not verified, so their rosters are generated.
export default {
  code: 'SCO', name: 'Scotland', member: 'associate', asOf: '2026-08-13',
  sources: ['https://en.wikipedia.org/wiki/Scotland_national_cricket_team#Current_squad', 'https://en.wikipedia.org/wiki/2026_Men%27s_T20_World_Cup_squads', 'https://cricketscotland.com/Article/26986078-81b6-4ece-836a-ec31c8709d97'],
  players: [
    ['sco-richie-berrington', 'Richie Berrington', 'SCO', 1987, 'AR', 60, 60, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-tom-bruce', 'Tom Bruce', 'SCO', 1991, 'BAT', 62, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-oli-hairs', 'Oli Hairs', 'SCO', 1991, 'BAT', 58, 0, '', 'L', { t20: 1, odi: 0, fc: -1 }, ['SCO']],
    ['sco-michael-jones', 'Michael Jones', 'SCO', 1998, 'BAT', 62, 0, '', 'R', { t20: 0, odi: 1, fc: 0 }, ['SCO']],
    ['sco-christopher-mcbride', 'Christopher McBride', 'SCO', 1999, 'BAT', 58, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-finlay-mccreath', 'Finlay McCreath', 'SCO', 1998, 'BAT', 60, 30, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-george-munsey', 'George Munsey', 'SCO', 1993, 'BAT', 70, 0, '', 'L', { t20: 2, odi: 0, fc: -2 }, ['SCO']],
    ['sco-liam-naylor', 'Liam Naylor', 'SCO', 2001, 'BAT', 56, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-michael-leask', 'Michael Leask', 'SCO', 1990, 'AR', 62, 58, 'OB', 'R', { t20: 1, odi: 0, fc: -1 }, ['SCO']],
    ['sco-brandon-mcmullen', 'Brandon McMullen', 'SCO', 1999, 'AR', 70, 62, 'RM', 'R', { t20: 0, odi: 1, fc: 0 }, ['SCO']],
    ['sco-matthew-cross', 'Matthew Cross', 'SCO', 1992, 'WK', 62, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-charlie-tear', 'Charlie Tear', 'SCO', 2004, 'WK', 58, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-charlie-cassell', 'Charlie Cassell', 'SCO', 1998, 'BOWL', 25, 64, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-brad-currie', 'Brad Currie', 'SCO', 1998, 'BOWL', 20, 66, 'LFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-josh-davey', 'Josh Davey', 'SCO', 1990, 'BOWL', 40, 64, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-brad-wheal', 'Brad Wheal', 'SCO', 1996, 'BOWL', 20, 66, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-jasper-davidson', 'Jasper Davidson', 'SCO', 2002, 'BOWL', 20, 60, 'RF', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-jack-jarvis', 'Jack Jarvis', 'SCO', 2003, 'BOWL', 25, 60, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-mackenzie-jones', 'Mackenzie Jones', 'SCO', 2006, 'BOWL', 20, 56, 'RF', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-safyaan-sharif', 'Safyaan Sharif', 'SCO', 1991, 'BOWL', 20, 66, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-chris-greaves', 'Chris Greaves', 'SCO', 1990, 'AR', 52, 62, 'LB', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-mark-watt', 'Mark Watt', 'SCO', 1996, 'AR', 60, 72, 'SLA', 'L', { t20: 1, odi: 0, fc: -1 }, ['SCO']],
    ['sco-oliver-davidson', 'Oliver Davidson', 'SCO', 2004, 'BOWL', 25, 58, 'SLA', 'L', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
    ['sco-zainullah-ihsan', 'Zainullah Ihsan', 'SCO', 2006, 'BOWL', 20, 54, 'RM', 'R', { t20: 0, odi: 0, fc: 0 }, ['SCO']],
  ],
  teams: [
    { id: 'SCO-CH', name: 'Caledonian Highlanders', short: 'CH', kind: 'domestic', level: 1 },
    { id: 'SCO-EK', name: 'Eastern Knights', short: 'EK', kind: 'domestic', level: 1 },
    { id: 'SCO-WW', name: 'Western Warriors', short: 'WW', kind: 'domestic', level: 1 },
  ],
  comps: [],
};
