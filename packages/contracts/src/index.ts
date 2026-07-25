// Shared TypeScript types for the window.api IPC surface (preload <-> main),
// plus the domain shapes exchanged between processes.

/** Media kinds as used by the Xtream category/stream endpoints. */
export type Kind = "live" | "vod" | "series";

/** Media type as used when building a stream URL. */
export type StreamType = "live" | "movie" | "series";

/** A persisted account (stored as plaintext JSON in userData). */
export interface Account {
  id: string;
  name: string;
  host: string;
  username: string;
  password: string;
}

/** Account fields provided by the add/edit form (before persistence). */
export interface AccountInput {
  name?: string;
  host: string;
  username: string;
  password: string;
}

export interface XtreamUserInfo {
  auth?: number;
  status?: string;
  exp_date?: string | null;
  is_trial?: string;
  active_cons?: string;
  max_connections?: string;
  [key: string]: unknown;
}

export interface XtreamServerInfo {
  [key: string]: unknown;
}

/** Response of player_api.php with no action (account info). */
export interface AccountInfo {
  user_info?: XtreamUserInfo;
  server_info?: XtreamServerInfo;
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id?: number;
  [key: string]: unknown;
}

/** Raw stream/series entry — shapes vary per provider, normalized in the renderer. */
export interface XtreamStream {
  [key: string]: unknown;
}

export type DownloadStatus = "queued" | "downloading" | "paused" | "done" | "error" | "canceled";

/** Public download entry sent to the renderer (no internal url/controller). */
export interface DownloadItem {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  filePath: string;
  received: number;
  total: number;
  status: DownloadStatus;
  speed: number;
  error: string | null;
}

export interface DownloadProgress {
  id: string;
  received: number;
  total: number;
  speed: number;
  status: DownloadStatus;
}

/** Item passed to downloads.add from the renderer. */
export interface DownloadAddItem {
  id: string | number;
  name: string;
  type: StreamType;
  ext?: string;
  icon?: string | null;
  account: Account;
}

export interface SavedAccountResult {
  account: Account | null;
  info: AccountInfo;
}

/** The API exposed on window.api by the preload bridge. */
export interface WindowApi {
  platform: NodeJS.Platform;
  accounts: {
    list: () => Promise<Account[]>;
    add: (account: AccountInput) => Promise<SavedAccountResult>;
    update: (id: string, account: AccountInput) => Promise<SavedAccountResult>;
    remove: (id: string) => Promise<boolean>;
  };
  xtream: {
    accountInfo: (account: Account) => Promise<AccountInfo>;
    categories: (account: Account, kind: Kind) => Promise<XtreamCategory[]>;
    streams: (account: Account, kind: Kind, categoryId?: string) => Promise<XtreamStream[]>;
    seriesInfo: (account: Account, seriesId: string | number) => Promise<unknown>;
    vodInfo: (account: Account, vodId: string | number) => Promise<unknown>;
    streamUrl: (
      account: Account,
      type: StreamType,
      id: string | number,
      ext?: string,
    ) => Promise<string>;
  };
  downloads: {
    list: () => Promise<DownloadItem[]>;
    add: (item: DownloadAddItem) => Promise<{ id: string }>;
    pause: (id: string) => Promise<DownloadItem[]>;
    resume: (id: string) => Promise<DownloadItem[]>;
    cancel: (id: string) => Promise<DownloadItem[]>;
    openFolder: (id: string) => Promise<void>;
    clearCompleted: () => Promise<DownloadItem[]>;
    onProgress: (cb: (progress: DownloadProgress) => void) => () => void;
    onChanged: (cb: (list: DownloadItem[]) => void) => () => void;
  };
}

declare global {
  interface Window {
    api: WindowApi;
  }
}
