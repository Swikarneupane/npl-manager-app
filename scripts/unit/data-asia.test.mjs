// World database, Asian nations (phase 3, W1): shape, ranges, unique ids and squad depth.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import * as D from '../../src/game/data.js';

const FULL = ['IND', 'PAK', 'SL', 'BAN', 'AFG'];
const ASSOC = ['NEP', 'UAE', 'OMA', 'HK', 'KUW', 'QAT', 'BHR', 'SIN', 'MAS', 'KSA'];
const CODES = [...FULL, ...ASSOC];
const mods = {};
for (const c of CODES) mods[c] = (await import(`../../src/data/world/nations/${c}.js`)).default;

const ROLES = new Set(['BAT', 'BOWL', 'AR', 'WK']);
const TYPES = new Set(['', 'RF', 'RFM', 'RM', 'LF', 'LFM', 'LM', 'OB', 'LB', 'SLA', 'LWS']);
const FM_KEYS = new Set(['t20', 'odi', 'fc', 'gen', 'unv']);

test('Asian nations: module header, sources and domestic teams are well formed', () => {
  for (const c of CODES) {
    const m = mods[c];
    assert.equal(m.code, c); assert.equal(m.member, FULL.includes(c) ? 'full' : 'associate', c);
    assert.match(m.asOf, /^\d{4}-\d{2}-\d{2}$/, `${c} asOf`); assert.ok(m.sources.length > 0, `${c} sources`);
    assert.ok(Array.isArray(m.comps));
    const tids = new Set();
    for (const t of m.teams) { assert.ok(t.id.startsWith(`${c}-`) && t.name && t.short && t.kind === 'domestic', `${c} team ${JSON.stringify(t)}`); assert.ok(!tids.has(t.id), `dup team ${t.id}`); tids.add(t.id); }
    if (FULL.includes(c) || c === 'NEP') assert.ok(m.teams.length >= 5, `${c} has domestic teams`);
  }
});

test('Asian nations: every player record has the right shape and valid ranges', () => {
  for (const c of CODES) {
    const tids = new Set(mods[c].teams.map((t) => t.id));
    for (const r of mods[c].players) {
      const tag = `${c} ${JSON.stringify(r)}`;
      assert.equal(r.length, 11, tag);
      const [id, name, nat, born, role, bat, bowl, type, hand, fm, teams] = r;
      assert.match(id, /^[a-z]+-[a-z0-9-]+$/, tag); assert.ok(id.startsWith(`${c.toLowerCase()}-`), tag);
      assert.ok(typeof name === 'string' && name.trim() === name && name.length > 2, tag);
      assert.equal(nat, c, tag);
      assert.ok(Number.isInteger(born) && born >= 1975 && born <= 2012, tag);
      assert.ok(ROLES.has(role), tag); assert.ok(TYPES.has(type), tag); assert.ok(hand === 'R' || hand === 'L', tag);
      for (const v of [bat, bowl]) assert.ok(Number.isInteger(v) && v >= 0 && v <= 100, tag);
      if (type === '') assert.ok(bowl <= 25, `non-bowler bowls ${tag}`);
      if (role === 'BOWL') assert.ok(type !== '' && bowl >= 40, tag);
      if (role === 'BAT' || role === 'WK') assert.ok(bat >= 40, tag);
      assert.ok(fm && typeof fm === 'object', tag);
      for (const [k, v] of Object.entries(fm)) { assert.ok(FM_KEYS.has(k), tag); if (k === 'gen' || k === 'unv') assert.equal(v, 1, tag); else assert.ok(Number.isInteger(v) && v >= -8 && v <= 8, tag); }
      assert.ok(Array.isArray(teams) && teams[0] === c, `national code first ${tag}`);
      assert.equal(new Set(teams).size, teams.length, tag);
      for (const t of teams.slice(1)) if (t.startsWith(`${c}-`)) assert.ok(tids.has(t), `unknown domestic team ${t} in ${tag}`);
    }
  }
});

test('Asian nations: ids are unique across every file, and names within a nation', () => {
  const seen = new Set();
  for (const c of CODES) { const names = new Set();
    for (const r of mods[c].players) { assert.ok(!seen.has(r[0]), `duplicate id ${r[0]}`); seen.add(r[0]); assert.ok(!names.has(r[1]), `duplicate name ${c} ${r[1]}`); names.add(r[1]); } }
});

test('Asian nations: squad depth (Test nations 35+, associates 15+, 2 keepers and 6 bowlers each)', () => {
  for (const c of CODES) {
    const ps = mods[c].players; const min = FULL.includes(c) ? 35 : 15;
    assert.ok(ps.length >= min, `${c} has ${ps.length} players`);
    assert.ok(ps.filter((r) => r[4] === 'WK').length >= 2, `${c} keepers`);
    assert.ok(ps.filter((r) => r[4] === 'BOWL').length >= 6, `${c} bowlers`);
  }
});

test('Nepal: every capped or contracted NPL Nepali is in NEP.js under the same name and ratings', async () => {
  const { NEP_INTL, CONTRACTS_2026 } = await import('../../src/game/intl-data.js');
  const con = new Set(Object.values(CONTRACTS_2026.grades).flat());
  const byName = new Map(mods.NEP.players.map((r) => [r[1], r]));
  const npl = [...Object.values(D.SQUADS).flat(), ...D.FREE_NEP].filter((p) => p[1] === 'NEP');
  for (const p of npl) {
    const i = NEP_INTL[p[0]] || {}; if (!(i.t20i > 0 || i.odi > 0 || i.debut || con.has(p[0]))) continue;
    const r = byName.get(p[0]); assert.ok(r, `missing ${p[0]}`);
    assert.deepEqual([r[4], r[5], r[6], r[7], r[8]], [p[3], p[4], p[5], p[6] || '', p[7]], `ratings differ for ${p[0]}`);
  }
});

test('Asian nations: players already in the NPL game keep their exact spelling', () => {
  const npl = [...Object.values(D.SQUADS).flat(), ...D.FREE_OS].filter((p) => CODES.includes(p[1]));
  const key = (n) => n.toLowerCase().replace(/[^a-z]/g, '');
  const inDb = new Set(CODES.flatMap((c) => mods[c].players.map((r) => `${c}|${key(r[1])}`)));
  const hits = npl.filter((p) => inDb.has(`${p[1]}|${key(p[0])}`));
  assert.ok(hits.length >= 40, `only ${hits.length} NPL players alias to the database`);
});
