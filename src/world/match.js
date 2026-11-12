// ===== Playing a world fixture with the ball-by-ball engine =====
// The engine and the live screens were written for the NPL game object. worldGame(G, S, f) makes a stand-in
// that looks like it for one match (like G.intlMatch does for Nepal's winter): the two national sides as
// teams, their squads as players, the user's nation as G.user, and the user's own XI, captain and keeper.
// Everything not overridden (settings, difficulty, team strength) comes from the real game.
// recordWorld turns the engine's card into the compact world card (with dismissals, extras and the fall of
// wickets kept for the scorecard) and records it with addStats and record, exactly as the fast sim does.
import * as Rec from './record.js';
import { Match } from '../game/engine.js';
import * as ST from './state.js';
import { record as recordFx } from './comp.js';
import { autoXI } from './squads.js';
import { selection, userNation, tick, keyOf } from './career.js';
import { isMultiDay } from './fastfc.js';
import { registry } from './players.js';

const ODI_PAR = 270; // the win-probability model's par, scaled from 20 overs: give it an ODI par
export function worldGame(G, S, f) {
  const me = [f.a, f.b].find((t) => ST.isUserTeam(G, t)) || userNation(G); const fmt = f.fmt || 'ODI'; const P = {}; const teams = {};
  for (const t of [f.a, f.b]) {
    const sel = ST.isUserTeam(G, t) ? selection(G, t, fmt) : null;
    const squad = sel ? sel.squad : ST.squadFor(G, t, fmt, S); for (const p of squad) P[p.id] = p;
    const lu = sel ? { xi: sel.xi, order: sel.order, wk: sel.wk, cap: sel.cap } : (() => { const a = autoXI(squad, fmt); const wk = a.xi.filter((p) => p.role === 'WK').sort((x, y) => y.bat - x.bat)[0] || a.xi[0]; const cap = a.xi.slice().sort((x, y) => (y.traits ? y.traits.lead : 0) - (x.traits ? x.traits.lead : 0))[0]; return { ...a, wk, cap }; })();
    for (const p of lu.xi) P[p.id] = p;
    teams[t] = { id: t, name: ST.teamName(G, t), squad: squad.map((p) => p.id), captainId: lu.cap ? lu.cap.id : null, keeperId: lu.wk ? lu.wk.id : null, xi: lu.xi.map((p) => p.id), order: lu.order.map((p) => p.id), lu };
  }
  // a match being resumed keeps the players it started with, even one injured during it (the squad
  // picker would now leave him out)
  const L = G.s.liveMatch; if (L && L.w === f.id && L.data && L.data.lineups) { const by = registry(G).by;
    for (const t in L.data.lineups) for (const id of [...L.data.lineups[t].xi, ...L.data.lineups[t].order]) if (!P[id] && by[id]) P[id] = by[id]; }
  const s = Object.create(G.s, {
    par: { value: fmt === 'ODI' ? { [G.year]: { sum: (ODI_PAR / 2.5) * 3, n: 3 } } : G.s.par, writable: true },
    log: { value: [], writable: true }, mu: { value: null, writable: true }, promises: { value: [], writable: true },
    toJSON: { value: () => G.s }, // never write the stand-in into a save
  });
  const PG = Object.create(G, {
    real: { value: G }, world: { value: { sid: S.id, fid: f.id, fmt } }, s: { value: s },
    user: { value: me }, teams: { value: teams }, players: { value: P }, year: { value: G.year },
    P: { value: (id) => P[id] || G.players[id] || null },
    lineup: { value: (tid) => { const L = teams[tid].lu; return { xi: L.xi.map((p) => p.id), order: L.order.map((p) => p.id), keeper: (L.wk || L.xi[0]).id, captain: (L.cap || L.xi[0]).id }; } },
    available: { value: (p) => !!p && !p.inj }, staffLevel: { value: () => 0 }, injuryLength: { value: (t, b) => b },
    news: { value: () => {} }, recMu: { value: () => {} }, userNext: { value: () => null }, decisionsDue: { value: () => [] }, pendingDecisions: { value: () => [] },
    hook: { value: () => {} },
  });
  return PG;
}
// Tests and first-class matches (fmt in fastfc.js FC) play the multi-day engine, weather and all.
export function newWorldMatch(PG, f) {
  const fmt = PG.world.fmt;
  if (isMultiDay(fmt)) return new Match(PG, f.a, f.b, { lang: PG.s.lang, fmt, world: 1 });
  return new Match(PG, f.a, f.b, { lang: PG.s.lang, overs: fmt === 'ODI' ? 50 : 20, noRain: true, night: fmt === 'T20' && (f.d % 3 === 0), dew: false, world: 1 });
}
export const findFixture = (G, sid, fid) => { const S = G.s.wd.seasons[sid]; const f = S && S.fx.find((x) => x.id === fid); return f ? [S, f] : null; };
export function savedWorld(G) { const L = G.s.liveMatch; if (!L || !L.w) return null; const x = findFixture(G, L.sid, L.w); return x && !x[1].res ? { ...L, S: x[0], f: x[1] } : null; }

