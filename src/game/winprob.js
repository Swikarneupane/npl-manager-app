// ===== Win probability =====
// A model from score, wickets, balls left, target and venue par. Resources follow the simplified
// DLS table the engine uses for rain: the share of a 20-over innings a side still has to use.
export function dlsG(u, w) { const f = Math.pow(Math.max(0, 1 - w / 10), 0.9); return f * (1 - Math.exp(-u / (70 * f + 5))); }
export function dlsRes(ballsLeft, wkts) { if (wkts >= 10) return 0; return 100 * dlsG(ballsLeft, wkts) / dlsG(120, 0); }

export const DEFAULT_PAR = 162; // first-innings par at Kirtipur before a season has its own average
const logistic = (x) => 1 / (1 + Math.exp(-x));

// Probability that the side batting now wins.
// st: { runs, wkts, balls, maxBalls, target (null in the first innings), par, edge }
// edge: logit shift for the batting side's strength (from the team ratings); it fades as the
// match goes on, because the score itself carries more of the information.
export function winProbability(st) {
  const { runs, wkts, balls, maxBalls = 120, target = null, par = DEFAULT_PAR, edge = 0 } = st;
  const scale = maxBalls / 120; const parM = par * scale; // a rain-reduced match has a lower par
  const R = dlsRes(maxBalls - balls, wkts) / 100 / Math.max(0.05, dlsRes(maxBalls, 0) / 100); // share left of this match
  const fade = edge * Math.min(1, R + 0.15);
  if (target == null) {
    // first innings: the projected total against par; spread shrinks as resources run out
    const proj = runs + R * parM; const sd = 10 + 22 * R;
    if (wkts >= 10 || balls >= maxBalls) return logistic((runs - parM) / 14 + fade);
    return logistic((proj - parM) / sd + fade);
  }
  const need = target - runs; if (need <= 0) return 1; if (wkts >= 10 || balls >= maxBalls) return 0;
  // the spread of the runs still to come grows with the square root of the balls left; 0.55 turns a
  // standard deviation into the logistic's scale
  const exp = R * parM * 1.02; const sd = 3 + 25 * Math.sqrt(R);
  return logistic((exp - need) / (0.55 * sd) + fade);
}

// Projected first-innings total at the current rate of resources.
export function projectedTotal(st) {
  const { runs, wkts, balls, maxBalls = 120, par = DEFAULT_PAR } = st;
  const R = dlsRes(maxBalls - balls, wkts) / 100 / Math.max(0.05, dlsRes(maxBalls, 0) / 100);
  return Math.round(runs + R * par * (maxBalls / 120));
}

// The venue par for a season: the average complete first-innings total, once there are three.
export function venuePar(s, year) { const P = s && s.par && s.par[year]; return P && P.n >= 3 ? Math.round(P.sum / P.n) : DEFAULT_PAR; }
