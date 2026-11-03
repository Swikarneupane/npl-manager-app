// ===== Phase 2 module: world cricket =====
// Foreign T20 leagues (light simulation), Nepali players abroad and NOC requests, Nepal's 50-over
// pathway, World Cups, team and player rankings (the game's own, not the ICC's), the World Test
// Championship and a feed of series around the world. State lives in G.s.world.
// Everything here after the save starts is simulated and labelled "in-game".
import { R, ri, rf, pick, clamp, shuffle, ovr, Match } from './engine.js';
import { adjustHappy, logDecision } from './depth.js';
import { OS_NAMES } from './data.js';
import { LEAGUES, LEAGUE_BY, REAL_2026, NATION, NATIONS, CODE_BY_NAME, FULL_MEMBERS, TEST_TEAMS, LEAGUE2_TEAMS, CHALLENGE_GROUPS, worldCupsFor } from './world-data.js';

export const LABEL = 'in-game, not ICC';
export const nm = (c) => (NATION[c] ? NATION[c].name : c);
const W = (G) => G.s.world;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ----- light match model -----
// A result from two strengths on the game's scale: who won, both innings [runs, wkts, balls] and the margin.
export function simGame(sa, sb, fmt) {
  const T = fmt !== 'ODI'; const maxB = T ? 120 : 300; const par = T ? 160 : 265;
  const pa = 1 / (1 + Math.exp(-(sa - sb) / (T ? 6 : 5))); const aWin = R() < pa; const aFirst = R() < 0.5;
  const firstWins = aFirst ? aWin : !aWin;
  const s1 = Math.max(T ? 90 : 150, Math.round(par + rf(-1, 1) * (T ? 30 : 45) + (firstWins ? 8 : -8)));
  const w1 = ri(3, 10); const i1 = [s1, w1, w1 === 10 ? ri(Math.round(maxB * 0.8), maxB) : maxB];
  let i2, m;
  if (firstWins) { const mg = ri(1, T ? 55 : 95); const w2 = R() < 0.5 ? 10 : ri(5, 9); i2 = [s1 - mg, w2, w2 === 10 ? ri(Math.round(maxB * 0.7), maxB) : maxB]; m = `by ${mg} run${mg > 1 ? 's' : ''}`; }
  else { const w2 = ri(1, 8); i2 = [s1 + ri(1, T ? 6 : 4), w2, ri(Math.round(maxB * 0.7), maxB - 1)]; m = `by ${10 - w2} wicket${10 - w2 > 1 ? 's' : ''}`; }
  return { aWin, aFirst, i1, i2, m, maxB };
}
export const scoreStr = (i) => (i[1] >= 10 ? `${i[0]}` : `${i[0]}/${i[1]}`);
const ovStr = (b) => `${Math.floor(b / 6)}${b % 6 ? `.${b % 6}` : ''}`;

// ----- strengths and Elo -----
const eloOf = (s) => 1000 + (s - 75) * 25;
const strOf = (r) => 75 + (r - 1000) / 25;
// Nepal's strength comes from the real squad in the save: the average rating of the likely XI.
export function nepStrength(G) {
  if (!G.s.players) return 74;
  const sel = G.pickNepal(); const P = Object.fromEntries(sel.squad.map((id) => [id, G.P(id)]));
  if (sel.squad.length < 11) return 70;
  const xi = G.intlLineup(sel.squad, P).xi; return xi.reduce((a, id) => a + ovr(G.P(id)), 0) / xi.length - 2;
}
function strength(G, code, fmt, cache) {
  if (code === 'NEP') return cache && cache.nep != null ? cache.nep : (cache ? (cache.nep = nepStrength(G)) : nepStrength(G));
  const e = W(G).elo[fmt === 'ODI' ? 'odi' : 't20i'][code]; return e != null ? strOf(e) : 60;
}
function eloUpdate(G, fmt, a, b, aWin) {
  const E = W(G).elo[fmt === 'ODI' ? 'odi' : 't20i']; if (fmt === 'Test') return;
  const ra = E[a] ?? 900, rb = E[b] ?? 900; const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400)); const k = 20;
  E[a] = Math.round(ra + k * ((aWin ? 1 : 0) - ea)); E[b] = Math.round(rb - k * ((aWin ? 1 : 0) - ea));
}
// Plays a light match between two nations and updates the rankings.
function play(G, a, b, fmt, cache) {
  const g = simGame(strength(G, a, fmt, cache), strength(G, b, fmt, cache), fmt); eloUpdate(G, fmt, a, b, g.aWin); return g;
}

// ----- tables -----
// Rows: {code: [p, w, l, nr, rf, bf, ra, ba]}; points 2 a win, 1 a no result.
const row0 = () => [0, 0, 0, 0, 0, 0, 0, 0];
function addResult(rows, a, b, g) {
  const A = (rows[a] ??= row0()), B = (rows[b] ??= row0());
  const ia = g.aFirst ? g.i1 : g.i2, ib = g.aFirst ? g.i2 : g.i1; const bal = (i) => (i[1] >= 10 ? g.maxB : i[2]);
  A[0]++; B[0]++; if (g.nr) { A[3]++; B[3]++; return; }
  if (g.aWin) { A[1]++; B[2]++; } else { A[2]++; B[1]++; }
  A[4] += ia[0]; A[5] += bal(ia); A[6] += ib[0]; A[7] += bal(ib); B[4] += ib[0]; B[5] += bal(ib); B[6] += ia[0]; B[7] += bal(ia);
}
const nrrOf = (r) => (r[5] && r[7] ? r[4] / (r[5] / 6) - r[6] / (r[7] / 6) : 0);
// Sorted table: [{code, p, w, l, nr, pts, nrr}]
export function tableOf(rows) {
  return Object.entries(rows).map(([code, r]) => ({ code, p: r[0], w: r[1], l: r[2], nr: r[3], pts: r[1] * 2 + r[3], nrr: nrrOf(r) }))
    .sort((x, y) => y.pts - x.pts || y.nrr - x.nrr || x.code.localeCompare(y.code));
}
function roundRobin(G, teams, fmt, rows, cache, legs = 1) { for (let k = 0; k < legs; k++) for (let i = 0; i < teams.length; i++) for (let j = i + 1; j < teams.length; j++) addResult(rows, teams[i], teams[j], play(G, teams[i], teams[j], fmt, cache)); return rows; }

// ----- seeds -----
function seedElo() { const o = { t20i: {}, odi: {} }; for (const n of NATIONS) { o.t20i[n[0]] = eloOf(n[2]); o.odi[n[0]] = eloOf(n[3]); } return o; }
function real2026() {
  const rows = {}; for (const L of LEAGUES) { const r = REAL_2026[L.k]; rows[L.k] = { champ: r.champ, runner: r.runner, margin: r.margin, when: r.when, story: r.story, real: true, nep: r.nep || '' }; }
  return { y: 2026, rows, heads: [
    { m: 'Jan', t: 'Rajshahi Warriors win the BPL final by 63 runs' }, { m: 'May', t: 'Peshawar Zalmi beat the debutants Hyderabad Kingsmen in the PSL final' },
    { m: 'May', t: 'Royal Challengers Bengaluru win the IPL again' }, { m: 'Jul', t: 'Los Angeles Knight Riders win the MLC final by one run' }, { m: 'Sep', t: 'Antigua and Barbuda Falcons win their first CPL title' }] };
}
// CWC League 2 2023-27: an in-game final table for the real eight teams. Nepal finish in the bottom four,
// which matches the real calendar: Nepal host and play the Qualifier Play-off in December 2026.
function seedL2(G) {
  const E = seedElo(); const fake = { s: { world: { elo: E } } }; let rows;
  for (let t = 0; t < 40; t++) {
    rows = {}; const T = LEAGUE2_TEAMS; const extra = shuffle(T.slice());
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) for (let k = 0; k < 5; k++) addResult(rows, T[i], T[j], nrSim(play(fake, T[i], T[j], 'ODI')));
    for (let i = 0; i < 8; i += 2) addResult(rows, extra[i], extra[i + 1], nrSim(play(fake, extra[i], extra[i + 1], 'ODI')));
    const pos = tableOf(rows).findIndex((x) => x.code === 'NEP'); if (pos >= 4) break;
  }
  return { from: 2023, to: 2027, teams: LEAGUE2_TEAMS.slice(), rows, done: true };
}
const nrSim = (g) => { if (R() < 0.02) g.nr = true; return g; };

