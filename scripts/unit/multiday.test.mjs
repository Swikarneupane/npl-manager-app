// The multi-day engine (phase 3, W2): Tests and first-class matches ball by ball, declarations and the
// follow-on, resuming mid-day, and a live multi-day world fixture recorded into its table.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Match } from '../../src/game/engine.js';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as C from '../../src/world/career.js';
import { registerComps } from '../../src/world/comps.js';
import { newSeason } from '../../src/world/comp.js';
import { dayOfDate } from '../../src/world/dates.js';
import { worldGame, newWorldMatch, recordWorld, injuries } from '../../src/world/match.js';

const SPEC = [['BAT', 78, 10, 'RM'], ['BAT', 76, 0, ''], ['BAT', 80, 20, 'OB'], ['BAT', 74, 0, ''], ['AR', 70, 62, 'RFM'], ['WK', 70, 0, ''], ['AR', 64, 70, 'SLA'], ['BOWL', 38, 80, 'RF'], ['BOWL', 30, 78, 'RFM'], ['BOWL', 22, 76, 'OB'], ['BOWL', 18, 79, 'LF']];
// A stand-in game with two XIs, d = rating shift for each side.
function mkG(dA = 0, dB = 0, user = null) {
  const players = {}; const teams = {}; const lus = {};
  for (const [t, d] of [['AAA', dA], ['BBB', dB]]) {
    const xs = SPEC.map(([role, bat, bowl, type], i) => ({ id: `${t}${i}`, name: `${t} Player${i}`, role, bat: bat + d, bowl: bowl ? bowl + d : 0, type, hand: 'R', form: 0, fit: 100, vsSpin: 0, temper: 65, field: 60 }));
    for (const p of xs) players[p.id] = p; teams[t] = { id: t, name: t };
    lus[t] = { xi: xs.map((p) => p.id), order: xs.map((p) => p.id), keeper: xs[5].id, captain: xs[0].id };
  }
  return { players, teams, user, s: { settings: {}, par: {} }, year: 2026, P: (id) => players[id], lineup: (t) => lus[t] };
}
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
async function withSeed(seed, fn) { const r0 = Math.random; Math.random = seeded(seed); try { return await fn(); } finally { Math.random = r0; } }

test('multi-day: sane totals, innings counts and draw rates over many matches', async () => {
  await withSeed(11, async () => {
    for (const [fmt, n, drawMax, drawMin] of [['Test', 30, 0.35, 0], ['FC4', 20, 0.5, 0], ['FC2', 20, 1, 0.25]]) {
      let runs = 0, balls = 0, wk = 0, draws = 0; const done = [];
      for (let k = 0; k < n; k++) {
        const m = new Match(mkG(), 'AAA', 'BBB', { fmt }); assert.ok(m.md && m.md.days > 1, 'a multi-day match');
        const r = await m.run({});
        assert.ok(m.inns.length >= 2 && m.inns.length <= 4, `${fmt}: ${m.inns.length} innings`);
        assert.ok(r.draw ? !r.winner : r.tie || (r.winner && r.loser && /won by (an innings and )?\d+ (runs?|wickets?)/.test(r.text)), r.text);
        if (r.draw) draws++;
        assert.ok(m.totBalls() + m.md.ib <= m.maxBalls + 6, 'the match fits its days');
        for (const [i, inn] of m.inns.entries()) {
          runs += inn.runs; balls += inn.balls; wk += inn.wkts; if (inn.wkts >= 10 || inn.dec) done.push(inn.runs);
          if (inn.dec) assert.ok(i < 3 && inn.wkts < 10, 'nobody declares in the fourth innings');
          if (inn.balls >= 96 * 6) assert.ok(inn.nbN >= 1, 'a new ball after 80 overs');
          // two-day sides declare early; spells, not quotas: no pace bowler is kept on for much longer than a long spell
          for (const id in inn.bw) { const s = inn.bw[id]; assert.ok(!s.sp || s.sp <= 16, `spell of ${s.sp}`); }
        }
      }
      const rpo = runs / (balls / 6), mean = done.reduce((a, x) => a + x, 0) / done.length;
      assert.ok(rpo > 2.8 && rpo < 3.9, `${fmt} run rate ${rpo.toFixed(2)}`);
      assert.ok(runs / wk > 24 && runs / wk < 42, `${fmt} runs a wicket ${(runs / wk).toFixed(1)}`);
      assert.ok(mean > (fmt === 'FC2' ? 150 : 220) && mean < 360, `${fmt} completed innings ${mean.toFixed(0)}`);
      assert.ok(draws / n <= drawMax && draws / n >= drawMin, `${fmt} draws ${draws}/${n}`);
    }
  });
});

