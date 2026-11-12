// ===== Careers: jobs, offers, national boards, and the NPL on the world clock =====
// s.wd.jobs     [{ kind: 'club', comp: 'NPL', team, since } | { kind: 'nation', team, since, sinceDay, board, obj, objY, rec }]
//               at most one of each kind. With no club job the user's old NPL club (G.user, kept for legacy
//               code) is run by the AI: hasClub(G) is the flag every screen checks.
// s.wd.jobHist  [{ kind, team, comp, from, to, fromDay, toDay, how: 'resigned' | 'sacked' | 'left', rec }]
// s.wd.offers   [{ id, kind, team, comp?, day, until, applied? }]
// s.wd.xi       { code: { fmt: { xi: [key], cap, wk } } }   the national XI, captain and keeper (squads in s.wd.squads)
// s.wd.cr       { offerDay, apps: { code: day } }           when offers were last rolled, applications made
// Player keys: a database player is stored by his database id; an NPL player who is also in the database
// (p.wid) by that id too; an NPL-only player by his NPL id. keyOf(p) gives the key, registry(G).by[key] the player.
import * as ST from './state.js';
import { COMPS } from './comps.js';
import { qualifyingPlaces } from './intl.js';
import { NATIONS_DB } from '../data/world/index.js';
import { poolOf, registry, wp } from './players.js';
import { autoSquad, autoXI, value } from './squads.js';
import { dayOfDate, dayOfLabel, yearOf, short } from './dates.js';
import { cautiousIndex } from '../game/game.js';
import * as Club from './club.js';
import { simFixture, completeSquad, startOffseason, afterFixture } from '../lib/flow.js';

export const MEMBER = Object.fromEntries(NATIONS_DB.map((n) => [n[0], n[2]]));
export const NATION_NAME = Object.fromEntries(NATIONS_DB.map((n) => [n[0], n[1]]));
export const ASSOCIATES = NATIONS_DB.filter((n) => n[2] === 'associate').map((n) => n[0]);
export const FULL = NATIONS_DB.filter((n) => n[2] === 'full').map((n) => n[0]);
// Reputation a nation's board looks for. Nepal comes a little earlier for a manager who has done well in the NPL.
export const REP = { associate: 50, full: 75, nepal: 45 };
export const SACK = { easy: 15, normal: 25, hard: 35 };
// Formats a national manager picks squads for: Tests too for a full member (they play Tests).
export const FMTS = [['Test', 'Test'], ['ODI', 'ODI'], ['T20', 'T20I']];
export const fmtsFor = (code) => FMTS.filter(([f]) => f !== 'Test' || MEMBER[code] === 'full');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ----- state -----
export function ensure(G) {
  const wd = G.s.wd; if (!wd) return null;
  wd.jobs ??= []; wd.jobHist ??= []; wd.offers ??= []; wd.xi ??= {}; wd.squads ??= {}; wd.cr ??= { offerDay: wd.day, apps: {} };
  for (const j of wd.jobs) if (j.kind === 'nation' || Club.isAbroad(j)) { j.board ??= 60; j.rec ??= { p: 0, w: 0, l: 0 }; j.sinceDay ??= wd.day; j.obj ??= []; }
  return wd;
}
export const jobs = (G) => (G.s.wd && G.s.wd.jobs) || [];
export const clubJob = (G) => jobs(G).find((j) => j.kind === 'club') || null;
export const nationJob = (G) => jobs(G).find((j) => j.kind === 'nation') || null;
export const nplJob = (G) => jobs(G).find((j) => j.kind === 'club' && (!j.comp || j.comp === 'NPL')) || null;
export const abroadJob = (G) => Club.abroadJob(G);
// the NPL phase machine waits for the user only while the user holds an NPL club job
export const hasClub = (G) => !G.s.wd || !!nplJob(G); // a save without the world is a club career
export const mySide = (G, f) => [f.a, f.b].find((t) => ST.isUserTeam(G, t)) || null;
export const userNation = (G) => { const j = nationJob(G); return j ? j.team : null; };
export const rep = (G) => G.s.manager.rep;
export const addRep = (G, d) => { G.s.manager.rep = clamp(Math.round((G.s.manager.rep + d) * 10) / 10, 0, 100); };
export const nationName = (G, code) => ST.teamName(G, code);
export const today = (G) => G.s.wd.day;
export const keyOf = (p) => (p && (p.wid || p.id)) || null;
// the key a stored selection uses for this player, if any (stored keys may be his NPL id or database id)
export const keyIn = (p, keys) => (p ? (keys.includes(p.id) ? p.id : p.wid && keys.includes(p.wid) ? p.wid : null) : null);

