// World cricket (game layer): NOCs, the off-season digest, World Cup history. The international
// programme itself (pathway, World Cups, rankings, Nepal's games) is tested in intl.test.mjs.
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import { ovr } from '../../src/game/engine.js';
import * as W from '../../src/game/world.js';
import { LEAGUES, T20WC_2026 } from '../../src/game/world-data.js';

const fresh = () => Game.create('LL', { lang: 'en' });
async function playSeason(G) {
  while (!G.leagueDone()) { await G.playFixture(G.nextFixture(), null); G.expireDecisions(Infinity); }
  G.setupPlayoffs(); let ch = null; while (!ch) { const f = G.nextFixture(); if (f) await G.playFixture(f, null); ch = G.advancePlayoffs(); }
  G.seasonAwards(ch); return ch;
}
// A request for one of the user's Nepali players, made by hand so the test controls it.
function request(G, kind = 'dev') {
  const p = G.teams.LL.squad.map((id) => G.P(id)).find((x) => x.nat === 'NEP' && ovr(x) < (x.pot || 0) - 2);
  const r = { id: `t${kind}`, y: G.year, pid: p.id, league: 'ilt20', team: 'Desert Vipers', kind, fee: 4, exp: 2, risk: { inj: 8, fat: 6 }, status: 'open' };
  G.s.world.noc.push(r); return { p, r };
}

test('NOC granted: the fee, a rating gain up to potential, and injury and fatigue risk', () => {
  const G = fresh(); const { p, r } = request(G); const bal = G.teams.LL.balance, o = ovr(p), fit = p.fit;
  W.decideNoc(G, r.id, true);
  assert.equal(G.teams.LL.balance, bal + 4);
  assert.ok(ovr(p) > o && ovr(p) <= p.pot, 'experience lifts the rating, capped at potential');
  assert.equal(p.fit, fit - 6); assert.deepEqual(p.nocRisk, { y: G.year, inj: 8, fat: 6, league: 'ilt20' });
  assert.ok(p.abroad.some((a) => a.league === 'ilt20' && a.team === 'Desert Vipers'));
  assert.equal(r.status, 'granted'); assert.ok(G.s.log.some((e) => e.kind === 'noc'));
});
test('NOC refused: his happiness falls and the request is closed', () => {
  const G = fresh(); const { p, r } = request(G); p.happy = 70; const bal = G.teams.LL.balance;
  W.decideNoc(G, r.id, false);
  assert.ok(p.happy < 70); assert.equal(G.teams.LL.balance, bal); assert.equal(r.status, 'refused'); assert.equal(p.nocRisk, undefined);
  assert.equal(W.decideNoc(G, r.id, true), null, 'an answered request cannot be answered again');
});
test('NOC risk lands at the start of the season: fitness is already down, injury is rolled once', () => {
  const G = fresh(); const { p, r } = request(G, 'inj'); r.risk = { inj: 100, fat: 12 }; W.decideNoc(G, r.id, true);
  G.aiPreseason(); G.startSeason(); assert.ok(p.inj >= 1); assert.equal(p.nocRisk, undefined);
});

test('the digest lists the eight leagues, then the NPL champion from history', () => {
  const G = fresh(); const d = W.digest(G);
  assert.deepEqual(d.rows.map((r) => r.short), ['BBL', 'SA20', 'ILT20', 'BPL', 'IPL', 'PSL', 'MLC', 'CPL', 'NPL']);
  assert.equal(d.rows[3].champ, 'Rajshahi Warriors'); assert.ok(d.rows.slice(0, 8).every((r) => r.real));
  G.s.history.push({ year: 2026, champion: 'KG', runner: 'LL', final: 'LL 150/8 (20) lost to KG 151/4 (18.2) by 6 wickets', pot: '' });
  const n = W.digest(G).rows[8]; assert.equal(n.champ, G.teams.KG.name); assert.equal(n.runner, G.teams.LL.name); assert.equal(n.margin, 'by 6 wickets');
  // a later year is simulated with real franchise names
  G.s.year = 2028; W.offseason(G); const d2 = W.digest(G); assert.equal(d2.y, 2027);
  for (const L of LEAGUES) { const r = d2.rows.find((x) => x.k === L.k); assert.ok(L.teams.includes(r.champ) && L.teams.includes(r.runner) && r.champ !== r.runner); assert.ok(!r.real); }
});

test('the 2026 T20 World Cup history entry is accurate', () => {
  assert.equal(T20WC_2026.hosts, 'India and Sri Lanka'); assert.equal(T20WC_2026.champ, 'India'); assert.equal(T20WC_2026.runner, 'New Zealand');
  const n = T20WC_2026.nepal; assert.equal(n.stage, 'Group stage'); assert.equal(n.wins, 1);
  assert.deepEqual(n.res.filter((x) => x.r === 'W').map((x) => x.v), ['Scotland']); assert.equal(n.res.length, 4);
});

test('an old save loads, plays a fixture and runs a whole off-season with the world layer', async () => {
  const G = new Game(oldSave()); assert.ok(G.s.world && G.s.world.lg.y === 2026);
  await G.playFixture(G.nextFixture(), null); await playSeason(G);
  const t0 = Date.now(); G.startOffseason(); await W.playWinter(G, async () => {}); const t1 = Date.now() - t0;
  assert.ok(t1 < 5000, `world work per off-season stays cheap (${t1} ms incl. the core off-season)`);
  assert.equal(G.s.nepal.winter, G.year - 1, 'the winter is marked played, so the old generated winter never runs');
  assert.equal(W.digest(G).rows[8].champ, G.teams[G.s.history[G.s.history.length - 1].champion].name);
  G.beginRetention(); G.applyRetention(); G.setupAuction(); // the NOC window closes
  assert.equal(W.openNocs(G).length, 0);
  const size = JSON.stringify(G.s.world).length; assert.ok(size < 60000, `world state ${size} bytes`);
  const G2 = new Game(JSON.parse(JSON.stringify(G.s))); assert.deepEqual(G2.s.world.lg, G.s.world.lg);
});
