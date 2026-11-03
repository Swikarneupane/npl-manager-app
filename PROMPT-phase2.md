# NPL Manager, phase 2: prompt for Claude Code

Unzip this into your existing NPL Manager repo (it adds a `design-phase2/` folder), then paste everything below the line into Claude Code.

---

You are extending **NPL Manager**, an existing single-player franchise management game for the Nepal Premier League. The core game already works: new game, home and inbox, squad and XI rules, player profile, fixtures and table, the live match, scorecard, auction room, retention, overseas window, off-season summary, history, finance and board, settings, and the design system with light and dark themes.

This phase adds four things:

- a tabbed mobile layout;
- auction improvements;
- a large "depth" layer that makes each season last 4–6 hours instead of 30 minutes;
- a World cricket section.

**Ground rules:**

- **Integrate, don't rebuild.** Read the existing code first: components, store, simulation modules, i18n, routes. Reuse what is there, and extend the data model and save format with migrations so old saves still load.
- **Keep the visual language.** It is text-first: no images, logos, icons or emoji. Tabular figures throughout. Colour carries meaning: crimson for wickets, warnings and the primary action; blue for gains, boundaries and your team; gold for milestones, finals and trophies; a dot per franchise.
- **Keep everything bilingual and themed.** Light and dark themes and English/नेपाली/Both work on every new screen.

## 0. Design references

`design-phase2/` holds the approved designs for this phase.

- `npl-additions.css`: the new CSS added in this phase. Merge it into the existing stylesheet: mobile shell (`.m-root`, `.m-top`, `.m-pin`, `.tabs`, `.badge`, `.m-scroll`, `.m-actions`, `.bnav`, `.live`, `.mlist`, `.mhead`) and the depth layer (`.steps` stepper, `.gauge`, `.pull` quotes, `.occasion` gold edge, `.choice` option cards with `.fx` effect lines, `.cal` week calendar, `.rise` animation). `npl.css` is the full current stylesheet for reference.
- `*.dc.html`: one screen each. Ignore the design tool's templating (`<x-dc>`, `<helmet>`, `{{holes}}`, `<sc-for>`, `<sc-if>`, the `DCLogic` script). Read them for layout, hierarchy, copy, states and behaviour; the scripts at the bottom show each screen's interaction logic in miniature. Files starting with `M` are 390 × 844 phone layouts; the rest are desktop, 1440 wide and fluid.
- Match spacing, sizes and wording from the files. Where a file and this prompt disagree, this prompt wins on logic and the file wins on look.

## 1. Mobile: tabs instead of long scrolling (below 760 px)

Replace the current stacked mobile layouts with the tabbed shell. Every phone screen has four layers:

- a **pinned context strip** (the one thing you came for);
- **tabs** (44 px tall, active tab underlined in crimson, optional badge);
- a **scrolling tab body**;
- where there's a primary action, a **pinned action bar** at thumb height.

Below that sits a **five-item bottom bar**: Home, Squad, Match, League, More. It is context-aware: in the off-season Match becomes Auction, with a red live dot while bidding runs. More opens History, Club, World, Nepal and Settings.

| Screen | File | Pinned | Tabs | Action bar |
| --- | --- | --- | --- | --- |
| Home | `MHome` | team + purses | Today (next match, decisions answered in place, alerts) · Inbox (filter chips) · Club | — |
| Live match | `MMatch`, `MMatchTactics` | compact scoreboard + win probability | Live (batters, bowler, this over, last 4 balls) · Commentary · Card · Tactics (badge shows current aggression) | Next ball · End of over · aggression shortcut |
| Squad | `MSquad` | XI rule check "XI 11/11 · Nepali 7/7 · Overseas 4/4" + legal chip | XI (tick to drop/pick, live rule check) · Squad (two-line rows, sort) · Order (↑↓, captain, WK) · Training | — |
| League | `MLeague` | your position | Table · Fixtures · Playoffs · Caps (Platinum and Golden Cap leaders) | — |
| Auction | `MAuction` | current lot + ticking bid, then a **needs strip** and an **Up next line** (section 2) | Lot · Up next · My squad · Rivals · Sold | Bid (with your max) · Pass |

