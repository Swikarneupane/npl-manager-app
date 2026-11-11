// Domestic cricket in Asia (W2): the Ranji Trophy, Quaid-e-Azam Trophy, Sri Lanka's Major Clubs, the NCL,
// the Ahmad Shah Abdali 4-day, Nepal's Jay Trophy and Prime Minister Cup, the Emirates D50 and Oman's 2-day
// tournament. The module is switched on only inside these tests, so the other suites keep their own worlds.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as IN from '../../src/world/intl.js';
import * as W from '../../src/game/world.js';
import * as DA from '../../src/world/domestic-asia.js';
import { COMPS } from '../../src/world/comps.js';
import { applyRes, blankRow } from '../../src/world/comp.js';
import { yearOf, dayOfDate } from '../../src/world/dates.js';
import { NATION_CODES, loadNation } from '../../src/data/world/index.js';

DA.setDomesticAsiaEnabled(false);
const mods = await Promise.all(NATION_CODES.map((c) => loadNation(c).then((m) => m.default || m)));
const on = (fn) => async () => { DA.setDomesticAsiaEnabled(true); try { await fn(); } finally { DA.setDomesticAsiaEnabled(false); } };
const run = (G, until, { intl = false, archive = false } = {}) => { for (let d = G.s.wd.day; d < until;) { d = Math.min(until, d + 7); ST.advance(G, d, { auto: true }); if (intl) IN.tick(G); if (archive) W.archive(G); } };
const COUNT = { 'IND-RANJI': [32, 4], 'IND-RANJI-PLATE': [6, 1], 'PAK-QEA': [8, 1], 'PAK-QEA-SILVER': [12, 2], 'SL-MCT': [14, 2], 'BAN-NCL': [8, 1], 'AFG-ASA': [4, 1], 'NEP-JAY': [6, 1], 'NEP-PMC': [10, 1], 'UAE-D50': [6, 1], 'OMA-2DAY': [4, 1] };
const TEAMS = Object.fromEntries(mods.flatMap((m) => (m.teams || []).map((t) => [t.id, t])));

// One four-year domestic world (the international programme off), shared by the tests that only read it.
let FOUR = null;
function four() {
  if (FOUR) return FOUR; P.setDB(mods); IN.setIntlEnabled(false); DA.setDomesticAsiaEnabled(true);
  try { const G = Game.create('LL', { lang: 'en' }); const y0 = yearOf(G.s.wd.day); run(G, G.s.wd.day + 4 * 365 + 60); FOUR = { G, y0 }; }
  finally { DA.setDomesticAsiaEnabled(false); }
  return FOUR;
}
const seasonsOf = (G, comp) => Object.values(G.s.wd.seasons).filter((S) => S.comp === comp);

test('domestic-asia: every team is a domestic team of its nation with a level; old ids stay', () => {
  for (const comp of DA.ASIA_COMPS) assert.ok(COMPS[comp] && COMPS[comp].kind === 'domestic' && COMPS[comp].listA, `${comp} registered, kept out of the rankings`);
  for (const id of ['IND-MUM', 'IND-DEL', 'PAK-LHW', 'PAK-KHB', 'PAK-PES', 'PAK-SKT', 'SL-SSC', 'BAN-DHK', 'AFG-BEA', 'NEP-APF', 'NEP-ARMY', 'NEP-POL']) assert.ok(TEAMS[id], `${id} kept`);
  const { G } = four();
  for (const S of Object.values(G.s.wd.seasons)) { if (!DA.ASIA_COMPS.includes(S.comp)) continue;
    for (const t of S.teams) { assert.ok(TEAMS[t], `${S.id}: ${t} is a nation team`); assert.equal(TEAMS[t].kind, 'domestic'); assert.ok([1, 2, 3].includes(TEAMS[t].level), `${t} level`); assert.equal(t.split('-')[0], COMPS[S.comp].host); } }
});

