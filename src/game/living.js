// ===== Phase 2 module: the living league and the long game =====
// Story engine (chains in stories.js), AI managers (style, job security, sackings, rotation), rivalry
// heat and rivalry nights, the league news wire, the finals archive, achievements, reputation, style
// labels, job interest, farewells and the Hall of Fame vote, challenge scenarios, and the helpers the
// deeper player profile reads.
//
// State: G.s.living = { stories, done, mgr, sacked, wire, ach, cnt, alerts, farewell, ballot, votes,
// listen, nepalA, challenge, recWatch, seeded }, G.s.finals[year] = { n, home, away, date, card, res, champ }.
// Players: p.seen (matches for you), p.l10 (last 10 innings for you), p.mentor, p.rushed, p.talked.
import { R, ri, rf, pick, clamp, shuffle, ovr, isSpin, isPace } from './engine.js';
import { NEP_NAMES, OS_NAMES, TEAMS } from './data.js';
import { nudgeTrust, nudgePillar, relOf, nudgeRel, logDecision, weakestVs } from './depth.js';
import { CHAINS, SPONSORS, FICTIONAL_TARGETS } from './stories.js';

export { CHAINS, FICTIONAL_TARGETS };
const L_ = (G) => G.s.living;
const fictional = (p) => !!p && p.real === false;
const sur = (p) => p.name.split(' ').slice(-1)[0];
const short = (G, tid) => G.teams[tid].name.split(' ')[0];
const careerOf = (p) => { const c = { m: 0, r: 0, w: 0, ff: 0, h: 0 }; for (const y in p.stats || {}) { const s = p.stats[y]; c.m += s.m; c.r += s.r; c.w += s.w; c.ff += s.ff; c.h += s.h; } return c; };
const isMine = (G, f) => f.home === G.user || f.away === G.user;
const oppOf = (G, f) => (f.home === G.user ? f.away : f.home);
const userFixtures = (G) => G.s.fixtures.filter((f) => isMine(G, f));
const userPlayed = (G) => userFixtures(G).filter((f) => f.res).length;
function lostStreak(G) { let n = 0; for (const f of userFixtures(G).filter((x) => x.res).reverse()) { if (f.res.winner && f.res.winner !== G.user) n++; else break; } return n; }
const promised = (G, pid) => (G.s.promises || []).some((pr) => pr.pid === pid);

// ----- generated people -----
function usedNames(G) {
  const s = new Set(Object.values(G.players || {}).map((p) => p.name));
  for (const t of TEAMS) { s.add(t.coach); s.add(t.captain); }
  for (const x of Object.values(G.s.staff || {})) for (const k in x) if (x[k]) s.add(x[k].name.replace(/^Dr\. /, ''));
  const L = G.s.living; if (L && L.mgr) for (const m of Object.values(L.mgr)) s.add(m.name);
  return s;
}
export function genPerson(G, foreign) {
  const used = usedNames(G); let name, g = 0;
  do {
    if (foreign && R() < 0.8) { const pool = OS_NAMES[pick(Object.keys(OS_NAMES))]; name = `${pick(pool.f)} ${pick(pool.l)}`; }
    else { const pr = NEP_NAMES[pick(Object.keys(NEP_NAMES))]; name = `${pick(pr.f)} ${pick(pr.l)}`; }
  } while (used.has(name) && g++ < 100);
  return name;
}

// ----- AI managers -----
// bias: added to the AI batting aggression (engine reads t.aggrBias); persona: the auction strategy.
export const STYLES = {
  attack: { label: 'Pace and bounce, all-out attack', bias: 0.35, persona: 'Big spender' },
  data: { label: 'Rotation, data-driven', bias: 0.05, persona: 'Balanced', rot: true },
  spin: { label: 'Spin-first, defensive', bias: -0.3, persona: 'Bargain hunter' },
  stars: { label: 'Big spender, buys stars', bias: 0.15, persona: 'Big spender' },
  youth: { label: 'Youth, home-grown', bias: 0.1, persona: 'Youth builder' },
  patient: { label: 'Balanced, patient', bias: -0.1, persona: 'Balanced', rot: true },
  loyal: { label: 'Old school, loyal to his core', bias: -0.15, persona: 'Loyalist' },
  fearless: { label: 'Caretaker: "fearless cricket"', bias: 0.45, persona: null, care: true },
};
const PERSONA_STYLE = { 'Big spender': ['attack', 'stars'], Balanced: ['data', 'patient'], 'Bargain hunter': ['spin'], 'Youth builder': ['youth'], Loyalist: ['loyal'] };
const PERM = Object.keys(STYLES).filter((k) => !STYLES[k].care);
function newManager(G, tid, style, care) {
  return { name: genPerson(G, R() < 0.3), style, since: G.year, sec: care ? 40 : ri(58, 85), care: !!care, careLeft: care ? 3 : 0 };
}
function setStyle(G, tid, m) {
  const st = STYLES[m.style]; const t = G.teams[tid];
  t.aggrBias = Math.round((st.bias + (st.care ? 0 : rf(-0.04, 0.04))) * 100) / 100;
  if (st.persona) t.persona = st.persona;
}
export const managerOf = (G, tid) => (G.s.living && G.s.living.mgr[tid]) || null;
function ensureManagers(G) {
  const L = L_(G); if (!G.s.teams || !G.s.user) return;
  if (L.mgr[G.user]) { delete L.mgr[G.user]; G.teams[G.user].aggrBias = 0; }
  for (const tid in G.teams) if (tid !== G.user && !L.mgr[tid]) {
    const t = G.teams[tid]; const opts = PERSONA_STYLE[t.persona] || ['patient'];
    L.mgr[tid] = newManager(G, tid, pick(opts)); if (t.aggrBias == null) setStyle(G, tid, L.mgr[tid]);
  }
}
export function wire(G, t, extra) {
  const L = L_(G); L.wire.unshift({ y: G.year, d: G.dayLabel(), t, ...(extra || {}) }); if (L.wire.length > 40) L.wire.length = 40;
}
// Sack: a caretaker takes over for three matches, then a permanent appointment with a new style.
export function sackManager(G, tid, why) {
  const L = L_(G); const old = L.mgr[tid]; if (!old || old.care) return null;
  L.sacked.unshift({ tid, name: old.name, style: old.style, y: G.year, why }); L.sacked.length = Math.min(L.sacked.length, 20);
  const c = newManager(G, tid, 'fearless', true); c.prevStyle = old.style; L.mgr[tid] = c; setStyle(G, tid, c);
  wire(G, `${short(G, tid)} sack ${old.name}`, { kind: 'sack', tid, sub: `${why}. Caretaker ${c.name} promises "fearless cricket".` });
  if (G.s.phase === 'league' || G.s.phase === 'playoffs') G.news(`${G.teams[tid].name} sack their manager ${old.name}`, 'league', { detail: `${why}. ${c.name} takes over as caretaker. Rival managers are generated characters.` });
  return c;
}
export function appointManager(G, tid) {
  const L = L_(G); const old = L.mgr[tid]; const avoid = old && (old.prevStyle || old.style);
  const style = pick(PERM.filter((k) => k !== avoid)); const m = newManager(G, tid, style); L.mgr[tid] = m; setStyle(G, tid, m);
  wire(G, `${short(G, tid)} appoint ${m.name}`, { kind: 'appoint', tid, sub: `Style: ${STYLES[style].label.toLowerCase()}. Expect a changed side.` });
  return m;
}
function securityAfter(G, tid, f) {
  const m = L_(G).mgr[tid]; if (!m) return; const won = f.res.winner === tid, lost = f.res.winner && !won;
  if (m.care) { if (--m.careLeft <= 0) appointManager(G, tid); return; }
  const form = (G.teams[tid].form || []).slice(-3); const streak = form.length === 3 && form.every((x) => x === 'L');
  let d = won ? 3 : lost ? -4 : 0; if (streak && lost) d -= 3;
  if (f.stage === 'L') { const pos = G.standings().findIndex((x) => x.id === tid) + 1; const exp = G.teams[tid].expRank || 4; if (G.s.table[tid].p >= 6 && pos > exp + 2) d -= 1; }
  m.sec = clamp(m.sec + d, 0, 100);
  if (m.sec < 18 && f.stage === 'L' && G.s.table[tid].p >= 5) sackManager(G, tid, `Job security fell to ${m.sec} after ${streak ? 'three straight defeats' : 'a run of poor results'}`);
}
export const secLabel = (m) => (m.care ? 'Caretaker' : m.sec >= 75 ? 'Secure' : m.sec >= 45 ? 'Stable' : m.sec >= 25 ? 'Under pressure' : 'On the brink');
// Rotation: AI managers rest tired players before league matches (more so for rotation styles).
function rotate(G, tid, f) {
  if (f.stage !== 'L') return []; const m = L_(G).mgr[tid]; if (!m) return [];
  const t = G.teams[tid]; const lim = STYLES[m.style].rot ? 80 : 64; const av = t.squad.map((id) => G.P(id)).filter((p) => G.available(p));
  let n = av.length, os = av.filter((p) => p.nat !== 'NEP').length; const rested = [];
  for (const p of av.filter((x) => x.fit < lim).sort((a, b) => a.fit - b.fit)) {
    if (rested.length >= 2 || n <= 13) break; if (p.nat !== 'NEP' && os <= 4) continue;
    p.rest = true; rested.push(p); n--; if (p.nat !== 'NEP') os--;
  }
  return rested;
}

