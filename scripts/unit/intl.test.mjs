// The international programme (W1): the pathway, World Cups, the bilateral programme, rankings,
// Nepal's games in the save, speed and save size. The programme is switched on only inside these
// tests, so the other suites keep their own small worlds.
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as ST from '../../src/world/state.js';
import * as IN from '../../src/world/intl.js';
import * as RK from '../../src/world/rankings.js';
import * as W from '../../src/game/world.js';
import { dayOfDate, yearOf } from '../../src/world/dates.js';
import { REAL } from '../../src/data/world/calendar.js';
import { T20WC_2026 } from '../../src/game/world-data.js';

IN.setIntlEnabled(false);
const on = (fn) => async () => { IN.setIntlEnabled(true); try { await fn(); } finally { IN.setIntlEnabled(false); } };
// Move the world a week at a time to the given day, ticking as the game does.
function run(G, until, archive = false) { for (let d = G.s.wd.day; d < until; ) { d = Math.min(until, d + 7); ST.advance(G, d, { auto: true }); IN.tick(G); if (archive) W.archive(G); } }
let SIX = null; // one six-year world, shared by the tests that only read it
function six() { if (!SIX) { SIX = Game.create('LL', { lang: 'en' }); run(SIX, dayOfDate(2032, 9, 1)); } return SIX; }
const S_ = (G, id) => G.s.wd.seasons[id];
const fxOf = (S, k) => S.fx.filter((f) => f.stage === k).length;

test('intl: every year from 2026 to 2032 plans and plays without errors', on(() => {
  const G = six(); const wd = G.s.wd;
  for (let y = 2026; y <= 2032; y++) { const P = IN.programme(G, y); assert.ok(P.length > 50, `${y}: ${P.length} items`); assert.ok(wd.years[y], `${y} planned`); }
  for (const id of ['CWCPO-2026', 'CWCQ-2027', 'WC50-2027', 'ASIA-2027', 'T20GQ-2028', 'T20WC-2028', 'ASIA-2029', 'T20WC-2030', 'CWCPO-2030', 'CWCQ-2031', 'WC50-2031', 'T20WC-2032'])
    { const S = S_(G, id); assert.ok(S, `${id} exists`); assert.ok(S.done && S.champ, `${id} finished with a champion`); }
  for (const S of Object.values(wd.seasons)) { if (S.real) continue; assert.ok(S.fx.length > 0, `${S.id} has fixtures`); for (const f of S.fx) if (f.d < wd.day - 3) assert.ok(f.res, `${S.id} ${f.a} v ${f.b} on day ${f.d} was played`); }
  assert.ok(Object.values(wd.seasons).every((S) => S.real || S.fx.every((f) => f.a !== f.b)), 'no team plays itself');
}));

