// ===== The world: clock, seasons, results, stats, jobs =====
// s.wd = { v, day, seasons: { id: season }, years: { y: true }, pd: {}, st: { seasonId: { pid: stats } },
//          jobs: [{ kind: 'club' | 'nation', team, comp, since }], squads: { team: { fmt: [pid] } }, news: [] }
// The NPL keeps its own phase machine (game.js); everything else runs here, by date.
import { newSeason, record as recordFx, standings } from './comp.js';
import { fastMatch } from './fastsim.js';
import { COMPS, yearPlan } from './comps.js';
import { registry, poolOf, flush } from './players.js';
import { autoSquad, autoXI } from './squads.js';
import { dayOfDate, yearOf } from './dates.js';
import * as Career from './career.js';

export const W = (G) => G.s.wd;
export function migrate(G) {
  const s = G.s; if (!s.teams || !s.user) return;
  // an old save starts the clock where its NPL phase sits: the season runs Oct-Dec; after the final the
  // NPL year has already moved on, so the off-season starts in January and the auction comes in July
  const y = s.year || 2026; const start = { offseason: dayOfDate(y, 0, 5), retention: dayOfDate(y, 5, 20), auction: dayOfDate(y, 6, 20), preseason: dayOfDate(y, 8, 15) }[s.phase] ?? dayOfDate(y, 9, 1);
  s.wd ??= { v: 1, day: start, seasons: {}, years: {}, pd: {}, st: {}, jobs: null, squads: {}, news: [] };
  // every career starts with the NPL club job; national jobs come by choice or by offer
  s.wd.jobs ??= [{ kind: 'club', comp: 'NPL', team: s.user, since: s.year }];
}

// ----- teams in the world -----
// A side for a fixture: national teams pick from their nationality; clubs come later (W3).
export function sideFor(G, team, fmt, S) {
  // the user's national side plays the XI they picked (career.selection respects the assistant setting)
  if (isUserTeam(G, team)) { const sel = Career.selection(G, team, fmt); if (sel.xi.length >= 11) return { id: team, xi: sel.xi, order: sel.order }; }
  const sq = squadFor(G, team, fmt, S); const { xi, order } = autoXI(sq, fmt);
  return { id: team, xi, order };
}
export function squadFor(G, team, fmt, S) {
  const wd = W(G); const mine = isUserTeam(G, team) && wd.squads[team] && wd.squads[team][fmt];
  const pool = poolOf(G, team).filter((p) => !p.inj);
  if (mine) { const ps = mine.map((id) => registry(G).by[id]).filter((p) => p && !p.inj); if (ps.length >= 11) return ps; }
  return autoSquad(pool, fmt);
}
export const isUserTeam = (G, team) => (W(G).jobs || []).some((j) => j.team === team && j.kind === 'nation');
export const userTeams = (G) => (W(G).jobs || []).map((j) => j.team);

// ----- seasons for a year -----
export function ensureYear(G, y) {
  const wd = W(G); if (wd.years[y]) return; wd.years[y] = true;
  for (const p of yearPlan(G, y)) { const def = COMPS[p.comp]; if (!def) continue; const S = newSeason(def, y, p.teams, p.start, p.end); if (p.id) S.id = p.id; if (p.name) S.name = p.name; wd.seasons[S.id] = S; }
}
export const seasons = (G) => Object.values(W(G).seasons);
export const defOf = (S) => COMPS[S.comp];

// ----- results and stats -----
// st[seasonId][pid] = [m, inn, no, r, b, hs, 50s, 100s, balls, rc, w, bestW, bestR, 4s, 6s]
const blank = () => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 999, 0, 0];
export function addStats(G, S, card, xiA, xiB) {
  const T = (W(G).st[S.id] ??= {}); const seen = new Set([...xiA, ...xiB].map((p) => p.id));
  for (const id of seen) (T[id] ??= blank())[0]++;
  for (const inn of card.inns) {
    for (const [id, r, b, f4, s6, how] of inn.bat) { const x = (T[id] ??= blank()); x[1]++; if (how !== 'out') x[2]++; x[3] += r; x[4] += b; x[5] = Math.max(x[5], r); if (r >= 100) x[7]++; else if (r >= 50) x[6]++; x[13] += f4; x[14] += s6; }
    for (const [id, balls, r, w] of inn.bowl) { const x = (T[id] ??= blank()); x[8] += balls; x[9] += r; x[10] += w; if (w > x[11] || (w === x[11] && r < x[12])) { x[11] = w; x[12] = r; } }
  }
}
// Compact result for a fixture from a fast-sim or engine card.
export function resultOf(G, f, card) {
  const nm = (t) => teamName(G, t);
  const sc = card.inns.map((i) => [i.t, i.r, i.w, i.b]);
  const text = card.nr ? 'No result' : `${nm(card.winner)} won by ${card.margin}`;
  let pom = null, best = -1; for (const inn of card.inns) { for (const [id, r] of inn.bat) if (r > best) { best = r; pom = id; } for (const [id, , rc, w] of inn.bowl) { const v = w * 22 - rc / 4; if (v > best) { best = v; pom = id; } } }
  return { w: card.winner, l: card.loser, tie: !!card.tie, nr: !!card.nr, text, sc, pom, top: topOf(card) };
}
const topOf = (card) => card.inns.map((i) => { const b = i.bat.slice().sort((x, y) => y[1] - x[1])[0]; const w = i.bowl.slice().sort((x, y) => y[3] - x[3] || x[2] - y[2])[0]; return [b ? [b[0], b[1], b[2]] : null, w ? [w[0], w[3], w[2]] : null]; });