// ----- migrate and hooks -----
export function migrate(G) {
  const s = G.s; s.finals ??= {};
  const L = (s.living ??= {});
  L.stories ??= {}; L.done ??= {}; L.mgr ??= {}; L.sacked ??= []; L.wire ??= []; L.ach ??= {}; L.cnt ??= {}; L.alerts ??= {};
  L.farewell ??= {}; L.ballot ??= null; L.votes ??= []; L.listen ??= {}; L.nepalA ??= null; L.challenge ??= null; L.recWatch ??= {};
  if (!s.teams || !s.user || !s.rel) return;
  ensureManagers(G);
  // seed rivalries once from the real meetings (the 2025 final and playoffs)
  if (!L.seeded && s.h2h) {
    L.seeded = true;
    for (const k in s.h2h) { const x = s.h2h[k]; if (!x.real) continue; const [a, b] = k.split('|'); if (a !== s.user && b !== s.user) continue; const o = a === s.user ? b : a;
      if (x.stage === 'F') nudgeRel(G, o, { heat: 30, why: `${x.y} final` }); else if (x.stage !== 'L') nudgeRel(G, o, { heat: 12, why: `${x.y} ${({ Q1: 'Qualifier 1', Q2: 'Qualifier 2', EL: 'Eliminator' })[x.stage] || 'playoff'}` }); }
  }
}

export function beforeMatch(G, f, opt) {
  if (!G.s.living) return; ensureManagers(G); sync(G);
  for (const side of [f.home, f.away]) if (side !== G.user) { const r = rotate(G, side, f); if (r.length && R() < 0.4) wire(G, `${short(G, side)} rest ${r.map(sur).join(' and ')}`, { kind: 'rotation', tid: side, sub: `${managerOf(G, side).name} rotates before match ${f.n}.` }); }
  if (!isMine(G, f)) return;
  const opp = oppOf(G, f); const r = G.s.rel[opp]; if (!r || r.heat < 50) return;
  opt.hostile ??= f.home === G.user ? opp : G.user; opt.rivalry = r.heat; f.rivalry = r.heat;
  if (!f.rivalNews) { f.rivalNews = true; const why = r.why[0] ? r.why[0].t : 'bad blood';
    G.news(`Rivalry night: ${G.teams[G.user].name} v ${G.teams[opp].name}`, 'league', { detail: `Heat ${Math.round(r.heat)} · ${why}. Expect a bigger crowd, more pressure and louder headlines.`, ne: 'प्रतिद्वन्द्वी भिडन्त', fix: f.n });
    wire(G, `Rivalry night: ${short(G, G.user)} v ${short(G, opp)}`, { kind: 'rivalry', tid: opp, sub: why }); }
}

export function afterMatch(G, m, f) {
  const L = L_(G); if (!L) return; ensureManagers(G);
  for (const side of [f.home, f.away]) if (side !== G.user && !m.result.nr) securityAfter(G, side, f);
  // rivalry crowd
  if (f.rivalry >= 50 && !f.rivAtt && f.att != null) { f.rivAtt = true; const extra = Math.max(0, Math.min(15000 - f.att, Math.round(f.att * (0.08 + f.rivalry / 500))));
    const home = G.teams[f.home]; f.att += extra; const gate = extra * home.ticket / 1e5 * 0.3; home.balance += gate; if (home.ledger) home.ledger.gate += gate; }
  if (L.alerts[f.n] && !isMine(G, f)) { delete L.alerts[f.n]; G.news(`Alert: ${G.teams[f.home].name} v ${G.teams[f.away].name}`, 'league', { detail: `${f.res.text}.`, fix: f.n }); }
  recordWatch(G);
  if (!isMine(G, f)) return;
  const C = L.cnt; C.um = (C.um || 0) + 1; const u = G.user; const opp = oppOf(G, f); (L.met ??= {})[opp] = C.um;
  const xi = m.lineups[u].xi;
  for (const id of xi) { const p = G.P(id); p.seen = (p.seen || 0) + 1; }
  for (const inn of m.inns) if (inn.bat === u) for (const id in inn.bs) { const b = inn.bs[id]; if (!(b.batted || b.in || b.b > 0 || b.out)) continue; const p = G.P(id); (p.l10 ??= []).push([G.year, f.n, b.r, b.out ? 1 : 0, opp]); if (p.l10.length > 10) p.l10.shift(); }
  const won = m.result.winner === u;
  if (won) { const i2 = m.inns[1]; if (i2 && i2.balls > (m.maxBalls || 120) - 6) C.lastOver = (C.lastOver || 0) + 1; if ((G.s.rel[opp] || {}).heat >= 70) C.rivalWins = (C.rivalWins || 0) + 1; }
  if (f.att >= 15000) C.sellouts = (C.sellouts || 0) + 1;
  if (f.stage === 'F') { if (xi.some((id) => G.P(id).age <= 20)) C.kidsFinal = 1; if (won && m.lineups[u].order.slice(0, 6).every((id) => G.P(id).nat === 'NEP')) C.allNep = (C.allNep || 0) + 1; }
  // farewell: the last league match of the season, for a planned retiree in the XI
  if (f.stage === 'L' && !userFixtures(G).some((x) => x.stage === 'L' && !x.res)) for (const pid in L.farewell) { const fw = L.farewell[pid]; if (fw.y !== G.year || fw.played) continue;
    const p = G.P(pid); if (xi.includes(pid)) { fw.played = true; fw.n = f.n; G.teams[u].fans = clamp(G.teams[u].fans + 2, 0, 100); nudgePillar(G, 'fans', 2);
      G.news(`A farewell at Kirtipur for ${p.name}`, 'board', { detail: 'A guard of honour from both sides and a lap of the ground. Fans +2.', ne: `${p.name}लाई बिदाइ` }); } }
  // transfer interest from a stars-style manager
  if (f.stage === 'L' && R() < 0.06) { const cand = Object.keys(L.mgr).filter((tid) => ['stars', 'attack'].includes(L.mgr[tid].style)); if (cand.length) { const tid = pick(cand);
    const best = G.teams[u].squad.map((id) => G.P(id)).sort((a, b) => ovr(b) - ovr(a)).slice(0, 5); const p = pick(best);
    if (p) { wire(G, `${short(G, tid)} ask about ${p.name}`, { kind: 'transfer', tid, sub: 'No bids between auctions, but they will be at the next one.' }); nudgeRel(G, tid, { heat: 3, why: `Interest in ${p.name}` }); } } }
  scanPress(G);
  tick(G, 'afterMatch', { m, f });
  checkAch(G);
}

export function seasonStart(G) {
  const L = L_(G); if (!L) return; ensureManagers(G); sync(G); const u = G.user;
  for (const tid in G.s.rel) { const r = G.s.rel[tid]; if (r.heat > 10) r.heat = Math.round(Math.max(10, r.heat * 0.85)); }
  // transfers between you and rivals warm things up
  const took = {}, gave = {};
  for (const p of Object.values(G.players)) { const h = p.hist || []; if (h.length < 2) continue; const a = h[h.length - 1], b = h[h.length - 2]; if (a.year !== G.year) continue;
    if (b.team === u && a.team !== u && G.teams[a.team]) (took[a.team] ??= []).push(p); else if (a.team === u && b.team && b.team !== u && G.teams[b.team]) (gave[b.team] ??= []).push(p); }
  for (const t in took) nudgeRel(G, t, { heat: Math.min(10, 4 * took[t].length), why: took[t].length > 1 ? `Signed ${took[t].length} of your players` : `Signed ${took[t][0].name} from you` });
  for (const t in gave) nudgeRel(G, t, { heat: Math.min(6, 2 * gave[t].length), why: gave[t].length > 1 ? `You signed ${gave[t].length} of their players` : `You signed ${gave[t][0].name}` });
  // rushed-back injuries can flare up; agreed releases go through; ballots close
  for (const p of G.teams[u].squad.map((id) => G.P(id))) if (p.rushed) { if (R() < p.rushed.risk) { p.inj = ri(2, 4); G.news(`${p.name}'s injury from the playoffs flares up`, 'injury', { detail: `He misses the first ${p.inj} matches.` }); } p.rushed = null; }
  closeBallot(G);
  for (const st of Object.values(L.stories)) if (st.vars && st.vars.release && !st.vars.released) { st.vars.released = true; for (const pid of st.pids) { const p = G.P(pid); if (p && p.team === u) { G.releasePlayer(pid); G.news(`${p.name} leaves the club, as agreed`, 'board'); } } }
  if (L.challenge) checkChallenge(G, false);
  tick(G, 'seasonStart', {});
}