test('intl: League 2 has the real eight; the real Play-off field; progression to the Qualifier, the World Cup and the next cycle', on(() => {
  const G = six(); const L2 = S_(G, 'CWCL2-2023');
  assert.deepEqual(L2.teams.slice().sort(), ['CAN', 'NAM', 'NED', 'NEP', 'OMA', 'SCO', 'UAE', 'USA']); assert.ok(L2.real && L2.done);
  const t = ST.tableOf(L2, 'all'); assert.deepEqual(t.map((r) => r.id), ['USA', 'SCO', 'NED', 'OMA', 'NAM', 'NEP', 'CAN', 'UAE'], 'the real final order'); assert.equal(t[0].pts, 49); assert.ok(Math.abs(t[0].nrr - 0.653) < 0.001);
  const PO = S_(G, 'CWCPO-2026'); assert.deepEqual(PO.teams.slice().sort(), REAL.po26.teams.slice().sort()); assert.equal(PO.fx.length, 28, 'a single round robin of 28');
  const Q = S_(G, 'CWCQ-2027'); const po4 = IN.placing(PO).slice(0, 4);
  assert.deepEqual(Q.teams.slice().sort(), ['WI', 'IRE', 'USA', 'SCO', 'NED', 'OMA', ...po4].sort(), 'Qualifier: two full members, League 2 top four, Play-off top four');
  const q4 = IN.placing(Q).slice(0, 4); const WC = S_(G, 'WC50-2027'); for (const c of q4) assert.ok(WC.teams.includes(c), `${c} reaches the World Cup`);
  assert.equal(WC.teams[8], q4[0], 'the Qualifier winner joins Group A'); assert.deepEqual(WC.teams.slice(0, 3).sort(), q4.slice(1).sort(), 'the next three play the Super Series');
  const nxt = S_(G, 'CWCL2-2027'); assert.deepEqual(nxt.teams.slice().sort(), Q.teams.filter((c) => !IN.isFull(c)).sort(), 'the next League 2 is the Qualifier’s associates');
  const CL = S_(G, 'CL-2027'); assert.equal(CL.teams.length, 12); for (const c of [...IN.placing(PO).slice(4), 'DEN', 'PNG', 'HK', 'BHR']) assert.ok(CL.teams.includes(c), `${c} in the Challenge League`);
  for (const c of REAL.cl.relegated) assert.ok(!CL.teams.includes(c), `${c} was relegated`);
  const PO2 = S_(G, 'CWCPO-2030'); const l2b = IN.placing(nxt).slice(4); const clTop = Object.keys(CL.tables).flatMap((k) => ST.tableOf(CL, k).slice(0, 2).map((r) => r.id));
  assert.deepEqual(PO2.teams.slice().sort(), [...l2b, ...clTop].sort(), 'Play-off 2030: League 2 bottom four and the Challenge League top two of each');
  // Nepal's place on the pathway comes from the game
  assert.equal(S_(G, 'CWCQ-2027').teams.includes('NEP'), po4.includes('NEP')); assert.equal(WC.teams.includes('NEP'), q4.includes('NEP'));
}));

test('intl: World Cups have the right size and format', on(() => {
  const G = six(); const WC = S_(G, 'WC50-2027'); const inf = IN.info(WC);
  assert.equal(WC.teams.length, 14); assert.deepEqual(inf.stages, ['Super Series', 'Group stage', 'Super 7', 'Semi-finals', 'Final']);
  assert.deepEqual([0, 1, 2, 3, 4].map((k) => fxOf(WC, k)), [3, 30, 21, 2, 1]); assert.equal(WC.fx.length, 57);
  assert.deepEqual(WC.dg[1].map((g) => g.length), [6, 6]); assert.equal(WC.dg[2][0].length, 7);
  for (const c of REAL.wc27.groups.A) assert.ok(WC.dg[1][0].includes(c)); for (const c of REAL.wc27.groups.B) assert.ok(WC.dg[1][1].includes(c));
  assert.equal(IN.cupHosts(WC), 'South Africa, Zimbabwe and Namibia'); assert.equal(WC.fx.find((f) => f.stage === 4).d, dayOfDate(2027, 10, 21), 'final on 21 November');
  for (const id of ['T20WC-2028', 'T20WC-2030', 'T20WC-2032']) {
    const T = S_(G, id); assert.equal(T.teams.length, 20, id); assert.deepEqual(IN.info(T).stages, ['Group stage', 'Super 10', 'Eliminators', 'Semi-finals', 'Final']);
    assert.deepEqual([0, 1, 2, 3, 4].map((k) => fxOf(T, k)), [30, 20, 2, 2, 1], id); assert.deepEqual(T.dg[1].map((g) => g.length), [5, 5]);
  }
  const T28 = S_(G, 'T20WC-2028'); for (const c of REAL.t20wc28.auto) assert.ok(T28.teams.includes(c), `${c} qualified automatically`);
  assert.equal(T28.start, dayOfDate(2028, 9, 12)); const GQ = S_(G, 'T20GQ-2028'); assert.equal(GQ.teams.length, 16); for (const c of REAL.t20wc28.gqDirect) assert.ok(GQ.teams.includes(c));
  const q = IN.gqQualifiers(GQ); assert.equal(q.length, 8); for (const c of q) assert.ok(T28.teams.includes(c));
  for (const c of ['ENG', 'IRE', 'SCO']) assert.ok(S_(G, 'T20WC-2030').teams.includes(c), `${c} host 2030`);
  const A = S_(G, 'ASIA-2027'); assert.deepEqual(A.teams.slice().sort(), REAL.asia27.teams.slice().sort()); assert.equal(A.start, dayOfDate(2027, 5, 18));
}));

