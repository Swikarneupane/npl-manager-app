// ===== Club jobs in any league =====
// A club job { kind: 'club', comp: 'IPL', team: 'IPL-CSK', board, rec, obj, objY, fin: [] } names a team in a league module. The NPL
// stays a club job with comp 'NPL' and keeps its own phase machine; every other league runs on the world clock:
// each season the league's rosters renew (recruit.js), the user's league pauses for retention and recruitment.
// s.wd.cxi { team: { fmt: { xi, ord, cap, wk, bowl } } } is the user's XI, order, captain, keeper and bowling preference.
import * as ST from './state.js';
import { leagues, leagueData, teamInfo, registry } from './players.js';
import { autoXI, value } from './squads.js';
import * as RC from './recruit.js';
import { yearOf } from './dates.js';

// League level 1 to 5: the top leagues want more reputation.
export const LEVEL = { IPL: 5, BBL: 4, HUN: 4, PSL: 4, SA20: 4, ILT20: 3, MLC: 3, CPL: 3, BPL: 3, LPL: 2, APL: 2, BLAST: 3, SMAT: 2, VH: 2, RLC: 2, MARSH: 2, CSAT20: 2, SMASH: 2, FORD: 2 };
export const levelOf = (code) => (leagueData(code) && leagueData(code).level) || LEVEL[code] || (leagueData(code) && leagueData(code).kind === 'franchise' ? 3 : 2);
export const REP_BY_LEVEL = { 5: 80, 4: 70, 3: 60, 2: 50, 1: 42 };
export function needRep(G, team) { const t = teamInfo(team); const code = t && t.league; if (!code) return 99; const L = (leagueData(code).teams || []); const ix = L.findIndex((x) => x.id === team); return REP_BY_LEVEL[levelOf(code)] + (t.level ? (t.level - 2) * 3 : 0) + (ix >= 0 && ix < 2 ? 2 : 0); }

export const jobs = (G) => (G.s.wd && G.s.wd.jobs) || [];
export const isAbroad = (j) => !!j && j.kind === 'club' && j.comp && j.comp !== 'NPL';
export const abroadJob = (G) => jobs(G).find(isAbroad) || null;
export const isClubTeam = (G, team) => !!G.s.wd && jobs(G).some((j) => isAbroad(j) && j.team === team);
export const myLeague = (G) => { const j = abroadJob(G); return j ? j.comp : null; };
export const available = () => leagues().filter((m) => (m.teams || []).length);

// ----- the user's selection -----
const asst = (G) => !!(G.s.settings && G.s.settings.assistant);
export function fillXI(fit, xi, tid, fmt) {
  const lim = RC.rulesOf(RC.leagueOf(tid)).overseas.xi; let cur = xi.slice(0, 11);
  const osn = (l) => l.filter((p) => RC.isOS(p, tid)).length;
  while (osn(cur) > lim) { const w = cur.filter((p) => RC.isOS(p, tid)).sort((a, b) => value(a, fmt) - value(b, fmt))[0]; cur = cur.filter((p) => p !== w); }
  if (cur.length < 11) { const rest = fit.filter((p) => !cur.includes(p)); const ok = RC.legalPool(rest, tid, lim - osn(cur)); cur = [...cur, ...autoXI(ok, fmt).xi].slice(0, 11); }
  return cur;
}
export function selection(G, team, fmt) {
  RC.sync(G); const wd = G.s.wd; const squad = RC.roster(G, team); const fit = squad.filter((p) => !p.inj);
  const a = asst(G); const sel = !a && wd.cxi && wd.cxi[team] && wd.cxi[team][fmt];
  const mine = sel ? sel.xi.map((id) => fit.find((p) => p.id === id)).filter(Boolean) : null;
  const xi = fillXI(fit, mine || [], team, fmt); const ordIn = sel && sel.ord ? sel.ord.map((id) => xi.find((p) => p.id === id)).filter(Boolean) : [];
  const auto = autoXI(xi, fmt).order; const order = ordIn.length === xi.length ? ordIn : auto;
  const has = (k) => xi.find((p) => p.id === k);
  const wk = (sel && sel.wk && has(sel.wk)) || xi.filter((p) => p.role === 'WK').sort((x, y) => y.bat - x.bat)[0] || xi[0] || null;
  const cap = (sel && sel.cap && has(sel.cap)) || xi.slice().sort((x, y) => (y.traits ? y.traits.lead : 50) - (x.traits ? x.traits.lead : 50) || value(y, fmt) - value(x, fmt))[0] || null;
  return { squad, xi, xiPicked: mine || xi, order, wk, cap, picked: !!sel, auto: !sel, asst: a };
}
export function setXI(G, team, fmt, patch) {
  const wd = G.s.wd; const cur = selection(G, team, fmt); const s = ((wd.cxi ??= {})[team] ??= {})[fmt] ??= { xi: cur.xi.map((p) => p.id), ord: null, cap: cur.cap && cur.cap.id, wk: cur.wk && cur.wk.id, bowl: [] };
  if (patch.xi) { const e = RC.xiIssues(G, team, patch.xi); if (e.length) return e[0]; s.xi = patch.xi.slice(); s.ord = null; }
  if (patch.ord) { if (patch.ord.length !== 11 || patch.ord.some((id) => !s.xi.includes(id))) return 'The order must be your XI.'; s.ord = patch.ord.slice(); }
  if (patch.cap !== undefined) s.cap = patch.cap; if (patch.wk !== undefined) s.wk = patch.wk; if (patch.bowl) s.bowl = patch.bowl.slice(0, 6);
  return null;
}
// A squad of 15 for any club in a match (the user's side picks its own XI from the whole roster)
export function legalSquad(G, team, fmt, autoSquad) {
  const pool = RC.roster(G, team).filter((p) => !p.inj); const lim = RC.rulesOf(RC.leagueOf(team)).overseas.xi;
  return autoSquad(RC.legalPool(pool, team, lim), fmt);
}

