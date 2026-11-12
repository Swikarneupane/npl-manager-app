// ===== Phase 2 module: matchday =====
// The matchday build-up (opposition, conditions, selection, game plan, team talk), the press
// conference, the deeper live match (game-plan defaults, key moments, expert voice, dugout, phase
// rail, the "also live" ticker) and the matchday round-up. State:
//   s.prep  = { n, y, step, seen, done, auto, pitch, rain, mu, plan, cap, talk, subs, chat, logged }
//   s.press = { n, y, when, i, qs, log, fx, done }        one conference, every few matches
//   s.md    = { n, y, km, tone }                          a small note on the user's last match
//   s.rd    = the last round-up, built once when it is first opened; s.rdPrev = table order then
// Everything said by pundits, reporters and rival managers is generated; real players get no quotes.
import { R, ri, clamp, isSpin, isPace, TYPE_LABEL, ovr, phaseOf, autoAggr } from './engine.js';
import { logDecision, nudgeTrust, adjustHappy, nudgePillar, nudgeRel, relOf, lastMeeting, muPair, muHand, weakestVs, bowlGroup, BOWL_GROUPS } from './depth.js';
import { venuePar } from './winprob.js';
import { captainWord, batComp, fieldComp } from './composure.js';

const sur = (p) => (p ? p.name.split(' ').slice(-1)[0] : '');
const short = (G, id) => G.teams[id].name.split(' ')[0];
const oppOf = (G, f) => (f.home === G.user ? f.away : f.home);
// Players whose start or debut promise the core game is still to judge: matchday choices leave their morale alone.
const promisedSet = (G) => new Set((G.s.promises || []).filter((pr) => pr.kind === 'start' || pr.kind === 'debut').map((pr) => pr.pid));
const isUser = (G, f) => !!f && (f.home === G.user || f.away === G.user);
const ord = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const pct = (p) => `${Math.round(p * 100)}%`;
function hsh(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }
const pickH = (arr, key) => arr[hsh(key) % arr.length];
const STAGE = { L: 'league match', Q1: 'Qualifier 1', EL: 'Eliminator', Q2: 'Qualifier 2', F: 'final' };

// ----- lifecycle -----
export function migrate(G) {
  const s = G.s; s.prep ??= null; s.press ??= null; s.md ??= null; s.rd ??= null; s.rdPrev ??= null;
}
export function seasonStart(G) { G.s.rdPrev = null; G.s.rd = null; G.s.press = null; G.s.prep = null; }

// ===== Build-up =====
export const PHASES = [['pp', 'Powerplay', '1–6'], ['mid', 'Middle', '7–15'], ['death', 'Death', '16–20']];
// Batting plan: an offset on the situation-aware intent, so a plan stays sensible in any chase.
export const BAT_PLAN = [['auto', 'Auto · follow the situation', null], ['steady', 'Steady · protect wickets', -0.7], ['positive', 'Positive · look for boundaries', 0.6], ['hard', 'All-out · swing hard', 1.3]];
// Bowling plan: the field per phase (the captain still picks bowlers from the bowling plan in Squad).
export const BOWL_PLAN = [['auto', 'Captain sets the field', 'auto'], ['attack', 'Attack · catchers in', 'attack'], ['balanced', 'Balanced · ring of five', 'balanced'], ['defend', 'Contain · five on the rope', 'defend'], ['death', 'Yorkers · death field', 'death']];
const INTENT_V = [-1, -0.5, 0, 1, 2];
const nearestIntent = (a) => INTENT_V.reduce((b, x) => (Math.abs(x - a) < Math.abs(b - a) ? x : b));
export const STEPS = ['Opposition', 'Conditions', 'Selection', 'Game plan', 'Team talk'];

export const prepOf = (G, f) => { const p = G.s.prep; return p && f && p.n === f.n && p.y === G.year ? p : null; };
export function prepFor(G, f) {
  let p = prepOf(G, f); if (p) return p;
  p = G.s.prep = { n: f.n, y: G.year, step: 1, seen: [1], done: false, auto: false, pitch: Math.round((0.9 + R() * 0.2) * 1000) / 1000, rain: ri(2, 16) / 100,
    mu: [], plan: null, cap: null, talk: { tone: null, words: {} }, subs: null, chat: null, logged: {} };
  p.plan = assistantPlan(G, f); p.subs = autoSubs(G);
  return p;
}

// --- opposition report ---
function seasonStat(p, y) { return (p.stats && p.stats[y]) || null; }
const eco = (st) => (st && st.bb ? st.rc / (st.bb / 6) : null);
function oppXI(G, f) { return G.autoXI(oppOf(G, f)).map((id) => G.P(id)); }
function userXI(G) { return G.lineup(G.user).xi.map((id) => G.P(id)); }
export function oppReport(G, f) {
  const opp = oppOf(G, f), y = G.year, sn = short(G, opp); const xi = oppXI(G, f);
  const bowlers = xi.filter((p) => p.bowl >= 50).sort((a, b) => (b.bowl + ((seasonStat(b, y) || {}).w || 0)) - (a.bowl + ((seasonStat(a, y) || {}).w || 0)));
  const bats = xi.filter((p) => p.bat >= 55).sort((a, b) => (b.bat + ((seasonStat(b, y) || {}).r || 0) / 20) - (a.bat + ((seasonStat(a, y) || {}).r || 0) / 20));
  const top = bowlers[0]; const tb = bats[0]; const form = (G.teams[opp].form || []).slice(-4);
  const st = top && seasonStat(top, y);
  let head;
  if (top && st && st.w >= 3) head = `${sn} lean on ${sur(top)}: ${st.w} wickets at ${eco(st).toFixed(1)} an over this season`;
  else if (top) head = `${sn} lean on ${sur(top)}'s ${(TYPE_LABEL[top.type] || 'bowling').toLowerCase()}`;
  else head = `${sn} rely on their batting`;
  if (tb && (!top || ovr(tb) > top.bowl + 4)) { const bs = seasonStat(tb, y); head = bs && bs.r >= 60 ? `${sn} go as far as ${sur(tb)} takes them: ${bs.r} runs this season` : `${sn} build around ${sur(tb)}`; }
  const wins = form.filter((x) => x === 'W').length;
  const body = [form.length ? `They have won ${wins} of their last ${form.length}.` : 'No matches yet this season.', G.scoutReport(f)].join(' ');
  const danger = [];
  for (const p of [...bats.slice(0, 2), ...bowlers.slice(0, 2)]) if (!danger.includes(p)) danger.push(p);
  const rows = danger.slice(0, 4).map((p) => { const s = seasonStat(p, y) || {}; const bowlRole = bowlers.includes(p) && !bats.slice(0, 2).includes(p);
    const line = bowlRole ? (s.bb ? `${s.w} wkts · econ ${eco(s).toFixed(1)}` : `bowl ${p.bowl}`) : (s.b ? `${s.r} runs · SR ${Math.round((100 * s.r) / s.b)}` : `bat ${p.bat}`);
    return { p, line, threat: ovr(p) >= 74 ? 'High' : 'Medium', how: bowlRole ? handleBowler(G, p) : handleBatter(G, p) }; });
  return { head, body, rows, sn, opp };
}
function handleBatter(G, p) {
  const w = weakestVs(G, p.id, 12);
  if (w) return `${w.label}: ${w.rpo.toFixed(1)} an over${w.outs ? `, out ${w.outs} time${w.outs > 1 ? 's' : ''} to it` : ''} this season`;
  return p.vsSpin <= -2 ? 'Less comfortable against spin: bowl it at him early' : p.vsSpin >= 3 ? 'Strong against spin: keep pace on him' : 'No clear weakness yet: bowl to your field';
}
function handleBowler(G, p) {
  const g = bowlGroup(p.type); const L = muHand(G, 'L', g), Rr = muHand(G, 'R', g);
  if (L && Rr && L.balls >= 30 && Rr.balls >= 30 && Math.abs(L.rpo - Rr.rpo) >= 0.6) { const better = L.rpo > Rr.rpo ? 'Left' : 'Right'; return `${better}-handers score ${Math.max(L.rpo, Rr.rpo).toFixed(1)} an over against ${BOWL_GROUPS[g].toLowerCase()} this season`; }
  return isSpin(p.type) ? 'Use the crease and sweep; take singles off his stock ball' : 'See out his first two overs, then attack him';
}

