// ===== Link between the NPL game and the cricket world (src/world) =====
// The world keeps its own clock; NPL fixtures carry dates, so before each NPL match the world is
// moved to that day. The user's national fixtures that fall before it are played by the assistant
// if the user hasn't played them (the Home screen offers them first).
import * as ST from '../world/state.js';
import { flush } from '../world/players.js';
import { dayOfLabel } from '../world/dates.js';

export function migrate(G) { ST.migrate(G); }
export function beforeMatch(G, f) {
  if (!G.s.wd || !f || !f.date) return; const day = dayOfLabel(f.date, G.year); if (day == null) return; // a world day number (G.dayOf is epoch ms)
  try { ST.advance(G, day - 1, { auto: true }); } catch (e) { console.error('world advance', e); }
}
export function beforeSave(G) { try { flush(G); } catch (e) { console.error('world flush', e); } }
