// Season flow helpers shared by screens.
import { sleep, nextUnplayed } from './util.js';
import { Match } from '../game/engine.js';
import { quickHooks, prepOf, postMatchPath } from '../game/matchday.js';
import { afterMatchPath, preMatchPath } from '../game/occasions.js';
import { afterWinter } from '../game/world.js';
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
  G.fillSquad(G.user, () => Object.values(G.players).filter((p) => !p.team && !p.retired && !p.academy));
  return G.teams[G.user].squad.length - before;
}
// Start the season, guaranteeing every franchise can field a legal side.
export function startSeason(G) {
  const added = completeSquad(G);
  G.aiPreseason(); G.startSeason();
  return added;
}

// Start the off-season and play Nepal's winter (international matches are simulated with the real engine).
// The world off-season (rankings, the pathway, World Cups) runs once Nepal's winter is played.
export async function startOffseason(G) { G.startOffseason(); await G.runIntlWinter(); afterWinter(G); }

export function savedMatchFor(G, f) { const L = G.s.liveMatch; return L && f && L.n === f.n && L.year === G.year && !f.res ? L : null; }
// Quick-sim the user's next match, continuing a saved part-played match if there is one.
export async function quickSimUserMatch(G, f) {
  const saved = savedMatchFor(G, f);
  const m = saved ? Match.restore(G, saved.data) : G.newMatch(f);
  await m.run(quickHooks(G)); G.recordMatch(m, f); delete G.s.liveMatch; afterFixture(G);
  return m;
}

// Going to the match opens the matchday build-up first, unless the assistant handles it, it is
// already done for this fixture, or the match is under way.
export function matchPath(G, f, live) {
  if (live) return '/match'; const occ = f ? preMatchPath(G, f) : null; if (occ) return occ;
  const p = f ? prepOf(G, f) : null;
  return G.s.settings.assistant || !f || (p && p.done) ? '/match' : '/prematch';
}
// After the user's match: the occasions screen if there is one, else press (when scheduled), then the round-up.
export const afterMatchRoute = (G, f) => postMatchPath(G, f, f ? afterMatchPath(G, f) : null);