// --- matchup cards: real data where there is some, ratings otherwise. Each carries an engine edge. ---
const EDGE = 3;
export function matchupCards(G, f) {
  const opp = oppOf(G, f); const oxi = oppXI(G, f); const uxi = userXI(G); const out = [];
  const obowl = oxi.filter((p) => p.bowl >= 55).sort((a, b) => b.bowl - a.bowl).slice(0, 3);
  // 1. one of your batters against their main bowler
  for (const bw of obowl.slice(0, 2)) {
    const g = bowlGroup(bw.type); let best = null;
    for (const bt of uxi.filter((p) => p.bat >= 50)) {
      const pr = muPair(G, bt.id, bw.id); const hv = muHand(G, bt.hand, g);
      const score = pr && pr.balls >= 6 ? pr.rpo - (pr.outs ? 3 : 0) : hv && hv.balls >= 30 ? hv.rpo - 1 + (bt.vsSpin || 0) * (isSpin(bw.type) ? 0.15 : -0.15) : (bt.bat - bw.bowl) / 8 + 7 + (isSpin(bw.type) ? bt.vsSpin * 0.2 : 0);
      if (!best || score > best.score) best = { bt, pr, hv, score };
    }
    if (!best) continue; const { bt, pr, hv } = best;
    const stat = pr && pr.balls >= 6 ? `${sur(bt)} has ${pr.runs} off ${pr.balls} balls against him${pr.outs ? `, out ${pr.outs}` : ''}`
      : hv && hv.balls >= 30 ? `${bt.hand === 'L' ? 'Left' : 'Right'}-handers score ${hv.rpo.toFixed(1)} an over against ${BOWL_GROUPS[g].toLowerCase()} this season` : `No meetings yet · ratings: bat ${bt.bat} v bowl ${bw.bowl}`;
    out.push({ k: `b${bt.id}${bw.id}`, title: `${sur(bt)} takes on ${sur(bw)}`, stat, edge: { t: 'bat', bat: bt.id, bowl: bw.id, v: EDGE, title: `${sur(bt)} v ${sur(bw)}` } });
  }
  // 2. your bowling type at their best batter
  const obat = oxi.filter((p) => p.bat >= 55).sort((a, b) => ovr(b) - ovr(a)).slice(0, 2);
  for (const bt of obat) {
    const w = weakestVs(G, bt.id, 12); const grp = w ? w.g : (bt.vsSpin <= 0 ? 'OB' : 'pace');
    const mine = uxi.filter((p) => p.bowl >= 50 && bowlGroup(p.type) === grp).sort((a, b) => b.bowl - a.bowl)[0]
      || uxi.filter((p) => p.bowl >= 50 && (grp === 'pace' ? isPace(p.type) : isSpin(p.type))).sort((a, b) => b.bowl - a.bowl)[0];
    if (!mine) continue; const g2 = bowlGroup(mine.type);
    const stat = w ? `${sur(bt)} scores ${w.rpo.toFixed(1)} an over against ${w.label.toLowerCase()}${w.bpd ? `, out every ${Math.round(w.bpd)} balls` : ''}` : `${sur(bt)} ${bt.vsSpin <= 0 ? 'is less sure against spin' : 'prefers spin to pace'} · from ratings`;
    out.push({ k: `w${mine.id}${bt.id}`, title: `${sur(mine)} (${BOWL_GROUPS[g2].toLowerCase()}) at ${sur(bt)}`, stat, edge: { t: 'bowl', bat: bt.id, grp: g2, v: EDGE, title: `${BOWL_GROUPS[g2]} at ${sur(bt)}` } });
  }
  // 3. their weakest bowling phase
  const E = (G.s.phaseEco[G.year] || {})[opp];
  const names = { pp: 'powerplay', mid: 'middle overs', death: 'death' };
  if (E) { const ph = Object.keys(E).filter((k) => E[k][1] >= 6).sort((a, b) => E[b][0] / E[b][1] - E[a][0] / E[a][1])[0];
    if (ph) out.push({ k: `p${ph}`, title: `Attack them in the ${names[ph]}`, stat: `They concede ${(E[ph][0] / E[ph][1]).toFixed(1)} an over in the ${names[ph]}`, edge: { t: 'phase', ph, v: EDGE - 1, title: `attack the ${names[ph]}` } }); }
  if (out.length < 4 && obowl[0]) { const bw = obowl[0]; out.push({ k: `s${bw.id}`, title: `See out ${sur(bw)}`, stat: `Bowl ${bw.bowl}: take no risks against him, score at the other end`, edge: { t: 'see', bowl: bw.id, v: EDGE - 1, title: `see out ${sur(bw)}` } }); }
  return out.slice(0, 4);
}
export const MAX_TICKS = 3;
export function toggleMatchup(G, f, card) {
  const p = prepFor(G, f); const i = p.mu.findIndex((x) => x.k === card.k);
  if (i >= 0) p.mu.splice(i, 1); else if (p.mu.length < MAX_TICKS) p.mu.push({ k: card.k, ...card.edge }); else return false;
  return true;
}

// --- conditions ---
export function conditions(G, f) {
  const p = prepFor(G, f); const dew = G.dewFor(f); const par = venuePar(G.s, G.year); const parSeason = G.s.par && G.s.par[G.year] && G.s.par[G.year].n >= 3;
  const night = G.s.fixtures.filter((x) => x.res && x.night && !x.res.nr && x.res.winner && x.res.sc && x.res.sc.length === 2);
  const chaseWins = night.filter((x) => x.res.winner === x.res.sc[1].t).length;
  const turn = p.pitch < 0.97, flat = p.pitch > 1.03;
  const surface = flat ? 'Flat and true · good for batting all night' : turn ? 'Dry and slow · spinners get grip from about over 10' : 'Even surface · something for everyone';
  const head = [flat ? 'Flat, fast outfield' : turn ? 'Dry surface, turn from over 10' : 'A good cricket wicket', dew ? 'heavy dew after 9 pm' : f.night ? 'no dew expected' : 'day game'].join(', ');
  let adv, why;
  if (dew) { adv = 'Bowl first if you win the toss'; why = 'Dew will make the ball hard to grip later. If you pick two spinners, have them bowl out by over 15.'; }
  else if (turn) { adv = 'Bat first if you win the toss'; why = 'The surface will slow down. Pick both spinners and defend a total.'; }
  else if (flat) { adv = 'Chase if you win the toss'; why = `Totals above ${par} are likely. Knowing the target helps on a pitch like this.`; }
  else { adv = 'Your call at the toss'; why = 'Nothing in the conditions. Play to your side\'s strength.'; }
  return { head, surface, dew: dew ? 'Heavy from about 9 pm · wet ball for the side bowling second' : f.night ? 'Not expected tonight' : 'Day match, no dew',
    rain: `${Math.round(p.rain * 100)}% chance${p.rain >= 0.1 ? ' · DLS possible' : ''}`, rainPct: Math.round(p.rain * 100),
    toss: night.length ? `Side chasing has won ${chaseWins} of ${night.length} night games` : 'No night games yet this season',
    par, parNote: parSeason ? 'first-innings average this season' : 'Kirtipur par before this season has its own', adv, why, turn, flat, dewOn: dew };
}

// --- selection ---
function droppedFor(G, p) {
  if (p.lastPlayed == null) return 0;
  return G.s.fixtures.filter((x) => x.res && x.n > p.lastPlayed && isUser(G, x) && x.stage).length;
}
export function selection(G, f) {
  const lu = G.lineup(G.user); const t = G.teams[G.user]; const xi = lu.order.map((id) => G.P(id));
  const os = xi.filter((p) => p.nat !== 'NEP').length; const rules = G.xiRules(G.user, lu.xi);
  const alerts = [];
  for (const p of xi) if (p.fit < 88) alerts.push({ k: `fit${p.id}`, pid: p.id, text: `${p.name} is at ${Math.round(p.fit)}% fitness.`, sub: 'Rest him or accept a little more injury risk.' });
  const bench = t.squad.map((id) => G.P(id)).filter((p) => !lu.xi.includes(p.id));
  // a player with an open start or debut promise is judged by the core game; no chat moves his morale first
  const promised = new Set((G.s.promises || []).filter((pr) => pr.kind === 'start' || pr.kind === 'debut').map((pr) => pr.pid));
  const unhappy = bench.filter((p) => G.available(p) && !promised.has(p.id) && (droppedFor(G, p) >= 2 || (p.happy ?? 70) < 55)).sort((a, b) => (a.happy ?? 70) - (b.happy ?? 70))[0];
  let chat = null;
  if (unhappy) { const k = droppedFor(G, unhappy); chat = { pid: unhappy.id, text: `${unhappy.name} ${k >= 2 ? `has been left out for ${k} games` : 'is out of the side'}.`, sub: `Happiness ${Math.round(unhappy.happy ?? 70)} and falling; he asked for a chat. Seeing him before the game steadies him.` }; }
  return { lu, xi, os, rules, alerts, chat, bench };
}
export function autoSubs(G) {
  const lu = G.lineup(G.user); const t = G.teams[G.user];
  const bench = t.squad.map((id) => G.P(id)).filter((p) => !lu.xi.includes(p.id) && G.available(p)).sort((a, b) => ovr(b) - ovr(a));
  const pickRole = (fn) => bench.find((p) => fn(p) && !out.includes(p.id));
  const out = [];
  for (const fn of [(p) => p.bowl >= 55 && isPace(p.type), (p) => p.bat >= 55, (p) => p.bowl >= 50 && isSpin(p.type), (p) => p.role === 'WK', () => true]) { const p = pickRole(fn); if (p) out.push(p.id); }
  for (const p of bench) if (out.length < 5 && !out.includes(p.id)) out.push(p.id);
  return out.slice(0, 5);
}
export function subNote(G, p, lu) {
  const osXI = lu.xi.filter((id) => G.P(id).nat !== 'NEP').length;
  if (p.nat !== 'NEP') return osXI >= 4 ? 'overseas · only for an overseas player' : 'overseas';
  return p.role === 'WK' ? 'cover keeper' : p.bowl >= 50 && isSpin(p.type) ? 'spin option' : p.bowl >= 55 ? 'pace option' : p.bat >= 55 ? 'extra batting' : 'squad player';
}
export function resolveChat(G, f, see) {
  const p = prepFor(G, f); const sel = selection(G, f); if (!sel.chat || p.chat) return;
  const pl = G.P(sel.chat.pid); p.chat = { pid: pl.id, see: !!see };
  if (see) adjustHappy(G, pl.id, 5, 'The manager made time for him before a match'); else adjustHappy(G, pl.id, -3, 'Asked for a chat and was turned away');
  logDecision(G, 'selection', `${pl.name} asked for a chat`, see ? 'Saw him before the game' : 'Not now', see ? 'Happier, still wants a game' : 'Unsettled', { fix: f.n, pid: pl.id });
}

