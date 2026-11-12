// Dev-only harness (vite dev server, /clubdev.html): the app with a fixture league and a club job in it. Not part of the build.
// ?tab=team|squad|recruit|money & theme=light|dark & stage=retain|recruit & mode=auction|draft|contract
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GameProvider } from './lib/store.jsx';
import { setDB, flush } from './world/players.js';
import { Game } from './game/game.js';
import * as C from './world/career.js';
import * as ST from './world/state.js';
import * as RC from './world/recruit.js';
import { mkNation, makeLeague, activate } from './world/clubdev.js';
import { dayOfDate } from './world/dates.js';
import { saveLocal } from './lib/save.js';
import App from './App.jsx';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/600.css';
import './styles/npl.css';
import './styles/app.css';

const q = new URLSearchParams(location.search); const mode = q.get('mode') || 'auction'; const stage = q.get('stage') || 'recruit'; const tab = q.get('tab') || 'team';
const lg = makeLeague('TL', mode, { retain: mode === 'auction' ? 3 : 0 });
setDB([mkNation('SCO', 64), mkNation('NAM', 62), mkNation('TLN', 58), mkNation('IND', 84, 'full')], [lg]); activate('TL');
const G = Game.create('LL', { manager: 'Dev' }); C.ensure(G); G.s.settings.theme = q.get('theme') || 'light'; G.s.manager.rep = 70;
C.takeJob(G, 'club', 'TL-AAA', { comp: 'TL', replace: true, quiet: true });
let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
ST.ensureYear(G, 2027); G.s.wd.day = dayOfDate(2027, 0, 24); C.tick(G, rnd);
if (stage === 'recruit' && RC.recOf(G, 'TL')) { RC.confirmRetain(G, 'TL', rnd); const R = RC.recOf(G, 'TL');
  if (mode === 'auction') { RC.aucNext(G, 'TL', rnd, 'TL-AAA'); RC.aucBid(G, 'TL', 'TL-AAA', rnd); } if (mode === 'draft') RC.draftAuto(G, 'TL', rnd, 'TL-AAA'); void R; }
if (tab === 'team') { G.s.settings.assistant = false; }
if (q.get('play')) { G.s.settings.assistant = true; for (let i = 0; i < 30; i++) { const nx = ST.nextUserFixture(G); if (!nx) break; G.s.wd.day = Math.max(G.s.wd.day, nx[1].d); C.assistantPlays(G, nx[0], nx[1], rnd); } G.s.settings.assistant = false; }
flush(G); saveLocal(G); history.replaceState(null, '', `/clubabroad?tab=${tab}`);
createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><GameProvider><App /></GameProvider></BrowserRouter></React.StrictMode>);
