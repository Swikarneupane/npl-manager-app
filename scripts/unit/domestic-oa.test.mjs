// Zimbabwe's Pro50 Championship and Domestic T20 (W4).
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as IN from '../../src/world/intl.js';
import * as W from '../../src/game/world.js';
import { dayOfDate } from '../../src/world/dates.js';
import { DOMESTIC_OA } from '../../src/world/domestic-oa.js';

IN.setIntlEnabled(false);
let WORLD = null;
async function world() {
  if (WORLD) return WORLD; await P.loadDB(); const G = Game.create('LL', { lang: 'en' }); ST.migrate(G);
  for (let d = G.s.wd.day; d < dayOfDate(2031, 0, 1);) { d = Math.min(dayOfDate(2031, 0, 1), d + 7); ST.advance(G, d, { auto: true }); }
  return (WORLD = G);
}
test('domestic-oa: squad keys resolve and no player is on two teams', async () => {
  await P.loadDB(); const G = Game.create('LL', { lang: 'en' }); ST.migrate(G); P.registry(G);
  for (const lg of ['MARSH', 'SMASH', 'FORD', 'CSAT20', 'BBL', 'SA20']) { const m = (await import(`../../src/data/world/leagues/${lg}.js`)).default; const seen = new Map();
    for (const t of m.teams) for (const k of m.squads[t.id] || []) { const id = k.includes('|') ? Object.values(G._wr.by).find((p) => p.name === k.split('|')[0] && p.nat === k.split('|')[1])?.id ?? (Object.values(G._wr.by).some((p) => p.name === k.split('|')[0] && p.nat === k.split('|')[1]) ? k : null) : k; assert.ok(id, `${lg}: ${k} resolves`); assert.ok(!seen.has(id), `${lg}: ${k} on ${seen.get(id)} and ${t.id}`); seen.set(id, t.id); } }
});
test('domestic-oa: Pro50 and Domestic T20 plan valid seasons for 2027 to 2030 with a champion', async () => {
  const G = await world();
  for (let y = 2027; y <= 2030; y++) for (const c of DOMESTIC_OA) {
    const S = G.s.wd.seasons[`${c}-${y}`]; assert.ok(S, `${c}-${y}`); assert.equal(S.teams.length, 5);
    if (S.end < G.s.wd.day - 5) assert.ok(S.done && S.champ && S.runner && S.champ !== S.runner, `${S.id} champion`);
    for (const t of S.teams) assert.equal(S.fx.filter((f) => f.stage === 0 && (f.a === t || f.b === t)).length, 8, `${S.id} ${t} plays 8`);
    if (S.done) assert.equal(S.fx.filter((f) => f.stage > 0).length, c === 'ZIM-P50' ? 1 : 0);
    const seen = new Set(); for (const f of S.fx) for (const t of [f.a, f.b]) { const k = `${t}@${f.d}`; assert.ok(!seen.has(k), `${S.id} ${t} twice on ${f.d}`); seen.add(k); }
  }
});
test('domestic-oa: a world year compacts under 100 KB', async () => {
  const G = await world(); W.archive(G);
  const seasons = Object.values(G.s.wd.seasons).filter((S) => DOMESTIC_OA.includes(S.comp) && S.y === 2029);
  const b = zlib.gzipSync(JSON.stringify({ seasons, st: seasons.map((S) => G.s.wd.st[S.id] || {}) })).length; console.log('  domestic-oa 2029:', b, 'bytes gzipped'); assert.ok(b < 100 * 1024);
});
