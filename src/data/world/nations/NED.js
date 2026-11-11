// Netherlands: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and teams.
// Wikipedia "Current squad" (updated 21 Feb 2026) and the 2026 T20 World Cup squad.
export default {
  code: 'NED', name: 'Netherlands', member: 'associate', asOf: '2026-02-21',
  sources: ['https://en.wikipedia.org/wiki/Netherlands_national_cricket_team#Current_squad', 'https://en.wikipedia.org/wiki/2026_Men%27s_T20_World_Cup_squads'],
  players: [
    ['ned-colin-ackermann', 'Colin Ackermann', 'NED', 1991, 'BAT', 66, 35, 'OB', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-cedric-de-lange', 'Cedric de Lange', 'NED', 2007, 'BAT', 54, 0, '', 'L', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-michael-levitt', 'Michael Levitt', 'NED', 2003, 'BAT', 64, 0, '', 'R', { t20: 1, odi: 0, fc: -1 }, ['NED']],
    ['ned-teja-nidamanuru', 'Teja Nidamanuru', 'NED', 1994, 'BAT', 62, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-max-odowd', "Max O'Dowd", 'NED', 1994, 'BAT', 68, 0, '', 'R', { t20: 0, odi: 1, fc: 0 }, ['NED']],
    ['ned-vikramjit-singh', 'Vikramjit Singh', 'NED', 2003, 'BAT', 66, 0, '', 'L', { t20: 0, odi: 1, fc: 0 }, ['NED']],
    ['ned-sikander-zulfiqar', 'Sikander Zulfiqar', 'NED', 1997, 'BAT', 58, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-bas-de-leede', 'Bas de Leede', 'NED', 1999, 'AR', 68, 66, 'RFM', 'R', { t20: 0, odi: 1, fc: 0 }, ['NED']],
    ['ned-zach-lion-cachet', 'Zach Lion-Cachet', 'NED', 2003, 'AR', 56, 56, 'OB', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-roelof-van-der-merwe', 'Roelof van der Merwe', 'NED', 1984, 'AR', 58, 66, 'SLA', 'R', { t20: 1, odi: 0, fc: -1 }, ['NED']],
    ['ned-tim-pringle', 'Tim Pringle', 'NED', 2002, 'AR', 52, 60, 'SLA', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-saqib-zulfiqar', 'Saqib Zulfiqar', 'NED', 1997, 'AR', 56, 56, 'LB', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-noah-croes', 'Noah Croes', 'NED', 1999, 'WK', 60, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-scott-edwards', 'Scott Edwards', 'NED', 1996, 'WK', 68, 0, '', 'R', { t20: 0, odi: 1, fc: 0 }, ['NED']],
    ['ned-wesley-barresi', 'Wesley Barresi', 'NED', 1984, 'WK', 60, 0, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-paul-van-meekeren', 'Paul van Meekeren', 'NED', 1993, 'BOWL', 27, 68, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-logan-van-beek', 'Logan van Beek', 'NED', 1990, 'AR', 59, 65, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-vivian-kingma', 'Vivian Kingma', 'NED', 1994, 'BOWL', 20, 64, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-fred-klaassen', 'Fred Klaassen', 'NED', 1992, 'BOWL', 20, 66, 'LFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-kyle-klein', 'Kyle Klein', 'NED', 2001, 'BOWL', 25, 60, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-alex-roy', 'Alex Roy', 'NED', 1999, 'BOWL', 20, 58, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-timm-van-der-gugten', 'Timm van der Gugten', 'NED', 1991, 'BOWL', 30, 66, 'RFM', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-ben-fletcher', 'Ben Fletcher', 'NED', 2000, 'BOWL', 20, 56, 'LM', 'L', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-shariz-ahmad', 'Shariz Ahmad', 'NED', 2003, 'BOWL', 20, 60, 'LB', 'L', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-daniel-doram', 'Daniel Doram', 'NED', 1997, 'BOWL', 30, 58, 'SLA', 'L', { t20: 0, odi: 0, fc: 0 }, ['NED']],
    ['ned-aryan-dutt', 'Aryan Dutt', 'NED', 2003, 'BOWL', 30, 64, 'OB', 'R', { t20: 0, odi: 0, fc: 0 }, ['NED']],
  ],
  teams: [],
  comps: [],
};
