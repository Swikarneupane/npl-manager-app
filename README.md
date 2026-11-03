# NPL Manager

A text-based franchise management game for the Nepal Premier League, built with React and Vite, with Node.js serverless functions. It deploys to Vercel.

You start in the 2026 season (Season 3) with the real squads, with the real 2024 and 2025 seasons in the history books, and play as many seasons as you like:

- live ball-by-ball matches, with DRS, rain and DLS, and dew
- a 28-match league and IPL-style playoffs
- ageing, retirements between 35 and 40, and new players from all seven provinces
- IPL-style mega and mini auctions, with retentions and RTM cards
- finances, board objectives and job offers
- matchday build-ups, press conferences, key-moment decisions and a round-up after every matchday
- composure, matchups and a live win-probability model in every match
- a training week, a dressing room with promises, scouting and an under-19 academy
- staff, contract talks, a board meeting, sponsors and fans, and a recruitment meeting before each auction
- storylines, rival managers and rivalries, a deeper player profile and a manager career
- world cricket: the year's T20 league champions, Nepalis abroad, Nepal's pathway, World Cups and in-game rankings

With full control a season takes four to six hours. Settings → Pace of the season → "Let the assistant decide", plus quick sim, brings it down to about an hour.

## Desktop app (Linux)

Ready-made installers are built with Electron:

- **AppImage (any distro):** run `chmod +x NPL-Manager-2.0.0-x86_64.AppImage`, then double-click it or run `./NPL-Manager-2.0.0-x86_64.AppImage`.
- **Debian/Ubuntu/Mint/Pop!_OS:** run `sudo apt install ./NPL-Manager-2.0.0-amd64.deb`, then open "NPL Manager" from the app menu (Games). To uninstall, run `sudo apt remove npl-manager`.

Your career is saved to `~/.config/NPL Manager/save.json`. The previous save is kept as `save.backup.json` in the same folder.

To build the installers yourself:

```
npm install
npm run dist:linux        # -> release/*.AppImage and release/*.deb
npm run desktop           # run the desktop app without packaging
```

## Android app

The `android/` folder is a ready Capacitor project (app ID `com.nplmanager.app`).

**Build on GitHub (no Android tools needed):**

1. Push this folder to a GitHub repository.
2. Open the **Actions** tab, choose **Build apps**, then **Run workflow**.
3. When it finishes (about 10 minutes), open the run and download **npl-manager-android-apk**. Unzip it to get `app-debug.apk`.
4. Copy the APK to your phone and open it. Allow "Install unknown apps" for your file manager or browser when Android asks.

The same workflow also builds the Linux installers (**npl-manager-linux**). Pushing a tag such as `v1.0.1` runs it automatically.

**Build on your own Linux machine:** install JDK 21 and Android Studio (or the command-line SDK tools), then run:

```
npm install
npm run android:apk       # -> android/app/build/outputs/apk/debug/app-debug.apk
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

On Android the career is saved to a private file inside the app. Uninstalling the app deletes it, so use Settings → Export save file first.

The debug APK is fine for playing and sharing with friends. Publishing on the Play Store needs a signed release build (`./gradlew bundleRelease` with your own keystore).

## Saving and resuming

The game saves:

- after every match, phase change and important decision
- at the end of every over during a live match
- whenever you close the app or switch away from it

When you reopen it, you return to the same screen. A match you left mid-over continues from the exact ball, after you press **Resume match**. `npm run test:resume` checks resuming at 10 different points in a match.

Cloud saves work in the apps too: build with `VITE_API_BASE=https://your-app.vercel.app npm run dist:linux` (or the Android build) so the app can reach your Vercel API.

## Run locally (web)

Requires Node 18 or later (20 recommended).

```
npm install
npm run dev        # http://localhost:5173
```

Other commands:

```
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run simulate   # headless: play 5 full seasons with the real engine
npm run test:api   # test the serverless save API against an in-memory Redis
npm run test:resume  # stop matches at 10 points, restore from the save, finish them
npm run test:unit    # rule tests (scripts/unit): max bid, composure, promises, board odds, training, contracts, NOCs and more
npm test             # unit tests, the season flow and the resume test
```

`npm run dev` serves the game but not the `/api` functions. To run those locally too, use `npx vercel dev`. Without them the game works fully; only cloud saves are unavailable.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project**, import the repo and press **Deploy**. Vercel detects Vite from `vercel.json`, so you don't need to change any settings.
3. Share the `*.vercel.app` URL. Every player's career saves in their own browser.

Or deploy from the command line:

```
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production
```

### Optional: cloud saves (play on any device)

Cloud saves let a player upload their career, get an 8-character code, and load it on another device. They need a Redis database:

1. In the Vercel project, open **Storage** (or **Integrations → Marketplace**) and add **Upstash Redis**. The free tier is enough. Connect it to the project.
2. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`) automatically. Redeploy.
3. **Settings → Cloud save** in the game is now active. `GET /api/health` reports `"cloudSaves": true`.

Without Redis the game still runs; the cloud save section shows that it is not set up.

## How it scales

- **Matches run in the browser.** The match engine, seasons and auctions all run client-side, so a match costs the server nothing. Thousands of people can play at once and the cost is static file hosting on Vercel's CDN.
- **Assets are split and cached.** Each screen is a lazily loaded chunk. React and the engine are separate chunks, and every hashed asset is served with a one-year immutable cache header.
- **The API is small and stateless.** `api/save.js` is a Node serverless function: saves are gzipped (about 15 KB for a new career), stored in Redis with a 90-day expiry, and rate limited per IP. It has no other state, so it scales horizontally on its own.

## Project layout

```
electron/            desktop shell: app:// protocol, save file, window memory (main.cjs, preload.cjs)
android/             Capacitor Android project (icons, splash, file storage)
.github/workflows/   build-apps.yml: APK + Linux installers on GitHub
api/
  _redis.js          Upstash REST client + rate limiter (not a route; underscore files are private)
  save.js            POST /api/save -> {code}; GET /api/save?code= -> {save}
  health.js          GET /api/health
src/
  game/              engine.js (ball-by-ball engine, commentary, DLS), game.js (league, auctions, ageing), data.js (real data)
  lib/               store.jsx (React state), live.js (live match controller), auction.js (auction room), flow.js, save.js, cloud.js, util.js
  components/        Shell (top bar + nav) and small shared pieces
  screens/           one file per screen, lazily loaded
  styles/            npl.css (design system from the Claude Design file) + app.css
scripts/             simulate-seasons.js, test-api.js
vercel.json          SPA rewrites, cache headers
```

## Data notes

- **Sources:** squads, history and fixtures come from the Wikipedia NPL pages, which cite ESPNcricinfo. Three overseas signings are listed only by CricketWorld so far: McMullen, Karunaratne and Ariful Islam.
- **Estimated values:** player ratings, ages and values are estimates.
- **Editing the data:** all real data is in `src/game/data.js` as plain arrays. Edit ratings or squads there, rebuild, and start a new game.
