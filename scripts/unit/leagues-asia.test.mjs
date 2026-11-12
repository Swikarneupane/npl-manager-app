// Franchise leagues of the rest of Asia and the Gulf (W3): PSL, BPL, LPL, ILT20, APL.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as IN from '../../src/world/intl.js';
import * as W from '../../src/game/world.js';
import * as LA from '../../src/world/leagues-asia.js';
import { COMPS } from '../../src/world/comps.js';
import { yearOf } from '../../src/world/dates.js';
import { NATION_CODES, loadNation } from '../../src/data/world/index.js';
import { loadLeague, LEAGUE_CODES } from '../../src/data/world/leagues.js';

LA.setLeaguesAsiaEnabled(false);
const mods = await Promise.all(NATION_CODES.map((c) => loadNation(c).then((m) => m.default || m)));
const allL = await Promise.all(LEAGUE_CODES.map((c) => loadLeague(c).then((m) => m.default)));
const lgs = allL.filter((m) => LA.LEAGUE_COMPS.includes(m.code));
const run = (G, until) => { for (let d = G.s.wd.day; d < until;) { d = Math.min(until, d + 7); ST.advance(G, d, { auto: true }); W.archive(G); } };
const COUNT = { PSL: [8, 44], BPL: [6, 34], LPL: [5, 24], ILT20: [6, 34], APL: [5, 24] };
let FOUR = null; let ms = 0; let kb = 0;
function four() {
  if (FOUR) return FOUR; P.setDB(mods, allL); IN.setIntlEnabled(false); LA.setLeaguesAsiaEnabled(true);
  try { const G = Game.create('LL', { lang: 'en' }); const y0 = yearOf(G.s.wd.day);
    const t0 = Date.now(); run(G, G.s.wd.day + 365); ms = Date.now() - t0;
    run(G, G.s.wd.day + 3 * 365 + 60); FOUR = { G, y0 }; } finally { LA.setLeaguesAsiaEnabled(false); }
  return FOUR;
}
const yearEnd = (y) => Date.UTC(y, 6, 1) / 864e5 - Date.UTC(2026, 0, 1) / 864e5;
const seasonsOf = (G, c) => Object.values(G.s.wd.seasons).filter((S) => S.comp === c);

test('leagues-asia: team ids match the modules and the real franchise counts', () => {
  for (const m of lgs) { assert.equal(m.teams.length, COUNT[m.code][0], m.code); assert.deepEqual(m.teams.map((t) => t.id).sort(), LA.LEAGUE_PLAN[m.code].teams.slice().sort(), `${m.code} plan teams`); assert.ok(m.rules.recruit && m.sources.length); }
});
test('leagues-asia: every squad key resolves, no duplicate players in a league, overseas limits hold', () => {
  P.setDB(mods, allL); const ids = new Set(mods.flatMap((m) => m.players.map((r) => r[0]))); for (const m of allL) for (const r of m.players) ids.add(r[0]);
  const nat = {}; for (const m of mods) for (const r of m.players) nat[r[0]] = r[2]; for (const m of allL) for (const r of m.players) nat[r[0]] = r[2];
  for (const m of lgs) { const seen = new Set();
    for (const [t, sq] of Object.entries(m.squads)) { assert.ok(m.teams.some((x) => x.id === t)); let os = 0;
      for (const k of sq) { assert.ok(ids.has(k), `${t}: ${k} resolves`); assert.ok(!seen.has(k), `${m.code}: ${k} twice`); seen.add(k); if (nat[k] !== m.host) os++; }
      assert.ok(sq.length <= (m.rules.max || 99), `${t} size`); if (m.rules.overseas.max != null && m.host !== 'UAE') assert.ok(os <= m.rules.overseas.max, `${t} overseas ${os}`); } }
  const mine = lgs.flatMap((m) => m.players).map((r) => r[0]); assert.equal(new Set(mine).size, mine.length, 'ids unique among mine'); for (const id of mine) assert.ok(!mods.some((m) => m.players.some((r) => r[0] === id)), `${id} not in a nation file`);
});
test('leagues-asia: each league plans a valid season every year for four years, with a champion', () => {
  const { G, y0 } = four();
  for (const c of LA.LEAGUE_COMPS) { assert.ok(COMPS[c].kind === 'franchise' && COMPS[c].listA); const list = seasonsOf(G, c);
    for (let y = y0 + 1; y <= y0 + 4; y++) assert.ok(list.some((S) => S.y === y) || yearEnd(y) < G.s.wd.day - 1095, `${c} ${y}`); // older seasons are archived and dropped after three years
    for (const S of list) { assert.equal(S.teams.length, COUNT[c][0]);
      if (S.end < G.s.wd.day - 60) continue;
      if (S.end < G.s.wd.day - 7) { assert.ok(S.done && S.champ && S.runner && S.champ !== S.runner, `${S.id} champion`); if (!S.old) assert.equal(S.fx.length, COUNT[c][1], `${S.id} matches`); assert.ok(S.fx.every((f) => f.res)); } } }
});
test('leagues-asia: a world year of these leagues is fast and small', () => {
  const { G } = four(); assert.ok(ms < 8000, `${ms} ms for a whole world year`);
  // after compaction (45 days past the end): a year of all five leagues
  const by = {}; for (const S of Object.values(G.s.wd.seasons)) if (S.old && LA.LEAGUE_COMPS.includes(S.comp)) by[S.y] = (by[S.y] || 0) + JSON.stringify(S).length / 1024;
  assert.ok(Object.keys(by).length >= 1); for (const [y, k] of Object.entries(by)) assert.ok(k < 150, `${y}: ${k.toFixed(1)} KB`);
});
