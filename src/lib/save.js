import { Game } from '../game/game.js';
import { getPID } from '../game/engine.js';
import { readSave, writeSave, clearSave } from './storage.js';
import { isCapacitor, isElectron } from './platform.js';

export function loadLocal() {
  try { const raw = readSave(); return raw ? new Game(JSON.parse(raw)) : null; } catch { return null; }
}
export function saveLocal(G, urgent = false) {
  if (!G) return false;
  try { G.hook('beforeSave'); G.s.pid = getPID(); G.s.savedAt = Date.now(); return writeSave(JSON.stringify(G.s), urgent); } catch { return false; }
}
export function autosave(G) { if (G && G.s.settings.autosave) saveLocal(G); }
export function clearLocal() { clearSave(); }
export async function exportFile(G) {
  G.s.pid = getPID();
  const text = JSON.stringify(G.s); const name = `npl-manager-${G.user}-${G.year}.json`;
  if (isElectron) return window.nplNative.exportFile(name, text);
  if (isCapacitor) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({ path: name, data: text, directory: Directory.Documents, encoding: Encoding.UTF8 });
    return `Saved to Documents/${name}`;
  }
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  return null;
}
export function isSave(s) { return s && s.teams && s.players && typeof s.year === 'number'; }
