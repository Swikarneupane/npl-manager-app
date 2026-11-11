// ===== World cricket (game layer) =====
// Foreign T20 leagues (a light simulation until W3), Nepali players abroad and NOC requests, the
// pre-season clash with Nepal duty, and the bridge between the NPL game and the international
// programme in src/world: Nepal's real world fixtures become caps, call-ups, milestones and form for
// the players in the save, and old seasons are compacted before saving.
// The phase 2 light World Cup, League 2 tables, Elo rankings and Test feed are retired: the
// international game now runs in src/world (intl.js, rankings.js). State: G.s.world (leagues, NOCs,
// clash, older World Cup history) and G.s.wd (the world).
// Everything after the save starts is simulated and labelled "in-game".
import { R, ri, rf, pick, clamp, shuffle, ovr } from './engine.js';
import { adjustHappy, logDecision } from './depth.js';
import { LEAGUES, LEAGUE_BY, REAL_2026 } from './world-data.js';
import * as ST from '../world/state.js';
import * as IN from '../world/intl.js';
import * as RK from '../world/rankings.js';
import { dayOfDate, dateOf, MONTHS } from '../world/dates.js';

export const LABEL = RK.LABEL;
export const nm = IN.nm;
const W = (G) => G.s.world;
const fmtL = (v) => (v >= 100 ? `${Math.round(v / 10) / 10} Cr` : `${v} L`);
const RETIRED = ['elo', 'l2', 'po', 'wcq', 'cl', 'wc', 'trk', 'prk', 'gen', 'wtc', 'feed', 'tier', 'qual', 'wint', 'live', 'rankAt'];

function real2026() {
  const rows = {}; for (const L of LEAGUES) { const r = REAL_2026[L.k]; rows[L.k] = { champ: r.champ, runner: r.runner, margin: r.margin, when: r.when, story: r.story, real: true, nep: r.nep || '' }; }
  return { y: 2026, rows, heads: [
    { m: 'Jan', t: 'Rajshahi Warriors win the BPL final by 63 runs' }, { m: 'May', t: 'Peshawar Zalmi beat the debutants Hyderabad Kingsmen in the PSL final' },
    { m: 'May', t: 'Royal Challengers Bengaluru win the IPL again' }, { m: 'Jul', t: 'Los Angeles Knight Riders win the MLC final by one run' }, { m: 'Sep', t: 'Antigua and Barbuda Falcons win their first CPL title' }] };
}

// ----- migrate -----
export function migrate(G) {
  const s = G.s; if (!s) return;
  const w = (s.world ??= {});
  w.v ??= 1; w.noc ??= []; w.wcHist ??= []; w.lg ??= real2026(); w.clash ??= null;
  for (const k of RETIRED) delete w[k];
  if (s.players) {
    // Sandeep Lamichhane's real 2025-26 BPL season (Rajshahi Warriors won the title)
    const L = Object.values(s.players).find((p) => p.name === 'Sandeep Lamichhane' && p.real !== false);
    if (L) { L.abroad ??= []; if (!L.abroad.some((a) => a.y === 2026 && a.league === 'bpl')) L.abroad.push({ y: 2026, league: 'bpl', team: 'Rajshahi Warriors', real: 1, champ: 1 }); }
  }
  if (s.teams && s.user) { ST.migrate(G); IN.init(G); }
}


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

