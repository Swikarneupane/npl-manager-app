// ===== Phase 2 module: occasions (playoff week, final week, trophy, season review) =====
// State lives in G.s.occ (per season, reset at seasonStart):
//   y        the season it belongs to
//   fw       final-week choices { media, rest, train, select, lead, talk }: { k, pick, auto, pid? }
//   rest     playoff training plans by stage { Q1|EL|Q2|F: k }
//   q2w      the user watched Qualifier 2 (unlocks the fuller opposition report)
//   q2log    Qualifier 2's commentary, compacted [[over, text, class]]
//   fin      the final's closing balls and winning ball, for the trophy ceremony
//   lift     who lifted the trophy { k, pid, name }, applied once
//   seen     { po, final, trophy, review } screens visited (for the "today" list)
//   start    board, fans and reputation when the season began (for the review deltas)
//   revs     season review snapshots, the last three seasons [{ y, ... }]
import { clamp, ovr } from './engine.js';
import { NE_TEAM } from './data.js';
import { logDecision, decisions, adjustHappy, nudgeTrust, nudgePillar, nudgeRel, PILLARS } from './depth.js';
const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

const STAGES = ['Q1', 'EL', 'Q2', 'F'];
export const STAGE_NAME = { L: 'League', Q1: 'Qualifier 1', EL: 'Eliminator', Q2: 'Qualifier 2', F: 'Final' };
export const STAGE_NE = { Q1: 'पहिलो क्वालिफायर', EL: 'एलिमिनेटर', Q2: 'दोस्रो क्वालिफायर', F: 'फाइनल' };
const PRIZE = { champ: 100, runner: 50 }; // Rs L, as paid in G.seasonAwards
const sur = (name) => String(name).split(' ').slice(-1)[0];
const short = (G, tid) => G.teams[tid].name.split(' ')[0];
function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }

// ----- state -----
function fresh(G, keep) { return { y: G.year, fw: {}, rest: {}, q2w: false, q2log: null, fin: null, lift: null, seen: {}, start: null, revs: (keep && keep.revs) || [] }; }
export function occ(G) { const s = G.s; if (!s.occ) s.occ = fresh(G); return s.occ; }
export function migrate(G) {
  const s = G.s; if (!s || s.year == null) return;
  s.occ ??= fresh(G);
  const o = s.occ; o.fw ??= {}; o.rest ??= {}; o.seen ??= {}; o.revs ??= []; o.q2w ??= false; o.y ??= s.year;
}
export function seasonStart(G) {
  const o = (G.s.occ = fresh(G, G.s.occ)); const t = G.teams[G.user];
  o.start = { board: t.board, fans: Math.round(t.fans), rep: G.s.manager ? G.s.manager.rep : null, pillars: G.s.pillars ? { ...G.s.pillars } : null };
}
export function offseason(G) { const o = occ(G); o.q2log = null; } // the replay is only for playoff week

// ----- playoff state -----
const userIn = (G, f) => !!f && (f.home === G.user || f.away === G.user);
const stageFix = (G, st) => (G.s.fixtures || []).find((f) => f.stage === st) || null;
export function playoffFixtures(G) { const o = {}; for (const st of STAGES) o[st] = stageFix(G, st); return o; }
// The playoff winner, as advancePlayoffs decides it (a no-result goes to the higher seed).
export function winnerOf(G, f) {
  if (!f || !f.res) return null; if (f.res.winner) return f.res.winner;
  const st = G.standings(); const rank = (id) => st.findIndex((x) => x.id === id);
  return rank(f.home) < rank(f.away) ? f.home : f.away;
}
const loserOf = (G, f) => { const w = winnerOf(G, f); return w ? (w === f.home ? f.away : f.home) : null; };
// Where the user stands: none (league still on), missed, Q1, EL, Q2 (that match is next), wait (won Q1,
// waiting for the final opponent), final, out, champion, runner.
export function poStatus(G) {
  const P = playoffFixtures(G); const u = G.user;
  if (!P.Q1) return { st: G.s.phase === 'league' || G.s.phase === 'preseason' ? 'none' : 'missed', P };
  if (!userIn(G, P.Q1) && !userIn(G, P.EL)) return { st: 'missed', P };
  if (P.F && userIn(G, P.F)) return { st: P.F.res ? (winnerOf(G, P.F) === u ? 'champion' : 'runner') : 'final', P, next: P.F.res ? null : P.F };
  if (P.F) return { st: 'out', P, outAt: userIn(G, P.Q2) ? 'Q2' : 'EL' };
  if (userIn(G, P.Q1)) {
    if (!P.Q1.res) return { st: 'Q1', P, next: P.Q1 };
    if (winnerOf(G, P.Q1) === u) return { st: 'wait', P };
    return P.Q2 && P.Q2.res ? { st: 'out', P, outAt: 'Q2' } : { st: 'Q2', P, next: P.Q2 };
  }
  if (!P.EL.res) return { st: 'EL', P, next: P.EL };
  if (winnerOf(G, P.EL) !== u) return { st: 'out', P, outAt: 'EL' };
  return P.Q2 && P.Q2.res ? { st: 'out', P, outAt: 'Q2' } : { st: 'Q2', P, next: P.Q2 };
}
// Teams the user could still meet in the final.
export function finalOpponents(G) {
  const { st, P } = poStatus(G); const u = G.user;
  if (st === 'final') return [P.F.home === u ? P.F.away : P.F.home];
  if (st === 'wait') { if (P.Q2) return [P.Q2.home, P.Q2.away]; return P.EL.res ? [loserOf(G, P.Q1), winnerOf(G, P.EL)] : [loserOf(G, P.Q1), P.EL.home, P.EL.away]; }
  if (st === 'Q2' || st === 'EL') return P.Q1.res ? [winnerOf(G, P.Q1)] : [P.Q1.home, P.Q1.away];
  if (st === 'Q1') return [P.Q1.home === u ? P.Q1.away : P.Q1.home, P.EL.home, P.EL.away];
  return [];
}

