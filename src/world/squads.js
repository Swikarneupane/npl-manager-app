// ===== Squads and XIs for any side =====
import { skill } from './fastsim.js';
const SPIN = ['OB', 'LB', 'SLA', 'LWS'];
const isSpin = (t) => SPIN.includes(t);
// A player's worth to a squad in this format: his better discipline, all-rounders a little more.
export function value(p, fmt) {
  const b = skill(p, 'bat', fmt), w = p.bowl >= 35 ? skill(p, 'bowl', fmt) : 0;
  return p.role === 'AR' ? Math.max(b, w) + Math.min(b, w) * 0.25 : p.role === 'WK' ? b + 3 : Math.max(b, w);
}
// The best squad of `n` from a pool: two keepers, at least five seam and two spin options, then by value.
export function autoSquad(pool, fmt, n = 15) {
  const by = pool.slice().sort((a, b) => value(b, fmt) - value(a, fmt)); const sq = [];
  const add = (p) => { if (p && !sq.includes(p) && sq.length < n) sq.push(p); };
  by.filter((p) => p.role === 'WK').slice(0, 2).forEach(add);
  by.filter((p) => p.bowl >= 50 && !isSpin(p.type)).slice(0, 4).forEach(add);
  by.filter((p) => p.bowl >= 50 && isSpin(p.type)).slice(0, 2).forEach(add);
  for (const p of by) add(p);
  return sq;
}
// The XI from a squad: a keeper, five bowling options, the best of the rest; order by batting.
export function autoXI(squad, fmt) {
  const by = squad.filter((p) => !p.inj).sort((a, b) => value(b, fmt) - value(a, fmt)); const xi = [];
  const add = (p) => { if (p && !xi.includes(p) && xi.length < 11) xi.push(p); };
  add(by.find((p) => p.role === 'WK'));
  by.filter((p) => p.bowl >= 50).sort((a, b) => skill(b, 'bowl', fmt) - skill(a, 'bowl', fmt)).slice(0, 5).forEach(add);
  for (const p of by) add(p);
  const order = xi.slice().sort((a, b) => skill(b, 'bat', fmt) - skill(a, 'bat', fmt));
  return { xi, order };
}
