// ===== Depth layer: shared state for phase 2 =====
// Decision log, matchups, venue par, workload and injury risk, and player traits. Other phase 2
// modules read these; game.js calls migrate/afterMatch/... on every module in MODULES.
import { R, ri, clamp, isSpin, isPace, ovr } from './engine.js';
import { venuePar } from './winprob.js';
import { REAL_MEETINGS } from './data.js';

// ----- traits -----
// Personality on a 0-100 scale. temper already exists on every player (40-90). Flaws are only
// ever generated for fictional players: real people get no invented personal storylines.
const FLAWS = ['Hot-headed', 'Slow starter', 'Homesick', 'Moody in the nets', 'Careless with fitness', 'Over-confident'];
export function genTraits(p) {
  const t = { big: ri(30, 80), pro: ri(35, 90), amb: ri(30, 90), loyal: ri(30, 90), lead: ri(20, 85), flair: ri(25, 90) };
  if (p.age >= 31) t.lead = clamp(t.lead + 10, 0, 100);
  if (p.real === false && R() < 0.35) t.flaw = FLAWS[ri(0, FLAWS.length - 1)];
  return t;
}

export function migrate(G) {
  const s = G.s;
  s.h2h ??= Object.fromEntries(REAL_MEETINGS.map((x) => [pairKey(x.a, x.b), { y: x.y, stage: x.stage, n: null, winner: x.winner, real: true }]));
  s.log ??= []; s.mu ??= { h: {}, b: {}, p: {} }; s.par ??= {}; s.rel ??= {}; s.promiseLog ??= [];
  s.pillars ??= { results: 60, finances: 60, fans: 60, youth: 50, conduct: 60 };
  s.settings && (s.settings.assistant ??= false);
  if (s.players) for (const p of Object.values(s.players)) { p.traits ??= genTraits(p); p.wl ??= []; p.happy ??= Math.round(p.morale != null ? p.morale : 70); }
  if (s.teams && s.user && s.teams[s.user]) s.teams[s.user].capTrust ??= 60;
}

// ----- lifecycle -----
export function afterMatch(G, m, f) {
  const s = G.s, y = G.year;
  if (!m.result.nr) s.h2h[pairKey(f.home, f.away)] = { y, stage: f.stage, n: f.n, winner: m.result.winner || null };
  // venue par from complete first innings
  const i1 = m.inns[0];
  if (i1 && m.maxBalls === 120 && !m.result.nr && (i1.balls >= 120 || i1.wkts >= 10)) { const P = (s.par[y] ??= { sum: 0, n: 0 }); P.sum += i1.runs; P.n++; }
  // workload: overs bowled by date, kept for the last eight appearances
  const dt = G.dayOf ? G.dayOf(f) : null;
  for (const inn of m.inns) for (const id in inn.bw) { const p = G.P(id); if (!p || !p.wl) continue; const o = inn.bw[id].balls / 6; if (o > 0) { p.wl.push({ n: f.n, y, dt, o: Math.round(o * 10) / 10 }); if (p.wl.length > 8) p.wl.shift(); } }
}
// Pillars drift a third of the way back to 60 each season, so a good or bad year fades instead of
// pinning a pillar at 0 or 100.
export function seasonStart(G) { const P = G.s.pillars; if (P) for (const k in P) P[k] = Math.round((P[k] + (60 - P[k]) / 3) * 10) / 10; }
export function offseason(G) {
  // prune matchup pairs that involve retired players, so the save stays small
  const P = G.s.mu.p; for (const k in P) { const [a, b] = k.split('|'); const pa = G.P(a), pb = G.P(b); if (!pa || !pb || pa.retired || pb.retired) delete P[k]; }
  for (const p of Object.values(G.players)) p.wl = [];
}

// ----- decision log -----
// Every meaningful choice, with when it happened and what came of it. Season review and the manager
// career read it. kind: selection | talk | press | key | story | contract | board | event | plan | other
export function logDecision(G, kind, title, pick, outcome, extra) {
  const f = G.s.fixtures && G.s.fixtures.filter((x) => x.res).pop();
  const e = { id: `d${Date.now()}${ri(0, 9999)}`, y: G.year, d: G.dayLabel ? G.dayLabel() : '', fix: extra && extra.fix != null ? extra.fix : f ? f.n : null, phase: G.s.phase, kind, title, pick, outcome: outcome || '', ...(extra || {}) };
  G.s.log.push(e); if (G.s.log.length > 600) G.s.log.splice(0, G.s.log.length - 600);
  return e;
}
export const decisions = (G, y = G.year, kind) => G.s.log.filter((e) => e.y === y && (!kind || e.kind === kind));

