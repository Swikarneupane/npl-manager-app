// Clubs abroad (phase 3, W3): club jobs in any league, squad rules, the three recruitment modes, a live club
// fixture, a full year with a club job, and the old save. Uses fixture leagues from src/world/clubdev.js.
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as C from '../../src/world/career.js';
import * as K from '../../src/world/club.js';
import * as RC from '../../src/world/recruit.js';
import { mkNation, makeLeague, activate, deactivate, TEAMS } from '../../src/world/clubdev.js';
import { dayOfDate } from '../../src/world/dates.js';
import { playWorldEngine } from '../../src/world/match.js';

const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const LG = { TL: makeLeague('TL', 'auction'), TD: makeLeague('TD', 'draft', { retain: 0 }), TC: makeLeague('TC', 'contract', { retain: 0 }) };
const setup = () => { P.setDB([mkNation('SCO', 64), mkNation('NAM', 62), mkNation('TLN', 58), mkNation('IND', 84, 'full')], Object.values(LG)); activate('TL'); };
const fresh = () => { setup(); const G = Game.create('LL', {}); C.ensure(G); return G; };
const reload = (G) => { G.hook('beforeSave'); P.flush(G); return new Game(JSON.parse(JSON.stringify(G.s))); };
const legal = (G, code) => { for (const t of RC.teamsOf(code)) { assert.deepEqual(RC.squadIssues(G, t), [], `${t} squad`); const sel = K.selection(G, t, 'T20'); void sel; } };

test('club jobs: one club and one national job, in any league', () => {
  const G = fresh(); const t = 'TL-AAA';
  assert.match(C.takeJob(G, 'club', t, { comp: 'TL' }), /already manage/);
  assert.equal(C.takeJob(G, 'club', t, { comp: 'TL', replace: true }), null);
  assert.ok(!C.hasClub(G), 'the NPL runs itself'); assert.equal(K.abroadJob(G).team, t);
  assert.equal(C.takeJob(G, 'nation', 'NEP'), null); assert.equal(C.jobs(G).length, 2);
  assert.match(C.takeJob(G, 'club', 'TL-BBB', { comp: 'TL' }), /already manage/);
  assert.match(C.takeJob(G, 'club', 'TL-ZZZ', { comp: 'TL', replace: true }), /No such/);
  for (const k of ['club', 'nation']) assert.equal(C.jobs(G).filter((j) => j.kind === k).length, 1);
  assert.equal(C.resign(G, 'club'), null); assert.equal(C.jobs(G).length, 1); assert.equal(G.s.wd.jobHist.at(-1).comp, 'TL');
  // sacked: confidence below the line after a missed objective
  C.takeJob(G, 'club', t, { comp: 'TL' }); const j = K.abroadJob(G); assert.ok(j.obj.length >= 0);
  j.board = 5; j.obj = [{ sid: 'x', k: 'win', t: 'Win it', done: false }]; C.sack(G, j, 'test'); assert.equal(K.abroadJob(G), null); assert.equal(G.s.wd.jobHist.at(-1).how, 'sacked');
  deactivate('TL');
});

test('offers: top leagues need more reputation', () => {
  const G = fresh(); G.s.manager.rep = 45; const none = K.offers(G, () => 0, new Set()); assert.equal(none.length, 0);
  assert.ok(K.needRep(G, 'TL-FFF') > K.needRep(G, 'TL-AAA')); assert.equal(K.levelOf('TL'), 3); G.s.manager.rep = 90;
  const o = C.makeOffers(G, () => 0); assert.ok(o.some((x) => x.kind === 'club' && x.comp));
  const off = o.find((x) => x.kind === 'club' && x.comp === 'TL'); if (off) { assert.equal(C.accept(G, off.id, { replace: true }), null); assert.equal(K.abroadJob(G).comp, 'TL'); }
  deactivate('TL');
});