// ----- migrate -----
export function migrate(G) {
  const s = G.s; if (!s) return;
  const w = (s.world ??= {});
  w.v ??= 1; w.noc ??= []; w.feed ??= []; w.wcHist ??= []; w.qual ??= {};
  w.elo ??= seedElo();
  w.lg ??= real2026();
  w.l2 ??= seedL2(G);
  w.tier ??= 'l2'; w.po ??= null; w.wcq ??= null; w.cl ??= null; w.wc ??= null; w.clash ??= null;
  w.wtc ??= { from: 2025, to: 2027, rows: {}, past: [] };
  w.trk ??= teamSnapshot(G, null);
  w.gen ??= genPlayers(s.players ? new Set(Object.values(s.players).map((p) => p.name)) : null);
  if (!s.players) return;
  // Sandeep Lamichhane's real 2025-26 BPL season (Rajshahi Warriors won the title)
  const L = Object.values(s.players).find((p) => p.name === 'Sandeep Lamichhane' && p.real !== false);
  if (L) { L.abroad ??= []; if (!L.abroad.some((a) => a.y === 2026 && a.league === 'bpl')) L.abroad.push({ y: 2026, league: 'bpl', team: 'Rajshahi Warriors', real: 1, champ: 1 }); }
  w.prk ??= playerSnapshot(G, null);
}

// ===== Leagues abroad =====
const kindLabel = (k) => (k === 'inj' ? 'injury replacement' : 'development contract');
// The year's digest: the eight foreign leagues (simulated after 2026) and the NPL from history.
export function digest(G) {
  const w = W(G); const lg = w.lg; const Y = lg.y; const rows = [];
  for (const L of LEAGUES) { const r = lg.rows[L.k]; if (!r) continue; rows.push({ k: L.k, short: L.short, league: L.name, ...r, nepal: nepalisIn(G, Y, L.k) }); }
  const h = (G.s.history || []).find((x) => x.year === Y);
  if (h && G.teams[h.champion]) {
    const mg = /by (\d+ \w+)/.exec(h.final || ''); const mine = h.champion === G.user || h.runner === G.user;
    rows.push({ k: 'npl', short: 'NPL', league: 'Nepal Premier League', champ: G.teams[h.champion].name, runner: G.teams[h.runner] ? G.teams[h.runner].name : '', margin: mg ? `by ${mg[1]}` : '', when: 'Nov', npl: true, real: Y <= 2025,
      story: `${h.final}.${h.pot ? ` Player of the tournament: ${h.pot}.` : ''}`, nep: mine ? (h.champion === G.user ? 'Your team won the title.' : 'Your team lost the final.') : '', nepal: [] });
  } else rows.push({ k: 'npl', short: 'NPL', league: 'Nepal Premier League', champ: '', runner: '', margin: '', when: 'Nov', npl: true, pending: true, story: `The ${Y} NPL is still to be decided.`, nep: '', nepal: [] });
  return { y: Y, rows, heads: lg.heads || [], champs: nepaliChamps(G, Y), coming: comingUp(G) };
}
function stintsOf(G, y) { const out = []; for (const p of Object.values(G.players)) if (p.abroad) for (const a of p.abroad) if (a.y === y) out.push({ p, a }); return out; }
function nepalisIn(G, y, k) { return stintsOf(G, y).filter((x) => x.a.league === k); }
export function nepaliChamps(G, y) { return stintsOf(G, y).filter((x) => x.a.champ || x.a.ru); }
// Leagues starting this winter, and the Nepali players signed for the coming year.
export function comingUp(G) {
  const y = G.year; const signed = stintsOf(G, y);
  return { leagues: LEAGUES.filter((l) => l.winter).map((l) => ({ k: l.k, short: l.short, name: l.name, start: l.start })), signed, mine: signed.filter((x) => x.p.team === G.user).length };
}
function stintStats(p, a) {
  const m = a.kind === 'dev' ? ri(1, 5) : ri(3, 9); a.m = m;
  a.r = p.bat >= 45 ? Math.round(m * rf(6, 30) * (p.bat / 75)) : ri(0, m * 3);
  a.w = p.bowl >= 50 ? Math.max(0, Math.round(m * rf(0.3, 1.6) * (p.bowl / 80))) : 0; delete a.pend;
}
// Simulates the year's foreign leagues: four teams reach the knockouts, two the final.
function simLeagues(G, Y) {
  const rows = {}; const heads = []; const stints = stintsOf(G, Y);
  for (const x of stints) if (x.a.pend) stintStats(x.p, x.a);
  for (const L of LEAGUES) {
    const t = shuffle(L.teams.slice()); const champ = t[0], runner = t[1]; const g = simGame(76, 74, 'T20');
    const cw = g.aWin; const ci = cw ? (g.aFirst ? g.i1 : g.i2) : (g.aFirst ? g.i2 : g.i1); const ri2 = cw ? (g.aFirst ? g.i2 : g.i1) : (g.aFirst ? g.i1 : g.i2);
    const chased = /wicket/.test(g.m); const left = 120 - ci[2];
    const story = chased ? `${runner} made ${scoreStr(ri2)}. ${champ} chased it ${left <= 3 ? 'in the last over' : `with ${left} balls to spare`}, ${ci[0]} for ${ci[1]}.`
      : (parseInt(g.m.slice(3), 10) >= 30 ? `${champ} posted ${scoreStr(ci)} and bowled ${runner} out for ${ri2[0]}. A one-sided final.` : `${champ} defended ${ci[0]}; ${runner} finished on ${scoreStr(ri2)}, ${g.m.slice(3)} short.`);
    rows[L.k] = { champ, runner, margin: g.m, when: L.fin, story, nep: '' };
    const here = stints.filter((x) => x.a.league === L.k);
    for (const x of here) { if (x.a.team === champ) x.a.champ = 1; else if (x.a.team === runner) x.a.ru = 1; }
    if (here.length) rows[L.k].nep = here.map((x) => `${x.p.name} (${x.a.team}): ${x.a.m} game${x.a.m > 1 ? 's' : ''}, ${x.a.r} runs, ${x.a.w} wickets${x.a.team === champ ? ', champion' : x.a.team === runner ? ', runner-up' : ''}`).join('. ') + '.';
    if (left <= 3 && chased || g.m === 'by 1 run') heads.push({ m: L.fin, t: `Last-over finish in the ${L.short} final` });
    else if (!chased && parseInt(g.m.slice(3), 10) >= 40) heads.push({ m: L.fin, t: `${champ.split(' ').slice(0, 2).join(' ')} win a one-sided ${L.short} final` });
  }
  for (const x of stints) if (x.a.champ) heads.unshift({ m: LEAGUE_BY[x.a.league].fin, t: `${x.p.name} wins the ${LEAGUE_BY[x.a.league].short} with ${x.a.team}` });
  if (heads.length < 3) heads.push({ m: 'May', t: `${rows.ipl.champ} beat ${rows.ipl.runner} in the IPL final` });
  heads.sort((a, b) => MONTHS.indexOf(a.m) - MONTHS.indexOf(b.m));
  W(G).lg = { y: Y, rows, heads: heads.slice(0, 5) };
}
// Nepali players picked up abroad for the coming year: Lamichhane at Rajshahi, and a few others from the AI clubs.
function signAbroad(G) {
  const y = G.year; const nep = Object.values(G.players).filter((p) => p.nat === 'NEP' && !p.retired);
  const add = (p, league, team) => { p.abroad ??= []; if (p.abroad.some((a) => a.y === y)) return; p.abroad.push({ y, league, team, pend: 1 }); if (p.abroad.length > 10) p.abroad.splice(0, p.abroad.length - 10); };
  const L = nep.find((p) => p.name === 'Sandeep Lamichhane' && p.real !== false && ovr(p) >= 70 && p.team !== G.user);
  if (L) add(L, 'bpl', 'Rajshahi Warriors');
  const pool = nep.filter((p) => p.team && p.team !== G.user && ovr(p) >= 74 && p !== L);
  for (const p of shuffle(pool).slice(0, ri(0, 2))) { const lg = pick(['ilt20', 'bpl', 'cpl', 'mlc']); add(p, lg, pick(LEAGUE_BY[lg].teams)); }
}

