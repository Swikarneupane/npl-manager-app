// ===== Composure =====
// A 0-100 value per batter and per fielding side, for one match. It starts from temperament and
// the big-game trait and moves ball by ball:
//   falls: a string of dots, a required rate above 12, a dropped catch, a hostile crowd, a first
//          meeting with an elite bowler; playoffs and the final roughly double every fall;
//   rises: boundaries, wickets for the fielding side, the captain's word, the team talk and the
//          mental-skills coach.
// Low composure raises the chance of a false shot (a wicket) and, for the fielding side, of wides
// and dropped catches. State lives on the match (m.cz) so a saved match resumes with it.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export const STAGE_PRESSURE = { L: 1, Q1: 1.9, EL: 1.9, Q2: 2, F: 2.2 };
export const ELITE_BOWL = 76;

export function compBase(p) {
  const t = p.traits || {}; const temper = p.temper != null ? p.temper : 65; const big = t.big != null ? t.big : 50;
  return clamp(Math.round(28 + temper * 0.5 + (big - 50) * 0.25), 30, 85);
}
// Pressure multiplier for falls in this match; the big-game trait softens it for one player.
export function pressure(m, p) { const k = STAGE_PRESSURE[m.opt && m.opt.stage] || 1; const big = p && p.traits ? p.traits.big : 50; return k > 1 ? k - (big - 50) / 100 : k; }

export function czInit(m) { if (!m.cz) m.cz = { b: {}, f: {}, d: {}, met: {}, said: {} }; return m.cz; }
function boostFor(m, tid) { const o = m.opt || {}; let b = 0; if (o.talk && o.talk[tid]) b += o.talk[tid]; if (m.G && m.G.staffLevel) b += 1.5 * m.G.staffLevel(tid, 'mental'); return b; }
export function batComp(m, inn, pid) {
  const cz = czInit(m); if (cz.b[pid] == null) { const p = m.G.players[pid]; cz.b[pid] = clamp(compBase(p) + boostFor(m, inn.bat) + ((m.opt.mood && m.opt.mood[pid]) || 0), 5, 100); }
  return cz.b[pid];
}
export function fieldComp(m, tid) { const cz = czInit(m); if (cz.f[tid] == null) cz.f[tid] = clamp(62 + boostFor(m, tid), 5, 100); return cz.f[tid]; }

// Multipliers the engine applies to the ball's probabilities.
export function falseShot(c) { return c < 40 ? 1 + (40 - c) / 50 : c > 75 ? 0.92 : 1; }
export function wideFactor(cf) { return cf < 40 ? 1 + (40 - cf) / 30 : 1; }
export function dropFactor(cf) { return cf < 40 ? 1 + (40 - cf) / 40 : 1; }

// Update after a ball. ev: 'dot' | '1' | '2' | '3' | '4' | '6' | 'wd' | 'nb' | 'wkt' | 'drop'.
// Returns lines for the commentary when someone crosses a threshold.
export function czBall(m, inn, ev, info = {}) {
  const cz = czInit(m); const G = m.G; const out = [];
  const pid = info.bat || inn.striker; const bat = G.players[pid]; if (!bat) return out;
  const c0 = batComp(m, inn, pid), f0 = fieldComp(m, inn.bowl);
  const kb = pressure(m, bat), kf = pressure(m, null);
  let db = 0, df = 0;
  if (ev === 'dot') { cz.d[pid] = (cz.d[pid] || 0) + 1; if (cz.d[pid] >= 3) db -= 2 * kb; df += 0.4; }
  else if (ev === '4' || ev === '6') { cz.d[pid] = 0; db += ev === '6' ? 5 : 4; df -= 1.5 * kf; }
  else if (ev === '1' || ev === '2' || ev === '3') { cz.d[pid] = 0; db += 0.5; }
  else if (ev === 'wd' || ev === 'nb') { df -= 1; }
  else if (ev === 'drop') { df -= 8 * kf; db += 2; }
  else if (ev === 'wkt') { df += 5; }
  if (inn.target) { const left = m.maxBalls - inn.balls; const rrr = left > 0 ? (inn.target - inn.runs) / (left / 6) : 0; if (rrr > 12 && ev !== '4' && ev !== '6') db -= 1 * kb; }
  // first meeting with an elite bowler, once a match
  const bowler = G.players[inn.cur]; const key = `${pid}|${inn.cur}`;
  if (bowler && bowler.bowl >= ELITE_BOWL && !cz.met[key]) { cz.met[key] = 1; const mu = G.s && G.s.mu && G.s.mu.p && G.s.mu.p[key]; if (!mu) db -= 6 * kb; }
  if (ev !== 'wkt') cz.b[pid] = clamp(c0 + db, 5, 100);
  cz.f[inn.bowl] = clamp(f0 + df, 5, 100);
  // threshold lines, at most once each way per player per innings
  const said = cz.said; const c1 = cz.b[pid], f1 = cz.f[inn.bowl]; const surname = bat.name.split(' ').slice(-1)[0];
  const tag = (k) => { const id = `${k}|${m.inns.length}`; if (said[id]) return false; said[id] = 1; return true; };
  if (ev !== 'wkt' && c0 >= 35 && c1 < 35 && tag(`lo${pid}`)) out.push({ t: `${surname} looks rattled. The dots are getting to him.`, c: 'comp', who: pid, v: Math.round(c1) });
  if (ev !== 'wkt' && c0 < 75 && c1 >= 75 && tag(`hi${pid}`)) out.push({ t: `${surname} is in complete control now.`, c: 'comp', who: pid, v: Math.round(c1) });
  if (f0 >= 35 && f1 < 35 && tag(`lof${inn.bowl}`)) out.push({ t: `Heads are dropping in the field for ${G.teams[inn.bowl].name.split(' ')[0]}.`, c: 'comp', v: Math.round(f1) });
  return out;
}
// End of an over: the fielding side settles a little; a hostile crowd works on the visitors.
export function czOver(m, inn) {
  const cz = czInit(m); const f = fieldComp(m, inn.bowl); const base = 62;
  cz.f[inn.bowl] = clamp(f + (f < base ? 1.5 : 0) + (m.G.staffLevel ? 0.3 * m.G.staffLevel(inn.bowl, 'mental') : 0), 5, 100);
  const host = m.opt && m.opt.hostile; if (host) { if (host === inn.bowl) cz.f[inn.bowl] -= 1; for (const id of [inn.striker, inn.non]) if (id && cz.b[id] != null && host === inn.bat) cz.b[id] = clamp(cz.b[id] - 1, 5, 100); }
}
// The captain's word (a dugout message or a key-moment choice): a lift for the side named.
export function captainWord(m, tid, amount = 10) {
  const cz = czInit(m); const inn = m.inns[m.inns.length - 1]; if (!inn) return;
  if (inn.bat === tid) { for (const id of [inn.striker, inn.non]) if (id) cz.b[id] = clamp(batComp(m, inn, id) + amount, 5, 100); }
  else cz.f[tid] = clamp(fieldComp(m, tid) + amount, 5, 100);
}
export const compLabel = (c) => (c < 35 ? 'Rattled' : c < 50 ? 'Nervy' : c < 70 ? 'Settled' : 'In control');