test('multi-day: the batting side declares, and the follow-on can be enforced or waived', async () => {
  await withSeed(5, async () => {
    // the user declares at 150 in the first innings (with the captain's declarations off)
    let declared = 0;
    for (let k = 0; k < 6 && !declared; k++) {
      const m = new Match(mkG(0, 0, 'AAA'), 'AAA', 'BBB', { fmt: 'Test', weather: 0 }); m.md.autoDec = false;
      await m.run({ toss: () => 'bat', beforeOver: (inn) => { if (inn.bat === 'AAA' && m.inns.length === 1 && inn.runs >= 150) inn.decReq = true; } });
      const i1 = m.inns[0]; if (i1.bat !== 'AAA' || i1.wkts >= 10) continue;
      assert.ok(i1.dec && i1.runs >= 150 && i1.runs < 190, `declared at ${i1.runs}`); assert.equal(m.inns[1].bat, 'BBB');
      assert.ok(m.log.some((e) => /declare at/.test(e.t))); declared++;
    }
    assert.ok(declared, 'a declaration happened');
    // the follow-on: a strong side bowls out a weak one; enforced, the weak side bats again; waived, it does not
    for (const enforce of [true, false]) {
      let asked = 0;
      for (let k = 0; k < 10 && !asked; k++) {
        const m = new Match(mkG(14, -22, 'AAA'), 'AAA', 'BBB', { fmt: 'Test', weather: 0 });
        await m.run({ toss: () => 'bat', followOn: (mm, info) => { asked++; assert.ok(info.lead >= 200 && info.left > 0); return enforce; } });
        if (!asked) continue;
        assert.equal(m.md.fo, enforce); assert.equal(m.inns[2].bat, enforce ? m.inns[1].bat : m.inns[0].bat);
        assert.ok(m.log.some((e) => (enforce ? /enforce the follow-on/ : /bat again/).test(e.t)));
      }
      assert.ok(asked, 'the follow-on was offered');
    }
    // AI captains: across matches, some declare and some enforce the follow-on
    let dec = 0, fo = 0, inn = 0;
    for (let k = 0; k < 16; k++) { const m = new Match(mkG(k % 2 ? 12 : 0, k % 2 ? -18 : 0), 'AAA', 'BBB', { fmt: 'Test' }); const r = await m.run({}); dec += m.inns.filter((i) => i.dec).length; if (m.md.fo) fo++; if (/innings/.test(r.text)) inn++; }
    assert.ok(dec >= 2 && fo >= 1 && inn >= 1, `declarations ${dec}, follow-ons ${fo}, innings wins ${inn}`);
  });
});

