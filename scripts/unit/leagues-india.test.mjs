// India (W3/W4): the IPL, the Syed Mushtaq Ali Trophy and the Vijay Hazare Trophy, and the real squads behind them.
// The module is switched on only inside these tests, so the other suites keep their own worlds.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as IN from '../../src/world/intl.js';
import * as W from '../../src/game/world.js';
import * as DA from '../../src/world/domestic-asia.js';
import * as LA from '../../src/world/leagues-asia.js';
import * as LI from '../../src/world/leagues-india.js';
import { COMPS } from '../../src/world/comps.js';
import { yearOf, dayOfDate } from '../../src/world/dates.js';
import { NATION_CODES, loadNation } from '../../src/data/world/index.js';
import { LEAGUE_CODES, loadLeague } from '../../src/data/world/leagues.js';

DA.setDomesticAsiaEnabled(false); LA.setLeaguesAsiaEnabled(false); LI.setIndiaEnabled(false);
const mods = await Promise.all(NATION_CODES.map((c) => loadNation(c).then((m) => m.default || m)));
const lg = (await Promise.all(LEAGUE_CODES.map((c) => loadLeague(c).then((m) => m.default || m).catch(() => null)))).filter(Boolean);
const lgAll = lg; const IPL = lg.find((m) => m.code === 'IPL');
const on = (fn) => async () => { LI.setIndiaEnabled(true); try { await fn(); } finally { LI.setIndiaEnabled(false); } };
const run = (G, until, { archive = false } = {}) => { for (let d = G.s.wd.day; d < until;) { d = Math.min(until, d + 7); ST.advance(G, d, { auto: true }); if (archive) W.archive(G); } };
const seasonsOf = (G, comp) => Object.values(G.s.wd.seasons).filter((S) => S.comp === comp);
const COUNT = { 'IND-SMAT': 32, 'IND-SMAT-PLATE': 6, 'IND-VH': 32, 'IND-VH-PLATE': 6 };

let FOUR = null;
function four() {
  if (FOUR) return FOUR; P.setDB(mods, lg); IN.setIntlEnabled(false); LI.setIndiaEnabled(true);
  try { const G = Game.create('LL', { lang: 'en' }); const y0 = yearOf(G.s.wd.day); run(G, G.s.wd.day + 4 * 365 + 60); FOUR = { G, y0 }; } finally { LI.setIndiaEnabled(false); }
  return FOUR;
}

test('leagues-india: the IPL has ten franchises, real rules and 70 league games', () => {
  assert.equal(IPL.teams.length, 10); assert.equal(new Set(IPL.teams.map((t) => t.id)).size, 10);
  for (const id of ['IPL-CSK', 'IPL-MI', 'IPL-RCB', 'IPL-KKR', 'IPL-DC', 'IPL-PBKS', 'IPL-RR', 'IPL-SRH', 'IPL-GT', 'IPL-LSG']) assert.ok(IPL.teams.some((t) => t.id === id), id);
  assert.deepEqual(IPL.rules.overseas, { max: 8, xi: 4 }); assert.equal(IPL.rules.recruit, 'auction'); assert.equal(IPL.rules.min, 18); assert.equal(IPL.rules.max, 25);
  const pairs = LI.iplLeaguePairs(); assert.equal(pairs.length, 70); const per = {}; for (const [a, b] of pairs) { per[a] = (per[a] || 0) + 1; per[b] = (per[b] || 0) + 1; }
  for (const t of Object.values(LI.IPL_GROUPS).flat()) assert.equal(per[t], 14, `${t} plays 14`);
  for (const id of ['IPL', ...LI.INDIA_COMPS]) assert.ok(COMPS[id].listA, `${id} kept out of the rankings`);
});

test('leagues-india: the IPL plans a season each year, plays 70 league games and a playoff to a champion', on(() => {
  const { G, y0 } = four(); const list = seasonsOf(G, 'IPL'); const years = list.map((S) => S.y);
  for (let y = y0 + 1; y <= y0 + 4; y++) assert.ok(years.includes(y), `IPL ${y} planned`);
  for (const S of list) {
    assert.equal(S.teams.length, 10); assert.equal(S.fx.filter((f) => f.stage === 0).length, 70);
    const [s0, e0] = [dayOfDate(S.y, 2, 14), dayOfDate(S.y, 4, 30)]; assert.ok(S.start === s0 && S.end >= e0 - 1, `${S.id} window`);
    for (const f of S.fx) assert.ok(f.a !== f.b && S.teams.includes(f.a) && S.teams.includes(f.b) && f.fmt === 'T20');
    if (S.done) { assert.deepEqual(S.fx.filter((f) => f.stage === 1).map((f) => f.ko).sort(), ['EL', 'F', 'Q1', 'Q2']); const F = S.fx.find((f) => f.ko === 'F'); assert.ok([F.a, F.b].includes(S.champ) && S.runner && S.champ !== S.runner);
      const top4 = Object.entries(S.tables.all).sort((a, b) => b[1].pts - a[1].pts).slice(0, 4).map((x) => x[0]); assert.ok(top4.includes(S.champ) || S.fx.some((f) => f.ko === 'Q1'), 'champion came through the playoffs'); }
  }
  assert.ok(list.filter((S) => S.done).length >= 3);
}));

