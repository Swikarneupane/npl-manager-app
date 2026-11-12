// ===== Phase 2 module: club (between matches) =====
// Training week, dressing room (hierarchy, groups, happiness, role promises, one-to-ones), and
// scouting with the under-19 academy. State lives in G.s.club; per-player fields are p.tdev / p.tgain
// (training development), p.dropN (user matches dropped in a row), p.potLo / p.potHi (scouted
// potential range) and p.academy (the club whose academy holds him; he keeps team: null).
import { R, ri, pick, clamp, ovr, isPace, TYPE_LABEL, getPID } from './engine.js';
import { PROVINCES, NEP_NAMES } from './data.js';
import { applyProgramme, autoAssign } from './training.js';
import { workload, injuryRisk, riskLabel, adjustHappy, addPromise, closePromise, nudgePillar, logDecision, genTraits } from './depth.js';

const DAY = 86400000;
const dkey = (t) => String(t);
const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); };
const userFix = (G, f) => f && (f.home === G.user || f.away === G.user);
const surname = (p) => p.name.split(' ').slice(-1)[0];
const inSeason = (G) => ['preseason', 'league', 'playoffs'].includes(G.s.phase);

// ===================== training =====================
// Each session: load (feeds injury risk), fitness change, sharpness and development points.
export const SESSIONS = {
  Rest: { load: 0, fit: 4, sharp: -1, dev: 0 },
  Recovery: { load: 1, fit: 5, sharp: 0, dev: 0 },
  Analysis: { load: 1, fit: 1, sharp: 1.5, dev: 0.5 },
  Fielding: { load: 2, fit: -1, sharp: 1.5, dev: 1 },
  Nets: { load: 3, fit: -2, sharp: 2.5, dev: 1.5 },
  'Match simulation': { load: 4, fit: -4, sharp: 3.5, dev: 2 },
};
export const SESSION_NAMES = Object.keys(SESSIONS);
export const SESSION_NP = { Rest: 'आराम', Recovery: 'रिकभरी', Analysis: 'विश्लेषण', Fielding: 'फिल्डिङ', Nets: 'नेट', 'Match simulation': 'खेल अभ्यास' };
const HEAVY = ['Fielding', 'Nets', 'Match simulation'];
const DEV_STEP = 40; // development points for +1 rating
const SEASON_GAIN_CAP = 2; // in-season rating gains from training, per player

function userDays(G) { return G.s.fixtures.filter((f) => userFix(G, f)).map((f) => ({ f, t: G.dayOf(f) })).filter((x) => x.t != null); }
// The first day the user can plan: the day after his last match. Before the opener the calendar starts on
// match day: the pre-season camp (core game, fitness 100) covers the run-in.
export function weekStart(G) {
  const C = G.s.club; const ud = userDays(G); const played = ud.filter((x) => x.f.res); const nx = ud.find((x) => !x.f.res);
  if (played.length) return played[played.length - 1].t + DAY;
  if (nx) return nx.t; // the pre-season camp covers the opener; planning starts from it
  return C && C.applied ? C.applied + DAY : null;
}
// Coaches' sessions for a training day, from the team intensity and where the day falls between matches.
export function coachDay(G, t, intensity) {
  const I = intensity || G.teams[G.user].training || 'Normal'; const ud = userDays(G);
  const prev = ud.filter((x) => x.t < t).pop(); const next = ud.find((x) => x.t > t);
  if (!next) return ['Rest', 'Rest'];
  const since = prev ? Math.round((t - prev.t) / DAY) : 9, to = Math.round((next.t - t) / DAY);
  if (since === 1) return I === 'Intense' && to > 1 ? ['Recovery', 'Fielding'] : ['Recovery', 'Analysis'];
  if (to === 1) return I === 'Light' ? ['Analysis', 'Rest'] : I === 'Intense' ? ['Fielding', 'Analysis'] : ['Analysis', 'Fielding'];
  return I === 'Light' ? ['Recovery', 'Nets'] : I === 'Intense' ? ['Nets', 'Match simulation'] : ['Nets', 'Fielding'];
}
export function sessionsFor(G, t) { const P = G.s.club.plan; return (P.days && P.days[dkey(t)]) || coachDay(G, t); }
const dayLoad = (pair) => SESSIONS[pair[0]].load + SESSIONS[pair[1]].load;
export function intensityOf(pairs) { if (!pairs.length) return 'Normal'; const a = pairs.reduce((s, x) => s + dayLoad(x), 0) / pairs.length; return a <= 2.5 ? 'Light' : a <= 4 ? 'Normal' : 'Intense'; }

// The 7-day calendar from the first plannable day: match days carry the fixture, training days their sessions.
export function planDays(G) {
  const start = weekStart(G); if (start == null) return [];
  const ud = userDays(G); const out = []; const now = G.todayTime(); const nowIn = now != null && now >= start && now < start + 7 * DAY;
  for (let i = 0; i < 7; i++) {
    const t = start + i * DAY; const fx = ud.find((x) => x.t === t && !x.f.res);
    const d = new Date(t);
    out.push({ t, key: dkey(t), name: d.toLocaleDateString('en-GB', { weekday: 'short' }), date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), today: nowIn ? t === now : i === 0, match: fx ? fx.f : null,
      sessions: fx ? null : sessionsFor(G, t), custom: !fx && !!(G.s.club.plan.days || {})[dkey(t)] });
  }
  return out;
}
// Training days before the user's next match (from the last applied day, or the plan start).
function daysBefore(G, f) {
  const mt = G.dayOf(f); if (mt == null) return [];
  const C = G.s.club; const ud = userDays(G); const prev = ud.filter((x) => x.t < mt && x.f !== f).pop();
  if (!prev) return []; // the season opener: no training week before it
  let from = Math.max(prev.t + DAY, C.applied != null ? C.applied + DAY : -Infinity, mt - 7 * DAY);
  const out = []; for (let t = from; t < mt; t += DAY) if (!ud.some((x) => x.t === t)) out.push(t);
  return out;
}
// How the sessions change one player: fitness, sharpness points, development points and load.
function effectOn(p, pairs, spared, lastDay) {
  let fit = 0, sharp = 0, dev = 0, load = 0;
  pairs.forEach((pair, i) => pair.forEach((s0) => {
    const s = spared && HEAVY.includes(s0) ? 'Recovery' : s0; const S = SESSIONS[s];
    const w = i === lastDay && S.fit < 0 ? 1.5 : 1; fit += S.fit * w; sharp += S.sharp; dev += S.dev; load += S.load;
  }));
  if (p.inj) { fit = Math.max(fit, 0); dev = 0; sharp = Math.min(sharp, 0); }
  return { fit, sharp, dev, load };
}
const youth = (p) => (p.age <= 21 ? 1.5 : p.age <= 25 ? 1 : p.age <= 29 ? 0.5 : 0.2);
const sharpOf = (pts) => clamp(Math.round(50 + pts * 3), 20, 98);
function likelyXI(G) { const t = G.teams[G.user]; const xi = t.xi && t.xi.length === 11 ? t.xi.filter((id) => t.squad.includes(id)) : G.autoXI(G.user); return xi.map((id) => G.P(id)); }