// The NPL's club job follows the phase 2 game: taking another franchise (Club screen) changes G.user, and
// the board's dismissal (s.sacked) waits for the user to take an offer or carry on without a club.
export function syncClub(G) {
  const wd = ensure(G); if (!wd) return; const j = nplJob(G); if (!j) return;
  if (j.team !== G.user && G.teams[G.user]) { endJob(G, j, j.sacked ? 'sacked' : 'left'); wd.jobs.push({ kind: 'club', comp: 'NPL', team: G.user, since: G.year, sinceDay: wd.day }); }
  else if (G.s.sacked) j.sacked = true;
}

// ----- taking and leaving jobs -----
function endJob(G, j, how) {
  const wd = G.s.wd; wd.jobs = wd.jobs.filter((x) => x !== j);
  wd.jobHist.push({ kind: j.kind, team: j.team, comp: j.comp || null, from: j.since, to: yearOf(wd.day), fromDay: j.sinceDay ?? null, toDay: wd.day, how, rec: j.rec ? { ...j.rec } : clubRecord(G, j) });
}
function clubRecord(G, j) { let p = 0, w = 0, l = 0; for (const c of G.s.manager.career || []) if (c.team === j.team && c.year >= (j.since || 0)) { p++; if (c.champ) w++; } return { seasons: p, titles: w, l }; }

// Takes a job. Holding a job of the same kind is an error unless replace is set (the old one is left).
export function takeJob(G, kind, team, { comp = 'NPL', replace = false, quiet = false } = {}) {
  const wd = ensure(G); const cur = kind === 'club' ? clubJob(G) : nationJob(G);
  if (cur && cur.team === team) return 'You already hold that job.';
  if (cur && !replace) return `You already manage ${nationName(G, cur.team)}. Leave that job first.`;
  if (kind === 'club' && comp === 'NPL' && !G.teams[team]) return 'No such club.';
  if (kind === 'club' && comp !== 'NPL') { registry(G); if (!Club.teamsAndLevels(G).some((t) => t.id === team && t.league === comp)) return 'No such club.'; }
  if (kind === 'nation' && !MEMBER[team]) return 'No such nation.';
  if (cur) endJob(G, cur, 'left');
  if (kind === 'club' && comp !== 'NPL') {
    const j = { kind: 'club', comp, team, since: yearOf(wd.day), sinceDay: wd.day, board: 60, obj: [], objY: null, rec: { p: 0, w: 0, l: 0 } };
    wd.jobs.push(j); setObjectives(G, j);
    for (const S of ST.seasons(G)) for (const f of S.fx) if (f.res && (f.a === team || f.b === team)) f.cj = 1;
  } else if (kind === 'club') {
    if (team !== G.user) G.takeJob(team); else { G.s.sacked = false; G.s.offers = null; G.teams[team].board = Math.max(G.teams[team].board, 55); }
    wd.jobs.push({ kind: 'club', comp, team, since: G.year, sinceDay: wd.day });
  } else {
    const j = { kind: 'nation', team, since: yearOf(wd.day), sinceDay: wd.day, board: 60, obj: [], objY: null, rec: { p: 0, w: 0, l: 0 } };
    wd.jobs.push(j); setObjectives(G, j);
    // results before today were someone else's
    for (const S of ST.seasons(G)) for (const f of S.fx) if (f.res && (f.a === team || f.b === team)) f.cj = 1;
  }
  wd.offers = wd.offers.filter((o) => !(o.kind === kind && o.team === team));
  if (!quiet) G.news(`You are the new ${kind === 'club' ? 'head coach' : 'national team manager'} of ${nationName(G, team)}.`, 'world', { sub: 'New job' });
  return null;
}
// Resigning: the club carries on under the AI, the nation appoints someone else.
export function resign(G, kind) {
  const wd = ensure(G); const j = kind === 'club' ? clubJob(G) : nationJob(G); if (!j) return 'You do not hold that job.';
  if (kind === 'club' && G.s.liveMatch && G.s.liveMatch.n) return 'Finish the match in progress first.';
  endJob(G, j, j.sacked ? 'sacked' : 'resigned'); if (kind === 'club' && !Club.isAbroad(j)) { G.s.sacked = false; G.s.offers = null; G.s.promises = []; }
  addRep(G, -1);
  G.news(`You have left ${nationName(G, j.team)}.`, 'world', { sub: kind === 'club' ? 'The club carries on under a caretaker' : 'The board will appoint a successor' });
  return null;
}
export function sack(G, j, why) {
  endJob(G, j, 'sacked'); addRep(G, -4);
  G.news(`${nationName(G, j.team)} have dismissed you as ${j.kind === 'club' ? 'head coach' : 'national team manager'}.`, 'world', { sub: 'Sacked', detail: why });
}