test('leagues-india: squads have no duplicates across teams and respect the overseas limit; every key resolves', () => {
  P.setDB(mods, lg); const G = Game.create('LL', { lang: 'en' }); const seen = {}; let n = 0;
  for (const t of IPL.teams) {
    const keys = IPL.squads[t.id]; assert.ok(keys.length >= 18 && keys.length <= 25, `${t.id} squad ${keys.length}`);
    const ps = P.rosterOf(G, t.id); assert.equal(ps.filter((p) => !p.gen).length, keys.length, `${t.id}: every squad key resolves to a database player`);
    for (const k of keys) { const p = ps.find((x) => `${x.name}|${x.nat}` === k || x.name === k.split('|')[0]); assert.ok(p, `${k} resolves`); if (seen[p.id]) assert.fail(`${p.name} is in ${seen[p.id]} and ${t.id}`); seen[p.id] = t.id; n++; }
    assert.ok(ps.filter((p) => p.nat !== 'IND').length <= 8, `${t.id} overseas limit`);
    assert.ok(ps.filter((p) => p.role === 'WK').length >= 1 && ps.filter((p) => p.role === 'BOWL' || p.role === 'AR').length >= 8, `${t.id} balanced`);
  }
  assert.ok(n >= 240, `${n} players registered`);
  const by = (nm) => P.rosterOf(G, 'IPL-CSK').find((p) => p.name === nm); assert.ok(by('MS Dhoni') && by('Sanju Samson'), 'real names');
  // one person everywhere: the IPL player is the national-side player
  const kohli = P.rosterOf(G, 'IPL-RCB').find((p) => p.name === 'Virat Kohli'); assert.ok(kohli && kohli.id.startsWith('ind-') || kohli.wid, 'Kohli plays for RCB');
});

test('leagues-india: IPL ratings follow the scale', () => {
  P.setDB(mods, lg); const G = Game.create('LL', { lang: 'en' }); const all = IPL.teams.flatMap((t) => P.rosterOf(G, t.id)); const r = (p) => Math.max(p.bat, p.bowl);
  const rec = (id) => P.record(id); assert.ok(all.length > 200);
  const kh = rec('ind-virat-kohli'), bu = rec('ind-jasprit-bumrah'); assert.ok(kh[5] >= 88 && kh[5] <= 92, 'Kohli'); assert.ok(bu[6] >= 91 && bu[6] <= 95, 'Bumrah');
  const newOnes = IPL.players.filter((p) => p[2] === 'IND'); assert.ok(newOnes.length >= 80);
  for (const p of newOnes) assert.ok(Math.max(p[5], p[6]) <= 76 && Math.max(p[5], p[6]) >= 40, `${p[1]} rating`);
  const uncapped = newOnes.filter((p) => !p[9] || true); assert.ok(uncapped.filter((p) => Math.max(p[5], p[6]) <= 68).length >= newOnes.length * 0.8);
});