// ----- comparisons and reports -----
function xiOf(G, tid) {
  const t = G.teams[tid];
  if (tid === G.user && G.validXI(tid, t.xi)) return t.xi.slice();
  if (tid === G.user && t.lastXI && G.validXI(tid, t.lastXI.xi)) return t.lastXI.xi.slice();
  return G.autoXI(tid);
}
export function modelOdds(G, a, b) {
  const xa = xiOf(G, a), xb = xiOf(G, b);
  return G.winChance(G.teamStrength(xa, G.autoOrder(xa)), G.teamStrength(xb, G.autoOrder(xb)));
}
const score = (s) => s.r + s.w * 22 + s.ct * 4;
// A team's most dangerous player this season, by runs and wickets.
export function dangerMan(G, tid) {
  const y = G.year; let best = null;
  for (const id of G.teams[tid].squad) { const p = G.P(id); const s = p.stats[y]; if (!s || !s.m) continue; const v = score(s); if (!best || v > best.v) best = { p, v, s }; }
  if (!best) return null; const s = best.s;
  const fig = s.w >= 8 && s.w * 22 > s.r ? `${s.w} wickets` : `${s.r} runs`;
  return { pid: best.p.id, name: best.p.name, fig, last: best.p.age >= 36 };
}
export function seasonVs(G, tid) {
  let w = 0, l = 0; for (const f of G.s.fixtures) if (f.res && userIn(G, f) && (f.home === tid || f.away === tid)) { const x = winnerOf(G, f); if (f.res.nr && f.stage === 'L') continue; if (x === G.user) w++; else if (x) l++; }
  return { w, l };
}
export function compareRow(G, tid) {
  const vs = seasonVs(G, tid); const dm = dangerMan(G, tid);
  return { tid, vs, form: (G.teams[tid].form || []).slice(-5), danger: dm, odds: modelOdds(G, G.user, tid) };
}
// The fuller report once Qualifier 2 has been watched: the opponent's Q2 card and their weakest phase.
export function q2Report(G, tid) {
  const q2 = stageFix(G, 'Q2'); if (!q2 || !q2.card || (q2.home !== tid && q2.away !== tid)) return null;
  const batInn = q2.card.find((i) => i.t === tid), bowlInn = q2.card.find((i) => i.t !== tid);
  const topBat = batInn ? batInn.bat.slice().sort((a, b) => b[1] - a[1])[0] : null;
  const topBowl = bowlInn ? bowlInn.bowl.slice().sort((a, b) => b[3] - a[3] || a[2] - b[2])[0] : null;
  const E = G.s.phaseEco && G.s.phaseEco[G.year] && G.s.phaseEco[G.year][tid];
  let weak = null; if (E) for (const k of ['pp', 'mid', 'death']) { const [r, b] = E[k]; if (b >= 30) { const rpo = (r / b) * 6; if (!weak || rpo > weak.rpo) weak = { k, rpo }; } }
  const PH = { pp: 'powerplay (overs 1–6)', mid: 'middle overs (7–15)', death: 'death (16–20)' };
  return {
    bat: topBat ? `${topBat[0]} ${topBat[1]} (${topBat[2]})` : null,
    bowl: topBowl ? `${topBowl[0]} ${topBowl[3]}-${topBowl[2]} (${Math.floor(topBowl[1] / 6)}${topBowl[1] % 6 ? '.' + (topBowl[1] % 6) : ''} ov)` : null,
    weak: weak ? `They leak the most in the ${PH[weak.k]}: ${weak.rpo.toFixed(1)} an over this season` : null,
    res: q2.res.text,
  };
}

// ----- commentary storage -----
const KEEP = new Set(['head', 'wkt', 'four', 'six', 'mile', 'drs', 'result', 'over', 'comp']);
export const compactLog = (log) => log.filter((e) => KEEP.has(e.c)).map((e) => [e.o || '', e.t, e.c]);
export function afterMatch(G, m, f) {
  if (!f || !STAGES.includes(f.stage)) return; const o = occ(G);
  if (f.stage === 'Q2') o.q2log = compactLog(m.log);
  if (f.stage === 'F') {
    const balls = m.log.filter((e) => e.ball); const last = balls[balls.length - 1] || null;
    o.fin = { n: f.n, y: G.year, win: last ? { o: last.o, t: last.t, ev: last.ev, bt: last.bt, bw: last.bw } : null, tail: compactLog(m.log.slice(-40)).slice(-8) };
  }
  if (!userIn(G, f) && f.stage !== 'Q2') return;
  // playoff news for the user's club
  const u = G.user, T = G.teams; const w = winnerOf(G, f);
  if (f.stage === 'Q1' && userIn(G, f)) {
    if (w === u) G.news(`Into the final: ${T[u].name} won Qualifier 1. Playoff week starts now: rest the squad, watch Qualifier 2 and face the media.`, 'league', { ne: `${NE_TEAM[u]} फाइनलमा!` });
    else G.news(`Qualifier 1 lost, but ${T[u].name} get a second chance in Qualifier 2.`, 'league', { ne: 'दोस्रो क्वालिफायरमा अर्को मौका' });
  }
  if (f.stage === 'Q2') {
    const q1 = stageFix(G, 'Q1'); const fw = winnerOf(G, q1);
    if (fw === u) G.news(`Your final opponent is ${T[w].name}. Final week: three days, six decisions.`, 'league', { ne: `फाइनलमा ${NE_TEAM[w]}सँग भिडन्त` });
    else if (w === u) G.news(`${T[u].name} are in the final against ${T[fw].name}. Final week starts now.`, 'league', { ne: `${NE_TEAM[u]} फाइनलमा!` });
  }
  if ((f.stage === 'EL' || f.stage === 'Q2') && userIn(G, f) && w !== u) G.news(`${T[u].name} are out of the playoffs. The season review is ready once the final is played.`, 'board', { ne: 'प्लेअफबाट बाहिर' });
}

