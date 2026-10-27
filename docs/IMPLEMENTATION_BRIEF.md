# NPL Manager: round 2 implementation brief

This brief is for implementing in this repo. Read it fully, then read `docs/design/README.md` and open the artboards it lists. The designs are the source of truth for layout and copy. This file is the source of truth for game rules.

## The existing project (already in this repo)

- **Stack:** React 18 and Vite.
  - Game engine in plain ES modules: `src/game/engine.js` (ball-by-ball match, commentary, DLS), `src/game/game.js` (league, playoffs, ageing, retirements, auctions, finance), `src/game/data.js` (real teams, squads, history, fixtures).
  - State: `src/lib/store.jsx` keeps a mutable `Game` instance; call `update()` after mutating it.
  - Live match controller: `src/lib/live.js`. Auction controller: `src/lib/auction.js`.
  - Saves: `src/lib/save.js` and `src/lib/storage.js`. Electron writes a file; Capacitor writes a private file; the web uses localStorage. Live matches are serialized and resumable.
- **Shells:** Electron in `electron/` (AppImage and .deb), Capacitor Android in `android/`. Vercel serverless functions in `api/` (cloud saves).
- **Styles:** `src/styles/npl.css` holds the design tokens. Reuse them; don't add new colours or fonts.
- **Tests and checks (keep them passing):**
  - `npm run build`
  - `npm run simulate` (headless seasons)
  - `npm run test:resume` (resume at 10 match points)
  - `npm run test:api`
- **Constraints:**
  - Existing saves must still load. Add new state with defaults when a save is loaded, for example `G.s.staff ??= {...}`.
  - Everything must keep working offline in the desktop and Android apps.

## Work in this order, committing after each phase

### Phase 1: navigation and portals (artboards 2, 3a, 3b, 8a)
- On phones (760px wide or less), replace the bottom bar with 5 icon tabs: Home, Squad, Match (red dot while a match is live), Season, More. One-word labels; no overflow.
- More opens a sheet: News, Nepal, Stats, History, Auction (disabled outside its phase), Club, Settings.
- Season is a new route that combines Table, Fixtures, Results and Playoffs as tabs. It includes a "playoff race" card. Estimate the probability by simulating the remaining fixtures about 200 times with a cheap rating-based model, not the full engine.
- Home becomes portals. Each section shows a few items and a "See all" link:
  - next match
  - 3 news items
  - the top 4 plus the user's row
  - the last 3 results
  - cap race leaders
  - 3 squad-watch items
  - board mood
- New `/news` page: search, filter chips (All, Your club, Results, Injuries, Signings, Board, International), "Needs you" pinned at the top, grouped by day, "Show older".

### Phase 2: match controls (1a, 1b, 1c)
- The plan card sits directly under the scoreboard: batting intent while batting, bowling plan while bowling.
- **Intents:** Block, Rotate, Normal, Attack, Hit out. They map to engine aggression −1, −0.5, 0, 1, 2. Auto keeps the existing `autoAggr`.
- **Read-outs:** "Expected scoring" and "Wicket risk" come from `ballProbs()` for the current striker against the current bowler: expected runs per ball × 6, and the wicket probability bucketed into Low, Medium and High.
- **Bowling:** bowler cards show figures, overs left and tags: "Death specialist" for a pace bowler with bowl rating 68 or more, "Bowled last over" (disabled), "Done" (disabled). Four field tiles with SVG mini fields. A risk read-out. The main button reads "Bowl over N · Name".
- **Phone:** a sticky action bar (Next ball / Sim over / ⋯). **Desktop:** a single control strip.

### Phase 3: decisions (5a, 5b)
- Events become blocking decisions. They open as a full-screen sheet with no close button.
- Each choice lists its effects before the user confirms, using the existing `fx` fields plus a new `promise`.
- **Gating:** if a decision is due before the next match, Home shows "N decisions before this match" and Go to match is disabled. If the user tries to sim, the sheet opens.
- **Promises:** stored as `G.s.promises = [{id, pid, kind:'start'|'debut', dueFixture, matchesLeft}]` and shown on Home. A broken promise costs morale −20 for that player and board −4. A kept promise is cleared.
- **Deadlines:** a decision left unanswered past its deadline takes the most cautious option, with a small board penalty (−2).