// ===== NOC requests =====
// Foreign clubs ask for the user's Nepali players: development contracts and injury replacements.
function makeRequests(G) {
  const w = W(G); const y = G.year; const t = G.teams[G.user]; if (!t) return;
  const cand = t.squad.map((id) => G.P(id)).filter((p) => p && p.nat === 'NEP' && !p.retired && ovr(p) >= 66 && !(p.abroad || []).some((a) => a.y === y)).sort((a, b) => ovr(b) - ovr(a));
  const n = Math.min(cand.length, ri(1, 3));
  for (const p of shuffle(cand.slice(0, 6)).slice(0, n)) {
    const inj = R() < 0.45; const pool = inj ? (ovr(p) >= 80 ? ['ipl', 'psl', 'bbl', 'bpl'] : ['bpl', 'psl', 'cpl', 'ilt20']) : ['ilt20', 'bpl', 'cpl', 'mlc', 'sa20'];
    const lg = pick(pool); const L = LEAGUE_BY[lg];
    const r = { id: `noc${y}${p.id}`, y, pid: p.id, league: lg, team: pick(L.teams), kind: inj ? 'inj' : 'dev', fee: inj ? ri(5, 12) : ri(2, 5), exp: inj ? 1 : 2, risk: inj ? { inj: 15, fat: 12 } : { inj: 8, fat: 6 }, status: 'open' };
    w.noc.push(r);
    G.news(`${r.team} ask for an NOC for ${p.name}`, 'world', { club: true, to: '/world?tab=nepalis', detail: `${L.name} · ${kindLabel(r.kind)} · fee Rs ${r.fee} L to the club. Refusing will upset him.`, ne: `${p.name}का लागि ${L.short}बाट अनुमति माग`, tags: [`Fee Rs ${r.fee} L`] });
    if (G.s.settings && G.s.settings.assistant) decideNoc(G, r.id, assistantGrants(G, r), 'assistant');
  }
  if (w.noc.length > 30) w.noc.splice(0, w.noc.length - 30);
}
// The assistant grants development contracts and lets fringe players go; it keeps the top three at home for injury cover deals.
export function assistantGrants(G, r) {
  if (r.kind === 'dev') return true;
  const t = G.teams[G.user]; const top = t.squad.map((id) => G.P(id)).sort((a, b) => ovr(b) - ovr(a)).slice(0, 3).map((p) => p.id);
  return !top.includes(r.pid) && t.captainId !== r.pid;
}
export const openNocs = (G) => W(G).noc.filter((r) => r.status === 'open');
// Grant: fee, experience (a rating gain up to potential), and injury and fatigue risk. Refuse: he is unhappy.
export function decideNoc(G, id, grant, how) {
  const r = W(G).noc.find((x) => x.id === id); if (!r || r.status !== 'open') return null; const p = G.P(r.pid); const L = LEAGUE_BY[r.league]; const t = G.teams[G.user];
  let outcome;
  if (grant) {
    t.balance += r.fee; const add = Math.min(r.exp, Math.max(0, (p.pot || ovr(p)) - ovr(p)));
    if (add) { if (p.role === 'BOWL' || (p.role === 'AR' && p.bowl > p.bat)) p.bowl = clamp(p.bowl + add, 10, 96); else p.bat = clamp(p.bat + add, 10, 96); }
    p.fit = clamp(p.fit - r.risk.fat, 30, 100); p.nocRisk = { y: r.y, inj: r.risk.inj, fat: r.risk.fat, league: r.league };
    p.abroad ??= []; p.abroad.push({ y: r.y, league: r.league, team: r.team, pend: 1, kind: r.kind }); if (p.abroad.length > 10) p.abroad.splice(0, p.abroad.length - 10);
    adjustHappy(G, p.id, 3, `Allowed to play in the ${L.short}`);
    r.status = 'granted'; r.gain = add; outcome = `Rs ${r.fee} L to the club. Rating +${add}. Fitness −${r.risk.fat}; ${r.risk.inj}% injury risk before the NPL.`;
  } else {
    const d = r.kind === 'dev' ? -10 : -7; adjustHappy(G, p.id, d, `Refused an NOC for the ${L.short}`);
    r.status = 'refused'; outcome = `${p.name} is unhappy (happiness ${d}).`;
  }
  r.how = how || 'you'; r.outcome = outcome;
  logDecision(G, 'noc', `NOC for ${p.name}: ${r.team} (${L.short}, ${kindLabel(r.kind)})`, `${grant ? 'Grant' : 'Refuse'}${how === 'expired' ? ' (not answered in time)' : how === 'assistant' ? ' (assistant)' : ''}`, outcome, { pid: p.id });
  return r;
}
function expireNocs(G) { for (const r of openNocs(G)) decideNoc(G, r.id, assistantGrants(G, r), 'expired'); }

// ===== Calendar clash with the pre-season camp =====
function makeClash(G) {
  const w = W(G); const y = G.year; if (w.clash && w.clash.y === y) return;
  const sel = G.pickNepal(); const pids = sel.squad.filter((id) => G.P(id).team === G.user);
  if (!pids.length) { w.clash = null; return; }
  const comp = w.tier === 'cl' ? 'CWC Challenge League round' : 'CWC League 2 tri-series';
  w.clash = { y, comp, when: `Sep ${y}`, days: ri(6, 12), pids, status: 'open' };
  if (G.s.settings && G.s.settings.assistant) decideClash(G, 'without', 'assistant');
}
export function decideClash(G, pick, how) {
  const c = W(G).clash; if (!c || c.status !== 'open') return null; const t = G.teams[G.user];
  c.status = pick; c.how = how || 'you';
  const names = c.pids.map((id) => G.P(id).name).join(', ');
  c.outcome = pick === 'move' ? 'Rs 3 L to move the camp; the national players join it in full.' : `${names} miss the camp and start the season 8 fitness down.`;
  if (pick === 'move') t.balance -= 3;
  logDecision(G, 'clash', `${c.comp} overlaps the pre-season camp by ${c.days} days`, `${pick === 'move' ? 'Move the camp' : 'Train without them'}${how === 'expired' ? ' (not answered in time)' : how === 'assistant' ? ' (assistant)' : ''}`, c.outcome);
  return c;
}