export function seasonEnd(G, champ) {
  const L = L_(G); if (!L) return; const u = G.user; const F = G.s.fixtures;
  const fin = F.find((f) => f.stage === 'F');
  if (fin && fin.card) G.s.finals[G.year] = { n: fin.n, home: fin.home, away: fin.away, date: fin.date, card: fin.card, res: fin.res, champ };
  for (const f of F) if (f.stage !== 'L' && f.res && isMine(G, f)) nudgeRel(G, oppOf(G, f), { heat: f.stage === 'F' ? 25 : 10, respect: 3, why: `${G.year} ${({ F: 'final', Q1: 'Qualifier 1', Q2: 'Qualifier 2', EL: 'Eliminator' })[f.stage]}` });
  // AI board reviews: a poor season costs job security
  const st = G.standings();
  for (const tid in L.mgr) { const m = L.mgr[tid]; const pos = st.findIndex((x) => x.id === tid) + 1; const exp = G.teams[tid].expRank || 4;
    if (tid === champ) m.sec = clamp(m.sec + 20, 0, 100); else m.sec = clamp(m.sec + (pos <= exp ? 8 : -6 * (pos - exp)), 0, 100);
    if (!m.care && m.sec < 30) m.review = true; }
  for (const tid in L.listen) if (L.listen[tid] === G.year && G.s.manager.rep >= 55 && !G.s.sacked && tid !== u) { const o = (G.s.offers ||= []); if (!o.includes(tid)) { o.push(tid); G.news(`${G.teams[tid].name} would like to talk about their head-coach role`, 'board'); } }
  if (L.challenge) checkChallenge(G, true);
  checkAch(G);
}

export function offseason(G) {
  const L = L_(G); if (!L) return; sync(G); const u = G.user;
  for (const st of Object.values(L.stories)) if (st.vars && st.vars.staffLeave && !st.vars.left) { st.vars.left = true; const k = st.vars.post; const x = G.s.staff[u] && G.s.staff[u][k]; if (x) { G.s.staff[u][k] = null; G.news(`${x.name} leaves for ${G.teams[st.tid].name}, as agreed`, 'staff'); } }
  for (const tid in L.mgr) { const m = L.mgr[tid]; if (m.care) appointManager(G, tid); else if (m.review) { m.review = false; sackManager(G, tid, 'A poor season'); appointManager(G, tid); } }
  ensureManagers(G);
  // mentors: a young player with a senior mentor at the club gains a point, up to potential
  for (const id of G.teams[u] ? G.teams[u].squad : []) { const p = G.P(id); if (!p.mentor) continue; const mt = G.P(p.mentor);
    if (!mt || mt.team !== u || mt.retired) { p.mentor = null; continue; } if (p.age <= 25 && ovr(p) < p.pot) { if (p.role === 'BOWL' || (p.role === 'AR' && p.bowl > p.bat)) p.bowl = clamp(p.bowl + 1, 10, 96); else p.bat = clamp(p.bat + 1, 10, 96); p.mentorDev = 1; } }
  if (L.nepalA) { G.s.manager.rep = clamp(G.s.manager.rep + 1, 0, 100); for (const p of Object.values(G.players)) if (p.nat === 'NEP' && !p.team && !p.retired && p.age <= 22) p.scouted = true; }
  openBallot(G);
  for (const p of Object.values(G.players)) if (p.l10 && p.team !== u) delete p.l10;
  L.wire = L.wire.filter((w) => w.y >= G.year - 1);
  for (const k of Object.keys(L.stories)) { const st = L.stories[k]; if (st.status === 'done' && st.y < G.year - 3) delete L.stories[k]; }
}

export function todayTasks(G) {
  const L = L_(G); if (!L) return [];
  return G.pendingDecisions().filter((n) => n.story && L.stories[n.storyId]).slice(0, 3).map((n) => ({ key: `story-${n.storyId}`, text: n.title || n.text, sub: 'Story · decide before the next match', to: `/story/${n.storyId}` }));
}

// ----- story engine -----
const COND = {
  phase: (G, st, ...ph) => ph.includes(G.s.phase),
  month: (G, st, ...ms) => ms.includes(G.dayLabel().slice(0, 3)),
  played: (G, st, n) => userPlayed(G) >= n,
  lost: (G, st, n) => lostStreak(G) >= n,
  lastLost: (G) => lostStreak(G) >= 1,
  heat: (G, st, n) => !!(st && st.tid && relOf(G, st.tid).heat >= n),
  stage: (G, st, ...sg) => { const f = G.userNext(); return !!f && sg.includes(f.stage); },
  chance: (G, st, p) => R() < p,
};
export function condOk(G, conds, st) { return (conds || []).every(([k, ...a]) => (COND[k] ? COND[k](G, st, ...a) : true)); }
const squadOf = (G) => G.teams[G.user].squad.map((id) => G.P(id)).filter(Boolean);
const lastXI = (G) => new Set((G.teams[G.user].lastXI && G.teams[G.user].lastXI.xi) || []);
const free = (G, p) => !promised(G, p.id) && !Object.values(L_(G).stories).some((s) => s.status !== 'done' && s.pids.includes(p.id));
// Targets return { pids, tid, npc, vars } or null. Those listed in FICTIONAL_TARGETS only return
// fictional players (p.real === false); the honesty test checks this.
export const TARGETS = {
  fictionalNepali: (G, ch) => { const c = shuffle(squadOf(G).filter((p) => fictional(p) && p.nat === 'NEP' && !p.inj && free(G, p))); if (!c.length) return null; const [a, b] = ch.count || [1, 1]; return { pids: c.slice(0, ri(a, Math.min(b, c.length))).map((p) => p.id) }; },
  fictionalOverseas: (G) => { const c = squadOf(G).filter((p) => fictional(p) && p.nat !== 'NEP' && !p.temp && free(G, p)); return c.length ? { pids: [pick(c).id] } : null; },
  youngFictional: (G) => { const c = squadOf(G).filter((p) => fictional(p) && p.age <= 21 && free(G, p)); return c.length ? { pids: [pick(c).id], npc: genPerson(G) } : null; },
  droppedVeteran: (G) => { const xi = lastXI(G); const c = squadOf(G).filter((p) => fictional(p) && p.age >= 29 && ovr(p) >= 52 && !xi.has(p.id) && !p.inj && free(G, p)); return c.length ? { pids: [pick(c).id] } : null; },
  sponsorFace: (G) => { const c = squadOf(G).filter((p) => fictional(p) && ovr(p) >= 55 && free(G, p)); if (!c.length) return null; const sp = shuffle(SPONSORS.slice()); return { pids: [pick(c).id], vars: { sp: sp[0], sp2: sp[1] } }; },
  fictionalPair: (G) => { const c = shuffle(squadOf(G).filter((p) => fictional(p) && free(G, p))); return c.length >= 2 ? { pids: [c[0].id, c[1].id] } : null; },
  prospect: (G) => { const c = Object.values(G.players).filter((p) => fictional(p) && !p.team && !p.retired && p.nat === 'NEP' && p.age <= 19 && !p.scouted); return c.length ? { pids: [pick(c).id], anyTeam: true } : null; },
  // not personal: real players allowed, no quotes, no personal details
  callup: (G, ch) => { const c = squadOf(G).filter((p) => p.nat === 'NEP' && !p.inj && !promised(G, p.id) && ovr(p) >= 60).sort((a, b) => ovr(b) - ovr(a)); if (!c.length) return null; return { pids: c.slice(0, Math.min(c.length, ri(...(ch.count || [1, 1])))).map((p) => p.id) }; },
  injuredKey: (G) => {
    const F = G.s.fixtures; const last = F.filter((f) => f.res).pop(); if (!last || last.stage === 'L' || !isMine(G, last)) return null;
    const won = last.res.winner === G.user; const nL = F.filter((f) => f.stage === 'L').length;
    const next = last.stage === 'Q1' ? (won ? 'F' : 'Q2') : last.stage === 'EL' ? (won ? 'Q2' : null) : last.stage === 'Q2' ? (won ? 'F' : null) : null; if (!next) return null;
    const c = squadOf(G).filter((p) => p.inj >= 1 && p.inj <= 2 && ovr(p) >= 62 && !promised(G, p.id)).sort((a, b) => ovr(b) - ovr(a)); if (!c.length) return null;
    return { pids: [c[0].id], vars: { due: nL + (next === 'F' ? 4 : 3), stage: next === 'F' ? 'final' : 'Qualifier 2' } };
  },
  bestPlayer: (G) => { const c = squadOf(G).filter((p) => !promised(G, p.id) && free(G, p)).sort((a, b) => ovr(b) - ovr(a)).slice(0, 4); const tids = Object.keys(L_(G).mgr); return c.length && tids.length ? { pids: [pick(c).id], tid: pick(tids) } : null; },
  rivalManager: (G) => { const nf = G.userNext(); const tids = Object.keys(L_(G).mgr); if (!tids.length) return null; const hot = tids.sort((a, b) => relOf(G, b).heat - relOf(G, a).heat)[0]; return { pids: [], tid: nf && nf.stage === 'L' && R() < 0.6 ? oppOf(G, nf) : hot }; },
  rivalHot: (G) => { const tids = Object.keys(L_(G).mgr).filter((t) => relOf(G, t).heat >= 35); return tids.length ? { pids: [], tid: pick(tids), npc: genPerson(G) } : null; },
  staffCoach: (G) => { const st = G.s.staff[G.user] || {}; const posts = ['bat', 'bowl', 'physio'].filter((k) => st[k]); if (!posts.length) return null; const k = pick(posts);
    return { pids: [], tid: pick(Object.keys(L_(G).mgr)), npc: st[k].name, vars: { post: { bat: 'batting coach', bowl: 'bowling coach', physio: 'physio' }[k], postKey: k } }; },
  pundit: (G) => ({ pids: [], npc: genPerson(G) }),
  none: () => ({ pids: [] }),
};
const ROLE = { BAT: 'batter', BOWL: 'bowler', AR: 'all-rounder', WK: 'wicketkeeper' };
function ctxOf(G, st) {
  const ps = st.pids.map((id) => G.P(id)).filter(Boolean); const p = ps[0], q = ps[1]; const t = G.teams[G.user]; const v = st.vars || {};
  const mon = G.dayLabel().slice(0, 3);
  const names = ps.length <= 1 ? (p ? p.name : '') : `${ps.slice(0, -1).map((x) => x.name).join(', ')} and ${ps[ps.length - 1].name}`;
  return { p: p ? p.name : '', ps: p ? sur(p) : '', p2: q ? q.name : '', p2s: q ? sur(q) : '', names, s1: ps.length > 1 ? '' : 's', has: ps.length > 1 ? 'have' : 'has',
    age: p ? p.age : '', prov: p && p.prov ? (ps.length > 1 ? [...new Set(ps.map((x) => x.prov).filter(Boolean))].join(' and ') : p.prov) : 'the hills', home: p ? ({ AUS: 'Australia', ENG: 'England', NZ: 'New Zealand', SA: 'South Africa', WI: 'the Caribbean', SL: 'Sri Lanka', PAK: 'Pakistan', IND: 'India', ZIM: 'Zimbabwe' })[p.nat] || 'home' : '',
    role: p ? ROLE[p.role] : '', club: t.name, city: t.city, opp: st.tid ? G.teams[st.tid].name : '', oppShort: st.tid ? short(G, st.tid) : '', mgr: st.tid && L_(G).mgr[st.tid] ? L_(G).mgr[st.tid].name : 'their manager',
    npc: st.npc || '', fest: mon === 'Oct' ? 'Dashain' : 'Tihar', festNe: mon === 'Oct' ? 'दशैं' : 'तिहार', inj: p ? `${p.inj} match${p.inj === 1 ? '' : 'es'}` : '', lostN: lostStreak(G), result: v.result || '', ...v };
}
export const fill = (s, c) => (s == null ? s : String(s).replace(/\{(\w+)\}/g, (a, k) => (c[k] != null ? c[k] : a)));
export const chainOf = (id) => CHAINS.find((c) => c.id === id);
const fxOf = (fx, st) => { if (!fx) return {}; const o = { ...fx }; if (o.pid === '$p') { if (st.pids[0]) o.pid = st.pids[0]; else delete o.pid; } return o; };