DRS on mobile opens as a bottom sheet.

## 2. Auction improvements (desktop `Auction` and `MAuction`)

- **Needs strip, always visible:** squad count against 18–22, Nepali count with room left, overseas count against the minimum 6 (red while short), and **your max on this lot**.
- **Your max** = the relevant purse (overseas lots use the overseas purse) minus a reserve for every slot you're still required to fill, at the lowest base price for that kind of player (the design uses Rs 3 L per required overseas slot). The Bid button shows "Bid Rs X · max Rs Y". Past the max, it disables and reads "Over your limit".
- **Up next, always visible:** a one-line preview of the next lots, with your next shortlisted lot and how many lots away it is. The Up next tab groups lots by set and filters by All, Shortlist or Fits needs. A ☆ toggle adds a lot to the shortlist. Tags read "Fills your WK need", "Fills an overseas need", "Ex-player · your RTM" or "Your max Rs X".
- **My squad tab:** what's still to fill (minimum overseas, missing roles such as wicketkeeper, squad size); money per remaining slot; the signed list with prices and a role count.
- **Rivals tab:** each team's overseas purse, overseas slots open and the most it can bid on this lot, with the teams currently bidding marked.
- **Desktop:** add a "Your needs" panel and an "Up next" list to the right column.

## 3. Matchday and big occasions

- **Matchday build-up** (`Prematch`, `MPrematch`): five steps with a stepper and a readiness checklist. Any step can be skipped ("Let the assistant do the rest").
  1. **Opposition report:** a one-line finding, danger players with how to handle them, and matchup cards you can tick into your plan. Ticked matchups give a small, visible in-match edge.
  2. **Pitch and conditions:** surface, dew, rain chance, toss history at night, par score, and the assistant's advice.
  3. **Selection:** XI summary, five Impact Player substitutes, and alerts such as a dropped player asking for a chat.
  4. **Game plan:** batting and bowling plan per phase (powerplay, middle, death). These become in-match defaults. The captain may push back; you can agree, overrule or compromise, which changes his trust.
  5. **Team talk:** four tones, each with a predicted effect, plus a word with up to three players. Players' reactions show as body-language lines when they walk out.

  A side panel shows tonight's pulse: sell-out, preview, fan poll.
- **Press conference** (`Press`): three questions, three answers each, plus "Send the assistant". Each answer shows a room-reaction line and moves squad morale, fan support, board confidence and the rival manager's respect, visible in a side panel. Questions are generated from current storylines: past results against the opponent, a dropped player, a rival's comment.
- **Live match, deeper** (`MatchPlus`):
  - a phase rail summarising each phase and whether the plan worked;
  - two-voice commentary (ball by ball, plus italic "Expert" colour lines);
  - a composure gauge for each batter and for the fielding side;
  - a dugout panel: Impact Player used or available, timeouts, reviews, and sending a message out;
  - an "Also live" ticker for a simultaneous rival game;
  - gold **key-moment cards**: one decision with 2–3 options, each showing how win chance would change and the risk.
