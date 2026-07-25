import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Account, Kind, XtreamCategory } from "@iptv/contracts";
import { getCategories, getStreams, normalize, type CatalogItem } from "../catalog";
import { smartTitleCase } from "../format";
import { Poster, MoviePreview, LivePreview, SeriesPreview } from "./Previews";

const MAX_RESULTS = 400;

interface LibraryViewProps {
  account: Account;
  kind: Kind;
  viewStyle: string;
  onPlay: (item: Record<string, any>) => void;
  onDownload: (item: Record<string, any>) => void;
  fav: any;
}

export default function LibraryView({
  account,
  kind,
  viewStyle,
  onPlay,
  onDownload,
  fav,
}: LibraryViewProps) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<XtreamCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catId, setCatId] = useState<string | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load categories when the account/kind changes
  useEffect(() => {
    let alive = true;
    setError(null);
    setCatLoading(true);
    getCategories(account, kind)
      .then((cats) => {
        if (!alive) return;
        // Names arrive with extra spaces and in UPPERCASE — normalize (trim + title case)
        const cleaned = (cats || []).map((c) => ({
          ...c,
          category_name: smartTitleCase(c.category_name),
        }));
        // Adult categories (starting with "18+") always go to the end of the list
        const isAdult = (name: string) => name.startsWith("18+");
        cleaned.sort((a, b) => {
          const ad = isAdult(a.category_name);
          const bd = isAdult(b.category_name);
          if (ad !== bd) return ad ? 1 : -1;
          return a.category_name.localeCompare(b.category_name, "pt-BR", {
            sensitivity: "base",
            numeric: true,
          });
        });
        setCategories(cleaned);
        setCatId(cleaned[0]?.category_id || null);
      })
      .catch((e) => alive && setError(String(e?.message || e)))
      .finally(() => alive && setCatLoading(false));
    return () => {
      alive = false;
    };
  }, [account.id, kind]);

  // Load streams for the selected category
  useEffect(() => {
    let alive = true;
    if (!catId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getStreams(account, kind, catId)
      .then((list) => {
        if (!alive) return;
        const norm = (list || []).map((x) => normalize(x, kind));
        norm.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", "pt-BR", {
            sensitivity: "base",
            numeric: true,
          }),
        );
        setItems(norm);
        setSelectedId(norm[0]?.id ?? null);
      })
      .catch((e) => alive && setError(String(e?.message || e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [account.id, kind, catId]);

  const visible = items.slice(0, MAX_RESULTS);
  const selected = visible.find((i) => i.id === selectedId) || visible[0];
  const seedOf = (i: CatalogItem) => (visible.indexOf(i) + 1) * 3;
  const useGrid = viewStyle === "grid";

  // Double-click: play a movie/channel directly (a series needs an episode choice)
  const playItem = (m: CatalogItem) => {
    if (m.kind === "live")
      onPlay({ type: "live", id: m.id, name: m.name, icon: m.icon, live: true });
    else if (m.kind === "vod") onPlay({ type: "movie", id: m.id, ext: m.ext, name: m.name });
  };
  const currentCat = categories.find((c) => c.category_id === catId);

  return (
    <>
      {/* Column 1: categories (Finder style, vertical scroll) */}
      <div className="w-56 shrink-0  border-e border-border flex flex-col">
        <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
          {t("library.categories")}
        </div>
        <div className="flex-1 scroll overflow-y-auto py-1">
          {catLoading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2">
              <span className="h-3 w-3 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
              {t("library.loading")}
            </div>
          )}
          {categories.map((c) => {
            const active = c.category_id === catId;
            return (
              <button
                key={c.category_id}
                onClick={() => setCatId(c.category_id)}
                className={`w-full text-start px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}
              >
                <span className="truncate">{c.category_name}</span>
                <svg
                  className="h-3 w-3 text-muted-foreground shrink-0 rtl:rotate-180"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      {/* Column 2: category content */}
      <section className="flex-1 min-w-0 flex flex-col">
        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border truncate shrink-0">
          {currentCat?.category_name || "—"}
          {!loading && (
            <span className="text-muted-foreground">
              {" "}
              · {visible.length}
              {visible.length === MAX_RESULTS ? "+" : ""}
            </span>
          )}
        </div>

        <div className="flex-1 scroll overflow-y-auto">
          {error && (
            <div className="m-4 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {t("library.error", { error })}
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-4">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
              {t("library.loading")}
            </div>
          )}
          {!loading && visible.length === 0 && !error && (
            <div className="p-6 text-xs text-muted-foreground text-center">
              {t("library.empty")}
            </div>
          )}

          {!loading &&
            visible.length > 0 &&
            (useGrid ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-4">
                {visible.map((m) => (
                  <div
                    key={m.id}
                    className={`cursor-pointer rounded-lg p-1 ${m.id === selected?.id ? "bg-accent" : "hover:bg-accent"}`}
                    onClick={() => setSelectedId(m.id)}
                    onDoubleClick={() => playItem(m)}
                  >
                    <Poster
                      icon={m.icon}
                      seed={seedOf(m)}
                      className={kind === "live" ? "aspect-video w-full" : "aspect-[2/3] w-full"}
                    />
                    <div className="text-xs font-medium truncate mt-1 px-0.5">{m.name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {visible.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${m.id === selected?.id ? "bg-accent" : "hover:bg-accent"}`}
                    onClick={() => setSelectedId(m.id)}
                    onDoubleClick={() => playItem(m)}
                  >
                    <Poster
                      icon={m.icon}
                      seed={seedOf(m)}
                      className={kind === "live" ? "h-8 w-8" : "h-9 w-6"}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{m.name}</div>
                    </div>
                    {kind === "live" && (
                      <span className="text-[10px] text-destructive flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        {t("common.liveBadge")}
                      </span>
                    )}
                    {kind === "vod" && m.ext && (
                      <span className="text-[10px] text-muted-foreground uppercase">{m.ext}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          {visible.length === MAX_RESULTS && (
            <div className="px-4 py-2 text-[10px] text-muted-foreground">
              {t("library.showingFirst", { max: MAX_RESULTS })}
            </div>
          )}
        </div>
      </section>

      {/* Column 3: preview */}
      <aside className="w-80 shrink-0  border-s border-border scroll overflow-y-auto">
        {selected ? (
          kind === "live" ? (
            <LivePreview item={selected} seed={seedOf(selected)} onPlay={onPlay} fav={fav} />
          ) : kind === "series" ? (
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
