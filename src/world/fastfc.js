// ===== Fast sim for multi-day cricket (Tests and first-class) =====
// Four innings inside a time limit: overs per day less weather, declarations when the lead and the
// clock allow, the follow-on, draws when time runs out, and a wearing pitch that helps spin late on.
// Same card shape as fastsim.js, plus `d` (declared) on innings and `draw` on the result.
import { skill } from './fastsim.js';
const SPIN = ['OB', 'LB', 'SLA', 'LWS'];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// Test: 5 days. FC4/FC3/FC2: four-, three- and two-day first-class and domestic multi-day cricket.
export const FC = { Test: { days: 5, perDay: 87, follow: 200 }, FC4: { days: 4, perDay: 96, follow: 150 }, FC3: { days: 3, perDay: 96, follow: 150 }, FC2: { days: 2, perDay: 100, follow: 100 } };
export const isMultiDay = (fmt) => !!FC[fmt];
// Share of a match's time lost to weather and over rates. A wet spell costs a session or more about two
// Tests in seven, and somewhat more often in first-class cricket (county and Shield cricket lose plenty).
// The live engine uses this too, so the two agree.
export function weatherLoss(kind, rnd = Math.random) { const wet = kind === 'Test' ? 0.28 : 0.45; return rnd() < wet ? 0.1 + rnd() * 0.35 : rnd() * 0.08; }
const P = { sr: 56, life: 82, cap: 450 };

function attackOf(xi, inn) {
  const pool = xi.filter((p) => p.bowl >= 30).map((p) => ({ p, k: skill(p, 'bowl', 'FC') + (SPIN.includes(p.type) ? (inn >= 3 ? 5 : inn === 2 ? 2 : -2) : (inn === 1 ? 2 : 0)) }))
    .sort((a, b) => b.k - a.k).slice(0, 5);
  // a short side uses whoever it has
  while (pool.length < 4) { const p = xi.find((x) => x && !pool.some((y) => y.p === x)); if (!p) break; pool.push({ p, k: skill(p, 'bowl', 'FC') }); }
  return pool;
}
// One innings. Stops at all out, a declaration, the target, or the end of the match (balls left).
function innings(rnd, bat, bowl, inn, { target, ballsLeft, declareAt }) {
  const atk = attackOf(bowl.xi, inn); const atkSkill = atk.length ? atk.reduce((a, x) => a + x.k, 0) / atk.length : 30;
  let r = 0, w = 0, b = 0, declared = false, won = false; const card = [];
  const extras = Math.round(8 + rnd() * 14);
  const exAt = (bb) => Math.round(extras * Math.min(1, bb / 540));
  for (let i = 0; i < bat.order.length && w < 10 && b < ballsLeft; i++) {
    const p = bat.order[i]; const s = skill(p, 'bat', 'FC'); const edge = (s - atkSkill) / 100;
    const ex = () => -Math.log(1 - rnd() * 0.999);
    const life = clamp(P.life * (1 + 1.8 * edge) * (s < 40 ? 0.35 : 1) * (inn === 4 ? 0.85 : 1), 4, P.life * 2.2);
    let faced = Math.max(1, Math.min(P.cap, Math.round(life * (ex() + ex()) / 2))); let out = true;
    if (faced >= ballsLeft - b) { faced = ballsLeft - b; out = false; }
    const sr = P.sr * (1 + 0.9 * edge) * (0.85 + rnd() * 0.3) * (target && ballsLeft - b < 180 ? 1.4 : 1);
    let runs = Math.max(0, Math.round((faced * sr) / 100));
    if (target && r + runs + exAt(b + faced) >= target) { faced = Math.max(1, Math.min(faced, Math.round(((target - r) * 100) / sr))); runs = Math.max(1, target - r - exAt(b + faced)) + (rnd() < 0.3 ? Math.floor(rnd() * 4) : 0); out = false; won = true; }
    const fours = Math.round(runs * 0.12 * (0.7 + rnd() * 0.6)); const sixes = Math.round(runs * 0.012 * rnd() * 2);
    r += runs; b += faced; if (out) w++;
    card.push([p.id, runs, faced, fours, sixes, out ? 'out' : 'not out']);
    if (won) break;
    if (declareAt && r + exAt(b) >= declareAt && w < 9) { declared = true; break; }
    if (i === bat.order.length - 1) break;
  }
  r += exAt(b);
  // bowling: no quota, the best bowlers bowl most; wickets by skill
  const tw = atk.reduce((a, x) => a + Math.pow(Math.max(5, x.k), 2), 0);
  const bw = atk.map((x) => ({ p: x.p, k: x.k, balls: 0, r: 0, w: 0, sh: Math.pow(Math.max(5, x.k), 2) / tw }));
  let rest = b; for (const x of bw) { const n = Math.round(b * (0.6 * x.sh + 0.4 / bw.length) / 6) * 6; x.balls = Math.min(rest, n); rest -= x.balls; } if (rest > 0 && bw.length) bw[0].balls += rest;
  const outs = card.filter((c) => c[5] === 'out').length; const ro = Math.round(outs * 0.04 * rnd() * 2);
  if (bw.length) for (let i = 0; i < outs - ro; i++) { let u = rnd(), j = 0; for (; j < bw.length - 1; j++) { u -= bw[j].sh; if (u <= 0) break; } bw[j].w++; }
  const given = r - exAt(b); let g = 0; for (const x of bw) { x.r = Math.round(x.balls * (given / Math.max(1, b)) * (1 - (x.k - 60) / 220) * (0.85 + rnd() * 0.3)); g += x.r; }
  if (g) for (const x of bw) x.r = Math.max(0, Math.round((x.r * given) / g));
  return { t: bat.id, r, w, b, d: declared, bat: card, bowl: bw.filter((x) => x.balls > 0).map((x) => [x.p.id, x.balls, x.r, x.w]) };
}

