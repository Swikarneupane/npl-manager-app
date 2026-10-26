// Headless check: plays several full seasons (league, playoffs, off-season, auction) with the real engine.
import { Game } from '../src/game/game.js';
const seasons = Number(process.argv[2] || 5);
const G = Game.create('LL', { lang: 'en' });
for (let s = 0; s < seasons; s++) {
  G.aiPreseason();
  for (const p of G.osFreeAgents()) { if (G.osCount(G.user) >= 6) break; G.signFA(p.id); }
  G.startSeason();
  while (!G.leagueDone()) await G.playFixture(G.nextFixture(), null);
  G.setupPlayoffs();
  let champ = null;
  while (!champ) { const f = G.nextFixture(); if (f) await G.playFixture(f, null); champ = G.advancePlayoffs(); }
  const h = G.seasonAwards(champ);
  if (G.s.sacked) G.takeJob(G.s.offers[0]);
  console.log(`${h.year}: champions ${h.champion}, player of the tournament ${h.pot}, Platinum Cap ${h.runs[0][0]} (${h.runs[0][2]})`);
  G.startOffseason(); G.beginRetention(); G.applyRetention(); G.setupAuction();
  while (G.lotStart()) G.simLot(true);
  G.finishAuction();
}
console.log('save size (KB):', Math.round(JSON.stringify(G.s).length / 1024));
