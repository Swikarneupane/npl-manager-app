// Save storage with a native file backend on desktop (Electron) and Android (Capacitor),
// falling back to localStorage in a normal browser. Reads are served from an in-memory copy
// that is loaded once at startup, so the rest of the app can stay synchronous.
import { isCapacitor, isElectron } from './platform.js';

const KEY = 'nplm_save_v1';
const FILE = 'npl-manager-save.json';
let cache = null;
let fs = null; // Capacitor Filesystem plugin, loaded lazily
let writeChain = Promise.resolve();

async function capFs() {
  if (!fs) { const mod = await import('@capacitor/filesystem'); fs = mod; }
  return fs;
}

export async function initStorage() {
  let text = null;
  try {
    if (isElectron) text = window.nplNative.loadSync();
    else if (isCapacitor) {
      const { Filesystem, Directory, Encoding } = await capFs();
      try { const r = await Filesystem.readFile({ path: FILE, directory: Directory.Data, encoding: Encoding.UTF8 }); text = r.data; } catch { text = null; }
    }
  } catch (e) { console.warn('native load failed', e); }
  if (!text) { try { text = localStorage.getItem(KEY); } catch { text = null; } }
  cache = text;
}

export function readSave() { return cache; }

// urgent=true is used when the app is closing: write synchronously where the platform allows it.
export function writeSave(text, urgent = false) {
  cache = text;
  try { localStorage.setItem(KEY, text); } catch { /* quota or private mode: native copy still works */ }
  if (isElectron) { if (urgent) window.nplNative.saveSync(text); else window.nplNative.save(text); }
  else if (isCapacitor) {
    writeChain = writeChain.then(async () => {
      const { Filesystem, Directory, Encoding } = await capFs();
      await Filesystem.writeFile({ path: FILE, data: text, directory: Directory.Data, encoding: Encoding.UTF8 });
    }).catch((e) => console.warn('native save failed', e));
  }
  return true;
}

export function clearSave() {
  cache = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  if (isElectron) window.nplNative.clear();
  else if (isCapacitor) capFs().then(({ Filesystem, Directory }) => Filesystem.deleteFile({ path: FILE, directory: Directory.Data })).catch(() => {});
}
