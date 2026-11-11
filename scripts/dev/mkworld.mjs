// A save with both jobs (Lumbini Lions and Nepal), the 2026 NPL season played and the world advanced
// to 1 Mar 2027. Development tool. Usage: node scripts/dev/mkworld.mjs <out.json>
import { writeFileSync } from 'node:fs';
const P = await import('../../src/world/players.js'); await P.loadDB();
const { Game } = await import('../../src/game/game.js'); const ST = await import('../../src/world/state.js');
const C = await import('../../src/world/career.js'); const D = await import('../../src/world/dates.js'); const flow = await import('../../src/lib/flow.js');
const G = Game.create('LL', { lang: 'en', manager: 'Test' }); C.takeJob(G, 'nation', 'NEP', { quiet: true });
G.aiPreseason(); for (const p of G.osFreeAgents()) { if (G.osCount(G.user) >= 6) break; G.signFA(p.id); } G.startSeason();
const user = (f) => f.home === G.user || f.away === G.user;
while (G.s.phase === 'league' || G.s.phase === 'playoffs') { const f = G.nextFixture(); if (!f) { flow.afterFixture(G); continue; } if (user(f)) { G.expireDecisions(f.n); await flow.quickSimUserMatch(G, f); } else await flow.simFixture(G, f); }
await flow.startOffseason(G);
ST.advance(G, D.dayOfDate(2027, 2, 1), { auto: true });
G.hook('beforeSave'); writeFileSync(process.argv[2], JSON.stringify(G.s));
console.log('world save', D.label(G.s.wd.day), G.s.phase, Math.round(JSON.stringify(G.s).length / 1024), 'KB');
