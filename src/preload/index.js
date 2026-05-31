import { contextBridge, ipcRenderer } from 'electron'

// API mínima e segura exposta ao renderer.
// Handlers de Xtream / contas / downloads serão adicionados nas próximas fases.
const api = {
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  }
}

contextBridge.exposeInMainWorld('api', api)
