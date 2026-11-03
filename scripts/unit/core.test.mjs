// Phase 2 core rules: old saves load, auction max bid, composure, win probability, matchups.
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game, MIN_BASE } from '../../src/game/game.js';
import { Match } from '../../src/game/engine.js';
import { winProbability, venuePar, DEFAULT_PAR, dlsRes } from '../../src/game/winprob.js';
import { czInit, czBall, batComp, fieldComp, compBase, captainWord, falseShot, STAGE_PRESSURE } from '../../src/game/composure.js';
import { muPair, muHand, bowlGroup, injuryRisk, workload } from '../../src/game/depth.js';

const fresh = () => Game.create('LL', { lang: 'en' });

test('a phase 1 save loads and every new field gets a default', () => {
  const s = oldSave(); assert.equal(s.log, undefined);
  const G = new Game(s);
  assert.ok(Array.isArray(G.s.log)); assert.ok(G.s.mu && G.s.mu.p); assert.ok(G.s.par);
  for (const p of Object.values(G.players)) { assert.ok(p.traits && p.traits.big >= 0, 'traits'); assert.ok(Array.isArray(p.wl)); }
  // and it still plays on: the next fixture, then a save round trip
  return G.playFixture(G.nextFixture(), null).then(() => { const G2 = new Game(JSON.parse(JSON.stringify(G.s))); assert.equal(G2.s.fixtures.filter((f) => f.res).length, 10); });
});
test('fictional players can have a flaw; real players never do', () => {
  const G = fresh();
  for (const p of Object.values(G.players)) if (p.real !== false) assert.equal(p.traits.flaw, undefined, p.name);
});

// ----- max bid -----
function auctionGame() {
  const G = fresh(); G.s.phase = 'auction';
  const t = G.teams.LL; for (const id of t.squad.slice()) G.releasePlayer(id);
  return G;
}
test('max bid: an empty squad keeps Rs 3 L back for each of the other five overseas slots', () => {
  const G = auctionGame(); const os = Object.values(G.players).find((p) => !p.team && p.nat !== 'NEP');
  G.teams.LL.osPurse = 36;
  assert.equal(G.lotMax('LL', os), 36 - 5 * MIN_BASE.OS);
});
test('max bid: Nepali lots use the domestic purse and keep Rs 2 L per other required Nepali slot', () => {
  const G = auctionGame(); const nep = Object.values(G.players).find((p) => !p.team && p.nat === 'NEP');
  G.teams.LL.purse = 74; // 0 players: 6 overseas + 12 Nepali required
  assert.equal(G.lotMax('LL', nep), 74 - 11 * MIN_BASE.NEP);
});
test('max bid: once the minimum is met there is no reserve, and a full squad cannot bid', () => {
  const G = fresh(); const t = G.teams.LL; G.s.phase = 'auction';
  const pool = Object.values(G.players).filter((p) => !p.team && p.nat !== 'NEP');
  while (G.osCount('LL') < 6) G.signPlayer(pool.shift(), 'LL', 1);
  const os = pool[0]; const req = G.requiredSlots('LL');
  if (req.os === 0 && G.canAdd('LL', os)) assert.equal(G.lotMax('LL', os), Math.floor(t.osPurse * 2) / 2);
  while (t.squad.length < 22) G.signPlayer(Object.values(G.players).find((p) => !p.team && p.nat === 'NEP' && !p.retired), 'LL', 0);
  assert.equal(G.lotMax('LL', os), 0);
});
test('max bid: a bid past the max is refused with "Over your limit"', () => {
  const G = auctionGame(); G.setupAuction(); G.s.auction.prep = false;
  let c; do { c = G.lotStart(); } while (c && G.P(c.pid).nat === 'NEP' && (G.hammer(), true));
  const p = G.P(c.pid); G.teams.LL.osPurse = 10; const max = G.lotMax('LL', p);
  c.bid = max; c.leader = 'KG'; // the next increment is above the max
  const err = G.userBid(); assert.match(err, /Over your limit/);
});

