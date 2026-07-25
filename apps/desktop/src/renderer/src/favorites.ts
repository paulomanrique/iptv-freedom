// Locally-saved favorites, per account (localStorage).
// Each favorite keeps what's needed to render and play/download without
// re-fetching: { kind, type, id, name, icon, ext }.
//   kind: 'live' | 'vod' | 'series'  (source group/section)
//   type: 'live' | 'movie' | 'series' (used to build the media URL)
import i18n from "./i18n";
import type { Kind, StreamType } from "@iptv/contracts";

export interface FavoriteItem {
  kind: Kind;
  type: StreamType;
  id: string | number;
  name: string;
  icon: string | null;
  ext: string | null;
}

export interface FavoriteGroup {
  kind: Kind;
  label: string;
  items: FavoriteItem[];
}

const keyFor = (accountId: string | null): string => `iptvfreedom.favorites.${accountId || "none"}`;
const sameItem = (
  a: { kind: Kind; id: string | number },
  b: { kind: Kind; id: string | number },
): boolean => a.kind === b.kind && String(a.id) === String(b.id);

export function loadFavorites(accountId: string | null): FavoriteItem[] {
  try {
    const data = JSON.parse(localStorage.getItem(keyFor(accountId)) || "null");
    return Array.isArray(data) ? (data as FavoriteItem[]) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(accountId: string | null, favs: FavoriteItem[]): void {
  localStorage.setItem(keyFor(accountId), JSON.stringify(favs));
}

export function isFavorite(favs: FavoriteItem[], kind: Kind, id: string | number): boolean {
  return favs.some((f) => sameItem(f, { kind, id }));
}

export function toggleFavorite(favs: FavoriteItem[], item: FavoriteItem): FavoriteItem[] {
  return isFavorite(favs, item.kind, item.id)
    ? favs.filter((f) => !sameItem(f, item))
    : [...favs, item];
}

// Maps a favorite "kind" to its matching navigation key.
export const KIND_NAV: Record<string, string> = { live: "live", vod: "movies", series: "series" };
const KIND_ORDER: Kind[] = ["live", "vod", "series"];

// Translated label for a favorite kind ('live' | 'vod' | 'series').
export const kindLabel = (kind: Kind): string => i18n.t(`nav.${KIND_NAV[kind] || kind}`);

// Groups favorites by general type, ordered Live > Movies > Series.
export function groupFavorites(favs: FavoriteItem[]): FavoriteGroup[] {
  return KIND_ORDER.map((kind) => ({
    kind,
    label: kindLabel(kind),
    items: favs.filter((f) => f.kind === kind),
  })).filter((g) => g.items.length > 0);
}