// ===== Pathway: League 2, Play-off, Qualifier, Challenge League =====
// Nepal's results in a winter's events against a set of nations, as table rows.
function nepalGamesVs(G, w, codes, fmt) {
  const N = G.s.nepal; const out = [];
  if (N.winter !== w || !N.results) return out;
  for (const rec of N.results) {
    if (!rec.official || rec.fmt !== fmt) continue; const opp = CODE_BY_NAME[(rec.short || '').replace(/^v /, '')]; if (!opp || !codes.includes(opp)) continue;
    for (const g of rec.games) out.push({ opp, r: g.r, nep: g.nep, oppS: g.opp });
  }
  return out;
}
const parseS = (s) => { const [r, w] = String(s || '0').split('/'); return [parseInt(r, 10) || 0, w == null ? 10 : parseInt(w, 10)]; };
function addNepalGame(rows, x, maxB) {
  const [nr, nw] = parseS(x.nep), [or, ow] = parseS(x.oppS);
  const g = { aWin: x.r === 'W', aFirst: true, i1: [nr, nw, maxB], i2: [or, ow, maxB], maxB, nr: x.r !== 'W' && x.r !== 'L' };
  addResult(rows, 'NEP', x.opp, g);
}
// Each year of a cycle: Nepal's engine-played ODIs against cycle teams, then the rest filled in to about nine games a team.
function cycleYear(G, w, C, cache) {
  for (const x of nepalGamesVs(G, w, C.teams, 'ODI')) addNepalGame(C.rows, x, 300);
  const others = C.teams.filter((c) => c !== 'NEP'); const per = Math.ceil(36 / Math.max(1, C.to - C.from));
  for (const c of others) { let k = 0; while (((C.rows[c] || [0])[0] < per * (w - C.from + 1)) && k++ < 12) { const o = pick(others.filter((x) => x !== c)); addResult(C.rows, c, o, nrSim(play(G, c, o, 'ODI', cache))); } }
}
// A tri-series at the start of the NPL pre-season: four games for Nepal.
function preseasonSeries(G) {
  const w = W(G); const C = w.tier === 'cl' ? w.cl : w.l2; if (!C || C.done || G.year >= C.to) return null;
  const opps = shuffle(C.teams.filter((c) => c !== 'NEP')).slice(0, 2); const cache = {}; const res = [];
  for (const o of opps) for (let k = 0; k < 2; k++) { const g = nrSim(play(G, 'NEP', o, 'ODI', cache)); addResult(C.rows, 'NEP', o, g); res.push({ o, win: g.aWin, m: g.m }); }
  addResult(C.rows, opps[0], opps[1], play(G, opps[0], opps[1], 'ODI', cache)); addResult(C.rows, opps[1], opps[0], play(G, opps[1], opps[0], 'ODI', cache));
  const won = res.filter((x) => x.win).length;
  pushFeed(G, { when: `Sep ${G.year}`, t: `${C === w.cl ? 'Challenge League' : 'CWC League 2'} tri-series: Nepal, ${nm(opps[0])} and ${nm(opps[1])}`, sub: `Nepal won ${won} of 4 · in-game`, nep: true });
  return res;
}
// The 5-regular schedule on 8 teams: everyone plays everyone except their two neighbours on a ring.
function playoff(G, teams, nepW, cache) {
  const ring = shuffle(teams.slice()); const rows = {}; const n = ring.length; const pairs = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = Math.min(j - i, n - (j - i)); if (d > 1) pairs.push([ring[i], ring[j]]); }
  const nepPairs = pairs.filter((p) => p.includes('NEP')); const wins = new Set(shuffle(nepPairs.slice()).slice(0, nepW == null ? -1 : nepW));
  for (const [a, b] of pairs) {
    if (nepW != null && (a === 'NEP' || b === 'NEP')) { const g = simGame(75, 75, 'ODI'); const nepA = a === 'NEP'; const nepWin = wins.has(nepPairs.find((p) => p[0] === a && p[1] === b));
      g.aWin = nepA ? nepWin : !nepWin; addResult(rows, a, b, g); eloUpdate(G, 'ODI', a, b, g.aWin); }
    else addResult(rows, a, b, play(G, a, b, 'ODI', cache));
  }
  return rows;
}
const compact = (rows) => tableOf(rows).map((x) => [x.code, x.p, x.w, x.l, x.nr, x.pts, Math.round(x.nrr * 100) / 100]);
// End of a 50-over cycle: League 2's top four go to the Qualifier; the bottom four and the Challenge League's
// top four play the Play-off; its top four join them. In the game the next League 2 is those eight.
function endCycle(G, wint, cache) {
  const w = W(G); const N = G.s.nepal; const year = wint + 1; const L2 = w.l2; const t2 = tableOf(L2.rows).map((x) => x.code);
  let clTop;
  if (w.tier === 'cl' && w.cl) clTop = tableOf(w.cl.rows).map((x) => x.code).slice(0, 4);
  else clTop = [...shuffle(CHALLENGE_GROUPS.A.slice()).sort((a, b) => NATION[b].odi - NATION[a].odi + rf(-4, 4)).slice(0, 2), ...shuffle(CHALLENGE_GROUPS.B.slice()).sort((a, b) => NATION[b].odi - NATION[a].odi + rf(-4, 4)).slice(0, 2)];
  const top4 = t2.slice(0, 4); const poTeams = [...t2.slice(4), ...clTop];
  let nepW = null;
  if (poTeams.includes('NEP')) { const rec = N.winter === wint && (N.results || []).find((r) => /^cwcq-po/.test(r.id)); nepW = rec ? rec.w : null; }
  const poRows = playoff(G, poTeams, nepW, cache); const poT = tableOf(poRows).map((x) => x.code);
  w.po = { y: wint, rows: compact(poRows), top: poT.slice(0, 4), nepW };
  // the Qualifier: eight from the pathway and the two lowest-ranked full members outside the hosts
  const cup = worldCupsFor(year).find((c) => c.fmt === 'ODI') || { y: year, name: `ODI World Cup ${year}` };
  const hosts = cup.hosts ? NATIONS.filter((n) => cup.hosts.includes(n[1])).map((n) => n[0]) : [];
  const fm = FULL_MEMBERS.filter((c) => !hosts.includes(c)).sort((a, b) => w.elo.odi[a] - w.elo.odi[b]).slice(0, 2);
  const qTeams = [...top4, ...poT.slice(0, 4), ...fm]; const qRows = roundRobin(G, qTeams, 'ODI', {}, cache); const qT = tableOf(qRows).map((x) => x.code);
  w.wcq = { y: year, cup: cup.name, rows: compact(qRows), top: qT.slice(0, 4) };
  w.qual[`odi${cup.y}`] = qT.slice(0, 4).includes('NEP');
  // the next cycle
  const nextL2 = [...top4, ...poT.slice(0, 4)];
  w.l2 = { from: L2.to, to: L2.to + 4, teams: nextL2, rows: Object.fromEntries(nextL2.map((c) => [c, row0()])), done: false, prev: { from: L2.from, to: L2.to, rows: compact(L2.rows) } };
  if (nextL2.includes('NEP')) { w.tier = 'l2'; w.cl = null; }
  else { w.tier = 'cl'; const grp = shuffle([...CHALLENGE_GROUPS.A, ...CHALLENGE_GROUPS.B].filter((c) => !nextL2.includes(c))).slice(0, 5); w.cl = { from: L2.to, to: L2.to + 3, teams: ['NEP', ...grp], rows: Object.fromEntries(['NEP', ...grp].map((c) => [c, row0()])) }; }
  const nepQ = w.qual[`odi${cup.y}`]; const nepPO = poT.indexOf('NEP');
  G.news(nepQ ? `Nepal qualify for the ${cup.name}` : (top4.includes('NEP') || nepPO >= 0 && nepPO < 4) ? `Nepal miss out at the World Cup Qualifier` : `Nepal finish ${nepPO + 1}th in the Qualifier Play-off`, 'intl',
    { to: '/international', sub: nepQ ? 'Milestone' : 'Pathway', detail: `In-game: Play-off ${nepPO >= 0 ? `${nepPO + 1}th of 8` : 'not needed'}; Qualifier ${qT.indexOf('NEP') >= 0 ? `${qT.indexOf('NEP') + 1}th of 10` : 'not reached'}. Next: ${w.tier === 'l2' ? `CWC League 2 ${w.l2.from}–${String(w.l2.to).slice(2)}` : 'the Challenge League'}.`, ne: nepQ ? `नेपाल ${cup.name}मा छनोट` : 'नेपालको विश्वकप यात्रा' });
}