// Live projection for the next match. pairsOverride: [[am, pm], ...] for the days before it (tests and the screen).
export function projectWeek(G, pairsOverride) {
  const f = G.userNext(); const t = G.teams[G.user]; const C = G.s.club;
  const days = f ? daysBefore(G, f) : [];
  const pre = pairsOverride || days.map((d) => sessionsFor(G, d));
  const week = pairsOverride || planDays(G).filter((d) => d.sessions).map((d) => d.sessions);
  const xi = likelyXI(G).filter(Boolean);
  let fresh = 0; for (const p of xi) { const e = effectOn(p, pre, C.spare[p.id], pre.length - 1); fresh += clamp(p.fit + e.fit, 40, 100); }
  fresh = xi.length ? Math.round(fresh / xi.length) : 100;
  const sp = effectOn({}, pre, false, -1); const wk = effectOn({}, week, false, -1);
  const sharp = sharpOf(sp.sharp); const devPts = Math.round(wk.dev * 10) / 10; const dev = clamp(Math.round(wk.dev * 7), 0, 100);
  const devLabel = dev >= 60 ? 'Good' : dev >= 35 ? 'Steady' : 'Slow';
  const lastLoad = pre.length ? dayLoad(pre[pre.length - 1]) : 0;
  const advice = !f ? 'No match ahead: rest and recovery until the next fixture.'
    : fresh < 70 ? (lastLoad >= 5 ? 'Heavy day before the match: expect tired legs. Move nets earlier or add recovery.' : 'The players are tired: add rest or recovery before the match.')
    : sharp < 55 ? 'Very light plan: players stay fresh but lose sharpness and grow slowly.'
    : wk.load >= 28 ? 'Hard week: good for growth, but knocks in training become more likely.'
    : 'Good balance: fresh for the match and sharp enough.';
  return { fresh, sharp, dev, devPts, devLabel, advice, load: wk.load, preLoad: sp.load, intensity: intensityOf(week.length ? week : pre), next: f, days: pre.length, team: t.name };
}

// Rating growth from accumulated training points, capped by potential and (in season) by SEASON_GAIN_CAP.
export function growFromTraining(G, p, offseason) {
  let gained = 0;
  if (offseason) { const n = Math.min(1, Math.floor((p.tdev || 0) / (DEV_STEP / 2))); if (n > 0 && ovr(p) < p.pot) { bump(p); gained++; } p.tdev = 0; p.tgain = 0; return gained; }
  while ((p.tdev || 0) >= DEV_STEP) {
    if (ovr(p) >= p.pot) { p.tdev = DEV_STEP; break; }
    if ((p.tgain || 0) >= SEASON_GAIN_CAP) break;
    bump(p); p.tdev -= DEV_STEP; p.tgain = (p.tgain || 0) + 1; gained++;
  }
  return gained;
}
function bump(p) {
  const bat = p.role === 'BAT' || p.role === 'WK' || (p.role === 'AR' && (p.pbias ? p.pbias === 'bat' : (p.focus === 'Batting' || (p.focus !== 'Bowling' && p.bat <= p.bowl))));
  if (bat) p.bat = clamp(p.bat + 1, 10, 96); else p.bowl = clamp(p.bowl + 1, 10, 96);
}

// Apply the training days before the user's match: fitness, form, development, load and knocks.
function applyTraining(G, f) {
  const C = G.s.club; const t = G.teams[G.user];
  if (G.s.settings.assistant) { C.plan.days = {}; C.plan.by = 'coaches'; autoAssign(G); }
  const days = daysBefore(G, f); if (!days.length) { C.applied = G.dayOf(f); return null; }
  const pairs = days.map((d) => sessionsFor(G, d));
  t.training = intensityOf(pairs); // game.js applies the team intensity in the match and the off-season
  const coachL = Math.max(G.staffLevel(G.user, 'bat'), G.staffLevel(G.user, 'bowl'));
  const knocks = [], grew = [];
  const sp = effectOn({}, pairs, false, -1); const sharp = sharpOf(sp.sharp);
  for (const id of t.squad) {
    const p = G.P(id); if (!p || p.retired) continue;
    const e = effectOn(p, pairs, C.spare[id], pairs.length - 1);
    p.fit = clamp(Math.round(p.fit + e.fit), 40, 100);
    if (!p.inj) p.form = clamp(p.form + (sharpOf(e.sharp) - 55) / 30, -10, 10);
    const mood = 0.7 + (p.happy ?? 70) / 250; // unhappy players get less out of training
    const pd = applyProgramme(G, p, mood); // individual programme: form, fitness, injury and a few dev points
    p.tdev = Math.round(((p.tdev || 0) + e.dev * youth(p) * (1 + 0.1 * coachL) * mood + pd) * 10) / 10;
    if (growFromTraining(G, p, false)) grew.push(p);
    p.load = e.load; // training load over the days before the match (at most 7); feeds injuryRisk
    if (!p.inj && G.available(p)) {
      const chance = (injuryRisk(G, p) / 100) * Math.max(0, (e.load - 10) / 10) * 0.15;
      if (R() < chance) { p.inj = G.injuryLength(G.user, ri(1, 2)); knocks.push(p); }
    }
  }
  for (const p of knocks) G.news(`${p.name} picked up a knock in training and will miss ${p.inj} match${p.inj > 1 ? 'es' : ''}.`, 'injury', { ne: `${p.name} प्रशिक्षणमा घाइते, ${p.inj} खेल बाहिर` });
  for (const p of grew) G.news(`Training is paying off: ${p.name} has improved to ${ovr(p)}.`, 'training');
  C.last = { n: f.n, y: G.year, by: C.plan.by, sessions: days.map((d, i) => [d, ...pairs[i]]), sharp, intensity: t.training, knocks: knocks.map((p) => p.id), grew: grew.map((p) => p.id) };
  C.applied = G.dayOf(f);
  for (const k of Object.keys(C.plan.days || {})) if (+k <= C.applied) delete C.plan.days[k];
  C.plan.ok = null;
  return C.last;
}
// Set one session on a training day (the user's plan), keeping the team intensity in step.
export function setSession(G, t, slot, name) {
  const C = G.s.club; const cur = sessionsFor(G, t).slice(); cur[slot] = name;
  (C.plan.days ??= {})[dkey(t)] = cur; C.plan.by = 'you'; C.plan.ok = null;
  const pairs = planDays(G).filter((d) => d.sessions).map((d) => d.sessions); G.teams[G.user].training = intensityOf(pairs);
}
export function coachesPlan(G, intensity) { const C = G.s.club; C.plan.days = {}; C.plan.by = 'coaches'; if (intensity) G.teams[G.user].training = intensity; }
export function confirmWeek(G) {
  const C = G.s.club; const f = G.userNext(); const pr = projectWeek(G); C.plan.ok = f ? f.n : null;
  logDecision(G, 'plan', 'Training week', `${C.plan.by === 'you' ? 'Own plan' : "Coaches' plan"} · ${pr.intensity}`, `Freshness ${pr.fresh}% · sharpness ${pr.sharp}% · development ${pr.devLabel.toLowerCase()}`);
  return pr;
}
export function toggleSpare(G, pid) { const C = G.s.club; if (C.spare[pid]) delete C.spare[pid]; else C.spare[pid] = true; return !!C.spare[pid]; }
// Bowlers' workload for the table: overs in the last 7 days, rest days, risk.
export function workloadRows(G) {
  return G.teams[G.user].squad.map((id) => G.P(id)).filter((p) => p && p.bowl >= 40 && p.role !== 'BAT' && p.role !== 'WK')
    .map((p) => { const w = workload(G, p); const r = injuryRisk(G, p); return { p, overs: w.overs7, rest: w.rest, risk: r, label: riskLabel(r), spare: !!G.s.club.spare[p.id] }; })
    .sort((a, b) => b.risk - a.risk || b.overs - a.overs);
}

