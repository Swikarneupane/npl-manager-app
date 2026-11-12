// Franchise leagues and domestic white-ball competitions: one module per league, loaded on demand.
// Each module's default export: { code, name, kind: 'franchise' | 'domestic', host, asOf, sources,
//   teams: [{ id, name, short, city, level? }],          team ids are `<CODE>-<SHORT>`, e.g. IPL-CSK
//   players: [record],                                    players not already in a nation file (same record shape)
//   squads: { teamId: [playerId | 'Name|NAT'] },          registered squad, by database id or name and nationality
//   rules: { min, max, overseas: { max, xi }, recruit: 'auction' | 'draft' | 'contract', retain, purse } }
// A builder may add a league: append a line to LEAGUES and a loader, inside the section for its region.
export const LEAGUES_DB = [
  ['IPL', 'Indian Premier League', 'franchise'],
  ['SMAT', 'Syed Mushtaq Ali Trophy', 'domestic'],
  ['VH', 'Vijay Hazare Trophy', 'domestic'],
  ['PSL', 'Pakistan Super League', 'franchise'],
  ['BPL', 'Bangladesh Premier League', 'franchise'],
  ['LPL', 'Lanka Premier League', 'franchise'],
  ['ILT20', 'International League T20', 'franchise'],
  ['APL', 'Afghanistan Premier League', 'franchise'],
  ['HUN', 'The Hundred', 'franchise'],
  ['BLAST', 'Vitality T20 Blast', 'domestic'],
  ['RLC', 'Metro Bank One-Day Cup', 'domestic'],
  ['MLC', 'Major League Cricket', 'franchise'],
  ['CPL', 'Caribbean Premier League', 'franchise'],
  ['BBL', 'Big Bash League', 'franchise'],
  ['MARSH', 'Marsh One-Day Cup', 'domestic'],
  ['SA20', 'SA20', 'franchise'],
  ['CSAT20', 'CSA T20 Challenge', 'domestic'],
  ['SMASH', 'Super Smash', 'domestic'],
  ['FORD', 'Ford Trophy', 'domestic'],
];
export const LEAGUE_CODES = LEAGUES_DB.map((l) => l[0]);
const LOADERS = {
  IPL: () => import('./leagues/IPL.js'),
  SMAT: () => import('./leagues/SMAT.js'),
  VH: () => import('./leagues/VH.js'),
  PSL: () => import('./leagues/PSL.js'),
  BPL: () => import('./leagues/BPL.js'),
  LPL: () => import('./leagues/LPL.js'),
  ILT20: () => import('./leagues/ILT20.js'),
  APL: () => import('./leagues/APL.js'),
  HUN: () => import('./leagues/HUN.js'),
  BLAST: () => import('./leagues/BLAST.js'),
  RLC: () => import('./leagues/RLC.js'),
  MLC: () => import('./leagues/MLC.js'),
  CPL: () => import('./leagues/CPL.js'),
  BBL: () => import('./leagues/BBL.js'),
  MARSH: () => import('./leagues/MARSH.js'),
  SA20: () => import('./leagues/SA20.js'),
  CSAT20: () => import('./leagues/CSAT20.js'),
  SMASH: () => import('./leagues/SMASH.js'),
  FORD: () => import('./leagues/FORD.js'),
};
export const loadLeague = (code) => (LOADERS[code] ? LOADERS[code]() : Promise.reject(new Error(`no league ${code}`)));
