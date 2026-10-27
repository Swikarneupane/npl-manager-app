// Headless check: plays several full seasons (league, playoffs, off-season, auction) with the real engine.
import { Game } from '../src/game/game.js';
import { playoffOdds } from '../src/game/odds.js';
// Playoff odds sanity: exactly four teams qualify in every simulated season, so the top-4
// probabilities across all eight teams must add up to about 4.
function checkOdds(G, label) {
  const o = playoffOdds(G); const sum = Object.values(o.odds).reduce((a, p) => a + p, 0);
  const line = Object.entries(o.odds).map(([id, p]) => `${id} ${o.status[id] ? o.status[id] : Math.round(p * 100) + '%'}`).join(', ');
  if (!(sum >= 3.9 && sum <= 4.1)) throw new Error(`playoff odds sum to ${sum.toFixed(3)} (${label}): ${line}`);
  console.log(`  odds after ${o.played} match${o.played === 1 ? "" : "es"} sum to ${sum.toFixed(2)}: ${line}`);
}
const seasons = Number(process.argv[2] || 5);
const G = Game.create('LL', { lang: 'en' });
for (let s = 0; s < seasons; s++) {
  G.aiPreseason();
  for (const p of G.osFreeAgents()) { if (G.osCount(G.user) >= 6) break; G.signFA(p.id); }
  G.startSeason();
  while (!G.leagueDone()) {
    await G.playFixture(G.nextFixture(), null);
    const n = G.s.fixtures.filter((f) => f.res).length;
    if (n === 14 || (s === 0 && (n === 1 || n === 24))) checkOdds(G, `${G.year} match ${n}`);
  }
  G.setupPlayoffs();
  let champ = null;
  while (!champ) { const f = G.nextFixture(); if (f) await G.playFixture(f, null); champ = G.advancePlayoffs(); }
  const h = G.seasonAwards(champ);
  if (G.s.sacked) G.takeJob(G.s.offers[0]);
  console.log(`${h.year}: champions ${h.champion}, player of the tournament ${h.pot}, Platinum Cap ${h.runs[0][0]} (${h.runs[0][2]})`);
  G.startOffseason(); await G.runIntlWinter(); G.beginRetention(); G.applyRetention(); G.setupAuction();
  while (G.lotStart()) G.simLot(true);
  G.finishAuction();
}
console.log('save size (KB):', Math.round(JSON.stringify(G.s).length / 1024));
