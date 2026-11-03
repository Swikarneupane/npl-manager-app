// Living league: story engine, honesty of personal chains, AI managers, rivalry heat, achievements,
// the finals archive and old saves.
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as Lv from '../../src/game/living.js';
import { CHAINS, FICTIONAL_TARGETS } from '../../src/game/stories.js';
import { ovr } from '../../src/game/engine.js';

const fresh = () => { const G = Game.create('LL', { lang: 'en' }); G.aiPreseason(); for (const p of G.osFreeAgents()) { if (G.osCount(G.user) >= 6) break; G.signFA(p.id); } G.startSeason(); return G; };
// Swap a few real squad players for fictional ones so personal chains have someone to target.
function withFictional(G, n = 4) {
  const t = G.teams[G.user];
  for (let i = 0; i < n; i++) { const p = G.genNepali(i < 2 ? 20 : 31); p.bat = 62; p.bowl = 60; G.players[p.id] = p; p.team = G.user; p.hist.push({ year: G.year, team: G.user }); t.squad.push(p.id); }
  return t.squad.map((id) => G.P(id)).filter((p) => p.real === false);
}
const chain = (id) => CHAINS.find((c) => c.id === id);
async function playUser(G) { let f; do { f = G.nextFixture(); await G.playFixture(f, null); } while (!(f.home === G.user || f.away === G.user)); return f; }