// ===== World Cups =====
// T20: four groups of five, top two to the Super 8 (two groups of four), semi-finals and a final.
// ODI: two groups of seven, top two to the semi-finals (the game's format).
function knownPlayers(G, code, xi) {
  if (code === 'NEP') return xi.map((id) => G.P(id));
  return Object.values(G.players).filter((p) => p.nat === code && !p.retired && p.intlStatus === 'active').sort((a, b) => ovr(b) - ovr(a)).slice(0, 5);
}
function creditStats(wc, code, players, inn, oppInn, T) {
  const bats = players.filter((p) => p.bat >= 50).slice(0, 5); let pool = inn[0];
  for (const p of bats) { const r = Math.min(pool, Math.round(Math.pow(R(), 1.4) * (T ? 75 : 120) * (p.bat / 75))); pool -= r; stat(wc, p, code)[0] += r; }
  const bowl = players.filter((p) => p.bowl >= 55).slice(0, 4); let wk = oppInn[1];
  for (const p of bowl) { const s = stat(wc, p, code); const w = Math.min(wk, R() < 0.5 ? ri(0, 2) : ri(0, 3)); wk -= w; s[1] += w; const balls = T ? 24 : 60; s[2] += balls; s[3] += Math.round(balls / 6 * clamp((T ? 8.2 : 5.4) - (p.bowl - 70) / 12 + rf(-2, 2), 3, 14)); }
}
function stat(wc, p, code) { return (wc.st[p.id] ??= [0, 0, 0, 0, code, p.name]); }
function bestLine(wc, code, players, before) {
  let br = null, bw = null; for (const p of players) { const s = wc.st[p.id]; if (!s) continue; const b = before[p.id] || [0, 0, 0, 0]; const r = s[0] - b[0], w = s[1] - b[1]; if (!br || r > br[1]) br = [p.name, r]; if (w && (!bw || w > bw[1])) bw = [p.name, w, s[3] - b[3]]; }
  return [br && br[1] >= 25 ? `${br[0]} ${br[1]}` : null, bw && bw[1] >= 2 ? `${bw[0]} ${bw[1]} for ${bw[2]}` : null].filter(Boolean).join(' · ');
}
function newCup(G, cup) {
  const w = W(G); const fmt = cup.fmt; const E = w.elo[fmt === 'ODI' ? 'odi' : 't20i'];
  const byElo = (cs) => cs.slice().sort((a, b) => E[b] - E[a]);
  let field; const assoc = byElo(NATIONS.map((n) => n[0]).filter((c) => !FULL_MEMBERS.includes(c)));
  const qkey = `${fmt === 'ODI' ? 'odi' : 't20'}${cup.y}`;
  if (fmt === 'ODI') { const q = (w.wcq && w.wcq.cup === cup.name) ? w.wcq.top : assoc.slice(0, 4); field = [...byElo(FULL_MEMBERS).slice(0, 10), ...q].slice(0, 14); w.qual[qkey] ??= field.includes('NEP'); }
  else {
    const nepRank = assoc.indexOf('NEP'); const nepIn = nepRank >= 0 && (nepRank < 4 || R() < 0.6); w.qual[qkey] = nepIn;
    const others = assoc.filter((c) => c !== 'NEP').slice(0, nepIn ? 7 : 8); field = [...FULL_MEMBERS, ...others, ...(nepIn ? ['NEP'] : [])];
  }
  const seeded = byElo(field); const ng = fmt === 'ODI' ? 2 : 4; const keys = 'ABCD'.slice(0, ng).split(''); const groups = Object.fromEntries(keys.map((k) => [k, []]));
  seeded.forEach((c, i) => { const r = Math.floor(i / ng); const k = r % 2 ? keys[ng - 1 - (i % ng)] : keys[i % ng]; groups[k].push(c); });
  const fx = []; for (const k of keys) { const g = groups[k]; const list = []; for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) list.push([g[i], g[j]]);
    // Nepal's last group game goes last, so it can be the decider
    const nl = list.filter((p) => p.includes('NEP')); const rest = list.filter((p) => !p.includes('NEP')); fx.push(...shuffle(rest).map((p) => ({ st: k, a: p[0], b: p[1] })), ...nl.map((p) => ({ st: k, a: p[0], b: p[1] }))); }
  return { y: cup.y, name: cup.name, hosts: cup.hosts, when: cup.when, fmt, cities: cup.cities || [], groups, fx, res: [], st: {}, nep: [], stage: 'group', pending: null, nepIn: field.includes('NEP'), s8: null, ko: [] };
}
function nepXI(G) { const sel = G.pickNepal(); const P = Object.fromEntries(sel.squad.map((id) => [id, G.P(id)])); return { squad: sel.squad, xi: sel.squad.length >= 11 ? G.intlLineup(sel.squad, P).xi : sel.squad }; }
// One light World Cup match, with player stats for Nepal and the in-game players of other nations.
function cupGame(G, wc, f, cache, nx) {
  const T = wc.fmt !== 'ODI'; const g = play(G, f.a, f.b, wc.fmt, cache);
  const pa = knownPlayers(G, f.a, nx.xi), pb = knownPlayers(G, f.b, nx.xi); const before = {}; for (const p of [...pa, ...pb]) if (wc.st[p.id]) before[p.id] = wc.st[p.id].slice(0, 4);
  const ia = g.aFirst ? g.i1 : g.i2, ib = g.aFirst ? g.i2 : g.i1;
  creditStats(wc, f.a, pa, ia, ib, T); creditStats(wc, f.b, pb, ib, ia, T);
  const r = { st: f.st, a: f.a, b: f.b, win: g.aWin ? f.a : f.b, m: g.m, sa: scoreStr(ia), sb: scoreStr(ib), g: [g.aFirst ? 1 : 0, ...g.i1, ...g.i2, g.maxB], city: wc.cities.length ? pick(wc.cities) : '' };
  if (f.a === 'NEP' || f.b === 'NEP') r.line = bestLine(wc, 'NEP', knownPlayers(G, 'NEP', nx.xi), before);
  wc.res.push(r); return r;
}
const resGame = (r) => ({ aFirst: !!r.g[0], i1: r.g.slice(1, 4), i2: r.g.slice(4, 7), maxB: r.g[7], aWin: r.win === r.a });
export function stageTable(wc, st) {
  const rows = {}; const g = (wc.groups || {})[st]; const s8 = (wc.s8 || {})[st]; const teams = Array.isArray(g) ? g : Array.isArray(s8) ? s8 : [];
  for (const c of teams) rows[c] = row0();
  for (const r of wc.res || []) if (r && r.st === st && Array.isArray(r.g)) addResult(rows, r.a, r.b, resGame(r)); return tableOf(rows);
}
function nepRecord(wc, r) {
  if (r.a !== 'NEP' && r.b !== 'NEP') return; const v = r.a === 'NEP' ? r.b : r.a; const won = r.win === 'NEP';
  const stage = r.st === 'X' || r.st === 'Y' ? 'Super 8' : r.st === 'SF' ? 'Semi-final' : r.st === 'F' ? 'Final' : `Group ${r.st}`;
  wc.nep.push({ v, r: won ? 'W' : 'L', m: r.m, stage, line: r.line || '', nep: r.a === 'NEP' ? r.sa : r.sb, opp: r.a === 'NEP' ? r.sb : r.sa, city: r.city });
}
// Plays group games up to Nepal's decider; returns true if that decider is pending.
function runGroups(G, wc, cache, nx) {
  while (wc.fx.length) {
    const f = wc.fx[0]; const nepLast = (f.a === 'NEP' || f.b === 'NEP') && !wc.fx.slice(1).some((x) => x.st === f.st && (x.a === 'NEP' || x.b === 'NEP'));
    if (nepLast && !wc.pending && alive(wc, f)) {
      // everything else first, then this match waits for the user
      const rest = wc.fx.slice(1); for (const x of rest) { const r = cupGame(G, wc, x, cache, nx); nepRecord(wc, r); }
      wc.fx = [f]; wc.pending = { ...f, city: wc.cities.length ? pick(wc.cities) : '', scen: scenario(wc, f) }; return true;
    }
    wc.fx.shift(); const r = cupGame(G, wc, f, cache, nx); nepRecord(wc, r);
  }
  return false;
}
function alive(wc, f) { const t = stageTable(wc, f.st); const nep = t.find((x) => x.code === 'NEP'); if (!nep) return false; const pts = nep.pts + 2; const others = t.filter((x) => x.code !== 'NEP').map((x) => x.pts + 2 * (wc.fx.filter((y) => y.st === f.st && (y.a === x.code || y.b === x.code) && y !== f).length)); return others.filter((p) => p > pts).length < 2; }
function scenario(wc, f) {
  const t = stageTable(wc, f.st); const nep = t.find((x) => x.code === 'NEP') || { pts: 0 }; const opp = f.a === 'NEP' ? f.b : f.a; const next = wc.fmt === 'ODI' ? 'the semi-finals' : 'the Super 8';
  const rem = (c) => wc.fx.filter((y) => y !== f && y.st === f.st && (y.a === c || y.b === c)).length;
  const others = t.filter((x) => x.code !== 'NEP').map((x) => ({ code: x.code, min: x.pts, max: x.pts + 2 * rem(x.code) }));
  const win = nep.pts + 2;
  // losing: the opponent takes the points
  const lose = others.map((o) => (o.code === opp ? { ...o, min: o.min + 2, max: o.max + 2 } : o));
  if (lose.filter((o) => o.max >= nep.pts).length <= 1 && lose.filter((o) => o.max > nep.pts).length <= 1 && lose.filter((o) => o.max >= nep.pts).length < 2) return 'Nepal are through; the group placing is at stake';
  if (others.filter((o) => o.max >= win).length <= 1) return `Win and Nepal reach ${next}`;
  if (others.filter((o) => o.min > win).length <= 1) return `Win and Nepal could reach ${next} on net run rate`;
  return 'Nepal need a win and other results';
}
// After the groups: the next stages, all simulated.
function finishCup(G, wc, cache, nx) {
  if (wc.fx.length) { for (const f of wc.fx) nepRecord(wc, cupGame(G, wc, f, cache, nx)); wc.fx = []; }
  const keys = Object.keys(wc.groups || {}); const T = keys.map((k) => stageTable(wc, k).map((x) => x.code)); while (T.length < 4) T.push([]);
  const pad = (c, i) => c || T.flat()[i] || keys[0];
  let semis;
  if (wc.fmt !== 'ODI') {
    wc.s8 = { X: [T[0][0], T[1][1], T[2][0], T[3][1]].filter(Boolean), Y: [T[1][0], T[0][1], T[3][0], T[2][1]].filter(Boolean) };
    for (const k of ['X', 'Y']) { const g = wc.s8[k]; for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) nepRecord(wc, cupGame(G, wc, { st: k, a: g[i], b: g[j] }, cache, nx)); }
    const x = stageTable(wc, 'X').map((r) => r.code), y = stageTable(wc, 'Y').map((r) => r.code); semis = [[pad(x[0], 0), pad(y[1], 1)], [pad(y[0], 2), pad(x[1], 3)]];
  } else semis = [[pad(T[0][0], 0), pad(T[1][1], 1)], [pad(T[1][0], 2), pad(T[0][1], 3)]];
  const fin = semis.map(([a, b]) => { const r = cupGame(G, wc, { st: 'SF', a, b }, cache, nx); nepRecord(wc, r); return r.win; });
  const f = cupGame(G, wc, { st: 'F', a: fin[0], b: fin[1] }, cache, nx); nepRecord(wc, f);
  wc.champ = f.win; wc.runner = f.win === f.a ? f.b : f.a; wc.finalM = f.m; wc.stage = 'done'; wc.pending = null;
  // trim the stats to the leaders the screen shows
  const lead = leaders(wc); const keep = new Set([...lead.runs, ...lead.wkts, ...lead.econ].map((x) => x.id)); for (const id of Object.keys(wc.st)) if (!keep.has(id) && wc.st[id][4] !== 'NEP') delete wc.st[id];
  const nepStage = !wc.nepIn ? 'Did not qualify' : wc.champ === 'NEP' ? 'Champions' : wc.nep.some((x) => x.stage === 'Final') ? 'Runners-up' : wc.nep.some((x) => x.stage === 'Semi-final') ? 'Semi-finals' : wc.nep.some((x) => x.stage === 'Super 8') ? 'Super 8' : 'Group stage';
  wc.nepStage = nepStage;
  const W2 = W(G); W2.wcHist = W2.wcHist.filter((h) => !(h.y === wc.y && h.fmt === wc.fmt));
  W2.wcHist.push({ y: wc.y, fmt: wc.fmt, name: wc.name, hosts: wc.hosts, champ: nm(wc.champ), runner: nm(wc.runner), finalM: wc.finalM, nepal: nepStage, wins: wc.nep.filter((x) => x.r === 'W').length });
  // what the tournament does for your players
  const mine = nx.squad.filter((id) => G.P(id).team === G.user && wc.nepIn); const good = ['Champions', 'Runners-up', 'Semi-finals', 'Super 8'].includes(nepStage);
  for (const id of mine) { const p = G.P(id); p.fit = clamp(p.fit - 8, 30, 100); if (good) { p.form = clamp(p.form + 2, -10, 10); p.value = Math.round(p.value * 1.05 * 2) / 2; adjustHappy(G, id, 4, `${wc.name}: ${nepStage}`); } }
  pushFeed(G, { when: wc.when, t: `${wc.name}: ${nm(wc.champ)} beat ${nm(wc.runner)} ${wc.finalM} in the final`, sub: `Nepal: ${nepStage} · in-game`, nep: wc.nepIn });
  G.news(`${nm(wc.champ)} win the ${wc.name}. Nepal: ${nepStage.toLowerCase()}`, 'intl', { to: '/worldcup', sub: good ? 'Milestone' : 'World Cup', detail: `In-game. Final: ${nm(wc.champ)} beat ${nm(wc.runner)} ${wc.finalM}.${mine.length ? ` Your players there: ${mine.map((id) => G.P(id).name).join(', ')}${good ? ' (form +2, value +5%)' : ''}.` : ''}`, ne: `${nm(wc.champ)} विश्वकप विजेता` });
}
export function leaders(wc) {
  const L = Object.entries(wc.st).map(([id, s]) => ({ id, r: s[0], w: s[1], balls: s[2], rc: s[3], code: s[4], name: s[5], econ: s[2] ? s[3] / (s[2] / 6) : 99 }));
  const minB = wc.fmt === 'ODI' ? 120 : 48;
  return { runs: L.slice().sort((a, b) => b.r - a.r).slice(0, 5), wkts: L.filter((x) => x.w).sort((a, b) => b.w - a.w || a.econ - b.econ).slice(0, 5), econ: L.filter((x) => x.balls >= minB).sort((a, b) => a.econ - b.econ).slice(0, 3) };
}
// The decider without watching: a light result, then the rest of the tournament.
export function resolvePending(G) {
  const wc = W(G).wc; if (!wc || !wc.pending) return null; const cache = {}; const nx = nepXI(G);
  wc.fx ??= []; const f = wc.fx.shift() || wc.pending; const r = cupGame(G, wc, f, cache, nx); nepRecord(wc, r);
  logDecision(G, 'world', `${wc.name}: Nepal v ${nm(f.a === 'NEP' ? f.b : f.a)}`, 'Result only', `${r.win === 'NEP' ? 'Nepal won' : 'Nepal lost'} ${r.m}`);
  wc.pending = null; finishCup(G, wc, cache, nx); return r;
}
// The decider with the real engine, for following it live. Opponents use the nation's in-game players where
// there are any (copies, so their club records are untouched) and generated players for the rest.
export async function playPendingLive(G) {
  const wc = W(G).wc; if (!wc || !wc.pending) return null; const f = wc.pending; const opp = f.a === 'NEP' ? f.b : f.a; const nx = nepXI(G);
  const T = wc.fmt !== 'ODI'; const gen = G.genOppXI(nm(opp), Math.round(strength(G, opp, wc.fmt)));
  const names = ((W(G).gen || {})[opp] || []).map((g) => g[0]); gen.forEach((p, i) => { if (names[i]) p.name = names[i]; });
  const known = knownPlayers(G, opp, []).slice(0, 5); const oppXI = gen.map((p, i) => (known[i] && known[i].role === p.role ? { ...known[i], id: p.id, stats: {}, form: 0, fit: 100, inj: 0, team: null, src: known[i].id } : p));
  const squad = nx.squad; const P = {}; for (const id of squad) P[id] = G.P(id); for (const p of oppXI) P[p.id] = p;
  const proxy = { user: null, players: P, teams: { NEP: { id: 'NEP', name: 'Nepal', squad }, OPP: { id: 'OPP', name: nm(opp), squad: oppXI.map((p) => p.id) } },
    lineup: (tid) => G.intlLineup(tid === 'NEP' ? squad : oppXI.map((p) => p.id), P), staffLevel: () => 0, injuryLength: (t, b) => b };
  const m = new Match(proxy, 'NEP', 'OPP', { lang: 'both', overs: T ? 20 : 50, noRain: true, night: true, dew: false });
  const city = f.city || ''; const lines = [];
  const inj0 = squad.map((id) => [id, G.P(id).inj]);
  await m.run({ onLine: (e, mm) => { if (mm.inns.length < 2 || !(e.ball || e.c === 'crowd' || e.c === 'over')) return; const i = mm.inns[1];
    const fix = (x) => String(x || '').replace(/Kirtipur/g, city || 'the ground').replace(/\bOPP\b/g, nm(opp)).replace(/\bNEP\b/g, 'Nepal'); const t = fix(e.t); const ne = e.ne && !/कीर्तिपुर/.test(e.ne) ? fix(e.ne) : null; if (e.c === 'crowd' && /कीर्तिपुर/.test(t)) return;
    lines.push({ o: e.o || '', t, ne, c: e.c || '', ev: e.ev || '', s: [i.runs, i.wkts, i.balls] }); if (lines.length > 70) lines.shift(); } });
  for (const [id, v] of inj0) { const p = G.P(id); p.inj = v; p.injCounted = false; }
  const i1 = m.inns[0], i2 = m.inns[1]; const nepWon = m.result.winner === 'NEP';
  const mg = /by .*$/.exec(m.result.text || ''); const margin = mg ? mg[0] : (nepWon || m.result.winner === 'OPP' ? '' : 'no result');
  const toC = (b) => (b === 'NEP' ? 'NEP' : opp);
  const a = toC(i1.bat), b = toC(i2.bat);
  const before = {}; for (const id of nx.xi) if (wc.st[id]) before[id] = wc.st[id].slice(0, 4);
  for (const inn of [i1, i2]) { for (const [id, s] of Object.entries(inn.bs)) { const p = P[id]; if (!p || (inn.bat !== 'NEP' && !p.src)) continue; const key = p.src || id; (wc.st[key] ??= [0, 0, 0, 0, inn.bat === 'NEP' ? 'NEP' : opp, p.name])[0] += s.r || 0; }
    for (const [id, s] of Object.entries(inn.bw)) { const p = P[id]; if (!p || (inn.bowl !== 'NEP' && !p.src)) continue; const key = p.src || id; const st = (wc.st[key] ??= [0, 0, 0, 0, inn.bowl === 'NEP' ? 'NEP' : opp, p.name]); st[1] += s.w || 0; st[2] += s.balls || 0; st[3] += s.r || 0; } }
  const r = { st: f.st, a, b, win: nepWon ? 'NEP' : m.result.winner === 'OPP' ? opp : (R() < 0.5 ? 'NEP' : opp), m: margin || 'in a tie', sa: scoreStr([i1.runs, i1.wkts]), sb: scoreStr([i2.runs, i2.wkts]), g: [1, i1.runs, i1.wkts, i1.balls, i2.runs, i2.wkts, i2.balls, T ? 120 : 300], city, live: 1 };
  r.line = bestLine(wc, 'NEP', nx.xi.map((id) => G.P(id)), before);
  eloUpdate(G, wc.fmt, a, b, r.win === a); wc.res.push(r); wc.fx = []; nepRecord(wc, r);
  const bats = (inn) => [inn.striker, inn.non].filter((id) => inn.bs[id]).map((id) => [P[id].name, inn.bs[id].r, inn.bs[id].b, !!inn.bs[id].out, P[id].team || null]);
  wc.live = { a, b, s1: [i1.runs, i1.wkts, i1.balls], target: i2.target, maxB: T ? 120 : 300, lines, end: [i2.runs, i2.wkts, i2.balls], bats: bats(i2), result: `${r.win === 'NEP' ? 'Nepal' : nm(opp)} won ${r.m}`,
    mine: nx.xi.filter((id) => G.P(id).team === G.user).map((id) => { const bs = i1.bat === 'NEP' ? i1.bs[id] : i2.bs[id]; const bw = i1.bowl === 'NEP' ? i1.bw[id] : i2.bw[id]; return [G.P(id).name, bs ? `${bs.r} (${bs.b})` : '', bw ? `${ovStr(bw.balls)}–${bw.r}–${bw.w}` : '']; }) };
  logDecision(G, 'world', `${wc.name}: Nepal v ${nm(opp)}`, 'Followed it live', wc.live.result);
  wc.pending = null; finishCup(G, wc, {}, nx); return r;
}

