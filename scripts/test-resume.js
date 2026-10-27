// Stops a match at many different balls (including the last ball of an over), restores it from a JSON
// snapshot as if the app had been closed, and checks the match always finishes consistently.
import { Game } from '../src/game/game.js';
import { Match } from '../src/game/engine.js';
class Stop extends Error {}
let checks = 0;
for (const stopAt of [1, 6, 36, 60, 119, 120, 121, 150, 186, 230]) {
  const G = Game.create('LL', {}); G.aiPreseason(); for (const p of G.osFreeAgents()) { if (G.osCount(G.user) >= 6) break; G.signFA(p.id); } G.startSeason();
  const f = G.nextFixture(); const m = G.newMatch(f); let snap = null, n = 0;
  try { await m.run({ afterBall: async () => { n++; snap = JSON.stringify(m.serialize()); if (n >= stopAt) throw new Stop(); } }); } catch (e) { if (!(e instanceof Stop)) throw e; }
  const G2 = new Game(JSON.parse(JSON.stringify(G.s)));
  const saved = JSON.parse(snap); const m2 = Match.restore(G2, saved);
  const lastBefore = saved.inns[saved.inns.length - 1];
  // finish with the hooks the app passes (review, bowler choice), so user-only branches run headless too
  let reviews = 0;
  await m2.run({ review: async () => { reviews++; return reviews % 2 === 0; }, chooseBowler: async () => null, pickNext: () => null });
  G2.recordMatch(m2, G2.s.fixtures.find((x) => x.n === f.n));
  // no bowler may bowl two consecutive overs, and nobody bowls more than 4
  for (const inn of m2.inns) for (const id in inn.bw) if (inn.bw[id].balls > 24) throw new Error('bowler over quota');
  const overs = m2.log.filter((e) => e.c === 'over' && e.ov).map((e) => e.ov.bowler.replace(/ \d.*$/, ''));
  for (let i = 1; i < overs.length; i++) if (overs[i] === overs[i - 1] && m2.log.find((e) => e.c === 'head' && e.t.includes('need')) === undefined) throw new Error('consecutive overs');
  console.log(`stop at ball ${String(stopAt).padStart(3)} (${lastBefore.runs}/${lastBefore.wkts}, ${Math.floor(lastBefore.balls / 6)}.${lastBefore.balls % 6}) -> ${m2.result.text}`);
  checks++;
}
console.log(`ok - ${checks} resume points`);
