// ===== Fast sim =====
// A whole limited-overs match from two XIs in well under a millisecond: each batter in order faces a
// run of balls ended by a dismissal (or the end of the innings), at a strike rate set by his rating
// against the attack, the format and how many balls are left. Bowlers share the overs by quota and
// rating, and take the wickets in proportion to skill. The ball-by-ball engine is for the user's
// matches; this keeps every other table, stat and ranking meaningful.
//
// side: { id, xi: [player], order: [player] (batting order) }   player: { id, bat, bowl, type, fm, form, fit }
// Returns a compact card: { inns: [{ t, r, w, b, bat: [[id, r, b, 4s, 6s, how]], bowl: [[id, balls, r, w]] }], winner, margin, text }
const FMT = {
  T20: { balls: 120, quota: 24, par: 160, sr: 128, life: 21, cap: 66 },
  ODI: { balls: 300, quota: 60, par: 270, sr: 88, life: 46, cap: 145 },
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Skill for this format: base rating, the format modifier, form and fitness.
export function skill(p, kind, fmt) {
  const base = kind === 'bat' ? p.bat : p.bowl; const fm = (p.fm && (p.fm[fmt === 'ODI' ? 'odi' : fmt === 'T20' ? 't20' : 'fc'])) || 0;
  return base + fm + (p.form || 0) * 0.8 - (100 - (p.fit ?? 100)) * 0.06;
}

function bowlers(xi, fmt) {
  const pool = xi.filter((p) => p.bowl >= 35).sort((a, b) => skill(b, 'bowl', fmt) - skill(a, 'bowl', fmt));
  // a short side (fewer than five bowling options) uses whoever it has
  const use = pool.slice(0, 6); while (use.length < 5) { const p = xi.find((x) => x && !use.includes(x)); if (!p) break; use.push(p); }
  return use;
}

function innings(rnd, bat, bowl, fmt, target, maxBalls) {
  const F = FMT[fmt]; const atk = bowlers(bowl.xi, fmt);
  const atkSkill = (atk.length ? atk.slice(0, 5).reduce((a, p) => a + skill(p, 'bowl', fmt), 0) / Math.min(5, atk.length) : 30) + (bowl.day || 0);
  let r = 0, w = 0, b = 0, won = false; const card = []; const order = bat.order;
  const extras = Math.round((fmt === 'ODI' ? 8 : 5) + rnd() * 6);
  for (let i = 0; i < order.length && w < 10 && b < maxBalls && !(target && r >= target); i++) {
    const p = order[i]; const s = skill(p, 'bat', fmt) + (bat.day || 0);
    const edge = (s - atkSkill) / 100; // about -0.5 to +0.5
    // balls until out: longer for better batters; the tail is gone quickly
    const life = clamp(F.life * (1 + 1.6 * edge) * (s < 40 ? 0.45 : 1), 3, F.life * 1.8);
    // the average of two exponential draws: most innings near the batter's usual length, few epics
    const ex = () => -Math.log(1 - rnd() * 0.999);
    let faced = Math.max(1, Math.min(F.cap, Math.round(life * (ex() + ex()) / 2)));
    const left = maxBalls - b; let out = true; if (faced >= left) { faced = left; out = false; }
    // strike rate: format, skill, and the stage (the last fifth of an innings is faster)
    const late = b / maxBalls > 0.8 ? 1.25 : 1;
    let sr = F.sr * (1 + 1.1 * edge) * late * (0.88 + rnd() * 0.24); if (s < 40) sr *= 0.7;
    let runs = Math.max(0, Math.round((faced * sr) / 100));
    const exAt = (bb) => Math.round(extras * Math.min(1, bb / maxBalls));
    if (target && r + runs + exAt(b + faced) >= target) { // the chase ends when it's won, often with a boundary
      faced = Math.max(1, Math.min(faced, Math.round(((target - r) * 100) / sr))); runs = Math.max(1, target - r - exAt(b + faced)) + (rnd() < 0.35 ? Math.floor(rnd() * 4) : 0); out = false; won = true;
    }
    const sixes = Math.round((runs * (fmt === 'T20' ? 0.085 : 0.035) * (0.6 + rnd() * 0.8)) / 1); const fours = Math.max(0, Math.round((runs - sixes * 6) * 0.11 * (0.7 + rnd() * 0.6)));
    r += runs; b += faced; if (out) w++;
    card.push([p.id, runs, faced, fours, sixes, out ? 'out' : 'not out']);
    if (won || i === order.length - 1) break;
  }
  r += Math.round(extras * Math.min(1, b / maxBalls));
  // bowling: share the balls bowled by quota, best bowlers most, wickets by skill
  const legal = b; const bw = atk.map((p) => ({ p, balls: 0, r: 0, w: 0, k: skill(p, 'bowl', fmt) }));
  let rest = legal; let k = 0; while (rest > 0 && k < 400) { const x = bw[k % bw.length]; const add = Math.min(6, rest, F.quota - x.balls); if (add > 0) { x.balls += add; rest -= add; } k++; if (bw.every((y) => y.balls >= F.quota)) break; }
  const tw = bw.reduce((a, x) => a + Math.pow(Math.max(5, x.k), 2) * x.balls, 0) || 1;
  let wl = card.filter((c) => c[5] === 'out').length; // run-outs not credited: about 1 in 12
  const runouts = Math.round(wl * 0.08 * rnd() * 2); wl -= runouts;
  const shares = bw.map((x) => (Math.pow(Math.max(5, x.k), 2) * x.balls) / tw);
  for (let i = 0; i < wl; i++) { let u = rnd(), j = 0; for (; j < shares.length - 1; j++) { u -= shares[j]; if (u <= 0) break; } bw[j].w++; }
  const eco = (x) => (r / Math.max(1, legal)) * (1 - (x.k - 60) / 200);
  let given = 0; for (const x of bw) { x.r = Math.max(0, Math.round(x.balls * eco(x) * (0.85 + rnd() * 0.3))); given += x.r; }
  if (given && bw.length) { const f = (r - Math.round(extras * Math.min(1, b / maxBalls))) / given; for (const x of bw) x.r = Math.max(0, Math.round(x.r * f)); }
  return { t: bat.id, r, w, b, bat: card, bowl: bw.filter((x) => x.balls > 0).map((x) => [x.p.id, x.balls, x.r, x.w]) };
}

// rnd: a () => [0,1) function (Math.random or a seeded generator).
// A side's form on the day, in rating points: the reason equal sides split and upsets happen.
const DAY_SD = { T20: 8, ODI: 6.5 };
const gauss = (rnd) => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) / 0.707; };
export function fastMatch(home0, away0, fmt = 'T20', rnd = Math.random, opts = {}) {
  const F = FMT[fmt]; const maxBalls = opts.balls || F.balls;
  const home = { ...home0, day: gauss(rnd) * DAY_SD[fmt] }, away = { ...away0, day: gauss(rnd) * DAY_SD[fmt] };
  const first = rnd() < 0.5 ? home : away, second = first === home ? away : home;
  const i1 = innings(rnd, first, second, fmt, null, maxBalls);
  const i2 = innings(rnd, second, first, fmt, i1.r + 1, maxBalls);
  let winner = null, margin = '', tie = false;
  if (i2.r > i1.r) { winner = second.id; margin = `${10 - i2.w} wicket${10 - i2.w === 1 ? '' : 's'}`; }
  else if (i1.r > i2.r) { winner = first.id; const d = i1.r - i2.r; margin = `${d} run${d === 1 ? '' : 's'}`; }
  else { tie = true; winner = rnd() < 0.5 ? first.id : second.id; margin = 'Super Over'; }
  return { fmt, inns: [i1, i2], winner, loser: winner === home.id ? away.id : home.id, tie, margin };
}
export const FORMATS = FMT;
