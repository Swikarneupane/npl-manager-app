// Real squads for Ireland, Scotland and the West Indies, county registrations, and the Irish T20 Trophy and Super50 Cup (W4).
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as IN from '../../src/world/intl.js';
import { dayOfDate } from '../../src/world/dates.js';
import { DOMESTIC_WEST2 } from '../../src/world/domestic-west2.js';
import { COMPS } from '../../src/world/comps.js';

IN.setIntlEnabled(false);
let WORLD = null;
async function world() {
  if (WORLD) return WORLD; await P.loadDB(); const G = Game.create('LL', { lang: 'en' }); ST.migrate(G);
  for (let d = G.s.wd.day; d < dayOfDate(2031, 0, 1); ) { d = Math.min(dayOfDate(2031, 0, 1), d + 7); ST.advance(G, d, { auto: true }); }
  return (WORLD = G);
}
const SIZE = { 'IRE-IPT': [3, 6, 0], 'WI-S50': [6, 5, 1] }; // teams, league matches per team, knockout fixtures

test('west2: each competition plans a valid season for 2027 to 2030, with a champion', async () => {
  const G = await world();
  for (let y = 2027; y <= 2030; y++) for (const c of DOMESTIC_WEST2) {
    const S = G.s.wd.seasons[`${c}-${y}`]; assert.ok(S, `${c}-${y} exists`);
    assert.ok(S.done && S.champ && S.runner && S.runner !== S.champ, `${S.id} finished`);
    const [n, per, ko] = SIZE[c]; assert.equal(S.teams.length, n);
    const lg = S.fx.filter((f) => f.stage === 0); assert.equal(lg.length * 2 / n, per * 1 * 1 + 0, `${S.id} league matches per team`);
    assert.equal(S.fx.length - lg.length, ko);
    for (const f of S.fx) assert.ok(f.a !== f.b && S.teams.includes(f.a) && S.teams.includes(f.b) && f.res, `${S.id} fixture`);
  }
  for (const c of DOMESTIC_WEST2) assert.ok(COMPS[c].listA);
});

test('west2: squads resolve; nobody is on two teams of a competition; county registrations are kept', async () => {
  const G = await world(); const R = P.registry(G);
  for (const c of DOMESTIC_WEST2) { const S = G.s.wd.seasons[`${c}-2027`]; const seen = new Map();
    for (const t of S.teams) { const r = P.rosterOf(G, t); assert.ok(r.length >= 15, `${t} roster ${r.length}`);
      for (const p of r) { assert.ok(!seen.has(p.id) || seen.get(p.id) === t, `${p.id} on ${seen.get(p.id)} and ${t}`); seen.set(p.id, t); } } }
  const real = (t) => P.rosterOf(G, t).filter((p) => !p.gen).length;
  for (const t of ['IRE-LEI', 'IRE-NK', 'IRE-NWW', 'SCO-CH', 'SCO-EK', 'SCO-WW', 'WI-BAR', 'WI-GUY', 'WI-JAM', 'WI-LEE', 'WI-TT', 'WI-WIN']) assert.ok(real(t) >= 12, `${t}: ${real(t)} real players`);
  const G0 = Game.create('LL', { lang: 'en' }); ST.migrate(G0); // a fresh world: nobody has retired yet
  const has = (team, name) => P.rosterOf(G0, team).some((p) => p.name === name);
  assert.ok(has('ENG-YOR', 'Logan van Beek') && has('ENG-DUR', 'Kemar Roach'), 'overseas county players kept');
  void R;
});

test('west2: a world year adds little after compaction', async () => {
  const G = await world(); const wd = G.s.wd; const mine = JSON.stringify(Object.values(wd.seasons).filter((S) => DOMESTIC_WEST2.includes(S.comp)).slice(0, 2));
  assert.ok(mine.length < 100 * 1024, `two seasons ${mine.length} bytes`);
});
