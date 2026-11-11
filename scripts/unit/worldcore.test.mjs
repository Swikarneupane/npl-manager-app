// World core (phase 3, W1): fast sim, competitions, the clock.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import { fastMatch } from '../../src/world/fastsim.js';
import { newSeason, record, roundRobin, standings } from '../../src/world/comp.js';
import { dayOfDate, dayOfLabel, short, label } from '../../src/world/dates.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import { registerComps } from '../../src/world/comps.js';

const mkNation = (code, lvl) => ({ code, name: code, member: 'associate', players: Array.from({ length: 22 }, (_, i) => { const role = ['BAT', 'BAT', 'BAT', 'BAT', 'WK', 'WK', 'AR', 'AR', 'AR', 'BOWL', 'BOWL', 'BOWL', 'BOWL', 'BOWL', 'BOWL'][i % 15]; return [`${code.toLowerCase()}-t${i}`, `${code} Test ${i}`, code, 1995 + (i % 10), role, role === 'BOWL' ? 25 : lvl + (i % 7) - 3, role === 'BAT' || role === 'WK' ? 0 : lvl + (i % 5) - 2, ['RFM', 'OB', 'LB', 'SLA', 'RF'][i % 5], 'R', {}, [code]]; }) });
const side = (code, ps) => ({ id: code, xi: ps.slice(0, 11), order: ps.slice(0, 11) });
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

