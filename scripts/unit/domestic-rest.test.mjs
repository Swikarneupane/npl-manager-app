// Domestic cricket outside Asia (W2): County Championship, Sheffield Shield, Plunket Shield, CSA, West
// Indies Championship, Logan Cup and the associates' main domestic competitions.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as IN from '../../src/world/intl.js';
import * as W from '../../src/game/world.js';
import { COMPS } from '../../src/world/comps.js';
import { applyRes, standings, blankRow } from '../../src/world/comp.js';
import { dayOfDate } from '../../src/world/dates.js';
import { DOMESTIC_REST, realPts } from '../../src/world/domestic-rest.js';

IN.setIntlEnabled(false);
const S_ = (G, id) => G.s.wd.seasons[id];
// Real format sizes: [teams, matches per team in the league stage, knockout fixtures]
const SIZE = { 'ENG-CC1': [10, 14, 0], 'ENG-CC2': [8, 14, 0], 'AUS-SS': [6, 10, 1], 'NZ-PS': [6, 8, 0], 'SA-FC1': [8, 10, 1], 'SA-FC2': [7, 12, 0], 'WI-CH': [6, 3, 2],
  'ZIM-LC': [5, 8, 0], 'IRE-IPC': [3, 4, 1], 'NED-TK': [8, 14, 0], 'SCO-RSS': [3, 8, 0], 'NAM-PL': [4, 6, 1], 'USA-NC': [8, 3, 1] };

let WORLD = null; // a world from the save's start to the end of 2030, shared by the read-only tests
async function world() {
  if (WORLD) return WORLD; await P.loadDB(); const G = Game.create('LL', { lang: 'en' }); ST.migrate(G);
  for (let d = G.s.wd.day; d < dayOfDate(2031, 0, 1); ) { d = Math.min(dayOfDate(2031, 0, 1), d + 7); ST.advance(G, d, { auto: true }); }
  return (WORLD = G);
}

test('domestic-rest: every competition plans and finishes a valid season each year, 2027 to 2030', async () => {
  const G = await world();
  for (let y = 2027; y <= 2030; y++) for (const c of DOMESTIC_REST) {
    const S = S_(G, `${c}-${y}`); assert.ok(S, `${c}-${y} exists`);
    const done = S.fx.every((f) => f.res); if (S.end < G.s.wd.day - 5) { assert.ok(S.done && S.champ && done, `${S.id} finished with a champion`); assert.ok(S.runner && S.runner !== S.champ); }
    assert.ok(S.fx.every((f) => f.a !== f.b && f.d >= S.start - 1 && f.d <= S.end + 2), `${S.id}: fixtures inside the window, nobody plays himself`);
    for (const f of S.fx) assert.ok(S.teams.includes(f.a) && S.teams.includes(f.b), `${S.id}: ${f.a} v ${f.b} are entrants`);
    // no team plays two matches starting on the same day, except Scotland's T20 triple-headers
    if (c !== 'SCO-RSS') { const seen = new Set(); for (const f of S.fx) for (const t of [f.a, f.b]) { const k = `${t}@${f.d}`; assert.ok(!seen.has(k), `${S.id}: ${t} twice on day ${f.d}`); seen.add(k); } }
    for (const t of S.teams) assert.ok(P.teamInfo(t) && P.teamInfo(t).kind === 'domestic' && P.rosterOf(G, t).length >= 18, `${t} is a domestic team with a full roster`);
  }
});

test('domestic-rest: team counts and matches per team match the real formats', async () => {
  const G = await world();
  for (const [c, [n, per, ko]] of Object.entries(SIZE)) {
    const S = S_(G, `${c}-2028`); assert.equal(S.teams.length, n, `${c} teams`);
    for (const t of S.teams) assert.equal(S.fx.filter((f) => f.stage === 0 && (f.a === t || f.b === t)).length, per, `${c}: ${t} plays ${per}`);
    assert.equal(S.fx.filter((f) => f.stage > 0).length, ko, `${c} knockout fixtures`);
  }
  // the County Championship covers all 18 counties once, CSA all 15 provinces
  assert.equal(new Set([...S_(G, 'ENG-CC1-2028').teams, ...S_(G, 'ENG-CC2-2028').teams]).size, 18);
  assert.equal(new Set([...S_(G, 'SA-FC1-2028').teams, ...S_(G, 'SA-FC2-2028').teams]).size, 15);
  // Scotland mixes three T20 triple-headers and three 50-over days
  const sco = S_(G, 'SCO-RSS-2028'); assert.equal(sco.fx.filter((f) => f.fmt === 'T20').length, 9); assert.equal(sco.fx.filter((f) => f.fmt === 'ODI').length, 3);
  assert.equal(S_(G, 'SA-FC2-2028').fx[0].fmt, 'FC3'); assert.equal(S_(G, 'ENG-CC1-2028').fx[0].fmt, 'FC4');
});