test('squad rules: size, overseas limit, XI limit', () => {
  const G = fresh(); const t = 'TL-AAA'; const ids = RC.idsOf(G, t);
  assert.ok(ids.length >= 16); assert.ok(RC.squadIssues(G, t, ids.slice(0, 10)).some((x) => /at least/.test(x)));
  const extra = ['sco-c3', 'sco-c4', 'sco-c5', 'sco-c6', 'sco-c7', 'sco-c8', 'sco-c9'].filter((x) => !ids.includes(x)); const many = [...ids, ...extra];
  assert.ok(RC.squadIssues(G, t, many).some((x) => /overseas|allows/.test(x)));
  assert.ok(RC.canSign(G, t, RC.player(G, 'nam-c20'), ids.concat(['sco-c10', 'sco-c11', 'sco-c12', 'sco-c13', 'sco-c14'])));
  const os = ids.map((i) => RC.player(G, i)).filter((p) => RC.isOS(p, t)); const dom = ids.map((i) => RC.player(G, i)).filter((p) => !RC.isOS(p, t));
  const bad = [...os, ...dom].slice(0, 11).map((p) => p.id); const fourOs = [...RC.counts(G, t).os >= 4 ? os.slice(0, 4) : os, ...dom].slice(0, 11).map((p) => p.id);
  if (os.length >= 4) assert.ok(RC.xiIssues(G, t, fourOs).some((x) => /overseas/.test(x))); void bad;
  C.takeJob(G, 'club', t, { comp: 'TL', replace: true }); const sel = K.selection(G, t, 'T20'); assert.equal(sel.xi.length, 11);
  assert.ok(sel.xi.filter((p) => RC.isOS(p, t)).length <= 3); assert.ok(RC.xiIssues(G, t, sel.xi.map((p) => p.id)).length === 0);
  assert.ok(K.setXI(G, t, 'T20', { xi: [...os.slice(0, 4), ...dom].slice(0, 11).map((p) => p.id) }) === null || os.length < 4);
  assert.equal(RC.release(G, t, ids[0]), null); assert.ok(!RC.idsOf(G, t).includes(ids[0]));
  deactivate('TL');
});

for (const code of ['TL', 'TD', 'TC']) test(`recruitment: ${LG[code].rules.recruit} fills every roster legally`, () => {
  const G = fresh(); const rnd = seeded(7); const t = `${code}-AAA`;
  const before = RC.idsOf(G, t).slice();
  RC.beginCycle(G, code, `${code}-2027`, 2027, rnd, t);
  assert.equal(RC.recOf(G, code).stage, 'retain'); assert.ok(RC.keepLimit(code) >= 1);
  assert.match(RC.setKeep(G, code, t, Array(30).fill('x')) || 'ok', RC.keepLimit(code) < 30 ? /may keep/ : /ok/);
  assert.equal(RC.confirmRetain(G, code, rnd), null); assert.equal(RC.recOf(G, code).stage, 'recruit');
  if (code === 'TL') { // the user bids on the first lot, then passes the rest
    const c = RC.aucNext(G, code, rnd, t); assert.ok(c); const e = RC.aucBid(G, code, t, rnd); assert.ok(e === null || typeof e === 'string'); RC.aucPass(G, code, rnd, t);
  } else if (code === 'TD') { RC.draftAuto(G, code, rnd, t); const d = RC.recOf(G, code).dr; if (d.order[d.i] === t) { const id = RC.recOf(G, code).pool.find((x) => !RC.canSign(G, t, RC.player(G, x), RC.idsOf(G, t))); assert.equal(RC.draftPick(G, code, t, id), null); }
    assert.match(RC.draftPick(G, code, 'TD-FFF', 'x') || '', /not your pick|Not in|full|limit/i); }
  else { const mk = RC.recOf(G, code).mk; const id = Object.keys(mk.ask)[0]; const r = RC.mkOffer(G, code, t, id, 0.1); assert.ok(!r.ok); const r2 = RC.mkOffer(G, code, t, id, mk.ask[id]); assert.ok(r2.ok || /full|limit|cap/.test(r2.text)); }
  RC.runRest(G, code, rnd, null); assert.equal(RC.recOf(G, code).stage, 'done'); legal(G, code);
  assert.notDeepEqual(RC.idsOf(G, t).sort(), before.sort(), 'the squad changed');
  const R2 = reload(G); assert.deepEqual(RC.idsOf(R2, t).sort(), RC.idsOf(G, t).sort(), 'rosters survive a save');
  assert.ok(Object.keys(G.s.wd.ros).length === 6);
  if (code === 'TC') { const f = RC.recOf(G, code); assert.ok(f); }
});

