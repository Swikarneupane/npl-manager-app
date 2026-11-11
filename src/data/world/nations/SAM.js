// Samoa: national and domestic players. Ratings are the game's estimates.
// record: [id, name, nat, born, role, bat, bowl, type, hand, fm, teams]  (see docs/world/ARCHITECTURE.md)
// Snapshot: 15-man squad for the 2025 Asia/EAP T20 World Cup Qualifier in Oman, plus players listed on Samoa squad pages. Bowling types for several Samoan players are not published; those are the game's estimates.
// Real players carry only name, nationality, approximate birth year, role, batting hand, bowling type and team registrations.
// Records whose fm has gen: 1 are generated placeholders with fictional names (used where too few players could be verified).
export default {
  code: 'SAM', name: 'Samoa', member: 'associate', asOf: '2025-10-08',
  sources: [
    'https://www.icc-cricket.com/news/you-do-it-mother-s-word-as-ross-taylor-answers-samoa-call',
    'https://www.wisden.com/cricket-news/new-zealand-great-ross-taylor-reverses-retirement-to-represent-samoa-in-t20-world-cup-qualifier',
    'https://possible11.com/team/samoa-4112/squad/',
    'https://en.wikipedia.org/wiki/Samoa_national_cricket_team',
  ],
  players: [
    ['sam-caleb-jasmat', 'Caleb Jasmat', 'SAM', 1998, 'AR', 52, 50, 'OB', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-ross-taylor', 'Ross Taylor', 'SAM', 1984, 'BAT', 72, 20, '', 'R', { t20: 0, odi: 0, fc: 0 }, ['SAM']],
    ['sam-sean-solia', 'Sean Solia', 'SAM', 1993, 'BAT', 60, 45, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-darius-visser', 'Darius Visser', 'SAM', 1995, 'AR', 56, 48, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-daniel-burgess', 'Daniel Burgess', 'SAM', 1999, 'AR', 46, 46, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-douglas-finau', 'Douglas Finau', 'SAM', 1998, 'BOWL', 30, 48, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-sam-french', 'Sam French', 'SAM', 1997, 'WK', 44, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-maletino-maiava', 'Maletino Maiava', 'SAM', 2000, 'WK', 40, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-kurtis-hynam-nyberg', 'Kurtis Hynam-Nyberg', 'SAM', 1999, 'BOWL', 30, 46, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-ben-mailata', 'Ben Mailata', 'SAM', 1996, 'BAT', 46, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-noah-mead', 'Noah Mead', 'SAM', 2000, 'BOWL', 25, 48, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-solomon-nash', 'Solomon Nash', 'SAM', 1998, 'BOWL', 25, 50, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-samson-sola', 'Samson Sola', 'SAM', 1995, 'BOWL', 30, 50, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-fereti-sululoto', 'Fereti Sululoto', 'SAM', 1997, 'BAT', 46, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-saumani-tiai', 'Saumani Tiai', 'SAM', 1996, 'AR', 46, 46, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-ili-tugaga', 'Ili Tugaga', 'SAM', 1998, 'BOWL', 25, 48, 'RM', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
    ['sam-sean-cotter', 'Sean Cotter', 'SAM', 1997, 'BAT', 44, 0, '', 'R', { t20: 1, odi: 0, fc: -3 }, ['SAM']],
  ],
  teams: [],
  comps: [],
};
