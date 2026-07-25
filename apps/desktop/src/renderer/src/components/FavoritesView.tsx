import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Account, Kind } from "@iptv/contracts";
import type { FavoriteItem } from "../favorites";
import { groupFavorites } from "../favorites";
import { Poster, MoviePreview, LivePreview, SeriesPreview } from "./Previews";

interface FavoritesViewProps {
  account: Account;
  favorites: FavoriteItem[];
  onPlay: (item: any) => void;
  onDownload: (item: any) => void;
  fav: any;
}

export default function FavoritesView({
  account,
  favorites,
  onPlay,
  onDownload,
  fav,
}: FavoritesViewProps) {
  const { t, i18n } = useTranslation();
  const groups = useMemo(() => groupFavorites(favorites), [favorites, i18n.language]);
  const [groupKind, setGroupKind] = useState<Kind | null>(null);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  // Active group (default: the first available)
  const activeGroup = groups.find((g) => g.kind === groupKind) || groups[0];
  const items = useMemo(
    () =>
      [...(activeGroup?.items || [])].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base", numeric: true }),
      ),
    [activeGroup],
  );
  const selected = items.find((i) => String(i.id) === String(selectedId)) || items[0];
  const seedOf = (i: FavoriteItem) => (items.indexOf(i) + 1) * 3;
  // Grid for movies/series, list for live channels
  const useGrid = activeGroup ? activeGroup.kind !== "live" : false;

  const playItem = (m: FavoriteItem) => {
    if (m.kind === "live")
      onPlay({ type: "live", id: m.id, name: m.name, icon: m.icon, live: true });
    else if (m.kind === "vod") onPlay({ type: "movie", id: m.id, ext: m.ext, name: m.name });
  };

  if (favorites.length === 0) {
    return (
      <section className="flex-1 grid place-items-center text-xs text-muted-foreground text-center px-8">
        {t("favorites.empty")}
        <br />
        {t("favorites.hint")}
      </section>
    );
  }

  return (
    <>
      {/* Column 1: groups (Live / Movies / Series) */}
      <div className="w-56 shrink-0  border-e border-border flex flex-col">
        <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
          {t("nav.favorites")}
        </div>
        <div className="flex-1 scroll overflow-y-auto py-1">
          {groups.map((g) => {
            const active = g.kind === activeGroup?.kind;
            return (
              <button
                key={g.kind}
                onClick={() => {
                  setGroupKind(g.kind);
                  setSelectedId(null);
                }}
                className={`w-full text-start px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}
              >
                <span className="truncate">{g.label}</span>
                <span className="text-[10px] text-muted-foreground">{g.items.length}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Column 2: favorited items in the group */}
      <section className="flex-1 min-w-0 flex flex-col">
        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border truncate shrink-0">
          {activeGroup?.label}
          <span className="text-muted-foreground"> · {items.length}</span>
        </div>
        <div className="flex-1 scroll overflow-y-auto">
          {useGrid ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-4">
              {items.map((m) => (
                <div
                  key={`${m.kind}:${m.id}`}
                  className={`cursor-pointer rounded-lg p-1 ${String(m.id) === String(selected?.id) ? "bg-accent" : "hover:bg-accent"}`}
                  onClick={() => setSelectedId(m.id)}
                  onDoubleClick={() => playItem(m)}
                >
                  <Poster icon={m.icon} seed={seedOf(m)} className="aspect-[2/3] w-full" />
                  <div className="text-xs font-medium truncate mt-1 px-0.5">{m.name}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((m) => (
                <div
                  key={`${m.kind}:${m.id}`}
                  className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${String(m.id) === String(selected?.id) ? "bg-accent" : "hover:bg-accent"}`}
                  onClick={() => setSelectedId(m.id)}
                  onDoubleClick={() => playItem(m)}
                >
                  <Poster
                    icon={m.icon}
                    seed={seedOf(m)}
                    className={m.kind === "live" ? "h-8 w-8" : "h-9 w-6"}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.name}</div>
                  </div>
                  {m.kind === "live" && (
                    <span className="text-[10px] text-destructive flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                      {t("common.liveBadge")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Column 3: preview */}
      <aside className="w-80 shrink-0  border-s border-border scroll overflow-y-auto">
        {selected ? (
          selected.kind === "live" ? (
            <LivePreview item={selected} seed={seedOf(selected)} onPlay={onPlay} fav={fav} />
          ) : selected.kind === "series" ? (
            <SeriesPreview
              account={account}
              item={selected}
              seed={seedOf(selected)}
              onPlay={onPlay}
              onDownload={onDownload}
              fav={fav}
            />
          ) : (
            <MoviePreview
              item={selected}
              seed={seedOf(selected)}
              onPlay={onPlay}
              onDownload={onDownload}
              fav={fav}
            />
          )
        ) : (
          <div className="p-5 text-xs text-muted-foreground">{t("common.selectItem")}</div>
        )}
      </aside>
    </>
  );
}