export function startChain(G, ch, forced) {
  const L = L_(G); const T = TARGETS[ch.target]; const tg = T && T(G, ch); if (!tg) return null;
  const id = `st${G.year}${ch.id}${ri(100, 999)}`;
  const st = { id, chain: ch.id, step: null, pids: tg.pids, tid: tg.tid || null, npc: tg.npc || null, vars: { ...(tg.vars || {}) }, anyTeam: !!tg.anyTeam, y: G.year, hist: [], status: 'new' };
  if (!forced && !condOk(G, ch.cond, st)) return null;
  L.stories[id] = st; present(G, st, Object.keys(ch.steps)[0]); return st;
}
function present(G, st, key) {
  const ch = chainOf(st.chain); const sp = ch.steps[key]; const nf = G.userNext(); const due = st.vars.due ?? (nf ? nf.n : null);
  if (due == null) { st.status = 'wait'; st.wait = { next: key, y: G.year + 1 }; return false; }
  const c = ctxOf(G, st); const quoteOk = sp.quote && (sp.quoteBy === 'npc' || (st.pids.length && st.pids.every((id) => fictional(G.P(id)))));
  const choices = sp.choices.map((x) => ({ l: fill(x.l, c), fx: fxOf(x.fx, st) }));
  G.news(fill(sp.text, c), 'story', { title: fill(sp.title, c), cat: sp.cat || 'Story', sum: fill(sp.sum, c), ne: sp.ne ? fill(sp.ne, c) : undefined, quote: quoteOk ? fill(sp.quote, c) : undefined,
    pid: st.pids[0], choices, safe: sp.safe ?? 0, due, done: false, story: true, storyId: st.id, step: key });
  // core decisions from the same match stay first in the queue; the story follows them
  const I = G.s.inbox; const item = I.shift(); let at = 0; while (at < I.length && I[at].choices && !I[at].done && !I[at].story && I[at].y === G.year) at++; I.splice(at, 0, item);
  st.newsId = item.id; st.step = key; st.status = 'open'; st.wait = null;
  st.hist.push({ y: G.year, d: G.dayLabel(), um: L_(G).cnt.um || 0, t: fill(sp.title, c), text: fill(sp.text, c) });
  return true;
}
// Extra effects of a story choice, beyond the core fx.
// Happiness only: morale moves through the core fx of a choice, so promise checks stay exact.
function happyOf(G, pid, d, why) { const p = G.P(pid); if (!p || !d) return; p.happy = clamp(Math.round((p.happy ?? 70) + d), 0, 100); if (why) p.happyWhy = why; }
export function applyX(G, st, x) {
  if (!x) return; const why = chainOf(st.chain).title; const ps = st.pids;
  if (x.happy && ps[0]) happyOf(G, ps[0], x.happy, why);
  if (x.happyAll) for (const id of ps) happyOf(G, id, x.happyAll, why);
  if (x.trust) nudgeTrust(G, x.trust, why);
  if (x.pillars) for (const k in x.pillars) nudgePillar(G, k, x.pillars[k]);
  if ((x.heat || x.respect) && st.tid) nudgeRel(G, st.tid, { heat: x.heat || 0, respect: x.respect || 0, why: x.why || why });
  if (x.rep) G.s.manager.rep = clamp(G.s.manager.rep + x.rep, 0, 100);
  for (const id of ps) { const p = G.P(id); if (!p) continue;
    if (x.fitAll) p.fit = clamp(p.fit + x.fitAll, 30, 100);
    if (x.formAll) p.form = clamp(p.form + x.formAll, -10, 10);
    if (x.injFix) { p.inj = 0; p.injCounted = false; p.rushed = { y: G.year, risk: x.reinj || 0 }; } }
  const p = G.P(ps[0]);
  if (x.trait && p && p.traits) p.traits[x.trait.k] = clamp((p.traits[x.trait.k] || 50) + x.trait.d, 0, 100);
  if (x.scout && p) p.scouted = true;
  if (x.shortlist && p && !p.team && G.s.shortlist && !G.slEntry(p.id)) G.s.shortlist.push({ pid: p.id, max: 0, priority: 'B' });
  if (x.release) st.vars.release = true;
  if (x.staffLeave) { st.vars.staffLeave = true; st.vars.post = st.vars.postKey; }
}
export function xLines(G, st, x) {
  if (!x) return []; const out = []; const n = (v) => `${v > 0 ? '+' : '−'}${Math.abs(v)}`; const P = (id) => G.P(id);
  const add = (v, text) => out.push({ tone: v > 0 ? 'up' : 'down', text });
  if (x.happy && P(st.pids[0])) add(x.happy, `${sur(P(st.pids[0]))} happiness ${n(x.happy)}`);
  if (x.happyAll) add(x.happyAll, `${st.pids.length > 1 ? 'Their' : 'His'} happiness ${n(x.happyAll)}`);
  if (x.trust) add(x.trust, `Captain's trust ${n(x.trust)}`);
  for (const k in x.pillars || {}) add(x.pillars[k], `${({ results: 'Results', finances: 'Finances', fans: 'Fans', youth: 'Youth', conduct: 'Conduct' })[k]} pillar ${n(x.pillars[k])}`);
  if (x.heat && st.tid) out.push({ tone: x.heat > 0 ? 'down' : 'up', text: `Rivalry heat with ${short(G, st.tid)} ${n(x.heat)}` });
  if (x.respect && st.tid) add(x.respect, `${short(G, st.tid)} manager's respect ${n(x.respect)}`);
  if (x.rep) add(x.rep, `Your reputation ${n(x.rep)}`);
  if (x.fitAll) add(x.fitAll, `Fitness ${n(x.fitAll)}`);
  if (x.injFix) out.push({ tone: 'warn', text: `Available now · ${Math.round((x.reinj || 0) * 100)}% chance it flares up later` });
  if (x.scout) out.push({ tone: 'up', text: 'Scout report on his potential' });
  if (x.release) out.push({ tone: 'warn', text: 'He leaves when the next season starts' });
  if (x.staffLeave) out.push({ tone: 'down', text: 'He leaves in the off-season' });
  if (x.trait) out.push({ tone: 'up', text: `${({ loyal: 'Loyalty', lead: 'Leadership' })[x.trait.k] || x.trait.k} grows` });
  return out;
}
// Reads every answered story decision (from the inbox, the story page or the deadline) and moves the chain on.
export function sync(G) {
  const L = L_(G); if (!L) return;
  for (const st of Object.values(L.stories)) {
    if (st.status !== 'open') continue; const n = G.s.inbox.find((x) => x.id === st.newsId);
    if (n && !n.done) continue;
    const ch = chainOf(st.chain); const sp = ch.steps[st.step]; let ci = n ? sp.choices.findIndex((c, i) => n.choices[i] && n.choices[i].l === n.picked) : -1; if (ci < 0) ci = sp.safe ?? 0;
    let c = sp.choices[ci]; if (c.alt && R() < c.alt.p) c = { ...c, ...c.alt };
    applyX(G, st, c.x); const cx = ctxOf(G, st); const h = st.hist[st.hist.length - 1];
    h.pick = n ? n.picked : fill(c.l, cx); h.out = fill(c.out, cx); h.auto = !!(n && n.auto); st.last = { pick: h.pick, out: h.out, later: fill(c.later, cx), auto: h.auto, ci };
    if (c.next) { st.status = 'wait'; const a = c.next.after || {}; st.wait = { next: c.next.to, um: a.matches != null ? (L.cnt.um || 0) + a.matches : null, y: a.seasons ? G.year + a.seasons : null, meet: a.meet ? st.tid : null, from: L.cnt.um || 0 }; }
    else { st.status = 'done'; st.end = G.year; L.cnt.stories = (L.cnt.stories || 0) + 1; }
    L.done[st.chain] = G.year;
  }
}
// The story page's own handler: apply the core effects, log, then move the chain on.
export function answerStory(G, sid, ci) {
  const st = L_(G).stories[sid]; if (!st || st.status !== 'open') return null; const n = G.s.inbox.find((x) => x.id === st.newsId);
  if (n && !n.done) G.applyEvent(n, ci); sync(G); return st;
}
function waitReady(G, st) {
  const w = st.wait; if (!w) return false; const L = L_(G);
  if (w.y != null && G.year < w.y) return false; if (w.um != null && (L.cnt.um || 0) < w.um) return false;
  if (w.meet && !((L.met || {})[w.meet] > w.from)) return false; return true;
}
function stillValid(G, st) { if (st.anyTeam) return st.pids.every((id) => G.P(id) && !G.P(id).retired); return st.pids.every((id) => { const p = G.P(id); return p && p.team === G.user && !p.retired; }); }
const START_P = { afterMatch: 0.4, seasonStart: 0.5 };
export function tick(G, when, ctx) {
  const L = L_(G); sync(G); if (G.s.phase === 'offseason') return;
  let shown = 0;
  // after a match, stories lean towards days that already brought a decision, so quiet days stay quiet;
  // a follow-up that has waited three extra matches comes anyway
  const core = G.pendingDecisions().some((n) => !n.story);
  for (const st of Object.values(L.stories)) {
    if (st.status !== 'wait' || shown) continue; if (!waitReady(G, st)) continue;
    if (when === 'afterMatch' && !core && st.wait.um != null && !st.wait.y && (L.cnt.um || 0) < st.wait.um + 3) continue;
    if (!stillValid(G, st)) { st.status = 'done'; st.fizzled = true; st.end = G.year; continue; }
    if (st.wait.meet) { if (ctx.f && ctx.m && oppOf(G, ctx.f) === st.tid) { const won = ctx.m.result.winner === G.user; st.vars.result = `${short(G, G.user)} ${won ? 'won' : ctx.m.result.winner ? 'lost' : 'drew a blank in'} the grudge match: ${ctx.m.result.text}.`; } else st.vars.result ??= 'The two sides have met since.'; }
    if (present(G, st, st.wait.next)) shown++;
  }
  const open = Object.values(L.stories).filter((s) => s.status === 'open').length;
  const pStart = when === 'afterMatch' ? (core ? 0.65 : 0.04) : START_P[when] || 0;
  if (shown || open >= 2 || !G.userNext() || R() > pStart) return;
  const active = new Set(Object.values(L.stories).filter((s) => s.status !== 'done').map((s) => s.chain));
  const cands = CHAINS.filter((ch) => ch.when.includes(when) && !active.has(ch.id) && L.done[ch.id] !== G.year && condOk(G, ch.cond, null));
  for (const ch of weighted(cands)) if (startChain(G, ch)) return;
}
function weighted(list) { const a = list.map((c) => ({ c, k: R() ** (1 / (c.weight || 1)) })); return a.sort((x, y) => y.k - x.k).map((x) => x.c); }
export const storyList = (G) => Object.values(L_(G).stories).sort((a, b) => (a.status === 'open' ? -1 : 0) - (b.status === 'open' ? -1 : 0) || b.y - a.y);
export function storyChoices(G, st) {
  const ch = chainOf(st.chain); const sp = ch.steps[st.step]; const n = G.s.inbox.find((x) => x.id === st.newsId); const c = ctxOf(G, st);
  return sp.choices.map((x, i) => ({ l: fill(x.l, c), x: xLines(G, st, x.x), later: fill(x.later, c), i, n }));
}

