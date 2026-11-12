// Syed Mushtaq Ali Trophy (India's domestic T20). The 38 state sides are the teams of the Indian nation file (IND-MUM and so on, with their
// registered players there and in leagues/IPL.js); this module carries the competition's rules. Format and windows: world/leagues-india.js.
export default {
  code: 'SMAT', name: 'Syed Mushtaq Ali Trophy', kind: 'domestic', host: 'IND', asOf: '2026-11-11',
  sources: ['Wikipedia, "2025–26 Syed Mushtaq Ali Trophy" (38 teams: four Elite groups of eight, Super League, Plate), read November 2026',
    'BCCI 2026-27 domestic season ready reckoner and outlookindia.com, crictracker.com (2026-27 dates), November 2026'],
  teams: [], players: [], squads: {},
  rules: { min: 15, max: 25, overseas: { max: 0, xi: 0 }, recruit: 'contract', note: 'state sides: Indian players only' },
};
