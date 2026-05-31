import { contextBridge, ipcRenderer } from 'electron'

// API mínima e segura exposta ao renderer.
const api = {
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    add: (account) => ipcRenderer.invoke('accounts:add', account),
    remove: (id) => ipcRenderer.invoke('accounts:remove', id)
  },
  xtream: {
    accountInfo: (account) => ipcRenderer.invoke('xtream:accountInfo', account),
    categories: (account, kind) => ipcRenderer.invoke('xtream:categories', account, kind),
    streams: (account, kind, categoryId) => ipcRenderer.invoke('xtream:streams', account, kind, categoryId),
    seriesInfo: (account, seriesId) => ipcRenderer.invoke('xtream:seriesInfo', account, seriesId),
    vodInfo: (account, vodId) => ipcRenderer.invoke('xtream:vodInfo', account, vodId),
    streamUrl: (account, type, id, ext) => ipcRenderer.invoke('xtream:streamUrl', account, type, id, ext)
  }
}

contextBridge.exposeInMainWorld('api', api)
