// Step 7: staff grades, contract talks, the board meeting, sponsors and the recruitment plan.
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import { ovr } from '../../src/game/engine.js';
import * as Office from '../../src/game/office.js';

const fresh = () => Game.create('LL', { lang: 'en' });
const seasonOn = (G) => { G.aiPreseason(); for (const p of G.osFreeAgents()) { if (G.osCount(G.user) >= 6) break; G.signFA(p.id); } G.startSeason(); return G; };

// ----- board -----
test('board: approval odds drop with each extra request', () => {
  const G = fresh(); G.teams.LL.balance = 500;
  const one = Office.approvalOdds(G, 'analysis', ['analysis']); const two = Office.approvalOdds(G, 'analysis', ['analysis', 'gym']);
  assert.ok(two < one, `${two} < ${one}`); assert.equal(one - two, 15);
  assert.equal(Office.approvalOdds(G, 'gym', ['analysis']), Office.approvalOdds(G, 'gym', ['analysis', 'gym']));
});
test('board: approved upgrades have their effect', () => {
  const G = fresh(); const t = G.teams.LL; const st = G.s.staff.LL;
  // gym: injuries a match shorter for the user only
  st.physio.level = 2; const before = G.injuryLength('LL', 4); G.s.facilities.gym = G.year; assert.equal(G.injuryLength('LL', 4), before - 1); assert.equal(G.injuryLength('KG', 4), G.injuryLength('KG', 4));
  // analysis room: better advice; wage budget: a bigger staff budget
  const q0 = Office.adviceQuality(G); G.s.facilities.analysis = G.year; assert.ok(Office.adviceQuality(G) > q0);
  const b0 = Office.staffBudget(G); G.s.facilities.wages = G.year; assert.equal(Office.staffBudget(G), b0 + 10);
  // nets: one more development step for a young player with room to grow
  const p = t.squad.map((id) => G.P(id)).find((x) => x.age < 24 && x.pot - ovr(x) >= 6 && x.role === 'BAT');
  if (p) { delete G.s.facilities.nets; const c = JSON.parse(JSON.stringify(p)); G.develop(p); const a = p.coachDev; Object.assign(p, c); G.s.facilities.nets = G.year; G.develop(p); assert.ok(p.coachDev >= a, 'nets add development'); }
  // putting a request through: approved ones are stored and paid for
  G.s.office.meeting = { y: G.year, done: false }; t.balance = 500; t.board = 100; G.s.pillars.finances = 100;
  assert.equal(Office.approvalOdds(G, 'scout', ['scout']), 95);
  for (let i = 0; i < 30 && !Office.facility(G, 'scout'); i++) { G.s.office.meeting = { y: G.year, done: false }; Office.putRequests(G, ['scout']); }
  assert.ok(Office.facility(G, 'scout')); assert.equal(t.balance, 495);
  assert.ok(G.s.log.some((e) => e.kind === 'board'));
});
test('board: pillars blend into the review and default pillars change nothing', () => {
  const G = fresh(); assert.equal(Office.pillarDelta(G), 0);
  for (const k in G.s.pillars) G.s.pillars[k] = 90; assert.ok(Office.pillarDelta(G) > 5);
  const t = G.teams.LL; t.objective = { rank: 8, txt: 'test' }; t.board = 50; const st = G.standings(); const o = st.filter((x) => x.id !== 'LL');
  G.boardReview(o[0].id, o[1].id, st); assert.equal(t.board, 50 + 14 + Math.min(8, Office.pillarDelta(G) + (G.s.lastReview.sec || 0))); // the pillars and secondary objectives add at most 8
});

