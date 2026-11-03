// Where the depth screens live, grouped the same way on the desktop nav and the phone More sheet.
export const MORE_MAIN = [['/history', 'History', 'Records'], ['/club', 'Club', 'Board · money'], ['/world', 'World', 'Leagues abroad'], ['/nepal', 'Nepal', 'National team'], ['/settings', 'Settings', 'Saves · language']];
export const DEPTH_GROUPS = [
  ['Between matches', [['/week', 'Training week'], ['/dressing', 'Dressing room'], ['/scouting', 'Scouting']]],
  ['Club office', [['/staff', 'Staff'], ['/recruitment', 'Recruitment'], ['/board', 'Board'], ['/commercial', 'Sponsors and fans']]],
  ['The league', [['/league', 'League hub'], ['/stories', 'Stories'], ['/career', 'Career'], ['/news', 'News'], ['/stats', 'Stats']]],
  ['World cricket', [['/international', 'International'], ['/worldcup', 'World Cup'], ['/rankings', 'Rankings']]],
];
// Matchday screens count as "Match" in the bottom bar; table screens as "League".
export const MATCH_ROUTES = ['/match', '/prematch', '/press', '/roundup', '/final', '/trophy'];
export const LEAGUE_ROUTES = ['/season', '/scorecard', '/playoffs', '/league', '/stats'];
