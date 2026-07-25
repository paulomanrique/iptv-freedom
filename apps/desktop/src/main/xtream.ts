// Xtream Codes client (runs in the main process to avoid CORS and keep
// credentials out of the renderer bundle).
import type {
  Account,
  AccountInfo,
  Kind,
  StreamType,
  XtreamCategory,
  XtreamStream,
} from "@iptv/contracts";

export function normalizeHost(host: string): string {
  let h = String(host || "")
    .trim()
    .replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(h)) h = "http://" + h;
  return h;
}

// Generic call to player_api.php
async function callApi<T = unknown>(
  account: Account,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const url = new URL(normalizeHost(account.host) + "/player_api.php");
  url.searchParams.set("username", account.username);
  url.searchParams.set("password", account.password);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function getAccountInfo(account: Account): Promise<AccountInfo> {
  return callApi<AccountInfo>(account); // { user_info, server_info }
}

// Categories and streams per kind: 'live' | 'vod' | 'series'
const CAT_ACTION: Record<Kind, string> = {
  live: "get_live_categories",
  vod: "get_vod_categories",
  series: "get_series_categories",
};
const STREAM_ACTION: Record<Kind, string> = {
  live: "get_live_streams",
  vod: "get_vod_streams",
  series: "get_series",
};

export function getCategories(account: Account, kind: Kind): Promise<XtreamCategory[]> {
  return callApi<XtreamCategory[]>(account, { action: CAT_ACTION[kind] });
}

export function getStreams(
  account: Account,
  kind: Kind,
  categoryId?: string,
): Promise<XtreamStream[]> {
  return callApi<XtreamStream[]>(account, { action: STREAM_ACTION[kind], category_id: categoryId });
}

export function getSeriesInfo(account: Account, seriesId: string | number): Promise<unknown> {
  return callApi(account, { action: "get_series_info", series_id: seriesId });
}

export function getVodInfo(account: Account, vodId: string | number): Promise<unknown> {
  return callApi(account, { action: "get_vod_info", vod_id: vodId });
}

// Builds the media URL. type: 'live' | 'movie' | 'series'
export function streamUrl(
  account: Account,
  type: StreamType,
  id: string | number,
  ext?: string,
): string {
  const host = normalizeHost(account.host);
  const u = account.username;
  const p = account.password;
  if (type === "live") return `${host}/live/${u}/${p}/${id}.ts`;
  return `${host}/${type}/${u}/${p}/${id}.${ext || "mp4"}`;
}
