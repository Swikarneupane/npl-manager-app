// Matchday: build-up, team talk, matchups, game plan, captain's trust, press, key moments, round-up.
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import { Match } from '../../src/game/engine.js';
import { batComp, compBase, czInit } from '../../src/game/composure.js';
import * as MD from '../../src/game/matchday.js';
import { quickSimUserMatch, matchPath, simUntilUser } from '../../src/lib/flow.js';

function league() { const G = Game.create('LL', { lang: 'en' }); G.aiPreseason(); G.startSeason(); return G; }
async function toUser(G) { await simUntilUser(G); return G.userNext(); }

test('team talk: the tone and a word with a player reach composure through opt.talk and opt.mood', async () => {
  const G = league(); const f = await toUser(G); const p = MD.prepFor(G, f);
  p.talk.tone = 'calm'; const lu = G.lineup('LL'); const pid = lu.order[0]; p.talk.words[pid] = 'back';
  // make pid a word candidate by forcing youth: if not one, set mood directly through a tone instead
  MD.finishPrep(G, f); const m = G.newMatch(f);
  assert.equal(m.opt.tone, 'calm'); assert.ok(m.opt.talk.LL >= 3 - 2, JSON.stringify(m.opt.talk));
  const inn = m.newInnings('LL', m.home === 'LL' ? m.away : m.home, null); m.inns.push(inn); czInit(m);
  const c = batComp(m, inn, inn.striker); const P = G.P(inn.striker);
  assert.ok(c >= Math.min(100, compBase(P) + m.opt.talk.LL + ((m.opt.mood || {})[inn.striker] || 0)) - 0.01);
  // a fired-up talk lifts veterans and drops nervous youngsters
  const xi = lu.xi.map((id) => G.P(id)); xi[0].age = 34; xi[1].age = 20; xi[1].temper = 45; xi[1].traits.lead = 30;
  const te = MD.talkEffects(G, 'fired', xi); assert.ok(te.mood[xi[0].id] > 0 && te.mood[xi[1].id] < 0);
});

test('matchups: a ticked card changes the engine strengths for that pairing only', async () => {
  const G = league(); const f = await toUser(G); const m = G.newMatch(f); const u = 'LL', o = m.home === u ? m.away : m.home;
  const inn = m.newInnings(u, o, null); m.inns.push(inn);
  const bat = G.P(inn.striker), bowl = G.P(m.lineups[o].xi.find((id) => G.P(id).bowl >= 50)), other = G.P(m.lineups[o].xi.find((id) => G.P(id).bowl >= 40 && id !== bowl.id));
  m.opt.mu = [];
  const a = m.strengths(inn, bat, bowl, 'mid'); m.opt.mu = [{ t: 'bat', bat: bat.id, bowl: bowl.id, v: 3, title: 'x' }];
  const b = m.strengths(inn, bat, bowl, 'mid'); assert.equal(b.b - a.b, 3); assert.equal(b.w, a.w); assert.equal(b.mu, 0);
  const c = m.strengths(inn, bat, other, 'mid'); assert.equal(c.mu, -1);
  // cards from the build-up carry an edge and at most three can be ticked
  const cards = MD.matchupCards(G, f); assert.ok(cards.length >= 2); for (const k of cards) assert.ok(k.edge && k.edge.v > 0);
  for (const k of cards) MD.toggleMatchup(G, f, k); assert.ok(MD.prepFor(G, f).mu.length <= MD.MAX_TICKS);
  MD.finishPrep(G, f); assert.equal(G.newMatch(f).opt.mu.length, MD.prepFor(G, f).mu.length);
});

