// Test cricket and the World Test Championship (W2): the real 2025–27 table and its seed, the points
// system, the cycle to its final, Test counts in the programme, Test squads for national managers,
// old saves and save size. The programme runs only inside these tests, on the real player database.
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as IN from '../../src/world/intl.js';
import * as RK from '../../src/world/rankings.js';
import * as C from '../../src/world/career.js';
import { newSeason } from '../../src/world/comp.js';
import { COMPS } from '../../src/world/comps.js';
import { dayOfDate, yearOf } from '../../src/world/dates.js';
import { WTC } from '../../src/data/world/calendar.js';

const on = (fn) => async () => { await P.loadDB(); IN.setIntlEnabled(true); try { await fn(); } finally { IN.setIntlEnabled(false); } };
const run = (G, until, save = false) => { let k = 0; for (let d = G.s.wd.day; d < until;) { d = Math.min(until, d + 7); ST.advance(G, d, { auto: true }); IN.tick(G); if (save && ++k % 4 === 0) G.hook('beforeSave'); } };
let W3 = null; // one three-year world (archived as the game saves), shared by the tests that read it
const three = () => { if (!W3) { W3 = Game.create('LL', { lang: 'en' }); run(W3, dayOfDate(2029, 8, 15), true); } return W3; };
const rowOf = (T, c) => T[c] || [0, 0, 0, 0, 0, 0, 0, 0];

test('wtc: the real 2025–27 results give the published table of 9 Nov 2026, and a new game is seeded at its start', on(() => {
  const T = IN.wtcRealTable(dayOfDate(2026, 10, 10));
  for (const [c, m, w, l, dr, t, ded, pts, pct] of WTC.c25.table) {
    const x = rowOf(T, c); assert.deepEqual([x[0], x[1], x[2], x[3], x[4], x[5], x[6]], [m, w, l, dr, t, ded, pts], c);
    assert.ok(Math.abs((x[6] / (x[0] * 12)) * 100 - pct) < 0.006, `${c} PCT ${pct}`); }
  const G = Game.create('LL', { lang: 'en' }); const I = IN.st(G); assert.equal(I.start0, dayOfDate(2026, 8, 15));
  assert.deepEqual(I.wtc[2025].t, IN.wtcRealTable(I.start0), 'seeded from the real results before the save starts');
  const rows = Object.fromEntries(IN.wtcTable(G, 2025).map((r) => [r.code, r]));
  assert.deepEqual([rows.AUS.m, rows.AUS.pts, rows.AUS.pct], [10, 96, 80]); assert.deepEqual([rows.SA.m, rows.SA.pct], [4, 75]); assert.equal(rows.ENG.ded, 14); assert.equal(rows.PAK.pts, 5);
  assert.equal(rows.WI.ser, 5); assert.equal(IN.wtcTable(G, 2025)[0].code, 'AUS', 'Australia top on 15 Sep 2026');
  // the remaining real series are in the save on their real dates; nothing before the start is replayed
  ST.ensureYear(G, 2026); const sa = G.s.wd.seasons['BIL-2026-SA-AUS-Test']; assert.ok(sa && sa.wtc === 2025 && sa.rf === 1);
  assert.deepEqual(sa.fx.map((f) => f.d), [dayOfDate(2026, 9, 9), dayOfDate(2026, 9, 18), dayOfDate(2026, 9, 27)]); assert.ok(sa.fx.every((f) => f.a === 'SA' && f.fmt === 'Test'));
  assert.ok(!G.s.wd.seasons['BIL-2026-ENG-PAK-Test'], 'a series finished before the start is not replayed');
  assert.equal(IN.cyclePlan(G, 2025).find((x) => x.teams.join() === 'IND,AUS').name.split(' · ')[0], 'Border–Gavaskar Trophy');
  assert.deepEqual([IN.wtcFinal(G, 2025).venue, IN.wtcFinal(G, 2025).start], ['The Oval, London', dayOfDate(2027, 5, 9)]);
}));

test('wtc: 12 points a win, 4 a draw, 6 a tie, ranked by percentage', on(() => {
  const G = Game.create('LL', { lang: 'en' }); const def = COMPS.TEST_3; const S = newSeason(def, 2099, ['IND', 'AUS'], dayOfDate(2028, 0, 1), dayOfDate(2028, 0, 30)); S.id = 'WTC-points'; S.wtc = 2099; G.s.wd.seasons[S.id] = S;
  const [a, b, c] = S.fx; a.res = { w: 'IND', l: 'AUS', text: 'India won by 5 wickets' }; b.res = { draw: true, text: 'Match drawn' }; c.res = { tie: true, text: 'Match tied' };
  IN.wtcTick(G); IN.wtcTick(G); const r = Object.fromEntries(IN.wtcTable(G, 2099).map((x) => [x.code, x]));
  assert.deepEqual([r.IND.m, r.IND.w, r.IND.d, r.IND.t, r.IND.pts, r.IND.ser], [3, 1, 1, 1, 22, 1], 'counted once'); assert.deepEqual([r.AUS.l, r.AUS.pts], [1, 10]);
  assert.equal(r.IND.pct, 61.11); assert.equal(r.AUS.pct, 27.78); assert.equal(IN.wtcTable(G, 2099)[0].code, 'IND');
}));

