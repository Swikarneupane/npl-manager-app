// Where the depth screens live, grouped the same way on the desktop nav and the phone More sheet.
export const MORE_MAIN = [['/history', 'History', 'Records'], ['/club', 'Club', 'Board · money'], ['/world', 'World', 'Leagues abroad'], ['/nepal', 'Nepal', 'National team'], ['/settings', 'Settings', 'Saves · language']];
export const DEPTH_GROUPS = [
  ['Between matches', [['/week', 'Training week'], ['/dressing', 'Dressing room'], ['/scouting', 'Scouting']]],
  ['Club office', [['/staff', 'Staff'], ['/recruitment', 'Recruitment'], ['/board', 'Board'], ['/commercial', 'Sponsors and fans']]],
  ['The league', [['/league', 'League hub'], ['/stories', 'Stories'], ['/career', 'Career'], ['/news', 'News'], ['/stats', 'Stats']]],
  ['World cricket', [['/international', 'International'], ['/worldcup', 'World Cup'], ['/rankings', 'Rankings']]],
  ['Your jobs', [['/calendar', 'Calendar'], ['/nation', 'National team'], ['/clubabroad', 'Club abroad'], ['/jobs', 'Jobs']]],
];
// With no club job the NPL screens step back: the national side, the calendar and the competitions lead.
export const NATION_ROUTES = ['/nation', '/clubabroad'];
export const CAL_ROUTES = ['/calendar', '/comp/'];
// Matchday screens count as "Match" in the bottom bar; table screens as "League".
export const MATCH_ROUTES = ['/match', '/prematch', '/press', '/roundup', '/final', '/trophy'];
export const LEAGUE_ROUTES = ['/season', '/scorecard', '/playoffs', '/league', '/stats'];
// Screens that are a bottom-bar destination on the phone (no back button there).
// Auction, retention and off-season take Match's place in the off-season phases only.
export const ROOTS = ['/', '/squad', '/match', '/season'];
const OFF_ROOTS = ['/auction', '/retention', '/offseason'];
// Where Back goes when there is no history to go back to (a restored session, a shared link).
const PARENTS = [['/contract/list', '/club'], ['/player', '/squad'], ['/scorecard', '/season?tab=fixtures'], ['/contract/', '/contract/list'], ['/story/', '/stories'], ['/squad/overseas', '/squad'],
  ['/prematch', '/'], ['/press', '/'], ['/roundup', '/'], ['/final', '/'], ['/trophy', '/'], ['/review', '/'], ['/playoffs', '/season'], ['/signings', '/'], ['/worldcup', '/international'], ['/rankings', '/international'],
  ['/comp/', '/calendar?view=list'], ['/calendar', '/'], ['/nation', '/'], ['/clubabroad', '/'], ['/jobs', '/']];
export const parentOf = (path) => { const x = PARENTS.find(([p]) => path.startsWith(p)); return x ? x[1] : '/'; };
export const isRoot = (path, phase) => ROOTS.includes(path) || (['offseason', 'retention', 'auction'].includes(phase) && OFF_ROOTS.includes(path));