test('story chains: at least 15, each with steps of 3-4 choices and a valid safe choice', () => {
  assert.ok(CHAINS.length >= 15, `${CHAINS.length} chains`);
  for (const id of ['festival', 'homesick', 'exams', 'callup', 'veteran', 'sponsor', 'war', 'rushed']) assert.ok(chain(id), id);
  for (const c of CHAINS) for (const k in c.steps) { const s = c.steps[k]; assert.ok(s.choices.length >= 3 && s.choices.length <= 4, `${c.id}.${k}`); assert.ok(s.choices[s.safe ?? 0], `${c.id}.${k} safe`);
    for (const ch of s.choices) { if (ch.next) assert.ok(c.steps[ch.next.to], `${c.id} next ${ch.next.to}`); if (ch.alt && ch.alt.next) assert.ok(c.steps[ch.alt.next.to]); } }
});
test('honesty: personal chains use fictional-only targets and only fictional players are picked', () => {
  for (const c of CHAINS) {
    if (c.personal) assert.ok(FICTIONAL_TARGETS.includes(c.target), `${c.id} target ${c.target}`);
    else for (const k in c.steps) if (c.steps[k].quote) assert.equal(c.steps[k].quoteBy, 'npc', `${c.id}.${k}: a non-personal chain may only quote generated people`);
  }
  for (let r = 0; r < 5; r++) { const G = fresh(); withFictional(G); G.teams[G.user].lastXI = { xi: [], order: [] };
    for (const k of FICTIONAL_TARGETS) { const tg = Lv.TARGETS[k](G, { count: [1, 3] }); if (!tg) continue; for (const id of tg.pids) assert.equal(G.P(id).real, false, `${k} picked ${G.P(id).name}`); } }
  // a real player never gets a quote, even from a chain that allows real players
  const G = fresh(); const st = Lv.startChain(G, chain('callup'), true); assert.ok(st); assert.ok(st.pids.length);
  const n = G.s.inbox.find((x) => x.id === st.newsId); assert.equal(n.quote, undefined);
});
test('story engine: conditions gate a chain, a choice applies core and extra effects, and the next part unlocks later', async () => {
  const G = fresh(); const fic = withFictional(G); G.teams[G.user].lastXI = { xi: [], order: [] };
  assert.equal(Lv.condOk(G, [['played', 3]]), false); assert.equal(Lv.condOk(G, [['phase', 'league']]), true); assert.equal(Lv.condOk(G, [['phase', 'auction']]), false);
  const st = Lv.startChain(G, chain('festival'), true); assert.ok(st && st.status === 'open');
  const n = G.s.inbox.find((x) => x.id === st.newsId); assert.ok(n.story && n.storyId === st.id && n.choices.length === 3 && n.due != null);
  const p = G.P(st.pids[0]); assert.ok(fic.includes(p)); const h0 = p.happy ?? 70; const fans0 = G.teams[G.user].fans;
  Lv.answerStory(G, st.id, 2); // refuse: fans −1 (core), happiness −8 (extra), part 2 after two matches
  assert.equal(G.teams[G.user].fans, fans0 - 1); assert.equal(p.happy, Math.max(0, h0 - 8)); assert.equal(st.status, 'wait');
  assert.ok(G.s.log.some((e) => e.kind === 'story'), 'logged as a story decision');
  const um = G.s.living.cnt.um || 0; assert.equal(st.wait.um, um + 2);
  G.news('A core decision', 'event', { choices: [{ l: 'A', fx: {} }, { l: 'B', fx: {} }], safe: 1, due: 999, done: false }); // follow-ups come on busy days
  G.s.living.cnt.um = um + 1; Lv.tick(G, 'afterMatch', {}); assert.equal(st.status, 'wait', 'not yet');
  G.s.living.cnt.um = um + 2; Lv.tick(G, 'afterMatch', {}); assert.equal(st.status, 'open'); assert.equal(st.step, 's2'); assert.equal(st.hist.length, 2);
  // answered through the inbox (DecisionSheet path): sync picks it up
  const n2 = G.s.inbox.find((x) => x.id === st.newsId); G.applyEvent(n2, 0); Lv.sync(G); assert.equal(st.status, 'done'); assert.ok(st.last.out);
});
test('story engine: a step can unlock a season later', () => {
  const G = fresh(); withFictional(G); const st = Lv.startChain(G, chain('exams'), true); assert.ok(st);
  const c = chain('exams').steps.s1.choices[0]; Lv.answerStory(G, st.id, 0); assert.equal(st.status, 'wait'); assert.equal(st.wait.y, G.year + 1); assert.ok(c.next.after.seasons === 1);
  Lv.tick(G, 'afterMatch', {}); assert.equal(st.status, 'wait');
  G.s.year++; Lv.tick(G, 'seasonStart', {}); assert.equal(st.status, 'open'); assert.equal(st.step, 's2');
});
test('assistant: an unanswered story decision takes the cautious choice at its deadline', async () => {
  const G = fresh(); const st = Lv.startChain(G, chain('war'), true); assert.ok(st);
  const n = G.s.inbox.find((x) => x.id === st.newsId); const safe = n.choices[n.safe].l;
  G.expireDecisions(n.due); Lv.sync(G); assert.ok(n.done && n.auto && n.picked === safe); assert.equal(st.status, 'done'); assert.ok(st.last.auto);
});
test('AI managers: low job security leads to a sacking, a caretaker, then a new manager who changes aggrBias', async () => {
  const G = fresh(); const tid = Object.keys(G.s.living.mgr)[0]; const m0 = G.s.living.mgr[tid]; const bias0 = G.teams[tid].aggrBias;
  m0.sec = 10; G.s.table[tid].p = 6; G.teams[tid].form = ['L', 'L', 'L'];
  // a loss for that team, recorded through the hook
  const f = { n: 99, home: tid, away: Object.keys(G.teams).find((x) => x !== tid && x !== G.user), stage: 'L', res: { winner: null, nr: false } }; f.res.winner = f.away;
  Lv.afterMatch(G, { result: f.res, inns: [], lineups: {} }, f);
  const c = G.s.living.mgr[tid]; assert.ok(c.care, 'caretaker'); assert.equal(G.s.living.sacked[0].tid, tid); assert.notEqual(G.teams[tid].aggrBias, bias0);
  assert.ok(G.s.living.wire.some((w) => w.kind === 'sack'));
  const m2 = Lv.appointManager(G, tid); assert.ok(!m2.care); assert.notEqual(m2.style, m0.style); assert.equal(G.teams[tid].aggrBias, Math.round((Lv.STYLES[m2.style].bias + (G.teams[tid].aggrBias - Lv.STYLES[m2.style].bias)) * 100) / 100);
  assert.ok(Math.abs(G.teams[tid].aggrBias - Lv.STYLES[m2.style].bias) < 0.05); if (Lv.STYLES[m2.style].persona) assert.equal(G.teams[tid].persona, Lv.STYLES[m2.style].persona);
});
test('AI rotation: a tired player is rested before a league match; the user\'s side is never touched', () => {
  const G = fresh(); const f = G.s.fixtures.find((x) => x.home !== G.user && x.away !== G.user && !x.res); const t = G.teams[f.home];
  const p = t.squad.map((id) => G.P(id)).find((x) => x.nat === 'NEP'); p.fit = 50; const mine = G.P(G.teams[G.user].squad[0]); mine.fit = 40;
  Lv.beforeMatch(G, f, {}); assert.equal(p.rest, true); assert.ok(!mine.rest);
});
test('rivalry heat rises from a final and from press, and a hot rivalry makes a hostile, bigger match', async () => {
  const G = fresh(); const opp = 'SR'; const h0 = Lv.rivalries(G).find((r) => r.tid === opp)?.heat ?? G.s.rel[opp]?.heat ?? 10;
  G.s.fixtures.push({ n: 32, stage: 'F', home: G.user, away: opp, date: 'Dec 13', res: { winner: G.user, text: 'won' }, card: [] });
  Lv.seasonEnd(G, G.user); const h1 = G.s.rel[opp].heat; assert.ok(h1 >= h0 + 25 - 1e-9 || h1 === 100, `${h0} → ${h1}`); assert.match(G.s.rel[opp].why[0].t, /final/);
  Lv.notePress(G, 'KG', true); const h2 = G.s.rel.KG.heat; Lv.notePress(G, 'KG', true); assert.ok(G.s.rel.KG.heat > h2);
  // the war-of-words story also raises heat
  const st = Lv.startChain(G, chain('war'), true); const before = G.s.rel[st.tid].heat; Lv.answerStory(G, st.id, 0); assert.ok(G.s.rel[st.tid].heat > before);
  // press answers logged by other modules count, if they carry a team id
  const k0 = G.s.rel.PA ? G.s.rel.PA.heat : 10; G.logDecision('press', 'Q', 'Hit back hard', '', { tid: 'PA' }); const f = await playUser(G); void f; assert.ok(G.s.rel.PA.heat > k0 - 1);
  // rivalry match
  G.s.rel.CR = { respect: 40, heat: 70, why: [{ y: G.year, t: 'Press spat' }] }; const fx = { n: 50, home: G.user, away: 'CR', stage: 'L', res: null }; const opt = {}; Lv.beforeMatch(G, fx, opt);
  assert.equal(opt.hostile, 'CR'); assert.equal(fx.rivalry, 70); assert.ok(G.s.inbox.some((n) => /Rivalry night/.test(n.text)));
});
test('achievements: progress counts across seasons', () => {
  const G = fresh(); const M = G.s.manager;
  M.career.push({ year: 2026, team: 'LL', pos: 1, champ: true, runner: false }); let a = Lv.achievements(G).find((x) => x.k === 'dynasty'); assert.equal(a.have, 1);
  Lv.checkAch(G); assert.ok(G.s.living.ach.title); assert.ok(!G.s.living.ach.dynasty);
  M.career.push({ year: 2027, team: 'LL', pos: 3, champ: false, runner: true }, { year: 2028, team: 'LL', pos: 1, champ: true, runner: false });
  a = Lv.achievements(G).find((x) => x.k === 'dynasty'); assert.equal(a.have, 2); assert.equal(a.need, 5);
  assert.equal(Lv.achievements(G).find((x) => x.k === 'playoffs').have, 3); Lv.checkAch(G); assert.ok(G.s.living.ach.playoffs);
  G.s.living.cnt.lastOver = 2; assert.equal(Lv.achievements(G).find((x) => x.k === 'lastover').have, 2);
  const s2 = JSON.parse(JSON.stringify(G.s)); const G2 = new Game(s2); assert.equal(Lv.achievements(G2).find((x) => x.k === 'lastover').have, 2); assert.ok(G2.s.living.ach.title);
});
test('finals archive feeds the trophy cabinet', async () => {
  const G = fresh(); while (!G.leagueDone()) await G.playFixture(G.nextFixture(), null);
  G.setupPlayoffs(); let ch = null; while (!ch) { const f = G.nextFixture(); if (f) await G.playFixture(f, null); ch = G.advancePlayoffs(); }
  G.seasonAwards(ch); const F = G.s.finals[G.year]; assert.ok(F && F.card.length === 2 && F.res.text && F.champ === ch);
  // pretend the user won it, as the board review would record
  const c = G.s.manager.career[G.s.manager.career.length - 1]; c.champ = true; c.team = F.home;
  const cab = Lv.cabinet(G); assert.equal(cab[0].y, G.year); assert.equal(cab[0].link, `/scorecard/F${G.year}`); assert.ok(cab[0].text);
  G.startOffseason(); assert.ok(G.s.finals[G.year - 1], 'archive survives the new season');
});
test('reputation tiers, Nepal A threshold and challenge scenarios', () => {
  assert.equal(Lv.repTier(40), 'Local'); assert.equal(Lv.repTier(64), 'Respected'); assert.equal(Lv.repTier(70), 'National'); assert.equal(Lv.repTier(90), 'Legendary');
  const G = fresh(); G.s.manager.rep = 70; assert.ok(Lv.jobs(G).find((j) => j.kind === 'nepalA').locked); assert.equal(Lv.takeNepalA(G), false);
  G.s.manager.rep = 82; assert.ok(!Lv.jobs(G).find((j) => j.kind === 'nepalA').locked); assert.equal(Lv.takeNepalA(G), true);
  const H = Game.create('JB', { lang: 'en' }); Lv.applyChallenge(H, 'rescue'); assert.equal(H.teams.JB.board, 45); assert.equal(H.s.living.challenge.k, 'rescue');
  const N = Game.create('LL', { lang: 'en' }); Lv.applyChallenge(N, 'nostars'); assert.ok(N.teams.LL.squad.every((id) => N.P(id).nat === 'NEP' || ovr(N.P(id)) <= 70));
});
test('Hall of Fame ballot: retirees are voted on and your vote counts', () => {
  const G = fresh(); const p = G.P(G.teams[G.user].squad[0]); p.stats[2026] = { ...p.stats[2026], m: 40, r: 1500, w: 10, h: 1, ff: 5 }; p.retired = true; p.prevTeam = G.user; G.s.lastRetired = [p.id];
  Lv.offseason(G); const b = G.s.living.ballot; assert.ok(b && b.list[0].pid === p.id);
  Lv.castVote(G, p.id, true); Lv.closeBallot(G); const v = G.s.living.votes[0]; assert.equal(v.pid, p.id); assert.ok(v.in === (v.pct >= 75 || G.s.hof.some((h) => h.name === p.name)));
});
test('the deeper profile: traits are revealed with time; real players never get a flaw row or a quoted reply', () => {
  const G = fresh(); const real = G.P(G.teams[G.user].squad.find((id) => G.P(id).real !== false));
  assert.ok(Lv.traitRows(G, real).every((r) => r.k !== 'flaw')); assert.ok(!Lv.traitRows(G, real).find((r) => r.k === 'loyal').known);
  real.seen = 9; assert.ok(Lv.traitRows(G, real).find((r) => r.k === 'loyal').known);
  const r = Lv.talk(G, real, 'praise'); assert.ok(!/"/.test(r.reply)); assert.ok(G.s.log.some((e) => e.title === `Talk with ${real.name}`));
  assert.ok(Lv.talk(G, real, 'praise').none, 'once per match');
  const pr = Lv.projection(G, real); assert.ok(Number.isFinite(pr.to));
});
test('an old save loads, plays a fixture with the living league on, and round-trips', async () => {
  const G = new Game(oldSave()); assert.ok(G.s.living && G.s.finals && Object.keys(G.s.living.mgr).length === 7);
  for (let i = 0; i < 3; i++) await G.playFixture(G.nextFixture(), null);
  const G2 = new Game(JSON.parse(JSON.stringify(G.s))); assert.ok(G2.s.living.mgr); assert.ok(Object.keys(G2.teams).filter((t) => t !== G2.user).every((t) => typeof G2.teams[t].aggrBias === 'number'));
  await G2.playFixture(G2.nextFixture(), null);
});