// ----- press, rivalries, wire -----
// Heat from the press: other modules' press answers with a team id and a sharp tone count too.
export function notePress(G, tid, sharp, why = 'Press spat') { if (!tid || tid === G.user) return; nudgeRel(G, tid, { heat: sharp ? 8 : 2, respect: sharp ? -4 : 1, why }); if (sharp) wire(G, `Press spat with ${short(G, tid)}`, { kind: 'press', tid }); }
function scanPress(G) {
  const L = L_(G); const log = G.s.log || []; const from = L.pressSeen || 0; L.pressSeen = log.length;
  for (const e of log.slice(from)) { if (e.kind !== 'press') continue; const tid = e.tid || e.opp; if (tid && G.teams[tid]) notePress(G, tid, /hit back|fire|jibe|lucky|bold|provo|attack|rub|blast/i.test(`${e.pick} ${e.outcome}`)); }
}
export const heatLabel = (h) => (h >= 80 ? 'Fierce' : h >= 60 ? 'Heated' : h >= 40 ? 'Growing' : 'Mild');
export function rivalries(G) {
  return Object.keys(G.teams).filter((t) => t !== G.user && G.s.rel[t]).map((t) => ({ tid: t, ...G.s.rel[t] })).filter((r) => r.heat >= 25).sort((a, b) => b.heat - a.heat);
}
export function relLabel(G, tid) {
  const r = G.s.rel[tid] || { respect: 50, heat: 10, why: [] };
  if (r.heat >= 60) { const w = r.why[0] ? r.why[0].t : 'Bad blood'; return { t: `Rivals · ${w.charAt(0).toLowerCase()}${w.slice(1)}`, c: 'crim' }; }
  if (r.respect >= 68) return { t: 'Respectful', c: '' }; if (r.respect <= 35) return { t: 'Cold', c: 'crim' };
  return { t: r.heat >= 40 ? 'Edgy' : 'Neutral', c: '' };
}
function recordWatch(G) {
  const L = L_(G); const y = G.year; const rec = Math.max(0, ...G.s.history.filter((h) => h.year < y).map((h) => h.runs[0][2])); if (!rec) return;
  const lead = Object.values(G.players).filter((p) => p.stats[y]).sort((a, b) => b.stats[y].r - a.stats[y].r)[0]; if (!lead) return;
  const r = lead.stats[y].r; const W = (L.recWatch[y] ??= {});
  if (r > rec && !W.broken) { W.broken = lead.id; wire(G, `${lead.name} breaks the season record: ${r} runs`, { kind: 'record', sub: `The old record was ${rec}.` }); }
  else if (r >= rec - 60 && r <= rec && !W[lead.id] && G.s.phase === 'league') { W[lead.id] = 1; wire(G, `Record watch: ${lead.name} is ${rec - r + 1} runs from the season record`, { kind: 'record', sub: `The record is ${rec}.` }); }
}
export function weekGames(G) {
  const nf = G.s.fixtures.filter((f) => !f.res); const out = [];
  for (const f of nf) { if (isMine(G, f)) continue; if (out.length >= 4) break; const notes = [];
    for (const t of [f.home, f.away]) { const m = managerOf(G, t); if (m && m.care) notes.push(`caretaker ${m.name} in charge of ${short(G, t)}`); if (G.s.rel[t] && G.s.rel[t].heat >= 50) notes.push(`${short(G, t)} are rivals of yours`); }
    const st = G.standings(); const pos = (t) => st.findIndex((x) => x.id === t) + 1; if (f.stage === 'L' && pos(f.home) <= 4 && pos(f.away) <= 4) notes.push('a top-four clash');
    out.push({ f, notes }); }
  return out;
}

