// Oceania and Africa leagues (W3): BBL, Marsh One-Day Cup, SA20, CSA Pro20 Cup, Super Smash, Ford Trophy.
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as IN from '../../src/world/intl.js';
import * as W from '../../src/game/world.js';
import { COMPS } from '../../src/world/comps.js';
import { dayOfDate } from '../../src/world/dates.js';
import { LEAGUES_SOUTH } from '../../src/world/leagues-south.js';
import BBL from '../../src/data/world/leagues/BBL.js';
import SA20 from '../../src/data/world/leagues/SA20.js';
import MARSH from '../../src/data/world/leagues/MARSH.js';
import CSAT20 from '../../src/data/world/leagues/CSAT20.js';
import SMASH from '../../src/data/world/leagues/SMASH.js';
import FORD from '../../src/data/world/leagues/FORD.js';

IN.setIntlEnabled(false);
const MODS = { BBL, SA20, MARSH, CSAT20, SMASH, FORD };
// [teams, league matches per team, knockout fixtures]
const SIZE = { BBL: [8, 10, 4], SA20: [6, 10, 4], MARSH: [6, 7, 1], CSAT20: [16, null, 3 + 16], SMASH: [6, 10, 2], FORD: [6, 10, 2] };
let WORLD = null;
async function world() {
  if (WORLD) return WORLD; await P.loadDB(); const G = Game.create('LL', { lang: 'en' }); ST.migrate(G);
  const t0 = Date.now(); for (let d = G.s.wd.day; d < dayOfDate(2031, 0, 1);) { d = Math.min(dayOfDate(2031, 0, 1), d + 7); ST.advance(G, d, { auto: true }); }
  G.__ms = Date.now() - t0; return (WORLD = G);
}
const seasonsOf = (G, c) => Object.values(G.s.wd.seasons).filter((S) => S.comp === c);

test('leagues-south: every league plans a valid season for 2027 to 2030 with a champion', async () => {
  const G = await world();
  for (let y = 2027; y <= 2030; y++) for (const c of LEAGUES_SOUTH) {
    const S = G.s.wd.seasons[`${c}-${y}`]; assert.ok(S, `${c}-${y} exists`);
    if (S.end < G.s.wd.day - 5) assert.ok(S.done && S.champ && S.runner && S.champ !== S.runner, `${S.id} has a champion and a runner-up`);
    assert.ok(S.fx.every((f) => (f.res || S.end >= G.s.wd.day - 5) && f.a !== f.b && S.teams.includes(f.a) && S.teams.includes(f.b)), `${S.id}: fixtures played between entrants`);
    const seen = new Set(); for (const f of S.fx.filter((x) => x.stage === 0)) for (const t of [f.a, f.b]) { const k = `${t}@${f.d}`; assert.ok(!seen.has(k), `${S.id}: ${t} twice on day ${f.d}`); seen.add(k); }
  }
});

test('leagues-south: team counts and matches per team match the real formats', async () => {
  const G = await world();
  for (const [c, [n, per, ko]] of Object.entries(SIZE)) {
    const S = G.s.wd.seasons[`${c}-2028`]; assert.equal(S.teams.length, n, `${c} teams`);
    if (per) for (const t of S.teams) assert.equal(S.fx.filter((f) => f.stage === 0 && (f.a === t || f.b === t)).length, per, `${c}: ${t} plays ${per}`);
    assert.equal(S.fx.filter((f) => f.stage > 0).length, ko, `${c} knockout fixtures`);
  }
  const pool = G.s.wd.seasons['CSAT20-2028']; for (const t of pool.teams) assert.equal(pool.fx.filter((f) => f.stage === 0 && (f.a === t || f.b === t)).length, 7);
  assert.equal(seasonsOf(G, 'BBL').every((S) => S.fx.filter((f) => f.stage === 0).length === 40), true);
});

test('leagues-south: modules, squads and rules', async () => {
  await P.loadDB(); const G = Game.create('LL', { lang: 'en' }); ST.migrate(G); P.registry(G);
  for (const [c, m] of Object.entries(MODS)) {
    assert.equal(m.code, c); assert.ok(COMPS[c] && COMPS[c].listA, `${c} is registered and listA`); assert.deepEqual(COMPS[c].rules, m.rules, `${c} rules match the module`);
    const seen = new Map(); const ids = new Set(m.teams.map((t) => t.id)); assert.equal(ids.size, m.teams.length);
    for (const t of m.teams) {
      const roster = P.rosterOf(G, t.id); assert.ok(roster.length >= m.rules.min, `${t.id} has ${roster.length}`);
      if (m.rules.max) assert.ok(roster.length <= m.rules.max, `${t.id} over the maximum: ${roster.length}`);
      for (const p of roster) { assert.ok(!seen.has(p.id), `${c}: ${p.name} in ${seen.get(p.id)} and ${t.id}`); seen.set(p.id, t.id); }
      if (m.rules.overseas) { const os = roster.filter((p) => p.nat !== m.host && !p.gen).length; assert.ok(os <= m.rules.overseas.max, `${t.id}: ${os} overseas`); }
    }
    for (const [tid, keys] of Object.entries(m.squads)) { assert.ok(ids.has(tid), `${tid} is a team`);
      for (const k of keys) { if (k.includes('|')) { const [n, nat] = k.split('|'); assert.ok(Object.values(G._wr.by).some((p) => p.name === n && p.nat === nat), `${c}: ${k} resolves`); } else assert.ok(P.record(k), `${c}: ${k} resolves`); } }
  }
  assert.equal(BBL.teams.length, 8); assert.equal(SA20.teams.length, 6); assert.equal(CSAT20.teams.length, 16);
  assert.equal(BBL.rules.recruit, 'draft'); assert.equal(SA20.rules.recruit, 'auction');
});

test('leagues-south: a full world year simulates quickly and compacts small', async () => {
  const G = await world(); assert.ok(G.__ms < 60000, `world 2026-2030 took ${G.__ms} ms`);
  const mine = (S) => LEAGUES_SOUTH.includes(S.comp);
  W.archive(G);
  const bytes = (y) => { const seasons = Object.values(G.s.wd.seasons).filter((S) => mine(S) && S.y === y); const st = seasons.map((S) => G.s.wd.st[S.id] || {});
    return zlib.gzipSync(JSON.stringify({ seasons, st })).length; };
  const b = bytes(2029) + bytes(2030); console.log('  leagues-south: 2029 season set after compaction', bytes(2029), 'bytes gzipped; world 2026-30 simulated in', G.__ms, 'ms');
  assert.ok(bytes(2029) < 150 * 1024, `a year of these competitions is ${bytes(2029)} bytes gzipped (${b})`);
});