- **Composure model:** see section 7.
- **Matchday round-up** (`Roundup`): a headline, a radio-style paragraph, results with key performers, "what it means for you", table movement, team of the round, and stories from around the league. Show it after every matchday.
- **Playoff week** (`Playoffs`): a bracket with results so far, a comparison of possible final opponents (head-to-head, form, danger player, model odds), and tasks before the final (rest, watch Qualifier 2 live to unlock a fuller report, media day).
- **Final week** (`FinalWeek`): a gold-edged hero with a countdown, a three-day task list (media day, open or closed training, selection meeting, who leads the team out, final-day team-talk tones), both teams' road to the final, generated pundits' picks, fan messages including Nepali, and what's at stake.
- **Trophy ceremony** (`Trophy`, `MTrophy`): full screen on the scoreboard background, with gold accents and a skip button. Stages:
  1. the winning runs;
  2. the presentation (player of the final, Platinum Cap, Golden Cap, Emerging player);
  3. choose who lifts the trophy, where each choice has effects on morale, unity, fans or the captain's trust;
  4. "Champions / च्याम्पियन" in large type.

  Then Victory lap and Season review. Each stage rises in; honour reduced motion.
- **Season review** (`SeasonReview`): headline stats, the season in 8 moments with "You chose: …" lines pulled from the decision log, awards, honours-board additions, the board's verdict, and what carries into next season.
- **Decision log:** record every meaningful choice (selection calls, team talks, press answers, key-moment decisions, story choices) with a timestamp and its outcome. Season review and the manager career read from it.

## 4. Between matches

- **Training week** (`Week`): a 7-day calendar with match days marked and today outlined. Each training day has a morning and an afternoon session: Rest, Recovery, Analysis, Fielding, Nets or Match simulation, each with a load value. A live projection shows freshness for the next match, sharpness and development, plus advice. Also shown: a bowling workload table (overs in the last 7 days, rest days, injury risk) and today's tasks (1–3 per day, each linking to its screen). The coaches can plan the whole week.
- **Dressing room** (`Dressing`):
  - **hierarchy:** team leaders, influential players, others, newcomers;
  - **social groups**, with drifting players flagged;
  - **happiness** per player with a reason;
  - **promises** (kept, at risk, broken, open);
  - **one-to-ones** with 3–4 options and reply text.

  The mood of team leaders spreads. A broken promise lowers happiness for that player and, more mildly, for his group.
- **Scouting and academy** (`Scouting`): send scouts to the seven provinces (Koshi, Madhesh, Bagmati, Gandaki, Lumbini, Karnali, Sudurpaschim). Each scout has a grade and days remaining. Reports narrow a player's potential range over time; better scouts narrow it faster. Actions: sign to academy, keep watching, add to auction shortlist. Also: an under-19 academy squad with promote, release and talk; an academy match each week; a scouting budget; and a board objective for academy graduates.

## 5. People, money and recruitment

- **Recruitment meeting** (`Recruitment`), before each auction:
  - squad gaps, each set to High, Medium or Low priority;
  - the overseas and domestic purses re-split live by priority weight;
  - targets per gap with expected price ranges, tagged first choice, backup or bargain;
  - staff opinions, rivals' needs, and scouting trips left.

  Saving the plan feeds the auction shortlist and the "Fits needs" filter.
- **Staff room** (`Staff`): roles are assistant manager, batting, bowling, spin and fielding coaches, analyst, physio, head scout and mental-skills coach. Each staff member has a grade A–D, a speciality, a wage, a contract and an opinion of you. A staff budget applies. Hiring compares candidates and books interviews, and staff send advice to the inbox. Grades affect development speed, the quality of advice, injury prevention and how fast scouting narrows potential. The mental-skills coach adds composure in key moments and playoffs.
- **Contract talks** (`Contract`, `MContract`):
  - terms: wage, length 1–4 seasons, promised role (Rotation, Regular, Key player), playoff bonus, player-of-the-match bonus, release clause;
  - a live "chance he signs", with the agent's reply after each offer;
  - 3 rounds, then a walk-away option;
  - context: rival interest, the highest wage in the squad, and what happens if unsigned (he enters the auction pool).

  A promised role becomes a tracked promise in the dressing room.