// ----- reputation, style, achievements -----
export const REP_TIERS = [['Local', 0], ['Respected', 45], ['National', 65], ['Legendary', 85]];
export const repTier = (rep) => REP_TIERS.filter((t) => rep >= t[1]).pop()[0];
export function styleLabels(G) {
  const log = G.s.log || []; const cnt = (re, kinds) => log.filter((e) => (!kinds || kinds.includes(e.kind)) && re.test(`${e.pick || ''}`)).length;
  const C = G.s.manager.career || []; const finals = Object.values(G.s.finals || {}).filter((f) => f.champ === G.user).length;
  const out = [];
  const y = cnt(/debut|young|youth|kids|academy|exam|let him sit/i) + (G.s.promiseLog || []).filter((p) => p.kind === 'debut' && p.result === 'kept').length; if (y >= 3) out.push({ t: 'Backs young players', n: y });
  const kind = cnt(/let them|back the|praise|fly his|clear the air|rally|give him|meet the|bring/i); const hard = cnt(/refuse|demand|earn it|fine |cricket first|he plays|stand firm|straight/i);
  if (kind >= 4 && kind > hard) out.push({ t: "Players' manager", n: kind }); if (hard >= 4 && hard >= kind) out.push({ t: 'Hard-liner', n: hard });
  const fiery = cnt(/hit back|rub it|reply on air|tell .* stay away/i); if (fiery >= 2) out.push({ t: 'Fiery in the press', n: fiery });
  const calm = cnt(/laugh|shake|invite|say nothing|fair pitch|apologise/i); if (calm >= 3) out.push({ t: 'Diplomat', n: calm });
  const risk = cnt(/attack|go for|all-out|gamble|injection/i, ['key', 'story', 'event']); if (risk >= 3) out.push({ t: 'Risk-taker', n: risk });
  let sp = 0, pc = 0; for (const id of G.teams[G.user].squad) { const p = G.P(id); const s = p.stats[G.year]; if (!s) continue; if (isSpin(p.type)) sp += s.bb; else if (isPace(p.type)) pc += s.bb; }
  if (sp + pc > 300) { if (sp / (sp + pc) > 0.45) out.push({ t: 'Spin-first', n: sp }); else if (pc / (sp + pc) > 0.72) out.push({ t: 'Pace attack', n: pc }); }
  if (finals >= 1 || C.filter((c) => c.runner).length >= 2) out.push({ t: 'Calm in big games', n: finals, gold: true });
  return out.slice(0, 4);
}
const titles = (G) => (G.s.manager.career || []).filter((c) => c.champ);
function bestRun(G) { let b = 0, r = 0; for (const c of G.s.manager.career || []) { r = c.champ ? r + 1 : 0; b = Math.max(b, r); } return b; }
function sameClub(G) { let b = 0, r = 0, prev = null; for (const c of G.s.manager.career || []) { r = c.team === prev ? r + 1 : 1; prev = c.team; b = Math.max(b, r); } return b; }
export const ACH = [
  { k: 'title', n: 'First title', d: 'Win the NPL', need: 1, have: (G) => titles(G).length },
  { k: 'b2b', n: 'Back to back', d: 'Win two titles in a row', need: 2, have: bestRun },
  { k: 'dynasty', n: 'Dynasty', d: '5 titles in 10 seasons', need: 5, have: (G) => (G.s.manager.career || []).slice(-10).filter((c) => c.champ).length },
  { k: 'final', n: 'Big stage', d: 'Reach a final', need: 1, have: (G) => (G.s.manager.career || []).filter((c) => c.champ || c.runner).length },
  { k: 'playoffs', n: 'Regulars', d: 'Reach the playoffs in 3 seasons', need: 3, have: (G) => (G.s.manager.career || []).filter((c) => c.pos <= 4 || c.champ || c.runner).length },
  { k: 'kids', n: 'Trust the kids', d: 'Pick a 20-year-old in a final', need: 1, have: (G) => L_(G).cnt.kidsFinal || 0 },
  { k: 'lastover', n: 'Last-over specialist', d: 'Win 3 games in the final over', need: 3, have: (G) => L_(G).cnt.lastOver || 0 },
  { k: 'allnep', n: 'All-Nepali champions', d: 'Win the final with no overseas player in the top 6', need: 1, have: (G) => L_(G).cnt.allNep || 0 },
  { k: 'academy', n: 'From the academy to Nepal', d: 'A young fictional player you developed earns a national cap', need: 1, have: (G) => Object.values(G.players).filter((p) => fictional(p) && p.nat === 'NEP' && (p.hist || []).some((h) => h.team === G.user) && p.intlG && p.intlG.t20i + p.intlG.odi > 0).length },
  { k: 'promises', n: 'Man of his word', d: 'Keep 10 promises', need: 10, have: (G) => (G.s.promiseLog || []).filter((p) => p.result === 'kept').length },
  { k: 'stories', n: 'Storyteller', d: 'See 10 stories through to the end', need: 10, have: (G) => L_(G).cnt.stories || 0 },
  { k: 'rival', n: 'Grudge match', d: 'Beat a fierce rival (heat 70+) 3 times', need: 3, have: (G) => L_(G).cnt.rivalWins || 0 },
  { k: 'sellout', n: 'Full house', d: 'Sell out Kirtipur 5 times', need: 5, have: (G) => L_(G).cnt.sellouts || 0 },
  { k: 'press', n: 'Press-proof', d: 'Answer 10 press conferences', need: 10, have: (G) => (G.s.log || []).filter((e) => e.kind === 'press').length },
  { k: 'loyal', n: 'One-club manager', d: 'Manage the same club for 5 seasons', need: 5, have: sameClub },
  { k: 'seasons', n: 'The long game', d: 'Manage 10 seasons', need: 10, have: (G) => (G.s.manager.career || []).length },
  { k: 'national', n: 'National figure', d: 'Reach reputation 65', need: 65, have: (G) => G.s.manager.rep },
  { k: 'legend', n: 'Legend', d: 'Reach reputation 85', need: 85, have: (G) => G.s.manager.rep },
];
export function achievements(G) { const L = L_(G); return ACH.map((a) => { const have = Math.min(a.need, a.have(G)); return { ...a, have, done: !!L.ach[a.k], y: L.ach[a.k] && L.ach[a.k].y }; }); }
export function checkAch(G) {
  const L = L_(G); const out = [];
  for (const a of ACH) { if (L.ach[a.k]) continue; if (a.have(G) >= a.need) { L.ach[a.k] = { y: G.year }; out.push(a); G.news(`Achievement unlocked: ${a.n}`, 'board', { detail: a.d, ne: 'उपलब्धि' }); } }
  return out;
}
// Trophy cabinet: titles as manager, each linked to the archived final.
export function cabinet(G) {
  return titles(G).map((c) => { const f = G.s.finals[c.year]; const opp = f ? (f.home === c.team ? f.away : f.home) : null; return { y: c.year, team: c.team, opp, text: f && f.res ? f.res.text : null, link: f ? `/scorecard/F${c.year}` : null }; });
}
// Job interest: real offers, clubs that might listen, and Nepal A from reputation 80.
export function jobs(G) {
  const L = L_(G); const rep = G.s.manager.rep; const out = [];
  const window = ['seasonEnd', 'offseason'].includes(G.s.phase);
  if (window) for (const tid of G.s.offers || []) if (tid !== G.user && G.teams[tid]) out.push({ tid, kind: 'offer', line: 'Offer on the table', canTake: true });
  if (rep >= 50) for (const tid in L.mgr) { const m = L.mgr[tid]; if (window && (G.s.offers || []).includes(tid)) continue; if (m.care || m.sec < 35) out.push({ tid, kind: 'interest', line: m.care ? 'Caretaker in charge · looking for a permanent manager' : `Their manager is under pressure (${m.sec})`, listened: L.listen[tid] === G.year }); }
  out.push({ tid: null, kind: 'nepalA', line: L.nepalA ? `You coach Nepal A as well, since ${L.nepalA.y}` : rep >= 80 ? 'Offered: coach Nepal A alongside your club job' : 'Needs reputation 80', locked: rep < 80 && !L.nepalA, taken: !!L.nepalA });
  return out;
}
export function listenTo(G, tid) { L_(G).listen[tid] = G.year; logDecision(G, 'other', `Interest from ${G.teams[tid].name}`, 'Listened', 'They may make an offer at the end of the season if your reputation holds (55+).'); }
export function takeNepalA(G) { if (G.s.manager.rep < 80 || L_(G).nepalA) return false; L_(G).nepalA = { y: G.year }; logDecision(G, 'other', 'Nepal A coach', 'Accepted', 'Reputation +1 a season; you see Nepal\'s young free agents\' potential.'); return true; }

