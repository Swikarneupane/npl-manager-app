// World cricket: NOCs, the off-season digest, League 2 and the pathway, rankings, World Cup history.
import assert from 'node:assert/strict';
import { test, oldSave } from './lib.mjs';
import { Game } from '../../src/game/game.js';
import { ovr } from '../../src/game/engine.js';
import * as W from '../../src/game/world.js';
import { LEAGUES, LEAGUE2_TEAMS, CHALLENGE_GROUPS, T20WC_2026 } from '../../src/game/world-data.js';

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

test('League 2 has the eight real teams; the top four go to the Qualifier, the bottom four to the Play-off', () => {
  const G = fresh(); const w = G.s.world;
  assert.deepEqual(Object.keys(w.l2.rows).sort(), LEAGUE2_TEAMS.slice().sort());
  const t = W.tableOf(w.l2.rows).map((x) => x.code); assert.ok(t.indexOf('NEP') >= 4, 'Nepal are in the bottom four, as the real Play-off fixture implies');
  for (const r of Object.values(w.l2.rows)) assert.equal(r[0], 36);
  G.s.nepal.winter = 2026; G.s.nepal.results = []; W.afterWinter(G);
  const po = w.po.rows.map((r) => r[0]); const cl = [...CHALLENGE_GROUPS.A, ...CHALLENGE_GROUPS.B];
  assert.deepEqual(po.filter((c) => LEAGUE2_TEAMS.includes(c)).sort(), t.slice(4).sort());
  assert.equal(po.filter((c) => cl.includes(c)).length, 4);
  const q = w.wcq.rows.map((r) => r[0]); for (const c of t.slice(0, 4)) assert.ok(q.includes(c)); for (const c of w.po.top) assert.ok(q.includes(c));
  assert.equal(w.po.top.length, 4); assert.ok(w.po.top.every((c) => po.slice(0, 4).includes(c)));
  assert.deepEqual(w.l2.teams.slice().sort(), [...t.slice(0, 4), ...w.po.top].sort(), 'the next League 2 is the Qualifier’s eight pathway teams');
  assert.equal(W.afterWinter(G), false, 'once per winter');
});

test('rankings recalculate after internationals and are labelled in-game', () => {
  const G = fresh(); const w = G.s.world; assert.equal(w.trk.label, 'in-game, not ICC'); assert.equal(w.prk.label, 'in-game, not ICC'); assert.equal(W.LABEL, 'in-game, not ICC');
  const before = JSON.stringify(w.elo); G.s.nepal.winter = 2026; G.s.nepal.results = []; W.afterWinter(G);
  assert.notEqual(JSON.stringify(w.elo), before); assert.equal(w.rankAt, G.year);
  assert.ok(w.trk.t20i.some((r) => r[2] != null), 'movement against the last table');
  for (const f of ['t20i', 'odi']) for (const k of ['bat', 'bowl', 'ar']) { const L = w.prk[f][k]; assert.ok(L.length >= 10); assert.ok(L.some((r) => (W.whoRanked(G, r[0]) || {}).nat === 'NEP'), `${f} ${k} lists Nepalis`); }
});

test('the 2026 T20 World Cup history entry is accurate', () => {
  assert.equal(T20WC_2026.hosts, 'India and Sri Lanka'); assert.equal(T20WC_2026.champ, 'India'); assert.equal(T20WC_2026.runner, 'New Zealand');
  const n = T20WC_2026.nepal; assert.equal(n.stage, 'Group stage'); assert.equal(n.wins, 1);
  assert.deepEqual(n.res.filter((x) => x.r === 'W').map((x) => x.v), ['Scotland']); assert.equal(n.res.length, 4);
});

test('a World Cup decider can be followed live with the engine, then the tournament finishes', async () => {
  const G = fresh(); const w = G.s.world; G.s.year = 2028; G.s.nepal.winter = 2027; G.s.nepal.results = []; w.l2.to = 2031; w.wint = null;
  let tries = 0; while (!(w.wc && w.wc.pending) && tries++ < 25) { w.wint = null; w.wc = null; W.afterWinter(G); }
  if (!(w.wc && w.wc.pending)) return; // Nepal can be out of contention before their last game; nothing to follow
  const r = await W.playPendingLive(G);
  assert.ok(r && w.wc.live && w.wc.live.lines.length > 0); assert.equal(w.wc.stage, 'done'); assert.ok(w.wc.champ);
  assert.ok(w.wcHist.some((h) => h.y === 2028));
});

test('an old save loads, plays a fixture and runs a whole off-season with the world layer', async () => {
  const G = new Game(oldSave()); assert.ok(G.s.world && G.s.world.lg.y === 2026);
  await G.playFixture(G.nextFixture(), null); await playSeason(G);
  const t0 = Date.now(); G.startOffseason(); const t1 = Date.now() - t0; await G.runIntlWinter(); const t2 = Date.now(); W.afterWinter(G); const t3 = Date.now() - t2;
  assert.ok(t1 + t3 < 1500, `world work per off-season stays cheap (${t1 + t3} ms incl. the core off-season)`);
  assert.equal(W.digest(G).rows[8].champ, G.teams[G.s.history[G.s.history.length - 1].champion].name);
  G.beginRetention(); G.applyRetention(); G.setupAuction(); // the NOC window closes
  assert.equal(W.openNocs(G).length, 0);
  const size = JSON.stringify(G.s.world).length; assert.ok(size < 60000, `world state ${size} bytes`);
  const G2 = new Game(JSON.parse(JSON.stringify(G.s))); assert.deepEqual(G2.s.world.lg, G.s.world.lg);
});