// --- game plan ---
export function assistantPlan(G, f) {
  const plan = { bat: { pp: 'auto', mid: 'auto', death: 'auto' }, bowl: { pp: 'auto', mid: 'auto', death: 'auto' } };
  const opp = oppOf(G, f); const E = (G.s.phaseEco[G.year] || {})[opp];
  if (E && E.death && E.death[1] >= 6 && E.death[0] / E.death[1] >= 10) plan.bat.death = 'hard';
  const spin = oppXI(G, f).filter((p) => isSpin(p.type) && p.bowl >= 76);
  if (spin.length) plan.bat.mid = 'steady';
  return plan;
}
export function aggrFromPlan(key, inn, maxBalls) {
  const o = BAT_PLAN.find((x) => x[0] === key); if (!o || o[2] == null) return 'auto';
  return String(nearestIntent(clamp(autoAggr(inn, maxBalls) + o[2], -1, 2)));
}
const PH_LABEL = { pp: 'powerplay', mid: 'middle overs', death: 'death overs' };
// The captain's own view of the plan, from his flair: he pushes back on one phase if yours differs.
export function captainIssue(G, f) {
  const p = prepFor(G, f); const lu = G.lineup(G.user); const c = G.P(lu.captain); if (!c) return null;
  const flair = (c.traits && c.traits.flair) || 50; const P = p.plan;
  let iss = null;
  if (flair >= 60 && P.bat.mid !== 'positive') iss = { side: 'bat', ph: 'mid', want: 'positive', why: 'push on in the middle overs instead of waiting' };
  else if (flair < 60 && P.bowl.pp !== 'attack') iss = { side: 'bowl', ph: 'pp', want: 'attack', why: 'attack with catchers in the powerplay' };
  else if (P.bat.death !== 'hard') iss = { side: 'bat', ph: 'death', want: 'hard', why: 'swing hard from the 16th over' };
  if (!iss) return null;
  const list = iss.side === 'bat' ? BAT_PLAN : BOWL_PLAN; const ia = list.findIndex((x) => x[0] === P[iss.side][iss.ph]), ib = list.findIndex((x) => x[0] === iss.want);
  const mid = Math.abs(ia - ib) >= 2 ? list[Math.round((ia + ib) / 2)][0] : null;
  return { ...iss, cap: c.id, real: c.real !== false, comp: mid, compLabel: mid ? `Meet halfway: ${list.find((x) => x[0] === mid)[1].split(' · ')[0]}` : 'His way for this phase only, then review' };
}
export function answerCaptain(G, f, how) {
  const p = prepFor(G, f); const iss = captainIssue(G, f); if (!iss) return null; const c = G.P(iss.cap);
  const lead = (c.traits && c.traits.lead) || 50;
  let d;
  if (how === 'agree') { p.plan[iss.side][iss.ph] = iss.want; d = 4; }
  else if (how === 'overrule') { d = lead >= 70 ? -7 : -5; }
  else { p.plan[iss.side][iss.ph] = iss.comp || iss.want; d = 1; }
  const trust = nudgeTrust(G, d, how === 'overrule' ? 'Overruled on the game plan' : 'Listened on the game plan');
  p.cap = { how, ph: iss.ph, side: iss.side, d };
  logDecision(G, 'plan', `Captain wanted to ${iss.why}`, how === 'agree' ? 'Agreed' : how === 'overrule' ? 'Overruled him' : 'Compromise', `Captain's trust ${d > 0 ? '+' : ''}${d} (now ${trust})`, { fix: f.n });
  return d;
}

// --- team talk ---
export const TONES = [
  ['calm', 'Calm', 'Same as the last game. Enjoy it.'],
  ['fired', 'Fired up', 'They think they have our number. Not tonight.'],
  ['pressure', 'Pressure on', 'This one matters. I expect a win.'],
  ['nopressure', 'No pressure', 'Nothing to lose. Play with freedom.'],
];
const young = (p) => p.age <= 23; const vet = (p) => p.age >= 31; const nervy = (p) => (p.temper ?? 65) < 60;
// Effects of a tone on this XI: a team-wide composure lift and per-player moods.
export function talkEffects(G, tone, xi) {
  const mood = {}; let team = 0; const add = (p, v) => { mood[p.id] = (mood[p.id] || 0) + v; };
  const g = { up: 0, down: 0 };
  for (const p of xi) {
    const lead = (p.traits && p.traits.lead) || 50, big = (p.traits && p.traits.big) || 50;
    if (tone === 'fired') { if (vet(p) || lead >= 65) { add(p, 5); g.up++; } else if (young(p) && nervy(p)) { add(p, -4); g.down++; } }
    if (tone === 'pressure') { if (lead >= 60 || big >= 65) { add(p, 6); g.up++; } else if (young(p)) { add(p, -5); g.down++; } }
    if (tone === 'nopressure') { if (young(p)) { add(p, 6); g.up++; } else if (p.age >= 32) { add(p, -3); g.down++; } }
  }
  if (tone === 'calm') team = 3; else if (tone === 'fired' || tone === 'nopressure') team = 1;
  const fx = tone === 'calm' ? `Steady composure for everyone (+${team})`
    : tone === 'fired' ? `${g.up} veterans and leaders up; ${g.down ? `${g.down} nervous player${g.down > 1 ? 's' : ''} may rush` : 'nobody nervy enough to rush'}`
      : tone === 'pressure' ? `${g.up} leaders respond; ${g.down ? `${g.down} youngster${g.down > 1 ? 's' : ''} may tighten up` : 'no youngsters to worry about'}`
        : `${g.up} young player${g.up === 1 ? ' relaxes' : 's relax'}; ${g.down ? `${g.down} veteran${g.down > 1 ? 's' : ''} may switch off` : 'no veterans to switch off'}`;
  const net = team * xi.length + Object.values(mood).reduce((a, b) => a + b, 0);
  return { team, mood, fx, net, g };
}
// A word with up to three players: a nervous youngster, a veteran, the dropped player.
export function wordCandidates(G, f) {
  const lu = G.lineup(G.user); const xi = lu.xi.map((id) => G.P(id)); const out = [];
  const oppBest = oppXI(G, f).filter((p) => p.bowl >= 60).sort((a, b) => b.bowl - a.bowl)[0];
  const ny = xi.filter((p) => young(p)).sort((a, b) => (a.temper ?? 65) - (b.temper ?? 65))[0];
  if (ny) { const first = oppBest && !muPair(G, ny.id, oppBest.id); out.push({ pid: ny.id, why: `${ny.age}${first ? ` · first game against ${sur(oppBest)}` : ''}${nervy(ny) ? ' · nervous' : ''}`, opts: [['back', 'Back yourself', 6], ['game', 'Play your game', 3], ['none', 'Say nothing', 0]] }); }
  const v = xi.filter((p) => vet(p) && p.id !== (ny && ny.id)).sort((a, b) => a.fit - b.fit || b.age - a.age)[0];
  if (v) out.push({ pid: v.id, why: `${v.age} · fitness ${Math.round(v.fit)}%`, opts: [['lead', 'Lead the young ones', 4], ['care', 'Look after yourself', 2], ['none', 'Say nothing', 0]] });
  const sel = selection(G, f);
  if (sel.chat) out.push({ pid: sel.chat.pid, dropped: true, why: 'dropped · unhappy', opts: [['chance', 'Your chance will come', 0, 4], ['earn', 'Earn it in training', 0, -2], ['none', 'Say nothing', 0, -1]] });
  return out.slice(0, 3);
}
export function talkPreview(G, f) {
  const xi = G.lineup(G.user).xi.map((id) => G.P(id)); return TONES.map(([k, l, line]) => ({ k, l, line, ...talkEffects(G, k, xi) }));
}
export function dressingMood(G) {
  const xi = G.lineup(G.user).xi.map((id) => G.P(id)); const h = xi.reduce((a, p) => a + (p.happy ?? 70), 0) / Math.max(1, xi.length);
  const form = (G.teams[G.user].form || []).slice(-3); const w = form.filter((x) => x === 'W').length;
  const v = h + (w - 1.5) * 4; return v >= 74 ? 'confident' : v >= 62 ? 'settled' : v >= 50 ? 'edgy' : 'low';
}
function bodyLine(p, v, key) {
  const s = sur(p);
  if (v >= 6) return pickH([`${s} walks out sharp, eyes fixed on the pitch.`, `${s} nods along to the last words in the huddle and jogs out.`], key);
  if (v >= 3) return pickH([`${s} walks out loose, swinging his arms.`, `${s} taps gloves with his partner and gets on with it.`], key);
  if (v <= -3) return pickH([`${s} is quiet on the way out, fiddling with his gloves.`, `${s} looks tight. A long look round the field before he settles.`], key);
  return null;
}

// --- finishing the build-up ---
// Fills every step the user did not touch with the assistant's choice and marks it done.
export function autoPrep(G, f) {
  const p = prepFor(G, f); const userTouched = p.seen.length > 1 || p.mu.length || p.talk.tone;
  if (!p.mu.length && !p.seen.includes(1)) { for (const c of matchupCards(G, f).slice(0, 2)) p.mu.push({ k: c.k, ...c.edge }); }
  else if (!p.mu.length && !userTouched) { for (const c of matchupCards(G, f).slice(0, 2)) p.mu.push({ k: c.k, ...c.edge }); }
  if (!p.chat) { const sel = selection(G, f); if (sel.chat) resolveChat(G, f, true); }
  if (!p.cap && captainIssue(G, f)) answerCaptain(G, f, 'compromise');
  if (!p.talk.tone) { const best = talkPreview(G, f).sort((a, b) => b.net - a.net)[0]; p.talk.tone = best.k; }
  for (const w of wordCandidates(G, f)) if (p.talk.words[w.pid] == null) p.talk.words[w.pid] = w.opts[0][0];
  if (!p.subs || !p.subs.length) p.subs = autoSubs(G);
  p.auto = !userTouched; finishPrep(G, f);
  return p;
}
// Logs the build-up and applies the off-field parts (the word with a dropped player).
export function finishPrep(G, f) {
  const p = prepFor(G, f); if (p.done) return p;
  const opp = short(G, oppOf(G, f)); const L = p.logged; const by = p.auto ? ' (assistant)' : '';
  const sel = selection(G, f); const t = G.teams[G.user];
  if (!L.sel) { L.sel = 1; const prev = t.lastXI ? t.lastXI.xi : []; const ins = sel.lu.xi.filter((id) => prev.length && !prev.includes(id)), outs = prev.filter((id) => !sel.lu.xi.includes(id));
    logDecision(G, 'selection', `XI v ${opp}`, ins.length || outs.length ? `In: ${ins.map((id) => sur(G.P(id))).join(', ') || 'none'} · out: ${outs.map((id) => sur(G.P(id))).join(', ') || 'none'}` : 'Unchanged XI', `Impact subs: ${(p.subs || []).map((id) => sur(G.P(id))).join(', ')}${by}`, { fix: f.n }); }
  if (!L.plan) { L.plan = 1; logDecision(G, 'plan', `Game plan v ${opp}`, PHASES.map(([k, l]) => `${l}: ${BAT_PLAN.find((x) => x[0] === p.plan.bat[k])[1].split(' · ')[0]} / ${BOWL_PLAN.find((x) => x[0] === p.plan.bowl[k])[1].split(' · ')[0]}`).join('; '), p.mu.length ? `Matchups: ${p.mu.map((e) => e.title).join(', ')}${by}` : `No matchups targeted${by}`, { fix: f.n }); }
  if (!L.talk) { L.talk = 1; const tone = TONES.find((x) => x[0] === p.talk.tone);
    for (const w of wordCandidates(G, f)) { const k = p.talk.words[w.pid]; const o = w.opts.find((x) => x[0] === k); if (w.dropped && o && o[3]) adjustHappy(G, w.pid, o[3], o[0] === 'chance' ? 'Told his chance will come' : 'Told to earn his place'); }
    const ws = Object.entries(p.talk.words).filter(([, k]) => k !== 'none').map(([pid, k]) => { const w = wordCandidates(G, f).find((x) => x.pid === pid); const o = w && w.opts.find((x) => x[0] === k); return o ? `${sur(G.P(pid))}: ${o[1]}` : null; }).filter(Boolean);
    logDecision(G, 'talk', `Team talk v ${opp}`, `${tone ? tone[1] : 'Calm'}${ws.length ? ` · ${ws.join(', ')}` : ''}`, `${talkEffects(G, p.talk.tone, sel.lu.xi.map((id) => G.P(id))).fx}${by}`, { fix: f.n }); }
  p.done = true; return p;
}
export function readiness(G, f) {
  const p = prepOf(G, f); const seen = p ? p.seen : [];
  return STEPS.map((l, i) => ({ n: i + 1, label: l, done: seen.includes(i + 1) }));
}

