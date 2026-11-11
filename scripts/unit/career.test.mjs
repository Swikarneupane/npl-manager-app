// Careers (phase 3, W1): jobs, offers, national boards, national squads, live national matches,
// the NPL on the world clock with and without a club, and old saves.
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as C from '../../src/world/career.js';
import { registerComps } from '../../src/world/comps.js';
import { newSeason } from '../../src/world/comp.js';
import { dayOfDate, yearOf } from '../../src/world/dates.js';
import { playWorldEngine, worldGame, newWorldMatch } from '../../src/world/match.js';

const ROLES = ['BAT', 'BAT', 'BAT', 'BAT', 'WK', 'WK', 'AR', 'AR', 'AR', 'BOWL', 'BOWL', 'BOWL', 'BOWL', 'BOWL', 'BOWL'];
const mkNation = (code, lvl, member = 'associate') => ({ code, name: code, member, players: Array.from({ length: 20 }, (_, i) => { const role = ROLES[i % 15]; return [`${code.toLowerCase()}-c${i}`, `${code} Career ${i}`, code, 1995 + (i % 10), role, role === 'BOWL' ? 25 : lvl + (i % 7) - 3, role === 'BAT' || role === 'WK' ? 0 : lvl + (i % 5) - 2, ['RFM', 'OB', 'LB', 'SLA', 'RF'][i % 5], 'R', {}, [code]]; }) });
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
// Test competitions: a League 2-style events table through the NPL season, and a T20I series in the spring.
// The planner only runs while these tests do, so later test files see a clean calendar.
let ACTIVE = false;
registerComps({
  CT_L2: { id: 'CT_L2', name: 'League 2 test', fmt: 'ODI', kind: 'international', stages: [{ type: 'events', size: 3, legs: 2, count: 4 }] },
  CT_T20: { id: 'CT_T20', name: 'T20I series test', fmt: 'T20', kind: 'international', stages: [{ type: 'series', n: 3 }] },
}, (G, y) => (!ACTIVE ? [] : [
  { comp: 'CT_L2', teams: ['NEP', 'SCO', 'NAM', 'OMA'], start: dayOfDate(y, 8, 10), end: dayOfDate(y, 11, 15) },
  { comp: 'CT_T20', id: `CT_T20-${y}`, name: 'Namibia v Nepal T20Is', teams: ['NAM', 'NEP'], start: dayOfDate(y, 2, 1), end: dayOfDate(y, 2, 12) },
]));
const setup = () => { P.setDB([mkNation('SCO', 64), mkNation('NAM', 62), mkNation('OMA', 60), mkNation('IND', 84, 'full')]); ACTIVE = true; };
const fresh = (team = 'LL') => { setup(); const G = Game.create(team, {}); C.ensure(G); return G; };
const done = () => { ACTIVE = false; };
const reload = (G) => { G.hook('beforeSave'); return new Game(JSON.parse(JSON.stringify(G.s))); };

test('jobs: at most one club job and one national job', () => {
  const G = fresh();
  assert.deepEqual(C.jobs(G).map((j) => j.kind), ['club']); assert.ok(C.hasClub(G));
  assert.equal(C.takeJob(G, 'nation', 'NEP'), null); assert.equal(C.userNation(G), 'NEP');
  assert.match(C.takeJob(G, 'nation', 'SCO'), /already manage/); assert.equal(C.userNation(G), 'NEP');
  assert.match(C.takeJob(G, 'club', 'BK'), /already manage/); assert.equal(G.user, 'LL');
  assert.equal(C.takeJob(G, 'nation', 'SCO', { replace: true }), null); assert.equal(C.userNation(G), 'SCO');
  assert.equal(G.s.wd.jobHist.at(-1).team, 'NEP'); assert.equal(G.s.wd.jobHist.at(-1).how, 'left');
  assert.equal(C.resign(G, 'club'), null); assert.ok(!C.hasClub(G)); assert.equal(G.user, 'LL', 'G.user still names the old club for legacy code');
  assert.equal(C.takeJob(G, 'club', 'BK'), null); assert.equal(G.user, 'BK'); assert.ok(C.hasClub(G));
  for (const k of ['club', 'nation']) assert.equal(C.jobs(G).filter((j) => j.kind === k).length, 1);
  // the Club screen's takeJob (phase 2) moves the club job with it
  G.takeJob('KY'); C.syncClub(G); assert.equal(C.clubJob(G).team, 'KY'); assert.equal(C.jobs(G).filter((j) => j.kind === 'club').length, 1);
  done();
});

