// ===== Domestic white-ball cricket in Pakistan and Afghanistan (W4) =====
// Pakistan: the National Champions Cup (the Champions One-Day Cup) and the National T20 Cup. Afghanistan: the
// Ghazi Amanullah Khan Regional One Day Tournament (List A), the Shpageeza Cricket League (T20) and the Wakhan
// National T20 Cup. Checked November 2026; sources by each definition. AI competitions: nobody manages these
// teams yet. Seasons are planned by the yearly planner (comps.js yearPlan) with a fixed set of teams, the
// same way every year; a season that starts before the save's start day is skipped.
// Not built: the Najibullah Tarakai PWDs T20 (two regional rounds, May and Nov 2025) and the departmental
// President's Cup (Pakistan, from Aug 2026): their formats and teams weren't verified.
import { registerComps } from './comps.js';
import { dayOfDate } from './dates.js';

const D = (y, m, d) => dayOfDate(y, m, d);
const ONE_DAY = { win: 2, tie: 1, nr: 1, loss: 0 };
const base = (o) => ({ kind: 'domestic', listA: true, ...o });
let ENABLED = true;
export const setDomesticPakAfgEnabled = (on) => { ENABLED = !!on; };

// National Champions Cup 2026 (the second Champions One-Day Cup): four selector-picked sides (Pakistan Greens,
// Gold, Whites, Blues), a round robin and a final, List A, 11-18 Aug 2026 at Multan; wins count 2 in the
// published table, 6 points for Greens' three wins. The 2024-25 edition had five franchise-style sides
// (Dolphins, Lions, Panthers, Stallions, Markhors). Their squads are picked by the selection committee and
// weren't verified, so these rosters are generated. en.wikipedia.org/wiki/2026_National_Champions_Cup
// ('top2': the table's top two meet in the final; the real 2026 final was Gold v Greens.)
export const PAK_CHAMP_TEAMS = ['PAK-GRN', 'PAK-GLD', 'PAK-WHT', 'PAK-BLU'];
// National T20 Cup 2025-26 Super 10: two groups of five, top two of each to the semi-finals, then a final.
// Peshawar and Sialkot are the Blues sides here. The real tournament ran 7 Mar to 7 Jun 2026 (the final was
// postponed); in-game it is 7 Mar to 5 Apr. Promotion and relegation with the qualifier (14-24 Feb) isn't
// modelled: the same ten sides play each year. en.wikipedia.org/wiki/2025-26_National_T20_Cup
export const NT20_GROUPS = [['PAK-BWP', 'PAK-FSD', 'PAK-KHW', 'PAK-LHW', 'PAK-PES'], ['PAK-ABT', 'PAK-KHB', 'PAK-LHB', 'PAK-MUL', 'PAK-SKT']];
// Afghanistan's five regions (Amo, Band-e-Amir, Boost, Mis Ainak, Speen Ghar).
export const AFG_REGIONS = ['AFG-AMO', 'AFG-BEA', 'AFG-BST', 'AFG-MA', 'AFG-SG'];
// Ghazi Amanullah Khan Regional One Day Tournament (ninth edition 2026): five regions, 17 May to 4 Jun, final
// on 4 Jun, in Nangarhar. ACB calls it a round robin (Wikipedia a double round robin: the sources disagree);
// a single round robin and a final is used. acb.af "The Ninth edition of the e& Regional List A Tournament begins May 17".
// Shpageeza Cricket League (11th edition 2026): the same five regions as franchise-style sides, double round
// robin (20) and the top two in the Grand Finale, 1 to 14 Jul, Khost (21 matches). acb.af, "The 11th Edition of
// the Shpageeza Cricket League Begins July 1 in Khost Province".
// Wakhan National T20 Cup (2025: 28 Jun to 7 Jul, Kunduz; won by Hindukush Strikers): four Ahmad Shah Abdali
// sides. Format wasn't published; a round robin and a final is assumed. acb.af, "Domestic Cricket Competitions
// and the Journey through the Year 2025".
export const AFG_ASA_TEAMS = ['AFG-MWC', 'AFG-MPS', 'AFG-HKS', 'AFG-PML'];

const DEFS = {
  'PAK-CHAMP': base({ id: 'PAK-CHAMP', name: 'National Champions Cup', short: 'Champions Cup', host: 'PAK', fmt: 'ODI', level: 1, window: ['Aug 11', 'Aug 18'], points: ONE_DAY,
    stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'top2', name: 'Final' }] }),
  'PAK-NT20': base({ id: 'PAK-NT20', name: 'National T20 Cup', short: 'National T20', host: 'PAK', fmt: 'T20', level: 1, window: ['Mar 7', 'Apr 5'], points: ONE_DAY,
    stages: [{ type: 'rr', name: 'Groups', groups: NT20_GROUPS }, { type: 'ko', plan: 'semis', name: 'Semi-finals and final' }] }),
  'AFG-GAK': base({ id: 'AFG-GAK', name: 'Ghazi Amanullah Khan Regional One Day', short: 'GAK One Day', host: 'AFG', fmt: 'ODI', level: 1, window: ['May 17', 'Jun 4'], points: ONE_DAY,
    stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'top2', name: 'Final' }] }),
  'AFG-SCL': base({ id: 'AFG-SCL', name: 'Shpageeza Cricket League', short: 'Shpageeza', host: 'AFG', fmt: 'T20', level: 1, window: ['Jul 1', 'Jul 14'], points: ONE_DAY,
    stages: [{ type: 'rr', name: 'League', legs: 2 }, { type: 'ko', plan: 'top2', name: 'Grand Final' }] }),
  'AFG-WAKHAN': base({ id: 'AFG-WAKHAN', name: 'Wakhan National T20 Cup', short: 'Wakhan T20', host: 'AFG', fmt: 'T20', level: 1, window: ['Jun 28', 'Jul 7'], points: ONE_DAY,
    stages: [{ type: 'rr', name: 'League' }, { type: 'ko', plan: 'top2', name: 'Final' }] }),
};
export const PAKAFG_COMPS = Object.keys(DEFS);
// [comp, teams, start [m, d], end [m, d]] (month 0-11)
const PLAN = [
  ['PAK-CHAMP', PAK_CHAMP_TEAMS, [7, 11], [7, 18]], ['PAK-NT20', NT20_GROUPS.flat(), [2, 7], [3, 5]],
  ['AFG-GAK', AFG_REGIONS, [4, 17], [5, 4]], ['AFG-SCL', AFG_REGIONS, [6, 1], [6, 14]], ['AFG-WAKHAN', AFG_ASA_TEAMS, [5, 28], [6, 7]],
];
function planner(G, y) {
  const wd = G.s.wd; if (!wd || !ENABLED) return [];
  return PLAN.map(([comp, teams, a, b]) => ({ comp, teams, start: D(y, a[0], a[1]), end: D(y, b[0], b[1]) })).filter((p) => p.start >= wd.day);
}
registerComps(DEFS, planner);
export { PLAN as PAKAFG_PLAN };
