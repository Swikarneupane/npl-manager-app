// World database: Oceania and African nations (phase 3, W1). Shape, ranges, ids, coverage.
import assert from 'node:assert/strict';
import { test } from './lib.mjs';
import { NATION_CODES } from '../../src/data/world/index.js';
import { readFileSync } from 'node:fs';

const CODES = ['AUS', 'NZ', 'SA', 'ZIM', 'NAM', 'PNG', 'VAN', 'SAM', 'UGA', 'KEN', 'TAN', 'NGA', 'BOT'];
const MIN = { AUS: 40, NZ: 40, SA: 40, ZIM: 25 };
const ROLES = new Set(['BAT', 'BOWL', 'AR', 'WK']);
const TYPES = new Set(['RF', 'RFM', 'RM', 'LF', 'LFM', 'LM', 'OB', 'LB', 'SLA', 'LWS']);
const mods = await Promise.all(CODES.map((c) => import(`../../src/data/world/nations/${c}.js`).then((m) => m.default)));
const bowls = (r) => r[7] !== '' && r[6] >= 45;

test('oceania/africa: modules are registered and carry asOf and sources', () => {
  for (const m of mods) {
    assert.ok(NATION_CODES.includes(m.code), m.code);
    assert.match(m.asOf, /^\d{4}-\d{2}-\d{2}$/, `${m.code} asOf`);
    assert.ok(m.sources.length >= 1, `${m.code} sources`);
    assert.ok(Array.isArray(m.comps) && Array.isArray(m.teams), m.code);
    for (const t of m.teams) {
      assert.equal(t.kind, 'domestic'); assert.ok(t.id.startsWith(`${m.code}-`) && t.id === `${m.code}-${t.short}` && t.name, t.id);
    }
  }
});

test('oceania/africa: every record has the right shape and valid ranges', () => {
  for (const m of mods) {
    const teamIds = new Set(m.teams.map((t) => t.id));
    for (const r of m.players) {
      const [id, name, nat, born, role, bat, bowl, type, hand, fm, teams] = r; const at = `${m.code} ${id}`;
      assert.equal(r.length, 11, at);
      assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)+$/, at); assert.ok(id.startsWith(`${m.code.toLowerCase()}-`), at);
      assert.ok(typeof name === 'string' && name.trim() === name && name.length > 2, at);
      assert.equal(nat, m.code, at);
      assert.ok(Number.isInteger(born) && born >= 1975 && born <= 2010, at);
      assert.ok(ROLES.has(role), at);
      for (const v of [bat, bowl]) assert.ok(Number.isInteger(v) && v >= 0 && v <= 100, at);
      assert.ok(type === '' || TYPES.has(type), at);
      if (type === '') assert.ok(bowl <= 25, `${at}: non-bowler rated ${bowl}`);
      if (role === 'BOWL') assert.ok(type !== '' && bowl > bat, at);
      if (role === 'AR') assert.ok(type !== '', at);
      assert.ok(hand === 'R' || hand === 'L', at);
      for (const k of ['t20', 'odi', 'fc']) assert.ok(Number.isInteger(fm[k]) && fm[k] >= -8 && fm[k] <= 8, `${at} fm.${k}`);
      for (const k of Object.keys(fm)) assert.ok(['t20', 'odi', 'fc', 'gen'].includes(k), `${at} fm key ${k}`);
      assert.ok(Array.isArray(teams) && teams[0] === m.code, at);
      for (const t of teams.slice(1)) assert.ok(teamIds.has(t), `${at}: unknown team ${t}`);
    }
  }
});

test('oceania/africa: ids and names are unique', () => {
  const ids = new Set(); const names = new Set();
  for (const m of mods) for (const r of m.players) {
    assert.ok(!ids.has(r[0]), `duplicate id ${r[0]}`); ids.add(r[0]);
    const k = `${r[2]}|${r[1].toLowerCase()}`; assert.ok(!names.has(k), `duplicate player ${k}`); names.add(k);
  }
});

test('oceania/africa: coverage, keepers and bowlers per nation', () => {
  for (const m of mods) {
    const real = m.players.filter((r) => !r[9].gen);
    assert.ok(m.players.length >= (MIN[m.code] || 15), `${m.code} has ${m.players.length}`);
    if (MIN[m.code]) assert.equal(real.length, m.players.length, `${m.code} should have no generated players`);
    assert.ok(m.players.filter((r) => r[4] === 'WK').length >= 2, `${m.code} keepers`);
    assert.ok(m.players.filter(bowls).length >= 6, `${m.code} bowlers`);
  }
});

test('oceania/africa: real NPL players from these nations use the same name and nationality', () => {
  // The registry aliases a database record to an NPL player by exact name and nationality, so every real
  // player of these nations named in the NPL data files must have a matching record.
  const src = ['../../src/game/data.js', '../../src/game/os-extra.js'].map((f) => readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n');
  const re = new RegExp(`\\[['"]([^'"]+)['"],\\s*['"](${CODES.join('|')})['"],\\s*\\d+,\\s*['"](BAT|BOWL|AR|WK)['"]`, 'g');
  const db = new Set(mods.flatMap((m) => m.players.map((r) => `${r[2]}|${r[1]}`)));
  const npl = [...src.matchAll(re)].map((x) => `${x[2]}|${x[1]}`);
  assert.ok(npl.length >= 20, `found ${npl.length} NPL players`);
  for (const k of npl) assert.ok(db.has(k), `NPL player ${k} has no database record`);
});