// ===== Test cricket and the feed =====
function pushFeed(G, it) { const f = W(G).feed; f.unshift(it); if (f.length > 16) f.length = 16; }
function testSeries(G, a, b, n, cache) {
  const E = W(G).elo.odi; const C = W(G).wtc; let wa = 0, wb = 0, d = 0;
  for (let k = 0; k < n; k++) { if (R() < 0.22) { d++; continue; } const pa = 1 / (1 + Math.pow(10, (E[b] - E[a]) / 400) ); if (R() < pa) wa++; else wb++; }
  for (const [c, w, l] of [[a, wa, wb], [b, wb, wa]]) { const r = (C.rows[c] ??= [0, 0, 0, 0]); r[0] += n; r[1] += w; r[2] += l; r[3] += d; }
  return `${wa === wb ? `drawn ${wa}–${wb}` : `${nm(wa > wb ? a : b)} win ${Math.max(wa, wb)}–${Math.min(wa, wb)}`}`;
}
export const wtcTable = (C) => Object.entries(C.rows).map(([code, r]) => ({ code, p: r[0], w: r[1], l: r[2], d: r[3], pct: r[0] ? Math.round(((r[1] * 12 + r[3] * 4) / (r[0] * 12)) * 1000) / 10 : 0 })).sort((x, y) => y.pct - x.pct || y.p - x.p);
function worldSeries(G, wint, cache) {
  const C = W(G).wtc; const tests = shuffle(TEST_TEAMS.slice());
  const mon = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar']; const when = () => { const m = pick(mon); return `${m} ${m === 'Nov' || m === 'Dec' ? wint : wint + 1}`; };
  for (let i = 0; i + 1 < tests.length; i += 2) { const n = ri(2, 5); const res = testSeries(G, tests[i], tests[i + 1], n, cache); pushFeed(G, { when: when(), t: `${nm(tests[i])} v ${nm(tests[i + 1])} · ${n} Tests · ${res}`, sub: 'World Test Championship points · in-game' }); }
  const lim = shuffle(NATIONS.map((n) => n[0]).filter((c) => c !== 'NEP' && NATION[c].t20 >= 70));
  for (let i = 0; i + 1 < Math.min(lim.length, 8); i += 2) { const fmt = R() < 0.5 ? 'ODI' : 'T20I'; const n = 3; let wa = 0; for (let k = 0; k < n; k++) if (play(G, lim[i], lim[i + 1], fmt, cache).aWin) wa++;
    pushFeed(G, { when: when(), t: `${nm(lim[i])} v ${nm(lim[i + 1])} · ${n} ${fmt}s · ${nm(wa >= 2 ? lim[i] : lim[i + 1])} win ${Math.max(wa, n - wa)}–${Math.min(wa, n - wa)}`, sub: 'in-game' }); }
  // the WTC final at the end of a cycle, in June
  if (wint + 1 >= C.to) { const t = wtcTable(C); if (t.length >= 2) { const a = t[0].code, b = t[1].code; const pa = 1 / (1 + Math.pow(10, (W(G).elo.odi[b] - W(G).elo.odi[a]) / 400)); const win = R() < pa ? a : b;
    C.past.push({ from: C.from, to: C.to, champ: nm(win), runner: nm(win === a ? b : a) }); pushFeed(G, { when: `Jun ${C.to}`, t: `World Test Championship final: ${nm(win)} beat ${nm(win === a ? b : a)}`, sub: `${C.from}–${String(C.to).slice(2)} cycle · in-game` }); }
    W(G).wtc = { from: C.to, to: C.to + 2, rows: {}, past: C.past.slice(-4) }; }
}
// Nepal's winter results feed the rankings and the feed.
function nepalSeries(G, wint) {
  const N = G.s.nepal; if (N.winter !== wint || !N.results) return;
  for (const rec of N.results) {
    const mine = (rec.squad || []).filter((id) => G.P(id) && G.P(id).team === G.user).length;
    pushFeed(G, { when: rec.month, t: `${rec.name} · Nepal won ${rec.w}, lost ${rec.l}`, sub: `${rec.official ? '' : 'Not a full international · '}${mine ? `${mine} of your players in the squad · ` : ''}in-game`, nep: true });
    if (!rec.official) continue; const opp = CODE_BY_NAME[(rec.short || '').replace(/^v /, '')]; const fmt = rec.fmt === 'ODI' ? 'ODI' : 'T20I';
    const o = opp || 'PNG'; for (const g of rec.games) if (g.r === 'W' || g.r === 'L') eloUpdate(G, fmt, 'NEP', o, g.r === 'W');
  }
}
// International form feeds back into the players: a strong winter lifts form and a rating point; a poor one costs form.
function intlForm(G, wint) {
  const N = G.s.nepal; if (N.winter !== wint || !N.duty) return;
  for (const [id, d] of Object.entries(N.duty)) {
    const p = G.P(id); if (!p || d.games < 2) continue; const rpg = d.r / d.games, wpg = d.w / d.games;
    if (rpg >= 30 || wpg >= 1.5) { p.form = clamp(p.form + 1, -10, 10); const add = ovr(p) < (p.pot || 0) ? 1 : 0; if (add) { if (wpg >= 1.5 && p.bowl >= 50) p.bowl = clamp(p.bowl + 1, 10, 96); else p.bat = clamp(p.bat + 1, 10, 96); }
      adjustHappy(G, id, 2, 'A strong winter with Nepal');
      if (p.team === G.user) G.news(`${p.name}'s strong winter with Nepal carries into the NPL`, 'intl', { club: true, sub: 'Form', detail: `${d.games} games: ${d.r} runs, ${d.w} wickets.`, tags: ['Form +1', ...(add ? ['Rating +1'] : [])], ne: `${p.name}को राम्रो अन्तर्राष्ट्रिय फर्म` }); }
    else if (d.games >= 3 && rpg < 10 && wpg < 0.5) { p.form = clamp(p.form - 1, -10, 10); if (p.team === G.user) G.news(`${p.name} struggled for Nepal this winter`, 'intl', { club: true, sub: 'Form', detail: `${d.games} games: ${d.r} runs, ${d.w} wickets.`, tags: ['Form −1'] }); }
  }
}

