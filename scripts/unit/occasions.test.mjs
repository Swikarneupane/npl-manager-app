// Big occasions: playoff week, final week, the trophy ceremony and the season review.
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as O from '../../src/game/occasions.js';

// Play a season headlessly (as scripts/simulate-seasons.js does). The user's side is put top of the
// table and, where a test needs it, given the result of a playoff match, so each state is reachable.
const userIn = (G, f) => f.home === G.user || f.away === G.user;
async function league() {
  const G = Game.create('LL', { lang: 'en' }); G.aiPreseason();
  for (const p of G.osFreeAgents()) { if (G.osCount(G.user) >= 6) break; G.signFA(p.id); }
  G.startSeason();
  let lastUser = null;
  while (!G.leagueDone()) { const f = G.nextFixture(); await G.playFixture(f, null); if (userIn(G, f)) { G.expireDecisions(Infinity); lastUser = f; } }
  return { G, lastUser };
}
const force = (G, f, winner) => { f.res.winner = winner; f.res.loser = winner === f.home ? f.away : f.home; f.res.nr = false; };
async function playTo(stop, { userWinsQ1 = true } = {}) {
  const { G, lastUser } = await league();
  G.s.table[G.user].pts += 100; G.setupPlayoffs();
  const q1 = G.s.fixtures.find((f) => f.stage === 'Q1'); assert.ok(userIn(G, q1));
  await G.playFixture(q1, null); force(G, q1, userIn(G, q1) && userWinsQ1 ? G.user : (q1.home === G.user ? q1.away : q1.home));
  if (stop === 'afterQ1') return { G, lastUser, q1 };
  const el = G.s.fixtures.find((f) => f.stage === 'EL'); await G.playFixture(el, null); G.advancePlayoffs();
  const q2 = G.s.fixtures.find((f) => f.stage === 'Q2');
  if (stop === 'beforeQ2') return { G, q1, q2 };
  await G.playFixture(q2, null); if (!userWinsQ1) force(G, q2, G.user); G.advancePlayoffs();
  const fin = G.s.fixtures.find((f) => f.stage === 'F');
  return { G, q1, q2, fin };
}

test('routing: league, playoff week, final week, trophy and review paths', async () => {
  const { G, lastUser, q1 } = await playTo('afterQ1');
  assert.equal(O.afterMatchPath(G, lastUser), '/playoffs', 'the last league match leads to playoff week');
  assert.equal(O.poStatus(G).st, 'wait');
  assert.equal(O.afterMatchPath(G, q1), '/playoffs', 'winning Q1 leads to playoff week');
  const el = G.s.fixtures.find((f) => f.stage === 'EL'); await G.playFixture(el, null); G.advancePlayoffs();
  const q2 = G.s.fixtures.find((f) => f.stage === 'Q2');
  assert.equal(O.preMatchPath(G, q2), '/playoffs', 'playoff week first, until it has been seen');
  O.markSeen(G, 'po'); assert.equal(O.preMatchPath(G, q2), null);
  await G.playFixture(q2, null); G.advancePlayoffs();
  const fin = G.s.fixtures.find((f) => f.stage === 'F'); assert.ok(userIn(G, fin));
  assert.equal(O.poStatus(G).st, 'final');
  assert.equal(O.preMatchPath(G, fin), '/final', 'final week first');
  G.s.settings.assistant = true; assert.equal(O.preMatchPath(G, fin), null, 'the assistant never blocks the final'); G.s.settings.assistant = false;
  O.autoFw(G); assert.equal(O.preMatchPath(G, fin), null, 'no detour once final week is done');
  await G.playFixture(fin, null); force(G, fin, G.user);
  assert.equal(O.afterMatchPath(G, fin), '/trophy');
  force(G, fin, fin.home === G.user ? fin.away : fin.home);
  assert.equal(O.afterMatchPath(G, fin), '/review');
  assert.equal(O.afterMatchPath(G, { ...fin, home: 'XX', away: 'YY' }), null, 'not the user’s match');
});

test('routing: a user who loses Q1 plays Q2; losing it means out', async () => {
  const { G, q1 } = await playTo('afterQ1', { userWinsQ1: false });
  assert.equal(O.poStatus(G).st, 'Q2'); assert.equal(O.afterMatchPath(G, q1), '/playoffs');
  const el = G.s.fixtures.find((f) => f.stage === 'EL'); await G.playFixture(el, null); G.advancePlayoffs();
  const q2 = G.s.fixtures.find((f) => f.stage === 'Q2'); assert.ok(userIn(G, q2));
  assert.equal(O.preMatchPath(G, q2), null);
  await G.playFixture(q2, null); force(G, q2, q2.home === G.user ? q2.away : q2.home); G.advancePlayoffs();
  assert.equal(O.poStatus(G).st, 'out'); assert.equal(O.afterMatchPath(G, q2), '/playoffs');
  assert.ok(O.occ(G).q2log && O.occ(G).q2log.length > 20, 'Q2 commentary is kept for the replay');
});