test('multi-day: a match saved mid-day resumes exactly where it stopped', async () => {
  class Stop extends Error {}
  const G = mkG(); let snap = null, rs = null;
  // play to the middle of the afternoon on day 2, in mid-over, and snapshot as the app does after a ball
  let rng = seeded(42); const r0 = Math.random; Math.random = () => rng();
  try {
    const m = new Match(G, 'AAA', 'BBB', { fmt: 'Test', weather: 0.1 });
    try { await m.run({ afterBall: (inn, mm) => { if (mm.md.day === 2 && mm.md.sess === 1 && inn.balls % 6 === 3) { snap = JSON.stringify(mm.serialize()); rs = rng(); throw new Stop(); } } }); }
    catch (e) { if (!(e instanceof Stop)) throw e; }
    assert.ok(snap, 'reached day 2');
    const finish = async () => { rng = seeded(Math.floor(rs * 1e9)); const m2 = Match.restore(mkG(), JSON.parse(snap)); const d = JSON.parse(snap);
      assert.equal(m2.md.day, 2); assert.equal(m2.md.sess, 1); assert.equal(m2.dayB(), d.inns.reduce((a, i) => a + i.balls, 0) + d.md.ib - d.md.d0);
      const before = m2.inns.map((i) => [i.runs, i.wkts, i.balls]);
      await m2.run({ chooseBowler: async () => null, review: async () => false });
      before.forEach(([r, w, b], k) => { const i = m2.inns[k]; assert.ok(i.runs >= r && i.wkts >= w && i.balls >= b, 'the save is the start of the rest'); });
      assert.ok(m2.result && m2.md.day >= 2); return JSON.stringify([m2.result, m2.inns.map((i) => [i.bat, i.runs, i.wkts, i.balls]), m2.md]); };
    const a = await finish(), b = await finish();
    assert.equal(a, b, 'the same save and the same luck play out the same match');
  } finally { Math.random = r0; }
});

test('multi-day: a live Test in the world records into the table with draw points', async () => {
  const ROLES = ['BAT', 'BAT', 'BAT', 'BAT', 'WK', 'WK', 'AR', 'AR', 'AR', 'BOWL', 'BOWL', 'BOWL', 'BOWL', 'BOWL', 'BOWL'];
  const mkNation = (code, lvl) => ({ code, name: code, member: 'associate', players: Array.from({ length: 20 }, (_, i) => { const role = ROLES[i % 15]; return [`${code.toLowerCase()}-md${i}`, `${code} Multi ${i}`, code, 1995 + (i % 10), role, role === 'BOWL' ? 25 : lvl + (i % 7) - 3, role === 'BAT' || role === 'WK' ? 0 : lvl + (i % 5) - 2, ['RFM', 'OB', 'LB', 'SLA', 'RF'][i % 5], 'R', {}, [code]]; }) });
  P.setDB([mkNation('SCO', 64), mkNation('NAM', 62)]);
  const G = Game.create('LL', {}); C.ensure(G); C.takeJob(G, 'nation', 'NEP');
  registerComps({ CT_MD: { id: 'CT_MD', name: 'Multi-day test', fmt: 'FC4', kind: 'international', points: { win: 12, draw: 4, loss: 0 }, stages: [{ type: 'series', n: 1 }] } });
  const def = ST.defOf({ comp: 'CT_MD' }); const day = G.s.wd.day + 3;
  const S = newSeason(def, 2026, ['NEP', 'SCO'], day, day + 8); S.id = 'CT_MD-x'; G.s.wd.seasons[S.id] = S; const f = S.fx[0]; assert.equal(f.fmt, 'FC4');
  const PG = worldGame(G, S, f); const inj0 = injuries(PG); const m = newWorldMatch(PG, f);
  assert.ok(m.md && m.md.days === 4);
  // a wet match: most of every day is lost, so it ends in a draw
  m.md.lost = [80, 80, 80, 80];
  await m.run({});
  assert.ok(m.result.draw, m.result.text);
  const res = recordWorld(G, S, f, m, inj0);
  assert.ok(res.draw && res.live && f.res === res && res.text === 'Match drawn');
  assert.equal(f.card.length, m.inns.length); assert.ok(f.card.every((c) => c.eng && c.bat.length));
  const t = S.tables.series; for (const k of ['NEP', 'SCO']) { assert.equal(t[k].d, 1); assert.equal(t[k].pts, 4); assert.equal(t[k].p, 1); }
  const st = G.s.wd.st[S.id]; for (const id of m.lineups.NEP.xi) assert.equal(st[id][0], 1);
  assert.ok(!G.s.liveMatch);
});