// ===== Rankings (the game's own) =====
export function teamSnapshot(G, prev) {
  const w = G.s.world; const out = { label: LABEL };
  for (const f of ['t20i', 'odi']) { const E = w.elo[f]; const list = Object.keys(E).sort((a, b) => E[b] - E[a]); const pm = prev ? Object.fromEntries((prev[f] || []).map((r, i) => [r[0], i + 1])) : {};
    out[f] = list.map((c) => [c, Math.round(E[c] / 5), pm[c] || null]); }
  return out;
}
function inPool(G, p, ranked) {
  if (p.retired) return false;
  if (p.nat === 'NEP') return ranked.has(p.id) || (G.intlCaps(p) || 0) > 0;
  return p.intlStatus === 'active';
}
// Generated internationals for the stronger nations, so the lists are not only the players in the save:
// [name, role, bat, bowl, form]. Their skill follows the nation's strength. They exist only in the rankings.
// The name pools pair real first names and surnames; these pairs (and anyone in the save) are real people.
const REAL_NAMES = new Set(['Kamindu Mendis', 'Jamie Overton', 'Rachin Ravindra', 'Ankit Rajput', 'Mahedi Hasan', 'Shamar Joseph', 'Blair Tickner', 'Jake Fraser', 'Mohammad Nawaz', 'Hasan Ali', 'Usman Khan', 'Kusal Mendis', 'Jake Doran', 'Ollie Price', 'Tom Price', 'Tom Lamb', 'Kane Williamson', 'Mitchell Bracewell']);
function genPlayers(taken) {
  const out = {}; const roles = ['BAT', 'BAT', 'BAT', 'AR', 'BOWL', 'BOWL'];
  for (const code of Object.keys(OS_NAMES)) { const n = NATION[code]; if (!n || n.t20 < 76) continue; const pool = OS_NAMES[code]; const used = new Set();
    out[code] = roles.map((role) => { let nm2; let k = 0; do { const fi = ri(0, pool.f.length - 1), li = ri(0, pool.l.length - 1); nm2 = Math.abs(fi - li) >= 2 ? `${pool.f[fi]} ${pool.l[li]}` : null; } while ((!nm2 || used.has(nm2) || REAL_NAMES.has(nm2) || (taken && taken.has(nm2))) && k++ < 60); used.add(nm2); const lv = n.t20 + ri(-4, 6);
      return [nm2, role, role === 'BOWL' ? ri(25, 40) : role === 'AR' ? lv - 4 : lv, role === 'BAT' ? ri(10, 35) : role === 'AR' ? lv - 4 : lv, 0]; }); }
  return out;
}
function genPool(G) { const out = []; for (const [code, L] of Object.entries(W(G).gen || {})) L.forEach((g, i) => out.push({ id: `g:${code}:${i}`, name: g[0], nat: code, role: g[1], bat: g[2], bowl: g[3], form: g[4], age: 27, gen: true })); return out; }
// A ranked player: a real one from the save, or a generated one ({id, name, nat, gen}).
export function whoRanked(G, id) { if (!String(id).startsWith('g:')) return G.P(id); const [, code, i] = id.split(':'); const g = ((W(G).gen || {})[code] || [])[+i]; return g ? { id, name: g[0], nat: code, gen: true, team: null } : null; }
function recent(p, fmt, k) { const L = (p.intlLog || []).filter((x) => (fmt === 'odi' ? x.fmt === 'ODI' : x.fmt !== 'ODI')).slice(-8); return L.reduce((a, x) => a + (k === 'r' ? x.r : x.w), 0); }
function lastSeason(p) { const ys = Object.keys(p.stats || {}).map(Number).sort((a, b) => b - a); return ys.length ? p.stats[ys[0]] : null; }
// Ratings from skill, form, recent international or league numbers, and the strength of the side (as the
// ICC's weight opponents, a player in a strong team rates higher). The game's own numbers.
export function playerRatings(G, p, fmt) {
  const st = p.gen ? null : lastSeason(p); const nep = p.nat === 'NEP'; const odi = fmt === 'odi'; const exp = odi ? Math.min(Math.max(0, (p.age || 27) - 22), 10) * 3 : 0;
  const n = NATION[p.nat]; const side = n ? ((odi ? n.odi : n.t20) - 75) * 6 : -30;
  const bat = Math.round(clamp(220 + (p.bat - 40) * 11 + p.form * 6 + exp + side + (nep ? recent(p, fmt, 'r') / 6 : st ? st.r / 10 : p.gen ? ri(0, 30) : 0), 0, 950));
  const bowl = Math.round(clamp(220 + (p.bowl - 40) * 11 + p.form * 5 + exp + side + (nep ? recent(p, fmt, 'w') * 4 : st ? st.w * 3 : p.gen ? ri(0, 30) : 0), 0, 950));
  return { bat: p.bat >= 40 ? bat : 0, bowl: p.bowl >= 45 ? bowl : 0, ar: p.bat >= 48 && p.bowl >= 52 ? Math.round(bat * bowl / 1000) : 0 };
}
// Top 20 in each list plus every Nepali, with the previous rank for the movement column.
export function playerSnapshot(G, prev) {
  const ranked = new Set(G.pickNepal().ranked.slice(0, 20)); const pool = [...Object.values(G.players).filter((p) => inPool(G, p, ranked)), ...genPool(G)];
  for (const L of Object.values(W(G).gen || {})) for (const g of L) g[4] = clamp(Math.round(g[4] * 0.5 + rf(-4, 4)), -10, 10);
  const out = { label: LABEL, y: G.year };
  for (const f of ['t20i', 'odi']) { out[f] = {}; const R2 = pool.map((p) => [p, playerRatings(G, p, f)]);
    for (const k of ['bat', 'bowl', 'ar']) { const list = R2.filter((x) => x[1][k] > 0).sort((a, b) => b[1][k] - a[1][k]); const pm = prev && prev[f] ? Object.fromEntries((prev[f][k] || []).map((r) => [r[0], r[2]])) : {};
      out[f][k] = list.map((x, i) => [x[0].id, x[1][k], i + 1, pm[x[0].id] || null]).filter((r) => r[2] <= 20 || (whoRanked(G, r[0]) || {}).nat === 'NEP').slice(0, 36); } }
  return out;
}
export function recalcRankings(G) { const w = W(G); w.trk = teamSnapshot(G, w.trk); w.prk = playerSnapshot(G, w.prk); w.rankAt = G.year; }
export const teamRank = (G, fmt, code = 'NEP') => { const L = W(G).trk[fmt] || []; const i = L.findIndex((r) => r[0] === code); return i < 0 ? null : { pos: i + 1, pts: L[i][1], prev: L[i][2] }; };