// ----- money -----
export function finances(G, team) {
  const code = RC.leagueOf(team); const R = RC.rulesOf(code); const pay = RC.payroll(G, team);
  if (!R.purse) return { cap: 0, payroll: 0, headroom: 0, revenue: 0, profit: 0 };
  const j = jobs(G).find((x) => x.team === team); const board = j ? j.board : 60; const revenue = Math.round(R.purse * (0.85 + (board - 50) / 300) * 100) / 100;
  return { cap: R.purse, payroll: pay, headroom: Math.round((R.purse - pay) * 100) / 100, revenue, profit: Math.round((revenue - pay) * 100) / 100 };
}
// End of a season: the board's verdict on the books, recorded in j.fin.
export function verdict(G, j, S) {
  const f = finances(G, j.team); if (!f.cap) return; (j.fin ??= []).push({ y: S.y, payroll: f.payroll, revenue: f.revenue, profit: f.profit });
  const d = f.profit >= 0 ? 2 : f.payroll > f.cap * 1.1 ? -6 : -2; j.board = Math.max(0, Math.min(100, j.board + d));
  G.news(`${ST.teamName(G, j.team)} books: wages ${f.payroll}, revenue ${f.revenue}. ${d > 0 ? 'The board is pleased.' : 'The board is unhappy with the spending.'}`, 'world', { sub: 'Finances' });
}

// ----- the season and the cycle -----
export const leagueSeasons = (G, code) => ST.seasons(G).filter((S) => S.teams.length && RC.leagueOf(S.teams[0]) === code);
export function nextSeason(G, code) {
  const day = G.s.wd.day; return leagueSeasons(G, code).filter((S) => !S.done && (S.start ?? 0) + 120 > day).sort((a, b) => a.start - b.start)[0] || null;
}
export const WINDOW = 45;
// The recruitment step the user has to take (kind 'club'), or null
export function clubEvent(G) {
  const j = abroadJob(G); if (!j) return null; const day = G.s.wd.day; const S = nextSeason(G, j.comp); if (!S) return null;
  const rec = RC.recOf(G, j.comp);
  if (rec && rec.sid === S.id) return rec.stage === 'done' ? null : { kind: 'club', what: rec.stage, day, S, comp: j.comp };
  if (S.start != null && S.start - day > WINDOW) return { kind: 'club', what: 'retain', day: S.start - WINDOW, S, comp: j.comp };
  return S.fx.some((f) => f.res) ? null : { kind: 'club', what: 'retain', day, S, comp: j.comp };
}
export const stageLabel = (ev) => ({ retain: 'retention', recruit: 'recruitment' }[ev.what] || ev.what);
// Runs from the world clock: every league renews its rosters when its window opens; the user's league waits for the user
// (the assistant finishes it, and so does the day before the season).
export function tick(G, rnd = Math.random) {
  const wd = G.s.wd; if (!wd) return; RC.sync(G); const day = wd.day; const j = abroadJob(G);
  for (const m of available()) {
    const code = m.code; const S = nextSeason(G, code); if (!S || S.start == null) continue;
    const rec = RC.recOf(G, code); const mine = j && j.comp === code;
    if (rec && rec.sid === S.id) { if (rec.stage !== 'done' && (!mine || asst(G) || day >= S.start - 2)) RC.runRest(G, code, rnd, null); continue; }
    if (day < S.start - WINDOW || S.fx.some((f) => f.res)) continue;
    RC.beginCycle(G, code, S.id, yearOf(S.start), rnd, mine && !asst(G) ? j.team : null);
    if (!(mine && !asst(G))) RC.runRest(G, code, rnd, null);
    if (mine) G.news(`${m.name}: the ${RC.rulesOf(code).recruit === 'auction' ? 'auction' : RC.rulesOf(code).recruit === 'draft' ? 'draft' : 'transfer market'} for ${yearOf(S.start)} is open.`, 'world', { sub: ST.teamName(G, j.team) });
  }
}
// Offers from clubs abroad for a manager of this reputation: weighted towards the nearest level.
export function offers(G, rnd, have) {
  const r = G.s.manager.rep; const mine = abroadJob(G); const cur = jobs(G).find((j) => j.kind === 'club'); const out = [];
  const cands = []; for (const m of available()) for (const t of m.teams) { if (have.has(t.id) || (mine && mine.team === t.id)) continue; const need = needRep(G, t.id); if (r >= need) cands.push([t.id, m.code, 1 / (1 + (r - need) / 10)]); }
  if (!cands.length || (cur && rnd() > 0.25) || rnd() > 0.7) return out;
  let x = cands.reduce((a, c) => a + c[2], 0) * rnd(); for (const c of cands) { x -= c[2]; if (x <= 0) { out.push({ team: c[0], comp: c[1] }); break; } }
  return out;
}
export const teamsAndLevels = (G) => available().flatMap((m) => m.teams.map((t) => ({ id: t.id, name: t.name, league: m.code, leagueName: m.name, need: needRep(G, t.id) })));
export { registry };