// ----- final week -----
export const FW_DAYS = ['Day 1', 'Day 2', 'Matchday'];
const XI_NOW = (G) => xiOf(G, G.user);
function finalCtx(G) {
  const fin = stageFix(G, 'F'); const u = G.user; const t = G.teams[u];
  const opp = fin && userIn(G, fin) ? (fin.home === u ? fin.away : fin.home) : null;
  const xi = XI_NOW(G).map((id) => G.P(id));
  const cap = t.captainId && G.P(t.captainId) ? G.P(t.captainId) : xi.slice().sort((a, b) => ovr(b) - ovr(a))[0];
  const byAge = xi.slice().sort((a, b) => b.age - a.age);
  const old = byAge.find((p) => p.id !== cap.id) || byAge[0];
  const young = byAge.slice().reverse().find((p) => p.id !== cap.id && p.id !== old.id) || byAge[byAge.length - 1];
  return { fin, opp, xi, cap, old, young };
}
// Each task: options with labels and the effect line shown on the button. apply() returns the outcome.
export function fwTasks(G) {
  const c = finalCtx(G); const opp = c.opp ? short(G, c.opp) : 'the other finalist';
  const load = tiredOnes(G);
  return [
    { id: 'media', day: 0, title: 'Media day', ne: 'मिडिया दिवस', sub: `Both captains and managers on the stage. The first question: “Are you favourites?”`,
      opts: [
        { k: 'bold', l: '“We came here to win it”', fx: `Fan support +3, squad morale +2; ${opp} are fired up` },
        { k: 'respect', l: '“Credit to them, it’s 50-50”', fx: `Conduct and media +3, ${opp}'s manager respects you more` },
        { k: 'players', l: '“Ask the players, they got us here”', fx: 'Captain’s trust +3, the XI a little happier' },
      ] },
    { id: 'rest', day: 0, title: 'Final training plan', ne: 'प्रशिक्षण योजना', sub: load.length ? `${load.map((p) => sur(p.name)).join(' and ')} carried the heaviest load` : 'Nobody is carrying a heavy load',
      opts: [
        { k: 'rest', l: 'Rest the tired ones', fx: load.length ? `${load.map((p) => sur(p.name)).join(', ')} fitness +10; the rest +4` : 'Everyone fitness +4' },
        { k: 'light', l: 'Light session for everyone', fx: 'Everyone fitness +5' },
        { k: 'sim', l: 'Match simulation', fx: 'The XI’s form +1, fitness −2' },
      ] },
    { id: 'train', day: 1, title: 'Open or closed training?', ne: 'खुला वा बन्द प्रशिक्षण', sub: `Open: fan support up, ${opp}'s analyst watches. Closed: your plan stays hidden.`,
      opts: [
        { k: 'open', l: 'Open to the fans', fx: `Fan support +4, fans and community +2; ${opp} a little calmer on the day` },
        { k: 'closed', l: 'Closed doors', fx: 'Your side calmer on the day (composure +2); fan support −1' },
      ] },
    { id: 'select', day: 1, title: 'Selection meeting', ne: 'छनोट बैठक', sub: 'Stick with the side that got here, or pick the final XI on form and fitness',
      opts: [
        { k: 'same', l: 'Keep the XI that got us here', fx: 'Those 11 happier (+4), captain’s trust +2; the bench −2' },
        { k: 'form', l: 'Pick on form and fitness', fx: 'The best available XI is picked; anyone left out −4, anyone brought in +4' },
      ] },
    { id: 'lead', day: 2, title: 'Who leads the team out', ne: 'टोलीको अगुवाइ कसले गर्ने', sub: 'Each choice lifts a different player',
      opts: [
        { k: 'cap', pid: c.cap.id, l: `${c.cap.name}, the captain`, fx: `His composure +6 in the final, captain’s trust +4` },
        { k: 'old', pid: c.old.id, l: `${c.old.name}, the oldest (${c.old.age})`, fx: `His composure +8; the senior players happier` },
        { k: 'young', pid: c.young.id, l: `${c.young.name}, the youngest (${c.young.age})`, fx: `His composure +8, fan support +2; captain’s trust −2` },
      ] },
    { id: 'talk', day: 2, title: 'Team talk', ne: 'टिम टक', sub: 'Final-day tones: “Legacy” and “For the province”',
      opts: [
        { k: 'legacy', l: 'Legacy: “This is what they will remember”', fx: 'Team composure +6; big-game players +4 more, nervous ones −3' },
        { k: 'province', l: `For the province: “${G.teams[G.user].province} is watching”`, fx: 'Team composure +4, Nepali players +3, fan support +3' },
        { k: 'calm', l: 'Calm: “Same as any other game”', fx: 'Team composure +3, captain’s trust +1' },
      ] },
  ];
}
// Sensible defaults for the assistant, and when a task is left unanswered on matchday.
export const FW_DEFAULT = { media: 'respect', rest: 'light', train: 'closed', select: 'same', lead: 'cap', talk: 'calm' };
function tiredOnes(G) {
  const t = G.teams[G.user];
  return t.squad.map((id) => G.P(id)).filter((p) => G.available(p) && p.fit < 92).sort((a, b) => a.fit - b.fit).slice(0, 2);
}
const XI_IDS = (G) => XI_NOW(G);
function applyRest(G, k) {
  const t = G.teams[G.user]; const sq = t.squad.map((id) => G.P(id));
  if (k === 'rest') { const tired = new Set(tiredOnes(G).map((p) => p.id)); for (const p of sq) p.fit = clamp(p.fit + (tired.has(p.id) ? 10 : 4), 0, 100); return tired.size ? `${[...tired].map((id) => G.P(id).name).join(' and ')} fitness +10, the rest +4` : 'Everyone fitness +4'; }
  if (k === 'light') { for (const p of sq) p.fit = clamp(p.fit + 5, 0, 100); return 'Everyone fitness +5'; }
  const xi = XI_IDS(G); for (const id of xi) { const p = G.P(id); p.form = clamp(p.form + 1, -10, 10); p.fit = clamp(p.fit - 2, 40, 100); }
  return 'The XI form +1, fitness −2';
}
function applyFw(G, id, k, opt) {
  const t = G.teams[G.user]; const c = finalCtx(G); const xi = XI_IDS(G);
  if (id === 'rest') return applyRest(G, k);
  if (id === 'media') {
    if (k === 'bold') { t.fans = clamp(t.fans + 3, 0, 100); for (const pid of t.squad) { const p = G.P(pid); p.morale = clamp(p.morale + 2, 0, 100); } nudgePillar(G, 'fans', 1); if (c.opp) nudgeRel(G, c.opp, { heat: 8, why: `You said you came to win the ${G.year} final` }); return `Fan support +3, squad morale +2${c.opp ? `; ${G.teams[c.opp].name} fired up` : ''}`; }
    if (k === 'respect') { nudgePillar(G, 'conduct', 3); if (c.opp) nudgeRel(G, c.opp, { respect: 6 }); return 'Conduct and media +3' + (c.opp ? `, ${short(G, c.opp)}'s manager respect +6` : ''); }
    nudgeTrust(G, 3, 'You put the players first at media day'); for (const pid of xi) adjustHappy(G, pid, 2, 'Credited at media day'); return 'Captain’s trust +3, the XI happiness +2';
  }
  if (id === 'train') {
    if (k === 'open') { t.fans = clamp(t.fans + 4, 0, 100); nudgePillar(G, 'fans', 2); return 'Fan support +4, fans and community +2; their analyst watched'; }
    t.fans = clamp(t.fans - 1, 0, 100); return 'Plan kept hidden (composure +2 on the day); fan support −1';
  }
  if (id === 'select') {
    if (k === 'same') {
      const last = t.lastXI && G.validXI(G.user, t.lastXI.xi) ? t.lastXI : null;
      if (last) { t.xi = last.xi.slice(); t.order = last.order.slice(); }
      const ids = new Set(XI_IDS(G)); for (const pid of t.squad) adjustHappy(G, pid, ids.has(pid) ? 4 : -2, ids.has(pid) ? 'Kept his place for the final' : 'No way into the final XI');
      nudgeTrust(G, 2, 'Kept faith with the XI for the final'); return `${last ? 'The last XI kept' : 'The XI kept'}; those 11 happiness +4, bench −2, captain’s trust +2`;
    }
    const before = new Set(XI_IDS(G)); const xi2 = G.autoXI(G.user); t.xi = xi2.slice(); t.order = G.autoOrder(xi2);
    const out = [...before].filter((x) => !xi2.includes(x)), inn = xi2.filter((x) => !before.has(x));
    for (const pid of out) adjustHappy(G, pid, -4, 'Left out of the final XI'); for (const pid of inn) adjustHappy(G, pid, 4, 'Picked for the final');
    return out.length ? `${inn.map((x) => G.P(x).name).join(', ')} in for ${out.map((x) => G.P(x).name).join(', ')}` : 'The best XI was already picked; no change';
  }
  if (id === 'lead') {
    const p = G.P(opt.pid); if (!p) return '';
    if (k === 'cap') { nudgeTrust(G, 4, 'You asked him to lead the team out in the final'); adjustHappy(G, p.id, 3, 'Led the team out in the final'); return `${p.name} leads them out: composure +6, captain’s trust +4`; }
    if (k === 'old') { adjustHappy(G, p.id, 6, 'Led the team out in the final'); for (const pid of t.squad) if (pid !== p.id && G.P(pid).age >= 30) adjustHappy(G, pid, 2, 'A senior player led the team out'); return `${p.name} leads them out: composure +8, the senior players happiness +2`; }
    adjustHappy(G, p.id, 6, 'Led the team out in the final'); t.fans = clamp(t.fans + 2, 0, 100); nudgeTrust(G, -2, 'He expected to lead the team out'); return `${p.name} leads them out: composure +8, fan support +2, captain’s trust −2`;
  }
  if (id === 'talk') {
    if (k === 'province') { t.fans = clamp(t.fans + 3, 0, 100); return 'Team composure +4, Nepali players +3, fan support +3'; }
    if (k === 'calm') { nudgeTrust(G, 1); return 'Team composure +3, captain’s trust +1'; }
    return 'Team composure +6; big-game players +4, nervous ones −3';
  }
  return '';
}
export const fwChoice = (G, id) => occ(G).fw[id] || null;
export const fwLeft = (G) => fwTasks(G).filter((x) => !occ(G).fw[x.id]).length;
export const fwDone = (G) => fwLeft(G) === 0;
// Make a final-week choice. Once made it stands; the effect is applied now and logged.
export function chooseFw(G, id, k, auto) {
  const o = occ(G); if (o.fw[id]) return null;
  const task = fwTasks(G).find((x) => x.id === id); const opt = task && task.opts.find((x) => x.k === k); if (!opt) return null;
  const outcome = applyFw(G, id, k, opt);
  o.fw[id] = { k, pick: opt.l, auto: !!auto, pid: opt.pid || null, outcome };
  if (id === 'rest') o.rest.F = k;
  const kind = id === 'talk' ? 'talk' : id === 'media' ? 'press' : id === 'select' || id === 'lead' ? 'selection' : 'plan';
  logDecision(G, kind, `Final week: ${task.title.toLowerCase()}`, auto ? `${opt.l} (the assistant chose)` : opt.l, outcome, { occ: 'final', pid: opt.pid || null });
  return outcome;
}
export function autoFw(G) { let n = 0; for (const tk of fwTasks(G)) if (!occ(G).fw[tk.id]) { chooseFw(G, tk.id, FW_DEFAULT[tk.id], true); n++; } return n; }
// Playoff training plan before any playoff match (the final's plan is the final-week task).
export function choosePoRest(G, stage, k) {
  if (stage === 'F' || stage === 'wait') return chooseFw(G, 'rest', k);
  const o = occ(G); if (o.rest[stage]) return null;
  const opt = fwTasks(G).find((x) => x.id === 'rest').opts.find((x) => x.k === k); if (!opt) return null;
  const outcome = applyRest(G, k); o.rest[stage] = k;
  logDecision(G, 'plan', `${STAGE_NAME[stage]}: training plan`, opt.l, outcome, { occ: 'playoffs' });
  return outcome;
}
export function markQ2Watched(G) { const o = occ(G); if (o.q2w) return; o.q2w = true; logDecision(G, 'plan', 'Playoff week: watched Qualifier 2', 'Watched it live', 'A fuller opposition report for the final', { occ: 'playoffs' }); }

