// A player's recent NPL appearances this season, read from the stored scorecards.
// Each entry: { n: fixture number, opp: team id, r: runs or null, b: balls, out: bool, w: wickets or null, rc: runs conceded }.
export function appearances(G, p) {
  const out = [];
  for (const f of G.s.fixtures) {
    if (!f.card) continue; let e = null;
    for (const c of f.card) {
      const b = c.bat.find((x) => x[0] === p.name);
      if (b) { e = e || { n: f.n }; e.r = b[1]; e.b = b[2]; e.out = b[5] !== 'not out'; e.opp = c.t === f.home ? f.away : f.home; }
      const w = c.bowl.find((x) => x[0] === p.name);
      if (w) { e = e || { n: f.n }; e.w = w[3]; e.rc = w[2]; e.balls = w[1]; e.opp = e.opp || c.t; }
    }
    if (e) { e.r ??= null; e.w ??= null; out.push(e); }
  }
  return out;
}
// The last five appearances; `v` is runs plus 20 a wicket, used for small form bars.
export const lastFive = (G, p) => appearances(G, p).slice(-5).map((e) => ({ ...e, v: (e.r || 0) + (e.w || 0) * 20 }));
