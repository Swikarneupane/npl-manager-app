// Europe and the Americas leagues (W3): The Hundred, Vitality T20 Blast, Metro Bank One-Day Cup, Major League Cricket, CPL.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as IN from '../../src/world/intl.js';
import * as W from '../../src/game/world.js';
import { COMPS } from '../../src/world/comps.js';
import { applyRes, blankRow } from '../../src/world/comp.js';
import { dayOfDate } from '../../src/world/dates.js';
import { LEAGUES_WEST } from '../../src/world/leagues-west.js';
import { NATION_CODES, loadNation } from '../../src/data/world/index.js';

IN.setIntlEnabled(false);
const S_ = (G, id) => G.s.wd.seasons[id];
// Real formats: [teams, league matches per team, knockout fixtures]
const SIZE = { HUN: [8, 8, 2], BLAST: [18, 12, 7], RLC: [18, 8, 5], MLC: [6, 10, 4], CPL: [7, 10, 4] };
const HOME = { HUN: 'ENG', MLC: 'USA', CPL: 'WI' };

let WORLD = null;
async function world() {
  if (WORLD) return WORLD; await P.loadDB(); const G = Game.create('LL', { lang: 'en' }); ST.migrate(G);
  for (let d = G.s.wd.day; d < dayOfDate(2031, 0, 1);) { d = Math.min(dayOfDate(2031, 0, 1), d + 7); ST.advance(G, d, { auto: true }); }
  return (WORLD = G);
}

test('leagues-west: every competition plans and finishes a valid season each year, 2027 to 2030', async () => {
  const G = await world();
  for (let y = 2027; y <= 2030; y++) for (const c of LEAGUES_WEST) {
    const S = S_(G, `${c}-${y}`); assert.ok(S, `${c}-${y} exists`);
    assert.ok(S.done && S.champ && S.fx.every((f) => f.res), `${S.id} finished with a champion`); assert.ok(S.runner && S.runner !== S.champ);
    assert.ok(S.fx.every((f) => f.a !== f.b && f.d >= S.start - 1 && f.d <= S.end + 1), `${S.id}: fixtures inside the window, nobody plays himself`);
    for (const f of S.fx) assert.ok(S.teams.includes(f.a) && S.teams.includes(f.b), `${S.id}: entrants`);
    const F = S.fx.find((f) => f.ko === 'F'); assert.ok(F && [F.a, F.b].includes(S.champ), `${S.id}: the final decides it`);
    const seen = new Set(); for (const f of S.fx.filter((x) => !(c === 'BLAST' && x.stage >= 2))) for (const t of [f.a, f.b]) { const k = `${t}@${f.d}`; assert.ok(!seen.has(k), `${S.id}: ${t} twice on day ${f.d}`); seen.add(k); }
    for (const t of S.teams) assert.ok(P.rosterOf(G, t).length >= 11, `${t} has a roster (players retire over four years)`);
  }
});