test('final week: choices apply once, are logged, and feed the final’s composure', async () => {
  const { G, fin } = await playTo('final');
  const t = G.teams[G.user]; const trust = t.capTrust, fans = t.fans; const n0 = G.s.log.length;
  assert.ok(O.chooseFw(G, 'media', 'players')); assert.equal(t.capTrust, trust + 3);
  assert.equal(O.chooseFw(G, 'media', 'bold'), null, 'a choice stands once made'); assert.equal(t.capTrust, trust + 3);
  O.chooseFw(G, 'train', 'open'); assert.equal(t.fans, Math.min(100, fans + 4));
  O.chooseFw(G, 'lead', 'cap'); O.chooseFw(G, 'talk', 'legacy');
  const logged = G.s.log.slice(n0); assert.equal(logged.length, 4); assert.ok(logged.every((e) => /^Final week/.test(e.title) && e.pick && e.outcome));
  assert.ok(!O.fwDone(G)); assert.equal(O.fwLeft(G), 2);
  const opt = {}; O.beforeMatch(G, fin, opt);
  assert.ok(O.fwDone(G), 'unanswered tasks take the default on matchday');
  assert.equal(G.s.log.filter((e) => /the assistant chose/.test(e.pick)).length, 2);
  const opp = fin.home === G.user ? fin.away : fin.home;
  assert.equal(opt.talk[G.user], 6, 'legacy talk'); assert.equal(opt.talk[opp], 1, 'open training helps them a little');
  assert.equal(opt.mood[O.fwChoice(G, 'lead').pid] >= 6 - 3, true);
});

test('trophy: the lift choice applies its effect once and is logged', async () => {
  const { G, fin } = await playTo('final'); O.autoFw(G);
  const m = G.newMatch(fin); await m.run(null); G.recordMatch(m, fin); force(G, fin, G.user);
  const champ = G.advancePlayoffs(); assert.equal(champ, G.user); G.seasonAwards(champ);
  const c = O.ceremony(G); assert.ok(c.won); assert.equal(c.lifters.length, 3); assert.ok(c.winBall && c.winBall.t, 'the winning ball comes from the real commentary');
  assert.ok(c.plat && c.gold, 'Platinum and Golden Caps from the season history');
  const t = G.teams[G.user]; const trust = t.capTrust; const n0 = G.s.log.length;
  assert.ok(O.chooseLift(G, 'cap')); assert.equal(t.capTrust, Math.min(100, trust + 5));
  assert.equal(O.chooseLift(G, 'hero'), null); assert.equal(O.chooseLift(G, 'cap'), null);
  assert.equal(t.capTrust, Math.min(100, trust + 5)); assert.equal(G.s.log.length, n0 + 1);
});

test('season review: eight moments from a real played season, with "You chose" lines from the log', async () => {
  const { G } = await league(); G.setupPlayoffs();
  let ch = null; while (!ch) { const f = G.nextFixture(); if (f) { await G.playFixture(f, null); if (userIn(G, f)) G.expireDecisions(Infinity); } ch = G.advancePlayoffs(); }
  G.seasonAwards(ch);
  const r = O.reviewFor(G); assert.ok(r, 'a snapshot is taken at the end of the season'); assert.equal(r.y, G.year);
  assert.equal(r.moments.length, 8); assert.ok(r.finish && r.record && r.awards.length >= 4);
  const ns = r.moments.map((x) => x.n); assert.deepEqual(ns, ns.slice().sort((a, b) => a - b), "in order");
  const AUTO = /\s*\((the )?assistant( chose)?\)|\s*\(not answered in time\)/;
  const picks = G.s.log.filter((e) => e.y === G.year).map((e) => String(e.pick).replace(AUTO, '').replace(/^[“"]|[”"]$/g, ''));
  for (const mo of r.moments) if (mo.chose) assert.ok(/^(You chose|The assistant chose|Not answered in time): /.test(mo.chose) && picks.some((p) => mo.chose.includes(`: ${p}`)), mo.chose);
  if (G.s.log.some((e) => e.y === G.year && e.phase === 'league')) assert.ok(r.moments.some((x) => x.chose), 'decisions show up');
  assert.ok(JSON.stringify(G.s.occ).length < 40000, 'occasion state stays small');
});

test('an old save loads, plays a fixture and round-trips with occasion state', async () => {
  const G = new Game(oldSave()); assert.ok(G.s.occ && G.s.occ.fw && Array.isArray(G.s.occ.revs));
  assert.deepEqual(G.tasks().filter((x) => /^occ-/.test(x.key)), []);
  await G.playFixture(G.nextFixture(), null);
  const G2 = new Game(JSON.parse(JSON.stringify(G.s))); assert.ok(G2.s.occ); assert.equal(O.poStatus(G2).st, 'none');
});