// ----- matchups -----
// s.mu.h['L|SLA'] = [runs, balls, outs] for left-handers against left-arm orthodox, league-wide;
// s.mu.b[pid][grp] for one batter against a bowling group; s.mu.p['bat|bowl'] for one pair.
export const BOWL_GROUPS = { pace: 'Pace', OB: 'Off-spin', wrist: 'Wrist-spin', SLA: 'Left-arm spin' };
export const bowlGroup = (type) => (isPace(type) ? 'pace' : type === 'OB' ? 'OB' : type === 'SLA' ? 'SLA' : isSpin(type) ? 'wrist' : 'pace');
const add = (a, runs, out) => { a[0] += runs; a[1]++; if (out) a[2]++; };
export function recordMatchup(G, bat, bowl, runs, out) {
  if (!bat || !bowl || bat.nat === 'OPP' || bowl.nat === 'OPP' || !G.s.mu) return;
  const g = bowlGroup(bowl.type); const M = G.s.mu;
  add(M.h[`${bat.hand}|${g}`] ??= [0, 0, 0], runs, out);
  add((M.b[bat.id] ??= {})[g] ??= [0, 0, 0], runs, out);
  add(M.p[`${bat.id}|${bowl.id}`] ??= [0, 0, 0], runs, out);
}
// Runs an over and balls per dismissal from a [runs, balls, outs] triple.
export function muRate(a) { if (!a || !a[1]) return null; return { rpo: (a[0] / a[1]) * 6, bpd: a[2] ? a[1] / a[2] : null, balls: a[1], outs: a[2], runs: a[0] }; }
export const muPair = (G, batId, bowlId) => muRate(G.s.mu.p[`${batId}|${bowlId}`]);
export const muBatVs = (G, batId, grp) => muRate((G.s.mu.b[batId] || {})[grp]);
export const muHand = (G, hand, grp) => muRate(G.s.mu.h[`${hand}|${grp}`]);
// A batter's weakest bowling group with enough balls to mean something (for reports and weaknesses).
export function weakestVs(G, batId, minBalls = 18) {
  const b = G.s.mu.b[batId] || {}; let best = null;
  for (const g in b) { const r = muRate(b[g]); if (!r || r.balls < minBalls) continue; const score = r.rpo - (r.outs / r.balls) * 60; if (!best || score < best.score) best = { g, label: BOWL_GROUPS[g], ...r, score }; }
  return best;
}

// ----- workload and injury risk -----
const DAY = 86400000;
// Overs in the last 7 days and rest days since the last match, measured from the in-game today.
export function workload(G, p) {
  const now = G.todayTime ? G.todayTime() : null; const wl = (p.wl || []).filter((x) => x.y === G.year);
  const last7 = now != null ? wl.filter((x) => x.dt != null && now - x.dt <= 7 * DAY).reduce((a, x) => a + x.o, 0) : wl.slice(-2).reduce((a, x) => a + x.o, 0);
  const lastDt = wl.length ? wl[wl.length - 1].dt : null; const rest = now != null && lastDt != null ? Math.max(0, Math.round((now - lastDt) / DAY)) : 7;
  return { overs7: Math.round(last7 * 10) / 10, rest };
}
// Injury risk in percent for the next match, from workload, rest, age, training load and fitness.
export function injuryRisk(G, p) {
  const { overs7, rest } = workload(G, p);
  let r = 2 + Math.max(0, overs7 - 8) * 1.2 + (rest < 2 ? 3 : 0) + Math.max(0, p.age - 32) * 0.6 + (p.load || 0) * 0.08 + Math.max(0, 75 - p.fit) * 0.15;
  if (isPace(p.type) && p.bowl >= 40) r += 1;
  const physio = G.staffLevel ? G.staffLevel(p.team || G.user, 'physio') : 0; r *= 1 - 0.06 * physio;
  return Math.round(clamp(r, 1, 40) * 10) / 10;
}
export const riskLabel = (r) => (r >= 10 ? 'High' : r >= 6 ? 'Medium' : 'Low');

