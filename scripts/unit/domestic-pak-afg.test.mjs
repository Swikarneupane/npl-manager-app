// Pakistan and Afghanistan (W4): real domestic squads and the white-ball competitions.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as IN from '../../src/world/intl.js';
import * as W from '../../src/game/world.js';
import * as DP from '../../src/world/domestic-pak-afg.js';
import { COMPS } from '../../src/world/comps.js';
import { yearOf, dayOfDate } from '../../src/world/dates.js';
import { NATION_CODES, loadNation } from '../../src/data/world/index.js';

DP.setDomesticPakAfgEnabled(false);
const mods = await Promise.all(NATION_CODES.map((c) => loadNation(c).then((m) => m.default || m)));
const NAT = Object.fromEntries(mods.map((m) => [m.code, m]));
const run = (G, until, { archive = false } = {}) => { for (let d = G.s.wd.day; d < until;) { d = Math.min(until, d + 7); ST.advance(G, d, { auto: true }); IN.tick(G); if (archive) W.archive(G); } };
// [teams, groups, league matches, knockout matches, format]
const COUNT = { 'PAK-CHAMP': [4, 1, 6, 1, 'ODI'], 'PAK-NT20': [10, 2, 20, 3, 'T20'], 'AFG-GAK': [5, 1, 10, 1, 'ODI'], 'AFG-SCL': [5, 1, 20, 1, 'T20'], 'AFG-WAKHAN': [4, 1, 6, 1, 'T20'] };
let FOUR = null;
function four() {
  if (FOUR) return FOUR; P.setDB(mods); IN.setIntlEnabled(false); DP.setDomesticPakAfgEnabled(true);
  try { const G = Game.create('LL', { lang: 'en' }); const y0 = yearOf(G.s.wd.day); run(G, G.s.wd.day + 4 * 365 + 60); FOUR = { G, y0 }; }
  finally { DP.setDomesticPakAfgEnabled(false); IN.setIntlEnabled(false); }
  return FOUR;
}
const seasonsOf = (G, c) => Object.values(G.s.wd.seasons).filter((S) => S.comp === c);

test('domestic-pak-afg: squads resolve and no player is in two teams of one competition', () => {
  P.setDB(mods); const G = Game.create('LL', { lang: 'en' });
  const teams = ['KHB', 'LHW', 'FATA', 'ISB', 'PES', 'MUL', 'FSD', 'SKT', 'ABT', 'AJK', 'BWP', 'DMJ', 'HYD', 'KHW', 'LHB', 'LRK', 'PEW', 'QTA', 'RWP', 'SKW'].map((t) => `PAK-${t}`);
  const afg = ['MWC', 'MPS', 'HKS', 'PML'].map((t) => `AFG-${t}`); const all = [...teams, ...afg];
  const reg = {}; for (const t of all) { assert.ok(P.teamInfo(t), `${t} exists`); const own = NAT[t.slice(0, 3)].players.filter((r) => r[10].includes(t));
    assert.ok(own.length >= 14 && own.length <= 26, `${t} has ${own.length} registered players`);
    for (const r of own) (reg[r[0]] ??= []).push(t); assert.ok(P.rosterOf(G, t).length >= 18, `${t} roster`); }
  // the quaid-e-azam sides are one competition level each (Gold and Silver): a player is in one side only
  for (const [id, ts] of Object.entries(reg)) assert.equal(ts.length, 1, `${id} registered to ${ts}`);
  for (const t of ['PAK-GRN', 'PAK-GLD', 'PAK-WHT', 'PAK-BLU']) assert.ok(P.teamInfo(t), t);
  // well-known players keep their one record and national code
  const pak = NAT.PAK.players; const get = (n) => pak.find((r) => r[1] === n);
  assert.ok(get('Babar Azam')[10].includes('PAK-LHW') && get('Babar Azam')[10].includes('PSL-PZ'));
  assert.ok(get('Mohammad Rizwan')[10].includes('PAK-PES'));
  assert.ok(NAT.AFG.players.find((r) => r[1] === 'Yamin Ahmadzai')[10].includes('AFG-MWC'));
});

test('domestic-pak-afg: each competition plans a valid season every year for four years and crowns a champion', () => {
  const { G, y0 } = four(); const wd = G.s.wd;
  for (const comp of DP.PAKAFG_COMPS) { assert.ok(COMPS[comp].listA && COMPS[comp].kind === 'domestic');
    const list = seasonsOf(G, comp); const years = list.map((S) => S.y);
    for (let y = y0 + 1; y <= y0 + 4; y++) assert.ok(years.includes(y), `${comp} ${y} planned`);
    const [n, groups, lg, kn, fmt] = COUNT[comp];
    for (const S of list) { assert.equal(S.teams.length, n, `${S.id} teams`); assert.equal(new Set(S.teams).size, n);
      assert.ok(S.fx.every((f) => f.fmt === fmt && S.teams.includes(f.a) && S.teams.includes(f.b) && f.a !== f.b), `${S.id} fixtures`);
      if (S.end < wd.day - 7) { assert.ok(S.done && S.champ && S.runner && S.champ !== S.runner, `${S.id} champion`); assert.ok(S.fx.every((f) => f.res), `${S.id} all played`);
        assert.equal(S.fx.filter((f) => f.grp !== 'ko').length, lg, `${S.id} league matches`); assert.equal(S.fx.filter((f) => f.grp === 'ko').length, kn, `${S.id} knockouts`);
        assert.equal(Object.keys(S.tables).length, groups, `${S.id} groups`); } } }
});

test('domestic-pak-afg: a world year of these competitions adds under 100 KB after compaction', () => {
  P.setDB(mods); IN.setIntlEnabled(true); let kb = 0;
  try { DP.setDomesticPakAfgEnabled(true); const G = Game.create('LL', { lang: 'en' }); const y0 = yearOf(G.s.wd.day);
    run(G, dayOfDate(y0 + 2, 0, 1), { archive: true }); W.archive(G); P.flush(G);
    const y1 = y0 + 1; const list = Object.values(G.s.wd.seasons).filter((S) => DP.PAKAFG_COMPS.includes(S.comp) && S.y === y1); assert.equal(list.length, 5);
    kb = list.reduce((a, S) => a + JSON.stringify(S).length + JSON.stringify(G.s.wd.st[S.id] || {}).length, 0) / 1024; }
  finally { IN.setIntlEnabled(false); DP.setDomesticPakAfgEnabled(false); }
  if (process.env.VERBOSE) console.log(`domestic-pak-afg: a finished year keeps ${Math.round(kb)} KB`);
  assert.ok(kb < 100, `a year of seasons keeps ${kb} KB`);
});
