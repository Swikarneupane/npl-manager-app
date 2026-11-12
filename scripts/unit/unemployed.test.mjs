// A career can start unemployed: no jobs, the world runs on, and offers arrive.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as C from '../../src/world/career.js';

test('start unemployed: no jobs, the clock runs, no crash', async () => {
  await P.loadDB(); const G = Game.create('LL', { lang: 'en', manager: 'T' }); C.startCareer(G, { club: false, nation: null, abroad: null });
  assert.equal(C.jobs(G).length, 0); assert.ok(!C.hasClub(G));
  for (let i = 0; i < 12; i++) await C.continueWorld(G, { max: 30 });
  assert.ok(G.s.wd.day > 300, 'the clock moved'); assert.equal(C.jobs(G).length, 0);
});