// ===================== dressing room =====================
export const ROLE_SHARE = { Rotation: 0.3, Regular: 0.6, 'Key player': 0.85 };
function tenure(G, p, tid) {
  const ys = new Set(); for (const h of p.hist || []) if (h.team === tid) ys.add(h.year);
  for (const y in p.stats || {}) if (p.stats[y].team === tid && p.stats[y].m > 0) ys.add(+y);
  return ys;
}
export function isNewcomer(G, p) {
  const ys = tenure(G, p, G.user); const first = Math.min(...ys, G.year);
  const debutant = !Object.values(p.stats || {}).some((x) => x.m > 0) && p.age <= 23;
  return (first === G.year && G.year > (G.s.club.startYear ?? 2026)) || debutant;
}
const standing = (G, p, cap) => (p.traits ? p.traits.lead : 50) * 0.45 + Math.min(p.age, 36) * 0.8 + tenure(G, p, G.user).size * 5 + ovr(p) * 0.25 + (cap ? 40 : 0);
// Team leaders, influential players, others and newcomers.
export function hierarchy(G) {
  const t = G.teams[G.user]; const sq = t.squad.map((id) => G.P(id)).filter(Boolean);
  const newcomers = sq.filter((p) => p.id !== t.captainId && isNewcomer(G, p));
  const rest = sq.filter((p) => !newcomers.includes(p)).map((p) => ({ p, s: standing(G, p, p.id === t.captainId) })).sort((a, b) => b.s - a.s);
  const leaders = rest.filter((x, i) => x.p.id === t.captainId || (i < 3 && (x.p.traits?.lead ?? 50) >= 55 && x.p.age >= 26)).slice(0, 3).map((x) => x.p);
  const left = rest.filter((x) => !leaders.includes(x.p));
  const influential = left.slice(0, 3).map((x) => x.p);
  return { leaders, influential, others: left.slice(3).map((x) => x.p), newcomers };
}
// Social groups: senior core, overseas group, young guns. Each player belongs to one.
export function groups(G) {
  const t = G.teams[G.user]; const sq = t.squad.map((id) => G.P(id)).filter(Boolean);
  const os = sq.filter((p) => p.nat !== 'NEP');
  const senior = sq.filter((p) => p.nat === 'NEP' && (p.age >= 27 || (p.age >= 25 && tenure(G, p, G.user).size >= 2)));
  const young = sq.filter((p) => p.nat === 'NEP' && !senior.includes(p));
  const H = hierarchy(G); const lead = H.leaders[0];
  const mk = (key, name, list) => {
    const avg = list.length ? Math.round(list.reduce((a, p) => a + (p.happy ?? 70), 0) / list.length) : 0;
    let note = avg >= 70 ? 'close' : avg >= 55 ? 'settled' : 'uneasy';
    if (key === 'senior') { const ys = list.map((p) => Math.min(...tenure(G, p, G.user), G.year)); const since = ys.length ? Math.min(...ys) : G.year; note = `Together since ${since} · ${note}`; }
    if (key === 'os') { const b = list.filter((p) => p.age >= 29).sort((a, b2) => (b2.traits?.lead ?? 0) - (a.traits?.lead ?? 0))[0]; note = b ? `${b.name} bridges them to the locals · ${note}` : note; }
    if (key === 'young') { note = lead && !list.includes(lead) ? `Look up to ${lead.name} · ${note}` : note; }
    return { key, name, list, avg, note };
  };
  return [mk('senior', 'Senior core', senior), mk('os', 'Overseas group', os), mk('young', 'Young guns', young)].filter((g) => g.list.length);
}
export const groupOf = (G, pid) => groups(G).find((g) => g.list.some((p) => p.id === pid));
// Players drifting away: unhappy, or dropped three in a row. who may follow: the next most unsettled in his group.
export function drifting(G) {
  const out = []; for (const g of groups(G)) for (const p of g.list) if ((p.happy ?? 70) < 45 || (p.dropN || 0) >= 3) {
    const follow = g.list.filter((q) => q !== p && (q.happy ?? 70) < 65).sort((a, b) => (a.happy ?? 70) - (b.happy ?? 70))[0];
    out.push({ p, group: g.name, follow, why: (p.dropN || 0) >= 2 ? `since being dropped for ${p.dropN} matches` : (p.happyWhy || 'unsettled').toLowerCase() });
  }
  return out;
}
export function roomMood(G) {
  const sq = G.teams[G.user].squad.map((id) => G.P(id)).filter(Boolean);
  const avg = sq.length ? sq.reduce((a, p) => a + (p.happy ?? 70), 0) / sq.length : 70;
  const gs = groups(G); const spread = gs.length > 1 ? Math.max(...gs.map((g) => g.avg)) - Math.min(...gs.map((g) => g.avg)) : 0;
  const unity = clamp(Math.round(avg - spread * 0.6), 0, 100); const unhappy = sq.filter((p) => (p.happy ?? 70) < 45).length;
  const label = avg >= 75 ? 'confident' : avg >= 62 ? 'settled' : avg >= 50 ? 'restless' : 'low';
  return { avg: Math.round(avg), unity, unhappy, label };
}
// A role promise's progress: matches available, matches played, the share it needs, and its status.
export function promiseStatus(G, pr) {
  if (pr.kind !== 'role') return { status: 'open', text: 'Open' };
  const need = ROLE_SHARE[pr.role] || 0.6; const av = pr.av || 0, pl = pr.pl || 0; const share = av ? pl / av : 1;
  const risk = av >= 2 && share < need - 0.05;
  return { status: risk ? 'risk' : 'open', text: risk ? 'At risk' : 'Open', av, pl, need, share };
}
export function promiseList(G) {
  const live = G.s.promises.map((pr) => ({ pr, p: G.P(pr.pid), ...promiseStatus(G, pr) })).filter((x) => x.p);
  const done = (G.s.promiseLog || []).filter((e) => e.y >= G.year - 1).slice(-8).reverse().map((e) => ({ log: e, p: G.P(e.pid), status: e.result, text: e.result === 'kept' ? 'Kept' : 'Broken' })).filter((x) => x.p);
  return live.sort((a, b) => (a.status === 'risk' ? -1 : 0) - (b.status === 'risk' ? -1 : 0)).concat(done);
}
const promiseText = (pr, p) => pr.text || (pr.kind === 'start' ? `Start ${p.name}` : pr.kind === 'debut' ? `Give ${p.name} a debut` : pr.kind === 'role' ? `${pr.role || 'Regular'} role for ${p.name}` : `${pr.kind} for ${p.name}`);
export { promiseText };

