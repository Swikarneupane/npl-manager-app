// Dev-only fixture league: six teams with real-shaped rules, one competition. Used by tests and the screenshot harness,
// never by the shipped game. makeLeague(code, recruit) returns a league module for setDB's second argument.
import { registerComps } from './comps.js';
import { dayOfDate } from './dates.js';

const ROLES = ['BAT', 'BAT', 'BAT', 'BAT', 'WK', 'WK', 'AR', 'AR', 'AR', 'BOWL', 'BOWL', 'BOWL', 'BOWL', 'BOWL', 'BOWL'];
export const mkNation = (code, lvl, member = 'associate') => ({ code, name: code, member, players: Array.from({ length: 24 }, (_, i) => { const role = ROLES[i % 15]; return [`${code.toLowerCase()}-c${i}`, `${code} Player${i} Fx`, code, 1996 - (i % 9), role, role === 'BOWL' ? 25 : lvl + (i % 7), role === 'BAT' || role === 'WK' ? 12 : lvl - 4 + (i % 5), role === 'BOWL' || role === 'AR' ? (i % 3 ? 'RFM' : 'OB') : '', 'R', {}, [code]]; }), teams: [] });
export const TEAMS = ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF'];
export function makeLeague(code = 'TL', recruit = 'auction', extra = {}) {
  const rules = { min: 16, max: 22, overseas: { max: 5, xi: 3 }, recruit, retain: recruit === 'auction' ? 3 : 0, purse: 100, ...extra };
  return { code, name: `Test League ${code}`, kind: 'franchise', host: 'TLN', asOf: '2026-11-01', sources: [], teams: TEAMS.map((s, i) => ({ id: `${code}-${s}`, name: `${s} Kings`, short: s, city: s, level: i < 2 ? 1 : 2 })),
    players: [], squads: Object.fromEntries(TEAMS.map((s, i) => [`${code}-${s}`, [`sco-c${i}|SCO`, `nam-c${i}`].map((k) => (k.includes('|') ? `sco-c${i}` : k))])), rules };
}
const ACTIVE = new Set(); const REG = new Set();
export function activate(code, fmt = 'T20') {
  ACTIVE.add(code); if (REG.has(code)) return; REG.add(code);
  registerComps({ [code]: { id: code, name: `Test League ${code}`, fmt, kind: 'franchise', level: 3, stages: [{ type: 'rr', legs: 2 }, { type: 'ko', plan: 'semis' }] } },
    (G, y) => (ACTIVE.has(code) ? [{ comp: code, teams: TEAMS.map((s) => `${code}-${s}`), start: dayOfDate(y, 2, 10), end: dayOfDate(y, 3, 20) }] : []));
}
export const deactivate = (code) => ACTIVE.delete(code);