// Composure on final day, from the final-week choices (also run for a resumed match? no: restored, not rebuilt).
export function beforeMatch(G, f, opt) {
  if (!f || f.stage !== 'F' || !userIn(G, f)) return;
  autoFw(G); const fw = occ(G).fw; const u = G.user; const opp = f.home === u ? f.away : f.home;
  opt.talk ??= {}; opt.mood ??= {};
  const add = (tid, v) => { if (v) opt.talk[tid] = (opt.talk[tid] || 0) + v; };
  const mood = (pid, v) => { if (pid && v) opt.mood[pid] = (opt.mood[pid] || 0) + v; };
  if (fw.media && fw.media.k === 'bold') add(opp, 2);
  if (fw.train) add(fw.train.k === 'open' ? opp : u, fw.train.k === 'open' ? 1 : 2);
  if (fw.lead) mood(fw.lead.pid, fw.lead.k === 'cap' ? 6 : 8);
  if (fw.talk) {
    add(u, { legacy: 6, province: 4, calm: 3 }[fw.talk.k] || 0);
    for (const pid of G.teams[u].squad) { const p = G.P(pid); const big = p.traits ? p.traits.big : 50;
      if (fw.talk.k === 'legacy') mood(pid, big >= 60 ? 4 : big < 40 ? -3 : 0);
      if (fw.talk.k === 'province' && p.nat === 'NEP') mood(pid, 3); }
  }
}

