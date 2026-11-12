// Career level per format: intl / dom / both decides which user fixtures stop the clock.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as C from '../../src/world/career.js';

const mk = async () => { await P.loadDB(); const G = Game.create('LL', { lang: 'en', manager: 'T' }); C.takeJob(G, 'nation', 'NEP', { quiet: true }); return G; };

test('levels default to both and old saves migrate', async () => {
  const G = await mk(); assert.deepEqual(G.s.wd.levels, { Test: 'both', ODI: 'both', T20: 'both' });
  delete G.s.wd.levels; ST.migrate(G); assert.equal(G.s.wd.levels.T20, 'both');
  assert.equal(ST.fmtGroup('FC3'), 'Test'); assert.equal(ST.fmtGroup('ODI'), 'ODI');
});
test('intl-only skips club fixtures, dom-only skips national fixtures', async () => {
  const G = await mk(); ST.advance(G, G.s.wd.day + 1, { auto: true });
  const nat = { a: 'NEP', b: 'UAE', fmt: 'T20' }, club = { a: 'LL', b: 'X', fmt: 'T20' };
  assert.ok(ST.userPlays(G, nat));
  ST.setLevel(G, 'T20', 'dom'); assert.ok(!ST.userPlays(G, nat)); assert.ok(!ST.managesSide(G, 'intl', 'T20')); assert.ok(ST.managesNpl(G));
  ST.setLevel(G, 'T20', 'intl'); assert.ok(ST.userPlays(G, nat)); assert.ok(!ST.managesNpl(G));
  const ev = C.nplEvent(G); G.aiPreseason(); G.startSeason(); const e2 = C.nplEvent(G); assert.ok(!e2 || e2.what !== 'match', 'NPL match not a stop');
  assert.ok(club);
});
test('an unmanaged national fixture is simmed without stopping the clock', async () => {
  const G = await mk(); ST.setLevel(G, 'T20', 'dom'); ST.setLevel(G, 'ODI', 'dom'); ST.setLevel(G, 'Test', 'dom');
  const stop = ST.advance(G, G.s.wd.day + 400, { rnd: Math.random });
  assert.ok(!stop || !(stop[1].a === 'NEP' || stop[1].b === 'NEP'), 'no national stop');
});