// ----- composure -----
function liveMatch(stage = 'L') {
  const G = fresh(); G.aiPreseason(); G.startSeason(); const f = G.nextFixture(); f.stage = stage;
  const m = G.newMatch(f); const inn = m.newInnings(m.home, m.away, null); m.inns.push(inn); inn.cur = m.lineups[m.away].xi.find((id) => G.P(id).bowl >= 50);
  inn.bw[inn.cur] = { balls: 0, r: 0, w: 0, dots: 0, wd: 0, nb: 0 }; czInit(m); return { G, m, inn };
}
test('composure: starts from temperament and the big-game trait', () => {
  const p = { temper: 90, traits: { big: 80 } }, q = { temper: 40, traits: { big: 30 } };
  assert.ok(compBase(p) > compBase(q)); assert.ok(compBase(p) <= 85 && compBase(q) >= 30);
});
test('composure: a string of dots lowers it, boundaries raise it', () => {
  const { m, inn } = liveMatch(); const id = inn.striker; const c0 = batComp(m, inn, id);
  for (let k = 0; k < 5; k++) czBall(m, inn, 'dot');
  const c1 = batComp(m, inn, id); assert.ok(c1 < c0, `${c1} < ${c0}`);
  czBall(m, inn, '4'); czBall(m, inn, '6'); assert.ok(batComp(m, inn, id) > c1);
});
test('composure: falls are about double in a final', () => {
  const a = liveMatch('L'), b = liveMatch('F'); const pa = a.G.P(a.inn.striker); pa.traits.big = 50; const pb = b.G.P(b.inn.striker); pb.traits.big = 50;
  const da = batComp(a.m, a.inn, a.inn.striker), db = batComp(b.m, b.inn, b.inn.striker);
  a.m.G.players[a.inn.cur].bowl = 50; b.m.G.players[b.inn.cur].bowl = 50; // no elite-bowler effect
  for (let k = 0; k < 6; k++) { czBall(a.m, a.inn, 'dot'); czBall(b.m, b.inn, 'dot'); }
  const fa = da - batComp(a.m, a.inn, a.inn.striker), fb = db - batComp(b.m, b.inn, b.inn.striker);
  assert.ok(fb > fa * 1.7 && fb < fa * 2.6, `final fall ${fb} v league ${fa}`); assert.ok(STAGE_PRESSURE.F >= 2);
});
test('composure: a required rate above 12 and a dropped catch both hurt', () => {
  const { m, inn } = liveMatch(); inn.target = 200; inn.runs = 40; inn.balls = 60; m.G.players[inn.cur].bowl = 50;
  const id = inn.striker; const c0 = batComp(m, inn, id); czBall(m, inn, '1'); const c1 = batComp(m, inn, id); assert.ok(c1 < c0 + 0.5, `rrr above 12: ${c0} → ${c1} (stage ${m.opt.stage}, talk ${JSON.stringify(m.opt.talk)})`);
  const f0 = fieldComp(m, inn.bowl); czBall(m, inn, 'drop'); assert.ok(fieldComp(m, inn.bowl) <= f0 - 7);
});
test('composure: a first meeting with an elite bowler costs composure once', () => {
  const { m, inn } = liveMatch(); m.G.players[inn.cur].bowl = 82; const id = inn.striker; const c0 = batComp(m, inn, id);
  czBall(m, inn, '1'); const c1 = batComp(m, inn, id); assert.ok(c0 - c1 >= 5);
  czBall(m, inn, '1'); assert.ok(batComp(m, inn, id) > c1);
});
test("composure: the captain's word and the team talk lift it; low composure means more false shots", () => {
  const { m, inn } = liveMatch(); const id = inn.striker; const c0 = batComp(m, inn, id); captainWord(m, inn.bat, 10); assert.equal(batComp(m, inn, id), Math.min(100, c0 + 10));
  const { m: m2, inn: i2 } = liveMatch(); m2.opt.talk = { [i2.bat]: 6 }; m2.cz = null; czInit(m2); assert.ok(batComp(m2, i2, i2.striker) >= compBase(m2.G.P(i2.striker)) + 6);
  assert.ok(falseShot(20) > 1.3 && falseShot(55) === 1);
});
test('composure is saved with the match and restored', () => {
  const { G, m, inn } = liveMatch(); for (let k = 0; k < 4; k++) czBall(m, inn, 'dot');
  const r = Match.restore(G, m.serialize()); assert.deepEqual(r.cz.b, m.cz.b);
});

