// Playoff-race odds: a cheap Monte Carlo over the remaining league fixtures.
// Each match is a coin weighted by the gap in team strength (average rating of the auto XI),
// not the full ball-by-ball engine, so 200 seasons take a few milliseconds.
const SPREAD = 8; // a 5-point rating gap is roughly a 65/35 match
const NR = 0.04; // share of matches washed out (1 point each)
const TOP = 4;

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Settled by points alone, whatever happens in the remaining matches. Ties count against the team,
// so this only says "Qualified" or "Eliminated" when net run rate cannot matter.
function settled(st, left, id) {
  const me = st.find((r) => r.id === id); const max = (r) => r.pts + 2 * (left[r.id] || 0);
  const others = st.filter((r) => r.id !== id);
  if (others.filter((r) => max(r) >= me.pts).length < TOP) return 'in';
  if (others.filter((r) => r.pts > max(me)).length >= TOP) return 'out';
  return null;
}

const cache = new WeakMap();

// Returns { played, left:{id:n}, odds:{id:p}, status:{id:'in'|'out'|null}, need:{id:w|null} }.
// need[id] is the fewest wins from the remaining games that makes qualifying very likely (85%+).
export function playoffOdds(G, runs = 200) {
  const league = G.s.fixtures.filter((f) => f.stage === 'L');
  const rest = league.filter((f) => !f.res); const played = league.length - rest.length;
  const key = `${G.year}:${played}:${runs}`;
  const hit = cache.get(G.s); if (hit && hit.key === key) return hit.val;

  const st = G.standings(); const ids = st.map((r) => r.id);
  const left = {}; for (const f of rest) { left[f.home] = (left[f.home] || 0) + 1; left[f.away] = (left[f.away] || 0) + 1; }
  const str = {}; for (const id of ids) str[id] = G.strength(id);
  const rnd = mulberry(G.year * 1000 + played);
  const made = {}, byWins = {}; for (const id of ids) { made[id] = 0; byWins[id] = []; }

  for (let r = 0; r < runs; r++) {
    const pts = {}, nrr = {}, wins = {};
    for (const x of st) { pts[x.id] = x.pts; nrr[x.id] = x.nrr; wins[x.id] = 0; }
    for (const f of rest) {
      if (rnd() < NR) { pts[f.home]++; pts[f.away]++; continue; }
      const pHome = 1 / (1 + Math.exp(-(str[f.home] - str[f.away]) / SPREAD));
      const [w, l] = rnd() < pHome ? [f.home, f.away] : [f.away, f.home];
      pts[w] += 2; wins[w]++; nrr[w] += 0.05; nrr[l] -= 0.05;
    }
    const order = ids.slice().sort((a, b) => pts[b] - pts[a] || (nrr[b] + (rnd() - 0.5) * 0.3) - (nrr[a] + (rnd() - 0.5) * 0.3));
    const top = new Set(order.slice(0, TOP));
    for (const id of ids) { const q = top.has(id); if (q) made[id]++; (byWins[id][wins[id]] ||= [0, 0])[q ? 0 : 1]++; }
  }

  const odds = {}, status = {}, need = {};
  for (const id of ids) {
    status[id] = rest.length ? settled(st, left, id) : (ids.indexOf(id) < TOP ? 'in' : 'out');
    odds[id] = status[id] === 'in' ? 1 : status[id] === 'out' ? 0 : made[id] / runs;
    // fewest wins w such that finishing with w or more wins qualifies 85% of the time
    need[id] = null; const b = byWins[id];
    for (let w = 0; w <= (left[id] || 0); w++) {
      let q = 0, n = 0; for (let k = w; k < b.length; k++) if (b[k]) { q += b[k][0]; n += b[k][0] + b[k][1]; }
      if (n >= 5 && q / n >= 0.85) { need[id] = w; break; }
    }
  }
  const val = { played, left, odds, status, need };
  cache.set(G.s, { key, val });
  return val;
}

// The sentence under the playoff-race card.
export function raceText(G, id = G.user) {
  const st = G.standings(); const i = st.findIndex((r) => r.id === id); const me = st[i];
  const o = playoffOdds(G); const left = o.left[id] || 0; const L = `${left} match${left === 1 ? '' : 'es'} left`;
  const pts = (n) => `${n} point${n === 1 ? '' : 's'}`;
  let head;
  if (i >= TOP) { const gap = st[TOP - 1].pts - me.pts; head = gap > 0 ? `${pts(gap)} off ${TOP}th` : `Level on points with ${TOP}th`; }
  else { const gap = me.pts - st[TOP].pts; head = gap > 0 ? `${pts(gap)} clear of ${TOP + 1}th` : `Level on points with ${TOP + 1}th`; }
  let tip;
  if (o.status[id] === 'in') tip = 'Your place in the playoffs is secure.';
  else if (o.status[id] === 'out') tip = "You can no longer reach the top four.";
  else if (o.odds[id] >= 0.95) tip = "You're very likely in.";
  else if (o.need[id] != null && o.need[id] > 0) tip = `Win ${o.need[id]} of your last ${left} and you're very likely in.`;
  else if (o.need[id] === 0) tip = "You're very likely in.";
  else tip = 'You need other results to go your way.';
  return { head: `${head} · ${L}`, tip };
}