test('wtc: the 2025–27 cycle plays out and its top two meet in the final at The Oval; the next cycle starts', on(() => {
  const G = three(); const F = G.s.wd.seasons['WTCF-2027'] ? G.s.wd.seasons['WTCF-2027'] : null; const fin = IN.wtcFinal(G, 2025).fin;
  assert.ok(fin, 'the final was played'); assert.deepEqual([fin.champ, fin.runner].sort(), IN.wtcTop2(G, 2025).sort(), 'the top two of the table');
  const T = IN.wtcTable(G, 2025); assert.ok(T.every((x) => x.m >= 12 && x.ser === 6), 'every side played its six series'); if (F) assert.equal(F.fx[0].d, dayOfDate(2027, 5, 9));
  const T27 = IN.wtcTable(G, 2027); assert.ok(T27.filter((x) => x.m > 0).length === 9, 'every side has played in 2027–29'); assert.ok(T27.some((x) => x.code === 'ENG' && x.m >= 5), 'the 2027 Ashes counts');
  assert.ok(G.s.inbox.some((n) => /World Test Championship/.test(n.text) && /In-game/.test(n.detail || '')), 'news of the final, labelled in-game');
}));

test('wtc: later cycles give the nine six series each, three at home, and every side a realistic number of Tests', on(() => {
  const G = Game.create('LL', { lang: 'en' });
  for (const Cy of [2029, 2031, 2033]) { const L = IN.cyclePlan(G, Cy); for (const c of WTC.teams) { const mine = L.filter((x) => x.teams.includes(c)); const home = mine.filter((x) => x.teams[0] === c).length;
    assert.equal(mine.length, 6, `${Cy} ${c}: ${mine.length} series`); assert.ok(home >= 1 && home <= 5, `${Cy} ${c}: ${home} at home`); }
    assert.ok(WTC.teams.filter((c) => L.filter((x) => x.teams[0] === c).length === 3).length >= 5, `${Cy}: most sides host three series`);
    for (const k of ['AUS,ENG', 'AUS,IND', 'ENG,IND']) assert.ok(L.some((x) => x.teams.slice().sort().join() === k && x.days.length === 5), `${Cy}: the five-Test ${k}`);
    const ashes = L.find((x) => x.teams.slice().sort().join() === 'AUS,ENG'); const prev = IN.cyclePlan(G, Cy - 2).find((x) => x.teams.slice().sort().join() === 'AUS,ENG');
    assert.notEqual(ashes.teams[0], prev.teams[0], `${Cy}: the Ashes alternate hosts`); assert.match(ashes.name, /^The Ashes · /); }
  let sum = 0, n = 0;
  for (let y = 2028; y <= 2034; y++) { const c = {}; for (const x of IN.testPlan(G, y)) for (const t of x.teams) c[t] = (c[t] || 0) + x.days.length;
    for (const t of WTC.teams) { assert.ok(c[t] >= 5 && c[t] <= 16, `${y} ${t}: ${c[t]} Tests`); sum += c[t]; n++; }
    for (const t of ['AFG', 'IRE', 'ZIM']) assert.ok(c[t] >= 1 && c[t] <= 6, `${y} ${t}: ${c[t]} Tests, outside the WTC`); }
  assert.ok(sum / n >= 7 && sum / n <= 11, `about 6–15 Tests a year (average ${(sum / n).toFixed(1)})`);
  for (const x of IN.testPlan(G, 2030)) for (const y of IN.testPlan(G, 2030)) if (x !== y && x.teams.some((t) => y.teams.includes(t))) assert.ok(x.end < y.start || y.end < x.start, `${x.id} and ${y.id} overlap`);
  // white-ball cricket goes on around the Tests (in the three-year world: ODIs and T20Is a year, from the rankings log)
  const W = three(); const log = W.s.wd.intl.rk.log; for (const y of [2027, 2028]) { const wb = {}; for (const [dd, f, a, b] of log) if (f !== 3 && yearOf(dd) === y) for (const t of [a, b]) wb[t] = (wb[t] || 0) + 1;
    for (const t of WTC.teams) assert.ok(wb[t] >= 10 && wb[t] <= 45, `${y} ${t}: ${wb[t]} white-ball internationals`); }
}));