// ----- final week colour: pundits, fans, stakes, the road -----
const PUNDITS = [['Studio analyst', 'Anup Gurung'], ['Radio host', 'Sarita Bista'], ['Former league keeper', 'Prakash Rana'], ['Stats desk', null]];
export function pundits(G) {
  const c = finalCtx(G); if (!c.opp) return [];
  const u = G.user; const p = modelOdds(G, u, c.opp); const fav = p >= 0.5 ? u : c.opp;
  const T = G.teams; const fu = (T[u].form || []).filter((x) => x === 'W').length, fo = (T[c.opp].form || []).filter((x) => x === 'W').length;
  const dmU = dangerMan(G, u), dmO = dangerMan(G, c.opp); const vs = seasonVs(G, c.opp);
  const lines = [
    (pick) => [pick, pick === u ? (fu >= fo ? `“${fu} wins in their last five. Momentum is real.”` : `“${dmU ? sur(dmU.name) : 'Their top order'} wins this on his own.”`) : (fo >= fu ? `“${fo} wins in their last five. Momentum is real.”` : `“${dmO ? sur(dmO.name) : 'Their top order'} wins this on his own.”`)],
    (pick) => [pick, vs.w > vs.l && pick === u ? `“Beaten them ${vs.w === 1 ? 'once' : vs.w + ' times'} already this season.”` : pick === u ? '“Kirtipur will carry them.”' : `“${short(G, pick)} have the better attack for a final pitch.”`],
    (pick) => [pick, pick === fav ? '“The stronger XI on paper.”' : '“Finals are not played on paper.”'],
  ];
  const h = hashStr(`${G.year}${u}${c.opp}`);
  return PUNDITS.map(([role, name], i) => {
    if (!name) return { role, name: null, pick: Math.abs(p - 0.5) < 0.04 ? null : fav, why: `Model: ${Math.round(Math.max(p, 1 - p) * 100)}% ${short(G, fav)}` };
    const pick = ((h >> (i * 3)) & 7) < 5 ? fav : fav === u ? c.opp : u; const [pk, why] = lines[i](pick);
    return { role, name, pick: pk, why };
  });
}
export function fanPosts(G) {
  const c = finalCtx(G); if (!c.opp) return []; const t = G.teams[G.user]; const y = G.year;
  const inform = t.squad.map((id) => G.P(id)).filter((p) => p.stats[y] && p.stats[y].m && !c.xi.some((x) => x.id === p.id)).sort((a, b) => b.form - a.form)[0];
  const out = [
    { t: `“Bus from ${t.city} leaves at 6 am. We will be loud.”`, by: `Supporters’ club, ${t.province} Province` },
    { t: '“यसपालि कप हाम्रै हो!”', ne: true, by: 'Fan message · “The cup is ours this time!”' },
    { t: '“पूरै प्रदेश तपाईंहरूको पछाडि छ।”', ne: true, by: 'Fan message · “The whole province is behind you.”' },
  ];
  if (inform && inform.form > 1) out.push({ t: `“Play ${inform.name.split(' ')[0]}. He is in form.”`, by: `Fan forum · form ${((inform.form + 10) / 2).toFixed(1)} out of 10` });
  return out;
}
export function stakes(G) {
  const t = G.teams[G.user]; const obj = t.objective || { rank: 4 };
  return { prize: PRIZE, board: { win: 18 + (1 <= obj.rank ? 14 : 0), lose: 2 <= obj.rank ? 14 : -6 }, rep: { win: 15, lose: 8 }, fans: { win: 1.5, lose: -0.8 }, honours: true };
}
// A team's road to the final: league finish, then each playoff match.
export function roadTo(G, tid) {
  const st = G.standings(); const i = st.findIndex((x) => x.id === tid); const r = st[i];
  const rows = [{ l: `League · ${r.pts} pts`, r: `W${r.w} L${r.l}${r.nr ? ` NR${r.nr}` : ''}`, cls: '' }];
  for (const s of ['Q1', 'EL', 'Q2']) { const f = stageFix(G, s); if (!f || !f.res || (f.home !== tid && f.away !== tid)) continue; const opp = f.home === tid ? f.away : f.home; const w = winnerOf(G, f) === tid;
    const m = /by (.+)$/.exec(f.res.text || ''); rows.push({ l: `${STAGE_NAME[s]} v ${short(G, opp)}`, r: f.res.nr ? 'No result' : `${w ? 'Won' : 'Lost'}${m ? ' by ' + m[1].replace(/wickets?/, 'wkts') : ''}`, cls: w ? 'blu' : 'crim' }); }
  return { pos: i + 1, rows };
}
// Days to the final from the in-game today, when both are real dates; otherwise from tasks left.
export function countdown(G) {
  const fin = stageFix(G, 'F'); const now = G.todayTime(); const at = fin ? G.dayOf(fin) : null;
  if (now != null && at != null) return Math.max(0, Math.round((at - now) / 86400000));
  const o = occ(G); const daysDone = [0, 1, 2].filter((d) => fwTasks(G).filter((x) => x.day === d).every((x) => o.fw[x.id])).length;
  return Math.max(0, 2 - Math.min(2, daysDone));
}
export function dayNames(G) {
  const fin = stageFix(G, 'F'); const at = fin ? G.dayOf(fin) : null; if (at == null) return FW_DAYS;
  const W = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; return [2, 1, 0].map((d) => W[new Date(at - d * 86400000).getDay()]);
}

