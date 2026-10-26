// NPL Manager desktop shell (Electron). Serves the built React app from the app:// protocol,
// stores the save file in the user's config folder, and remembers the window size.
const { app, BrowserWindow, protocol, net, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const DIST = path.join(__dirname, '..', 'dist');
const userDir = () => app.getPath('userData');
const SAVE = () => path.join(userDir(), 'save.json');
const BACKUP = () => path.join(userDir(), 'save.backup.json');
const WINDOW = () => path.join(userDir(), 'window.json');

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

if (!app.requestSingleInstanceLock()) app.quit();

// Atomic write: write a temp file then rename, keeping the previous save as a backup.
function writeAtomic(file, text) {
  const tmp = `${file}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, text, 'utf8');
  if (fs.existsSync(file)) { try { fs.copyFileSync(file, BACKUP()); } catch { /* ignore */ } }
  fs.renameSync(tmp, file);
}
function readSave() {
  for (const f of [SAVE(), BACKUP()]) {
    try { const t = fs.readFileSync(f, 'utf8'); JSON.parse(t); return t; } catch { /* try the next one */ }
  }
  return null;
}

let lastText = null; let pending = null;
ipcMain.on('save:load', (e) => { e.returnValue = readSave(); });
ipcMain.on('save:writeSync', (e, text) => { try { writeAtomic(SAVE(), text); lastText = text; e.returnValue = true; } catch (err) { console.error(err); e.returnValue = false; } });
// Async writes are coalesced so a burst of saves only touches the disk once.
ipcMain.handle('save:write', (e, text) => {
  pending = text;
  setImmediate(() => { if (pending == null || pending === lastText) return; const t = pending; pending = null; try { writeAtomic(SAVE(), t); lastText = t; } catch (err) { console.error(err); } });
  return true;
});
ipcMain.handle('save:clear', () => { for (const f of [SAVE(), BACKUP()]) { try { fs.unlinkSync(f); } catch { /* ignore */ } } return true; });
ipcMain.handle('save:export', async (e, name, text) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const r = await dialog.showSaveDialog(win, { title: 'Export save file', defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'NPL Manager save', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, text, 'utf8');
  return `Saved to ${r.filePath}`;
});
ipcMain.handle('app:saveFolder', () => { shell.openPath(userDir()); return userDir(); });

function windowState() { try { return JSON.parse(fs.readFileSync(WINDOW(), 'utf8')); } catch { return { width: 1360, height: 900 }; } }

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' https:";

function createWindow() {
  const st = windowState();
  const win = new BrowserWindow({
    width: st.width || 1360, height: st.height || 900, x: st.x, y: st.y, minWidth: 360, minHeight: 560,
    title: 'NPL Manager', backgroundColor: '#0A0F16', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  if (st.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());
  const remember = () => { if (win.isDestroyed()) return; const b = win.getNormalBounds(); try { writeAtomic(WINDOW(), JSON.stringify({ ...b, maximized: win.isMaximized() })); } catch { /* ignore */ } };
  let t = null; const soon = () => { clearTimeout(t); t = setTimeout(remember, 600); };
  win.on('resize', soon); win.on('move', soon); win.on('maximize', remember); win.on('unmaximize', remember); win.on('close', remember);
  // keep the player inside the game; open real web links in the browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  win.loadURL('app://npl/');
  return win;
}

app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  // Serve dist/ over app://npl/... with an SPA fallback to index.html.
  protocol.handle('app', async (req) => {
    const { pathname } = new URL(req.url);
    let file = path.normalize(path.join(DIST, decodeURIComponent(pathname)));
    if (!file.startsWith(DIST)) return new Response('Forbidden', { status: 403 });
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
    const res = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(res.headers);
    if (file.endsWith('.html')) headers.set('Content-Security-Policy', CSP);
    return new Response(res.body, { status: res.status, headers });
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