test('game plan: the plan sets the intent and field each over unless the user overrides it in that phase', async () => {
  const G = league(); const f = await toUser(G); const p = MD.prepFor(G, f);
  p.plan.bat = { pp: 'steady', mid: 'hard', death: 'hard' }; p.plan.bowl = { pp: 'defend', mid: 'attack', death: 'death' }; MD.finishPrep(G, f);
  const m = G.newMatch(f); const o = m.home === 'LL' ? m.away : m.home; const inn = m.newInnings('LL', o, null); m.inns.push(inn);
  MD.applyPlan(G, m, inn); assert.ok(+inn.aggr < 0.5, inn.aggr);
  inn.aggr = '2'; inn.balls = 6; MD.applyPlan(G, m, inn); assert.equal(inn.aggr, '2', 'user override kept within the phase');
  inn.balls = 42; MD.applyPlan(G, m, inn); assert.ok(+inn.aggr >= 1, 'new phase: plan again');
  const inn2 = m.newInnings(o, 'LL', 150); m.inns.push(inn2); MD.applyPlan(G, m, inn2); assert.equal(inn2.field, 'defend');
  inn2.balls = 40; MD.applyPlan(G, m, inn2); assert.equal(inn2.field, 'attack');
  // and the quick-sim path uses it too: a full quick sim completes
  const mm = await quickSimUserMatch(G, f); assert.ok(mm.result && f.res);
});

test("captain's trust: overruling costs trust, agreeing earns it, and both are logged", async () => {
  const G = league(); const f = await toUser(G); const cap = G.P(G.lineup('LL').captain); cap.traits.flair = 70; cap.traits.lead = 50;
  const p = MD.prepFor(G, f); p.plan.bat.mid = 'steady';
  const t0 = G.teams.LL.capTrust; assert.ok(MD.captainIssue(G, f));
  MD.answerCaptain(G, f, 'overrule'); assert.equal(G.teams.LL.capTrust, t0 - 5);
  assert.equal(p.plan.bat.mid, 'steady'); assert.equal(G.s.log[G.s.log.length - 1].kind, 'plan');
  MD.answerCaptain(G, f, 'agree'); assert.equal(G.teams.LL.capTrust, t0 - 1); assert.equal(p.plan.bat.mid, 'positive');
});

test('press: answers move morale, fans, board, conduct and the rival respect; every answer is logged', async () => {
  const G = league(); const f = await toUser(G); const pr = MD.pressFor(G, f, 'pre'); const opp = pr.opp;
  assert.equal(pr.qs.length, 3); for (const q of pr.qs) assert.equal(q.answers.length, 3);
  const fx = pr.qs[0].answers[0].fx; const b0 = MD.pressBase(G, opp); const n0 = G.s.log.length;
  MD.answerPress(G, 0); const b1 = MD.pressBase(G, opp);
  assert.equal(b1.fans - b0.fans, fx.fans || 0); assert.equal(b1.rival - b0.rival, fx.rival || 0); assert.ok(Math.abs(b1.morale - b0.morale - (fx.morale || 0)) <= 1);
  assert.equal(b1.conduct - b0.conduct, fx.conduct || 0); assert.equal(G.s.log.length, n0 + 1); assert.equal(G.s.log[n0].kind, 'press');
  MD.autoPress(G); assert.ok(pr.done); assert.equal(G.s.log.filter((e) => e.kind === 'press').length, 3);
  // not every match: about one in three league matches
  const due = G.s.fixtures.filter((x) => x.stage === 'L' && (x.home === 'LL' || x.away === 'LL')).filter((x) => MD.pressDue(G, x)).length;
  assert.ok(due >= 1 && due <= 3, String(due));
});