// The lifecycle hook newMatch calls: the user's build-up becomes match options.
export function beforeMatch(G, f, opt) {
  if (!isUser(G, f) || !G.teams[G.user]) return;
  let p = prepOf(G, f); if (!p || !p.done) p = autoPrep(G, f);
  opt.n = f.n; opt.pitch = p.pitch; opt.rain = p.rain; opt.plan = p.plan; opt.mu = p.mu.map((e) => ({ ...e }));
  opt.subs = (p.subs || []).slice();
  const lu = G.lineup(G.user); const xi = lu.xi.map((id) => G.P(id));
  const te = f.stage === 'F' ? { team: 0, mood: {} } : talkEffects(G, p.talk.tone || 'calm', xi); const trust = G.teams[G.user].capTrust ?? 60; // final week has its own team talk
  opt.talk = { ...(opt.talk || {}), [G.user]: (opt.talk && opt.talk[G.user] || 0) + te.team + (trust >= 70 ? 1 : trust < 40 ? -2 : 0) };
  const mood = { ...(opt.mood || {}) }; for (const id in te.mood) mood[id] = (mood[id] || 0) + te.mood[id];
  for (const w of wordCandidates(G, f)) { const k = p.talk.words[w.pid]; const o = w.opts.find((x) => x[0] === k); if (o && o[2] && lu.xi.includes(w.pid)) mood[w.pid] = (mood[w.pid] || 0) + o[2]; }
  opt.mood = mood; opt.tone = p.talk.tone;
  const body = {}; let n = 0;
  for (const p2 of xi) { const v = mood[p2.id] || 0; const l = bodyLine(p2, v, `${p2.id}${f.n}${G.year}`); if (l && n < 5) { body[p2.id] = l; n++; } }
  opt.body = body;
}

// ===== Applying the game plan in the match =====
// At each over: the plan's intent and field for the phase, unless the user changed them during this
// phase or a key-moment choice is still running.
export function applyPlan(G, m, inn) {
  const plan = m.opt && m.opt.plan; if (!plan) return;
  const ph = phaseOf(inn.balls); const ps = (inn.ps ??= { ph: null, aggr: null, field: null });
  if (inn.kmUntil != null) { if (inn.balls < inn.kmUntil) return; delete inn.kmUntil; ps.ph = null; ps.aggr = inn.aggr; ps.field = inn.field; }
  const fresh = ps.ph !== ph;
  if (inn.bat === G.user && !inn.aggrManual) { const want = aggrFromPlan(plan.bat[ph], inn, m.maxBalls); if (fresh || inn.aggr === ps.aggr) { inn.aggr = want; ps.aggr = want; } }
  if (inn.bowl === G.user) { const want = plan.bowl[ph] || 'auto'; if (fresh || inn.field === ps.field) { inn.field = want; ps.field = want; } }
  ps.ph = ph;
}