// kind: 'Test' (5 days) or 'FC4' (4 days). opts.weather: share of time lost (0 to 0.5).
export function fastFC(home, away, kind = 'FC4', rnd = Math.random, opts = {}) {
  // time lost to weather and over rates: a wet spell costs a session or more about two matches in five,
  // and in first-class cricket a little more often (county and Shield cricket lose plenty to the weather)
  const F = FC[kind]; const lost = opts.weather != null ? opts.weather : weatherLoss(kind, rnd);
  let left = Math.round(F.days * F.perDay * 6 * (1 - lost)); const inns = [];
  const first = rnd() < 0.5 ? home : away, second = first === home ? away : home;
  const play = (bat, bowl, n, o) => { const x = innings(rnd, bat, bowl, n, { ...o, ballsLeft: left }); left -= x.b; inns.push(x); return x; };
  const i1 = play(first, second, 1, { declareAt: 520 + rnd() * 120 });
  if (left <= 0) return result(home, away, inns, null, kind);
  const i2 = play(second, first, 2, { declareAt: i1.r + 180 + rnd() * 120 });
  if (left <= 0) return result(home, away, inns, null, kind);
  // the follow-on: enforced most of the time when the deficit is big and there's time
  const follow = i1.r - i2.r >= F.follow && rnd() < 0.7 && left > 900;
  const b3 = follow ? second : first, f3 = follow ? first : second;
  const lead = follow ? i2.r - i1.r : i1.r - i2.r;
  // third innings: declare to set a target the side can bowl out in the time left
  const want = clamp(Math.round(left / 6 * 2.8 - 60), 180, 420);
  const i3 = play(b3, f3, 3, { declareAt: follow ? null : want - lead });
  const total3 = follow ? i2.r + i3.r : i1.r + i3.r, other = follow ? i1.r : i2.r;
  const target = total3 - other + 1;
  // the side batting third is out still behind: whoever batted once wins by an innings
  if (target <= 0) return result(home, away, inns, f3, kind, 'an innings');
  if (left <= 0) return result(home, away, inns, null, kind);
  const i4 = play(f3, b3, 4, { target });
  if (i4.r >= target) return result(home, away, inns, f3, kind);
  if (i4.w >= 10) return result(home, away, inns, b3, kind);
  return result(home, away, inns, null, kind); // time ran out: a draw
}
function result(home, away, inns, winner, kind, how) {
  const draw = !winner; const loser = winner ? (winner === home ? away : home) : null;
  let margin = '';
  if (winner) { const last = inns[inns.length - 1];
    if (how === 'an innings') { const tot = (t) => inns.filter((i) => i.t === t.id).reduce((a, i) => a + i.r, 0); margin = `an innings and ${tot(winner) - tot(loser)} runs`; }
    else if (last.t === winner.id) margin = `${10 - last.w} wicket${10 - last.w === 1 ? '' : 's'}`;
    else { const tot = (t) => inns.filter((i) => i.t === t.id).reduce((a, i) => a + i.r, 0); const d = tot(winner) - tot(loser); margin = `${d} run${d === 1 ? '' : 's'}`; } }
  return { fmt: kind, inns, winner: winner ? winner.id : null, loser: loser ? loser.id : null, draw, margin };
}