test('offers: associates from reputation 50, Test nations from 75, Nepal earlier after NPL success', () => {
  const G = fresh(); const M = G.s.manager;
  const el = (r) => { M.rep = r; return new Set(C.eligible(G)); };
  assert.ok(!el(49).has('SCO') && !el(49).has('NEP')); assert.ok(el(50).has('SCO') && el(50).has('NEP') && !el(50).has('IND'));
  assert.ok(!el(74).has('IND')); assert.ok(el(75).has('IND') && el(75).has('ENG'));
  M.career = [{ year: 2026, team: 'LL', pos: 1, champ: true }];
  assert.ok(el(45).has('NEP') && !el(45).has('SCO'), 'Nepal comes first for a title-winning NPL manager'); assert.ok(!el(44).has('NEP'));
  M.career = []; M.rep = 52; const offers = C.makeOffers(G, () => 0);
  assert.ok(offers.length >= 1 && offers.every((o) => o.kind === 'club' || C.MEMBER[o.team] === 'associate'));
  const o = offers.find((x) => x.kind === 'nation'); assert.equal(C.accept(G, o.id), null); assert.equal(C.userNation(G), o.team);
  M.rep = 30; const a = C.apply(G, 'IND', () => 0); assert.ok(!a.ok && /reputation/.test(a.text));
  M.rep = 80; assert.match(C.apply(G, 'IND', () => 0).text, /applied on/); G.s.wd.day += 61; const b = C.apply(G, 'IND', () => 0); assert.ok(b.ok); assert.match(C.accept(G, b.offer.id), /already manage/);
  assert.equal(C.accept(G, b.offer.id, { replace: true }), null); assert.equal(C.userNation(G), 'IND');
  done();
});

test('sacking: a national board below the line after a missed objective dismisses the manager', () => {
  const G = fresh(); C.takeJob(G, 'nation', 'NEP'); const j = C.nationJob(G);
  ST.advance(G, dayOfDate(2026, 11, 31), { auto: true, rnd: seeded(4) }); const S = G.s.wd.seasons['CT_L2-2026']; assert.ok(S.done);
  j.obj = [{ sid: S.id, k: 'win', t: 'Win the League 2 test', done: null }]; S.champ = 'SCO'; j.board = 30; const rep0 = G.s.manager.rep;
  C.review(G, j);
  assert.equal(C.nationJob(G), null); assert.equal(G.s.wd.jobHist.at(-1).how, 'sacked'); assert.ok(G.s.manager.rep < rep0);
  assert.ok(C.hasClub(G), 'the club job is untouched');
  // a board that is happy keeps its manager
  C.takeJob(G, 'nation', 'SCO'); const k = C.nationJob(G); k.obj = [{ sid: S.id, k: 'win', t: 'x', done: null }]; S.champ = 'SCO'; k.board = 30; C.review(G, k);
  assert.ok(C.nationJob(G) && k.board === 40);
  done();
});