// A broken promise: the player takes the main hit, his group a milder one.
export function breakHit(G, pid, already) {
  const p = G.P(pid); if (!p) return;
  if (!already) adjustHappy(G, pid, -20, 'A promise you broke');
  const g = groupOf(G, pid); if (g) for (const q of g.list) if (q.id !== pid) setHappy(q, -5, `Saw a promise to ${surname(p)} broken`);
}
// Leaders' mood spreads: everyone else moves toward the leaders' average (newcomers more so).
export function spreadMood(G) {
  const H = hierarchy(G); if (!H.leaders.length) return 0;
  const L = H.leaders.reduce((a, p) => a + (p.happy ?? 70), 0) / H.leaders.length;
  for (const p of [...H.influential, ...H.others, ...H.newcomers]) { const k = H.newcomers.includes(p) ? 0.1 : 0.06; p.happy = clamp(Math.round(((p.happy ?? 70) + (L - (p.happy ?? 70)) * k) * 10) / 10, 0, 100); }
  return L;
}
// Match-by-match happiness moves p.happy only; morale stays with the core game (and one-to-ones).
function setHappy(p, d, why) { p.happy = clamp(Math.round(((p.happy ?? 70) + d) * 10) / 10, 0, 100); if (why) p.happyWhy = why; }
// After each user match: happiness from playing time, the result, form and promises; role-promise pace.
function dressingAfter(G, m, f) {
  const C = G.s.club; const t = G.teams[G.user]; const xi = m.lineups[G.user] ? m.lineups[G.user].xi : [];
  const avail = C.avail && C.avail.n === f.n ? new Set(C.avail.ids) : null;
  const won = m.result.winner === G.user, lost = m.result.winner && !won;
  for (const pr of G.s.promises) if (pr.kind === 'role' && t.squad.includes(pr.pid)) {
    const p = G.P(pr.pid); const could = xi.includes(pr.pid) || (avail ? avail.has(pr.pid) : G.available(p));
    if (could) { pr.av = (pr.av || 0) + 1; if (xi.includes(pr.pid)) pr.pl = (pr.pl || 0) + 1; }
  }
  for (const id of t.squad) {
    const p = G.P(id); if (!p) continue; const parts = [];
    const inXI = xi.includes(id); const could = inXI || (avail ? avail.has(id) : G.available(p));
    if (inXI) { p.dropN = 0; parts.push([1.5, (p.played || 0) > 3 ? 'Playing every game' : 'In the side']); }
    else if (could) { p.dropN = (p.dropN || 0) + 1; const amb = (p.traits?.amb ?? 50) / 100; parts.push([-(1 + p.dropN * 0.8) * (0.5 + amb) * (ovr(p) >= 65 ? 1.2 : 0.8), `Dropped ${p.dropN} game${p.dropN > 1 ? 's' : ''}`]); }
    if (won) parts.push([inXI ? 1.5 : 0.7, 'Winning']); else if (lost) parts.push([inXI ? -1.5 : -0.7, 'Losing run']);
    if (m.result.mom === id) parts.push([4, 'Player of the match']);
    if (p.form > 5) parts.push([1, 'In form']); else if (p.form < -5) parts.push([-1, 'Out of form']);
    const rp = G.s.promises.find((pr) => pr.pid === id && pr.kind === 'role'); if (rp && promiseStatus(G, rp).status === 'risk') parts.push([-1.5, 'Promise at risk']);
    if (t.captainId === id && p.form > 2) parts.push([0.5, 'Captain, in form']);
    let d = parts.reduce((a, x) => a + x[0], 0) + (65 - (p.happy ?? 70)) * 0.03;
    const main = parts.slice().sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]))[0];
    if (d) setHappy(p, d, main ? main[1] : null);
  }
  spreadMood(G);
  // core promises broken this match ('start' / 'debut', judged by game.js): his group feels it too
  for (const e of G.s.promiseLog || []) if (e.result === 'broken' && !e.g) { e.g = 1; if (e.kind !== 'role') breakHit(G, e.pid, true); }
}
// Season end: judge every role promise on the share of available matches he played.
export function judgeRolePromises(G) {
  const out = [];
  for (const pr of G.s.promises.slice()) {
    if (pr.kind !== 'role') continue; const p = G.P(pr.pid);
    if (!p || p.team !== G.user || p.retired) { G.s.promises = G.s.promises.filter((x) => x !== pr); continue; }
    const st = promiseStatus(G, pr);
    if (st.av < 3) { if (pr.y < G.year || st.av > 0) { G.s.promises = G.s.promises.filter((x) => x !== pr); G.news(`The promise of a ${(pr.role || 'Regular').toLowerCase()} role to ${p.name} lapses: he was available for too few matches to judge.`, 'board'); } continue; }
    if (st.share >= st.need - 0.02) { closePromise(G, pr, 'kept', `${st.pl} of ${st.av} matches`); const e = G.s.promiseLog[G.s.promiseLog.length - 1]; e.g = 1; adjustHappy(G, p.id, 8, 'Promise kept'); G.news(`Promise kept: ${p.name} played ${st.pl} of the ${st.av} matches he was available for.`, 'board'); out.push([pr, 'kept']); }
    else { closePromise(G, pr, 'broken', `${st.pl} of ${st.av} matches`); const e = G.s.promiseLog[G.s.promiseLog.length - 1]; e.g = 1; breakHit(G, p.id); G.news(`Promise broken: ${p.name} played only ${st.pl} of ${st.av} matches after being promised a ${(pr.role || 'Regular').toLowerCase()} role. His happiness −20; his group is unsettled.`, 'board'); out.push([pr, 'broken']); }
  }
  return out;
}