// ----- the trophy -----
export function lastFinal(G) { const f = stageFix(G, 'F'); return f && f.res ? f : null; }
export function userWonFinal(G) { const f = lastFinal(G); return !!f && userIn(G, f) && winnerOf(G, f) === G.user; }
function figOf(card, name) {
  let bat = null, bowl = null;
  for (const inn of card || []) { for (const b of inn.bat) if (b[0] === name) bat = `${b[1]}${b[5] === 'not out' ? '*' : ''} (${b[2]})`; for (const b of inn.bowl) if (b[0] === name && b[1]) bowl = `${b[3]}-${b[2]}`; }
  return [bat, bowl].filter(Boolean).join(' · ');
}
export function ceremony(G) {
  const f = lastFinal(G); if (!f) return null; const h = G.s.history[G.s.history.length - 1]; const o = occ(G);
  const won = userIn(G, f) && winnerOf(G, f) === G.user; const u = G.user;
  const momP = f.res.mom ? G.P(f.res.mom) : null;
  const pidOf = (label) => { const name = String(label || '').replace(/ \([A-Z]{2}\)$/, ''); return Object.values(G.players).find((p) => p.name === name && !p.retired) || null; };
  const em = h && h.emerging ? pidOf(h.emerging) : null;
  const xiIds = (G.teams[u].lastXI && G.teams[u].lastXI.xi) || XI_NOW(G);
  const xi = xiIds.map((id) => G.P(id)).filter(Boolean);
  const cap = G.teams[u].captainId && G.P(G.teams[u].captainId) && xi.some((p) => p.id === G.teams[u].captainId) ? G.P(G.teams[u].captainId) : xi.slice().sort((a, b) => ovr(b) - ovr(a))[0];
  const vet = xi.filter((p) => p.id !== cap.id).sort((a, b) => b.age - a.age)[0];
  const winBall = o.fin && o.fin.n === f.n ? o.fin.win : null;
  const heroName = winBall && G.teams[u] && xi.some((p) => p.name === winBall.bt) && f.res.sc[1] && f.res.sc[1].t === u ? winBall.bt : momP && momP.team === u ? momP.name : null;
  let hero = heroName ? xi.find((p) => p.name === heroName) : null;
  if (!hero || hero.id === cap.id || hero.id === vet.id) hero = xi.filter((p) => p.id !== cap.id && p.id !== vet.id).sort((a, b) => a.age - b.age)[0];
  const heroWhy = winBall && hero.name === winBall.bt && f.res.sc[1] && f.res.sc[1].t === u ? 'Hit the winning runs' : momP && momP.id === hero.id ? 'Player of the final' : `The youngest in the XI, ${hero.age}`;
  const lifters = [
    { k: 'cap', pid: cap.id, name: cap.name, why: `Captain${momP && momP.id === cap.id ? ', player of the final' : ''}`, fx: 'Expected; captain’s trust +5, his happiness +5' },
    { k: 'vet', pid: vet.id, name: vet.name, why: `${vet.age}, the oldest in the XI`, fx: 'Veterans moved; every senior player happier (+4), dressing room +2' },
    { k: 'hero', pid: hero.id, name: hero.name, why: heroWhy, fx: `Fans love it (+4); his happiness +10; ${sur(cap.name)} a little put out` },
  ];
  return {
    won, f, h, champ: winnerOf(G, f), winBall, tail: o.fin && o.fin.n === f.n ? o.fin.tail : [],
    pof: momP ? { name: momP.name, team: momP.team, fig: figOf(f.card, momP.name) } : null,
    plat: h && h.runs[0] ? { name: h.runs[0][0], team: h.runs[0][1], v: h.runs[0][2] } : null,
    gold: h && h.wkts[0] ? { name: h.wkts[0][0], team: h.wkts[0][1], v: h.wkts[0][2] } : null,
    emerging: em ? { name: em.name, team: (em.stats[h.year] && em.stats[h.year].team) || em.team, age: em.age } : null,
    lifters, lift: o.lift, back2back: !!(won && G.s.history.length >= 2 && G.s.history[G.s.history.length - 2].champion === u),
  };
}
// Who lifts the trophy: applied once, logged.
export function chooseLift(G, k, auto) {
  const o = occ(G); if (o.lift) return null; const c = ceremony(G); if (!c || !c.won) return null;
  const L = c.lifters.find((x) => x.k === k); if (!L) return null; const t = G.teams[G.user];
  let outcome;
  if (k === 'cap') { nudgeTrust(G, 5, 'You let him lift the trophy'); adjustHappy(G, L.pid, 5, 'Lifted the trophy'); outcome = 'Captain’s trust +5, his happiness +5'; }
  else if (k === 'vet') { adjustHappy(G, L.pid, 8, 'Lifted the trophy'); for (const pid of t.squad) { if (pid === L.pid) continue; adjustHappy(G, pid, G.P(pid).age >= 30 ? 4 : 2, 'A veteran lifted the trophy'); } outcome = 'His happiness +8, senior players +4, everyone else +2'; }
  else { adjustHappy(G, L.pid, 10, 'Lifted the trophy'); t.fans = clamp(t.fans + 4, 0, 100); nudgePillar(G, 'fans', 2); const cap = t.captainId; if (cap && cap !== L.pid) adjustHappy(G, cap, -3, 'Expected to lift the trophy'); nudgeTrust(G, -2); outcome = 'Fan support +4, his happiness +10; captain’s happiness −3, trust −2'; }
  o.lift = { k, pid: L.pid, name: L.name, auto: !!auto };
  logDecision(G, 'other', 'Who lifts the trophy', auto ? `${L.name} (${typeof auto === 'string' ? auto : 'the assistant chose'})` : L.name, outcome, { occ: 'trophy', pid: L.pid, y: c.h ? c.h.year : G.year });
  return outcome;
}
export function seasonEnd(G, champ) {
  const o = occ(G);
  if (champ === G.user && G.s.settings && G.s.settings.assistant) chooseLift(G, 'cap', true);
  const r = buildReview(G); if (r) { o.revs = (o.revs || []).filter((x) => x.y !== r.y).concat([r]).slice(-3); }
  G.news(`Season ${G.year} in review: eight moments, your decisions and the board's verdict.`, 'board', { ne: 'सिजन समीक्षा तयार छ' });
}

// ----- the season review -----
const KIND_RANK = { key: 5, talk: 4, selection: 4, story: 4, press: 3, event: 3, contract: 2, board: 2, plan: 2, other: 1 };
const FINISH = (G, y, pos, h) => { const u = G.user; if (h && h.champion === u) return ['Champions', 'च्याम्पियन']; if (h && h.runner === u) return ['Runners-up', 'उपविजेता'];
  const F = (G.s.fixtures || []); const lostIn = ['Q2', 'EL'].find((s) => { const f = F.find((x) => x.stage === s); return f && userIn(G, f) && winnerOf(G, f) !== u; });
  if (lostIn) return [lostIn === 'Q2' ? 'Out in Qualifier 2' : 'Out in the Eliminator', lostIn === 'Q2' ? 'दोस्रो क्वालिफायरमा बाहिर' : 'एलिमिनेटरमा बाहिर'];
  return [`${ord(pos)} in the league`, `लिगमा ${pos} औं`]; };