// ===== Calendar clash with the pre-season camp =====
// Nepal fixtures in the weeks before the NPL take the user's national players out of the camp.
function nepalFixtures(G, from, to) {
  const out = []; for (const S of Object.values(G.s.wd ? G.s.wd.seasons : {})) if (S.teams.includes('NEP')) for (const f of S.fx) if ((f.a === 'NEP' || f.b === 'NEP') && f.d >= from && f.d <= to) out.push([S, f]);
  return out.sort((a, b) => a[1].d - b[1].d);
}
function makeClash(G) {
  const w = W(G); const y = G.year; if (w.clash && w.clash.y === y) return; if (!G.s.wd) return;
  const fx = nepalFixtures(G, dayOfDate(y, 8, 15), dayOfDate(y, 9, 25)); if (!fx.length) { w.clash = null; return; }
  const S = fx[0][0]; const sq = ST.squadFor(G, 'NEP', fx[0][1].fmt, S).map((p) => p.id); const pids = sq.filter((id) => G.P(id) && G.P(id).team === G.user);
  if (!pids.length) { w.clash = null; return; }
  const days = new Set(fx.map((x) => x[1].d)).size;
  w.clash = { y, comp: IN.sbase(S), when: IN.monthOf(fx[0][1].d), days: Math.max(4, days * 2), pids, status: 'open' };
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

// ===== Nepal in the world programme =====
// The international year that starts with the NPL of year w: 1 Oct w to 30 Sep w + 1.
export const winterOf = (day) => { const t = dateOf(day); return t.m >= 9 ? t.y : t.y - 1; };
const tagOf = (G, p) => ({ club: p.team === G.user });
// Nepal's finished world fixtures that the save has not seen yet: caps, call-ups, milestones, duty.
export function nepalSync(G) {
  const N = G.s.nepal; if (!N || !G.s.players || !G.s.wd) return;
  const by = new Map();
  for (const S of Object.values(G.s.wd.seasons)) { if (S.real || !S.teams.includes('NEP')) continue; for (const f of S.fx) if (f.res && !f.nx && (f.a === 'NEP' || f.b === 'NEP')) { if (!by.has(S)) by.set(S, []); by.get(S).push(f); } }
  for (const [S, fs] of [...by].sort((a, b) => Math.min(...a[1].map((f) => f.d)) - Math.min(...b[1].map((f) => f.d)))) syncSeason(G, S, fs.sort((a, b) => a.d - b.d));
}
function evName(S, f) { const base = IN.sbase(S); return f.ev != null ? `${base}, tri-series ${f.ev + 1}` : base; }
function evShort(S, f) {
  const k = IN.info(S).kind; if (k === 'bilat') { const o = S.teams[0] === 'NEP' ? S.teams[1] : S.teams[0]; return `v ${nm(o)}`; }
  const s = { l2: 'League 2', cl: 'Challenge League', po: 'CWC Qualifier Play-Off', wcq: 'World Cup Qualifier', wc: 'ODI World Cup', t20wc: 'T20 World Cup', gq: 'T20 Global Qualifier', rq: 'T20 regional final', asia: 'Asia Cup', accpc: 'ACC Premier Cup', tri: 'Tri-series' }[k] || IN.sbase(S);
  return f.ev != null ? `${s} (${f.ev + 1})` : s;
}
function syncSeason(G, S, fs) {
  const N = G.s.nepal; const wd = G.s.wd; const I = IN.st(G); const inf = IN.info(S); const official = inf.official; const F = inf.fmt === 'ODI' ? 'ODI' : 'T20I'; const fk = F === 'ODI' ? 'odi' : 't20i';
  // exact appearances from the season stats; the scorecards say who batted and bowled
  const T = wd.st[S.id] || {}; const seenM = (I.nm[S.id] ??= {}); const delta = {};
  for (const id in T) { const p = G.players[id]; if (!p || p.nat !== 'NEP') continue; const dd = T[id][0] - (seenM[id] || 0); if (dd > 0) delta[id] = dd; seenM[id] = T[id][0]; }
  const parts = fs.map((f) => { const ids = {}; for (const inn of f.card || []) { if (inn.t === 'NEP') for (const b of inn.bat) ids[b[0]] = { ...(ids[b[0]] || {}), r: b[1], b: b[2] }; else for (const b of inn.bowl) ids[b[0]] = { ...(ids[b[0]] || {}), w: b[3], rc: b[2], balls: b[1] }; } return ids; });
  for (const id in delta) { let extra = delta[id] - parts.filter((x) => x[id]).length; for (let i = 0; i < parts.length && extra > 0; i++) if (!parts[i][id]) { parts[i][id] = { r: 0, w: 0 }; extra--; } }
  for (let i = 0; i < fs.length; i++) {
    // during the off-season screens the winter just played stays open (an early-October game joins it)
    const f = fs[i]; f.nx = 1; const off = ['offseason', 'retention', 'auction'].includes(G.s.phase); const w = off ? Math.min(winterOf(f.d), G.year - 1) : winterOf(f.d);
    if (N.winter == null || N.winter < w) { if (N.winter != null && N.formDone !== N.winter) closeWinter(G, N.winter); N.winter = w; N.results = []; N.duty = {}; }
    const cur = N.winter === w; const key = `${S.id}${f.ev != null ? `#${f.ev}` : ''}`; const month = IN.monthOf(f.d);
    let rec = cur ? (N.results ??= []).find((x) => x.id === key) : null;
    if (cur && !rec) {
      const squad = ST.squadFor(G, 'NEP', f.fmt, S).map((p) => p.id).filter((id) => G.players[id]);
      rec = { id: key, sid: S.id, name: evName(S, f), short: evShort(S, f), fmt: F, month, official, real: inf.realFixture, w: 0, l: 0, nr: 0, games: [], squad, fringe: [], pl: [] };
      N.results.push(rec); const before = new Set(N.lastSquad || []); const sset = new Set(squad);
      for (const id of squad) { const p = G.P(id); if (before.has(id)) continue; p.morale = clamp(p.morale + 8, 0, 100); if (p.team === G.user) G.news(`${p.name} named in Nepal's squad for ${rec.short}`, 'intl', { ...tagOf(G, p), sub: 'Call-up', ne: `${p.name} राष्ट्रिय टोलीमा`, detail: `${rec.name} · ${month} · in-game`, tags: ['Morale +8'] }); }
      for (const id of before) { if (sset.has(id)) continue; const p = G.P(id); if (!p || p.retired) continue; p.morale = clamp(p.morale - 6, 0, 100); if (p.team === G.user) G.news(`${p.name} left out of the Nepal squad for ${rec.short}`, 'intl', { ...tagOf(G, p), sub: 'Dropped', ne: `${p.name} टोलीबाट बाहिर`, detail: 'Selectors went with form and ratings.', tags: ['Morale −6'] }); }
      N.lastSquad = squad;
    }
    const opp = f.a === 'NEP' ? f.b : f.a; const r = f.res; const res = r.nr ? '–' : r.w === 'NEP' ? 'W' : 'L'; const sc = (t) => { const x = (r.sc || []).find((z) => z[0] === t); return x ? `${x[1]}/${x[2]}` : ''; };
    if (rec) { if (res === 'W') rec.w++; else if (res === 'L') rec.l++; else rec.nr++; rec.games.push({ r: res, nep: sc('NEP'), opp: sc(opp), v: opp, d: f.d }); }
    for (const [id, line] of Object.entries(parts[i])) {
      const p = G.players[id]; if (!p || p.nat !== 'NEP' || !p.intlG) continue; const runs = line.r || 0, wk = line.w || 0;
      const dt = (N.duty ??= {})[id] ??= { games: 0, r: 0, w: 0, dev: 0, caps: 0, firstCap: false, events: [] }; dt.games++; dt.r += runs; dt.w += wk; if (rec && !dt.events.includes(rec.short)) dt.events.push(rec.short);
      if (rec && !rec.pl.includes(id)) rec.pl.push(id);
      if (official) { const before0 = G.intlCaps(p) || 0; p.intlG[fk]++; dt.caps++;
        if (!before0 && !(p.intl && (p.intl.t20i == null || p.intl.odi == null))) { p.capped = true; p.uncapped = false; p.capBonus = true; const v0 = p.value; p.value = Math.round(p.value * 1.5 * 2) / 2; dt.firstCap = true;
          if (!p.intl.debut) p.intl.debut = { fmt: F, year: w, v: nm(opp), game: true };
          G.news(`${p.name} makes his ${F} debut for Nepal`, 'intl', { ...tagOf(G, p), sub: 'First cap', ne: `${p.name}को अन्तर्राष्ट्रिय डेब्यु`, detail: `${evShort(S, f)} · ${runs} runs${line.balls ? `, ${wk}/${line.rc}` : ''} · in-game`, tags: ['Now capped', `Value ${fmtL(v0)} → ${fmtL(p.value)}`] }); }
        const tot = G.intlCaps(p); if ([25, 50, 100].includes(tot)) G.news(`${p.name} wins his ${tot}th cap for Nepal`, 'intl', { ...tagOf(G, p), sub: 'Milestone', ne: `${p.name}को ${tot}औँ खेल`, tags: [`${tot} caps`] }); }
      const won = res === 'W' ? 'Nepal win' : res === 'L' ? 'Nepal lose' : 'No result';
      if (runs >= 100) { G.news(`${p.name} scores a hundred for Nepal ${evShort(S, f)}`, 'intl', { ...tagOf(G, p), sub: 'Milestone', ne: `${p.name}को शतक`, detail: `${runs} off ${line.b} balls · ${won} · in-game`, tags: ['Form +2'] }); p.form = clamp(p.form + 2, -10, 10); }
      else if (runs >= 50 && p.team === G.user) { G.news(`${p.name} hits a fifty for Nepal ${evShort(S, f)}`, 'intl', { ...tagOf(G, p), sub: 'Milestone', detail: `${runs} off ${line.b} balls · in-game`, tags: ['Form +1'] }); p.form = clamp(p.form + 1, -10, 10); }
      if (wk >= 5) { G.news(`${p.name} takes five wickets for Nepal ${evShort(S, f)}`, 'intl', { ...tagOf(G, p), sub: 'Milestone', ne: `${p.name}को पाँच विकेट`, detail: `${wk}/${line.rc} · in-game`, tags: ['Form +2'] }); p.form = clamp(p.form + 2, -10, 10); }
      p.intlLog ??= []; p.intlLog.push({ y: w, month, evt: evShort(S, f), fmt: F, r: runs, w: wk }); if (p.intlLog.length > 80) p.intlLog.splice(0, p.intlLog.length - 80);
    }
    // an event over: experience for everyone who played (up to potential, at most +3 a winter) and some fitness
    const evDone = S.fx.filter((x) => (f.ev == null || x.ev === f.ev)).every((x) => x.res) && (f.ev != null || S.done);
    if (rec && evDone && !rec.dev) { rec.dev = 1;
      for (const id of rec.pl) { const p = G.P(id); const dt = N.duty[id]; if (!p || !dt) continue; const add = dt.dev < 3 && R() < 0.5 ? Math.min(1, Math.max(0, (p.pot || 0) - ovr(p))) : 0;
        if (add) { if (p.role === 'BOWL') p.bowl = clamp(p.bowl + add, 10, 96); else if (p.role === 'AR') { if (p.bat >= p.bowl) p.bat = clamp(p.bat + add, 10, 96); else p.bowl = clamp(p.bowl + add, 10, 96); } else p.bat = clamp(p.bat + add, 10, 96); }
        dt.dev += add; p.fit = clamp(p.fit - 4, 30, 100); } }
  }
}
function closeWinter(G, w) { const N = G.s.nepal; if (N.formDone === w) return; N.formDone = w; intlForm(G, w); }
// The end of Nepal's international year: form from it, and CAN's central contracts for the coming year.
export function finishWinter(G) {
  const N = G.s.nepal; if (!N) return; const w = G.year - 1;
  if (N.winter == null || N.winter < w) { if (N.winter != null) closeWinter(G, N.winter); N.winter = w; N.results = []; N.duty = {}; }
  N.results ??= []; N.duty ??= {}; closeWinter(G, w);
  if (N.contractYear !== G.year) G.regradeContracts(G.year);
}
IN.onTick(nepalSync);

// ----- compaction before saving -----
// Finished seasons fold their stats into the rankings after two weeks; bilateral series older than
// four months become one archive line; scorecards go except Nepal's of the last year.
export function archive(G) {
  const wd = G.s.wd; if (!wd || !wd.intl) return; const I = IN.st(G); const day = wd.day; RK.logResults(G); nepalSync(G);
  for (const id of Object.keys(wd.seasons)) {
    const S = wd.seasons[id]; if (S.real) continue;
    // scorecards: two weeks for other matches, two months for Nepal's (once the save has seen them)
    for (const f of S.fx) { if (!f.res) continue; const nep = f.a === 'NEP' || f.b === 'NEP'; const age = day - f.d;
      if (f.card && (nep ? f.nx && age > 60 : age > 14)) delete f.card; if (!nep && age > 30) { delete f.res.top; delete f.res.pom; } }
    if (!S.done) continue; const last = IN.lastDay(S); const kind = IN.info(S).kind;
    // domestic seasons: four months after the end only the knockouts, tables and leading players stay;
    // after three years the season becomes one archive line (champion and runner-up)
    const def = ST.defOf(S);
    if (def && def.kind === 'domestic') {
      for (const f of S.fx) if (f.res && day - f.d > 14) { delete f.res.top; delete f.res.pom; }
      if (!S.old && day - last > 45) { S.old = 1; S.fx = S.fx.filter((f) => f.ko || COMPS_KO(S, f.stage)); for (const f of S.fx) { delete f.card; if (f.res) { delete f.res.top; delete f.res.pom; } } trimStats(G, S, 'domestic'); }
      if (day - last > 1095) { I.arc.push([id, `${S.champ || ''} won${S.runner ? `, ${S.runner} runners-up` : ''}`, last]); delete wd.seasons[id]; delete wd.st[id]; }
      continue;
    }
    if (S.teams.includes('NEP') && S.fx.some((f) => (f.a === 'NEP' || f.b === 'NEP') && f.res && !f.nx)) continue;
    if (!S.mg && day - last > 14) { RK.mergeSeason(G, S); S.mg = 1; trimStats(G, S, kind); delete I.nm[id]; }
    // tournaments two years on: tables, knockouts and Nepal's games stay; other group games go
    if (S.mg && !S.old && day - last > 730 && kind !== 'bilat' && kind !== 'tri') { S.old = 1; const ko = new Set(IN.info(S).labels.map((l, k) => (COMPS_KO(S, k) ? k : -1)));
      S.fx = S.fx.filter((f) => f.ko || ko.has(f.stage) || f.a === 'NEP' || f.b === 'NEP'); for (const f of S.fx) if (f.res) { delete f.res.top; delete f.res.pom; } }
    if ((kind === 'bilat' || kind === 'tri') && S.mg && day - last > 120) {
      const t = S.tables.series || S.tables.all || {}; const [a, b] = S.teams; const wa = (t[a] || {}).w || 0, wb = (t[b] || {}).w || 0;
      const line = kind === 'bilat' ? (wa === wb ? `${wa}–${wb}` : `${wa > wb ? a : b} ${Math.max(wa, wb)}–${Math.min(wa, wb)}`) : `${S.champ || ''} won`;
      I.arc.push([id, line, last]); delete wd.seasons[id]; delete wd.st[id]; delete I.ann[id];
    }
  }
  const cut = day - 730; while (I.arc.length && (I.arc[0][2] < cut || I.arc.length > 400)) I.arc.shift();
  for (const id of Object.keys(I.nsq)) if (!wd.seasons[id]) delete I.nsq[id];
}
const COMPS_KO = (S, k) => { const d = ST.defOf(S); return !!(d && d.stages[k] && (d.stages[k].ko || d.stages[k].type === 'ko')); };
function trimStats(G, S, kind) {
  const T = G.s.wd.st[S.id]; if (!T) return; if (kind === 'bilat' || kind === 'tri') { delete G.s.wd.st[S.id]; return; }
  const keep = new Set(); const ids = Object.keys(T);
  ids.slice().sort((a, b) => T[b][3] - T[a][3]).slice(0, 8).forEach((id) => keep.add(id)); ids.slice().sort((a, b) => T[b][10] - T[a][10]).slice(0, 8).forEach((id) => keep.add(id));
  for (const id of ids) { const p = G.players[id]; if (!keep.has(id) && !(p && p.nat === 'NEP')) delete T[id]; }
}

// ----- moving the world through the off-season -----
// Plays the international year up to the next NPL pre-season (30 September), a week at a time, yielding
// between weeks. With a national job the clock stops at the user's first fixture instead.
export async function playWinter(G, step = () => new Promise((r) => setTimeout(r, 0))) {
  if (!G.s.wd) return; IN.tick(G); const end = dayOfDate(G.year, 8, 30);
  const national = ST.userTeams(G).some((t) => ST.isUserTeam(G, t)); let day = G.s.wd.day;
  while (day < end) { day = Math.min(end, day + 7); const stop = ST.advance(G, day, { auto: !national }); IN.tick(G); if (stop) break; await step(); }
  maybeFinish(G); archive(G); RK.snapshot(G);
}
function maybeFinish(G) { if (G.s.wd && G.s.wd.day >= dayOfDate(G.year, 8, 30) && ['offseason', 'retention', 'auction', 'preseason'].includes(G.s.phase) && G.s.nepal && G.s.nepal.formDone !== G.year - 1) finishWinter(G); }
// The tick, guarded: a world failure must never stop the season flow.
export function worldTick(G) { safe('tick', () => { IN.tick(G); maybeFinish(G); RK.snapshot(G); }); }

// ===== Hooks =====
export function offseason(G) { safe('offseason', () => offseason0(G)); worldTick(G); }
function offseason0(G) {
  const w = W(G); if (!w) return; const Y = G.year - 1;
  if (w.lg.y < Y) simLeagues(G, Y);
  signAbroad(G); makeRequests(G); makeClash(G);
  const d = digest(G); const npl = d.rows.find((r) => r.npl);
  G.news(`Who won what in ${Y}: the off-season digest`, 'world', { to: '/world', detail: `${d.rows.filter((r) => !r.npl).map((r) => `${r.short}: ${r.champ}`).join(' · ')}${npl && npl.champ ? ` · NPL: ${npl.champ}` : ''}.${Y > 2026 ? ' Foreign results are simulated in your game.' : ''}`, ne: `${Y} मा कसले के जित्यो` });
}
// A world-layer failure must never stop the season flow: report it and carry on.
function safe(name, fn) { try { fn(); } catch (e) { console.error(`world.${name}:`, e); } }
export function auctionSetup(G) { safe('auctionSetup', () => expireNocs(G)); worldTick(G); }
export function seasonStart(G) { safe('seasonStart', () => seasonStart0(G)); worldTick(G); }
function seasonStart0(G) {
  const w = W(G); if (!w) return; expireNocs(G);
  const c = w.clash; if (c && c.y === G.year && c.status === 'open') decideClash(G, 'without', 'expired');
  if (c && c.y === G.year && c.status === 'without' && !c.applied) { for (const id of c.pids) { const p = G.P(id); if (p && p.team === G.user) p.fit = clamp(p.fit - 8, 30, 100); } c.applied = true; }
  for (const p of Object.values(G.players)) { const r = p.nocRisk; if (!r) continue; delete p.nocRisk; if (r.y !== G.year || p.team !== G.user) continue;
    if (R() * 100 < r.inj) { p.inj = ri(1, 2); G.news(`${p.name} comes back from the ${LEAGUE_BY[r.league].short} injured`, 'injury', { detail: `He misses the first ${p.inj} NPL match${p.inj > 1 ? 'es' : ''}.` }); } }
}
export function afterMatch(G) { worldTick(G); }
// Before an NPL match the world is moved to its day (worldlink.js): make sure every nation can field a side.
export function beforeMatch(G) { safe('beforeMatch', () => { if (G.s.wd) { IN.seen(G); IN.ensureDefs(G); IN.injectSides(G); } }); }
export function beforeSave(G) { safe('archive', () => archive(G)); }
export function todayTasks(G) {
  const w = W(G); if (!w) return []; const out = [];
  for (const r of openNocs(G)) { const p = G.P(r.pid); if (!p) continue; out.push({ key: `noc-${r.id}`, text: `NOC request: ${r.team} want ${p.name}`, sub: `${LEAGUE_BY[r.league].short} ${kindLabel(r.kind)} · Rs ${r.fee} L`, to: '/world?tab=nepalis' }); }
  if (w.clash && w.clash.status === 'open') out.push({ key: 'clash', text: 'Nepal duty clashes with your pre-season camp', sub: `${w.clash.comp} · ${w.clash.pids.length} of your players`, to: '/international' });
  return out;
}

// ===== For the screens =====
export const today = (G) => (G.s.wd ? G.s.wd.day : 0);
export const NEP = 'NEP';
const hasNep = (f) => f.a === 'NEP' || f.b === 'NEP';
// Nepal's next fixtures: [[season, fixture]], soonest first.
export function nextNepal(G, n = 5) { const t = today(G); const out = []; for (const S of Object.values(G.s.wd ? G.s.wd.seasons : {})) if (S.teams.includes('NEP')) for (const f of S.fx) if (!f.res && hasNep(f) && f.d >= t) out.push([S, f]); return out.sort((a, b) => a[1].d - b[1].d).slice(0, n); }
// Nepal's events in a window of days: [{ S, first, last, w, l, nr, n, played }].
export function nepalEvents(G, from, to) {
  const out = []; for (const S of Object.values(G.s.wd ? G.s.wd.seasons : {})) { if (S.real || !S.teams.includes('NEP')) continue; const fx = S.fx.filter((f) => hasNep(f) && f.d >= from && f.d <= to); if (!fx.length) continue;
    const r = { S, first: Math.min(...fx.map((f) => f.d)), last: Math.max(...fx.map((f) => f.d)), w: 0, l: 0, nr: 0, n: fx.length, played: 0 };
    for (const f of fx) if (f.res) { r.played++; if (f.res.nr) r.nr++; else if (f.res.w === 'NEP') r.w++; else r.l++; } out.push(r); }
  return out.sort((a, b) => a.first - b.first);
}
export const winterWindow = (w) => [dayOfDate(w, 9, 1), dayOfDate(w + 1, 8, 30)];
// The tournaments in a window (not bilateral series), and the ones still to be drawn from the programme.
export function tournaments(G, from, to) {
  const have = Object.values(G.s.wd ? G.s.wd.seasons : {}).filter((S) => { const k = IN.info(S).kind; return !['bilat', 'tri', 'hist'].includes(k) && (S.endF ?? IN.lastDay(S)) >= from && S.start <= to; });
  const ids = new Set(have.map((S) => S.id)); const later = [];
  for (let y = dateOf(from).y; y <= dateOf(to).y; y++) for (const it of IN.programme(G, y)) { if (it.teams && /^BIL|^NEPBAN/.test(it.id)) continue; if (ids.has(it.id) || it.start > to || (it.ends ? it.ends[it.ends.length - 1] : it.end) < from) continue; const made = G.s.wd.intl && G.s.wd.intl.made[it.id]; if (made && made !== 1) continue; ids.add(it.id); later.push(it); }
  return { have: have.sort((a, b) => a.start - b.start), later: later.sort((a, b) => a.start - b.start) };
}
// Where Nepal stand on the 50-over pathway, for the next ODI World Cup still to finish.
export function pathState(G) {
  const S = (id) => (G.s.wd ? G.s.wd.seasons[id] : null) || null; let W = 2027; while (S(`WC50-${W}`) && S(`WC50-${W}`).done) W += 4;
  const ids = { wc: `WC50-${W}`, wcq: `CWCQ-${W}`, po: `CWCPO-${W - 1}`, l2: W === 2027 ? 'CWCL2-2023' : `CWCL2-${W - 4}`, cl: W === 2027 ? 'CL-2024' : `CL-${W - 4}` };
  const step = {}; for (const k in ids) step[k] = S(ids[k]);
  const inS = (k) => !!(step[k] && step[k].teams.includes('NEP')); const pl = (k) => (step[k] ? IN.placing(step[k]).indexOf('NEP') : -1);
  let at = inS('wc') ? 'wc' : inS('wcq') ? 'wcq' : inS('po') ? 'po' : inS('l2') ? 'l2' : inS('cl') ? 'cl' : 'l2'; let out = false;
  if (at === 'wcq' && step.wcq.done && pl('wcq') >= 4) out = true;
  if (at === 'po' && step.po.done && pl('po') >= 4) out = true;
  if (at === 'cl' && step.cl.done) out = true;
  const cup = { y: W, name: IN.odiName(W), hosts: W === 2027 || W === 2031 ? (step.wc ? IN.cupHosts(step.wc) : W === 2027 ? 'South Africa, Zimbabwe and Namibia' : 'India and Bangladesh') : 'Hosts not announced' };
  const title = at === 'wc' ? `Nepal are going to the ${W} World Cup` : out ? `Nepal miss the ${W} World Cup` : `Road to the ${W} World Cup`;
  const nx = nextNepal(G, 1)[0];
  const next = nx ? `Next: ${IN.sbase(nx[0])} · ${nm(nx[1].a === 'NEP' ? nx[1].b : nx[1].a)} · ${IN.monthOf(nx[1].d)}` : 'No Nepal fixtures scheduled yet';
  return { W, ids, step, at, out, cup, title, next, pos: (k) => pl(k) };
}
// The T20 World Cup route for the next T20 World Cup still to finish.
export function t20State(G) {
  const S = (id) => (G.s.wd ? G.s.wd.seasons[id] : null) || null; let T = 2028; while (S(`T20WC-${T}`) && S(`T20WC-${T}`).done) T += 2;
  const r = IN.t20Route(G, T); const wc = S(`T20WC-${T}`), gq = S(`T20GQ-${T}`), rq = S(`T20RQ-Asia-${T}`);
  const via = r ? (r.auto.includes('NEP') ? 'auto' : r.direct.includes('NEP') ? 'gq' : 'rq') : null;
  const status = wc ? (wc.teams.includes('NEP') ? 'Qualified' : 'Did not qualify') : gq && gq.done ? (IN.gqQualifiers(gq).includes('NEP') ? 'Qualified' : 'Did not qualify') : gq && gq.teams.includes('NEP') ? 'At the Global Qualifier' : rq && rq.done && !(gq && gq.teams.includes('NEP')) && IN.placing(rq).indexOf('NEP') >= 2 ? 'Out in the regional final' : via === 'auto' ? 'Qualified' : via === 'gq' ? 'Straight to the Global Qualifier' : via === 'rq' ? 'Asia regional final first' : 'Route set by the previous World Cup';
  return { T, name: IN.t20Name(T), hosts: T === 2028 ? 'Australia and New Zealand' : T === 2030 ? 'England, Ireland and Scotland' : 'Hosts not announced', start: IN.t20Start(T), wc, gq, rq, via, status };
}
// Batting and bowling leaders of a season, from the world stats: [{id, name, nat, r, w, ...}].
export function leadersOf(G, S, n = 5) {
  const T = (G.s.wd && G.s.wd.st[S.id]) || {}; const reg = (id) => G.players[id] || (G._wr && G._wr.by[id]) || null; const L = [];
  for (const id in T) { const p = reg(id); if (p && p.gen) continue; const x = T[id]; L.push({ id, name: p ? p.name : id, nat: p ? p.nat : '', gen: !!(p && p.gen), m: x[0], r: x[3], hs: x[5], w: x[10], balls: x[8], rc: x[9], econ: x[8] ? x[9] / (x[8] / 6) : 99 }); }
  return { runs: L.slice().sort((a, b) => b.r - a.r).slice(0, n), wkts: L.filter((x) => x.w).sort((a, b) => b.w - a.w || a.econ - b.econ).slice(0, n) };
}
export { MONTHS, rf, pick, shuffle };
