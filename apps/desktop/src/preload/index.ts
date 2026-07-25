import { contextBridge, ipcRenderer } from "electron";
import type {
  Account,
  AccountInput,
  DownloadAddItem,
  DownloadItem,
  DownloadProgress,
  Kind,
  StreamType,
  WindowApi,
} from "@iptv/contracts";

// Minimal, safe API exposed to the renderer.
const api: WindowApi = {
  platform: process.platform,
  accounts: {
    list: () => ipcRenderer.invoke("accounts:list"),
    add: (account: AccountInput) => ipcRenderer.invoke("accounts:add", account),
    update: (id: string, account: AccountInput) =>
      ipcRenderer.invoke("accounts:update", id, account),
    remove: (id: string) => ipcRenderer.invoke("accounts:remove", id),
  },
  xtream: {
    accountInfo: (account: Account) => ipcRenderer.invoke("xtream:accountInfo", account),
    categories: (account: Account, kind: Kind) =>
      ipcRenderer.invoke("xtream:categories", account, kind),
    streams: (account: Account, kind: Kind, categoryId?: string) =>
      ipcRenderer.invoke("xtream:streams", account, kind, categoryId),
    seriesInfo: (account: Account, seriesId: string | number) =>
      ipcRenderer.invoke("xtream:seriesInfo", account, seriesId),
    vodInfo: (account: Account, vodId: string | number) =>
      ipcRenderer.invoke("xtream:vodInfo", account, vodId),
    streamUrl: (account: Account, type: StreamType, id: string | number, ext?: string) =>
      ipcRenderer.invoke("xtream:streamUrl", account, type, id, ext),
  },
  downloads: {
    list: () => ipcRenderer.invoke("download:list"),
    add: (item: DownloadAddItem) => ipcRenderer.invoke("download:add", item),
    pause: (id: string) => ipcRenderer.invoke("download:pause", id),
    resume: (id: string) => ipcRenderer.invoke("download:resume", id),
    cancel: (id: string) => ipcRenderer.invoke("download:cancel", id),
    openFolder: (id: string) => ipcRenderer.invoke("download:openFolder", id),
    clearCompleted: () => ipcRenderer.invoke("download:clearCompleted"),
    onProgress: (cb: (progress: DownloadProgress) => void) => {
      const fn = (_e: unknown, p: DownloadProgress) => cb(p);
      ipcRenderer.on("download:progress", fn);
      return () => ipcRenderer.removeListener("download:progress", fn);
    },
    onChanged: (cb: (list: DownloadItem[]) => void) => {
      const fn = (_e: unknown, list: DownloadItem[]) => cb(list);
      ipcRenderer.on("download:changed", fn);
      return () => ipcRenderer.removeListener("download:changed", fn);
    },
  },
};

contextBridge.exposeInMainWorld("api", api);
