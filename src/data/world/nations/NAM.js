// Namibia: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Snapshot: Squad list on Wikipedia (updated 21 Feb 2026), T20 World Cup 2026 squad and the 2025 Africa Qualifier squad. Domestic teams: clubs of the Cricket Namibia 50-over Premier League named in 2025-26 reports; club registrations not verified, so their rosters are generated.
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and team registrations.
// Records whose fm has gen: 1 are generated placeholders with fictional names (used where too few players could be verified).
export default {
  code: 'NAM', name: 'Namibia', member: 'associate', asOf: '2026-02-21',
  sources: [
    'https://en.wikipedia.org/wiki/Namibia_national_cricket_team',
    'https://www.icc-cricket.com/tournaments/mens-t20-world-cup-2026/news/erasmus-leads-namibia-for-icc-men-s-t20-world-cup-2026',
    'https://www.wisden.com/cricket-news/t20-world-cup-africa-qualifiers-squads-whos-in-whos-out',
    'https://www.we.com.na/sport-wrap-main/leaders-ccd-tigers-to-meet-winless-old-boys2025-01-24146186',
    'https://cricketnamibia.com/celebrating-excellence-at-2026-cricket-namibia-annual-awards/',
  ],
  players: [
    ['nam-gerhard-erasmus', 'Gerhard Erasmus', 'NAM', 1995, 'AR', 68, 56, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-jj-smit', 'JJ Smit', 'NAM', 1995, 'AR', 64, 64, 'LFM', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-ruben-trumpelmann', 'Ruben Trumpelmann', 'NAM', 1998, 'BOWL', 42, 77, 'LFM', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-bernard-scholtz', 'Bernard Scholtz', 'NAM', 1990, 'BOWL', 24, 64, 'SLA', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-jan-nicol-loftie-eaton', 'Jan Nicol Loftie-Eaton', 'NAM', 2001, 'BAT', 66, 40, 'LB', 'L', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-niko-davin', 'Niko Davin', 'NAM', 1998, 'BAT', 60, 30, 'LB', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-louren-steenkamp', 'Louren Steenkamp', 'NAM', 1997, 'BAT', 60, 30, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-jean-pierre-kotze', 'Jean-Pierre Kotze', 'NAM', 1994, 'BAT', 62, 0, '', 'L', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-malan-kruger', 'Malan Kruger', 'NAM', 1995, 'BAT', 60, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-dylan-leicher', 'Dylan Leicher', 'NAM', 2004, 'BAT', 56, 35, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-michael-van-lingen', 'Michael van Lingen', 'NAM', 1997, 'AR', 60, 50, 'LM', 'L', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-shaun-fouche', 'Shaun Fouche', 'NAM', 2000, 'AR', 52, 55, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-alexander-busing-volschenk', 'Alexander Busing-Volschenk', 'NAM', 2005, 'AR', 52, 52, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-jan-frylinck', 'Jan Frylinck', 'NAM', 1994, 'AR', 58, 62, 'LFM', 'L', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-zane-green', 'Zane Green', 'NAM', 1996, 'WK', 60, 0, '', 'L', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-jc-balt', 'JC Balt', 'NAM', 2000, 'BAT', 56, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-jack-brassell', 'Jack Brassell', 'NAM', 2005, 'BOWL', 25, 56, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-tangeni-lungameni', 'Tangeni Lungameni', 'NAM', 1992, 'BOWL', 30, 60, 'LM', 'L', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-ben-shikongo', 'Ben Shikongo', 'NAM', 2000, 'BOWL', 25, 62, 'RFM', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-jan-izak-de-villiers', 'Jan-Izak de Villiers', 'NAM', 2001, 'BOWL', 25, 58, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-peter-daniel-blignaut', 'Peter-Daniel Blignaut', 'NAM', 2005, 'BOWL', 25, 56, 'SLA', 'R', { t20: 1, odi: 0, fc: -3 }, ['NAM']],
    ['nam-kobus-ventersdorp', 'Kobus Ventersdorp', 'NAM', 2001, 'WK', 48, 0, '', 'R', { t20: 1, odi: 0, fc: -3, gen: 1 }, ['NAM']],
  ],
  teams: [
    { id: 'NAM-WAN', name: 'Wanderers', short: 'WAN', kind: 'domestic', level: 2 },
    { id: 'NAM-TU', name: 'Trustco United', short: 'TU', kind: 'domestic', level: 2 },
    { id: 'NAM-WHS', name: 'WHS Old Boys', short: 'WHS', kind: 'domestic', level: 2 },
    { id: 'NAM-CCD', name: 'CCD Tigers', short: 'CCD', kind: 'domestic', level: 2 },
  ],
  comps: [],
};