// ----- farewells and the Hall of Fame vote -----
export const farewellCandidates = (G) => G.teams[G.user].squad.map((id) => G.P(id)).filter((p) => p.age >= 35 || (p.age >= 33 && ovr(p) < 60));
export function planFarewell(G, pid) { const p = G.P(pid); if (!p) return false; L_(G).farewell[pid] = { y: G.year, played: false }; logDecision(G, 'other', `Farewell for ${p.name}`, 'Planned', 'A guard of honour at the last league match, if he plays.', { pid }); return true; }
function careerTitles(G, p) { return G.s.history.filter((h) => !h.real && (p.hist || []).some((x) => x.year === h.year && x.team === h.champion) && p.stats[h.year]).length; }
export function hofScore(G, p, fw) { const c = careerOf(p); return Math.round(clamp(20 + c.r / 45 + c.w * 1.1 + c.h * 3 + careerTitles(G, p) * 8 + (fw ? 6 : 0), 0, 99)); }
function openBallot(G) {
  const L = L_(G); const ids = G.s.lastRetired || []; const list = [];
  for (const id of ids) { const p = G.P(id); if (!p) continue; const c = careerOf(p); if (c.m < 20) continue; const fw = L.farewell[id] && L.farewell[id].played; list.push({ pid: id, name: p.name, nat: p.nat, m: c.m, r: c.r, w: c.w, pct: hofScore(G, p, fw), farewell: !!fw, mine: p.prevTeam === G.user, vote: null }); }
  for (const id in L.farewell) if (L.farewell[id].y < G.year && !(G.P(id) || {}).retired) delete L.farewell[id];
  L.ballot = list.length ? { y: G.year - 1, list: list.sort((a, b) => b.pct - a.pct).slice(0, 8) } : null;
  if (L.ballot) G.news(`Hall of Fame ballot: ${L.ballot.list.length} retired player${L.ballot.list.length > 1 ? 's' : ''}`, 'league', { detail: 'Cast your vote on the History page before the season starts. 75% gets a player in.' });
}
export function castVote(G, pid, yes) { const b = L_(G).ballot; const e = b && b.list.find((x) => x.pid === pid); if (!e) return; e.vote = yes; logDecision(G, 'other', `Hall of Fame vote: ${e.name}`, yes ? 'Yes' : 'No', ''); }
export function closeBallot(G) {
  const L = L_(G); const b = L.ballot; if (!b) return; L.ballot = null;
  for (const e of b.list) { const pct = clamp(e.pct + (e.vote === true ? 4 : e.vote === false ? -4 : 0), 0, 99); const already = G.s.hof.some((h) => h.name === e.name); const inn = already || pct >= 75;
    if (inn && !already) G.s.hof.push({ name: e.name, nat: e.nat, y: b.y, r: e.r, w: e.w, m: e.m, vote: pct });
    L.votes.unshift({ ...e, pct, in: inn, y: b.y }); if (inn && e.mine) G.news(`${e.name} is voted into the Hall of Fame`, 'league', { detail: `${pct}% of the vote. In your game.` }); }
  L.votes.length = Math.min(L.votes.length, 30);
}

// ----- challenge scenarios (new saves) -----
export const CHALLENGES = [
  { k: 'rescue', n: 'Rescue Janakpur', d: 'Take the 2026 Janakpur Bolts, board patience thin, and reach the playoffs in your first season.', tag: 'Hard', team: 'JB' },
  { k: 'nostars', n: 'No overseas stars', d: 'Win the title with no overseas player rated over 70 in your squad.', tag: 'Very hard' },
  { k: 'dynasty', n: 'Dynasty', d: 'Win 5 titles in 10 seasons.', tag: 'Long' },
  { k: 'shoestring', n: 'Shoestring', d: 'Start with Rs 20 L in the bank and an anxious board; finish a season in profit and in the top four.', tag: 'Hard' },
];
export function applyChallenge(G, k) {
  const c = CHALLENGES.find((x) => x.k === k); if (!c) return; const t = G.teams[G.user]; L_(G).challenge = { k, y: G.year, status: 'running' };
  if (k === 'rescue') { t.board = 45; t.fans = clamp(t.fans - 10, 0, 100); for (const id of t.squad) G.P(id).morale = clamp(G.P(id).morale - 8, 0, 100); }
  if (k === 'nostars') { for (const id of t.squad.slice()) { const p = G.P(id); if (p.nat !== 'NEP' && ovr(p) > 70) G.releasePlayer(id); } }
  if (k === 'shoestring') { t.balance = 20; t.board = 50; }
  G.news(`Challenge: ${c.n}`, 'board', { detail: c.d });
}
export function checkChallenge(G, end) {
  const L = L_(G); const c = L.challenge; if (!c || c.status !== 'running') return; const t = G.teams[G.user]; const C = G.s.manager.career || [];
  if (c.k === 'nostars') { if (t.squad.some((id) => G.P(id).nat !== 'NEP' && ovr(G.P(id)) > 70)) { c.status = 'failed'; c.why = 'An overseas player over 70 joined the squad'; } else if (titles(G).length) c.status = 'won'; }
  if (!end) return;
  const last = C[C.length - 1];
  if (c.k === 'rescue' && last) c.status = last.pos <= 4 || last.champ || last.runner ? 'won' : 'failed';
  if (c.k === 'shoestring' && last) c.status = last.pos <= 4 && t.balance > 20 ? 'won' : C.length >= 3 ? 'failed' : 'running';
  if (c.k === 'dynasty') { if (C.slice(0, 10).filter((x) => x.champ).length >= 5) c.status = 'won'; else if (C.length >= 10) c.status = 'failed'; }
  if (c.status !== 'running') G.news(`Challenge ${c.status === 'won' ? 'complete' : 'failed'}: ${CHALLENGES.find((x) => x.k === c.k).n}`, 'board');
}