// The user's fixtures of the season, each with the decisions taken before it.
function userMatches(G, y) {
  const F = (G.s.fixtures || []).filter((f) => f.res && userIn(G, f));
  const log = decisions(G, y);
  const out = F.map((f) => ({ f, ds: [] }));
  for (const e of log) {
    if (e.occ === 'trophy' || e.occ === 'final') { const x = out.find((m) => m.f.stage === 'F'); if (x) { x.ds.push(e); continue; } }
    if (['offseason', 'auction', 'retention', 'preseason'].includes(e.phase)) continue;
    // in-match calls belong to that match; anything else to the user's next match after it
    const x = (e.kind === 'key' && out.find((m) => m.f.n === e.fix)) || out.find((m) => e.fix == null || m.f.n > e.fix); if (x) x.ds.push(e);
  }
  return { out, pre: log.filter((e) => ['offseason', 'auction', 'retention', 'preseason'].includes(e.phase)) };
}
function bestOf(G, f, tid) {
  let best = null;
  for (const inn of f.card || []) {
    if (inn.t === tid) for (const b of inn.bat) { const v = b[1] + (b[1] >= 50 ? 15 : 0); if (!best || v > best.v) best = { v, t: `${b[0]} ${b[1]}${b[5] === 'not out' ? '*' : ''} off ${b[2]}` }; }
    else for (const b of inn.bowl) { const v = b[3] * 22 - b[2] / 3; if (!best || v > best.v) best = { v, t: `${b[0]} ${b[3]} for ${b[2]}` }; }
  }
  return best ? best.t : null;
}
const AUTO = /\s*\((the )?assistant( chose)?\)|\s*\(not answered in time\)/;
const isAutoPick = (e) => !!e.auto || AUTO.test(String(e.pick)) || AUTO.test(String(e.outcome || ''));
const pickLine = (e) => { const p = String(e.pick).replace(AUTO, '').replace(/^[“"]|[”"]$/g, ''); return `${isAutoPick(e) ? (/not answered/.test(e.pick) ? 'Not answered in time' : 'The assistant chose') : 'You chose'}: ${p}${e.outcome ? `. ${String(e.outcome).replace(AUTO, '').split('. ')[0]}` : ''}`; };
export function moments(G, y = G.year) {
  const u = G.user; const T = G.teams; const { out, pre } = userMatches(G, y);
  if (!out.length) return [];
  const t0 = G.dayOf(out[0].f);
  const label = (f) => { if (f.stage !== 'L') return f.stage === 'F' ? 'Final' : f.stage; const d = G.dayOf(f); return d != null && t0 != null ? `Wk ${Math.floor((d - t0) / (7 * 86400000)) + 1}` : `M${f.n}`; };
  const byRank = (a, b) => (isAutoPick(a) - isAutoPick(b)) || (KIND_RANK[b.kind] || 1) - (KIND_RANK[a.kind] || 1);
  const items = [];
  out.forEach((m, i) => {
    const f = m.f; const w = winnerOf(G, f); const opp = f.home === u ? f.away : f.home; const won = w === u;
    const margin = /by (\d+) (run|wicket)/.exec(f.res.text || ''); const close = margin ? (margin[2] === 'run' ? +margin[1] <= 10 : +margin[1] <= 2) : false;
    let s = { L: 10, Q1: 60, EL: 60, Q2: 70, F: 100 }[f.stage] + (close ? 18 : 0) + (i === 0 ? 30 : 0) + Math.min(3, m.ds.length) * 12;
    if (m.ds.some((e) => (KIND_RANK[e.kind] || 1) >= 4)) s += 10;
    const star = bestOf(G, f, u);
    const head = f.res.nr ? `Rain against ${short(G, opp)}.` : f.res.tie ? `Tied with ${short(G, opp)}.` : `${won ? 'Beat' : 'Lost to'} ${short(G, opp)} ${margin ? `by ${margin[1]} ${margin[2]}${+margin[1] > 1 ? 's' : ''}` : ''}${f.stage !== 'L' ? ` ${{ Q1: 'in Qualifier 1', EL: 'in the Eliminator', Q2: 'in Qualifier 2', F: 'in the final' }[f.stage]}` : i === 0 ? ' in the opener' : ''}.`.replace(/ +\./, '.');
    const ds = m.ds.slice().sort(byRank);
    const cls = f.stage === 'F' && won ? 'ev-mile' : !won && w ? 'ev-wkt' : close ? 'ev-four' : f.stage !== 'L' ? 'ev-six' : '';
    items.push({ ord: i, must: i === 0 || i === out.length - 1, s, n: f.n, stage: f.stage, ov: label(f), head, sub: star ? `${star}.` : '', chose: ds[0] ? pickLine(ds[0]) : null, cls });
    // a second big call around the same match can be a moment of its own
    ds.slice(1, 3).forEach((e, j) => items.push({ ord: i + 0.3 + j * 0.1, s: 8 + (KIND_RANK[e.kind] || 1) * 3, n: f.n, stage: f.stage, ov: label(f), head: `${e.title}.`, sub: '', chose: pickLine(e), cls: 'ev-dot' }));
  });
  pre.slice().sort(byRank).slice(0, 2).forEach((e, j) => items.push({ ord: -1 + j * 0.1, s: 6 + (KIND_RANK[e.kind] || 1) * 3, n: 0, stage: 'pre', ov: 'Pre', head: `${e.title}.`, sub: '', chose: pickLine(e), cls: 'ev-dot' }));
  const h = G.s.history[G.s.history.length - 1];
  if (h && h.year === y && h.champion !== u && h.runner !== u) items.push({ ord: 99, s: 4, n: 999, stage: 'end', ov: 'End', head: `${T[h.champion].name} won the title.`, sub: `${h.final}.`, chose: null, cls: 'ev-crowd' });
  const keep = new Set(items.filter((x) => x.must));
  for (const m of items.slice().sort((a, b) => b.s - a.s)) { if (keep.size >= 8) break; keep.add(m); }
  const said = new Set(); // the same routine call (an unchanged XI) is told once
  return items.filter((m) => keep.has(m)).sort((a, b) => a.ord - b.ord).map(({ ord, must, s, ...m }) => {
    const k = m.chose && m.chose.replace(/ v [A-Z][a-z]+.*$/, '').slice(0, 40); if (k && said.has(k)) m.chose = null; else if (k) said.add(k); return m; });
}
// A snapshot for the review screen, taken at the end of the season (fixtures go at the next start).
export function buildReview(G) {
  const h = G.s.history[G.s.history.length - 1]; const u = G.user; const t = G.teams[u]; const y = G.year;
  if (!h || h.year !== y) return null; const o = occ(G);
  const row = h.table.find((r) => r[0] === u); const pos = h.table.findIndex((r) => r[0] === u) + 1;
  const F = (G.s.fixtures || []).filter((f) => f.res && userIn(G, f));
  const w = F.filter((f) => winnerOf(G, f) === u && !f.res.nr).length, l = F.filter((f) => !f.res.nr && winnerOf(G, f) && winnerOf(G, f) !== u).length;
  const [fin, finNe] = FINISH(G, y, pos, h);
  const bn = G.s.inbox.find((n) => n.y === y && n.kind === 'board' && /^Board review:/.test(n.text));
  const start = o.start && o.y === y ? o.start : null;
  const best = t.squad.map((id) => G.P(id)).filter((p) => p.stats[y] && p.stats[y].team === u).sort((a, b) => score(b.stats[y]) - score(a.stats[y]))[0];
  // honours board: records set this season, hundreds and five-fors by your players, the title XI
  const hon = []; const R = G.s.records || {};
  if (R.hs && R.hs.y === y) hon.push(`League record score: ${R.hs.who} ${R.hs.v}${R.hs.no ? '*' : ''}`);
  if (R.bb && R.bb.y === y) hon.push(`League best bowling: ${R.bb.who} ${R.bb.w}/${R.bb.r}`);
  if (R.ht && R.ht.y === y) hon.push(`Highest team total: ${G.teams[R.ht.team] ? G.teams[R.ht.team].name : R.ht.team} ${R.ht.v}/${R.ht.w}`);
  for (const id of t.squad) { const p = G.P(id); const s = p.stats[y]; if (!s || s.team !== u) continue; if (s.h) hon.push(`${p.name}: ${s.h === 1 ? 'a hundred' : s.h + ' hundreds'}`); if (s.bw >= 5) hon.push(`${p.name}: a five-wicket haul (${s.bw}/${s.br})`); }
  if (h.champion === u) hon.push(`The Season ${y - 2023} title-winning XI`);
  const lastStage = F.length ? F[F.length - 1].stage : 'L';
  const story = h.champion === u ? `${pos === 1 ? 'Top of the league' : `${ord(pos)} in the league`}, then champions: ${h.final}.` : h.runner === u ? `${ord(pos)} in the league, into the final and beaten there: ${h.final}.` : lastStage !== 'L' ? `${ord(pos)} in the league, out in the ${STAGE_NAME[lastStage].toLowerCase()}. ${G.teams[h.champion].name} won the title.` : `${ord(pos)} in the league and no playoffs. ${G.teams[h.champion].name} won the title.`;
  const head = h.champion === u ? `${t.name} are champions${best ? `, and ${best.name}'s season` : ''}` : h.runner === u ? `One match short: ${t.name} finish runners-up` : lastStage !== 'L' ? `${t.name} reach the playoffs, then stop` : `A season outside the top four for ${t.name}`;
  return {
    y, team: u, pos, finish: fin, finishNe: finNe, champ: h.champion === u, record: `W${w} L${l}`, head, story,
    board: t.board, boardD: start ? t.board - start.board : null, fans: Math.round(t.fans), fansD: start ? Math.round(t.fans) - start.fans : null,
    rep: G.s.manager ? G.s.manager.rep : null, repD: start && start.rep != null && G.s.manager ? G.s.manager.rep - start.rep : null,
    moments: moments(G, y), decisions: decisions(G, y).length,
    awards: [['Platinum Cap', h.runs[0] ? `${h.runs[0][0]} · ${h.runs[0][2]}` : '—'], ['Golden Cap', h.wkts[0] ? `${h.wkts[0][0]} · ${h.wkts[0][2]}` : '—'], ['Player of the tournament', h.pot], ['Emerging player', h.emerging || '—'], ['Your best player', best ? `${best.name} · ${best.stats[y].r} runs, ${best.stats[y].w} wkts` : '—']],
    honours: hon.slice(0, 8), verdict: bn ? bn.text : null, pillars: G.s.pillars ? { ...G.s.pillars } : null, pillarsStart: start && start.pillars ? start.pillars : null,
    lift: o.lift ? o.lift.name : null,
  };
}
export function reviewFor(G) {
  const o = occ(G); const r = (o.revs || [])[o.revs.length - 1];
  if (r) return r; return null;
}
export const repLabel = (r) => (r >= 80 ? 'Renowned' : r >= 65 ? 'Respected' : r >= 50 ? 'Established' : r >= 35 ? 'Building' : 'Unproven');
export { PILLARS };
// What carries into next season, from the live state.
export function carried(G) {
  const u = G.user; const t = G.teams[u]; const out = [];
  const y = (reviewFor(G) || { y: G.year }).y;
  for (const id of t.squad) { const p = G.P(id); if (!p) continue;
    if (p.age >= 35) out.push(`${p.name} is ${p.age}; retirement is a real chance this winter`);
    else if ((p.happy ?? 70) < 40) out.push(`${p.name} is unhappy (${Math.round(p.happy)}): ${(p.happyWhy || 'his role').toLowerCase()}`);
  }
  for (const pr of G.s.promises || []) { const p = G.P(pr.pid); if (p) out.push(`Open promise: ${pr.text || `${pr.kind} for ${p.name}`}`); }
  const nm = G.s.settings && G.s.settings.nextMega; if (nm === y + 1) out.push(`Mega auction in Season ${y + 1 - 2023}: retain up to ${G.s.settings.retain}`);
  if (G.s.sacked) out.push('The board has let you go: choose your next club'); else if (G.s.offers && G.s.offers.length) out.push(`${G.s.offers.map((id) => G.teams[id].name).join(' and ')} want to talk about their head-coach role`);
  for (const [tid, r] of Object.entries(G.s.rel || {})) if (r.heat >= 50 && G.teams[tid]) out.push(`A heated rivalry with ${G.teams[tid].name} (heat ${r.heat})`);
  return out.slice(0, 6);
}

