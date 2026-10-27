# NPL Manager: round 2 design artboards

These are static HTML mockups made in Claude Design. Open any `.dc.html` file in a browser to see it; the source is plain HTML with inline styles. They use the same tokens as `src/styles/npl.css`: colours, IBM Plex Sans, and Anek Latin condensed for scoreboard figures.

Phone artboards are 390px wide with a bottom tab bar. Desktop artboards are fluid with the left sidebar. Sizes and positions are in `canvas.json`.

| # | Artboard | What it shows |
|---|---|---|
| 1a | Main.dc.html | Match, batting, phone: plan card under the scoreboard (5 intents with risk dots, expected scoring and wicket risk, Auto switch, batters, next-batter chips), sticky action bar |
| 1b | Match-Bowling.dc.html | Match, bowling, phone: bowler cards (figures, overs left, tags), 4 field tiles with mini field diagrams, risk read-out, "Bowl over N · X" button |
| 1c | Match-Desktop.dc.html | Match, desktop: one control strip between the scoreboard and the commentary |
| 2 | Nav-More.dc.html | Phone bottom bar: 5 icon tabs (Home, Squad, Match with live dot, Season, More) and the More sheet |
| 3a | Home-Portals.dc.html | Home as portals: decision pin, next match, 3 news, top-4 table plus your row, 3 results, cap races, squad watch, board |
| 3b | News.dc.html | All-news page: search, filters, "Needs you" pinned, grouped by day |
| 4a | Auction-Desktop.dc.html | Auction room: phase stepper, how-it-works strip, pool (left), floor with bid / jump / pass and auto-bid (centre), my squad and needs (right), rivals row |
| 4b | Auction-Mobile.dc.html | Auction room, phone: tabs Floor / Pool / My squad / Rivals, sticky bid bar |
| 4c | Auction-Shortlist.dc.html | Scout and shortlist before the auction: pool table with star, likely price, fit, max bid, priority A/B/C; budget check; needs coverage |
| 4d | Auction-Pool-Mobile.dc.html | Pool tab, phone: star a player, set max bid (− / +) and priority inline |
| 5a | Decision-Sheet.dc.html | Blocking decision: full-screen sheet, no close button, options show their consequences, confirm |
| 5b | Decision-Gate.dc.html | Home with "2 decisions before this match", Go to match disabled, promises tracker |
| 6a | XI-Desktop.dc.html | Team sheet: bench, 11 slots grouped in batting bands (slot order is the batting order), order warnings, rules checklist, strength v opponent, 20-over bowling plan |
| 6b | XI-Mobile.dc.html | Team sheet, phone |
| 6c | XI-Swap-Mobile.dc.html | Swap sheet: candidates with the effect of each change; illegal swaps greyed with the reason |
| 7a | Staff-Desktop.dc.html | Backroom staff: 3 posts (batting coach, bowling coach, physio), levels 1–5, wages, candidates |
| 7b | Staff-Hire-Mobile.dc.html | Staff and hiring, phone |
| 8a | Season-Mobile.dc.html | Season tab: Table / Fixtures / Results / Playoffs, playoff-race card |
| 8b | Player-Mobile.dc.html | Player profile: header card, last-5 chart, season tiles, attributes, training focus, contract |
| 8c | Club-Mobile.dc.html | Club: balance, board, fans, staff entry point, ticket slider, money breakdown, job offers |
| 8d | Stats-Mobile.dc.html | Stats: cap races as ranked bars |
| 8e | Offseason-Mobile.dc.html | Off-season as steps (example: Growth) |
| 8f | Retention-Mobile.dc.html | Retention: 3 numbered slots, worth-keeping list with likely prices |
| 8g | Scorecard-Mobile.dc.html | Scorecard: result header, innings tabs |
| 9a | Nepal-Hub-Mobile.dc.html | Nepal national team hub |
| 9b | Intl-News-Mobile.dc.html | International news (debut, call-up, milestone, contract, dropped) with effects |
| 9c | Player-Intl-Mobile.dc.html | Player profile, Nepal tab (caps are placeholders to be sourced) |
| 9d | Offseason-Intl-Mobile.dc.html | Off-season "Nepal's winter" step |
| 9e | Overseas-Duty-Mobile.dc.html | Overseas NOC status, national duty strip, temporary replacement |