// The engine's innings as the compact world card. Batting rows keep the fast-sim shape
// [id, r, b, 4s, 6s, 'out' | 'not out'] with the dismissal text added; bowling rows add wides and no-balls.
export function engineCard(m) {
  return m.inns.map((inn) => ({
    t: inn.bat, r: inn.runs, w: inn.wkts, b: inn.balls, ex: inn.extras, fow: inn.fow.slice(), eng: 1, ...(inn.dec ? { d: 1 } : {}),
    bat: inn.order.filter((id) => { const s = inn.bs[id]; return s && (s.batted || s.in || s.b > 0 || s.out); }).map((id) => { const s = inn.bs[id]; return [id, s.r, s.b, s.f, s.s, s.out ? 'out' : 'not out', s.out ? s.how : 'not out']; }),
    bowl: Object.keys(inn.bw).map((id) => { const s = inn.bw[id]; return [id, s.balls, s.r, s.w, (s.wd || 0) + (s.nb || 0)]; }),
  }));
}
// Records a finished engine match into the world: the fixture's result and card, the table, the stage, stats.
export function recordWorld(G, S, f, m, inj0) {
  const inns = engineCard(m); const r = m.result || {}; const PG = m.G;
  const winner = r.winner || null; const loser = winner ? (winner === f.a ? f.b : f.a) : null;
  const mm = /won by (.+)$/.exec(r.text || ''); const card = { inns, winner, loser, tie: !!r.tie, nr: !!r.nr, draw: !!r.draw, margin: r.margin != null && r.margin !== '' ? r.margin : mm ? mm[1] : '' };
  const res = ST.resultOf(G, f, card); res.text = r.text || res.text; if (r.mom) res.pom = r.mom; res.live = 1;
  const xi = (t) => m.lineups[t].xi.map((id) => PG.P(id)).filter(Boolean);
  f.card = inns; ST.addStats(G, S, card, xi(f.a), xi(f.b)); Rec.addWorld(G, f.fmt, card, xi(f.a), xi(f.b)); recordFx(S, ST.defOf(S), f, res);
  for (const p of [...xi(f.a), ...xi(f.b)]) p.fit = Math.max(40, (p.fit ?? 100) - 3);
  // form follows the innings and the spell, as in the NPL; injuries in a national match do not carry over
  for (const inn of m.inns) {
    for (const id in inn.bs) { const s = inn.bs[id]; const p = PG.P(id); if (p && (s.batted || s.in || s.b > 0)) p.form = Math.max(-10, Math.min(10, (p.form || 0) * 0.8 + (s.r - 20) / 12)); }
    for (const id in inn.bw) { const s = inn.bw[id]; const p = PG.P(id); if (p && s.balls) p.form = Math.max(-10, Math.min(10, (p.form || 0) * 0.85 + s.w * 1.2 - (s.r / (s.balls / 6) - (isMultiDay(f.fmt) ? 3.3 : f.fmt === 'ODI' ? 5 : 8)) * 0.4)); }
  }
  if (inj0) for (const [id, v] of inj0) { const p = PG.P(id); if (p) p.inj = v; }
  if (G.s.liveMatch && G.s.liveMatch.w === f.id) delete G.s.liveMatch;
  ST.note(G, `${res.text}.`); tick(G);
  return res;
}
export const injuries = (PG) => Object.values(PG.players).map((p) => [p.id, p.inj || 0]);
// Quick sim with the engine (no pauses): used by tests; the screens use the fast sim for quick results.
export async function playWorldEngine(G, S, f, hooks) {
  const PG = worldGame(G, S, f); const inj0 = injuries(PG); const m = newWorldMatch(PG, f);
  await m.run(hooks || {}); return { m, res: recordWorld(G, S, f, m, inj0) };
}
export { keyOf };