// ===== After Nepal's winter =====
// Idempotent: runs once per winter, from flow.startOffseason or lazily from the later hooks and the screens.
export function afterWinter(G) {
  const w = W(G); const N = G.s.nepal; if (!w || !N || N.winter == null) return false; const wint = N.winter;
  if (w.wint === wint) return false; w.wint = wint; const cache = {};
  nepalSeries(G, wint); intlForm(G, wint); worldSeries(G, wint, cache);
  // League 2 (or the Challenge League) this year, then the end of the cycle
  const C = w.tier === 'cl' ? w.cl : w.l2;
  if (C && !C.done && wint >= C.from) cycleYear(G, wint, C, cache);
  if (wint + 1 >= w.l2.to) { w.l2.done = true; endCycle(G, wint, cache); }
  // World Cups in this off-season
  if (w.wc && w.wc.pending) resolvePending(G);
  w.live = null; if (w.wc) w.wc.live = null;
  const cups = worldCupsFor(wint);
  for (const cup of cups) {
    if (w.wc && w.wc.pending) resolvePending(G);
    const wc = newCup(G, cup); const nx = nepXI(G); const full = cup.fmt === 'T20I' || wc.nepIn;
    if (!full) { runGroups(G, wc, cache, nx); if (wc.pending) { wc.fx.shift(); wc.pending = null; } finishCup(G, wc, cache, nx); continue; }
    w.wc = wc; const waiting = wc.nepIn && runGroups(G, wc, cache, nx);
    if (waiting) {
      const opp = nm(wc.pending.a === 'NEP' ? wc.pending.b : wc.pending.a);
      G.news(`${wc.name}: Nepal v ${opp} decides their group`, 'intl', { to: '/worldcup', sub: 'World Cup', detail: `${wc.pending.scen}. Follow it live from the World Cup page. In-game.`, ne: `विश्वकप: नेपाल बनाम ${opp}` });
      if (G.s.settings && G.s.settings.assistant) resolvePending(G);
    } else finishCup(G, wc, cache, nx);
  }
  recalcRankings(G);
  return true;
}

// ===== Hooks =====
export function offseason(G) { safe('offseason', () => offseason0(G)); }
function offseason0(G) {
  const w = W(G); if (!w) return; const Y = G.year - 1;
  if (w.lg.y < Y) simLeagues(G, Y);
  signAbroad(G); makeRequests(G); makeClash(G);
  const d = digest(G); const npl = d.rows.find((r) => r.npl);
  G.news(`Who won what in ${Y}: the off-season digest`, 'world', { to: '/world', detail: `${d.rows.filter((r) => !r.npl).map((r) => `${r.short}: ${r.champ}`).join(' · ')}${npl && npl.champ ? ` · NPL: ${npl.champ}` : ''}.${Y > 2026 ? ' Foreign results are simulated in your game.' : ''}`, ne: `${Y} मा कसले के जित्यो` });
}
// A world-layer failure must never stop the season flow: report it and carry on.
function safe(name, fn) { try { fn(); } catch (e) { console.error(`world.${name}:`, e); } }
export function auctionSetup(G) { safe('auctionSetup', () => { afterWinter(G); expireNocs(G); if (W(G) && W(G).wc && W(G).wc.pending) resolvePending(G); }); }
export function seasonStart(G) { safe('seasonStart', () => seasonStart0(G)); }
function seasonStart0(G) {
  const w = W(G); if (!w) return; afterWinter(G); expireNocs(G); if (w.wc && w.wc.pending) resolvePending(G);
  const c = w.clash; if (c && c.y === G.year && c.status === 'open') decideClash(G, 'without', 'expired');
  if (c && c.y === G.year && c.status === 'without' && !c.applied) { for (const id of c.pids) { const p = G.P(id); if (p && p.team === G.user) p.fit = clamp(p.fit - 8, 30, 100); } c.applied = true; }
  preseasonSeries(G);
  for (const p of Object.values(G.players)) { const r = p.nocRisk; if (!r) continue; delete p.nocRisk; if (r.y !== G.year || p.team !== G.user) continue;
    if (R() * 100 < r.inj) { p.inj = ri(1, 2); G.news(`${p.name} comes back from the ${LEAGUE_BY[r.league].short} injured`, 'injury', { detail: `He misses the first ${p.inj} NPL match${p.inj > 1 ? 'es' : ''}.` }); } }
}
export function todayTasks(G) {
  const w = W(G); if (!w) return []; const out = [];
  for (const r of openNocs(G)) { const p = G.P(r.pid); if (!p) continue; out.push({ key: `noc-${r.id}`, text: `NOC request: ${r.team} want ${p.name}`, sub: `${LEAGUE_BY[r.league].short} ${kindLabel(r.kind)} · Rs ${r.fee} L`, to: '/world?tab=nepalis' }); }
  if (w.clash && w.clash.status === 'open') out.push({ key: 'clash', text: 'Nepal duty clashes with your pre-season camp', sub: `${w.clash.comp} · ${w.clash.pids.length} of your players`, to: '/international' });
  if (w.wc && w.wc.pending) { const f = w.wc.pending; out.push({ key: 'wc', text: `${w.wc.name}: Nepal v ${nm(f.a === 'NEP' ? f.b : f.a)}`, sub: f.scen, to: '/worldcup' }); }
  return out;
}