// ----- contracts -----
function talkGame() { const G = seasonOn(fresh()); G.s.phase = 'seasonEnd'; const p = G.teams.LL.squad.map((id) => G.P(id)).filter((x) => x.nat === 'NEP').sort((a, b) => b.value - a.value)[2]; p.contractTo = G.year; return { G, p }; }
test('contracts: signing chance responds to wage, length and role', () => {
  const { G, p } = talkGame(); const talk = Office.openTalk(G, p.id); const a = talk.ask;
  const base = { wage: a.wage, yrs: a.yrs, role: a.role, po: false, pom: false, rel: false };
  const c = (o) => Office.signChance(G, p, talk, { ...base, ...o });
  assert.ok(c({ wage: a.wage * 1.3 }) > c({}), 'more wage, more chance'); assert.ok(c({ wage: a.wage * 0.6 }) < c({}));
  assert.ok(c({ yrs: a.yrs === 4 ? 1 : 4 }) < c({}), 'the wrong length costs');
  const lower = Office.ROLES[Math.max(0, Office.ROLES.indexOf(a.role) - 1)]; if (lower !== a.role) assert.ok(c({ role: lower }) < c({}) - 20, 'a lesser role costs a lot');
});
test('contracts: three rounds end the talks; a promised role creates a promise', () => {
  const { G, p } = talkGame(); const talk = Office.openTalk(G, p.id);
  for (let i = 0; i < 3; i++) { const r = Office.makeOffer(G, p.id, { wage: 2, yrs: 4, role: 'Rotation' }); assert.equal(r.signed, false); }
  assert.equal(talk.status, 'stalled'); assert.ok(Office.makeOffer(G, p.id, { wage: 2, yrs: 1, role: 'Rotation' }).err);
  assert.equal(G.s.log.filter((e) => e.kind === 'contract').length, 3);
  // a generous offer to another player signs, updates his deal and makes a role promise
  const q = G.teams.LL.squad.map((id) => G.P(id)).find((x) => x.nat === 'NEP' && x.id !== p.id && !x.marquee); q.contractTo = G.year;
  const t2 = Office.openTalk(G, q.id); const wage = Math.min(Office.wageRoom(G, q), t2.ask.wage * 1.5);
  const r = Office.makeOffer(G, q.id, { wage, yrs: t2.ask.yrs, role: 'Key player', po: true, pom: true, rel: true });
  if (r.signed) { assert.ok(q.deal && q.salary === q.deal.wage); assert.equal(q.contractTo, G.year + t2.ask.yrs);
    assert.ok(G.s.promises.some((pr) => pr.pid === q.id && pr.kind === 'role' && pr.role === 'Key player')); }
  else assert.ok(r.c < 75);
});
test('contracts: a promised role always becomes a tracked promise when he signs', () => {
  const { G, p } = talkGame(); const talk = Office.openTalk(G, p.id); talk.rivals = []; G.teams.LL.purse = 80; p.happy = 80;
  const role = talk.ask.role === 'Rotation' ? 'Regular' : talk.ask.role;
  const r = Office.makeOffer(G, p.id, { wage: Math.min(Office.wageRoom(G, p), talk.ask.wage * 1.5), yrs: talk.ask.yrs, role, po: true, pom: true, rel: true });
  assert.ok(r.c >= 75 && r.signed, `chance ${r.c}`);
  const pr = G.s.promises.find((x) => x.pid === p.id && x.kind === 'role'); assert.ok(pr); assert.equal(pr.role, role); assert.ok(p.deal);
});

// ----- staff -----
test('staff: old levels migrate to grades and staffLevel still works', () => {
  const s = oldSave(); const G = new Game(s); const st = G.s.staff[G.user];
  for (const k of ['bat', 'bowl', 'physio']) { const x = st[k]; if (!x) continue; assert.ok('ABCD'.includes(x.grade), x.grade); assert.equal(G.staffLevel(G.user, k), x.level); assert.equal(x.grade, Office.gradeOfL(x.level)); }
  st.physio.level = 5; assert.equal(G.injuryLength(G.user, 3), 1); assert.equal(Office.gradeOfL(5), 'A');
  // AI teams get staff in every post; the user's new posts start vacant
  for (const tid in G.teams) if (tid !== G.user) for (const [k] of [['assistant'], ['spin'], ['mental'], ['scout']]) assert.ok(G.s.staff[tid][k] && G.staffLevel(tid, k) > 0);
  assert.equal(G.staffLevel(G.user, 'mental'), 0);
});
test('staff: new games have nine posts, graded A-D, with interviews revealing grades', () => {
  const G = fresh(); const st = G.s.staff.LL; assert.equal(Object.keys(st).length, 9); assert.equal(st.mental, null);
  const c = G.staffCandidates('mental'); assert.equal(c.length, 3); assert.ok(c.every((x) => x.level >= 1 && x.level <= 4));
  assert.equal(Office.interview(G, 'mental', 0), null); assert.equal(Office.candGrade(c[0]), Office.gradeOfL(c[0].level));
  assert.equal(G.hireStaff('mental', 0), null); assert.ok(G.staffLevel('LL', 'mental') >= 1);
});