// ----- offers and applications -----
export const nplSuccess = (G) => (G.s.manager.career || []).some((c) => c.champ || c.runner || c.pos <= 2);
export function needRep(G, code) { if (code === 'NEP' && nplSuccess(G)) return REP.nepal; return MEMBER[code] === 'full' ? REP.full : REP.associate; }
// Nations whose board would consider you now.
export function eligible(G) { const r = rep(G); const mine = userNation(G); return Object.keys(MEMBER).filter((c) => c !== mine && r >= needRep(G, c)); }
// NPL clubs that might call a manager without a club.
function clubCands(G) { const cur = clubJob(G); return Object.keys(G.teams).filter((t) => !cur || t !== cur.team); }

// Rolls offers (every 90 days, from tick). Returns the new offers.
export function makeOffers(G, rnd = Math.random) {
  const wd = ensure(G); const day = wd.day; const out = [];
  const have = new Set(wd.offers.map((o) => o.team)); const r = rep(G); const nj = nationJob(G);
  const el = eligible(G).filter((c) => !have.has(c));
  // the nearer a nation's level is to your reputation, the likelier it calls
  const w = (c) => 1 / (1 + Math.max(0, r - needRep(G, c) - 15) / 10) * (c === 'NEP' ? 2 : 1);
  const pickW = (list) => { let t = list.reduce((a, c) => a + w(c), 0) * rnd(); for (const c of list) { t -= w(c); if (t <= 0) return c; } return list[list.length - 1]; };
  const n = el.length ? (rnd() < (nj ? 0.3 : 0.75) ? 1 : 0) + (rnd() < (nj ? 0.05 : 0.3) ? 1 : 0) : 0; const left = el.slice();
  for (let k = 0; k < n && left.length; k++) { const c = pickW(left); left.splice(left.indexOf(c), 1); out.push({ id: `o${day}${c}`, kind: 'nation', team: c, day, until: day + 45 }); }
  for (const x of Club.offers(G, rnd, have)) { if (out.some((o) => o.kind === 'club')) break; out.push({ id: `o${day}${x.team}`, kind: 'club', comp: x.comp, team: x.team, day, until: day + 45 }); }
  if (!clubJob(G) && !out.some((o) => o.kind === 'club') && r >= 40 && rnd() < 0.6) { const cs = clubCands(G).filter((t) => !have.has(t)); if (cs.length) { const t = cs[Math.floor(rnd() * cs.length)]; out.push({ id: `o${day}${t}`, kind: 'club', comp: 'NPL', team: t, day, until: day + 45 }); } }
  wd.offers.push(...out);
  for (const o of out) G.news(`${nationName(G, o.team)} would like to talk about their ${o.kind === 'club' ? 'head coach' : 'national team'} job.`, 'world', { sub: 'Job offer', detail: `The offer stands until ${short(o.until)}. See Jobs.` });
  return out;
}
// Applying: a board that would consider you says yes three times in four; a near miss now and then.
export function apply(G, code, rnd = Math.random) {
  const wd = ensure(G); if (!MEMBER[code]) return { ok: false, text: 'No such nation.' };
  if (userNation(G) === code) return { ok: false, text: 'You already manage them.' };
  const last = wd.cr.apps[code]; if (last != null && wd.day - last < 60) return { ok: false, text: `You applied on ${short(last)}. Give them time.` };
  wd.cr.apps[code] = wd.day; const need = needRep(G, code); const r = rep(G);
  const p = r >= need ? 0.75 : r >= need - 8 ? 0.3 : 0;
  if (rnd() < p) { const o = { id: `a${wd.day}${code}`, kind: 'nation', team: code, day: wd.day, until: wd.day + 30, applied: true }; wd.offers.push(o); return { ok: true, offer: o, text: `${nationName(G, code)} offer you the job.` }; }
  return { ok: false, text: r < need - 8 ? `${nationName(G, code)} want a manager with a reputation of about ${need}. Yours is ${Math.round(r)}.` : `${nationName(G, code)} went with another candidate.` };
}
export function accept(G, id, { replace = false } = {}) {
  const wd = ensure(G); const o = wd.offers.find((x) => x.id === id); if (!o) return 'That offer has gone.';
  const err = takeJob(G, o.kind, o.team, { comp: o.comp || 'NPL', replace }); if (err) return err;
  wd.offers = wd.offers.filter((x) => x !== o); return null;
}
export function decline(G, id) { const wd = ensure(G); wd.offers = wd.offers.filter((x) => x.id !== id); }

