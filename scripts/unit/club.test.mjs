// Between matches: training week, workload, dressing room promises and mood, scouting and the academy.
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import { ovr } from '../../src/game/engine.js';
import { injuryRisk } from '../../src/game/depth.js';
import { projectWeek, setSession, planDays, beforeMatch, judgeRolePromises, promiseStatus, spreadMood, hierarchy, groupOf, breakHit, narrow, initRange, sendScout, passDays, academy, signToAcademy, promote, talkOptions, holdTalk, todayTasks } from '../../src/game/club.js';
import { potRange } from '../../src/lib/util.js';
import { addPromise } from '../../src/game/depth.js';

const fresh = () => Game.create('LL', { lang: 'en' });
// A season under way, with the user's first match played.
async function midSeason() {
  const G = fresh(); G.aiPreseason(); G.startSeason();
  for (;;) { const f = G.nextFixture(); const mine = f.home === G.user || f.away === G.user; await G.playFixture(f, null); if (mine) break; }
  while (G.nextFixture() !== G.userNext()) await G.playFixture(G.nextFixture(), null);
  return G;
}
const allDays = (G, pair) => { for (const d of planDays(G)) if (d.sessions) { setSession(G, d.t, 0, pair[0]); setSession(G, d.t, 1, pair[1]); } };

test('training: more load means less freshness and more development; rest restores', async () => {
  const G = await midSeason(); const sq = G.teams[G.user].squad.map((id) => G.P(id)); for (const p of sq) p.fit = 80;
  const rest = projectWeek(G, [['Rest', 'Rest'], ['Rest', 'Rest'], ['Rest', 'Rest']]);
  const easy = projectWeek(G, [['Recovery', 'Analysis'], ['Nets', 'Fielding'], ['Analysis', 'Fielding']]);
  const hard = projectWeek(G, [['Nets', 'Match simulation'], ['Nets', 'Match simulation'], ['Match simulation', 'Nets']]);
  assert.ok(hard.fresh < easy.fresh && easy.fresh < rest.fresh, `${hard.fresh} < ${easy.fresh} < ${rest.fresh}`);
  assert.ok(hard.dev > easy.dev && easy.dev > rest.dev); assert.ok(hard.sharp > rest.sharp);
  assert.ok(rest.fresh > 80, 'rest restores fitness');
  // applied before the match: fitness follows the plan
  allDays(G, ['Rest', 'Rest']); const f = G.userNext(); const p = sq.find((x) => !x.inj); const f0 = p.fit;
  beforeMatch(G, f, {}); assert.ok(p.fit > f0, `rest restores in the match run-in (${f0} → ${p.fit})`);
  assert.equal(G.teams[G.user].training, 'Light', 'the team intensity follows the plan');
});
test('training: development points turn into rating, capped by potential', async () => {
  const G = await midSeason(); allDays(G, ['Nets', 'Match simulation']);
  const p = G.teams[G.user].squad.map((id) => G.P(id)).find((x) => x.pot > ovr(x) + 2 && !x.inj) || G.P(G.teams[G.user].squad[0]);
  p.tdev = 39.9; p.pot = Math.max(p.pot, ovr(p) + 3); const o = ovr(p); beforeMatch(G, G.userNext(), {});
  assert.ok(ovr(p) >= o + 1 || p.inj, 'crossed the step: +1');
  const q = G.P(G.teams[G.user].squad[1]); q.pot = ovr(q); q.tdev = 200; const oq = ovr(q); G.s.club.lastN = null; G.s.club.applied = null;
  beforeMatch(G, G.userNext(), {}); assert.equal(ovr(q), oq, 'no growth past potential');
});
test('workload: a heavier plan raises the training load and the injury risk', async () => {
  const G = await midSeason(); const p = G.P(G.teams[G.user].squad.find((id) => G.P(id).bowl >= 50));
  allDays(G, ['Rest', 'Rest']); beforeMatch(G, G.userNext(), {}); const low = injuryRisk(G, p);
  const G2 = await midSeason(); const p2 = G2.P(G2.teams[G2.user].squad.find((id) => G2.P(id).bowl >= 50));
  allDays(G2, ['Nets', 'Match simulation']); beforeMatch(G2, G2.userNext(), {});
  p2.age = p.age; p2.fit = p.fit; p2.wl = p.wl; p2.type = p.type; p2.bowl = p.bowl;
  assert.ok(p2.load > p.load, `load ${p2.load} > ${p.load}`); assert.ok(injuryRisk(G2, p2) > low);
  // and overs bowled feed it too
  const r0 = injuryRisk(G, p); p.wl = [{ n: 1, y: G.year, dt: G.todayTime(), o: 4 }, { n: 2, y: G.year, dt: G.todayTime(), o: 4 }, { n: 3, y: G.year, dt: G.todayTime(), o: 8 }];
  assert.ok(injuryRisk(G, p) > r0);
});
test('assistant mode: the coaches plan the week and it is applied', async () => {
  const G = await midSeason(); allDays(G, ['Match simulation', 'Match simulation']); assert.equal(G.s.club.plan.by, 'you');
  G.s.settings.assistant = true; const f = G.userNext(); beforeMatch(G, f, {});
  assert.equal(G.s.club.last.by, 'coaches'); assert.ok(G.s.club.last.sessions.every((s) => !(s[1] === 'Match simulation' && s[2] === 'Match simulation')));
  assert.ok(!todayTasks(G).some((t) => t.key === 'club-week'), 'no week task with the assistant on');
});