test('national-only career: the world and the NPL (run by the AI) advance a full year', async () => {
  const G = fresh(); C.takeJob(G, 'nation', 'NEP', { quiet: true }); C.resign(G, 'club'); assert.ok(!C.hasClub(G));
  const rnd = seeded(9); const start = G.s.wd.day; let played = 0, live = 0;
  for (let k = 0; k < 400 && G.s.wd.day < start + 366; k++) {
    const ev = await C.continueWorld(G, { rnd });
    if (ev && ev.kind === 'world' && ev.day <= G.s.wd.day) { played++; if (played % 4 === 1) { await playWorldEngine(G, ev.S, ev.f, {}); live++; } else C.assistantPlays(G, ev.S, ev.f, rnd); }
  }
  assert.ok(G.s.wd.day >= start + 365, `clock reached ${G.s.wd.day - start} days`);
  assert.ok(played >= 8 && live >= 2, `national fixtures played: ${played}`);
  assert.ok(G.s.history.some((h) => h.year === 2026), 'the 2026 NPL season was completed by the AI');
  assert.ok(G.year === 2027 && ['preseason', 'league'].includes(G.s.phase), `NPL phase ${G.s.phase} ${G.year}`);
  assert.ok(G.s.auction && G.s.auction.done, 'the auction ran on its date');
  assert.equal(G.s.manager.career.length, 0, 'no NPL board reviews for a manager without a club'); assert.ok(!G.s.sacked);
  assert.ok(!G.pendingDecisions().length, 'no club decisions waiting');
  const j = C.nationJob(G); assert.ok(j.rec.p === played, `the board counted ${j.rec.p} of ${played} results`);
  const S = G.s.wd.seasons['CT_L2-2026']; assert.ok(S.done && S.fx.every((f) => f.res));
  const G2 = reload(G); assert.equal(C.userNation(G2), 'NEP'); assert.ok(!C.hasClub(G2));
  done();
});

test('national squads: picked squad, XI, captain and keeper persist and are used', () => {
  const G = fresh(); C.takeJob(G, 'nation', 'NEP');
  const pool = P.poolOf(G, 'NEP'); assert.ok(pool.length >= 15);
  const sq = pool.slice().sort((a, b) => a.name.localeCompare(b.name)).slice(0, 15); const keys = sq.map(C.keyOf);
  assert.match(C.setSquad(G, 'NEP', 'ODI', [...keys, 'x']), /15/); assert.equal(C.setSquad(G, 'NEP', 'ODI', keys), null);
  const xi = keys.slice(0, 11); const wk = sq.find((p) => p.role === 'WK') || sq[0];
  assert.equal(C.setXI(G, 'NEP', 'ODI', { xi, cap: xi[2], wk: C.keyOf(wk) }), null);
  const G2 = reload(G); const sel = C.selection(G2, 'NEP', 'ODI');
  assert.deepEqual(sel.squad.map(C.keyOf), keys); assert.deepEqual(sel.xi.map(C.keyOf).sort(), xi.slice().sort()); assert.equal(C.keyOf(sel.cap), xi[2]);
  assert.deepEqual(ST.squadFor(G2, 'NEP', 'ODI').map(C.keyOf), keys, 'the world uses the picked squad');
  assert.ok(!C.selection(G2, 'NEP', 'T20').picked, 'other formats stay automatic');
  C.setSquad(G2, 'NEP', 'ODI', null); assert.ok(!C.selection(G2, 'NEP', 'ODI').picked);
  done();
});

test('a live national match is recorded into the world with stats', async () => {
  const G = fresh(); C.takeJob(G, 'nation', 'NEP');
  const stop = ST.advance(G, dayOfDate(2026, 11, 31), { rnd: seeded(2) }); assert.ok(stop); const [S, f] = stop;
  const me = C.selection(G, 'NEP', f.fmt); const cap = me.xi[3]; C.setXI(G, 'NEP', f.fmt, { cap: C.keyOf(cap) });
  const PG = worldGame(G, S, f); assert.equal(PG.user, 'NEP'); assert.equal(PG.lineup('NEP').captain, cap.id); assert.equal(PG.s.toJSON(), G.s);
  const m0 = newWorldMatch(PG, f); assert.equal(m0.overs, f.fmt === 'ODI' ? 50 : 20);
  const { res, m } = await playWorldEngine(G, S, f, {});
  assert.ok(f.res && f.res.live && f.res.text === m.result.text); assert.ok(f.card.length === 2 && f.card[0].eng && f.card[0].bat[0].length === 7);
  const st = G.s.wd.st[S.id]; for (const id of m.lineups.NEP.xi) assert.ok(st[id] && st[id][0] === 1, 'every Nepal player has a match');
  const runs = f.card.reduce((a, i) => a + i.bat.reduce((b, x) => b + x[1], 0), 0); const st0 = Object.values(st).reduce((a, x) => a + x[3], 0);
  assert.equal(st0, runs, 'batting stats are the card'); assert.equal(Object.values(Object.values(S.tables)[0]).reduce((a, r) => a + r.p, 0), 2);
  assert.equal(C.nationJob(G).rec.p, 1, 'the board saw the result'); assert.ok(res.sc.length === 2);
  assert.ok(JSON.stringify(G.s).length > 1000 && !G.s.liveMatch);
  done();
});