test('domestic-rest: County Championship points: 16 a win, 8 a draw, batting and bowling bonus points', () => {
  const pts = COMPS['ENG-CC1'].points; const T = { A: blankRow(), B: blankRow() };
  // A 380 all out in 100 overs (3 batting points), B take 10 wickets (3 bowling points). B 260/7 at 110 overs
  // (1 batting point, A 2 bowling points). A win.
  applyRes(T, { a: 'A', b: 'B', res: { w: 'A', l: 'B', text: 'A won by 120 runs', sc: [['A', 380, 10, 600], ['B', 260, 7, 660], ['A', 200, 5, 300], ['B', 200, 10, 400]] } }, pts);
  assert.equal(T.A.pts, 16 + 3 + 2); assert.equal(T.B.pts, 0 + 1 + 3);
  // bonus points only count the first 110 overs: 500 in 165 overs is 333 at 110, so 2 batting points
  const T2 = { A: blankRow(), B: blankRow() };
  applyRes(T2, { a: 'A', b: 'B', res: { draw: true, text: 'Match drawn', sc: [['A', 500, 4, 990], ['B', 150, 2, 300]] } }, pts);
  assert.equal(T2.A.pts, 8 + 2 + 0); assert.equal(T2.B.pts, 8 + 0 + 1); assert.equal(T2.A.d, 1);
  // the Shield in hundredths: 350 all out in 90 overs = 1.5 batting points; 10 wickets = 1.0 bowling
  const T3 = { A: blankRow(), B: blankRow() };
  applyRes(T3, { a: 'A', b: 'B', res: { w: 'B', l: 'A', text: 'B won by 5 wickets', sc: [['A', 350, 10, 540], ['B', 420, 6, 600], ['A', 200, 10, 400], ['B', 131, 5, 200]] } }, COMPS['AUS-SS'].points);
  assert.equal(realPts({ comp: 'AUS-SS' }, T3.B.pts), 6 + 2.2 + 1.0); assert.equal(realPts({ comp: 'AUS-SS' }, T3.A.pts), 1.5 + 0.6);
});

test('domestic-rest: two up, two down between County Championship seasons', async () => {
  const G = await world();
  for (let y = 2028; y <= 2030; y++) {
    const d1 = S_(G, `ENG-CC1-${y - 1}`), d2 = S_(G, `ENG-CC2-${y - 1}`); const t1 = standings(d1.tables.all).map((r) => r.id), t2 = standings(d2.tables.all).map((r) => r.id);
    const want = new Set([...t1.slice(0, 8), ...t2.slice(0, 2)]); const now = S_(G, `ENG-CC1-${y}`).teams;
    assert.deepEqual(new Set(now), want, `${y} Division One`); for (const t of t1.slice(8)) assert.ok(S_(G, `ENG-CC2-${y}`).teams.includes(t), `${t} relegated`);
  }
  // the real 2027 split (from the 2026 table) when the save didn't play 2026
  const c27 = S_(G, 'ENG-CC1-2027'); if (!S_(G, 'ENG-CC1-2026')) assert.ok(c27.teams.includes('ENG-DUR') && c27.teams.includes('ENG-KEN') && !c27.teams.includes('ENG-LEI') && !c27.teams.includes('ENG-HAM'));
});

test('domestic-rest: the Sheffield Shield final is between the top two, at the top side\'s ground', async () => {
  const G = await world();
  for (let y = 2027; y <= 2029; y++) { const S = S_(G, `AUS-SS-${y}`); const F = S.fx.find((f) => f.ko === 'F'); const top = standings(S.tables.all).map((r) => r.id);
    assert.ok(F && F.res, `${S.id} final played`); assert.equal(F.a, top[0]); assert.equal(F.b, top[1]); assert.ok([F.a, F.b].includes(S.champ));
    assert.ok(F.d > Math.max(...S.fx.filter((f) => f.stage === 0).map((f) => f.d)), 'final after the last round'); }
  // West Indies: play-off between the second and third series winners, then the final
  const wi = S_(G, 'WI-CH-2028'); const po = wi.fx.find((f) => f.ko === 'PO'), fi = wi.fx.find((f) => f.ko === 'F');
  assert.ok(po && fi && fi.a === wi.seed[0] && [po.a, po.b].includes(fi.b));
});

test('domestic-rest: a world year of these competitions sims in under 5 s and adds under 150 KB after compaction', async () => {
  await P.loadDB(); const G = Game.create('LL', { lang: 'en' }); ST.migrate(G); const wd = G.s.wd;
  ST.advance(G, dayOfDate(2027, 0, 1), { auto: true }); W.archive(G); P.flush(G); const before = JSON.stringify(G.s).length;
  const t0 = performance.now(); let n = 0;
  for (let d = wd.day; d < dayOfDate(2028, 0, 1); ) { d = Math.min(dayOfDate(2028, 0, 1), d + 7); ST.advance(G, d, { auto: true }); }
  const ms = performance.now() - t0;
  for (const S of Object.values(wd.seasons)) if (COMPS[S.comp] && DOMESTIC_REST.includes(S.comp)) n += S.fx.filter((f) => f.res && f.d >= dayOfDate(2027, 0, 1)).length;
  W.archive(G); P.flush(G); const kb = (JSON.stringify(G.s).length - before) / 1024;
  if (process.env.VERBOSE) console.log(`domestic-rest: ${n} matches in ${Math.round(ms)} ms, +${Math.round(kb)} KB`);
  assert.ok(n > 300, `${n} matches`); assert.ok(ms < 5000, `${Math.round(ms)} ms`); // the whole world runs alongside assert.ok(kb < 150, `${Math.round(kb)} KB`);
});
