// Permanent career records for real players (src/world/record.js).
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import * as P from '../../src/world/players.js';
import * as ST from '../../src/world/state.js';
import * as Rec from '../../src/world/record.js';

const nat = (code) => ({ code, name: code, member: 'associate', players: Array.from({ length: 15 }, (_, i) => [`${code.toLowerCase()}-r${i}`, `${code} Rec ${i}`, code, 1995, i < 8 ? 'BAT' : 'BOWL', 60, 50, 'RF', 'R', {}, [code]]) });
const setup = () => { P.setDB([nat('SCO'), nat('NAM')]); const G = Game.create('LL', {}); ST.migrate(G); return G; };
const a = (id) => [id, 55, 40, 5, 2, 'out'];

test('career record: world card adds per-format totals for real players only', () => {
  const G = setup(); const R = P.registry(G); const x = R.by['sco-r0'], y = R.by['nam-r9'];
  const card = { inns: [{ bat: [[x.id, 104, 80, 10, 2, 'out'], ['gen-x', 30, 20, 1, 0, 'out']], bowl: [[y.id, 24, 30, 3]] }, { bat: [[x.id, 20, 10, 2, 0, 'no']], bowl: [[y.id, 12, 20, 1]] }] };
  Rec.addWorld(G, 'ODI', card, [x], [y]); Rec.addWorld(G, 'FC4', { inns: [] }, [x], []);
  const r = Rec.recordOf(G, x); const o = Rec.rowOf(r.ODI);
  assert.equal(o.m, 1); assert.equal(o.runs, 124); assert.equal(o.hs, 104); assert.equal(o.c, 1); assert.equal(o.inn, 2);
  assert.equal(r.FC[0], 1); assert.equal(Rec.rowOf(Rec.recordOf(G, y).ODI).best, '3/30');
  assert.equal(G.s.wd.pcr['gen-x'], undefined);
  const g = Object.values(G.players).find((p) => p.real === false); assert.equal(Rec.recordOf(G, g), null);
});
test('career record: NPL aliasing keeps one record per person; survives JSON and old-save migration', () => {
  const G = setup(); const p = Object.values(G.players).find((q) => q.real !== false); assert.ok(p);
  const k = p.wid || p.id; Rec.addWorld(G, 'T20', { inns: [{ bat: [[p.id, 50, 30, 4, 1, 'out']], bowl: [] }] }, [p], []);
  assert.equal(G.s.wd.pcr[k].T20[3], 50);
  const G2 = new Game(JSON.parse(JSON.stringify(G.s))); assert.equal(Rec.recordOf(G2, G2.players[p.id]).T20[3], 50);
  const O = new Game(oldSave()); assert.ok(O.s.wd.pcr && typeof O.s.wd.pcr === 'object');
});