test('an NPL match still works while holding both jobs, and called-up players miss it', async () => {
  const G = fresh(); C.takeJob(G, 'nation', 'NEP');
  G.aiPreseason(); C.ensure(G); const { completeSquad } = await import('../../src/lib/flow.js'); completeSquad(G); G.startSeason();
  const f = G.s.fixtures.find((x) => x.home === G.user || x.away === G.user); const day = C.nplDay(G, f);
  // a Nepal v Scotland match the day after: both squads' players at either club are away
  const def = { id: 'CT_ONE', fmt: 'ODI', stages: [{ type: 'series', n: 1 }] }; registerComps({ CT_ONE: { ...def, name: 'One-off' } });
  const S1 = newSeason(def, 2026, ['NEP', 'SCO'], day + 1, day + 2); S1.id = 'CT_ONE-x'; G.s.wd.seasons[S1.id] = S1;
  const away = C.applyCallUps(G, f); const nepSquad = new Set([...ST.squadFor(G, 'NEP', 'ODI'), ...ST.squadFor(G, 'SCO', 'ODI')].map((p) => p.id));
  // everyone away is in the squad of a side with a fixture within a day, and Nepal's and Scotland's players are among them
  const clash = ST.seasons(G).flatMap((S) => S.fx.filter((x) => Math.abs(x.d - day) <= 1).map((x) => [S, x]));
  const inSquad = (p) => clash.some(([S, x]) => [x.a, x.b].includes(p.callUp) && ST.squadFor(G, p.callUp, x.fmt, S).includes(p));
  assert.ok(away.some((p) => nepSquad.has(p.id)) && away.every((p) => p.rest && inSquad(p) && (p.team === f.home || p.team === f.away)));
  const lu = G.lineup(G.user); assert.ok(away.filter((p) => p.team === G.user).every((p) => !lu.xi.includes(p.id)), 'the called-up players are not in the XI');
  const day0 = G.s.wd.day; const m = await G.playFixture(f, null);
  assert.ok(f.res && m.result); assert.ok(G.s.wd.day >= day0 && G.s.wd.day < dayOfDate(2027, 0, 1), `the world clock follows the NPL date (day ${G.s.wd.day})`);
  assert.ok(C.hasClub(G) && C.userNation(G) === 'NEP');
  const ev = C.nextEvent(G); assert.ok(ev && (ev.kind === 'world' || ev.what === 'match'));
  done();
});

test('old saves load and the career runs from them', async () => {
  setup(); const G = new Game(oldSave()); C.ensure(G);
  assert.ok(G.s.wd && C.hasClub(G) && C.clubJob(G).team === G.user && !C.nationJob(G));
  const ev0 = C.nextEvent(G); assert.ok(ev0 === null || ev0.kind === 'npl' || ev0.kind === 'world');
  C.tick(G); assert.equal(C.takeJob(G, 'nation', 'NEP', { quiet: true }), null); C.tick(G);
  assert.ok(Array.isArray(C.nationJob(G).obj)); const G2 = reload(G); assert.equal(C.userNation(G2), 'NEP'); assert.ok(yearOf(G2.s.wd.day) >= 2026);
  done();
});
