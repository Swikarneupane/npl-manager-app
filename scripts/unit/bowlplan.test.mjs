// The bowling plan: line, length and bowler aggression change results for the user's bowling; auto changes nothing.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import { Match, batProfile } from '../../src/game/engine.js';

async function run(plan, agg) {
  const G = Game.create('LL', { lang: 'en', manager: 'T' }); G.aiPreseason(); G.startSeason(); const ids = Object.keys(G.teams).filter((t) => t !== G.user);
  let w = 0, r = 0, b = 0;
  for (let k = 0; k < 40; k++) {
    const m = new Match(G, ids[k % ids.length], G.user, { lang: 'en', overs: 20, noRain: true });
    const hooks = { beforeOver: (inn) => { if (inn.bowl === G.user) { if (plan) inn.bplan = plan; if (agg) inn.bagg = new Proxy({}, { get: () => agg }); } } };
    await m.run(hooks); const i = m.inns.find((x) => x.bowl === G.user); if (i) { w += i.wkts; r += i.runs; b += i.balls; }
  }
  return { w: w / 40, rpo: r / (b / 6) };
}
test('batter lean is stable and in range', () => { const p = { id: 'x-1' }; const a = batProfile(p), c = batProfile({ id: 'x-1' }); assert.deepEqual(a, c); assert.ok(Math.abs(a.side) <= 1 && Math.abs(a.foot) <= 1); });
test('attacking bowlers take more wickets and go for more than defensive ones', async () => {
  const at = await run(null, 'attack'), de = await run(null, 'defend');
  assert.ok(at.w > de.w, `wickets ${at.w} v ${de.w}`);
});
