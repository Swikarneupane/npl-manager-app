// ===== Competition definitions and the yearly plan =====
// COMPS[id] = { id, name, fmt, kind: 'international' | 'franchise' | 'domestic', host, level, points, stages: [...] }
// yearPlan(G, y) -> [{ comp, id?, name?, teams, start, end }]: every season that runs in year y.
// The international structure (W1) is filled in by intl.js; leagues and domestic cricket come in W3.
import { dayOfDate } from './dates.js';

export const COMPS = {
  BILAT_ODI: { id: 'BILAT_ODI', name: 'ODI series', fmt: 'ODI', kind: 'international', stages: [{ type: 'series', n: 3 }] },
  BILAT_T20I: { id: 'BILAT_T20I', name: 'T20I series', fmt: 'T20', kind: 'international', stages: [{ type: 'series', n: 3 }] },
};
// Plans from other modules (intl.js registers the international programme).
const PLANNERS = [];
export function registerComps(defs, planner) { Object.assign(COMPS, defs); if (planner) PLANNERS.push(planner); }
export function yearPlan(G, y) { const out = []; for (const f of PLANNERS) out.push(...(f(G, y) || [])); return out; }
export const d = (y, m, day) => dayOfDate(y, m, day);