// ----- small shared helpers -----
export const par = (G) => venuePar(G.s, G.year);
export const rating = ovr;

// ----- people: happiness, captain's trust -----
// p.happy 0-100 with p.happyWhy (the latest reason). The dressing-room module spreads leaders' moods
// and handles groups; anyone may nudge one player here.
export function adjustHappy(G, pid, delta, why) {
  const p = G.P(pid); if (!p || !delta) return;
  p.happy = clamp(Math.round((p.happy ?? 70) + delta), 0, 100); if (why) p.happyWhy = why;
  // a player waiting on a start or debut promise: his morale answers to that promise alone
  if (G.s.promises && G.s.promises.some((pr) => pr.pid === pid && (pr.kind === 'start' || pr.kind === 'debut'))) return;
  p.morale = clamp((p.morale ?? 70) + delta * 0.5, 0, 100);
}
// Captain's trust in the manager, 0-100, on the user's team (game plans and pushback move it).
export function nudgeTrust(G, delta, why) { const t = G.teams[G.user]; t.capTrust = clamp(Math.round((t.capTrust ?? 60) + delta), 0, 100); if (why) t.capTrustWhy = why; return t.capTrust; }

// ----- board pillars -----
// Five pillars feed board confidence: results, finances, fans (and community), youth, conduct (and media).
export const PILLARS = [['results', 'Results'], ['finances', 'Finances'], ['fans', 'Fans and community'], ['youth', 'Youth development'], ['conduct', 'Conduct and media']];
export function nudgePillar(G, k, delta) { const P = G.s.pillars; if (!P || P[k] == null || !delta) return; P[k] = clamp(Math.round((P[k] + delta) * 10) / 10, 0, 100); }

// ----- relationships with other clubs -----
// s.rel[tid] = { respect: the rival manager's respect for you, heat: rivalry heat, why: [reasons] }.
export function relOf(G, tid) { return (G.s.rel[tid] ??= { respect: 50, heat: 10, why: [] }); }
export function nudgeRel(G, tid, { respect = 0, heat = 0, why } = {}) {
  if (!tid || tid === G.user || !G.teams[tid]) return; const r = relOf(G, tid);
  r.respect = clamp(r.respect + respect, 0, 100); r.heat = clamp(r.heat + heat, 0, 100);
  if (why && heat) { r.why.unshift({ y: G.year, t: why }); r.why.length = Math.min(r.why.length, 6); }
}

// ----- promises -----
// The core game tracks 'start' and 'debut' promises (game.js checkPromises). Other kinds are added
// here and judged by the module that made them (the dressing room judges 'role' over a season).
// s.promiseLog keeps every promise that was kept or broken: { pid, kind, text, y, result }.
export function addPromise(G, pid, kind, text, extra) {
  if (G.s.promises.some((pr) => pr.pid === pid && pr.kind === kind)) return null;
  const pr = { id: `pr${Date.now()}${ri(0, 999)}`, pid, kind, text, y: G.year, made: G.dayLabel ? G.dayLabel() : '', ...(extra || {}) };
  G.s.promises.push(pr); return pr;
}
export function closePromise(G, pr, result, note) {
  G.s.promises = G.s.promises.filter((x) => x !== pr && x.id !== pr.id);
  G.s.promiseLog.push({ pid: pr.pid, kind: pr.kind, text: pr.text || pr.kind, y: G.year, result, note: note || '' });
  if (G.s.promiseLog.length > 80) G.s.promiseLog.shift();
}

// ----- head to head -----
const pairKey = (a, b) => [a, b].sort().join('|');
const STAGE_LABEL = { Q1: 'Qualifier 1', EL: 'Eliminator', Q2: 'Qualifier 2', F: 'final' };
// "last meeting: Lumbini won, 2025 Qualifier 2", or null when the two have not met.
export function lastMeeting(G, a, b) {
  const x = G.s.h2h && G.s.h2h[pairKey(a, b)]; if (!x) return null;
  const who = x.winner ? `${G.teams[x.winner].name.split(' ')[0]} won` : 'no result';
  const when = x.stage === 'L' ? (x.y === G.year ? `match ${x.n}` : `${x.y}, match ${x.n}`) : `${x.y} ${STAGE_LABEL[x.stage]}`;
  return `last meeting: ${who}, ${when}`;
}