test('key moments: win-chance previews match m.winProb for the expected over, and choices are logged', async () => {
  const G = league(); const f = await toUser(G); const m = G.newMatch(f); const o = m.home === 'LL' ? m.away : m.home;
  m.inns.push(m.newInnings(o, 'LL', null)); m.inns[0].runs = 170; m.inns[0].balls = 120; m.inns[0].wkts = 6;
  const inn = m.newInnings('LL', o, 171); m.inns.push(inn); inn.runs = 140; inn.balls = 102; inn.wkts = 4; inn.cur = m.lineups[o].xi.find((id) => G.P(id).bowl >= 50); inn.bw[inn.cur] = { balls: 18, r: 30, w: 1, dots: 0, wd: 0, nb: 0 }; czInit(m); m.edge = 0; // equal sides, so the chase is close whatever squads the league drew
  const km = MD.keyMoment(G, m, inn, 'over'); assert.ok(km, 'a close chase at the 18th over is a key moment');
  assert.ok(km.opts.length >= 2 && km.opts.length <= 3);
  assert.ok(Math.abs(km.wp0 - MD.userWin(G, m)) < 1e-9);
  for (const x of km.opts) { assert.ok(Math.abs(x.wp1 - MD.expectedWin(G, m, x.e, x.o.balls)) < 1e-9); assert.ok(x.risk); }
  // the average over outcomes is built from m.winProb previews: with no spread and no wickets it is exactly one preview
  const one = MD.expectedWin(G, m, { runs: 10, wkts: 0, sd: 0 }, 6); assert.ok(Math.abs(one - MD.userWin(G, m, { runs: 10, wkts: 0, balls: 6 })) < 1e-9);
  assert.ok(MD.expectedWin(G, m, { runs: 14, wkts: 0.3, sd: 5 }, 6) > MD.expectedWin(G, m, { runs: 8, wkts: 0.3, sd: 5 }, 6));
  const go = km.opts.find((x) => x.k === 'go'), calm = km.opts.find((x) => x.k === 'calm');
  assert.ok(go.o.runs > calm.o.runs, 'going hard expects more runs');
  const n0 = G.s.log.length; MD.resolveKey(G, m, inn, km, 0, false); assert.equal(G.s.log[n0].kind, 'key'); assert.equal(inn.aggr, '2');
  assert.equal(MD.keyMoment(G, m, inn, 'over'), null, 'each kind once');
  assert.ok(Match.restore(G, m.serialize()).km.hist.length === 1, 'saved with the match');
});

test('assistant mode: the build-up completes itself, routing skips it, and press answers itself', async () => {
  const G = league(); G.s.settings.assistant = true; const f = await toUser(G);
  assert.equal(matchPath(G, f, false), '/match');
  const m = G.newMatch(f); const p = MD.prepOf(G, f); assert.ok(p && p.done && p.auto); assert.ok(p.talk.tone && p.subs.length === 5);
  assert.ok(m.opt.plan && m.opt.talk.LL != null);
  for (let k = 0; k < 4; k++) { const ff = await toUser(G); await quickSimUserMatch(G, ff); }
  assert.ok(G.s.log.some((e) => e.kind === 'talk')); assert.ok(!G.s.press || G.s.press.done);
  G.s.settings.assistant = false; const nf = await toUser(G); assert.equal(matchPath(G, nf, false), '/prematch');
});

test('round-up: built after the user match, with results, table and a headline', async () => {
  const G = league(); const f = await toUser(G); await quickSimUserMatch(G, f);
  const sc = MD.roundupScope(G); assert.ok(sc.list.includes(f));
  const rd = MD.buildRoundup(G); assert.ok(rd.head && rd.radio && rd.results.length >= 1 && rd.table.length === 8);
  assert.ok(rd.results.some((r) => r.me)); assert.equal(MD.buildRoundup(G), rd, 'stable once built');
  assert.ok(['/press', '/roundup'].includes(MD.postMatchPath(G, f, null)));
});

test('the old save loads, plays a matchday with the build-up, and round-trips', async () => {
  const G = new Game(oldSave()); assert.equal(G.s.prep, null);
  const f = await toUser(G); MD.prepFor(G, f); MD.autoPrep(G, f);
  await quickSimUserMatch(G, f); assert.ok(f.res); MD.buildRoundup(G);
  const G2 = new Game(JSON.parse(JSON.stringify(G.s))); assert.ok(G2.s.rd && G2.s.md);
  const f2 = await toUser(G2); await quickSimUserMatch(G2, f2); assert.ok(f2.res);
});