// One-to-ones. Real players talk cricket only (role, form, selection, development) and get no quotes.
export function personalTopic(p) {
  if (p.real !== false) return null;
  if (p.traits && p.traits.flaw === 'Homesick') return 'homesick';
  if (p.age <= 20 && hash(p.id) % 3 === 0) return 'exams';
  return null;
}
export function talkContext(G, p) {
  const rp = G.s.promises.find((pr) => pr.pid === p.id && pr.kind === 'role');
  const bits = [];
  if ((p.dropN || 0) >= 1) bits.push(`Dropped ${p.dropN} game${p.dropN > 1 ? 's' : ''}`);
  if (rp && promiseStatus(G, rp).status === 'risk') bits.push('promise at risk');
  if (p.form < -3) bits.push('out of form'); else if (p.form > 4) bits.push('in form');
  bits.push(`happiness ${Math.round(p.happy ?? 70)}`);
  return bits.join(', ').replace(/^./, (c) => c.toUpperCase());
}
// The opening line: a quote only for fictional players.
export function talkOpener(G, p) {
  if (p.real !== false) return null;
  const topic = personalTopic(p);
  if (topic === 'homesick') return '“I miss home, sir. It is hard to switch off after training.”';
  if (topic === 'exams') return '“My exams are next week. I don’t want to let anyone down.”';
  if ((p.dropN || 0) >= 2) return '“I want to know where I stand.”';
  if (p.form < -3) return '“Nothing is coming off the bat at the moment.”';
  return '“Everything is good, coach. What do you need from me?”';
}
export function talkOptions(G, p) {
  const fict = p.real === false; const rp = G.s.promises.find((pr) => pr.pid === p.id && pr.kind === 'role');
  const amb = p.traits?.amb ?? 50, pro = p.traits?.pro ?? 50; const out = [];
  const dropped = (p.dropN || 0) >= 1;
  if (!rp && dropped) out.push({ k: 'role', label: 'Promise him a regular place', fx: 'Happiness +15 · promise: plays 60% of the matches he is available for', d: 15,
    reply: fict ? '“That’s all I wanted. I won’t let you down.”' : 'He accepts it. The promise is on the board now, and he will expect to play.' });
  else if (!dropped) out.push({ k: 'praise', label: 'Tell him he is doing well', fx: 'Happiness +4', d: 4,
    reply: fict ? '“Thanks, coach. I feel good out there.”' : 'He nods and gets back to work. The message lands.' });
  else out.push({ k: 'remind', label: 'Remind him the promise stands', fx: 'Happiness +3', d: 3, reply: fict ? '“I’ll hold you to it.”' : 'He listens. He will judge you on selection, not words.' });
  out.push({ k: 'explain', label: dropped ? 'Explain the selection honestly' : 'Talk through his role', fx: `Happiness +${pro >= 60 ? 8 : 5}${pro >= 60 ? ' · he respects straight talk' : ''}`, d: pro >= 60 ? 8 : 5,
    reply: fict ? '“Fine. I’ll show you in the nets.”' : dropped ? 'He accepts the reasoning and says he will fight for his place in the nets.' : 'You go through the plans for his role in the side. He is clear on what is needed.' });
  out.push({ k: 'dev', label: 'Agree a development plan', fx: 'Happiness +4 · development points +5 · training focus set', d: 4,
    reply: fict ? '“A plan. Good. Tell me what to work on.”' : 'You agree a focus for his training. The coaches will track his progress.' });
  const topic = personalTopic(p);
  if (topic === 'homesick') out.push({ k: 'home', label: 'Give him two days at home', fx: 'Happiness +12 · fitness +5 · rested for the next match', d: 12, reply: '“Thank you, sir. I’ll come back sharper.”' });
  else if (topic === 'exams') out.push({ k: 'exams', label: 'Let him sit his exams', fx: 'Happiness +10 · rested for the next match', d: 10, reply: '“I’ll be back for the next one, I promise.”' });
  else out.push({ k: 'earn', label: 'Tell him to earn his place', fx: amb >= 60 ? 'Risky · he may take it as a challenge' : 'Risky · could unsettle his group', d: amb >= 60 ? 3 : -6,
    reply: fict ? (amb >= 60 ? '“Watch me.”' : '“Ask the others what they think.” The room goes quiet at dinner.') : amb >= 60 ? 'He takes it as a challenge and trains harder.' : 'He leaves without a word. His group notices.' });
  return out.slice(0, 4);
}
export function canTalk(G, pid) { const C = G.s.club; return C.talked[pid] !== C.talkWin; }
export function holdTalk(G, pid, k) {
  const C = G.s.club; const p = G.P(pid); if (!p || !canTalk(G, pid)) return null;
  const o = talkOptions(G, p).find((x) => x.k === k); if (!o) return null;
  adjustHappy(G, pid, o.d, o.d >= 0 ? 'Had a good one-to-one' : 'A hard one-to-one');
  if (k === 'role') addPromise(G, pid, 'role', `A regular place for ${p.name}`, { role: 'Regular', av: 0, pl: 0 });
  if (k === 'dev') { p.tdev = (p.tdev || 0) + 5; p.focus = p.role === 'BOWL' ? 'Bowling' : p.role === 'AR' ? (p.bat >= p.bowl ? 'Bowling' : 'Batting') : 'Batting'; }
  if (k === 'home') { p.fit = clamp(p.fit + 5, 0, 100); p.rest = true; }
  if (k === 'exams') p.rest = true;
  if (k === 'earn' && o.d < 0) { const g = groupOf(G, pid); if (g) for (const q of g.list) if (q.id !== pid) adjustHappy(G, q.id, -1.5, null); }
  C.talked[pid] = C.talkWin;
  const e = { pid, name: p.name, k, label: o.label, reply: o.reply, y: G.year, d: G.dayLabel() }; C.talks.unshift(e); C.talks.length = Math.min(C.talks.length, 12);
  logDecision(G, 'talk', `One-to-one: ${p.name}`, o.label, o.fx);
  return e;
}

