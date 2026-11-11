// ===== World players: the bundled database, hydrated on demand =====
// Static records live in src/data/world (see docs/world/ARCHITECTURE.md). The save keeps only what
// changes, in s.wd.pd[id]: { bat, bowl, form, fit, inj, morale, regs }. Hydrated players are runtime
// objects shaped like the engine's (bat, bowl, type, hand, form, fit, temper, field ...), cached on G.
// A database player who is already in the NPL game (same name and nationality) resolves to that NPL
// player, so club and country share one form, fitness and injury record.
import { NATION_CODES, loadNation } from '../data/world/index.js';
import { NATION } from '../game/world-data.js';
import { autoSquad, autoXI } from './squads.js';

let DB = null; // id -> static record (array form)
let DBN = 0; // records in DB (the registry's cache key)
const NAT = {}; // nation code -> module default export
export const dbReady = () => !!DB;
export async function loadDB(codes = NATION_CODES) {
  const mods = await Promise.all(codes.map((c) => loadNation(c).then((m) => [c, m.default || m]).catch((e) => { console.warn('nation data', c, e); return [c, null]; })));
  DB = DB || {}; for (const [c, m] of mods) { if (!m) continue; NAT[c] = m; for (const r of m.players) DB[r[0]] = r; }
  DBN = Object.keys(DB).length; CAL = null; return DB;
}
// For tests and Node: load synchronously from already-imported modules.
export function setDB(mods) { DB = {}; for (const m of mods) { NAT[m.code] = m; for (const r of m.players) DB[r[0]] = r; } DBN = Object.keys(DB).length; CAL = null; }
export const nationData = (code) => NAT[code] || null;
export const record = (id) => (DB && DB[id]) || null;

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }
const nameKey = (name, nat) => `${nat}|${name.toLowerCase().replace(/[^a-z]/g, '')}`;

// Static record -> engine-shaped player. Fields every screen and the engine read are always present.
export function hydrate(rec, year, delta) {
  const [id, name, nat, born, role, bat, bowl, type, hand, fm, regs] = rec; const h = hash(id); const d = delta || {};
  return {
    id, name, nat, age: year - born, born, role, bat: d.bat ?? bat, bowl: d.bowl ?? bowl, type: type || '', hand: hand || 'R', fm: fm || {},
    form: d.form ?? 0, fit: d.fit ?? 100, morale: d.morale ?? 70, inj: d.inj ?? 0, temper: 45 + (h % 45), vsSpin: (h >> 5) % 13 - 6,
    field: 45 + ((h >> 9) % 40), pot: Math.max(bat, bowl), traits: { big: 40 + ((h >> 3) % 40), pro: 50, amb: 50, loyal: 50, lead: 30 + ((h >> 7) % 50), flair: 50 },
    regs: d.regs || regs || [], stats: {}, real: true, world: true, team: null,
  };
}

// The runtime registry on G: every world player by id, NPL players aliased by name and nationality.
export function registry(G) {
  if (G._wr && G._wr.y === G.year && G._wr.n === DBN) return G._wr;
  const R = { y: G.year, n: DBN, by: {}, alias: {}, nat: {} };
  const npl = {}; for (const p of Object.values(G.players)) if (!p.retired) npl[nameKey(p.name, p.nat)] = p;
  const pd = (G.s.wd && G.s.wd.pd) || {};
  for (const id in DB || {}) { const rec = DB[id]; const hit = npl[nameKey(rec[1], rec[2])];
    if (hit) { hit.wid = id; R.alias[id] = hit.id; R.by[id] = hit; } else R.by[id] = hydrate(rec, G.year, pd[id]);
    (R.nat[rec[2]] ??= []).push(id); }
  // NPL players with no database record (generated Nepalis, fictional overseas) are still eligible for their nation
  for (const p of Object.values(G.players)) { if (p.retired || p.wid) continue; R.by[p.id] = p; (R.nat[p.nat] ??= []).push(p.id); }
  calibrate(R, pd);
  G._wr = R; return R;
}

// ----- calibration between the NPL scale and the world database -----
// The NPL data rates Nepal's players on the league's own scale; the database was rated nation by
// nation. One offset per nation brings its best XI to where the nation's strength (world-data.js)
// puts it relative to Nepal, whose NPL players are the reference and are never changed. Ratings stay
// the game's estimates; the data files are untouched. Offsets are computed once per database load.
let CAL = null;
// Team strength as the fast sim sees it: the top six batters and the five best bowlers.
const xiAvg = (ps) => { if (ps.length < 11) return null; const { xi } = autoXI(autoSquad(ps, 'T20'), 'T20');
  const top = (k, n) => xi.map((p) => p[k]).sort((a, b) => b - a).slice(0, n).reduce((a, x) => a + x, 0) / n; return (top('bat', 6) + top('bowl', 5)) / 2; };
function calibrate(R, pd) {
  const pool = (c) => (R.nat[c] || []).map((id) => R.by[id]).filter((p) => p && !p.retired);
  if (!CAL) {
    CAL = {}; const ref = xiAvg(pool('NEP')); const refS = NATION.NEP ? NATION.NEP.t20 : 74;
    for (const c in R.nat) { if (c === 'NEP' || !NATION[c] || ref == null) continue; const ps = pool(c); if (!ps.some((p) => p.world)) continue;
      const avg = xiAvg(ps); if (avg == null) continue; CAL[c] = Math.max(-15, Math.min(15, Math.round(ref + (NATION[c].t20 - refS) - avg))); }
  }
  for (const c in CAL) { const off = CAL[c]; if (!off) continue;
    for (const id of R.nat[c] || []) { const p = R.by[id]; if (!p || !p.world) continue; const d = pd[id] || {}; p.cal = off;
      if (d.bat == null && p.bat > 25) p.bat = Math.max(10, Math.min(98, p.bat + off));
      if (d.bowl == null && p.bowl > 25) p.bowl = Math.max(10, Math.min(98, p.bowl + off)); } }
}
export const calibration = () => CAL || {};
// The rating a database player has with no changes yet: the record plus his nation's offset.
const baseOf = (rec, i, cal) => (rec[i] > 25 && cal ? Math.max(10, Math.min(98, rec[i] + cal)) : rec[i]);
export const wp = (G, id) => G.players[id] || registry(G).by[id] || null;
export const poolOf = (G, nat) => (registry(G).nat[nat] || []).map((id) => registry(G).by[id]).filter((p) => p && !p.retired);

// Write the changing fields of hydrated database players back into the save (call before saving).
export function flush(G) {
  if (!G._wr || !G.s.wd) return; const pd = G.s.wd.pd;
  for (const id in G._wr.by) { const p = G._wr.by[id]; if (!p.world) continue; const rec = DB[id]; if (!rec) continue;
    const d = {}; if (p.bat !== baseOf(rec, 5, p.cal)) d.bat = p.bat; if (p.bowl !== baseOf(rec, 6, p.cal)) d.bowl = p.bowl; if (p.form) d.form = Math.round(p.form * 10) / 10;
    if (p.fit < 100) d.fit = Math.round(p.fit); if (p.inj) d.inj = p.inj; if (p.morale !== 70) d.morale = Math.round(p.morale);
    if (Object.keys(d).length) pd[id] = d; else delete pd[id]; }
}