// ----- win probability -----
test('win probability: par at the halfway mark is close to even, chases swing with the score', () => {
  // a first innings exactly on par is even; more runs or fewer wickets is better
  const R = dlsRes(60, 3) / 100; const onPar = winProbability({ runs: Math.round(162 * (1 - R)), wkts: 3, balls: 60, target: null, par: 162 });
  assert.ok(Math.abs(onPar - 0.5) < 0.03, String(onPar));
  assert.ok(winProbability({ runs: 100, wkts: 1, balls: 60, par: 162 }) > winProbability({ runs: 81, wkts: 3, balls: 60, par: 162 }));
  assert.ok(winProbability({ runs: 81, wkts: 3, balls: 60, par: 162 }) > winProbability({ runs: 60, wkts: 5, balls: 60, par: 162 }));
  const easy = winProbability({ runs: 150, wkts: 2, balls: 108, target: 160, par: 162 }), hard = winProbability({ runs: 100, wkts: 8, balls: 108, target: 160, par: 162 });
  assert.ok(easy > 0.9 && hard < 0.05); assert.equal(winProbability({ runs: 160, wkts: 2, balls: 100, target: 160 }), 1);
  // more wickets in hand is better
  assert.ok(winProbability({ runs: 100, wkts: 2, balls: 84, target: 170 }) > winProbability({ runs: 100, wkts: 6, balls: 84, target: 170 }));
});
test('win probability: venue par comes from the season once three totals exist', () => {
  const s = { par: { 2026: { sum: 520, n: 3 } } }; assert.equal(venuePar(s, 2026), 173); assert.equal(venuePar({ par: { 2026: { sum: 300, n: 2 } } }, 2026), DEFAULT_PAR);
});
test('a full match records matchups and venue par', async () => {
  const G = fresh(); G.aiPreseason(); G.startSeason();
  for (let k = 0; k < 4; k++) await G.playFixture(G.nextFixture(), null);
  assert.ok(Object.keys(G.s.mu.p).length > 50); const [k0, v] = Object.entries(G.s.mu.p)[0]; const [a, b] = k0.split('|');
  assert.deepEqual(muPair(G, a, b).balls, v[1]); assert.ok(muHand(G, 'R', 'pace').balls > 100);
  assert.ok(G.s.par[G.year].n >= 1); assert.equal(bowlGroup('SLA'), 'SLA'); assert.equal(bowlGroup('LB'), 'wrist');
});
test('workload and injury risk: heavy recent overs and age raise the risk', () => {
  const G = fresh(); const p = Object.values(G.players).find((x) => x.bowl >= 60 && x.team); p.age = 27; p.fit = 100;
  const base = injuryRisk(G, p); p.wl = [{ y: G.year, dt: null, o: 4 }, { y: G.year, dt: null, o: 4 }, { y: G.year, dt: null, o: 4 }];
  assert.equal(workload(G, p).overs7, 8); const loaded = injuryRisk(G, p); assert.equal(loaded, base); // 8 overs is the free allowance
  p.wl.push({ y: G.year, dt: null, o: 12 }); p.wl.shift(); assert.ok(injuryRisk(G, p) > base + 4); // 16 overs in two matches
  p.wl = []; p.age = 36; p.fit = 70; assert.ok(injuryRisk(G, p) > base + 2);
});
test('decisions answered from the inbox are written to the decision log', () => {
  const G = fresh(); G.aiPreseason(); G.startSeason(); const f = G.nextFixture();
  G.makeEvent({ lineups: { LL: G.lineup('LL') }, result: { loser: 'LL' } }, f); const n = G.pendingDecisions()[0];
  G.applyEvent(n, 0); const e = G.s.log[G.s.log.length - 1]; assert.equal(e.pick, n.choices[0].l); assert.equal(e.y, G.year);
});