### Phase 4: team sheet (6a, 6b, 6c)
- Replace the Squad XI table with a team sheet for the next fixture: a bench, and 11 slots grouped as Openers 1–2, Top order 3, Middle 4–5, Finishers 6–7, Bowlers 8–11. The slot order is the batting order.
- Reordering: drag-and-drop on desktop (HTML5 drag events), drag handle plus ↑ / ↓ on phones. Tapping a row opens the swap sheet.
- **Order warnings:** a batter rated 68 or more placed at 8 or lower; a player with batting under 45 placed at 7 or higher; no keeper. "Fix the order for me" calls the existing `autoOrder`.
- **Rules checklist:** 7 Nepali, 4 overseas, a keeper, 5 or more players with bowl rating 50+, a captain.
- **Strength:** batting, bowling and fielding averages compared with the opponent's auto XI. Win chance comes from a logistic of the strength difference.
- **Bowling plan:** `team.bowlPlan = {pid: {pp, mid, death}}`, with phase totals of 6, 9 and 5 overs and at most 4 overs per bowler. Default it from ratings. `aiBowler()` must prefer bowlers with plan overs left for the current phase when the team is the user's.
- **Scout report line:** the opponent's top two bowlers by type, whether there's dew tonight, and their weakest phase from this season's economy figures.

### Phase 5: auction (4a–4d)
- **New pre-auction screen "Scout and shortlist"** (after retention, before lot 1). It also opens from the Pool tab during the auction, and from a player profile ("Add to shortlist").
  - Shortlist entries: `{pid, max, priority:'A'|'B'|'C'}`.
  - **Likely price:** a range from `value × need demand`, where need demand counts AI teams whose `needFor() > 1.2` for that player.
  - **Fit tags:** from the user's squad needs.
  - **Budget check:** the sum of max bids per purse.
  - **Needs coverage:** by role (openers, pace, spin, all-rounders, keepers).
  - "Auto-suggest targets" picks the best value per unfilled need within the purse.
- **Auction room:**
  - a phase stepper (Retention → Main → Accelerated → Pre-season)
  - a dismissable how-it-works strip
  - pool on the left with filters and sold prices
  - floor in the centre with a going once / going twice countdown, Bid, "Jump to" (+2 increments) and Pass
  - auto-bid up to the shortlist max
  - a "How he fits" card with a fair-value bar
  - a right panel with purses, slots and the still-needed checklist
  - a rivals row showing each team's status on this lot: Bidding, Out at X, Can't afford, Watching, Squad full
  - "Sim to my next target" (the existing jump)
- **Phone:** tabs (Floor, Pool, My squad, Rivals) and a sticky bid bar.

### Phase 6: staff (7a, 7b)
- `G.s.staff[teamId] = {bat:{name,level,wage,until}, bowl:{...}, physio:{...}}`. AI teams get staff too.
- **Effects by level L (1–5):**
  - Batting coach: batters under 26 get +round(L/2) development each season; form recovers 10%×L faster.
  - Bowling coach: the same for bowlers, plus death-over bowling +0.4×L.
  - Physio: injuries are L/2 matches shorter (rounded, minimum 1); +L fitness recovered after each match. With no physio, injuries last +1 match.
- Wages are Rs 3, 5, 8, 10 and 12 L for levels 1–5, paid from `team.balance` and shown in the ledger as "Staff wages". Contracts run 2 seasons. Releasing a coach costs 50% of the remaining wage.
- Three new candidates per vacant post each off-season (Nepali and overseas names). Hire or replace only in the pre-season or off-season.
- Club has a link into Staff, and the training focus text references the coach.