- **Board meeting** (`Board`), at the end of each season:
  - objectives reviewed (Exceeded, Met or Behind);
  - five confidence pillars (Results, Finances, Fans and community, Youth development, Conduct and media);
  - up to two requests: indoor nets, analysis room, gym and recovery, scouting budget, academy hostel or wage budget. Approval odds drop as you ask for more, and approved upgrades have real effects;
  - next season's objectives, with "Negotiate objectives".
- **Sponsors and fans** (`Commercial`):
  - sponsor offers with conditions tied to results or selection (for example "their ambassador must play 6 of 7");
  - community events around Dashain and Tihar, and school clinics;
  - merchandise;
  - fan segments: province locals, Kathmandu Valley, Nepalis abroad, students;
  - a fan feed with Nepali posts and a weekly sentiment figure.

## 6. Living league and the long game

- **Story events** (`Storyline`, `MStory`): a data-driven storyline engine. Chains are stored as JSON, each step with conditions, choices and effects, and a step can unlock the next part days or seasons later. A story page shows "how we got here", 3–4 choices with their effects, and the outcome text. A side list shows the other stories in progress. Write at least 15 chains, including:
  - Dashain or Tihar leave requests;
  - a homesick overseas player;
  - exam clashes for young players;
  - national call-ups;
  - a dropped veteran's unrest;
  - a sponsor ambassador clash;
  - a rival manager's war of words;
  - an injury rushed back for a final.
- **League hub** (`League`):
  - rival managers (generated): style, job security gauge, relationship with you, recent form;
  - a news wire covering sackings and caretakers, press spats, transfer interest and record chases;
  - your rivalries with a heat gauge and the reason, built from finals, press and transfers. Rivalry matches raise crowds, pressure and headlines;
  - other games this week, with alerts.

  AI managers make real decisions (selection, rotation, auction strategy, sacking at low board confidence), and a new manager changes how a team plays.
- **Deeper player profile** (`PlayerPlus`): personality traits revealed over time, a scouted weakness, a form bar chart of the last 10 innings (gold for 50+), a personality table, relationships, a career timeline, a development plan with focus and mentor and a projection, conversation choices with replies, and the contract.
- **Manager career** (`Career`):
  - reputation tiers: Local, Respected, National, Legendary;
  - style labels earned from behaviour;
  - a trophy cabinet that links to final scorecards;
  - achievements, with progress where they span several seasons;
  - job interest, including Nepal A from a reputation threshold;
  - farewell matches for retiring players, with a Hall of Fame vote;
  - challenge scenarios for new saves.

## 7. New simulation and data

- **Composure:** a 0–100 value per player in a match. Base it on temperament and big-game traits. It falls with dot-ball strings, a required rate above 12, a dropped catch, a hostile crowd, a first meeting with an elite bowler, and playoff or final pressure (about double). It rises with boundaries, the captain's word, the team talk and the mental-skills coach. Low composure raises false-shot and wide probability. Show it as a gauge and in commentary.
- **Matchups:** track runs per over and dismissals for batter hand against bowling type, and for each pair of players. The opposition report and key-moment cards read from this.
- **Win probability:** a model from score, wickets, balls left, target and venue par. Key-moment options show the change in it.
- **Workload and injury:** overs bowled in the last 7 days, rest days, age and training load feed injury risk.
- **Training load:** session loads drive freshness and sharpness for the next match and the development rate.
- **Happiness and promises:** see the dressing room in section 4.
- **Board pillars:** the five pillars feed board confidence, which is reviewed at the end of each season and in mid-season checks.
- **Rivalry heat, reputation and achievements:** keep running counters for each.
- **Save migrations:** default every new field for old saves.

## 8. World cricket (new section; nav "World" and "Nepal")

- **Off-season digest: who won which league** (`World`, `MWorld`):
  - shown in the off-season and linked from the inbox;
  - a table of the year's T20 league champions in the order they finished (BBL, SA20, ILT20, BPL, IPL, PSL, MLC, CPL, then the NPL highlighted): league, champion, runner-up and final margin;
  - tap a league for a short account of its final and the Nepali angle;
  - side panels: headlines from the year, Nepali champions abroad, and leagues starting this winter;
  - phone tabs: Champions, Nepalis, Coming up;
  - foreign leagues run as a light simulation: real league and team names, simulated results.