// ===== Key moments =====
// A few genuinely key situations per match pause the game with one decision and 2-3 options. Each
// option shows the change in win chance from the expected next over (m.winProb previews) and its risk.
const KM_MAX = 3;
const wktLevel = (p) => (p < 0.04 ? 'Low' : p < 0.06 ? 'Medium' : 'High');
const bndLevel = (p) => (p < 0.12 ? 'Low' : p < 0.17 ? 'Medium' : 'High');
function kmState(m) { return (m.km ??= { n: 0, done: {}, hist: [] }); }
// Expected runs and wickets over `balls` balls under option o (aggr, field, bowler, comp).
export function expectOver(m, inn, o, balls = 6) {
  const P = m.preview(inn, o); if (!P) return { runs: 0, wkts: 0, P: null };
  const rpb = P.one + 2 * P.two + 3 * P.three + 4 * P.four + 6 * P.six;
  const sq = P.one + 4 * P.two + 9 * P.three + 16 * P.four + 36 * P.six;
  return { runs: Math.round(rpb * balls * 10) / 10, wkts: Math.round(P.wkt * balls * 100) / 100, sd: Math.sqrt(Math.max(0, sq - rpb * rpb) * balls), P };
}
// Win chance after the next `balls` balls, averaged over a few outcomes (fewer or more runs, 0-2
// wickets) rather than taken at the average outcome, which would understate the favourite.
export function expectedWin(G, m, e, balls) {
  const lam = e.wkts; const pw = [Math.exp(-lam), lam * Math.exp(-lam)]; pw.push(Math.max(0, 1 - pw[0] - pw[1]));
  const sd = e.sd || 0; let tot = 0;
  for (let w = 0; w < 3; w++) for (const [dr, pr] of [[-sd, 0.25], [0, 0.5], [sd, 0.25]]) tot += pw[w] * pr * userWin(G, m, { runs: Math.max(0, e.runs + dr - w * 2), wkts: w, balls });
  return tot;
}
export const userWin = (G, m, o) => { const w = m.winProb(o); return w.bat === G.user ? w.p : 1 - w.p; };
function wicketsRecently(inn, balls) {
  let n = 0; for (const x of inn.fow) { const mm = /, (\d+)\.(\d)\)$/.exec(x); if (!mm) continue; const b = +mm[1] * 6 + +mm[2]; if (inn.balls - b < balls) n++; } return n;
}
function opt(G, m, inn, k, label, how, fx, balls = 6) {
  const o = { aggr: fx.aggr != null ? fx.aggr : undefined, field: fx.field, bowler: fx.bowler, comp: fx.word && inn.bat === G.user && inn.striker ? Math.min(100, batComp(m, inn, inn.striker) + fx.word) : undefined };
  const e = expectOver(m, inn, o, balls); const st = { runs: e.runs, wkts: e.wkts, balls };
  const wp1 = expectedWin(G, m, e, balls);
  const risk = !e.P ? '' : inn.bat === G.user ? `${wktLevel(e.P.wkt)} wicket risk${inn.striker ? ` · ${sur(G.P(inn.striker))} composure ${Math.round(batComp(m, inn, inn.striker))}` : ''}` : `${bndLevel(e.P.four + e.P.six)} boundary risk · about ${e.runs.toFixed(0)} off the over`;
  return { k, label, how, risk, o: st, e: { runs: e.runs, wkts: e.wkts, sd: e.sd }, wp1, fx: { ...fx, balls } };
}
export function keyMoment(G, m, inn, at) {
  const K = kmState(m); if (K.n >= KM_MAX || m.maxBalls < 60) return null;
  const done = (k) => K.done[`${k}${m.inns.length}`] || K.done[k];
  const wp0 = userWin(G, m); const o = Math.floor(inn.balls / 6) + 1; const left = m.maxBalls - inn.balls;
  const name = (id) => sur(G.P(id)); let km = null;
  if (at === 'over' && inn.bat === G.user && inn.striker) {
    const st = G.P(inn.striker), ns = inn.non ? G.P(inn.non) : null; const bw = inn.cur ? G.P(inn.cur) : null;
    if (inn.target && [96, 102, 108].includes(inn.balls) && wp0 >= 0.15 && wp0 <= 0.85 && !done('chase')) {
      const need = inn.target - inn.runs; const setter = ns && inn.bs[ns.id] && inn.bs[ns.id].r > inn.bs[st.id].r ? ns : null;
      const opts = [opt(G, m, inn, 'go', `${sur(st)}: take ${bw ? sur(bw) : 'him'} on`, `Two big shots and the chase is nearly done. ${need} needed from ${left}.`, { aggr: 2 }),
        opt(G, m, inn, 'calm', setter ? `${sur(st)}: calm down, get ${sur(setter)} on strike` : `${sur(st)}: calm down, pick the gaps`, 'Singles first; the set batter attacks the last overs.', { aggr: 0, word: 8 })];
      if (bw && bw.bowl >= 66 && left > 12) opts.push(opt(G, m, inn, 'see', `See out ${sur(bw)}`, `Block his over, then go after the others.`, { aggr: -1 }));
      km = { kind: 'chase', title: `${need} needed from ${left}.${bw ? ` ${sur(bw)} has the ball.` : ''}`, sub: `${sur(st)} is on strike${batComp(m, inn, st.id) < 45 ? ' and rattled' : ''}.${bw ? ` ${sur(bw)}: ${inn.bw[bw.id] ? `${Math.floor(inn.bw[bw.id].balls / 6)}–${inn.bw[bw.id].r}–${inn.bw[bw.id].w}` : 'first over'} tonight.` : ''}`, opts };
    } else if (inn.wkts >= 3 && inn.wkts <= 7 && inn.balls < 96 && wicketsRecently(inn, 12) >= 2 && !done('collapse')) {
      km = { kind: 'collapse', title: `${inn.wkts} down for ${inn.runs}. Two wickets in two overs.`, sub: `${sur(st)} and ${ns ? sur(ns) : 'the new batter'} need to decide how to play the next overs.`, opts: [
        opt(G, m, inn, 'rebuild', 'Rebuild: rotate the strike for two overs', 'Send the message out: no risks, find the singles.', { aggr: -0.5, word: 8 }, 12),
        opt(G, m, inn, 'counter', 'Counter-attack', 'Hit the bowlers off their length before they settle.', { aggr: 1 }),
        opt(G, m, inn, 'plan', 'Stick to the plan', 'No message. The plan for this phase stands.', {})] };
    } else if (!inn.target && inn.balls === 84 && inn.wkts <= 4 && !done('launch')) {
      km = { kind: 'launch', title: `${inn.runs}/${inn.wkts} after 14. When do you launch?`, sub: `${10 - inn.wkts} wickets in hand. Par here is ${venuePar(G.s, G.year)}.`, opts: [
        opt(G, m, inn, 'now', 'Go now', 'All-out attack from the 15th over.', { aggr: 2 }, 6),
        opt(G, m, inn, 'wait', 'Keep wickets for the last four', 'Positive but careful this over; launch from the 16th.', { aggr: 0.5 }, 6),
        opt(G, m, inn, 'plan', 'Stick to the plan', 'No message. The plan stands.', {})] };
    }
  }
  if (at === 'bowler' && inn.bowl === G.user && inn.striker) {
    const opts0 = m.bowlerOptions(inn).map((id) => G.P(id)).filter((p) => p.bowl >= 45);
    const death = opts0.slice().sort((a, b) => (b.bowl + (isPace(b.type) ? 6 : 0)) - (a.bowl + (isPace(a.type) ? 6 : 0)));
    if ([90, 102].includes(inn.balls) && wp0 >= 0.2 && wp0 <= 0.8 && death.length >= 2 && !done('death')) {
      const [a, b] = death; const aLeft = Math.floor((24 - ((inn.bw[a.id] || {}).balls || 0)) / 6);
      const wk = opts0.slice().sort((x, y) => ((inn.bw[y.id] || {}).w || 0) - ((inn.bw[x.id] || {}).w || 0) || y.bowl - x.bowl)[0];
      const opts = [opt(G, m, inn, 'best', `${sur(a)} now · death field`, `Your best death bowler, yorkers and a long boundary.`, { bowler: a.id, field: 'death' })];
      if (aLeft >= 2) opts.push(opt(G, m, inn, 'save', `${sur(b)} now, save ${sur(a)} for the end`, 'Contain with five on the rope; keep the best for the last overs.', { bowler: b.id, field: 'defend' }));
      if (wk && wk.id !== a.id) opts.push(opt(G, m, inn, 'attack', `Attack: ${sur(wk)} with catchers in`, 'Go for wickets. Expensive if it misses.', { bowler: wk.id, field: 'attack' }));
      else opts.push(opt(G, m, inn, 'attack', `Attack: ${sur(a)} with catchers in`, 'Go for wickets. Expensive if it misses.', { bowler: a.id, field: 'attack' }));
      km = { kind: 'death', title: inn.target ? `${inn.target - inn.runs} needed from ${left}. Who bowls the ${ord(o)}?` : `${inn.runs}/${inn.wkts} after ${o - 1}. Who bowls the ${ord(o)}?`, sub: `${name(inn.striker)} is on strike, ${inn.bs[inn.striker].r} (${inn.bs[inn.striker].b}).`, opts };
    } else if (inn.balls >= 42 && inn.balls < 90 && !done('set')) {
      const setB = [inn.striker, inn.non].filter((id) => id && inn.bs[id] && !inn.bs[id].out).map((id) => G.P(id)).find((p) => inn.bs[p.id].r >= 35 && inn.bs[p.id].b >= 22);
      if (setB && death.length >= 2) {
        const strike = opts0.slice().sort((x, y) => y.bowl - x.bowl)[0]; const tight = opts0.slice().sort((x, y) => { const ex = (s) => (s && s.balls ? s.r / s.balls : 1.4); return ex(inn.bw[x.id]) - ex(inn.bw[y.id]); })[0];
        km = { kind: 'set', title: `${sur(setB)} is set on ${inn.bs[setB.id].r} (${inn.bs[setB.id].b}). Attack him or starve him?`, sub: `${inn.runs}/${inn.wkts} after ${o - 1} overs.`, opts: [
          opt(G, m, inn, 'attack', `Attack: ${sur(strike)} with catchers in`, 'Your best bowler and close fielders. He will have chances to score.', { bowler: strike.id, field: 'attack' }),
          opt(G, m, inn, 'starve', `Starve him: ${sur(tight)}, five on the rope`, 'Give him a single, bowl at the other batter.', { bowler: tight.id, field: 'defend' }),
          opt(G, m, inn, 'plan', 'Stay with the plan', 'Captain picks the bowler; plan field.', {})] };
      }
    }
  }
  if (!km) return null;
  km.at = at; km.ov = o; km.inn = m.inns.length; km.wp0 = wp0;
  for (const x of km.opts) x.dir = x.wp1 > wp0 + 0.004 ? 'up' : x.wp1 < wp0 - 0.004 ? 'down' : '';
  km.rec = km.opts.reduce((bi, x, i) => (x.wp1 > km.opts[bi].wp1 ? i : bi), 0);
  return km;
}
// Applies option idx. Returns the bowler to use (bowling moments) or null.
export function resolveKey(G, m, inn, km, idx, auto) {
  const K = kmState(m); const o = km.opts[idx] || km.opts[km.rec]; const fx = o.fx || {};
  K.n++; K.done[`${km.kind}${km.inn}`] = 1;
  if (fx.aggr != null) { inn.aggr = String(fx.aggr); if (!auto) inn.aggrManual = true; inn.kmUntil = inn.balls + (fx.balls || 6); }
  if (fx.field) { inn.field = fx.field; inn.kmUntil = inn.balls + (fx.balls || 6); }
  if (fx.word) captainWord(m, G.user, fx.word);
  K.hist.push({ kind: km.kind, ov: km.ov, inn: km.inn, title: km.title, pick: o.label, wp0: km.wp0, wp1: o.wp1, auto: !!auto });
  m.say(`Key moment, over ${km.ov}: ${o.label}.`, 'info key');
  logDecision(G, 'key', km.title, o.label, `Win chance ${pct(km.wp0)} → ${pct(o.wp1)} expected${auto ? ' · assistant' : ''}`, { fix: m.opt.n });
  return fx.bowler || null;
}
// Hooks for a quick-simmed user match: the plan applies and key moments resolve themselves.
export function quickHooks(G) {
  return {
    beforeOver: (inn, m) => { applyPlan(G, m, inn); const km = keyMoment(G, m, inn, 'over'); if (km) resolveKey(G, m, inn, km, km.rec, true); },
    chooseBowler: (inn, m) => { const km = keyMoment(G, m, inn, 'bowler'); return km ? resolveKey(G, m, inn, km, km.rec, true) : null; },
  };
}

// ===== Expert voice =====
// A generated pundit's colour line on some balls. Comments on the cricket only.
export const PUNDIT = 'Expert';
export function expertLine(G, m, inn, ev) {
  const st = G.P(inn.striker); const s = sur(st); const r = R(); const cz = m.cz || {}; const d = (cz.d && cz.d[inn.striker]) || 0;
  const said = (cz.x ??= {}); const once = (k) => { if (said[k]) return false; said[k] = 1; return true; };
  if (ev === 'wkt' && r < 0.45) return pickH(['The pressure built and something had to give.', "That's the wicket they wanted.", 'Soft way to go. He will not enjoy watching that again.', 'Big moment. The new batter walks into a very different game.'], `${m.log.length}w`);
  if (ev === '6' && r < 0.4) return pickH(['That is what timing buys you. He waited for it.', "Clean. You can't set a field for that.", 'That has changed the feel of this over.'], `${m.log.length}s`);
  if (ev === '4' && d === 0 && r < 0.25) return pickH(['That releases the pressure.', 'Good shot, and the right ball to hit.'], `${m.log.length}f`);
  if (ev === 'dot' && st && batComp(m, inn, st.id) < 40 && once(`lo${st.id}${m.inns.length}`)) return `${s} is trying to hit every ball for six. Someone needs to calm him.`;
  if (ev === 'dot' && d >= 4 && once(`dots${st && st.id}${m.inns.length}`)) return `Four dots in a row. ${s} needs a single to get off strike.`;
  if (ev === 'drop') return 'That could cost them the match.';
  if (inn.target && inn.balls === 108 && once(`d19${m.inns.length}`)) { const need = inn.target - inn.runs; return need <= 12 ? 'Two overs, and it is in their hands now.' : 'They need something special from here.'; }
  if (inn.wkts < 10 && fieldComp(m, inn.bowl) < 40 && once(`fd${inn.bowl}${m.inns.length}`)) return 'The fielders have gone quiet. That is a side under pressure.';
  return null;
}
// Attach the line to the latest ball entry in the commentary.
export function addExpert(G, m, inn, ev) {
  const x = expertLine(G, m, inn, ev); if (!x) return null;
  for (let k = m.log.length - 1; k >= Math.max(0, m.log.length - 4); k--) if (m.log[k].ball) { m.log[k].x = x; return x; }
  m.say(x, 'expert'); return x;
}