// ----- national boards: objectives and confidence -----
// A side's strength in a format: the average squad value of its best XI (0 when it has no players).
export function strength(G, code, fmt) {
  const sq = ST.squadFor(G, code, fmt); if (!sq.length) return 0; const { xi } = autoXI(sq, fmt);
  return xi.reduce((a, p) => a + value(p, fmt), 0) / Math.max(1, xi.length);
}
const fmtOf = (S) => (S.fx[0] && S.fx[0].fmt) || (COMPS[S.comp] && COMPS[S.comp].fmt) || 'ODI';
export const seasonName = (S) => S.name || (COMPS[S.comp] && COMPS[S.comp].name) || S.comp;
// The year's objectives from the competitions the nation is in: a target the board thinks is fair.
export function setObjectives(G, j) {
  const y = yearOf(G.s.wd.day); ST.ensureYear(G, y); j.objY = y; j.obj = [];
  for (const S of ST.seasons(G)) {
    if (S.y !== y || !S.teams.includes(j.team)) continue; const def = COMPS[S.comp] || { stages: [] }; const nm = seasonName(S); const fmt = fmtOf(S);
    const types = def.stages.map((s) => s.type); const ranked = S.teams.map((t) => [t, strength(G, t, fmt)]).sort((a, b) => b[1] - a[1]);
    const r = ranked.findIndex(([t]) => t === j.team) + 1; const n = S.teams.length;
    let o;
    if (types[0] === 'series') { const opp = S.teams.find((t) => t !== j.team); const kind = fmt === 'T20' ? 'T20I' : fmt === 'ODI' ? 'ODI' : 'Test';
      o = r === 1 ? { k: 'series', t: `Win the ${kind} series against ${nationName(G, opp)}` } : { k: 'onewin', t: `Win at least one ${kind} against ${nationName(G, opp)}` }; }
    else if (/qualif/i.test(nm) || qualifyingPlaces(S)) { const places = qualifyingPlaces(S);
      // the real qualifying places when the event has them; otherwise the board's estimate
      o = places ? { k: 'top', n: places, t: `Qualify: finish in the top ${places} of the ${nm}` } : { k: 'top', n: Math.max(2, Math.min(n, r + 1)), t: '' }; }
    else if (types.includes('ko')) o = r === 1 ? { k: 'win', t: `Win the ${nm}` } : r <= 4 ? { k: 'ko', t: `Reach the knockouts of the ${nm}` } : { k: 'top', n: Math.min(n, r + 1), t: '' };
    else o = { k: 'top', n: Math.min(n, r + 1), t: '' };
    // a target of last place or worse means nothing: the board asks for a win instead
    if (o.k === 'top' && o.n >= n && !qualifyingPlaces(S)) o = { k: 'onewin', t: `Win at least one match at the ${nm}` };
    if (o.k === 'top' && !o.t) o.t = o.n === 1 ? `Win the ${nm}` : /qualif/i.test(nm) ? `Reach the World Cup: finish in the top ${o.n} of the ${nm}` : `Finish in the top ${o.n} of the ${nm}`;
    j.obj.push({ sid: S.id, ...o, done: null });
  }
}
function rankIn(S, team) { const t = S.tables.super || S.tables.all || S.tables.series || Object.values(S.tables).find((x) => x[team]); if (!t) return 99; const st = ST.tableOf({ tables: { x: t } }, 'x'); const i = st.findIndex((r) => r.id === team); return i < 0 ? 99 : i + 1; }
function objMet(G, S, o, team) {
  if (o.k === 'win') return S.champ === team;
  if (o.k === 'ko') return S.fx.some((f) => f.ko && (f.a === team || f.b === team));
  if (o.k === 'series') { const t = S.tables.series; return !!t && t[team] && Object.entries(t).every(([id, r]) => id === team || t[team].w > r.w); }
  if (o.k === 'onewin') return S.fx.some((f) => f.res && f.res.w === team);
  if (o.k === 'top') return S.champ === team || rankIn(S, team) <= o.n || (S.fx.some((f) => f.ko) && S.fx.some((f) => f.ko === 'F' && (f.a === team || f.b === team)));
  return false;
}
// After each of the nation's results: confidence follows the result against the expectation.
export function afterResult(G, j, S, f) {
  const res = f.res; if (!res) return; const opp = f.a === j.team ? f.b : f.a; const fmt = f.fmt || fmtOf(S);
  const edge = strength(G, j.team, fmt) - strength(G, opp, fmt); // positive: we were favourites
  const won = res.w === j.team && !res.nr, lost = res.l === j.team && !res.nr && !res.tie;
  j.rec.p++; if (won) j.rec.w++; else if (lost) j.rec.l++;
  const d = won ? (edge > 3 ? 1 : edge < -3 ? 4 : 2) : lost ? (edge > 3 ? -4 : edge < -3 ? -1 : -2) : 0;
  j.board = clamp(j.board + d, 0, 100);
  addRep(G, won ? (MEMBER[opp] === 'full' ? 0.8 : 0.3) : lost ? -0.1 : 0);
}
// Competitions that have finished: each objective met or missed moves the board, and a board below the
// line for this difficulty sacks the manager.
export function review(G, j) {
  const out = [];
  for (const o of j.obj) {
    if (o.done != null) continue; const S = G.s.wd.seasons[o.sid]; if (!S || !S.done) continue;
    o.done = objMet(G, S, o, j.team); j.board = clamp(j.board + (o.done ? 10 : -12), 0, 100); addRep(G, o.done ? 2 : -1);
    if (S.champ === j.team) addRep(G, MEMBER[j.team] === 'full' ? 3 : 4);
    G.news(`${o.done ? 'Objective met' : 'Objective missed'}: ${o.t}.`, 'world', { sub: nationName(G, j.team), detail: `Board confidence ${j.board}.` }); out.push(o);
  }
  if (out.length && j.board < sackLine(G)) sack(G, j, `Board confidence fell to ${j.board}.`);
  return out;
}
export const sackLine = (G) => SACK[(G.s.settings && G.s.settings.difficulty) || 'normal'] ?? 25;