- **Players abroad and NOCs:** foreign clubs can request your players (development contracts, injury replacements). Granting a NOC brings a fee and experience but adds injury and fatigue risk; refusing lowers the player's happiness. Track Nepali players' stats in those leagues.
- **International centre** (`International`), with tabs Nepal, Competitions, and Series around the world:
  - Nepal's 50-over pathway: Challenge League → CWC League 2 → Qualifier Play-off → World Cup Qualifier → World Cup;
  - the League 2 table;
  - your players in the Nepal squad, and international form feeding back into ratings;
  - calendar clashes with your pre-season, plus a decision;
  - a competitions list and a feed of series around the world.
- **World Cup** (`WorldCup`, `MWorldCup`): a gold occasion hero for Nepal's decisive match, group tables you can switch between, Nepal's results so far, the road to the final, and tournament leaders. You follow it as a club manager whose players are involved; you don't pick the national side. On mobile, the live chase shows as a match screen with a Nepali commentary line.
- **Rankings** (`Rankings`): team, batter, bowler and all-rounder rankings, switchable between T20I and ODI. Highlight Nepali players and mark your own. Add a Nepal-at-a-glance panel and a World Test Championship table. These are the game's own ratings, recalculated after each simulated international and labelled "in-game, not ICC".

## 9. Honesty rules (keep enforcing)

- Real facts stay accurate:
  - 2024 champions Janakpur Bolts; 2025 champions Lumbini Lions;
  - CWC League 2 2023–27 teams: Canada, Namibia, Nepal, Netherlands, Oman, Scotland, UAE, USA. The top 4 go to the World Cup Qualifier; the bottom 4 go to the Qualifier Play-off with the Challenge League's top 4;
  - Nepal went out in the group stage of the 2026 T20 World Cup after one win, against Scotland;
  - Sandeep Lamichhane plays BPL for Rajshahi Warriors and was the first Nepali in the IPL (2018).
- Everything after the save starts is simulated and labelled as in-game.
- Never invent quotes, hometowns, personal problems or off-field stories for real people. Give story events, personality flaws, sledging and personal storylines to generated players and generated staff, pundits, agents, sponsors and rival managers.
- Don't state career title counts for real foreign franchises unless they come from verified data.

## 10. Small fixes from the design review

- Home's head-to-head line should read "last meeting: Lumbini won, 2025 Qualifier 2". The 2025 final was against Sudurpaschim, not Biratnagar.

## 11. Build order and checks

1. Merge the CSS, then build the mobile shell and the tabbed versions of Home, Match, Squad, League and Auction.
2. Auction needs strip, max-bid logic, Up next, and the My squad and Rivals tabs.
3. Decision log, composure, matchups and the win-probability model.
4. Matchday build-up, press conference, deeper live match with key-moment cards, matchday round-up.
5. Playoff week, final week, trophy ceremony, season review.
6. Training week, dressing room with promises, scouting and academy.
7. Recruitment meeting, staff, contracts, board meeting, sponsors and fans.
8. Storyline engine with 15+ chains, league hub with AI managers and rivalries, deeper player profile, manager career.
9. World cricket: digest, NOCs, international centre, World Cup, rankings.
10. Nepali strings, accessibility, balance and pacing pass.

After each step:

- compare with the matching `design-phase2/` file at 1440 px and 390 px in both themes;
- add unit tests for the new rules: max bid, composure changes, promise tracking, board approval odds, training projection, contract signing chance, NOC effects;
- check that an existing save still loads.

The target is a season of 4–6 hours on default settings, with every added minute spent on a decision. "Let the assistant decide" and quick sim must still allow a 1-hour season.
