// Screenshots of the built app with a given save. Development tool.
// Serve a build first: npx vite preview --outDir <dist> --port <port>, and put a file __blank.txt in <dist>.
// Usage: node scripts/dev/shot.mjs <save.json|none> http://localhost:<port> <out-dir> name:/route:width:theme[:lang] ...
// Prints any page errors per shot.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const [saveFile, base, outDir, ...specs] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const BIN = process.env.CHROME || `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`;
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(BIN, [`--remote-debugging-port=${port}`, '--no-sandbox', '--hide-scrollbars', `--user-data-dir=${outDir}/.prof${port}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let list; for (let i = 0; i < 50; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; } catch { await sleep(150); } }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const errors = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || a.description).join(' ')); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
const raw = saveFile === 'none' ? null : JSON.parse(readFileSync(saveFile, 'utf8'));
for (const spec of specs) {
  const [name, path, width, theme = 'light', lang = 'en'] = spec.split(':');
  const w = +width; const h = w <= 500 ? 844 : 1000;
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w <= 500 });
  const s = raw ? { ...raw, lang, settings: { ...raw.settings, theme }, uiPath: path } : null;
  // inject from a static page on the same origin, so the app's own save-on-unload can't overwrite it
  await send('Page.navigate', { url: base + '/__blank.txt' }); await sleep(400);
  await send('Runtime.evaluate', { expression: s ? `localStorage.setItem('nplm_save_v1', ${JSON.stringify(JSON.stringify(s))}); 1` : 'localStorage.clear(); 1' });
  await send('Page.navigate', { url: base + path }); await sleep(2200);
  let clip;
  if (w > 500) { const r = await send('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight', returnByValue: true }); clip = { x: 0, y: 0, width: w, height: Math.min(4000, r.result.result.value), scale: 1 }; }
  const shot = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip, captureBeyondViewport: true } : {}) });
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(shot.result.data, 'base64'));
  console.log('shot', name, errors.length ? 'ERRORS: ' + errors.splice(0).join(' | ').slice(0, 400) : '');
}
ws.close(); proc.kill();