export function playFast(G, S, f, rnd = Math.random) {
  const a = sideFor(G, f.a, f.fmt, S), b = sideFor(G, f.b, f.fmt, S);
  const card = fastMatch(a, b, f.fmt, rnd); f.card = compactCard(card);
  addStats(G, S, card, a.xi, b.xi); recordFx(S, defOf(S), f, resultOf(G, f, card), rnd);
  for (const p of [...a.xi, ...b.xi]) p.fit = Math.max(40, (p.fit ?? 100) - 3);
  return card;
}
const compactCard = (c) => c.inns.map((i) => ({ t: i.t, r: i.r, w: i.w, b: i.b, bat: i.bat, bowl: i.bowl }));

// ----- the clock -----
// Fixtures due on or before `day`, in date order. User fixtures stop the clock unless `auto`.
export function due(G, day) { const out = []; for (const S of seasons(G)) if (!S.done) for (const f of S.fx) if (!f.res && f.d <= day) out.push([S, f]); return out.sort((x, y) => x[1].d - y[1].d); }
export function nextUserFixture(G) {
  const mine = new Set(userTeams(G).filter((t) => isUserTeam(G, t))); let best = null;
  for (const S of seasons(G)) if (!S.done) for (const f of S.fx) if (!f.res && (mine.has(f.a) || mine.has(f.b)) && (!best || f.d < best[1].d)) best = [S, f];
  return best;
}
// Move the world to `day`: every other match is fast-simmed. Returns the user fixture that stopped
// the clock, or null. With auto, the assistant plays the user's fixtures too.
export function advance(G, day, { auto = false, rnd = Math.random } = {}) {
  // next year's programme is made in the last 90 days of this one, not a year ahead (it keeps saves small)
  const wd = W(G); for (let y = yearOf(wd.day); y <= yearOf(day + 90); y++) ensureYear(G, y);
  for (let guard = 0; guard < 20000; guard++) {
    const list = due(G, day); if (!list.length) break; const [S, f] = list[0];
    if (!auto && (isUserTeam(G, f.a) || isUserTeam(G, f.b))) { wd.day = Math.max(wd.day, f.d); return [S, f]; }
    wd.day = Math.max(wd.day, f.d); recover(G); playFast(G, S, f, rnd);
    if (S.done) runTicks(G); // a finished event can decide who plays the next one
    if (isUserTeam(G, f.a) || isUserTeam(G, f.b)) note(G, `The assistant took charge: ${f.res ? f.res.text : ''}.`);
  }
  wd.day = Math.max(wd.day, day); runTicks(G); recover(G); return null;
}
// Modules that open events from earlier results (the international programme) register here.
// (a hoisted function holds the list: modules in an import cycle may register before this file finishes loading)
function ticks() { return ticks.list || (ticks.list = []); }
export function onTick(fn) { if (!ticks().includes(fn)) ticks().push(fn); }
function runTicks(G) { for (const fn of ticks()) { try { fn(G); } catch (e) { console.error('world tick', e); } } }
// Fitness comes back between matches.
// Every player, club and country alike, gets back about 2.5 fitness a day without a match.
function recover(G) { const wd = W(G); const days = Math.max(0, wd.day - (wd.recDay ?? wd.day)); wd.recDay = wd.day; if (!days) return;
  // during the NPL season its own rules (physio, rest, training) look after NPL players' fitness
  const npl = G.s.phase === 'league' || G.s.phase === 'playoffs';
  const R = registry(G); const seen = new Set(); for (const id in R.by) { const p = R.by[id]; if (!p || seen.has(p)) continue; seen.add(p);
    if (npl && G.players[p.id] === p) continue; if (p.fit < 100) p.fit = Math.min(100, p.fit + 2.5 * days); } }
export function note(G, text) { const n = W(G).news; n.unshift({ day: W(G).day, text }); if (n.length > 60) n.length = 60; }

// ----- names -----
import { NATIONS_DB } from '../data/world/index.js';
const NAT_NAME = Object.fromEntries(NATIONS_DB.map((n) => [n[0], n[1]]));
export const teamName = (G, t) => (G.teams[t] ? G.teams[t].name : NAT_NAME[t] || t);
export const tableOf = (S, grp) => standings(S.tables[grp || Object.keys(S.tables)[0]]);
export { flush };