// ===================== scouting and academy =====================
export const GRADE = { A: { k: 0.5, every: 2, cost: 1.5 }, B: { k: 0.35, every: 3, cost: 1 }, C: { k: 0.22, every: 4, cost: 0.6 } };
export const SCOUT_DAYS = 9, ACADEMY_MAX = 12, ACADEMY_FEE = 0.5, SCOUT_BUDGET = 8;
// The starting potential range: wider for players nobody has watched.
export function initRange(p) {
  const o = ovr(p); if (p.scouted || p.pot <= o) { p.potLo = p.potHi = Math.max(o, p.pot); return; }
  const h = hash(p.id); p.potLo = Math.max(o, p.pot - 4 - (h % 7)); p.potHi = Math.min(97, p.pot + 3 + ((h >> 4) % 6));
}
// One report narrows the range toward the true potential; k grows with the scout grade and the head scout.
export function narrow(p, k) {
  if (p.potLo == null) initRange(p);
  const from = [p.potLo, p.potHi];
  if (p.potLo < p.pot) p.potLo = Math.min(p.pot, p.potLo + Math.max(1, Math.round((p.pot - p.potLo) * k)));
  if (p.potHi > p.pot) p.potHi = Math.max(p.pot, p.potHi - Math.max(1, Math.round((p.potHi - p.pot) * k)));
  if (p.potHi - p.potLo <= 1) { p.potLo = p.potHi = p.pot; p.scouted = true; }
  return { from, to: [p.potLo, p.potHi] };
}
export const rateFor = (G, grade) => GRADE[grade].k + 0.05 * G.staffLevel(G.user, 'scout');
const roleLabel = (p) => (p.role === 'WK' ? 'wicketkeeper' : p.role === 'BAT' ? (p.bat >= 55 ? 'top-order bat' : 'batter') : p.role === 'AR' ? 'all-rounder' : isPace(p.type) ? 'fast bowler' : (TYPE_LABEL[p.type] || 'spinner').toLowerCase());
export { roleLabel };
function genScout(G, grade, i) {
  const prov = pick(PROVINCES); const N = NEP_NAMES[prov];
  return { id: `sc${i}${ri(100, 999)}`, name: `${pick(N.f)} ${pick(N.l)}`, grade, prov: null, days: 0, acc: 0 };
}
export const academy = (G) => Object.values(G.players).filter((p) => p.academy === G.user && !p.team && !p.retired);
export function scoutBudget(G) { const C = G.s.club; return { total: SCOUT_BUDGET, spent: C.spent[G.year] || 0, left: Math.round((SCOUT_BUDGET - (C.spent[G.year] || 0)) * 10) / 10 }; }
function spend(G, amt) { const C = G.s.club; C.spent[G.year] = Math.round(((C.spent[G.year] || 0) + amt) * 10) / 10; G.teams[G.user].balance -= amt; }
export function sendScout(G, sid, prov) {
  const C = G.s.club; const s = C.scouts.find((x) => x.id === sid); if (!s) return 'No such scout.';
  if (s.prov) return `${s.name} is already out.`; if (C.scouts.some((x) => x.prov === prov)) return `A scout is already in ${prov}.`;
  const cost = GRADE[s.grade].cost; if (scoutBudget(G).left < cost) return 'The scouting budget for this season is spent.';
  spend(G, cost); s.prov = prov; s.days = SCOUT_DAYS; s.acc = 0;
  logDecision(G, 'other', 'Scouting', `${s.name} (${s.grade}) to ${prov}`, `Rs ${cost} L from the scouting budget`);
  return null;
}
function candidates(G, prov) {
  return Object.values(G.players).filter((p) => p.nat === 'NEP' && !p.team && !p.retired && !p.academy && p.prov === prov && p.age <= 23 && !p.scouted);
}
function fileReport(G, s) {
  const C = G.s.club; let pool = candidates(G, s.prov);
  if (pool.length < 2 && (C.gen[G.year] || 0) < 8) { const p = G.genNepali(ri(16, 18), s.prov); G.players[p.id] = p; fresh(p); G.s.pid = getPID(); C.gen[G.year] = (C.gen[G.year] || 0) + 1; pool.push(p); }
  if (!pool.length) return null;
  const score = (p) => (C.watch.includes(p.id) ? 100 : 0) + (C.reports.some((r) => r.pid === p.id) ? 20 : 0) + (p.potHi ?? p.pot) * 0.5 - p.age + R() * 10;
  const p = pool.sort((a, b) => score(b) - score(a))[0];
  const { from, to } = narrow(p, rateFor(G, s.grade));
  C.seen[s.prov] = (C.seen[s.prov] || 0) + 1;
  const r = { id: `r${ri(10000, 99999)}`, pid: p.id, by: s.name, grade: s.grade, prov: s.prov, y: G.year, d: G.dayLabel(), from, to, st: 'new' };
  C.reports = C.reports.filter((x) => x.pid !== p.id); C.reports.unshift(r); C.reports.length = Math.min(C.reports.length, 24);
  if (to[1] >= 80) G.news(`Scout report: ${p.name}, ${p.age} · ${roleLabel(p)} · ${s.prov}. Potential ${to[0] === to[1] ? to[0] : `${to[0]}–${to[1]}`}.`, 'scout', { ne: `स्काउट रिपोर्ट: ${p.name}` });
  if (G.s.settings.assistant) autoAct(G, r);
  return r;
}
// A scout's remark. Scouts are generated staff; remarks are quoted only for generated players.
export function scoutNote(G, r) {
  const p = G.P(r.pid); if (!p) return '';
  if (p.real !== false) return `Rating ${ovr(p)} · ${TYPE_LABEL[p.type] && p.type ? TYPE_LABEL[p.type] : roleLabel(p)}.`;
  const h = hash(p.id + r.id); const raw = p.pot - ovr(p) >= 18;
  const L = p.role === 'BAT' || p.role === 'WK'
    ? [raw ? '“Lovely hands, picks length early. Needs two seasons.”' : '“Ready-made technique, limited range.”', '“Plays spin well for his age.”', '“Strong on the leg side, works hard.”']
    : isPace(p.type) ? [raw ? '“Raw but quick. Will need two seasons.”' : '“Accurate, not express. Bowls a heavy ball.”', '“Hits the deck hard, good bouncer.”', '“Swings it late when the ball is new.”']
    : [raw ? '“Spins it hard, still learning control.”' : '“Tidy, flat trajectory. A holding bowler.”', '“Clever with his pace through the air.”', '“Bowls a good arm ball.”'];
  return `${L[h % L.length]} Rating ${ovr(p)}.`;
}
export function signToAcademy(G, pid) {
  const C = G.s.club; const p = G.P(pid); if (!p || p.team || p.retired) return 'He is no longer available.';
  if (p.age > 19) return 'Only players aged 19 or under can join the academy.';
  if (academy(G).length >= ACADEMY_MAX) return `The academy is full (${ACADEMY_MAX} places).`;
  if (scoutBudget(G).left < ACADEMY_FEE) return 'The scouting budget for this season is spent.';
  spend(G, ACADEMY_FEE); p.academy = G.user; p.acadSince = G.year; C.watch = C.watch.filter((x) => x !== pid);
  for (const r of C.reports) if (r.pid === pid) r.st = 'academy';
  nudgePillar(G, 'youth', 1); logDecision(G, 'other', 'Academy signing', p.name, `Rs ${ACADEMY_FEE} L`);
  return null;
}
export function keepWatching(G, pid) { const C = G.s.club; if (!C.watch.includes(pid)) C.watch.push(pid); for (const r of C.reports) if (r.pid === pid) r.st = 'watch'; }
export function shortlistReport(G, pid) { if (!G.slEntry(pid)) G.toggleShortlist(pid); for (const r of G.s.club.reports) if (r.pid === pid) r.st = 'short'; }
// The assistant signs a high-ceiling teenager when there is room and budget; it ignores the rest.
function autoAct(G, r) { const p = G.P(r.pid); if (p && p.age <= 19 && r.to[0] >= 70 && !signToAcademy(G, p.id)) return; if (p && r.to[0] >= 72) shortlistReport(G, p.id); else r.st = 'seen'; }
export function promote(G, pid) {
  const p = G.P(pid); const t = G.teams[G.user]; if (!p || p.academy !== G.user) return 'Not in the academy.';
  if (!G.canAdd(G.user, p)) return 'No room in the senior squad.';
  const price = Math.min(G.basePrice(p), 2); if (t.purse < price) return 'Not enough in the domestic purse.';
  p.academy = null; p.acadGrad = G.year; G.signPlayer(p, G.user, price);
  G.s.club.grads.push({ pid, y: G.year }); nudgePillar(G, 'youth', 3);
  G.news(`${p.name} is promoted from the academy to the senior squad.`, 'signing', { ne: `${p.name} एकेडेमीबाट मुख्य टोलीमा` });
  logDecision(G, 'other', 'Academy promotion', p.name, `Senior contract ${price} L`);
  return null;
}
export function releaseAcademy(G, pid) { const p = G.P(pid); if (!p || p.academy !== G.user) return 'Not in the academy.'; p.academy = null; logDecision(G, 'other', 'Academy release', p.name, 'Joins the player pool'); return null; }
// Academy talk: every academy player is generated, so personal topics are allowed.
export function academyTalk(G, pid) {
  const p = G.P(pid); if (!p) return null; const topic = personalTopic(p);
  const C = G.s.club; if (C.talked[pid] === C.talkWin) return null; C.talked[pid] = C.talkWin;
  let reply, d;
  if (p.real !== false) { reply = 'You go through his progress and what the coaches want to see next.'; d = 4; }
  else if (topic === 'homesick') { reply = '“I call home every night. It helps that you asked.”'; d = 10; }
  else if (topic === 'exams') { reply = '“The academy said I can study in the evenings. Thank you.”'; d = 8; }
  else { reply = p.form > 2 ? '“I want a senior game this season.”' : '“I’m still finding my feet here.”'; d = 5; }
  p.happy = clamp((p.happy ?? 70) + d, 0, 100); p.happyWhy = 'Talked with the head coach';
  const e = { pid, name: p.name, k: 'academy', label: 'Academy talk', reply, y: G.year, d: G.dayLabel() }; C.talks.unshift(e); C.talks.length = Math.min(C.talks.length, 12);
  return e;
}
// Fields the depth layer gives every player, for players this module creates after its migrate ran.
function fresh(p) { p.traits ??= genTraits(p); p.wl ??= []; p.happy ??= 70; initRange(p); }
function genAcademy(G, n) {
  const home = G.teams[G.user].province || pick(PROVINCES); const out = [];
  for (let i = 0; i < n; i++) { const p = G.genNepali(ri(15, 17), R() < 0.6 ? home : pick(PROVINCES)); p.academy = G.user; p.acadSince = G.year; fresh(p); G.players[p.id] = p; out.push(p); }
  G.s.pid = getPID();
  return out;
}
// A light academy match: team strength from the academy's ratings, two standout performers who grow.
export function academyMatch(G) {
  const C = G.s.club; const A = academy(G); if (!A.length) return null;
  const opps = Object.keys(G.teams).filter((x) => x !== G.user); const opp = pick(opps);
  const top = A.slice().sort((a, b) => ovr(b) - ovr(a)).slice(0, 11); const str = (top.reduce((a, p) => a + ovr(p), 0) + (11 - top.length) * 42) / 11;
  const us = clamp(Math.round(118 + (str - 46) * 3 + ri(-28, 28)), 70, 220), them = clamp(Math.round(124 + ri(-30, 30)), 70, 220);
  const won = us > them; const bats = A.filter((p) => p.role !== 'BOWL'), bowls = A.filter((p) => p.bowl >= 30);
  const best = (list, f) => list.map((p) => [p, f(p) + R() * 15]).sort((a, b) => b[1] - a[1]).map((x) => x[0])[0];
  const tb = best(bats, (p) => p.bat), tw = best(bowls, (p) => p.bowl);
  const stars = [];
  if (tb) stars.push({ pid: tb.id, txt: `${ri(34, 88)} runs` });
  if (tw && tw !== tb) stars.push({ pid: tw.id, txt: `${ri(2, 4)} wickets` });
  for (const p of A) { p.tdev = (p.tdev || 0) + 4 * youth(p); }
  for (const s of stars) { const p = G.P(s.pid); p.form = clamp((p.form || 0) * 0.6 + 4, -10, 10); p.tdev += 10; }
  for (const p of A) growFromTraining(G, p, false);
  if (won) nudgePillar(G, 'youth', 0.3);
  const res = { y: G.year, d: G.dayLabel(), opp, us, them, won, stars };
  C.acad = res; C.acadN = (C.acadN || 0) + 1;
  G.news(`Academy: under-19s ${won ? 'beat' : 'lost to'} ${G.teams[opp].name} under-19, ${us} v ${them} (in-game). ${stars.map((s) => `${G.P(s.pid).name} ${s.txt}`).join(', ')}.`, 'scout');
  return res;
}
// Days pass with fixture dates, and in blocks through the off-season.
export function passDays(G, n) {
  const C = G.s.club; if (!n || n <= 0) return; n = Math.min(n, 30);
  for (let d = 0; d < n; d++) {
    for (const s of C.scouts) if (s.prov && s.days > 0) {
      s.days--; s.acc++; if (s.acc >= GRADE[s.grade].every) { s.acc = 0; fileReport(G, s); }
      if (s.days <= 0) { const prov = s.prov; s.prov = null; s.acc = 0; G.news(`${s.name} is back from ${prov}.`, 'scout'); }
    }
    C.acadDays = (C.acadDays || 0) + 1; if (C.acadDays >= 7) { C.acadDays = 0; academyMatch(G); }
    C.hsDays = (C.hsDays || 0) + 1;
    if (C.hsDays >= 7) { C.hsDays = 0; const L = G.staffLevel(G.user, 'scout'); if (L) for (const pid of C.watch) { const p = G.P(pid); if (p && !p.scouted) narrow(p, 0.08 * L); } }
  }
  if (G.s.settings.assistant) autoScouts(G);
}
// The assistant sends idle scouts to the least-watched provinces, within the budget.
function autoScouts(G) {
  const C = G.s.club; for (const s of C.scouts) if (!s.prov) {
    const free = PROVINCES.filter((pr) => !C.scouts.some((x) => x.prov === pr)).sort((a, b) => (C.seen[a] || 0) - (C.seen[b] || 0));
    if (free.length && scoutBudget(G).left >= GRADE[s.grade].cost + 1) sendScout(G, s.id, free[0]);
  }
}
export function objective(G) {
  const C = G.s.club; const o = C.obj; const got = Object.values(G.players).filter((p) => p.acadGrad && p.team === G.user && !p.retired).length;
  return { ...o, got, season: o.by - 2023 };
}
// The potential a scouting view should show: the range, or one number once he is fully scouted.
export function potShown(p) { if (p.potLo == null) initRange(p); const o = ovr(p); const lo = Math.max(o, p.potLo), hi = Math.max(lo, p.potHi); return lo === hi ? String(lo) : `${lo}–${hi}`; }