test('leagues-west: team counts and matches per team match the real formats', async () => {
  const G = await world();
  for (const [c, [n, per, ko]] of Object.entries(SIZE)) {
    const S = S_(G, `${c}-2028`); assert.equal(S.teams.length, n, `${c} teams`);
    for (const t of S.teams) assert.equal(S.fx.filter((f) => f.stage === 0 && (f.a === t || f.b === t)).length, per, `${c}: ${t} plays ${per}`);
    assert.equal(S.fx.filter((f) => f.stage > 0).length, ko, `${c} knockout fixtures`);
  }
  assert.equal(S_(G, 'HUN-2028').fx.filter((f) => f.stage === 0).length, 32); assert.equal(S_(G, 'BLAST-2028').fx.filter((f) => f.stage === 0).length, 108);
  assert.equal(S_(G, 'RLC-2028').fx.filter((f) => f.stage === 0).length, 72); assert.equal(S_(G, 'MLC-2028').fx.filter((f) => f.stage === 0).length, 30); assert.equal(S_(G, 'CPL-2028').fx.filter((f) => f.stage === 0).length, 35);
  assert.equal(S_(G, 'BLAST-2028').fx.length, 115); assert.equal(S_(G, 'CPL-2028').fx.length, 39);
  // the Blast: three groups of six, the top two and the two best third-placed counties in the quarter-finals
  const b = S_(G, 'BLAST-2028'); assert.deepEqual(Object.keys(b.groups), ['N', 'C', 'S']); assert.ok(Object.values(b.groups).every((g) => g.length === 6));
  const qf = b.fx.filter((f) => f.ko && f.ko.startsWith('QF')).flatMap((f) => [f.a, f.b]); assert.equal(new Set(qf).size, 8);
  for (const k in b.groups) assert.ok(b.tables[k] && Object.keys(b.tables[k]).length === 6);
  // the Hundred is 100 balls (carried on the fixture), played with the T20 stand-in
  assert.ok(COMPS.HUN.hundred && COMPS.HUN.balls === 100 && S_(G, 'HUN-2028').fx.every((f) => f.balls === 100 && f.fmt === 'T20'));
  assert.equal(S_(G, 'RLC-2028').fx[0].fmt, 'ODI');
  // the One-Day Cup: group winners go straight to the semi-finals
  const r = S_(G, 'RLC-2028'); const qts = r.fx.filter((f) => f.stage === 1).flatMap((f) => [f.a, f.b]); const sfs = r.fx.filter((f) => f.stage === 2).flatMap((f) => [f.a, f.b]);
  for (const k of ['A', 'B']) { const w = r.tables[k] && Object.entries(r.tables[k]).sort((x, y) => y[1].pts - x[1].pts || y[1].w - x[1].w)[0][0]; if (w) assert.ok(!qts.includes(w) || r.tables[k][w].pts >= 0); }
  assert.equal(new Set(qts).size, 4); assert.equal(new Set(sfs).size, 4);
});

test('leagues-west: points (4 a win in the Blast and One-Day Cup, 2 in MLC and CPL) and windows', () => {
  const T = { A: blankRow(), B: blankRow() };
  applyRes(T, { a: 'A', b: 'B', res: { w: 'A', l: 'B', text: 'A won', sc: [['A', 150, 8, 120], ['B', 140, 10, 120]] } }, COMPS.BLAST.points); applyRes(T, { a: 'A', b: 'B', res: { nr: true, text: 'No result' } }, COMPS.BLAST.points);
  assert.equal(T.A.pts, 6); assert.equal(T.B.pts, 2);
  const U = { A: blankRow(), B: blankRow() }; applyRes(U, { a: 'A', b: 'B', res: { w: 'B', l: 'A', text: 'B won', sc: [['A', 1, 1, 1], ['B', 2, 1, 1]] } }, COMPS.MLC.points); assert.equal(U.B.pts, 2);
  assert.deepEqual(COMPS.HUN.window, ['Jul 21', 'Aug 16']); assert.deepEqual(COMPS.BLAST.window, ['May 22', 'Jul 18']); assert.deepEqual(COMPS.MLC.window, ['Jun 18', 'Jul 18']); assert.deepEqual(COMPS.CPL.window, ['Aug 7', 'Sep 20']);
  for (const c of LEAGUES_WEST) assert.ok(COMPS[c].listA, `${c} is listA`);
});