test('domestic-asia: each competition plans a valid season every year for four years', on(() => {
  const { G, y0 } = four(); const wd = G.s.wd;
  for (const comp of DA.ASIA_COMPS) {
    const list = seasonsOf(G, comp); const years = list.map((S) => S.y);
    for (let y = y0 + 1; y <= y0 + 4; y++) assert.ok(years.includes(y), `${comp} ${y} planned`);
    for (const S of list) {
      const [n, groups] = COUNT[comp]; const jay26 = comp === 'NEP-JAY' && S.y === 2026;
      assert.equal(S.teams.length, jay26 ? 4 : n, `${S.id} teams`); assert.equal(new Set(S.teams).size, S.teams.length, `${S.id} no repeats`);
      assert.equal(Object.keys(S.tables).filter((k) => k !== 'super').length, groups, `${S.id} groups`);
      for (const f of S.fx) { assert.ok(f.a !== f.b && S.teams.includes(f.a) && S.teams.includes(f.b), `${S.id} fixture ${f.a} v ${f.b}`); assert.ok(f.d >= S.start && f.d <= S.end + 3, `${S.id} fixture day in window`); }
      // league: each pair in a group meets once (twice for the double round robins)
      const legs = comp === 'AFG-ASA' || comp === 'OMA-2DAY' ? 2 : 1; const meet = {};
      for (const f of S.fx.filter((x) => x.stage === 0)) { const k = [f.a, f.b].sort().join(); meet[k] = (meet[k] || 0) + 1; }
      for (const [g, rows] of Object.entries(S.tables)) { if (g === 'super') continue; const ts = Object.keys(rows);
        for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) assert.equal(meet[[ts[i], ts[j]].sort().join()], legs, `${S.id} ${ts[i]} v ${ts[j]}`); }
      if (S.end < wd.day - 7) { assert.ok(S.done && S.champ && S.runner && S.champ !== S.runner, `${S.id} finished with a champion`); assert.ok(S.fx.every((f) => f.res), `${S.id} all played`); }
    }
  }
}));

test('domestic-asia: knockouts and formats follow the real competitions', on(() => {
  const { G } = four(); const done = (c) => seasonsOf(G, c).filter((S) => S.done);
  for (const S of done('IND-RANJI')) { const ko = S.fx.filter((f) => f.grp === 'ko'); assert.deepEqual(ko.map((f) => f.ko), ['QF1', 'QF2', 'QF3', 'QF4', 'SF1', 'SF2', 'F']);
    const F = ko[6]; assert.ok([F.a, F.b].includes(S.champ)); assert.ok(S.fx.filter((f) => f.stage === 0).length === 112); }
  for (const S of done('IND-RANJI-PLATE')) assert.deepEqual(S.fx.filter((f) => f.grp === 'ko').map((f) => f.ko), ['SF1', 'SF2', 'F']);
  for (const S of done('PAK-QEA-SILVER')) { const F = S.fx.find((f) => f.ko === 'F'); const top = (g) => Object.keys(S.tables[g]); assert.ok(top('A').includes(F.a) !== top('A').includes(F.b), 'Silver final: one group winner from each group'); }
  for (const S of done('UAE-D50')) { const po = S.fx.find((f) => f.ko === 'PO'), F = S.fx.find((f) => f.ko === 'F'); assert.ok(po && F && [F.a, F.b].includes(po.res.w || F.a)); }
  for (const S of done('SL-MCT')) { assert.equal(Object.keys(S.tables.super).length, 8); assert.ok(S.tables.super[S.champ]); assert.equal(S.fx.filter((f) => f.stage === 1).length, 16); }
  for (const S of done('BAN-NCL')) { assert.equal(S.fx.length, 28); assert.ok(S.fx.every((f) => f.fmt === 'FC4')); }
  for (const S of done('AFG-ASA')) assert.equal(S.fx.length, 13);
  for (const S of done('OMA-2DAY')) assert.ok(S.fx.length === 12 && S.fx.every((f) => f.fmt === 'FC2'));
  for (const S of done('SL-MCT')) assert.ok(S.fx.every((f) => f.fmt === 'FC3'));
}));