test('promises: role promises are judged kept, at risk or broken on available matches', () => {
  const G = fresh(); const t = G.teams[G.user]; const [a, b] = t.squad;
  const pa = addPromise(G, a, 'role', 'Regular', { role: 'Regular' }); const pb = addPromise(G, b, 'role', 'Key', { role: 'Key player' });
  pa.av = 6; pa.pl = 4; pb.av = 6; pb.pl = 2;
  assert.equal(promiseStatus(G, pa).status, 'open'); assert.equal(promiseStatus(G, pb).status, 'risk');
  const h0 = G.P(b).happy; judgeRolePromises(G);
  const log = G.s.promiseLog.slice(-2); assert.deepEqual(log.map((e) => e.result).sort(), ['broken', 'kept']);
  assert.ok(G.P(b).happy <= h0 - 15, 'broken: his happiness falls'); assert.equal(G.s.promises.length, 0);
});
test('promises: a broken promise hits the player and, more mildly, his group', () => {
  const G = fresh(); const t = G.teams[G.user]; for (const id of t.squad) G.P(id).happy = 70;
  const pid = t.squad.find((id) => { const g = groupOf(G, id); return g && g.list.length > 2; }); const g = groupOf(G, pid);
  const mate = g.list.find((p) => p.id !== pid); const out = t.squad.map((id) => G.P(id)).find((p) => !g.list.includes(p));
  breakHit(G, pid); const p = G.P(pid);
  assert.equal(p.happy, 50); assert.ok(mate.happy < 70 && mate.happy > p.happy, 'group: milder'); assert.equal(out.happy, 70, 'other groups untouched');
});
test("dressing room: the leaders' mood spreads", () => {
  const G = fresh(); const H = hierarchy(G); assert.ok(H.leaders.length >= 1 && H.leaders.some((p) => p.id === G.teams[G.user].captainId));
  for (const id of G.teams[G.user].squad) G.P(id).happy = 70; for (const p of H.leaders) p.happy = 30;
  const o = H.others[0] || H.influential[0]; spreadMood(G); assert.ok(o.happy < 70, `${o.happy}`);
  for (const p of H.leaders) p.happy = 100; const o0 = o.happy; spreadMood(G); assert.ok(o.happy > o0);
});
test('one-to-ones: real players talk cricket only, without quotes', () => {
  const G = fresh(); const real = G.P(G.teams[G.user].squad.find((id) => G.P(id).real !== false)); real.dropN = 3;
  const opts = talkOptions(G, real); assert.ok(opts.length >= 3 && opts.length <= 4);
  for (const o of opts) { assert.ok(!/[“”"]/.test(o.reply), o.reply); assert.ok(!/home|exam/i.test(o.label)); }
  const e = holdTalk(G, real.id, 'role'); assert.ok(e); assert.ok(G.s.promises.some((pr) => pr.pid === real.id && pr.kind === 'role'));
  assert.equal(holdTalk(G, real.id, 'explain'), null, 'one talk per player between matches');
  assert.ok(G.s.log.some((d) => d.kind === 'talk'));
});

test('scouting: a better scout narrows the potential range faster', () => {
  const G = fresh(); const mk = () => { const p = G.genNepali(17, 'Karnali'); p.pot = ovr(p) + 20; initRange(p); return p; };
  const a = mk(), c = mk(); a.potLo = c.potLo = a.pot - 10; a.potHi = c.potHi = a.pot + 8; c.pot = a.pot; c.bat = a.bat; c.bowl = a.bowl; c.role = a.role;
  narrow(a, 0.5); narrow(c, 0.22); assert.ok(a.potHi - a.potLo < c.potHi - c.potLo);
  assert.match(potRange(a), /–/); for (let i = 0; i < 12; i++) narrow(a, 0.5); assert.equal(potRange(a), String(a.pot)); assert.ok(a.scouted);
});
test('scouting: scouts file reports as days pass', () => {
  const G = fresh(); const s = G.s.club.scouts[0]; assert.equal(sendScout(G, s.id, 'Karnali'), null);
  passDays(G, 9); assert.ok(G.s.club.seen.Karnali >= 3 && G.s.club.reports.length >= 1); assert.equal(s.prov, null, 'back home');
  const r = G.s.club.reports[0]; assert.ok(r.to[1] - r.to[0] <= r.from[1] - r.from[0]);
});
test('academy: players stay out of the auction pool until promoted', () => {
  const G = fresh(); const A = academy(G); assert.ok(A.length >= 5); for (const p of A) { assert.equal(p.team, null); assert.ok(p.age <= 19); }
  G.setupAuction(); const lots = new Set(G.s.auction.lots.map((l) => l.pid)); for (const p of A) assert.ok(!lots.has(p.id), p.name);
  const kid = G.genNepali(17, 'Koshi'); G.players[kid.id] = kid; assert.equal(signToAcademy(G, kid.id), null); assert.equal(kid.academy, G.user);
  const t = G.teams[G.user]; while (t.squad.length >= 22) G.releasePlayer(t.squad[t.squad.length - 1]); t.purse = Math.max(t.purse, 5);
  const y0 = G.s.pillars.youth; assert.equal(promote(G, A[0].id), null); assert.equal(A[0].team, G.user); assert.ok(!A[0].academy); assert.ok(G.s.pillars.youth > y0);
});
test('old save: loads, plays a fixture and round-trips', async () => {
  const G = new Game(oldSave()); assert.ok(G.s.club && G.s.club.scouts.length === 3); assert.ok(academy(G).length >= 5);
  for (const p of Object.values(G.players)) if (!p.retired) assert.ok(p.potLo != null && p.potHi >= p.potLo, p.name);
  for (let i = 0; i < 3; i++) await G.playFixture(G.nextFixture(), null);
  const G2 = new Game(JSON.parse(JSON.stringify(G.s))); assert.equal(G2.s.club.scouts.length, 3); planDays(G2); projectWeek(G2);
});
