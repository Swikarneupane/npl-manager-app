// A national fixture and an NPL match on one day: one is played live, the assistant plays the other.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as C from '../../src/world/career.js';

test('a same-day clash offers both matches and settles to one', async () => {
  await P.loadDB(); const G = Game.create('LL', { lang: 'en', manager: 'T' }); C.takeJob(G, 'nation', 'NEP', { quiet: true });
  G.aiPreseason(); G.startSeason();
  const f = G.nextFixture(); const mine = G.s.fixtures.find((x) => !x.res && (x.home === G.user || x.away === G.user)); assert.ok(mine);
  const day = C.nplDay(G, mine); ST.advance(G, day - 1, { auto: true });
  const S = ST.seasons(G).find((x) => !x.done && x.stage != null && x.teams.some((t) => t !== 'NEP')); assert.ok(S, 'a live season');
  const wf = { a: 'NEP', b: S.teams.find((t) => t !== 'NEP'), d: day, fmt: 'T20', id: 'clash-x', stage: S.stage }; S.fx.push(wf);
  const ev = C.nextEvent(G); 
  assert.ok(ev && ev.clash, 'clash detected'); assert.equal(C.clashOptions(ev).length, 2);
  const keep = C.clashOptions(ev).find((o) => o.kind === 'npl'); await C.settleClash(G, ev, keep);
  assert.ok(wf.res, 'the other match was played by the assistant'); assert.ok(!mine.res, 'the chosen match is left to play');
});
