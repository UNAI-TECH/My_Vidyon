// ============================================================
// File: electron/preload.js
// Purpose: Exposes secure native Electron APIs to the renderer
// ============================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showToast: (title, body) => {
    ipcRenderer.send('show-native-toast', { title, body });
  },
});