// Everything that follows the clock: new objectives each year, results counted, reviews, offers.
export function tick(G, rnd = Math.random) {
  const wd = ensure(G); if (!wd) return; syncClub(G);
  Club.tick(G, rnd);
  const aj = Club.abroadJob(G);
  if (aj) clubJobTick(G, aj);
  const j = nationJob(G);
  if (j) {
    if (j.objY !== yearOf(wd.day)) setObjectives(G, j);
    for (const S of ST.seasons(G)) for (const f of S.fx) if (f.res && !f.cj && (f.a === j.team || f.b === j.team)) { f.cj = 1; afterResult(G, j, S, f); }
    review(G, j);
  }
  wd.offers = wd.offers.filter((o) => o.until >= wd.day);
  if (wd.day - (wd.cr.offerDay ?? wd.day) >= 90) { wd.cr.offerDay = wd.day; makeOffers(G, rnd); }
}

function clubJobTick(G, j) {
  const y = yearOf(G.s.wd.day); if (j.objY !== y) setObjectives(G, j);
  for (const S of ST.seasons(G)) for (const f of S.fx) if (f.res && !f.cj && (f.a === j.team || f.b === j.team)) { f.cj = 1; afterResult(G, j, S, f); }
  review(G, j); if (!jobs(G).includes(j)) return;
  j.vs ??= []; for (const S of Club.leagueSeasons(G, j.comp)) if (S.done && S.teams.includes(j.team) && !j.vs.includes(S.id)) { j.vs.push(S.id); Club.verdict(G, j, S); if (j.board < sackLine(G)) { sack(G, j, `Board confidence fell to ${j.board}.`); return; } }
}