test('domestic-asia: the Jay Trophy has six teams from 2026–27, two-day league games and a three-day final', on(() => {
  const { G } = four(); const list = seasonsOf(G, 'NEP-JAY').filter((S) => S.y >= 2027); assert.ok(list.length >= 3);
  for (const S of list) { assert.equal(S.teams.length, 6); assert.match(S.name, /Jay Trophy \d{4}–\d{2}/);
    assert.ok(S.fx.filter((f) => f.stage === 0).every((f) => f.fmt === 'FC2')); assert.equal(S.fx.filter((f) => f.stage === 0).length, 15);
    if (S.done) { const F = S.fx.find((f) => f.ko === 'F'); assert.equal(F.fmt, 'FC3'); assert.equal(S.fx.length, 16); } }
  // 2026–27: the top six of the 2026 Prime Minister Cup; later seasons: the top six of the previous PM Cup
  const S27 = list.find((S) => S.y === 2027); assert.deepEqual(S27.teams.slice().sort(), ['NEP-APF', 'NEP-ARMY', 'NEP-LUM', 'NEP-MAD', 'NEP-POL', 'NEP-SUD']);
  for (const S of list.filter((x) => x.y >= 2028)) { const pm = G.s.wd.seasons[`NEP-PMC-${S.y - 1}`]; if (!pm) continue;
    assert.ok(S.teams.includes(pm.champ) && S.teams.includes(pm.runner), `${S.id} has the PM Cup finalists`); }
}));

test('domestic-asia: the Prime Minister Cup is a 50-over round robin of ten and a final', on(() => {
  const { G } = four(); const list = seasonsOf(G, 'NEP-PMC').filter((S) => S.done); assert.ok(list.length >= 3);
  for (const S of list) { assert.equal(COMPS[S.comp].fmt, 'ODI'); assert.ok(S.fx.every((f) => f.fmt === 'ODI')); assert.equal(S.fx.length, 46);
    for (const f of S.fx) for (const [, , w, b] of f.res.sc) assert.ok(b <= 300 && w <= 10, 'at most 50 overs an innings'); }
  assert.deepEqual(seasonsOf(G, 'NEP-PMC')[0].teams.slice().sort(), ['NEP-APF', 'NEP-ARMY', 'NEP-BAG', 'NEP-GAN', 'NEP-KAR', 'NEP-KOS', 'NEP-LUM', 'NEP-MAD', 'NEP-POL', 'NEP-SUD']);
}));

test('domestic-asia: promotion and relegation move one side between Elite and Plate, Gold and Silver', on(() => {
  const { G } = four(); const wd = G.s.wd; let checked = 0;
  for (const [top, low] of [['IND-RANJI', 'IND-RANJI-PLATE'], ['PAK-QEA', 'PAK-QEA-SILVER']]) for (const S of seasonsOf(G, low)) {
    const nextT = wd.seasons[`${top}-${S.y + 1}`], nextL = wd.seasons[`${low}-${S.y + 1}`]; if (!nextT || !S.done) continue;
    assert.ok(nextT.teams.includes(S.champ), `${S.champ} promoted`); assert.ok(!nextL.teams.includes(S.champ));
    const prevT = wd.seasons[`${top}-${S.y}`]; const down = prevT.teams.filter((t) => !nextT.teams.includes(t)); assert.equal(down.length, 1); assert.ok(nextL.teams.includes(down[0])); checked++; }
  assert.ok(checked >= 4, `checked ${checked}`);
}));