test('intl: the bilateral programme gives every nation games and the full members 16–48 a year (World Cup years run higher)', on(() => {
  const G = six();
  for (const Y of [2027, 2028, 2029, 2030, 2031]) { const c = {}; for (const S of Object.values(G.s.wd.seasons)) { if (IN.info(S).listA) continue; for (const f of S.fx) if (yearOf(f.d) === Y) { c[f.a] = (c[f.a] || 0) + 1; c[f.b] = (c[f.b] || 0) + 1; } }
    for (const n of IN.FULL) assert.ok(c[n] >= 16 && c[n] <= 48, `${Y} ${n}: ${c[n]} white-ball internationals`); // a side knocked out early plays fewer
    for (const n of IN.ASSOC) assert.ok(c[n] >= 5, `${Y} ${n}: ${c[n] || 0}`);
    assert.ok(c.NEP >= 10, `${Y} Nepal: ${c.NEP}`); }
  const nepHome = Object.values(G.s.wd.seasons).filter((S) => S.teams[0] === 'NEP' && /Kirtipur|Mulpani/.test(S.name)); assert.ok(nepHome.length >= 3, 'Nepal host series at Kirtipur and Mulpani');
  const ban = S_(G, 'NEPBAN-2027'); assert.deepEqual(ban.fx.map((f) => f.d), [dayOfDate(2027, 2, 26), dayOfDate(2027, 2, 28), dayOfDate(2027, 2, 30)], 'the real March 2027 dates');
}));

test('intl: Nepal’s world fixtures become caps, logs and news in the save', on(() => {
  const G = six(); const nep = Object.values(G.players).filter((p) => p.nat === 'NEP' && p.intlG);
  let caps = 0; for (const p of nep) caps += p.intlG.odi + p.intlG.t20i;
  let apps = 0; for (const S of Object.values(G.s.wd.seasons)) { if (!IN.info(S).official || S.real) continue; const T = G.s.wd.st[S.id] || {}; for (const id in T) if (G.players[id] && G.players[id].nat === 'NEP') apps += T[id][0]; }
  assert.ok(apps > 300); assert.equal(caps, apps, 'one cap per appearance in an official international');
  assert.ok(nep.some((p) => p.intlLog.length > 10)); assert.ok(G.s.nepal.results.length >= 1 && G.s.nepal.results.every((r) => r.games.length >= 1 && r.w + r.l + r.nr === r.games.length));
  assert.ok(G.s.inbox.some((n) => n.kind === 'intl' && /in-game/.test(n.detail || '')), 'news is labelled in-game');
  assert.ok(Object.values(G.s.wd.seasons).filter((S) => S.teams.includes('NEP')).every((S) => S.fx.every((f) => !f.res || f.nx || (f.a !== 'NEP' && f.b !== 'NEP'))), 'every Nepal result was seen');
}));

test('intl: rankings come from in-game results and are labelled', on(() => {
  const G = six(); assert.equal(RK.LABEL, 'in-game, not ICC');
  const t20 = RK.teamTable(G, 'T20'), odi = RK.teamTable(G, 'ODI'); assert.ok(t20.length >= 40); assert.ok(odi.length >= 14 && odi.length < IN.ALL.length && odi.every((x) => x.matches > 0), 'only teams with ODIs in the ODI table');
  assert.ok(odi.every((x, i) => i === 0 || odi[i - 1].rating >= x.rating)); assert.ok(IN.FULL.filter((c) => odi.slice(0, 12).some((x) => x.code === c)).length >= 8, 'full members lead the ODI table'); // upsets can lift an associate or two
  const pl = RK.playerTable(G, 'T20'); for (const k of ['bat', 'bowl']) assert.ok(pl[k].length >= 10, k); assert.ok(pl.ar.length >= 1, 'all-rounders'); assert.ok(pl.bat.some((x) => x.nat === 'NEP'));
  assert.ok(!pl.bat.some((x) => /player \d+$/.test(x.name)), 'generated placeholders are not ranked');
  RK.snapshot(G); assert.ok(G.s.wd.intl.rk.prev.T20.IND >= 1);
}));