// ----- national squads and the XI -----
export function nationSel(G, code, fmt) { const wd = ensure(G); return (wd.xi[code] && wd.xi[code][fmt]) || null; }
// a key is a database id or an NPL id; an NPL player found in the database later still matches either
const sameP = (p, k) => !!p && (p.id === k || p.wid === k);
const byKey = (G, k) => registry(G).by[k] || wp(G, k) || Object.values(G.players).find((p) => p.wid === k) || null;
// The squad (15), XI (11), batting order, captain and keeper the user's side will use in this format.
export function selection(G, code, fmt) {
  if (Club.isClubTeam(G, code)) return Club.selection(G, code, fmt);
  // with the assistant on (Settings), or before the user picks, the assistant's squad and XI are used
  const wd = ensure(G); const asst = !!(G.s.settings && G.s.settings.assistant); const picked = !asst && wd.squads[code] && wd.squads[code][fmt];
  const squad = picked ? picked.map((k) => byKey(G, k)).filter((p) => p && !p.retired) : autoSquad(poolOf(G, code).filter((p) => !p.inj), fmt);
  const fit = squad.filter((p) => !p.inj); const sel = asst ? null : nationSel(G, code, fmt);
  // the user's XI as picked (it may be short while they change it); a short XI is filled for a match
  const mine = sel && sel.xi ? sel.xi.map((k) => fit.find((p) => sameP(p, k))).filter(Boolean) : null;
  const xi = mine && mine.length >= 11 ? mine.slice(0, 11) : mine ? [...mine, ...autoXI(fit.filter((p) => !mine.includes(p)), fmt).xi].slice(0, 11) : autoXI(fit, fmt).xi;
  const order = autoXI(xi, fmt).order; const has = (k) => xi.find((p) => sameP(p, k));
  const wk = (sel && sel.wk && has(sel.wk)) || xi.filter((p) => p.role === 'WK').sort((a, b) => b.bat - a.bat)[0] || xi.slice().sort((a, b) => (b.field || 50) - (a.field || 50))[0] || null;
  const cap = (sel && sel.cap && has(sel.cap)) || xi.slice().sort((a, b) => (b.traits ? b.traits.lead : 50) - (a.traits ? a.traits.lead : 50) || value(b, fmt) - value(a, fmt))[0] || null;
  return { squad, xi, xiPicked: mine || xi, order, wk, cap, picked: !!picked, auto: !picked || !sel, asst };
}
export function setSquad(G, code, fmt, keys) {
  const wd = ensure(G); if (keys && keys.length > 15) return 'A squad has at most 15 players.';
  (wd.squads[code] ??= {}); if (!keys) { delete wd.squads[code][fmt]; if (wd.xi[code]) delete wd.xi[code][fmt]; return null; }
  wd.squads[code][fmt] = keys.slice();
  const sel = nationSel(G, code, fmt); if (sel) { sel.xi = (sel.xi || []).filter((k) => keys.includes(k)); if (!keys.includes(sel.cap)) sel.cap = null; if (!keys.includes(sel.wk)) sel.wk = null; }
  return null;
}
export function setXI(G, code, fmt, patch) {
  const wd = ensure(G); const cur = selection(G, code, fmt);
  if (!wd.squads[code] || !wd.squads[code][fmt]) setSquad(G, code, fmt, cur.squad.map(keyOf));
  const sel = ((wd.xi[code] ??= {})[fmt] ??= { xi: cur.xi.map(keyOf), cap: keyOf(cur.cap), wk: keyOf(cur.wk) });
  if (patch.xi) { if (patch.xi.length > 11) return 'Pick eleven.'; sel.xi = patch.xi.slice(); }
  if (patch.cap !== undefined) sel.cap = patch.cap; if (patch.wk !== undefined) sel.wk = patch.wk;
  return null;
}
// Recent form for the selection screen: every world competition (s.wd.st) plus the NPL.
export function recentStats(G, p) {
  const o = { m: 0, r: 0, w: 0, inn: 0, no: 0, hs: 0, balls: 0, rc: 0, b: 0, comps: [] }; const y = yearOf(G.s.wd.day);
  for (const sid in G.s.wd.st) { const x = G.s.wd.st[sid][p.id]; if (!x) continue; const S = G.s.wd.seasons[sid]; if (S && S.y < y - 1) continue;
    o.m += x[0]; o.inn += x[1]; o.no += x[2]; o.r += x[3]; o.b += x[4]; o.hs = Math.max(o.hs, x[5]); o.balls += x[8]; o.rc += x[9]; o.w += x[10]; o.comps.push(S ? seasonName(S) : sid); }
  const np = G.players[p.id]; if (np && np.stats) for (const yy of [G.year, G.year - 1]) { const s = np.stats[yy]; if (!s || !s.m) continue; o.m += s.m; o.inn += s.inn; o.no += s.no; o.r += s.r; o.b += s.b; o.hs = Math.max(o.hs, s.hs); o.balls += s.bb; o.rc += s.rc; o.w += s.w; o.comps.push(`NPL ${yy}`); }
  return o;
}
// A player's club, for the selection screen.
export function clubOf(G, p) {
  const np = G.players[p.id]; if (np && np.team && G.teams[np.team]) return G.teams[np.team].name;
  const regs = (p.regs || []).filter((t) => t !== p.nat); return regs.length ? regs.join(', ') : '—';
}

// ----- the NPL on the world clock -----
export function nplDay(G, f) {
  const d = dayOfLabel(f.date, G.year); if (d != null) return d;
  const L = G.s.fixtures.filter((x) => x.stage === 'L').map((x) => dayOfLabel(x.date, G.year)).filter((x) => x != null);
  return (L.length ? Math.max(...L) : dayOfDate(G.year, 10, 20)) + ({ Q1: 3, EL: 4, Q2: 6, F: 8 }[f.stage] || 2);
}
const lastNplDay = (G) => { const F = G.s.fixtures.filter((f) => f.res); return F.length ? nplDay(G, F[F.length - 1]) : G.s.wd.day; };
export const NPL_DATES = { retention: [6, 1], auction: [6, 20] }; // month (0-11), day, in the season's year
const seasonStart = (G) => { const f = G.s.fixtures.find((x) => !x.res); return G.s.phase === 'preseason' && f && G.year === 2026 ? nplDay(G, f) : dayOfDate(G.year, 9, 24); };
// The next NPL step the club manager has to take, with its day: a match, the off-season, retention, the auction, the season start.
export function nplEvent(G) {
  const ph = G.s.phase; const now = G.s.wd.day; const Y = G.year;
  if (ph === 'league' || ph === 'playoffs') {
    const nu = G.s.fixtures.find((f) => !f.res);
    if (!hasClub(G)) return nu ? { kind: 'npl', what: 'sim', f: nu, day: nplDay(G, nu) } : null;
    const f = G.s.fixtures.find((x) => !x.res && (x.home === G.user || x.away === G.user));
    if (f) return { kind: 'npl', what: 'match', f, day: nplDay(G, f) };
    return nu ? { kind: 'npl', what: 'sim', f: nu, day: nplDay(G, nu) } : null;
  }
  if (ph === 'seasonEnd') return { kind: 'npl', what: 'offseason', day: Math.max(now, lastNplDay(G) + 1) };
  if (ph === 'retention') return { kind: 'npl', what: 'retention', day: now }; // started: finish it
  if (ph === 'offseason') return { kind: 'npl', what: 'retention', day: dayOfDate(Y, ...NPL_DATES.retention) };
  if (ph === 'auction') return { kind: 'npl', what: 'auction', day: dayOfDate(Y, ...NPL_DATES.auction) };
  if (ph === 'preseason') return { kind: 'npl', what: 'season', day: seasonStart(G) };
  return null;
}
export const NPL_WHAT = { match: 'NPL match', sim: 'NPL matches', offseason: 'NPL off-season', retention: 'NPL retention deadline', auction: 'NPL auction', season: 'NPL season starts' };

