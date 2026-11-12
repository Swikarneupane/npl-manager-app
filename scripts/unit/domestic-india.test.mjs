// Real squads for India's state teams (W4): every Ranji Elite and Plate team has a roster of real players
// (from the nation files), each registered to one team only; the two competitions still run for 4 years.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as IN from '../../src/world/intl.js';
import * as DA from '../../src/world/domestic-asia.js';
import { yearOf } from '../../src/world/dates.js';
import { NATION_CODES, loadNation } from '../../src/data/world/index.js';

DA.setDomesticAsiaEnabled(false);
const mods = await Promise.all(NATION_CODES.map((c) => loadNation(c).then((m) => m.default || m)));
const IND = mods.find((m) => m.code === 'IND');
const TEAMS = IND.teams.filter((t) => t.level === 1 || t.level === 3);
const real = mods.flatMap((m) => m.players.filter((r) => !(r[9] && r[9].gen)));

test('domestic-india: every Ranji Elite and Plate team has real registered players and a full roster', () => {
  assert.equal(TEAMS.length, 38);
  P.setDB(mods); IN.setIntlEnabled(false);
  const G = Game.create('LL', { lang: 'en' }); const rows = [];
  for (const t of TEAMS) { const ro = P.rosterOf(G, t.id); assert.ok(ro.length >= 18, `${t.id} roster ${ro.length}`);
    const n = ro.filter((p) => !p.gen).length; rows.push(`${t.short}:${n}`); assert.ok(n >= 9, `${t.id} has ${n} real players`); }
  console.log('real players per team: ' + rows.join(' '));
});

test('domestic-india: no player on two state teams, ids unique', () => {
  const ids = new Set(); const dom = new Set(TEAMS.map((t) => t.id));
  for (const r of mods.flatMap((m) => m.players)) { assert.ok(!ids.has(r[0]), `duplicate id ${r[0]}`); ids.add(r[0]); }
  for (const r of real) { const on = (r[10] || []).filter((t) => dom.has(t)); assert.ok(on.length <= 1, `${r[1]} on ${on.join(',')}`); }
});

test('domestic-india: the Ranji Elite and Plate seasons still plan and finish for 4 years', () => {
  P.setDB(mods); IN.setIntlEnabled(false); DA.setDomesticAsiaEnabled(true);
  try { const G = Game.create('LL', { lang: 'en' }); const y0 = yearOf(G.s.wd.day);
    for (let d = G.s.wd.day, end = d + 4 * 365 + 60; d < end;) { d = Math.min(end, d + 7); ST.advance(G, d, { auto: true }); }
    for (const comp of ['IND-RANJI', 'IND-RANJI-PLATE']) { const S = Object.values(G.s.wd.seasons).filter((x) => x.comp === comp); assert.ok(S.length >= 4, `${comp} seasons from ${y0}: ${S.length}`); assert.ok(S.filter((x) => x.done || x.over || x.status === 'done').length >= 3, `${comp} finished`); }
  } finally { DA.setDomesticAsiaEnabled(false); }
});