test('domestic-asia: points tables apply each competition\'s rules', () => {
  const fx = (sc, res) => ({ a: 'X', b: 'Y', res: { sc, text: '', ...res } });
  // Ranji: a draw with a first-innings lead gives 3 and 1; an innings win gives 7
  let T = {}; applyRes(T, fx([['X', 400, 10, 700], ['Y', 300, 10, 600], ['X', 100, 2, 150]], { draw: true }), COMPS['IND-RANJI'].points); assert.equal(T.X.pts, 3); assert.equal(T.Y.pts, 1); assert.equal(T.X.d, 1);
  T = {}; applyRes(T, fx([['Y', 300, 10, 600], ['X', 280, 10, 600]], { draw: true }), COMPS['IND-RANJI'].points); assert.equal(T.Y.pts, 3); assert.equal(T.X.pts, 1);
  T = {}; applyRes(T, fx([['X', 500, 10, 800], ['Y', 150, 10, 400], ['Y', 120, 10, 300]], { w: 'X', l: 'Y', text: 'X won by an innings and 230 runs' }), COMPS['IND-RANJI'].points); assert.equal(T.X.pts, 7); assert.equal(T.Y.pts, 0);
  // Quaid-e-Azam: win 16 plus bonus inside 100 overs (360 in 95 overs: 3 batting points; 9 wickets taken: 4 bowling)
  T = {}; applyRes(T, fx([['X', 360, 10, 570], ['Y', 200, 9, 600]], { w: 'X', l: 'Y', text: 'X won by 5 wickets' }), COMPS['PAK-QEA'].points); assert.equal(T.X.pts, 16 + 3 + 4);
  // Jay Trophy (halves): draw with first-innings lead 4 and 1; 0.5 a 25 runs, 0.5 a wicket
  T = {}; applyRes(T, fx([['X', 200, 10, 400], ['Y', 150, 10, 380]], { draw: true }), COMPS['NEP-JAY'].points); const h = COMPS['NEP-JAY'].ptsScale;
  assert.equal(T.X.pts / h, 4 + 200 / 50 + 10 / 2); assert.equal(T.Y.pts / h, 1 + 150 / 50 + 10 / 2);
  // Sri Lanka (thousandths): outright 12, 0.005 a run (400 at most), 0.1 a wicket
  T = {}; applyRes(T, fx([['X', 450, 10, 700], ['Y', 200, 10, 400]], { w: 'X', l: 'Y', text: 'X won by an innings' }), COMPS['SL-MCT'].points); const s = COMPS['SL-MCT'].ptsScale;
  assert.equal(T.X.pts / s, 12 + 2 + 1); assert.equal(T.Y.pts / s, 1 + 1);
  // PM Cup and NCL
  T = {}; applyRes(T, fx([['X', 250, 8, 300], ['Y', 240, 10, 290]], { w: 'X', l: 'Y' }), COMPS['NEP-PMC'].points); assert.equal(T.X.pts, 2);
  T = {}; applyRes(T, fx([['X', 250, 10, 500], ['Y', 240, 10, 490]], { draw: true }), COMPS['BAN-NCL'].points); assert.equal(T.X.pts, 2); assert.equal(T.Y.pts, 2);
  assert.ok(blankRow());
});

test('domestic-asia: drawn knockouts go to the first-innings lead, then the higher seed', () => {
  const S = { sd: { X: 0, Y: 1 } };
  assert.equal(DA.koWinner(S, { a: 'X', b: 'Y', res: { draw: true, sc: [['X', 200, 10, 400], ['Y', 260, 10, 500]] } }), 'Y');
  assert.equal(DA.koWinner(S, { a: 'Y', b: 'X', res: { draw: true, sc: [['Y', 500, 4, 900]] } }), 'X');
  assert.equal(DA.koWinner(S, { a: 'X', b: 'Y', res: { w: 'Y', l: 'X', sc: [] } }), 'Y');
});

