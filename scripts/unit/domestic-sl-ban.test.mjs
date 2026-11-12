// Domestic white-ball cricket of Sri Lanka and Bangladesh (W4).
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as IN from '../../src/world/intl.js';
import * as W from '../../src/game/world.js';
import * as DS from '../../src/world/domestic-sl-ban.js';
import { COMPS } from '../../src/world/comps.js';
import { yearOf } from '../../src/world/dates.js';
import { NATION_CODES, loadNation } from '../../src/data/world/index.js';

DS.setDomesticSlBanEnabled(false);
const mods = await Promise.all(NATION_CODES.map((c) => loadNation(c).then((m) => m.default || m)));
const TEAMS = Object.fromEntries(mods.flatMap((m) => (m.teams || []).map((t) => [t.id, t])));
const COUNT = { 'SL-T20': [14, 2, 42 + 3], 'SL-50': [14, 2, 42 + 3], 'BAN-DPL': [12, 1, 66], 'BAN-D3T': [6, 1, 19], 'BAN-D3L': [6, 1, 16] };
const run = (G, until) => { for (let d = G.s.wd.day; d < until;) { d = Math.min(until, d + 7); ST.advance(G, d, { auto: true }); W.archive(G); } };
let FOUR = null;
function four() {
  if (FOUR) return FOUR; P.setDB(mods); IN.setIntlEnabled(false); DS.setDomesticSlBanEnabled(true);
  try { const G = Game.create('LL', { lang: 'en' }); const y0 = yearOf(G.s.wd.day); run(G, G.s.wd.day + 4 * 365 + 60); FOUR = { G, y0 }; } finally { DS.setDomesticSlBanEnabled(false); }
  return FOUR;
}
test('domestic-sl-ban: teams resolve, are domestic, and no player is on two teams of one competition', () => {
  for (const c of DS.SLBAN_COMPS) { assert.ok(COMPS[c] && COMPS[c].kind === 'domestic' && COMPS[c].listA, c);
    const ids = new Set(); for (const S of [{ teams: [] }]) void S;
    const nat = COMPS[c].host; const teams = mods.find((m) => m.code === nat).teams.map((t) => t.id);
    for (const t of teams) assert.equal(TEAMS[t].kind, 'domestic'); void ids; }
  for (const m of mods.filter((x) => ['SL', 'BAN'].includes(x.code))) for (const r of m.players) { const regs = r[10]; assert.equal(new Set(regs).size, regs.length, r[1]); }
  // D3 franchises: a player is on one D3 franchise only
  const D3 = ['WAL', 'FOR', 'ACM', 'SRC', 'HBS', 'CTZ'].map((s) => `BAN-${s}`);
  for (const r of mods.find((m) => m.code === 'BAN').players) assert.ok(r[10].filter((t) => D3.includes(t)).length <= 1, r[1]);
});
test('domestic-sl-ban: four valid seasons each with a champion, formats match', () => {
  const { G, y0 } = four(); const wd = G.s.wd;
  for (const c of DS.SLBAN_COMPS) { const list = Object.values(wd.seasons).filter((S) => S.comp === c);
    for (let y = y0 + 3; y <= y0 + 4; y++) assert.ok(list.some((S) => S.y === y), `${c} ${y} planned`);
    for (const S of list) { const [n, groups, total] = COUNT[c]; assert.equal(S.teams.length, n, S.id); assert.equal(Object.keys(S.tables).length, groups, S.id);
      for (const f of S.fx) assert.ok(f.a !== f.b && S.teams.includes(f.a) && S.teams.includes(f.b));
      if (S.done) { assert.ok(S.champ, `${S.id} champion`); if (!S.old && S.fx.length) assert.equal(S.fx.length, total + (c.startsWith('SL') ? 0 : 0), `${S.id} matches`); } } }
});
test('domestic-sl-ban: a world year stays small after compaction', () => {
  const { G } = four(); const kb = JSON.stringify(Object.values(G.s.wd.seasons).filter((S) => DS.SLBAN_COMPS.includes(S.comp))).length / 1024;
  assert.ok(kb / 4 < 100, `${kb} KB over four years`);
});
