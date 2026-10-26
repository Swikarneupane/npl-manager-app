// Season flow helpers shared by screens.
import { sleep, nextUnplayed } from './util.js';
import { Match } from '../game/engine.js';
export function afterFixture(G) {
  if (G.s.phase === 'league' && G.leagueDone()) G.setupPlayoffs();
  else if (G.s.phase === 'playoffs') { const ch = G.advancePlayoffs(); if (ch) G.seasonAwards(ch); }
}
export async function simFixture(G, f) { await G.playFixture(f, null); afterFixture(G); }
// Sim every fixture before the user's next one, yielding to the browser so the UI stays responsive.
export async function simUntilUser(G) {
  let f = nextUnplayed(G); let n = 0;
  while (f && !(f.home === G.user || f.away === G.user) && G.s.phase !== 'seasonEnd') {
    await simFixture(G, f); f = nextUnplayed(G); if (++n % 2 === 0) await sleep(0);
  }
}
export async function simToSeasonEnd(G, stopAtUser = true) {
  let f = nextUnplayed(G); let n = 0;
  while (f && G.s.phase !== 'seasonEnd') {
    if (stopAtUser && (f.home === G.user || f.away === G.user)) break;
    await simFixture(G, f); f = nextUnplayed(G); if (++n % 2 === 0) await sleep(0);
  }
}
// Fill the user's squad to the minimum (18 players, 6 overseas) with the best affordable free agents.
export function completeSquad(G) {
  const before = G.teams[G.user].squad.length;
  G.fillSquad(G.user, () => Object.values(G.players).filter((p) => !p.team && !p.retired));
  return G.teams[G.user].squad.length - before;
}
// Start the season, guaranteeing every franchise can field a legal side.
export function startSeason(G) {
  const added = completeSquad(G);
  G.aiPreseason(); G.startSeason();
  return added;
}

export function savedMatchFor(G, f) { const L = G.s.liveMatch; return L && f && L.n === f.n && L.year === G.year && !f.res ? L : null; }
// Quick-sim the user's next match, continuing a saved part-played match if there is one.
export async function quickSimUserMatch(G, f) {
  const saved = savedMatchFor(G, f);
  const m = saved ? Match.restore(G, saved.data) : G.newMatch(f);
  await m.run(null); G.recordMatch(m, f); delete G.s.liveMatch; afterFixture(G);
  return m;
}
