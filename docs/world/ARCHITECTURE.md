# NPL Manager: the cricket world (phase 3)

This is the plan and the contract for turning NPL Manager from one league into a whole cricket world. Everyone building it works to this file. Where code and this file disagree, fix one of them in the same change.

## Goals (from the product owner)

- **Jobs anywhere, in any mix.** The manager can run an NPL club, a national side (Nepal or any associate, later any nation), or a club in another league, and can hold a club job and a national job at once. Jobs are offered and lost during a career.
- **Every format.** T20, 50-over and multi-day: Tests, and first-class competitions such as the Ranji Trophy, Sheffield Shield and County Championship.
- **A full calendar.** Every Test nation's franchise league, domestic T20, one-day and first-class competitions, and the leading associates' competitions, including Nepal's. Also the international game: bilateral series in every format for full members and associates, CWC League 2, the Challenge League, the Qualifier Play-off and World Cup Qualifier, T20 regional qualifiers, T20 and ODI World Cups, the World Test Championship and the Asia Cup.
- **Real players everywhere.** Real names for internationals and domestic players. All ratings are the game's estimates.
- **Manage clubs abroad**, under each league's own rules: auction, draft or contracts, retentions and overseas limits.

## Honesty rules (unchanged, and stricter at this scale)

- Real people: name, nationality, approximate age, role, batting hand, bowling type, and which teams they play for. Nothing else. No invented quotes, hometowns, personal problems or off-field stories. Personal storylines and flaws only ever go to generated people.
- Ratings, values and potential are the game's estimates and are labelled as such.
- Rosters are a snapshot. Each data file records the date it describes. Everything after the save starts is simulated and labelled in-game.
- Never state real title counts or records unless they come from verified data in a data file with its source noted.

## 1. Data: a bundled database, not the save

At several thousand players the database cannot live in the save: browser storage is capped at about 5 MB, and phase 2 saves are already 0.5–0.7 MB. So:

- **Static data** lives in `src/data/world/`, one module per nation (`nations/IND.js` and so on) plus `leagues/*.js` for franchise leagues. Modules load on demand; the game never ships the whole world in its first paint.
- **The save** stores only what changes: the calendar, competition state, results, and per-player deltas (ratings now, form, fitness, injuries, contracts, the team they're registered to, compact career stats).

### Player record (static)

```
['ind-virat-kohli', 'Virat Kohli', 'IND', 1988, 'BAT', 86, 20, 'RM', 'R', { t20: 0, odi: 2, fc: 2 }, ['IND', 'DEL', 'RCB']]
 id (stable, ascii)  name          nat    born  role   bat bowl type  hand  format modifiers        teams (national, domestic, franchise)
```

- `id` is stable forever: `<nat>-<name-slug>`, with a numeric suffix for clashes. Saves refer to players by id.
- `bat` and `bowl` are base skills (0–100). The format modifiers adjust per format (a red-ball specialist gets `fc: +4, t20: -6`).
- The teams list is the snapshot registration. During a game, registrations live in the save.

### Nation module

```
export default {
  code: 'IND', name: 'India', member: 'full',          // full | associate
  asOf: '2026-10-01', sources: ['...'],
  players: [...],                                       // everyone whose nationality is IND
  teams: [{ id: 'IND-MUM', name: 'Mumbai', short: 'MUM', kind: 'domestic' }, ...],
  comps: ['IND-RANJI', 'IND-VH', 'IND-SMAT', 'IPL'],    // competitions hosted by this nation
};
```

## 2. Competitions

A competition is a definition (static, `src/data/world/comps.js`) plus a season instance (in the save).

```
{ id: 'IPL', name: 'Indian Premier League', host: 'IND', fmt: 'T20', kind: 'franchise',  // franchise | domestic | international
  window: ['Mar 20', 'May 31'],            // usual window in the calendar
  teams: ['CSK', 'MI', ...],
  structure: { stage: 'rr', legs: 2, groups: null, playoffs: 'ipl4' },  // rr | groups | knockout | series
  points: { win: 2, nr: 1, tie: 1 },        // multi-day: { win: 16, draw: 8, bonus: 'ranji' }
  squad: { min: 18, max: 25, overseas: { max: 8, xi: 4 }, recruit: 'auction', retain: 6 },  // auction | draft | contract
  level: 1 }                                // strength band, for the fast sim and player value
```

A season instance holds the fixtures (with dates), table, results, stats leaders and the champion. The NPL becomes one competition like any other; its phase 2 screens (auction, retention, playoffs, round-up) work for any competition whose rules fit them.

## 3. The calendar

- **The game moves by date.** `s.date` is a day number from 1 Jan 2026. Every fixture has a date. "Continue" advances to the next day that needs the user: a match for one of their teams, a decision, a squad deadline, an auction or a draft.
- **Days in between** are simulated: everything scheduled that day in every competition, plus training, injuries, transfers and news.
- **One shared clock** for all jobs. A national series and a club season can overlap; when they do, players called up miss club games and the user picks which job to manage live, with the assistant taking the other.
- **The international programme** follows the real Future Tours Programme where it's known (stored in data with its source), and is generated in the same pattern afterwards.

## 4. Simulation

- **Full engine** for any match involving the user's teams: ball by ball in T20 and ODI, and multi-day for Tests and first-class games.
- **Fast sim** for every other match: a statistical scorecard (innings totals, each batter's runs and balls, each bowler's figures) driven by the same player ratings, so stats, tables and rankings stay meaningful without running thousands of ball-by-ball games. Target: under 2 ms a T20 and 8 ms a multi-day match in Node.
- **Multi-day engine** (phase W2): up to four innings, overs per day with time lost to weather, declarations, the follow-on, draws, a new ball every 80 overs, pitch wear that helps spin later in the match, and points per competition.

## 5. Jobs and the career

- `s.jobs = [{ kind: 'club', comp: 'NPL', team: 'LL', since }, { kind: 'nation', team: 'NEP', since }]`, with at most one club job and one national job at a time.
- Each job has its own board, objectives, budget and job security. Reputation is shared and grows from results at every level.
- Offers come from clubs and nations whose level fits your reputation. National jobs open from about 50 reputation for associates and 75 for Test nations.
- **National team management:** pick squads (the selection pool is every eligible player and their form in every competition), set the XI, captain and plans, manage workload with clubs, and handle releases (NOCs). A national manager doesn't buy players.

## 6. Roadmap

Each phase ships playable and is committed separately.

| Phase | What it delivers |
| --- | --- |
| **W1 Foundation** | Dated calendar; competition framework; fast sim; 50-over everywhere; national team management for Nepal and the associates (CWC League 2, Challenge League, Qualifier Play-off, World Cup Qualifier, T20 regional qualifiers, T20 and ODI World Cups, bilateral series); jobs and career with both jobs at once; real national squads for full members and the leading associates. |
| **W2 Multi-day** | The multi-day engine; Tests and the WTC; first-class competitions in every Test nation. |
| **W3 Leagues** | Every franchise league and domestic competition running each season; managing clubs abroad, with auctions, drafts and contracts per league. |
| **W4 Database** | Real domestic squads for every team in every competition. |
| **W5 Polish** | Balance, pacing, Nepali strings, accessibility, and performance on low-end phones. |