// ----- the deeper player profile -----
const REVEAL = { temper: 0, pro: 2, flair: 3, big: 4, lead: 5, amb: 6, loyal: 8, flaw: 10 };
export function revealed(G, p, k) { if (p.team === G.user) return (p.seen || 0) >= REVEAL[k] || (p.scouted && REVEAL[k] <= 4); return !!p.scouted && REVEAL[k] <= 4; }
const lvl = (v) => (v >= 70 ? 'High' : v >= 45 ? 'Medium' : 'Low');
export function traitRows(G, p) {
  const T = p.traits || {}; const fic = fictional(p);
  const rows = [
    ['pro', 'Professionalism', T.pro, (v) => `${lvl(v)}${fic && v >= 75 ? ' · first at nets' : ''}`],
    ['amb', 'Ambition', T.amb, (v) => `${lvl(v)}${fic && v >= 70 ? (p.nat === 'NEP' ? ' · wants a Nepal cap' : ' · wants a bigger league') : ''}`],
    ['temper', 'Temperament', p.temper, (v) => (v >= 75 ? 'Calm' : v >= 55 ? 'Steady' : 'Volatile')],
    ['big', 'Under pressure', T.big, (v) => (v >= 70 ? 'Rises to it' : v >= 45 ? 'Holds steady' : 'Can freeze')],
    ['loyal', 'Loyalty', T.loyal, lvl], ['lead', 'Leadership', T.lead, lvl], ['flair', 'Flair', T.flair, lvl],
  ];
  const out = rows.map(([k, label, v, f]) => ({ k, label, known: revealed(G, p, k), text: v == null ? '—' : f(v), gold: k === 'big' && v >= 70 }));
  if (fic && T.flaw) out.push({ k: 'flaw', label: 'Flaw', known: revealed(G, p, 'flaw'), text: T.flaw, crim: true });
  return out;
}
export function traitChips(G, p) {
  const T = p.traits || {}; const c = [];
  if (revealed(G, p, 'pro') && T.pro >= 75) c.push({ t: 'Professional' }); if (revealed(G, p, 'amb') && T.amb >= 75) c.push({ t: 'Ambitious' });
  if (revealed(G, p, 'big') && T.big >= 70) c.push({ t: 'Big-game player', c: 'g' }); if (revealed(G, p, 'lead') && T.lead >= 75) c.push({ t: 'Leader' });
  const w = (p.team === G.user || p.scouted) && weakestVs(G, p.id); if (w && w.rpo < 7) c.push({ t: `Weak against ${w.label.toLowerCase()}`, c: 'r' });
  return c;
}
export function relationships(G, p) {
  const out = []; if (!p.team) return out; const t = G.teams[p.team];
  if (t.captainId && t.captainId !== p.id && G.P(t.captainId)) out.push({ who: G.P(t.captainId).name, pid: t.captainId, t: 'His captain' });
  if (p.team === G.user) { const st = G.s.staff[G.user] || {}; const x = p.role === 'BOWL' ? st.bowl : st.bat; if (x) out.push({ who: `${x.name}, ${p.role === 'BOWL' ? 'bowling' : 'batting'} coach`, t: 'Works with him' }); }
  if (p.mentor && G.P(p.mentor)) out.push({ who: G.P(p.mentor).name, pid: p.mentor, t: 'His mentor', c: 'blu' });
  for (const id of t.squad) { const q = G.P(id); if (q.mentor === p.id) out.push({ who: q.name, pid: q.id, t: 'He mentors him' }); }
  if (fictional(p)) { const f = t.squad.map((id) => G.P(id)).find((q) => q.id !== p.id && fictional(q) && ((q.prov && q.prov === p.prov) || (p.nat !== 'NEP' && q.nat === p.nat))); if (f) out.push({ who: f.name, pid: f.id, t: 'Close friend', c: 'blu' }); }
  if (p.team === G.user) out.push({ who: 'You', t: `${(p.happy ?? 70) >= 65 ? 'Happy with you' : (p.happy ?? 70) >= 45 ? 'Fine with you' : 'Unhappy with you'} · ${Math.round(p.happy ?? 70)}${p.happyWhy ? ` · ${p.happyWhy}` : ''}` });
  return out;
}
export function timeline(G, p) {
  const ev = []; const seen = new Set(); let prev = null;
  for (const h of p.hist || []) { if (h.team !== prev) ev.push({ y: h.year, t: prev ? `Joins ${G.teams[h.team] ? G.teams[h.team].name : h.team}` : `Starts with ${G.teams[h.team] ? G.teams[h.team].name : h.team}` }); prev = h.team; }
  let fifty = false, hund = false;
  for (const y of Object.keys(p.stats || {}).sort()) { const s = p.stats[y]; const parts = [`${s.m} matches`]; if (s.r) parts.push(`${s.r} runs`); if (s.w) parts.push(`${s.w} wickets`);
    let mile = null; if (!hund && s.h) { hund = true; mile = '100'; } else if (!fifty && s.ff) { fifty = true; mile = '50'; }
    ev.push({ y: +y, t: `${s.team && G.teams[s.team] ? short(G, s.team) : 'NPL'}: ${parts.join(', ')}${mile ? (mile === '100' ? ' · first NPL hundred' : ' · first NPL fifty') : ''}`, mile }); }
  const byEvt = {}; for (const e of p.intlLog || []) { const k = `${e.y}|${e.evt}`; if (!byEvt[k]) byEvt[k] = { y: e.y, evt: e.evt, n: 0, r: 0, w: 0 }; byEvt[k].n++; byEvt[k].r += e.r; byEvt[k].w += e.w; }
  for (const e of Object.values(byEvt)) ev.push({ y: e.y, t: `Nepal ${e.evt}: ${e.n} game${e.n > 1 ? 's' : ''}, ${e.r} runs, ${e.w} wkts`, intl: true });
  for (const st of Object.values(L_(G).stories)) if (st.pids.includes(p.id) && chainOf(st.chain).personal && fictional(p)) { const k = st.chain + st.y; if (seen.has(k)) continue; seen.add(k); ev.push({ y: st.y, t: `Story: ${chainOf(st.chain).title.toLowerCase()}${st.last ? ` · ${st.last.pick}` : ''}`, story: st.id }); }
  if (p.retired) ev.push({ y: p.retiredYear, t: 'Retires' });
  return ev.sort((a, b) => a.y - b.y);
}
export function mentorOptions(G, p) {
  if (p.team !== G.user) return []; const o = ovr(p); const bat = p.role !== 'BOWL';
  return G.teams[G.user].squad.map((id) => G.P(id)).filter((q) => q.id !== p.id && q.age >= 27 && (bat ? q.bat >= p.bat + 4 : q.bowl >= p.bowl + 4) && ovr(q) >= o);
}
export function projection(G, p) {
  const o = ovr(p); const a = p.age; let d = a <= 20 ? 4 : a <= 23 ? 3 : a <= 26 ? 1.5 : a <= 30 ? 0.5 : a <= 33 ? -1.5 : -3;
  if (p.team && a < 26) { const L = G.staffLevel(p.team, p.role === 'BOWL' ? 'bowl' : 'bat'); d += Math.round(L / 2); }
  if (p.mentor && a <= 25) d += 1; if (p.team && G.teams[p.team].training === 'Intense' && d > 0) d += 0.5;
  let to = Math.round(o + d); if (d > 0) to = Math.min(to, Math.max(o, p.pot)); return { from: o, to };
}
export const TALK = [
  ['praise', 'Praise his recent form'], ['weak', 'Talk about his weak spot'], ['future', 'Discuss his future here'], ['criticise', 'Criticise his last two scores'],
];
// Conversation: fictional players answer in their own words; real players talk cricket only, with no quotes.
export function talk(G, p, k) {
  const key = `${G.year}-${L_(G).cnt.um || 0}`; if (p.talked === key) return { reply: 'You have already spoken to him since the last match.', none: true };
  p.talked = key; const fic = fictional(p); const T = p.traits || {}; const w = weakestVs(G, p.id); let reply, d = 0;
  if (k === 'praise') { d = 3; reply = fic ? (T.amb >= 65 ? '"Thanks, coach. I want more, though. I want to be the first name on the sheet."' : '"Thank you. It means a lot from you."') : 'You go through his recent innings and spells together.'; }
  if (k === 'weak') { d = T.pro >= 60 ? 1 : -1; if (T.pro >= 60) p.form = clamp(p.form + 0.5, -10, 10); reply = fic ? (T.pro >= 60 ? `"I know. I've been staying late in the nets${w ? ` against ${w.label.toLowerCase()}` : ''}."` : '"Everyone has a weak spot. I\'ll be fine."') : `You work through the footage${w ? ` against ${w.label.toLowerCase()}` : ''} with the analyst.`; }
  if (k === 'future') { d = 2; reply = fic ? (T.amb >= 65 ? (p.nat === 'NEP' ? '"I want to play for Nepal. Can this club get me there?" He would like a new deal.' : '"I like it here. I would like a longer deal."') : '"I am happy here. Let\'s keep winning."') : 'You talk through his role for the rest of the season.'; }
  if (k === 'criticise') { d = T.pro >= 70 ? -1 : -4; if (T.pro >= 70) p.form = clamp(p.form + 0.5, -10, 10); reply = fic ? (T.pro >= 70 ? 'He nods. "Fair. I\'ll fix it."' : 'He goes quiet. Morale dips a little.') : 'You tell him what you expect from his next innings.'; }
  happyOf(G, p.id, d, 'A talk with you'); const out = `${reply} Happiness ${d >= 0 ? '+' : '−'}${Math.abs(d)}.`;
  logDecision(G, 'other', `Talk with ${p.name}`, TALK.find((t) => t[0] === k)[1], out, { pid: p.id });
  return { reply, d };
}
// Last ten innings for the user's club (p.l10), or this season's from the scorecards.
export function lastTen(G, p, appearances) {
  if (p.l10 && p.l10.length) return p.l10.map(([y, n, r, out, opp]) => ({ y, n, r, out: !!out, opp, link: y === G.year ? `/scorecard/${n}` : null }));
  return appearances(G, p).filter((e) => e.r != null).slice(-10).map((e) => ({ y: G.year, n: e.n, r: e.r, out: e.out, opp: e.opp, link: `/scorecard/${e.n}` }));
}