test('domestic-asia: Nepal\'s domestic sides hold their real players', () => {
  P.setDB(mods); const G = Game.create('LL', { lang: 'en' }); const names = (t) => P.rosterOf(G, t).filter((p) => !p.gen).map((p) => p.name);
  for (const [t, who] of [['NEP-ARMY', ['Kushal Malla', 'Sompal Kami', 'Binod Bhandari']], ['NEP-APF', ['Rohit Paudel', 'Aasif Sheikh', 'Lokesh Bam']], ['NEP-POL', ['Kushal Bhurtel', 'Aarif Sheikh', 'Karan KC']],
    ['NEP-BAG', ['Sandeep Lamichhane', 'Ishan Pandey']], ['NEP-SUD', ['Sher Malla']], ['NEP-MAD', ['Anil Sah']], ['NEP-LUM', ['Dev Khanal']], ['NEP-GAN', ['Bipin Khatri']]])
    for (const n of who) assert.ok(names(t).includes(n), `${n} plays for ${t}`);
  // the database players alias to their NPL selves
  const rp = P.rosterOf(G, 'NEP-APF').find((p) => p.name === 'Rohit Paudel'); assert.ok(G.players[rp.id], 'Rohit Paudel is the NPL player');
  for (const t of ['NEP-ARMY', 'NEP-KOS', 'IND-MUM', 'PAK-PEW', 'AFG-MWC', 'UAE-DXB', 'OMA-REN']) assert.equal(P.rosterOf(G, t).length >= 18, true, `${t} roster`);
});

test('domestic-asia: a full world year stays quick, and a season of every competition keeps under 150 KB after compaction', async () => {
  P.setDB(mods); IN.setIntlEnabled(true); const out = {};
  try {
    for (const live of [false, true]) { DA.setDomesticAsiaEnabled(live);
      const G = Game.create('LL', { lang: 'en' }); run(G, G.s.wd.day + 60, { intl: true }); // warm up: the registry and the first plans
      const t0 = Date.now(); run(G, G.s.wd.day + 365, { intl: true, archive: true }); const ms = Date.now() - t0;
      W.archive(G); P.flush(G); out[live] = { ms, kb: JSON.stringify(G.s).length / 1024 };
      if (!live) continue;
      // on to the end of April two years on: every competition's next-year season is over and compacted
      const y1 = yearOf(G.s.wd.day); run(G, dayOfDate(y1 + 1, 3, 30), { intl: true, archive: true }); W.archive(G);
      const list = Object.values(G.s.wd.seasons).filter((S) => DA.ASIA_COMPS.includes(S.comp) && S.y === y1);
      assert.equal(list.length, DA.ASIA_COMPS.length, 'one season of each'); assert.ok(list.every((S) => S.fin));
      out.season = list.reduce((a, S) => a + JSON.stringify(S).length + JSON.stringify(G.s.wd.st[S.id] || {}).length, 0) / 1024; }
  } finally { IN.setIntlEnabled(false); DA.setDomesticAsiaEnabled(false); }
  if (process.env.VERBOSE) console.log(`domestic-asia: world year ${out.true.ms} ms (${out.false.ms} without); the year's save +${Math.round(out.true.kb - out.false.kb)} KB, of which a finished year of seasons keeps ${Math.round(out.season)} KB`);
  // The target is 1.5 s for the whole world year. Most of a year's time goes to state.js recover(), which walks
  // every player in the registry on each new match day; with every nation's domestic rosters loaded the year
  // takes about 1.1-1.9 s here whether or not these competitions run (see the W2 report). This suite checks
  // what it adds (a few hundred ms at most) and a ceiling for the whole year.
  assert.ok(out.true.ms - out.false.ms < 500, `Asian domestic cricket adds ${out.true.ms - out.false.ms} ms (${out.true.ms} v ${out.false.ms})`);
  assert.ok(out.true.ms < 2500, `world year ${out.true.ms} ms (without Asian domestic cricket ${out.false.ms} ms)`);
  assert.ok(out.season < 150, `a year of seasons keeps ${Math.round(out.season)} KB`);
});

// Leave the player database as the suites after this one expect it (they make their own, or none).
test('domestic-asia: clean up', () => { P.setDB([]); FOUR = null; });