// ===== Phase rail =====
const PAR_SHARE = { pp: [0.3, 1.5], mid: [0.42, 3], death: [0.28, 2.5] };
export function phaseRail(G, m, inn) {
  const plan = m.opt && m.opt.plan; const par = venuePar(G.s, G.year) * (m.maxBalls / 120); const cur = phaseOf(Math.max(0, inn.balls - (inn.balls % 6 === 0 && inn.balls ? 1 : 0)));
  const len = { pp: 36, mid: 54, death: 30 }; const start = { pp: 0, mid: 36, death: 90 };
  return PHASES.map(([k, l]) => {
    const P = (inn.ph && inn.ph[k]) || { r: 0, w: 0 }; const bb = clamp(inn.balls - start[k], 0, len[k]); const fill = bb / len[k];
    const exp = par * PAR_SHARE[k][0] * fill, wexp = PAR_SHARE[k][1] * fill; const user = inn.bat === G.user;
    let verdict = '';
    if (bb >= 6) { const good = (P.r - exp) / 8 - (P.w - wexp) * 0.8; const ok = user ? good >= 0 : good <= 0; verdict = ok ? 'plan worked' : 'behind the plan'; }
    const pl = plan ? (user ? (BAT_PLAN.find((x) => x[0] === plan.bat[k]) || BAT_PLAN[0])[1] : inn.bowl === G.user ? (BOWL_PLAN.find((x) => x[0] === plan.bowl[k]) || BOWL_PLAN[0])[1] : null) : null;
    return { k, l, r: P.r, w: P.w, fill, done: bb >= len[k] || inn.balls >= m.maxBalls, live: k === cur && bb < len[k], verdict, ok: verdict === 'plan worked', plan: pl && pl.split(' · ')[0], started: bb > 0 };
  });
}

// ===== Dugout =====
const dug = (m) => (m.dug ??= { imp: null, to: {}, msg: -99 });
export function impactOptions(G, m) {
  const D = dug(m); if (D.imp || !m.opt || !m.opt.subs || !m.opt.subs.length) return null;
  const inn = m.inns[m.inns.length - 1]; const lu = m.lineups[G.user]; if (!inn) return null;
  const promised = new Set((G.s.promises || []).filter((pr) => pr.kind === 'start').map((pr) => pr.pid));
  const outs = lu.xi.filter((id) => id !== lu.keeper && id !== lu.captain && !promised.has(id) && (inn.bat === G.user ? !(inn.bs[id] && (inn.bs[id].in || inn.bs[id].batted || inn.bs[id].out || inn.bs[id].b)) : !inn.bw[id]));
  const osIn = lu.xi.filter((id) => G.P(id).nat !== 'NEP').length;
  const ins = m.opt.subs.filter((id) => !lu.xi.includes(id) && G.P(id) && G.available(G.P(id)));
  return { outs, ins: ins.map((id) => ({ id, ok: (out) => G.P(id).nat === 'NEP' || G.P(out).nat !== 'NEP' || osIn < 4 })) };
}
export function useImpact(G, m, outId, inId) {
  const opts = impactOptions(G, m); if (!opts || !opts.outs.includes(outId)) return false; const io = opts.ins.find((x) => x.id === inId); if (!io || !io.ok(outId)) return false;
  const lu = m.lineups[G.user]; const inn = m.inns[m.inns.length - 1];
  lu.xi = lu.xi.map((id) => (id === outId ? inId : id)); lu.order = lu.order.map((id) => (id === outId ? inId : id));
  if (inn.bat === G.user) { inn.order = inn.order.map((id) => (id === outId ? inId : id)); inn.bs[inId] = { r: 0, b: 0, f: 0, s: 0, out: null, how: '' }; delete inn.bs[outId]; }
  const ov = Math.floor(inn.balls / 6); dug(m).imp = { out: outId, in: inId, ov };
  m.say(`Impact Player: ${G.P(inId).name} comes on for ${G.P(outId).name}.`, 'info');
  logDecision(G, 'selection', 'Impact Player', `${G.P(inId).name} for ${G.P(outId).name}`, `After ${ov} overs`, { fix: m.opt.n });
  return true;
}
export function timeoutLeft(m) { return !dug(m).to[m.inns.length]; }
export function callTimeout(G, m) {
  if (!timeoutLeft(m)) return false; dug(m).to[m.inns.length] = 1; captainWord(m, G.user, 5);
  m.say(`Strategic timeout called by ${G.teams[G.user].name}. The huddle breaks with a clap.`, 'info'); return true;
}
export function messageReady(m) { const inn = m.inns[m.inns.length - 1]; const D = dug(m); return !!inn && (D.msgInn !== m.inns.length || inn.balls - D.msg >= 18); }
export function sendMessage(G, m) {
  const inn = m.inns[m.inns.length - 1]; if (!inn || !messageReady(m)) return false; const D = dug(m); D.msg = inn.balls; D.msgInn = m.inns.length;
  captainWord(m, G.user, 7); m.say(inn.bat === G.user ? 'The drinks runner goes out with a message for the batters.' : 'A message goes out to the captain from the dugout.', 'info'); return true;
}

// ===== Also live =====
export function alsoFixture(G, f) { return G.s.fixtures.find((x) => x !== f && x.date === f.date && x.stage === f.stage && !isUser(G, x)) || null; }
// Simulates the other game ahead of time, keeping the score after every ball so the ticker can show
// it in step with the user's match. It is recorded right after the user's match.
export async function simAlso(G, f2) {
  const m = G.newMatch(f2); const track = [];
  await m.run({ afterBall: (inn, mm) => { track.push([mm.inns.length, inn.runs, inn.wkts, inn.balls]); } });
  return { f: f2, m, track };
}
export function alsoLine(G, also, frac, done) {
  if (!also) return null; const f = also.f;
  const T = (id) => short(G, id);
  if (f.res) return { head: `Earlier today · ${T(f.home)} v ${T(f.away)}`, text: f.res.text, done: true };
  const tr = also.track; if (!tr || !tr.length) return null;
  const i = done ? tr.length - 1 : Math.min(tr.length - 1, Math.floor(frac * tr.length));
  const [k, r, w, b] = tr[i]; const bat = also.m.inns[k - 1].bat; const first = also.m.inns[0];
  const text = done || i === tr.length - 1 ? also.m.result.text : `${T(bat)} ${r}/${w} (${Math.floor(b / 6)}.${b % 6})${k === 2 ? ` · chasing ${first.runs + 1}` : ''}`;
  return { head: `Also live · ${T(f.home)} v ${T(f.away)}`, text, done: done || i === tr.length - 1 };
}

