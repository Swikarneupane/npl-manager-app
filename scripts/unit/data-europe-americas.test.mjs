// World database (phase 3, W1): player data for the European and American nations.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from './lib.mjs';

const CODES = ['ENG', 'IRE', 'SCO', 'NED', 'ITA', 'JER', 'DEN', 'GER', 'ESP', 'FRA', 'WI', 'USA', 'CAN', 'BER'];
const MIN = { ENG: 40, WI: 40, IRE: 25 };
const ROLES = ['BAT', 'BOWL', 'AR', 'WK'];
const TYPES = ['RF', 'RFM', 'RM', 'LF', 'LFM', 'LM', 'OB', 'LB', 'SLA', 'LWS'];
const mods = await Promise.all(CODES.map((c) => import(`../../src/data/world/nations/${c}.js`).then((m) => m.default)));

test('Europe and Americas data: nation modules have their header fields and domestic teams', () => {
  for (const [i, m] of mods.entries()) {
    assert.equal(m.code, CODES[i]); assert.ok(m.name && ['full', 'associate'].includes(m.member), m.code);
    assert.match(m.asOf, /^\d{4}-\d{2}-\d{2}$/, `${m.code} asOf`); assert.ok(m.sources.length > 0, `${m.code} sources`);
    assert.ok(Array.isArray(m.comps));
    for (const t of m.teams) { assert.ok(t.id.startsWith(`${m.code}-`) && t.name && t.short && t.kind === 'domestic', `${m.code} team ${t.id}`); }
  }
  const by = Object.fromEntries(mods.map((m) => [m.code, m]));
  assert.equal(by.ENG.teams.length, 18, 'the 18 first-class counties'); assert.equal(by.WI.teams.length, 6, 'six regional sides');
  assert.ok(by.IRE.teams.length >= 3, 'Irish provincial sides');
});

test('Europe and Americas data: every record has the right shape and valid ranges', () => {
  for (const m of mods) {
    const teamIds = new Set(m.teams.map((t) => t.id));
    for (const p of m.players) {
      const [id, name, nat, born, role, bat, bowl, type, hand, fm, teams] = p;
      const at = `${m.code} ${id}`;
      assert.equal(p.length, 11, at);
      assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)+$/, at); assert.ok(id.startsWith(`${m.code.toLowerCase()}-`), at);
      assert.ok(typeof name === 'string' && name.length > 2, at); assert.equal(nat, m.code, at);
      assert.ok(Number.isInteger(born) && born >= 1980 && born <= 2010, `${at} born ${born}`);
      assert.ok(ROLES.includes(role), at); assert.ok(hand === 'R' || hand === 'L', at);
      for (const v of [bat, bowl]) assert.ok(Number.isInteger(v) && v >= 0 && v <= 100, at);
      if (type === '') assert.ok(bowl <= 25, `${at}: a non-bowler rates 25 or less`); else assert.ok(TYPES.includes(type), `${at} type ${type}`);
      if (role === 'BOWL' || role === 'AR') assert.ok(type && bowl >= 40, `${at}: bowlers need a type and a rating`);
      for (const k of ['t20', 'odi', 'fc']) assert.ok(Number.isInteger(fm[k]) && fm[k] >= -8 && fm[k] <= 8, `${at} fm.${k}`);
      for (const k of Object.keys(fm)) assert.ok(['t20', 'odi', 'fc', 'gen'].includes(k), `${at} fm key ${k}`);
      assert.equal(teams[0], m.code, at);
      for (const t of teams.slice(1)) assert.ok(teamIds.has(t), `${at}: unknown team ${t}`);
    }
  }
});

test('Europe and Americas data: ids are unique across all fourteen files', () => {
  const seen = new Set();
  for (const m of mods) for (const p of m.players) { assert.ok(!seen.has(p[0]), `duplicate id ${p[0]}`); seen.add(p[0]); }
});

test('Europe and Americas data: squad sizes, keepers and bowlers per nation', () => {
  for (const m of mods) {
    const n = m.players.length; const min = MIN[m.code] || 15;
    assert.ok(n >= min, `${m.code} has ${n} players, needs ${min}`);
    const keepers = m.players.filter((p) => p[4] === 'WK').length;
    const bowlers = m.players.filter((p) => p[4] === 'BOWL' || p[4] === 'AR').length;
    assert.ok(keepers >= 2, `${m.code} keepers ${keepers}`); assert.ok(bowlers >= 6, `${m.code} bowlers ${bowlers}`);
  }
});

test('Europe and Americas data: generated placeholders are few, and none in ENG, WI or IRE', () => {
  for (const m of mods) {
    const gen = m.players.filter((p) => p[9].gen === 1);
    assert.ok(gen.length <= 3, `${m.code} has ${gen.length} generated players`);
    if (['ENG', 'WI', 'IRE'].includes(m.code)) assert.equal(gen.length, 0, `${m.code} is all real players`);
  }
});

test('Europe and Americas data: NPL overseas players from these nations match by name and nationality', () => {
  // The registry aliases a database record to an NPL player when name and nationality agree (src/world/players.js).
  const src = ['data.js', 'os-extra.js'].map((f) => readFileSync(new URL(`../../src/game/${f}`, import.meta.url), 'utf8')).join('\n');
  const key = (name, nat) => `${nat}|${name.toLowerCase().replace(/[^a-z]/g, '')}`;
  const have = new Set(mods.flatMap((m) => m.players.map((p) => key(p[1], p[2]))));
  const re = /\[\s*(['"])([^'"]+)\1\s*,\s*(['"])(ENG|IRE|SCO|NED|ITA|JER|DEN|GER|ESP|FRA|WI|USA|CAN|BER)\3\s*,/g;
  const missing = []; let m; while ((m = re.exec(src))) if (!have.has(key(m[2], m[4]))) missing.push(`${m[2]} (${m[4]})`);
  assert.deepEqual(missing, [], 'NPL players with no database record');
});
