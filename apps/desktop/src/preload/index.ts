import { contextBridge, ipcRenderer } from "electron";
import type {
  Account,
  AccountInput,
  DownloadAddItem,
  DownloadItem,
  DownloadProgress,
  Kind,
  RecordingItem,
  RecordingProgress,
  RecordingStartItem,
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
  live: {
    open: (account: Account, channelId: string | number) =>
      ipcRenderer.invoke("live:open", account, channelId),
    close: (sessionId: string) => ipcRenderer.invoke("live:close", sessionId),
  },
  recordings: {
    list: () => ipcRenderer.invoke("recording:list"),
    start: (item: RecordingStartItem) => ipcRenderer.invoke("recording:start", item),
    stop: (id: string) => ipcRenderer.invoke("recording:stop", id),
    openFolder: (id: string) => ipcRenderer.invoke("recording:openFolder", id),
    remove: (id: string) => ipcRenderer.invoke("recording:remove", id),
    clearStopped: () => ipcRenderer.invoke("recording:clearStopped"),
    onProgress: (cb: (progress: RecordingProgress) => void) => {
      const fn = (_e: unknown, p: RecordingProgress) => cb(p);
      ipcRenderer.on("recording:progress", fn);
      return () => ipcRenderer.removeListener("recording:progress", fn);
    },
    onChanged: (cb: (list: RecordingItem[]) => void) => {
      const fn = (_e: unknown, list: RecordingItem[]) => cb(list);
      ipcRenderer.on("recording:changed", fn);
      return () => ipcRenderer.removeListener("recording:changed", fn);
    },
  },
};

contextBridge.exposeInMainWorld("api", api);