// ===================== lifecycle =====================
export function migrate(G) {
  const s = G.s; if (!s.players) return;
  for (const p of Object.values(s.players)) { if (p.retired) { delete p.potLo; delete p.potHi; continue; } if (p.potLo == null) initRange(p); }
  // Game.create runs migrate before the squads exist; wait for them (new players would reuse ids)
  if (!s.teams || !s.user || !s.teams[s.user] || !s.teams[s.user].squad.length || !s.pid) return;
  const C = (s.club ??= {});
  C.startYear ??= s.year; C.plan ??= { days: {}, by: 'coaches', ok: null }; C.plan.days ??= {}; C.applied ??= null; C.spare ??= {}; C.prog ??= {};
  C.talked ??= {}; C.talks ??= []; C.talkWin ??= 0;
  C.scouts ??= [genScout(G, 'A', 1), genScout(G, 'B', 2), genScout(G, 'C', 3)];
  C.reports ??= []; C.watch ??= []; C.seen ??= {}; C.gen ??= {}; C.spent ??= {}; C.grads ??= [];
  C.day ??= null; C.acadDays ??= 0; C.hsDays ??= 0;
  C.obj ??= { need: 2, by: s.year + 1 };
  if (!C.acadInit) { C.acadInit = true; genAcademy(G, 5); }
}
// The user's match: apply the training week and note who was available (for role promises).
export function beforeMatch(G, f, opt) {
  if (!userFix(G, f) || !G.s.club) return;
  const C = G.s.club; const t = G.teams[G.user];
  if (C.lastN === `${G.year}:${f.n}`) return; C.lastN = `${G.year}:${f.n}`;
  applyTraining(G, f);
  C.avail = { n: f.n, ids: t.squad.filter((id) => G.available(G.P(id))) };
}
export function afterMatch(G, m, f) {
  const C = G.s.club; if (!C) return;
  const now = G.dayOf(f);
  if (now != null) { if (C.day != null && now > C.day) passDays(G, Math.round((now - C.day) / DAY)); if (C.day == null || now > C.day) C.day = now; }
  if (!userFix(G, f)) return;
  dressingAfter(G, m, f);
  C.talkWin = (C.talkWin || 0) + 1; // one one-to-one per player between matches
  C.avail = null;
}
export function seasonStart(G) {
  const C = G.s.club; if (!C) return;
  passDays(G, 7); C.day = null; C.applied = null; C.plan = { days: {}, by: 'coaches', ok: null }; C.spare = {}; C.lastN = null;
  for (const p of Object.values(G.players)) {
    if (p.tgain) p.tgain = 0; if (p.dropN) p.dropN = 0;
    // a squad-completion pass (fillSquad) can sign academy players: his own club counts it as a promotion
    if (p.academy && p.team) { if (p.team === p.academy && p.team === G.user) { p.acadGrad = G.year; C.grads.push({ pid: p.id, y: G.year }); } else if (p.academy === G.user) G.news(`${p.name} left the academy and signed for ${G.teams[p.team].name}.`, 'scout'); p.academy = null; }
    if (p.academy && p.age > 19) { p.academy = null; if (p.acadSince != null) G.news(`${p.name} is too old for the under-19 academy and joins the player pool.`, 'scout'); }
  }
}
export function seasonEnd(G) {
  const C = G.s.club; if (!C) return;
  judgeRolePromises(G);
  const o = objective(G);
  if (G.year >= o.by) {
    if (o.got >= o.need) { nudgePillar(G, 'youth', 8); G.news(`Board objective met: ${o.got} academy graduates in the senior squad.`, 'board'); }
    else { nudgePillar(G, 'youth', -5); G.news(`Board objective missed: ${o.got} of ${o.need} academy graduates in the senior squad.`, 'board'); }
    C.obj = { need: Math.min(4, o.need + (o.got >= o.need ? 1 : 0)), by: G.year + 2 };
  }
}
export function offseason(G) {
  const C = G.s.club; if (!C) return;
  for (const p of Object.values(G.players)) if (p.tdev || p.tgain) { if (!p.retired) growFromTraining(G, p, true); else { delete p.tdev; delete p.tgain; } }
  passDays(G, 14);
  // over-age academy players: the assistant promotes the best if there is room; the rest wait for a decision
  const A = academy(G); const over = A.filter((p) => p.age > 19);
  if (over.length) {
    if (G.s.settings.assistant) for (const p of over.sort((a, b) => b.pot - a.pot)) { if (promote(G, p.id)) releaseAcademy(G, p.id); }
    else G.news(`${over.length} academy player${over.length > 1 ? 's are' : ' is'} now over 19: promote or release before the season starts.`, 'scout');
  }
  // the yearly intake: two trialists if there is room
  const room = ACADEMY_MAX - academy(G).length; if (room > 0) { const n = genAcademy(G, Math.min(2, room)); G.news(`Academy intake: ${n.map((p) => `${p.name} (${p.age})`).join(', ')} join the under-19s.`, 'scout'); }
  C.reports = C.reports.filter((r) => r.y >= G.year - 1).slice(0, 16);
  for (const k of Object.keys(C.spent)) if (+k < G.year - 1) delete C.spent[k];
  for (const k of Object.keys(C.gen)) if (+k < G.year - 1) delete C.gen[k];
  C.watch = C.watch.filter((pid) => { const p = G.P(pid); return p && !p.team && !p.retired; });
}
// Academy players keep team: null, so the draw would pick them up: take them out of the lots.
export function auctionSetup(G) {
  const C = G.s.club; const A = G.s.auction; if (!A || !A.lots) return;
  A.lots = A.lots.filter((l) => { const p = G.P(l.pid); return !(p && p.academy); });
  if (C) passDays(G, 10);
}