test('wtc: a full member’s manager picks a Test squad and XI; the side plays Tests with it', on(() => {
  const G = Game.create('LL', { lang: 'en' }); C.takeJob(G, 'nation', 'ENG', { quiet: true }); C.nationJob(G).board = 100;
  assert.deepEqual(C.fmtsFor('ENG').map((x) => x[0]), ['Test', 'ODI', 'T20']); assert.deepEqual(C.fmtsFor('NEP').map((x) => x[0]), ['ODI', 'T20']); assert.ok(C.fmtsFor('IRE').some((x) => x[0] === 'Test'));
  const sel = C.selection(G, 'ENG', 'Test'); assert.equal(sel.squad.length, 15); assert.equal(sel.xi.length, 11); assert.ok(sel.xi.some((p) => p.role === 'WK'));
  const keys = sel.squad.map(C.keyOf); assert.equal(C.setSquad(G, 'ENG', 'Test', keys), null); const xi = keys.slice(0, 11); assert.equal(C.setXI(G, 'ENG', 'Test', { xi, cap: xi[0] }), null);
  const side = ST.sideFor(G, 'ENG', 'Test'); assert.deepEqual(side.xi.map(C.keyOf).sort(), xi.slice().sort(), 'the picked XI plays'); assert.deepEqual(G.s.wd.squads.ENG.Test, keys);
  ST.ensureYear(G, 2026); const until = dayOfDate(2027, 2, 31); let stop = ST.advance(G, until); while (stop && stop[1].fmt !== 'Test') { C.assistantPlays(G, stop[0], stop[1]); const j = C.nationJob(G); if (j) j.board = 100; stop = ST.advance(G, until); } // (a run of white-ball defeats must not get the manager sacked first) assert.ok(stop && stop[1].fmt === 'Test' && stop[1].b === 'ENG', `the clock stops at England’s next Test (away, in South Africa or Bangladesh): ${stop ? stop[0].id : 'none'}`);
  const res = C.assistantPlays(G, stop[0], stop[1]); assert.ok(res.text); assert.ok(stop[1].card.length >= 2 && stop[1].card.length <= 4);
  const T = G.s.wd.st[stop[0].id]; // stats are kept under the player's game id; a database key can belong to an NPL player (the same person)
  const gid = (k) => { const q = Object.values(G.players).find((x) => x.wid === k); return q ? q.id : k; };
  // earlier matches can injure a picked player, and the game leaves an injured player out; almost all of the XI play
  const played = xi.filter((k) => { const x = T[gid(k)] || T[k]; return x && x[0] === 1; }).length; assert.ok(played >= 9, `the XI played: ${played} of 11`);
  assert.ok(C.nationJob(G).obj.some((o) => /Test/.test(o.t)), 'a board objective for a Test series');
}));

test('wtc: an old save loads, gets the WTC and plays a year of Tests', on(async () => {
  const G = new Game(oldSave()); const I = IN.st(G); assert.ok(I.wtc && I.wtc[2025] && I.rk.pa.Test);
  const m0 = IN.wtcTable(G, 2025).reduce((a, r) => a + r.m, 0); run(G, G.s.wd.day + 365, true);
  const m1 = IN.wtcTable(G, 2025).reduce((a, r) => a + r.m, 0); assert.ok(m1 > m0 + 40, `WTC Tests played: ${m1 - m0}`);
  assert.ok(RK.teamTable(G, 'Test').length >= 9); const pl = RK.playerTable(G, 'Test'); assert.ok(pl.bat.length >= 10 && pl.bowl.length >= 10);
  const rec = RK.testRecords(G, 5); assert.ok(rec.runs.length === 5 && rec.best.length === 5 && rec.runs.every((x) => x.r > 0));
  const G2 = new Game(JSON.parse(JSON.stringify(G.s))); assert.deepEqual(IN.wtcTable(G2, 2025), IN.wtcTable(G, 2025), 'the table survives a reload');
}));

test('wtc: after three world years the save stays under 2500 KB', on(() => {
  const G = three(); G.hook('beforeSave'); const kb = JSON.stringify(G.s).length / 1024; assert.ok(kb < 2500, `save ${Math.round(kb)} KB`); // budgets with every domestic competition running (W2): saves sit near 1.2 MB after three world years; the cloud limit is 4 MB
  assert.ok(Object.keys(G.s.wd.intl.rk.tr || {}).length > 50, 'Test records are kept');
}));