### Phase 7: rest of the UI (8b–8g)
Rebuild these screens to match the artboards:
- Player profile, with tabs Overview / NPL / Nepal
- Club
- Stats, with ranked bars and a season picker
- Off-season as a step flow: Retire → Growth → Nepal → Talent → Trades → Retain. Each step has a header card and a coach's note.
- Retention as 3 slots
- Scorecard with innings tabs

### Phase 8: international layer (9a–9e)
- **Data:**
  - Add for each Nepali player: `intl = {t20i, odi, debut, grade}`.
  - **Do not invent caps.** Source each player's T20I and ODI caps and debut from ESPNcricinfo or Wikipedia. Leave a field null if it isn't found, and show it as "—".
  - **Central contracts 2026:** A Plus is Rohit Paudel, Dipendra Singh Airee, Sandeep Lamichhane (Rs 120,000 a month, a new grade in 2026). Source the rest of the 2026 list (A, B, C, D, Emerging). If the 2026 list isn't found, use the 2025 grades and label them "2025".
- **Calendar** (real fixtures, results simulated in game; put it in `data.js` as `INTL_CALENDAR`):
  - ICC Men's CWC Qualifier Play-Off, Dec 4–21, 2026 (Kirtipur and Mulpani, ODI)
  - Nepal v India A T20s, Dec 9 and 11, 2026 (Kirtipur)
  - Nepal v Bangladesh, 3 T20Is, Mar 26, 28 and 30, 2027 (Kirtipur)
  - For later years, generate a plausible calendar (one ODI event and two T20I series each off-season).
- **Selection:** a 15-player squad picked by a score of NPL form, rating and contract grade. "On the fringe" means ranks 16 to 18.
- **Simulation:** run a quick simulation of each international match with the existing engine against an opponent XI, generated at an opponent strength level.
- **Effects:**
  - A call-up gives morale +8; being dropped gives −6.
  - Each series played gives +1 to +2 rating (respecting potential) and fitness −10.
  - A first cap sets `capped = true`, raises value by about 50% and moves the player into the capped auction set.
  - Milestones: a 50 or 100, a 5-wicket haul, and the 25th, 50th and 100th caps.
- **News:** kinds `intl` (debut, callup, dropped, milestone, contract), each with a Nepali `ne` line and effect tags.
- **Overseas:**
  - `nocStatus` ('received' | 'pending', where pending clears within 1–2 game days)
  - `intlStatus` ('active' | 'retired' | null; only set it where verified)
  - a chance that an active international is called away for 1–3 NPL matches; if so, allow a temporary replacement from free agents whose salary doesn't count against the purse
- **Screens:** the Nepal hub (from More), the Nepal tab on the profile, the off-season "Nepal" step, and the overseas availability screen (from Squad).

### Phase 9: more overseas players
- Roughly double `FREE_OS` to about 120 real T20 league regulars: IPL, BBL, PSL, CPL, SA20, ILT20, LPL and associate nations, with plausible ratings and ages based on known careers.
- Keep values from `calcValue`. Generate 8–12 new overseas players each off-season.

## Fixes requested from gameplay feedback
- **Pre-season fairness:** the user signs overseas players **before** the AI teams. Run `aiPreseason()` only when the user starts the season.
- **Difficulty setting** (Easy / Normal / Hard) in Settings and New game. It scales:
  - AI bidding: ×0.85 / ×1 / ×1.15
  - AI ratings in matches: −2 / 0 / +2
  - board patience: the sack threshold is 20 / 30 / 40

## Definition of done
- All phases built for phone (390px) and desktop. No horizontal overflow at 360px.
- Old saves load. Saving and resuming still work mid-match and on any screen.
- `npm run build`, `simulate`, `test:resume` and `test:api` pass. Add `scripts/test-season-flow.js`, which runs 2 seasons through decisions, the shortlist, the auction, staff and the international window headlessly.
- Rebuild the Linux installers (`npm run dist:linux`). The GitHub Actions workflow builds the APK.