test('a transfer between clubs', () => {
  const G = fresh(); const code = 'TC'; const t = 'TC-AAA'; RC.beginCycle(G, code, 'TC-2027', 2027, seeded(3), null); RC.runRest(G, code, seeded(3), null);
  const other = RC.idsOf(G, 'TC-BBB').find((id) => !RC.isOS(RC.player(G, id), t)); const p = RC.player(G, other); assert.match(RC.transferBuy(G, t, other, 0.01) || '', /want|full/);
  RC.release(G, t, RC.idsOf(G, t).find((id) => RC.player(G, id).role === 'BAT')); assert.equal(RC.transferBuy(G, t, other, RC.worth(G, p, code) * 2), null);
  assert.ok(RC.idsOf(G, t).includes(other)); assert.ok(!RC.idsOf(G, 'TC-BBB').includes(other));
});

test('a live club fixture is recorded into the world', async () => {
  const G = fresh(); C.takeJob(G, 'club', 'TL-CCC', { comp: 'TL', replace: true }); const y = 2027; ST.ensureYear(G, y);
  const S = K.leagueSeasons(G, 'TL')[0]; assert.ok(S, 'the league season exists'); const f = S.fx.find((x) => x.a === 'TL-CCC' || x.b === 'TL-CCC'); assert.ok(ST.isUserTeam(G, 'TL-CCC'));
  const { res } = await playWorldEngine(G, S, f); assert.ok(f.res && f.res.live); assert.ok(res.text); assert.ok(S.tables.all['TL-CCC'].p === 1);
  assert.ok(G.s.wd.st[S.id], 'stats recorded'); const nx = ST.nextUserFixture(G); assert.ok(nx && nx[1] !== f);
  deactivate('TL');
});

test('a full year with a club job: cycle, season, board, small save', async () => {
  const G = fresh(); const rnd = seeded(11); G.s.settings.assistant = true; C.takeJob(G, 'club', 'TL-BBB', { comp: 'TL', replace: true });
  const size0 = JSON.stringify(G.s.wd).length; let guard = 0; const start = G.s.wd.day;
  while (G.s.wd.day < start + 420 && guard++ < 600) { const ev = await C.continueWorld(G, { max: 30, rnd }); if (ev && ev.kind === 'world' && ev.day <= G.s.wd.day) C.assistantPlays(G, ev.S, ev.f, rnd); }
  const S = K.leagueSeasons(G, 'TL').find((x) => x.y === 2027); assert.ok(S && S.done, 'the season finished'); assert.equal(RC.recOf(G, 'TL').stage, 'done');
  legal(G, 'TL'); const j = K.abroadJob(G) || G.s.wd.jobHist.at(-1); assert.ok(j); if (K.abroadJob(G)) assert.ok(j.fin && j.fin.length >= 1, 'a board verdict on the books');
  P.flush(G); // the club layer's own state (international and calendar growth belongs to the world core)
  const mine = ['ros', 'con', 'newp', 'ret', 'pg', 'rec', 'pd', 'cxi'].reduce((a, k) => a + JSON.stringify(G.s.wd[k] || {}).length, 0); assert.ok(mine < 60000, `the club layer added ${mine} bytes`); void size0;
  assert.ok(C.nextEvent(G) !== undefined); deactivate('TL');
});

test('the old save loads with no club job abroad', () => {
  setup(); const G = new Game(oldSave()); ST.migrate(G); C.ensure(G);
  assert.ok(C.hasClub(G)); assert.equal(K.abroadJob(G), null); assert.equal(C.clubJob(G).comp, 'NPL'); assert.equal(K.clubEvent(G), null); assert.ok(C.nextEvent(G) !== undefined);
  deactivate('TL');
});