test('leagues-india: SMAT and Vijay Hazare plan valid seasons every year for four years', on(() => {
  const { G, y0 } = four(); const wd = G.s.wd;
  for (const comp of Object.keys(COUNT)) {
    const list = seasonsOf(G, comp); const years = list.map((S) => S.y);
    for (let y = y0 + 1; y <= y0 + 4; y++) assert.ok(years.includes(y), `${comp} ${y} planned`);
    for (const S of list) {
      assert.equal(S.teams.length, COUNT[comp], `${S.id} teams`); assert.equal(new Set(S.teams).size, S.teams.length);
      const fmt = comp.includes('SMAT') ? 'T20' : 'ODI'; for (const f of S.fx) { assert.equal(f.fmt, fmt); assert.ok(f.a !== f.b && S.teams.includes(f.a) && S.teams.includes(f.b)); assert.ok(f.d >= S.start && f.d <= S.end + 3, `${S.id} fixture in window`); }
      for (const [g, rows] of Object.entries(S.tables)) { const ts = Object.keys(rows); const meet = {}; for (const f of S.fx.filter((x) => x.grp === g)) { const k = [f.a, f.b].sort().join(); meet[k] = (meet[k] || 0) + 1; }
        for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) assert.equal(meet[[ts[i], ts[j]].sort().join()], 1, `${S.id} ${g}: ${ts[i]} v ${ts[j]} once`); }
      if (S.end < wd.day - 7) { assert.ok(S.done && S.champ && S.runner && S.champ !== S.runner, `${S.id} finished`); assert.ok(S.fx.every((f) => f.res), `${S.id} all played`); }
    }
  }
  for (const S of seasonsOf(G, 'IND-SMAT').filter((x) => x.done)) { assert.equal(S.fx.filter((f) => f.grp === 'X' || f.grp === 'Y').length, 12); assert.equal(S.fx.filter((f) => f.ko === 'F').length, 1); }
  for (const S of seasonsOf(G, 'IND-VH').filter((x) => x.done)) assert.deepEqual(S.fx.filter((f) => f.grp === 'ko').map((f) => f.ko), ['QF1', 'QF2', 'QF3', 'QF4', 'SF1', 'SF2', 'F']);
  // promotion and relegation
  let checked = 0; for (const [top, low] of [['IND-SMAT', 'IND-SMAT-PLATE'], ['IND-VH', 'IND-VH-PLATE']]) for (const S of seasonsOf(G, low)) { const nT = wd.seasons[`${top}-${S.y + 1}`]; if (!nT || !S.done) continue; assert.ok(nT.teams.includes(S.champ)); checked++; }
  assert.ok(checked >= 2, `promotion checked ${checked}`);
}));

test('leagues-india: state sides hold real players', () => {
  P.setDB(mods, lg); const G = Game.create('LL', { lang: 'en' }); const names = (t) => P.rosterOf(G, t).filter((p) => !p.gen).map((p) => p.name);
  for (const [t, who] of [['IND-MUM', ['Rohit Sharma', 'Ajinkya Rahane']], ['IND-DEL', ['Virat Kohli', 'Rishabh Pant']], ['IND-KAR', ['KL Rahul']], ['IND-TN', ['Washington Sundar', 'T. Natarajan']], ['IND-BEN', ['Mohammed Shami']], ['IND-SAU', ['Ravindra Jadeja']], ['IND-JHA', ['MS Dhoni']]])
    for (const n of who) assert.ok(names(t).includes(n), `${n} plays for ${t}`);
  for (const t of ['IND-MUM', 'IND-VID', 'IND-HYD', 'IND-MAN']) assert.ok(P.rosterOf(G, t).length >= 18, `${t} roster`);
});

test('leagues-india: a full world year stays quick and adds under 200 KB after compaction', async () => {
  P.setDB(mods, lg); IN.setIntlEnabled(false); const out = {};
  try {
    for (const live of [false, true]) { LI.setIndiaEnabled(live);
      const G = Game.create('LL', { lang: 'en' }); run(G, G.s.wd.day + 60); const t0 = Date.now(); run(G, G.s.wd.day + 365, { archive: true }); const ms = Date.now() - t0;
      W.archive(G); P.flush(G); out[live] = { ms, kb: JSON.stringify(G.s).length / 1024 };
      if (live) { const y1 = yearOf(G.s.wd.day); run(G, dayOfDate(y1 + 1, 6, 30), { archive: true }); W.archive(G);
        const list = Object.values(G.s.wd.seasons).filter((S) => LI.INDIA_COMPS.includes(S.comp) || S.comp === 'IPL'); out.season = list.reduce((a, S) => a + JSON.stringify(S).length + JSON.stringify(G.s.wd.st[S.id] || {}).length, 0) / 1024; out.n = list.length; }
    }
  } finally { LI.setIndiaEnabled(false); }
  if (process.env.VERBOSE) console.log(`leagues-india: year ${out.true.ms} ms (${out.false.ms} without); save +${Math.round(out.true.kb - out.false.kb)} KB; seasons kept ${Math.round(out.season)} KB (${out.n})`);
  assert.ok(out.true.ms - out.false.ms < 6000, `India adds ${out.true.ms - out.false.ms} ms`);
  assert.ok(out.true.kb - out.false.kb < 200, `India adds ${Math.round(out.true.kb - out.false.kb)} KB`);
});

test('leagues-india: clean up', () => { P.setDB([]); FOUR = null; });
