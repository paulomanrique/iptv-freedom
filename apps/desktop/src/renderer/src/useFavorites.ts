import { useState, useEffect, useCallback } from "react";
import type { Kind } from "@iptv/contracts";
import {
  loadFavorites,
  saveFavorites,
  isFavorite,
  toggleFavorite,
  type FavoriteItem,
} from "./favorites";

// Keeps the active account's favorites in React state + localStorage.
export function useFavorites(accountId: string | null) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => loadFavorites(accountId));

  useEffect(() => {
    setFavorites(loadFavorites(accountId));
  }, [accountId]);

  const isFav = useCallback(
    (kind: Kind, id: string | number) => isFavorite(favorites, kind, id),
    [favorites],
  );

  const toggle = useCallback(
    (item: FavoriteItem) => {
      setFavorites((cur) => {
        const next = toggleFavorite(cur, item);
        saveFavorites(accountId, next);
        return next;
      });
    },
    [accountId],
  );

  return { favorites, isFav, toggle };
}