// ----- routing contract with the match flow -----
// Where to go after the user's match f is recorded, e.g. '/trophy' after winning the final.
export function afterMatchPath(G, f) {
  if (!f || !userIn(G, f) || !f.res) return null;
  if (f.stage === 'F') return winnerOf(G, f) === G.user ? '/trophy' : '/review';
  if (f.stage === 'Q1' || f.stage === 'EL' || f.stage === 'Q2') { const { st } = poStatus(G); return st === 'final' ? '/final' : '/playoffs'; }
  if (f.stage === 'L' && G.leagueDone && G.leagueDone()) return '/playoffs';
  return null;
}
// Where "Go to match" should go first for fixture f, e.g. '/final' while final week is not done.
export function preMatchPath(G, f) {
  if (!f || f.res || (G.s.settings && G.s.settings.assistant)) return null;
  if (f.stage === 'F' && userIn(G, f) && !fwDone(G)) return '/final';
  if (f.stage === 'Q2' && !userIn(G, f) && poStatus(G).st === 'wait' && !occ(G).seen.po) return '/playoffs';
  return null;
}
export function markSeen(G, k) { occ(G).seen[k] = true; }

// ----- the Home "Also today" list -----
export function todayTasks(G) {
  const ph = G.s.phase; const o = occ(G);
  if (ph === 'playoffs') {
    const { st, P } = poStatus(G);
    if (st === 'final') { const left = fwLeft(G); if (left) return [{ key: 'occ-final', text: `Final week: ${left} task${left > 1 ? 's' : ''} left`, sub: `v ${G.teams[P.F.home === G.user ? P.F.away : P.F.home].name}`, to: '/final' }]; return []; }
    if (st === 'wait') { const todo = [!o.fw.rest && 'training plan', P.Q2 && !o.q2w && 'watch Qualifier 2', !o.fw.media && 'media day'].filter(Boolean); return todo.length ? [{ key: 'occ-po', text: 'Playoff week', sub: todo.join(' · '), to: '/playoffs' }] : []; }
    if (['Q1', 'EL', 'Q2'].includes(st)) { const n = poStatus(G).next; const stg = n ? n.stage : st; if (!o.rest[stg]) return [{ key: 'occ-po', text: `${STAGE_NAME[stg]}: training plan`, sub: 'Rest or sharpen the squad', to: '/playoffs' }]; return []; }
    if ((st === 'out' || st === 'missed') && !o.seen.po) return [{ key: 'occ-po', text: 'The playoffs go on without you', sub: 'Bracket and results', to: '/playoffs' }];
  }
  if (ph === 'seasonEnd') {
    const out = [];
    if (userWonFinal(G) && !o.seen.trophy) out.push({ key: 'occ-trophy', text: 'Trophy ceremony', sub: 'Champions · च्याम्पियन', to: '/trophy' });
    if (!o.seen.review) out.push({ key: 'occ-review', text: 'Season review', sub: 'Eight moments and the board’s verdict', to: '/review' });
    return out;
  }
  return [];
}
