// Safe bridge between the game (renderer) and the desktop shell. No Node APIs are exposed.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nplNative', {
  platform: 'desktop',
  loadSync: () => ipcRenderer.sendSync('save:load'),
  saveSync: (text) => ipcRenderer.sendSync('save:writeSync', text),
  save: (text) => ipcRenderer.invoke('save:write', text),
  clear: () => ipcRenderer.invoke('save:clear'),
  exportFile: (name, text) => ipcRenderer.invoke('save:export', name, text),
  openSaveFolder: () => ipcRenderer.invoke('app:saveFolder'),
});