// The next thing that needs the user across both jobs (the earliest): a national fixture or an NPL step.
// A national fixture on the same day as an NPL match comes first.
export function nextEvent(G) {
  const wd = ensure(G); if (!wd) return null; const y = yearOf(wd.day); ST.ensureYear(G, y); ST.ensureYear(G, y + 1);
  const wf = ST.nextUserFixture(G); const ne = hasClub(G) ? nplEvent(G) : null;
  const w = wf ? { kind: 'world', S: wf[0], f: wf[1], day: wf[1].d } : null;
  const ce = Club.clubEvent(G); let best = ne; if (w && (!best || w.day <= best.day)) best = w; if (ce && (!best || ce.day <= best.day)) best = ce; return best;
}
export function eventLabel(G, ev) {
  if (!ev) return 'Nothing scheduled';
  if (ev.kind === 'club') return `${ST.teamName(G, Club.abroadJob(G).team)} ${Club.stageLabel(ev)}`;
  if (ev.kind === 'world') return `${nationName(G, ev.f.a)} v ${nationName(G, ev.f.b)} · ${seasonName(ev.S)}`;
  if (ev.what === 'match') return `${G.teams[ev.f.home].name.split(' ')[0]} v ${G.teams[ev.f.away].name.split(' ')[0]} · NPL`;
  return NPL_WHAT[ev.what] || ev.what;
}

// Players called up by a national side with a fixture within a day of `day`: NPL id -> nation.
export function callUps(G, day) {
  const out = new Map(); const seen = new Set();
  for (const S of ST.seasons(G)) for (const f of S.fx) {
    if (Math.abs(f.d - day) > 1) continue;
    for (const t of [f.a, f.b]) { const k = `${t}${f.fmt}`; if (seen.has(k)) continue; seen.add(k);
      for (const p of ST.squadFor(G, t, f.fmt, S)) if (G.players[p.id] === p && p.team) out.set(p.id, { nation: t, f }); }
  }
  return out;
}
// Before an NPL match: players away with their country miss it (marked as resting for this match only).
export function applyCallUps(G, f) {
  if (!G.s.wd || !f) return []; const day = nplDay(G, f); const away = [];
  for (const p of Object.values(G.players)) if (p.callUp) { p.rest = false; delete p.callUp; }
  for (const [id, x] of callUps(G, day)) { const p = G.players[id]; if (p.team !== f.home && p.team !== f.away) continue; if (!p.rest) { p.rest = true; p.callUp = x.nation; away.push(p); } }
  const mine = away.filter((p) => p.team === G.user && hasClub(G));
  if (mine.length) G.news(`${mine.map((p) => p.name).join(', ')} ${mine.length > 1 ? 'are' : 'is'} away with ${nationName(G, mine[0].callUp)} and miss${mine.length > 1 ? '' : 'es'} the match.`, 'intl', { sub: 'Called up', club: true });
  return away;
}