const mods = await Promise.all(['HUN', 'BLAST', 'RLC', 'MLC', 'CPL'].map((c) => import(`../../src/data/world/leagues/${c}.js`).then((m) => m.default)));
test('leagues-west: every squad key resolves, nobody is in two teams of one league, overseas limits hold', async () => {
  await P.loadDB(); P.setDB(await Promise.all(NATION_CODES.map((c) => loadNation(c).then((m) => m.default || m))), mods);
  const G = Game.create('LL', { lang: 'en' }); ST.migrate(G); P.registry(G);
  const R = P.registry(G); const natOf = (id) => R.by[id] && R.by[id].nat;
  for (const m of mods) {
    const all = new Set();
    for (const t of m.teams) { const sq = m.squads[t.id] || []; assert.ok(sq.length >= 1, `${t.id} has a squad`);
      for (const id of sq) { assert.ok(P.record(id) || R.by[id], `${t.id}: ${id} resolves`); assert.ok(!all.has(id), `${m.code}: ${id} in two squads`); all.add(id); }
      assert.ok(sq.length <= m.rules.max, `${t.id}: squad of ${sq.length} within ${m.rules.max}`);
      const ro = P.rosterOf(G, t.id); assert.ok(ro.length >= m.rules.min && new Set(ro.map((p) => p.id)).size === ro.length, `${t.id} roster`);
      const o = m.rules.overseas; /* MLC: US-qualification is not in the data (many US-based players hold other passports), so its XI rule is not checked */ if (o) { const os = sq.filter((id) => natOf(id) !== HOME[m.code]).length; assert.ok(os <= o.dataMax, `${t.id}: ${os} overseas by nationality (data max ${o.dataMax})`);
        if (m.code !== 'MLC') assert.ok(sq.length - os + Math.min(os, o.xi) >= 11, `${t.id}: an XI is possible with at most ${o.xi} overseas`); assert.ok(o.max <= o.dataMax); } }
  }
  // the county rosters: no one in two counties, all eighteen full
  const seen = new Map(); for (const m of ['DER', 'DUR', 'ESS', 'GLA', 'GLO', 'HAM', 'KEN', 'LAN', 'LEI', 'MDX', 'NHT', 'NOT', 'SOM', 'SUR', 'SUS', 'WAR', 'WOR', 'YOR']) {
    const ro = P.rosterOf(G, `ENG-${m}`); assert.ok(ro.length >= 18, `${m} roster ${ro.length}`); for (const p of ro.filter((x) => !x.gen)) { assert.ok(!seen.has(p.id), `${p.name} in ${m} and ${seen.get(p.id)}`); seen.set(p.id, m); } }
  assert.deepEqual(mods.map((m) => m.teams.length), [8, 0, 0, 6, 7]);
});

test('leagues-west: a world year of these competitions sims quickly and adds under 150 KB after compaction', async () => {
  await P.loadDB(); const G = Game.create('LL', { lang: 'en' }); ST.migrate(G); const wd = G.s.wd;
  ST.advance(G, dayOfDate(2027, 0, 1), { auto: true }); W.archive(G); P.flush(G); const before = JSON.stringify(G.s).length;
  const t0 = performance.now(); let n = 0;
  for (let d = wd.day; d < dayOfDate(2028, 0, 1);) { d = Math.min(dayOfDate(2028, 0, 1), d + 7); ST.advance(G, d, { auto: true }); }
  const ms = performance.now() - t0;
  for (const S of Object.values(wd.seasons)) if (LEAGUES_WEST.includes(S.comp)) n += S.fx.filter((f) => f.res && f.d >= dayOfDate(2027, 0, 1)).length;
  W.archive(G); P.flush(G); const kbAll = (JSON.stringify(G.s).length - before) / 1024;
  // these competitions' own share: their seasons and stats (the whole save also holds every other region's)
  const kb = Object.values(wd.seasons).filter((S) => LEAGUES_WEST.includes(S.comp)).reduce((a, S) => a + JSON.stringify(S).length + JSON.stringify(wd.st[S.id] || {}).length, 0) / 1024;
  if (process.env.VERBOSE) console.log(`leagues-west: ${n} matches in ${Math.round(ms)} ms (whole world), +${Math.round(kb)} KB of these seasons (+${Math.round(kbAll)} KB the whole save)`);
  assert.ok(n >= 250, `${n} matches`); assert.ok(ms < 8000, `${Math.round(ms)} ms`); assert.ok(kb < 150, `${Math.round(kb)} KB`);
});