test('dates: day numbers round-trip and windows wrap the new year', () => {
  assert.equal(dayOfDate(2026, 0, 1), 0); assert.equal(short(dayOfLabel('Nov 3', 2026)), 'Nov 3'); assert.match(label(dayOfDate(2026, 10, 3)), /3 Nov 2026/);
});
test('fast sim: T20 and ODI totals, hundreds and top scores sit in a realistic range', () => {
  P.setDB([mkNation('AAA', 66), mkNation('BBB', 66)]); const G = Game.create('LL', {});
  const a = side('AAA', P.poolOf(G, 'AAA')), b = side('BBB', P.poolOf(G, 'BBB'));
  for (const [fmt, lo, hi] of [['T20', 120, 190], ['ODI', 210, 310]]) {
    let tot = 0, hund = 0, hs = 0; const rnd = seeded(7); const n = 400;
    for (let k = 0; k < n; k++) { const m = fastMatch(a, b, fmt, rnd); tot += m.inns[0].r; for (const i of m.inns) for (const c of i.bat) { if (c[1] >= 100) hund++; hs = Math.max(hs, c[1]); } }
    const avg = tot / n; assert.ok(avg > lo && avg < hi, `${fmt} average ${avg}`); assert.ok(hs < (fmt === 'T20' ? 140 : 210), `${fmt} top score ${hs}`);
    assert.ok(hund / n < (fmt === 'T20' ? 0.08 : 0.9), `${fmt} hundreds a match ${hund / n}`);
  }
});
test('fast sim: a chase stops when it is won, and wickets never pass 10', () => {
  P.setDB([mkNation('AAA', 80), mkNation('BBB', 50)]); const G = Game.create('LL', {});
  const rnd = seeded(3);
  for (let k = 0; k < 200; k++) { const m = fastMatch(side('AAA', P.poolOf(G, 'AAA')), side('BBB', P.poolOf(G, 'BBB')), 'T20', rnd); const [i1, i2] = m.inns;
    assert.ok(i1.w <= 10 && i2.w <= 10); if (m.winner === i2.t) assert.ok(i2.r - i1.r <= 6, `chase overshoot ${i2.r} v ${i1.r}`); }
});
test('round robin: every pair meets once per leg', () => {
  const rr = roundRobin(['a', 'b', 'c', 'd', 'e'], 2); const seen = {};
  for (const r of rr) for (const [x, y] of r) { const k = [x, y].sort().join(); seen[k] = (seen[k] || 0) + 1; }
  assert.equal(Object.keys(seen).length, 10); assert.ok(Object.values(seen).every((v) => v === 2));
});
const playAll = (S, def, rnd) => { for (let g = 0; g < 500 && !S.done; g++) { const f = S.fx.find((x) => !x.res); if (!f) break; const aw = rnd() < 0.5; record(S, def, f, { w: aw ? f.a : f.b, l: aw ? f.b : f.a, sc: [[f.a, 150, 7, 120], [f.b, 140, 9, 120]], text: '' }, rnd); } };
test('knockouts: groups to semi-finals to a final, and IPL-style playoffs reach a champion', () => {
  const rnd = seeded(11);
  const wc = { id: 'WC', fmt: 'T20', stages: [{ type: 'rr', groups: [['a', 'b', 'c', 'd'], ['e', 'f', 'g', 'h']] }, { type: 'ko', plan: 'semis' }] };
  const S = newSeason(wc, 2026, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 100, 140, rnd); playAll(S, wc, rnd);
  assert.ok(S.done && S.champ && S.runner && S.champ !== S.runner); assert.equal(S.fx.filter((f) => f.ko).length, 3);
  const ipl = { id: 'IPL', fmt: 'T20', stages: [{ type: 'rr', legs: 2 }, { type: 'ko', plan: 'ipl4' }] };
  const S2 = newSeason(ipl, 2026, ['a', 'b', 'c', 'd', 'e', 'f'], 100, 160, rnd); playAll(S2, ipl, rnd);
  assert.ok(S2.done && S2.champ); assert.deepEqual(S2.fx.filter((f) => f.ko).map((f) => f.ko).sort(), ['EL', 'F', 'Q1', 'Q2']);
});
test('Super Six: the top three of each group carry their results against fellow qualifiers', () => {
  const rnd = seeded(5); const def = { id: 'Q', fmt: 'ODI', stages: [{ type: 'rr', groups: [['a', 'b', 'c', 'd', 'e'], ['f', 'g', 'h', 'i', 'j']] }, { type: 'super', take: 3, carry: true }, { type: 'ko', plan: 'final' }] };
  const S = newSeason(def, 2026, 'abcdefghij'.split(''), 10, 60, rnd); playAll(S, def, rnd);
  assert.ok(S.done && S.champ); assert.equal(Object.keys(S.tables.super).length, 6);
  const carried = Object.values(S.tables.super).reduce((a, r) => a + r.p, 0); assert.ok(carried > 18, 'super stage includes carried games');
});
test('the clock: other matches are simmed, the user\'s fixture stops it, stats are kept', () => {
  P.setDB([mkNation('SCO', 68), mkNation('NAM', 66), mkNation('OMA', 64)]);
  registerComps({ T_EV: { id: 'T_EV', name: 'test events', fmt: 'ODI', kind: 'international', stages: [{ type: 'events', size: 3, legs: 2, count: 4 }] } }, (G, y) => (y === 2027 ? [{ comp: 'T_EV', teams: ['NEP', 'SCO', 'NAM', 'OMA'], start: dayOfDate(y, 1, 1), end: dayOfDate(y, 9, 1) }] : []));
  const G = Game.create('LL', {}); ST.migrate(G); G.s.wd.jobs.push({ kind: 'nation', team: 'NEP', since: 2026 });
  const stop = ST.advance(G, dayOfDate(2027, 11, 31)); assert.ok(stop, 'stopped for Nepal');
  const [S, f] = stop; assert.ok(f.a === 'NEP' || f.b === 'NEP'); assert.ok(S.fx.filter((x) => x.res).every((x) => x.a !== 'NEP' && x.b !== 'NEP'));
  ST.advance(G, dayOfDate(2027, 11, 31), { auto: true }); assert.ok(S.done); const st = G.s.wd.st[S.id]; assert.ok(Object.keys(st).length > 40);
  const runs = Object.values(st).reduce((a, x) => a + x[3], 0); const tot = S.fx.reduce((a, x) => a + x.res.sc.reduce((b, y) => b + y[1], 0), 0); assert.ok(runs <= tot && runs > tot * 0.85, 'batting stats add up to the totals less extras');
  const G2 = new Game(JSON.parse(JSON.stringify(G.s))); assert.equal(Object.keys(G2.s.wd.seasons).length, Object.keys(G.s.wd.seasons).length);
});
import { fastFC } from '../../src/world/fastfc.js';
test('multi-day fast sim: four innings at most, results consistent, draws happen, totals realistic', () => {
  P.setDB([mkNation('AAA', 68), mkNation('BBB', 66)]); const G = Game.create('LL', {}); const rnd = seeded(21);
  let draws = 0, tot = 0; const n = 300;
  for (let k = 0; k < n; k++) { const m = fastFC(side('AAA', P.poolOf(G, 'AAA')), side('BBB', P.poolOf(G, 'BBB')), k % 2 ? 'Test' : 'FC4', rnd);
    assert.ok(m.inns.length >= 1 && m.inns.length <= 4); for (const i of m.inns) assert.ok(i.w <= 10);
    if (m.draw) { draws++; assert.equal(m.winner, null); } else assert.ok(m.winner && m.loser && m.margin);
    tot += m.inns[0].r; }
  assert.ok(draws / n > 0.05 && draws / n < 0.6, `draws ${draws / n}`); assert.ok(tot / n > 230 && tot / n < 480, `first innings ${tot / n}`); // the synthetic squads bat deep
});