// With no club the NPL runs itself as the clock passes: matches on their dates, the off-season, retention
// and the auction on theirs. The old club is an AI team; news about it is kept out of the user's inbox.
const KEEP = new Set(['league', 'intl', 'world', 'signing']);
async function quiet(G, fn) {
  const M = G.s.manager; const keep = { rep: M.rep, n: (M.career || []).length, sacked: G.s.sacked, offers: G.s.offers, review: G.s.lastReview };
  const ids = new Set(G.s.inbox.map((n) => n.id)); const asst = G.s.settings.assistant; G.s.settings.assistant = true;
  try { await fn(); } finally {
    for (const n of G.pendingDecisions()) G.applyEvent(n, cautiousIndex(n), true);
    G.s.settings.assistant = asst; M.rep = keep.rep; if (M.career) M.career.length = Math.min(M.career.length, keep.n);
    G.s.sacked = keep.sacked; G.s.offers = keep.offers; G.s.lastReview = keep.review; G.s.promises = [];
    G.s.inbox = G.s.inbox.filter((n) => ids.has(n.id) || (KEEP.has(n.kind) && !n.club && !n.choices));
  }
}
function autoAuction(G) {
  const A = G.s.auction; if (A.cur && !A.cur.done) G.simLot(true);
  while (G.lotStart()) G.simLot(true);
  G.finishAuction(); G.fillSquad(G.user, () => Object.values(G.players).filter((p) => !p.team && !p.retired && !p.academy));
  G.s.phase = 'preseason'; G.setObjectives();
}
// Plays the NPL up to `day`. With a club, only other teams' matches before the user's next one are played
// and the phases wait for the user. Returns the number of NPL steps taken.
export async function nplRun(G, day, { yieldEvery = 2 } = {}) {
  let n = 0; const club = hasClub(G); const pause = () => (++n % yieldEvery === 0 ? new Promise((r) => setTimeout(r, 0)) : null);
  for (let guard = 0; guard < 200; guard++) {
    const ph = G.s.phase;
    if (ph === 'league' || ph === 'playoffs') {
      const f = G.nextFixture();
      if (!f) { afterFixture(G); if (G.s.phase === ph && !G.nextFixture()) break; continue; }
      if (nplDay(G, f) > day) break; if (club && (f.home === G.user || f.away === G.user)) break;
      applyCallUps(G, f); if (club) await simFixture(G, f); else await quiet(G, () => simFixture(G, f)); await pause(); continue;
    }
    if (club) break;
    const ev = nplEvent(G); if (!ev || ev.day > day) break;
    if (ph === 'seasonEnd') { await quiet(G, () => startOffseason(G)); continue; }
    if (ph === 'offseason' || ph === 'retention') { await quiet(G, () => { if (ph === 'offseason') G.beginRetention(); G.aiRetention(G.user); G.applyRetention(); G.setupAuction(); }); continue; }
    if (ph === 'auction') { await quiet(G, () => autoAuction(G)); continue; }
    if (ph === 'preseason') { await quiet(G, () => { completeSquad(G); G.aiPreseason(); G.startSeason(); }); continue; }
    break;
  }
  return n;
}

// "Continue": moves the world clock to the next thing that needs the user (or `max` days on when nothing
// does), playing every other match on the way. Returns the event it stopped for.
export async function continueWorld(G, { max = 30, rnd = Math.random } = {}) {
  const wd = ensure(G); tick(G, rnd); const ev = nextEvent(G);
  const target = ev ? Math.max(wd.day, ev.day) : wd.day + max;
  await nplRun(G, target);
  const stop = ST.advance(G, ev && ev.kind === 'npl' && ev.what === 'match' ? target - 1 : target, { rnd });
  if (!stop && ev && ev.kind === 'npl') wd.day = Math.max(wd.day, target);
  tick(G, rnd);
  return nextEvent(G);
}
// The assistant plays the user's national fixture with the fast sim.
export function assistantPlays(G, S, f, rnd = Math.random) {
  ST.playFast(G, S, f, rnd); ST.note(G, `The assistant took charge: ${f.res.text}.`); tick(G, rnd); return f.res;
}
// Today's NPL-free summary for the national manager.
export function nationSummary(G) {
  const j = nationJob(G); if (!j) return null; const out = { j, next: null, last: null, live: [] };
  for (const S of ST.seasons(G)) { if (!S.teams.includes(j.team)) continue;
    for (const f of S.fx) { if (f.a !== j.team && f.b !== j.team) continue; if (f.res) { if (!out.last || f.d > out.last[1].d) out.last = [S, f]; } else if (!out.next || f.d < out.next[1].d) out.next = [S, f]; }
    if (!S.done) out.live.push(S); }
  return out;
}
// A new career: the NPL club job (from Game.create), a national job, or both.
export function startCareer(G, { club = true, nation = null, abroad = null } = {}) {
  const wd = ensure(G); if (!wd) return;
  if (abroad) { const t = Club.teamsAndLevels(G).find((x) => x.id === abroad); if (t) { club = false; wd.jobs = wd.jobs.filter((j) => j.kind !== 'club'); G.s.inbox = G.s.inbox.filter((n) => n.kind === 'league' && !/^The ICC/.test(n.text)); takeJob(G, 'club', abroad, { comp: t.league, quiet: true }); } }
  else if (!club) { wd.jobs = wd.jobs.filter((j) => j.kind !== 'club'); G.s.inbox = G.s.inbox.filter((n) => n.kind === 'league' && !/^The ICC/.test(n.text)); }
  if (nation) takeJob(G, 'nation', nation, { quiet: true });
  if (nation) G.news(`Welcome. You are the new ${nationName(G, nation)} national team manager${club ? `, and head coach of ${G.teams[G.user].name}` : ''}.`, 'world', { sub: 'New job', detail: club ? 'Players you call up miss NPL matches that clash with national fixtures.' : 'The NPL runs without you. Clubs may call if your reputation grows.' });
}

// The clock runs this after every advance, so results and reviews count whoever moves it.
ST.onTick((G) => tick(G));