// ===================== today =====================
export function todayTasks(G) {
  const C = G.s.club; if (!C || !G.teams[G.user]) return [];
  const out = []; const f = G.userNext();
  if (f && inSeason(G) && !G.s.settings.assistant && C.plan.ok !== f.n) { const pr = projectWeek(G); out.push({ key: 'club-week', text: 'Plan the training week', sub: `Next match ${f.date} · freshness ${pr.fresh}% · ${C.plan.by === 'you' ? 'your plan' : "coaches' plan"}`, to: '/week' }); }
  const sq = G.teams[G.user].squad.map((id) => G.P(id)).filter(Boolean);
  const risk = G.s.promises.filter((pr) => pr.kind === 'role' && promiseStatus(G, pr).status === 'risk').map((pr) => G.P(pr.pid)).find((p) => p && canTalk(G, p.id));
  const sad = sq.filter((p) => (p.happy ?? 70) < 50 && canTalk(G, p.id)).sort((a, b) => a.happy - b.happy)[0];
  const who = risk || sad; if (who) out.push({ key: `club-talk-${who.id}`, text: `One-to-one with ${who.name}`, sub: talkContext(G, who), to: `/dressing?talk=${who.id}` });
  const rep = C.reports.find((r) => r.st === 'new' && G.P(r.pid) && !G.P(r.pid).team);
  if (rep) { const p = G.P(rep.pid); out.push({ key: `club-rep-${rep.id}`, text: `Scout report: ${p.name}, ${p.age}`, sub: `${rep.prov} · ${roleLabel(p)} · potential ${potShown(p)}`, to: '/scouting' }); }
  else if (!G.s.settings.assistant && C.scouts.some((s) => !s.prov) && scoutBudget(G).left >= 1 && out.length < 3) out.push({ key: 'club-scouts', text: `${C.scouts.filter((s) => !s.prov).length} scouts at home`, sub: 'Send them to a province', to: '/scouting' });
  return out.slice(0, 3);
}
