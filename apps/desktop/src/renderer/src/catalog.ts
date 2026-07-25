// In-memory catalog cache (categories and streams) per account.
// Avoids re-fetching on every navigation/keystroke in search.
import type { Account, Kind, XtreamCategory, XtreamStream } from "@iptv/contracts";
import { normalize, type CatalogItem } from "@iptv/core";

// Re-exported so existing import paths (`../catalog`) keep working.
export { normalize };
export type { CatalogItem };

const cache = new Map<string, Promise<unknown>>();

const keyOf = (account: Account, ...parts: Array<string | number>): string =>
  [account.id, ...parts].join("|");

function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    cache.set(
      key,
      fetcher().catch((e) => {
        cache.delete(key); // do not cache errors
        throw e;
      }),
    );
  }
  return cache.get(key) as Promise<T>;
}

export function getCategories(account: Account, kind: Kind): Promise<XtreamCategory[]> {
  return cached(keyOf(account, "cat", kind), () => window.api.xtream.categories(account, kind));
}

export function getStreams(
  account: Account,
  kind: Kind,
  categoryId?: string,
): Promise<XtreamStream[]> {
  return cached(keyOf(account, "str", kind, categoryId || "all"), () =>
    window.api.xtream.streams(account, kind, categoryId),
  );
}

export function getSeriesInfo(account: Account, seriesId: string | number): Promise<unknown> {
  return cached(keyOf(account, "series", seriesId), () =>
    window.api.xtream.seriesInfo(account, seriesId),
  );
}

export function clearAccount(accountId: string): void {
  for (const k of cache.keys()) if (k.startsWith(accountId + "|")) cache.delete(k);
}