// ----- sponsors -----
test('sponsors: conditions are judged after matches', () => {
  const G = seasonOn(fresh()); const t = G.teams.LL;
  G.s.office.sp.offers = [{ id: 'x1', name: 'Phewa Mobile', slot: 'Shirt front', fee: 40, cond: { k: 'wins', n: 4, of: 7, cut: 0.3 } }];
  const b0 = t.balance; Office.acceptSponsor(G, 'x1'); assert.equal(t.balance, b0 + 40);
  const d = G.s.office.sp.deals[0]; const f = (w) => ({ stage: 'L', home: 'LL', away: 'KG', res: { winner: w } });
  Office.judgeSponsors(G, null, f('KG')); Office.judgeSponsors(G, null, f('KG')); Office.judgeSponsors(G, null, f('KG')); assert.equal(d.status, 'live');
  Office.judgeSponsors(G, null, f('KG')); assert.equal(d.status, 'done'); assert.equal(d.met, false); assert.equal(t.balance, b0 + 40 - 12);
  // an ambassador condition met
  G.s.office.sp.offers = [{ id: 'x2', name: 'Bheri Noodles', slot: 'Sleeve', fee: 15, cond: { k: 'amb', pid: t.squad[0], n: 2, of: 3, cut: 0.4 } }]; Office.acceptSponsor(G, 'x2');
  const d2 = G.s.office.sp.deals[1]; const m = { lineups: { LL: { xi: [t.squad[0]] } } };
  Office.judgeSponsors(G, m, f('LL')); Office.judgeSponsors(G, m, f('KG')); assert.equal(d2.status, 'done'); assert.equal(d2.met, true);
});

// ----- recruitment -----
test('recruitment: saving the plan writes the shortlist and the gaps', () => {
  const G = fresh(); G.s.phase = 'auction'; for (const id of G.teams.LL.squad.slice(0, 10)) G.releasePlayer(id); G.s.shortlist = [];
  const gaps = Office.gapsFor(G); assert.ok(gaps.length >= 2);
  Office.setGapPriority(G, gaps[0].k, 'Low'); Office.setGapPriority(G, gaps[0].k, 'High');
  const b = Office.splitBudget(G, Office.gapsFor(G)); const dom = Office.gapsFor(G).filter((g) => g.pool === 'dom').reduce((a, g) => a + b[g.k], 0);
  assert.ok(Math.abs(dom - G.teams.LL.purse) <= 2, `domestic budgets add up to the purse (${dom})`);
  const n = Office.savePlan(G); assert.ok(n > 0 && G.s.shortlist.length === n);
  assert.ok(G.s.shortlist.every((e) => e.pid && e.max >= 0 && 'ABC'.includes(e.priority)));
  assert.ok(Office.planSaved(G) && G.s.office.plan.gaps.length === gaps.length);
  const p = G.P(G.s.shortlist[0].pid); assert.ok(G.s.office.plan.gaps.some((g) => Office.gapFits(g, p)));
});

// ----- old save -----
test('the old save loads, plays a fixture and round-trips with office state', async () => {
  const G = new Game(oldSave()); assert.ok(G.s.office && G.s.facilities);
  await G.playFixture(G.nextFixture(), null);
  const G2 = new Game(JSON.parse(JSON.stringify(G.s))); assert.ok(G2.s.office.feed); assert.ok(Office.todayTasks(G2));
  assert.ok(JSON.stringify(G2.s.office).length < 30000);
});