test('intl: three years of world cricket take under 12 seconds and the save stays under 2500 KB', on(() => {
  const G = Game.create('LL', { lang: 'en' }); const t0 = Date.now(); run(G, dayOfDate(2029, 9, 1)); const ms = Date.now() - t0;
  assert.ok(ms < 12000, `three years in ${ms} ms`); // budgets with every domestic competition running (W2): saves sit near 1.2 MB after three world years; the cloud limit is 4 MB
  W.archive(G); const size = JSON.stringify(G.s).length; assert.ok(size < 2500000, `save ${Math.round(size / 1024)} KB`);
  const G2 = new Game(JSON.parse(JSON.stringify(G.s))); run(G2, G2.s.wd.day + 60); assert.ok(Object.values(G2.s.wd.seasons).some((S) => S.fx.some((f) => f.res && f.d > G.s.wd.day)), 'a reloaded save keeps playing');
}));

test('intl: an old save loads, plays its NPL and an off-season on the world calendar', on(async () => {
  const G = new Game(oldSave()); assert.ok(G.s.wd && G.s.wd.intl, 'the world and the programme are added');
  while (!G.leagueDone()) { await G.playFixture(G.nextFixture(), null); G.expireDecisions(Infinity); }
  G.setupPlayoffs(); let ch = null; while (!ch) { const f = G.nextFixture(); if (f) await G.playFixture(f, null); ch = G.advancePlayoffs(); } G.seasonAwards(ch);
  assert.ok(Object.values(G.s.wd.seasons).some((S) => S.fx.some((f) => f.res)), 'world games were played alongside the NPL');
  const caps0 = Object.values(G.players).reduce((a, p) => a + (p.intlG ? p.intlG.odi + p.intlG.t20i : 0), 0);
  G.startOffseason(); await W.playWinter(G, async () => {});
  assert.equal(G.s.nepal.winter, G.year - 1); assert.ok(G.s.nepal.results.length > 0); assert.equal(G.s.nepal.contractYear, G.year);
  assert.ok(Object.values(G.players).reduce((a, p) => a + (p.intlG ? p.intlG.odi + p.intlG.t20i : 0), 0) > caps0, 'caps from the winter');
  assert.ok(G.s.wd.day >= dayOfDate(G.year, 8, 30));
  const G2 = new Game(JSON.parse(JSON.stringify(G.s))); run(G2, G2.s.wd.day + 30); assert.ok(G2.s.wd.day > G.s.wd.day);
}));

test('intl: real facts in the calendar match the sources', () => {
  assert.equal(REAL.t20wc28.hosts, 'Australia and New Zealand'); assert.equal(REAL.hosts.t20wc30.hosts, 'England, Ireland and Scotland'); assert.equal(REAL.hosts.wc31.hosts, 'India and Bangladesh');
  assert.equal(REAL.wc27.hosts, 'South Africa, Zimbabwe and Namibia'); assert.deepEqual(REAL.po26.start, [2026, 11, 4]); assert.equal(REAL.po26.venue, 'Kirtipur and Mulpani');
  for (const r of REAL.l2.table) { const [, p, w, l, t, nr, pts] = r; assert.equal(w + l + t + nr, p); assert.equal(w * 2 + t + nr, pts, r[0]); }
  for (const g of Object.values(REAL.cl.groups)) for (const r of g) { const [, p, w, l, t, nr, pts] = r; assert.equal(w + l + t + nr, p); assert.equal(w * 2 + t + nr, pts, r[0]); }
  assert.equal(T20WC_2026.champ, 'India'); assert.equal(T20WC_2026.hosts, 'India and Sri Lanka');
});