// ===== Press conference =====
const MGR_FIRST = ['Bikash', 'Ramesh', 'Suresh', 'Dinesh', 'Prakash', 'Kiran', 'Rajendra', 'Anil', 'Mahesh', 'Sanjay'];
const MGR_LAST = ['Khadka', 'Thapa', 'Gurung', 'Shrestha', 'Bhattarai', 'Adhikari', 'Rana', 'Karki', 'Basnet', 'Poudel'];
// A generated rival manager for a franchise (another module may name them: t.mgr.name wins).
export function rivalManager(G, tid) {
  const t = G.teams[tid]; if (t && t.mgr && t.mgr.name) return t.mgr.name;
  return `${MGR_FIRST[hsh(`${tid}m`) % MGR_FIRST.length]} ${MGR_LAST[hsh(`${tid}l`) % MGR_LAST.length]}`;
}
export function userFixturesPlayed(G, f) { return G.s.fixtures.filter((x) => x.res && isUser(G, x) && x !== f && (x.n < f.n)).length; }
// Every third match, and before each playoff (final week has its own media day).
export function pressDue(G, f) {
  if (!isUser(G, f)) return false; if (f.stage === 'F') return false; if (f.stage !== 'L') return true;
  const mine = G.s.fixtures.filter((x) => x.stage === 'L' && isUser(G, x)); return mine.indexOf(f) % 3 === 2;
}
export const pressOf = (G, f) => { const p = G.s.press; return p && f && p.n === f.n && p.y === G.year ? p : null; };
const FX_KEYS = [['morale', 'Squad morale'], ['fans', 'Fan support'], ['board', 'Board confidence'], ['conduct', 'Conduct and media'], ['rival', "Rival manager's respect"]];
export const PRESS_FX = FX_KEYS;
function q(who, text, answers) { return { who, text, answers: answers.map(([tone, said, fx, sum, room]) => ({ tone, said, fx, sum, room })) }; }
export function pressQuestions(G, f, when) {
  const opp = oppOf(G, f); const on = short(G, opp), un = short(G, G.user); const out = [];
  const mgr = rivalManager(G, opp);
  // 1. the result (after) or past results against the opponent (before)
  if (when === 'post' && f.res) {
    const won = f.res.winner === G.user; const by = (/won by (.+)$/.exec(f.res.text) || [])[1] || '';
    out.push(won ? q('TV reporter', `A win by ${by}. Was that the performance you wanted?`, [
      ['Bullish', 'We were the better side tonight, and we will be again.', { morale: 4, fans: 4, rival: -6, conduct: -1 }, 'Rival manager will take it personally', 'A few reporters glance at each other.'],
      ['Measured', 'Two points. There is plenty we can do better.', { board: 2, conduct: 2, rival: 3 }, 'Calm, safe, no headline', 'Pens barely move. Nobody will print that.'],
      ['Credit the players', 'That is on the players. They did everything we asked.', { morale: 6, fans: 1 }, 'Dressing room lifted', 'A nod from the front row.']])
      : q('TV reporter', f.res.winner ? `Beaten by ${by}. Where did it go wrong?` : 'No result tonight. Frustrating?', [
        ['Front up', 'That is on me. The plan was not good enough.', { morale: 3, board: -2, conduct: 3 }, 'Players appreciate it; the board notices', 'The room goes quiet. That one will be quoted.'],
        ['Point at the players', 'We did not execute. The players know that.', { morale: -5, board: 2 }, 'Dressing room unhappy', 'A murmur. That will be tomorrow’s back page.'],
        ['Move on', 'We look at the next game. That is all.', { board: 1 }, 'Nothing changes', 'A shrug from the front row.']]));
  } else {
    const lm = lastMeeting(G, G.user, opp); const lastWon = lm && /: (\w+) won/.exec(lm); const weWon = lastWon && un.startsWith(lastWon[1]);
    const txt = lm ? (weWon ? `You beat ${on} at the last meeting. Do they owe you one tonight?` : lastWon ? `${on} beat you at the last meeting. Is tonight about putting that right?` : `The last meeting with ${on} had no result. What do you expect?`) : `First meeting with ${on} this season. What do you expect?`;
    out.push(q('TV reporter', txt, [
      ['Confident', weWon ? 'We beat them when it mattered. We will again.' : 'We know how to beat this side.', { morale: 6, fans: 4, rival: -8, conduct: -1 }, 'Rival manager will take it personally', 'A few reporters glance at each other.'],
      ['Respectful', `${on} are a fine side. The past means nothing tonight.`, { morale: 2, board: 2, rival: 4, conduct: 2 }, 'Calm, safe, no headline', 'Pens barely move. Nobody will print that.'],
      ['Deflect', 'I am only thinking about our own cricket.', { board: 1 }, 'Nothing changes', 'A shrug from the front row.']]));
  }
  // 2. a dropped player, or the form player
  const t = G.teams[G.user]; const lastXI = t.lastXI ? t.lastXI.xi : t.xi || [];
  const prom = promisedSet(G); const dropped = t.squad.map((id) => G.P(id)).filter((p) => !lastXI.includes(p.id) && !prom.has(p.id) && G.available(p) && (p.stats[G.year] || {}).m > 0).sort((a, b) => ovr(b) - ovr(a))[0];
  if (dropped) out.push({ ...q('Newspaper columnist', `${dropped.name} has been left out${droppedFor(G, dropped) >= 2 ? ` ${droppedFor(G, dropped)} games running` : ''}. Is there still a place for him?`, [
    ['Back him publicly', `${sur(dropped)} is part of our plans. His chance is coming.`, { morale: 2, fans: 2, happy: 6 }, `${sur(dropped)} happier; he will expect a game soon`, 'The columnist nods and writes it down.'],
    ['Honest', 'He knows what he has to do in training.', { board: 3, conduct: 1, happy: -4 }, `${sur(dropped)} unsettled; the board likes the standard`, 'A murmur. That will be tomorrow’s back page.'],
    ['No comment', 'I don’t talk about individuals before a game.', { conduct: -1 }, 'Nothing changes, the story runs anyway', 'Someone mutters “so that’s a yes”.']]), pid: dropped.id });
  else { const star = t.squad.map((id) => G.P(id)).filter((p) => (p.stats[G.year] || {}).r > 0).sort((a, b) => b.stats[G.year].r - a.stats[G.year].r)[0];
    if (star) out.push(q('Newspaper columnist', `${star.name} has ${star.stats[G.year].r} runs this season. How much do you rely on him?`, [
      ['Praise him', 'He sets the tone for everyone. We are lucky to have him.', { morale: 3, fans: 2 }, 'Good mood, a little more expectation on him', 'Warm smiles around the room.'],
      ['Team first', 'Nobody carries this side. Everyone contributes.', { morale: 2, board: 2, conduct: 1 }, 'Safe, sensible', 'Pens barely move.'],
      ['Challenge him', 'He can do more. He knows it.', { morale: -2, board: 1, fans: -1 }, 'Some eyebrows in the dressing room', 'A sharp intake of breath.']]));
    else out.push(q('Newspaper columnist', `The board want ${((t.objective || {}).txt || 'a strong season').replace(/\.$/, '').toLowerCase()}. Is that realistic?`, [
      ['Ambitious', 'We want more than that. This squad can win it.', { fans: 4, morale: 2, board: -1 }, 'Fans excited; expectation rises', 'Heads come up. That will be the headline.'],
      ['Realistic', 'It is a fair target. We take it one game at a time.', { board: 3, conduct: 1 }, 'Board reassured', 'Pens barely move.'],
      ['Play it down', 'Ask me again after ten games.', { conduct: -1, fans: -1 }, 'Looks evasive', 'A ripple of laughter.']])); }
  // 3. a rival's comment (a generated rival manager)
  const best = oppXI(G, f).filter((p) => p.bowl >= 60).sort((a, b) => b.bowl - a.bowl)[0];
  const jab = best && isSpin(best.type) ? 'your batters can’t play spin' : best ? 'your top order is scared of real pace' : 'your bowlers will not last twenty overs';
  out.push(q('Radio host', `${mgr}, the ${on} manager, says ${jab}. Your response?`, [
    ['Rise to it', 'He can come and find out tonight.', { morale: 5, fans: 6, rival: -10, conduct: -3 }, 'Big headline; players fired up, more pressure on them', 'The room laughs. Cameras flash.'],
    ['Praise them', `Their bowlers are among the best in the league. We respect them.`, { board: 2, rival: 6, conduct: 2 }, 'Rival calmer; your batters less fired up', 'Polite applause at the back.'],
    ['Joke', 'I’ll pass that on to our batters. They could use the motivation.', { fans: 4, morale: 2, rival: -2 }, 'Light mood in the dressing room', `Laughter, even from the ${on} press officer.`]]));
  return out.slice(0, 3);
}
export function pressFor(G, f, when) {
  let p = pressOf(G, f); if (p) return p;
  p = G.s.press = { n: f.n, y: G.year, opp: oppOf(G, f), when: when || (f.res ? 'post' : 'pre'), i: 0, qs: pressQuestions(G, f, when || (f.res ? 'post' : 'pre')), log: [], fx: { morale: 0, fans: 0, board: 0, conduct: 0, rival: 0 }, done: false };
  return p;
}
export function pressBase(G, opp) {
  const t = G.teams[G.user]; const sq = t.squad.map((id) => G.P(id));
  return { morale: Math.round(sq.reduce((a, p) => a + (p.morale ?? 70), 0) / Math.max(1, sq.length)), fans: Math.round(t.fans), board: Math.round(t.board), conduct: Math.round((G.s.pillars || {}).conduct ?? 60), rival: Math.round(relOf(G, opp).respect) };
}
export function answerPress(G, ai, auto) {
  const p = G.s.press; if (!p || p.done) return null; const qq = p.qs[p.i]; if (!qq) return null; const a = qq.answers[ai] || qq.answers[1];
  const fx = a.fx; const t = G.teams[G.user];
  if (fx.morale) { const prom = promisedSet(G); for (const id of t.squad) { if (prom.has(id)) continue; const pl = G.P(id); pl.morale = clamp((pl.morale ?? 70) + fx.morale, 0, 100); } }
  if (fx.fans) t.fans = clamp(t.fans + fx.fans, 0, 100);
  // the board reads the press too, but one conference moves it by at most 2 either way: results decide
  const bd = fx.board ? clamp(p.fx.board + fx.board / 2, -2, 2) - p.fx.board : 0;
  if (bd) t.board = clamp(t.board + bd, 0, 100);
  if (fx.conduct) nudgePillar(G, 'conduct', fx.conduct);
  if (fx.rival) nudgeRel(G, p.opp, { respect: fx.rival, heat: fx.rival < 0 ? -fx.rival / 2 : 0, why: fx.rival < 0 ? `Press conference jibe, ${G.year}` : undefined });
  if (fx.happy && qq.pid) adjustHappy(G, qq.pid, fx.happy, fx.happy > 0 ? 'Backed in public by the manager' : 'Criticised in the press conference');
  for (const k of ['morale', 'fans', 'conduct', 'rival']) p.fx[k] += fx[k] || 0;
  p.fx.board += bd;
  p.log.push({ q: qq.text, tone: a.tone, room: a.room, sum: a.sum });
  logDecision(G, 'press', qq.text, `${a.tone}: “${a.said}”`, `${a.sum}${auto ? ' · assistant' : ''}`, { fix: p.n });
  p.i++; if (p.i >= p.qs.length) { p.done = true; G.news(`Press conference: ${p.log.map((l) => l.tone.toLowerCase()).join(', ')}`, 'press', { detail: p.log.map((l) => l.sum).join('. '), ne: 'पत्रकार सम्मेलन सम्पन्न' }); }
  return a;
}
// The assistant answers every remaining question with the measured option.
export function autoPress(G) { const p = G.s.press; while (p && !p.done) answerPress(G, 1, true); }
// After the user's match f: is a press conference still waiting?
export function pressAfter(G, f) {
  if (!pressDue(G, f)) return false; const p = pressOf(G, f);
  if (p && p.done) return false; return true;
}
export function pressBefore(G, f) { return pressDue(G, f) && !(pressOf(G, f) || {}).done && !f.res; }

// ===== Lifecycle: after the user's match =====
export function afterMatch(G, m, f) {
  if (!isUser(G, f)) return;
  G.s.md = { n: f.n, y: G.year, km: (m.km && m.km.hist) || [], tone: m.opt && m.opt.tone || null, imp: m.dug && m.dug.imp ? { ...m.dug.imp } : null };
  G.s.rd = null;
  if (pressDue(G, f)) {
    const p = pressOf(G, f);
    if (!p) pressFor(G, f, 'post'); else if (!p.done && p.i === 0) { G.s.press = null; pressFor(G, f, 'post'); }
    if (G.s.settings.assistant) autoPress(G);
  }
}
export function todayTasks(G) {
  const out = []; const f = G.userNext ? G.userNext() : null; if (!G.s.settings || G.s.settings.assistant) return out;
  if (f && (G.s.phase === 'league' || G.s.phase === 'playoffs')) {
    const p = prepOf(G, f); if (!p || !p.done) out.push({ key: 'prep', text: 'Matchday build-up', sub: p ? `${p.seen.length} of 5 steps looked at` : 'Opposition, conditions, selection, plan, team talk', to: '/prematch' });
    if (pressBefore(G, f)) out.push({ key: 'press', text: 'Press conference', sub: '3 questions before the match', to: '/press' });
  }
  return out;
}

