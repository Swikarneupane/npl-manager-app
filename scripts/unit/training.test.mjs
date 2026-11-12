// Individual training programmes: slots, bounded effects, form recovery, assistant, old saves.
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import { ovr } from '../../src/game/engine.js';
import { setSession, planDays, beforeMatch } from '../../src/game/club.js';
import { PROG_SLOTS, setProgramme, slotsUsed, slotPrompt, programmeEffect, autoAssign, optionsFor, progs } from '../../src/game/training.js';

async function midSeason() {
  const G = Game.create('LL', { lang: 'en' }); G.aiPreseason(); G.startSeason();
  for (;;) { const f = G.nextFixture(); const mine = f.home === G.user || f.away === G.user; await G.playFixture(f, null); if (mine) break; }
  while (G.nextFixture() !== G.userNext()) await G.playFixture(G.nextFixture(), null);
  return G;
}
const squad = (G) => G.teams[G.user].squad.map((id) => G.P(id));

test('programmes: slot limit and clearing', async () => {
  const G = await midSeason(); const sq = squad(G);
  for (let i = 0; i < PROG_SLOTS; i++) assert.equal(setProgramme(G, sq[i].id, 'Physio'), null);
  assert.ok(setProgramme(G, sq[PROG_SLOTS].id, 'Physio')); assert.equal(slotsUsed(G), PROG_SLOTS);
  assert.equal(setProgramme(G, sq[0].id, 'Form recovery'), null); // changing keeps the slot
  setProgramme(G, sq[0].id, null); assert.equal(slotsUsed(G), PROG_SLOTS - 1);
});

test('programmes: effects are bounded and role aware', async () => {
  const G = await midSeason(); const sq = squad(G);
  for (const p of sq) for (const n of optionsFor(p)) {
    const e = programmeEffect(G, p, n); assert.ok(e.dev >= 0 && e.dev <= 1.2 && e.form <= 0.8 && e.fit <= 3, n);
  }
  const bowler = sq.find((p) => p.role === 'BOWL'); const bat = sq.find((p) => p.role === 'BAT');
  if (bowler) assert.ok(!optionsFor(bowler).includes('Footwork'));
  if (bat) assert.ok(!optionsFor(bat).includes('Control and accuracy'));
  // rating gains stay capped by potential and the season cap through the existing path
  const p = sq.find((x) => !x.inj && x.role === 'BAT'); p.pot = ovr(p); const o0 = ovr(p); setProgramme(G, p.id, 'Footwork');
  for (let i = 0; i < 6; i++) { G.s.club.applied = null; await beforeMatch(G, G.userNext()); }
  assert.ok(ovr(p) <= o0 + 0 || ovr(p) <= p.pot);
});

test('programmes: form recovery helps an out-of-form player', async () => {
  const G = await midSeason(); const p = squad(G).find((x) => !x.inj); p.form = -6;
  assert.ok(slotPrompt(G).unused && slotPrompt(G).need.includes(p));
  const e = programmeEffect(G, p, 'Form recovery'); assert.ok(e.form > 0.4 && e.form <= 0.8);
  const none = programmeEffect(G, p, 'Footwork'); assert.equal(none.form, 0);
  setProgramme(G, p.id, 'Form recovery'); assert.ok(!slotPrompt(G).need.includes(p));
});

test('programmes: assistant assigns sensible ones', async () => {
  const G = await midSeason(); const sq = squad(G); sq.forEach((p) => { p.inj = 0; p.form = 0; p.fit = 95; });
  sq[0].form = -5; sq[1].inj = 2;
  assert.ok(autoAssign(G) <= PROG_SLOTS); const C = progs(G);
  assert.equal(C[sq[0].id], 'Form recovery'); assert.equal(C[sq[1].id], 'Physio');
});

test('programmes: old save migrates', () => {
  const G = new Game(oldSave()); assert.ok(G.s.club); assert.deepEqual(G.s.club.prog, {});
  assert.equal(slotsUsed(G), 0); assert.ok(slotPrompt(G).slots === PROG_SLOTS);
});