// ===== Round-up =====
export function lastUserFixture(G) { return G.s.fixtures.filter((x) => x.res && isUser(G, x)).pop() || null; }
// Fixtures the round-up covers: everything since the user's previous match, up to the end of the
// user's last match day. Returns the unplayed fixtures on that day too, so the screen can sim them.
export function roundupScope(G) {
  const fu = lastUserFixture(G); if (!fu) return null; const F = G.s.fixtures;
  const mine = F.filter((x) => x.res && isUser(G, x)); const prev = mine.length > 1 ? mine[mine.length - 2] : null;
  const i0 = prev ? F.indexOf(prev) + 1 : 0; const i1 = F.indexOf(fu);
  const list = F.slice(i0, i1 + 1).concat(F.slice(i1 + 1).filter((x) => x.date === fu.date && !isUser(G, x)));
  return { fu, list, pending: list.filter((x) => !x.res) };
}
function perfs(G, f) {
  const out = [];
  (f.card || []).forEach((inn, k) => {
    const bowlT = k === 0 ? (f.card[1] ? f.card[1].t : inn.t === f.home ? f.away : f.home) : f.card[0].t;
    for (const [name, r, b, , , how] of inn.bat) out.push({ name, t: inn.t, v: r + (b ? (r / b - 1.2) * 10 : 0), txt: `${r}${how === 'not out' ? '*' : ''} (${b})`, bat: true, r });
    for (const [name, balls, r, w] of inn.bowl) out.push({ name, t: bowlT, v: w * 22 + (balls >= 12 ? (8 - r / (balls / 6)) * 3 : 0), txt: `${Math.floor(balls / 6)}${balls % 6 ? `.${balls % 6}` : ''}–${r}–${w}`, bat: false, w });
  });
  return out.sort((a, b) => b.v - a.v);
}
function scoreLine(G, f, k) { const s = f.res.sc && f.res.sc[k]; return s ? { t: s.t, txt: `${G.teams[s.t].name} ${s.r}/${s.w}`, ov: `(${Math.floor(s.b / 6)}${s.b % 6 ? `.${s.b % 6}` : ''})` } : null; }
export function buildRoundup(G) {
  const sc = roundupScope(G); if (!sc) return null; const { fu } = sc;
  if (G.s.rd && G.s.rd.n === fu.n && G.s.rd.y === G.year) return G.s.rd;
  const u = G.user, un = short(G, u), opp = oppOf(G, fu), on = short(G, opp);
  const played = sc.list.filter((x) => x.res);
  const leagueDates = [...new Set(G.s.fixtures.filter((x) => x.stage === 'L').map((x) => x.date))];
  const label = fu.stage === 'L' ? `Matchday ${leagueDates.indexOf(fu.date) + 1} round-up` : `${STAGE[fu.stage].replace(/^./, (c) => c.toUpperCase())} round-up`;
  const st = G.standings(); const order = st.map((r) => r.id); const prevOrder = G.s.rdPrev && G.s.rdPrev.y === G.year ? G.s.rdPrev.order : null;
  const pos = order.indexOf(u) + 1; const me = st[pos - 1];
  const r = fu.res; const won = r.winner === u; const P = perfs(G, fu); const mom = r.mom ? G.P(r.mom) : null;
  const topU = P.find((x) => x.t === u); const topO = P.find((x) => x.t === opp);
  // headline
  let head;
  const tablePhrase = fu.stage !== 'L' ? (won ? (fu.stage === 'F' ? 'champions' : 'through') : 'out') : pos === 1 ? (st[1] && st[1].pts === me.pts ? 'level at the top' : 'top of the table') : pos <= 4 ? `${ord(pos)} and in the playoff places` : `${ord(pos)}, outside the top four`;
  if (r.nr) head = `Rain at Kirtipur: ${un} and ${on} share the points`;
  else if (won) head = `${topU ? `${topU.name.split(' ').slice(-1)[0]}'s ${topU.bat ? topU.txt : topU.txt.split('–').pop() + ' wickets'}` : un} ${pickH(['sees', 'carries', 'drives'], `${fu.n}h`)} ${un} past ${on}; ${un} ${tablePhrase}`;
  else head = `${topO ? `${topO.name.split(' ').slice(-1)[0]} ${topO.bat ? `makes ${topO.r}` : `takes ${topO.w}`}` : on} as ${on} beat ${un}; ${un} ${tablePhrase}`;
  // radio paragraph
  const s0 = r.sc && r.sc[0], s1 = r.sc && r.sc[1]; const md = G.s.md && G.s.md.n === fu.n && G.s.md.y === G.year ? G.s.md : null;
  const bits = [];
  if (s0) bits.push(`${G.teams[s0.t].name} made ${s0.r}/${s0.w}${s0.b < (fu.res.overs || 20) * 6 && s0.w < 10 ? ` in a reduced game` : ''}.`);
  const km = md && md.km && md.km.filter((x) => !x.auto).slice(-1)[0];
  if (km) bits.push(`${km.title} The call from the dugout: ${km.pick.toLowerCase()}.`);
  if (s1) bits.push(r.winner === s1.t ? `${G.teams[s1.t].name} got there at ${s1.r}/${s1.w} with ${(fu.res.overs || 20) * 6 - s1.b} balls to spare.` : r.winner ? `${G.teams[s1.t].name} finished on ${s1.r}/${s1.w}.` : '');
  if (mom) bits.push(`${mom.name} was player of the match.`);
  bits.push(fu.att >= 15000 ? 'Kirtipur was full and loud.' : fu.att ? `${fu.att.toLocaleString('en-US')} at Kirtipur.` : '');
  const radio = bits.filter(Boolean).join(' ');
  const results = played.map((x) => { const pp = perfs(G, x); return { n: x.n, me: isUser(G, x), a: scoreLine(G, x, 0), b: scoreLine(G, x, 1), text: x.res.text, nr: x.res.nr, perf: pp.slice(0, 3).map((y) => `${y.name.split(' ').slice(-1)[0]} ${y.txt}`).join(' · '), home: x.home, away: x.away }; });
  // what it means
  const nxt = G.s.fixtures.find((x) => !x.res && isUser(G, x)); let mean, meanSub;
  if (fu.stage === 'L') {
    const lead = st[0], fourth = st[3]; const gap = lead.pts - me.pts; const cut = pos <= 4 ? me.pts - (st[4] ? st[4].pts : 0) : fourth.pts - me.pts;
    mean = pos === 1 ? (st[1].pts === me.pts ? `Level with ${short(G, st[1].id)} on ${me.pts} points, ahead on net run rate.` : `Top on ${me.pts} points, ${me.pts - st[1].pts} clear.`)
      : pos <= 4 ? `${ord(pos)} on ${me.pts} points, ${gap ? `${gap} behind ${short(G, lead.id)}` : `level with ${short(G, lead.id)}`}, ${cut} clear of 5th.` : `${ord(pos)} on ${me.pts} points, ${cut} behind 4th place.`;
    meanSub = `${nxt ? `Next: ${short(G, oppOf(G, nxt))} on ${nxt.date}. ` : ''}${pos <= 2 ? 'The top two get two chances to reach the final.' : pos <= 4 ? 'A top-two finish gives you a second chance in the playoffs.' : 'Only the top four go through.'}`;
  } else { mean = won ? (fu.stage === 'F' ? `${G.teams[u].name} are champions.` : nxt ? `Through to the ${STAGE[nxt.stage]}.` : 'Through.') : fu.stage === 'Q1' ? 'A second chance in Qualifier 2.' : 'The season is over.'; meanSub = nxt ? `Next: ${short(G, oppOf(G, nxt))} on ${nxt.date}.` : ''; }
  const table = st.map((x, i) => ({ id: x.id, pos: i + 1, pts: x.pts, nrr: x.nrr, mv: prevOrder ? prevOrder.indexOf(x.id) - i : 0 }));
  // team of the round
  const all = played.flatMap((x) => perfs(G, x)).sort((a, b) => b.v - a.v); const totr = [];
  for (const y of all) if (!totr.some((z) => z.name === y.name) && totr.length < 5 && (y.bat ? y.r >= 25 : y.w >= 2)) totr.push(y);
  // around the league
  const stories = [];
  for (const id of order) { if (id === u) continue; const fm = (G.teams[id].form || []).slice(-3); if (fm.length === 3 && fm.every((x) => x === 'L')) stories.push({ when: short(G, id), t: `Three defeats in a row for ${G.teams[id].name}`, s: `${rivalManager(G, id)} (generated manager): “We have stopped doing the simple things.”` }); else if (fm.length === 3 && fm.every((x) => x === 'W')) stories.push({ when: short(G, id), t: `${G.teams[id].name} have won three in a row`, s: `Up to ${ord(order.indexOf(id) + 1)}. ${nxt && oppOf(G, nxt) === id ? 'You play them next.' : ''}` }); }
  const ids = new Set(); for (const x of played) for (const side of [x.home, x.away]) for (const id of G.teams[side].squad) ids.add(id);
  const young = [...ids].map((id) => G.P(id)).filter((p) => p && p.real === false && p.age <= 21 && p.team !== u && p.stats[G.year] && p.lastPlayed != null && played.some((x) => x.n === p.lastPlayed));
  const yb = young.map((p) => ({ p, pf: all.find((y) => y.name === p.name) })).filter((x) => x.pf && (x.pf.bat ? x.pf.r >= 30 : x.pf.w >= 2))[0];
  if (yb) stories.unshift({ when: short(G, yb.p.team), t: `${yb.p.name}, ${yb.p.age}, ${yb.pf.bat ? `makes ${yb.pf.r}` : `takes ${yb.pf.w} wickets`}`, s: `Generated player${yb.p.prov ? ` from ${yb.p.prov} Province` : ''}. ${yb.p.scouted ? 'Your scouts know him.' : 'Your scouts have not seen him yet.'}`, to: `/player/${yb.p.id}` });
  const caps = Object.values(G.players).filter((p) => p.stats[G.year] && p.stats[G.year].r > 0).sort((a, b) => b.stats[G.year].r - a.stats[G.year].r)[0];
  if (caps) stories.push({ when: 'Caps', t: `${caps.name} leads the Platinum Cap race on ${caps.stats[G.year].r} runs`, s: 'In-game season to date.' });
  const rd = { n: fu.n, y: G.year, label, date: fu.date, head, radio, results, mean, meanSub, table, totr: totr.map((x) => ({ name: x.name, t: x.t, txt: x.txt })), stories: stories.slice(0, 4), won, stage: fu.stage };
  G.s.rd = rd; G.s.rdPrev = { y: G.year, order };
  return rd;
}

// ===== Routing =====
// After the user's match: press (when scheduled) → round-up → Home. The occasions module wins.
// Press (when scheduled) first, then the round-up. Playoff week and final week come after the
// round-up (its Continue goes to G.s.rdNext); the trophy and the season review replace it.
export function postMatchPath(G, f, occ) {
  if (f && f.res && pressAfter(G, f) && !G.s.settings.assistant) return '/press';
  if (occ === '/trophy' || occ === '/review') return occ;
  G.s.rdNext = occ || null;
  return '/roundup';
}
