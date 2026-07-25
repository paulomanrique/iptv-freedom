import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Account } from "@iptv/contracts";
import type { CatalogItem } from "@iptv/core";
import { Badge, Button } from "@iptv/ui";
import { getSeriesInfo } from "../catalog";
import { gradient } from "../data";
import { smartTitleCase } from "../format";

interface PosterProps {
  icon: string | null;
  seed: number;
  className?: string;
}
interface PreviewProps {
  item: CatalogItem | any;
  seed: number;
  onPlay: (item: any) => void;
  onDownload?: (item: any) => void;
  fav?: any;
}
interface SeriesPreviewProps extends PreviewProps {
  account: Account;
  onDownload: (item: any) => void;
}

export function Poster({ icon, seed, className }: PosterProps) {
  const [failed, setFailed] = useState(false);
  if (icon && !failed) {
    return (
      <div
        className={`rounded-md ring-1 ring-border shrink-0 overflow-hidden bg-black/30 ${className}`}
      >
        <img
          src={icon}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }
  return (
    <div
      className={`poster rounded-md ring-1 ring-border shrink-0 ${className}`}
      style={{ background: gradient(seed) }}
    />
  );
}

function FavButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      title={active ? t("previews.removeFav") : t("previews.addFav")}
      className={`h-9 w-9 grid place-items-center rounded-lg shrink-0 transition ${active ? "bg-warning/20 text-warning" : "bg-muted hover:bg-accent text-muted-foreground"}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 21l1.1-6.5L2.6 9.8l6.5-.9z" />
      </svg>
    </button>
  );
}

// ---------- Movie ----------
export function MoviePreview({ item, seed, onPlay, onDownload, fav }: PreviewProps) {
  const { t } = useTranslation();
  const snapshot = {
    kind: "vod",
    type: "movie",
    id: item.id,
    name: item.name,
    icon: item.icon,
    ext: item.ext,
  };
  return (
    <div className="p-4">
      <Poster icon={item.icon} seed={seed} className="aspect-[2/3] w-full mb-4" />
      <div className="flex items-start gap-2">
        <h2 className="text-base font-bold leading-tight flex-1">{item.name}</h2>
        {fav && (
          <FavButton active={fav.isFav("vod", item.id)} onClick={() => fav.toggle(snapshot)} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground mt-1.5">
        {item.rating && <span className="text-success">★ {item.rating}</span>}
        <Badge variant="outline" className="text-[10px] uppercase">
          {item.ext || "mp4"}
        </Badge>
      </div>
      {item.plot && (
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-6">
          {item.plot}
        </p>
      )}
      <div className="flex flex-col gap-2 mt-4">
        <Button
          onClick={() => onPlay({ type: "movie", id: item.id, ext: item.ext, name: item.name })}
          size="sm"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          {t("previews.watch")}
        </Button>
        <button
          onClick={() =>
            onDownload?.({
              type: "movie",
              id: item.id,
              ext: item.ext,
              name: item.name,
              icon: item.icon,
            })
          }
          className="bg-secondary hover:bg-accent font-semibold rounded-lg py-2 text-xs flex items-center justify-center gap-2"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
          </svg>
          {t("previews.downloadFile")}
        </button>
      </div>
    </div>
  );
}

// ---------- Live channel ----------
export function LivePreview({ item, seed, onPlay, fav }: PreviewProps) {
  const { t } = useTranslation();
  const snapshot = { kind: "live", type: "live", id: item.id, name: item.name, icon: item.icon };
  return (
    <div className="p-4">
      <Poster icon={item.icon} seed={seed} className="aspect-video w-full mb-4" />
      <div className="flex items-start gap-2">
        <h2 className="text-base font-bold leading-tight flex-1">{item.name}</h2>
        {fav && (
          <FavButton active={fav.isFav("live", item.id)} onClick={() => fav.toggle(snapshot)} />
        )}
      </div>
      <div className="text-[10px] text-destructive flex items-center gap-1 mt-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        {t("player.onAir")}
      </div>
      <Button
        onClick={() =>
          onPlay({ type: "live", id: item.id, name: item.name, icon: item.icon, live: true })
        }
        size="sm"
        className="mt-4 w-full"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
        {t("previews.watch")}
      </Button>
      <div className="mt-4 p-3 rounded-lg bg-warning/10 text-warning text-[10px]">
        {t("previews.liveNoDownload")}
      </div>
    </div>
  );
}

// ---------- Series (seasons + episodes) ----------
export function SeriesPreview({
  account,
  item,
  seed,
  onPlay,
  onDownload,
  fav,
}: SeriesPreviewProps) {
  const { t } = useTranslation();
  const [info, setInfo] = useState<any>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const snapshot = {
    kind: "series",
    type: "series",
    id: item.id,
    name: item.name,
    icon: item.icon,
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setInfo(null);
    getSeriesInfo(account, item.id)
      .then((res: any) => {
        if (!alive) return;
        setInfo(res);
        const seasons = Object.keys(res.episodes || {});
        setSeason(seasons[0] || null);
      })
      .catch(() => alive && setInfo({ episodes: {} }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [account.id, item.id]);

  const episodes = (info?.episodes || {}) as Record<string, any[]>;
  const seasons = info ? Object.keys(episodes) : [];
  const eps = season ? episodes[season] || [] : [];

  // All episodes (across all seasons), for "Download all"
  const allEpisodes = useMemo(() => {
    return Object.entries(episodes).flatMap(([s, list]) =>
      (list || []).map((ep: any) => ({ ep, season: s })),
    );
  }, [info]);

  const downloadEpisodes = (list: any[], s: string | null) => {
    (list || []).forEach((ep: any) =>
      onDownload?.({
        type: "series",
        id: ep.id,
        ext: ep.container_extension,
        name: `${item.name} T${s}E${ep.episode_num}`,
        icon: item.icon,
      }),
    );
  };
  const downloadAll = () => allEpisodes.forEach(({ ep, season: s }) => downloadEpisodes([ep], s));

  return (
    <div className="p-4">
      <Poster icon={item.icon} seed={seed} className="aspect-[2/3] w-full mb-4" />
      <div className="flex items-start gap-2">
        <h2 className="text-base font-bold leading-tight flex-1">{item.name}</h2>
        {fav && (
          <FavButton active={fav.isFav("series", item.id)} onClick={() => fav.toggle(snapshot)} />
        )}
      </div>
      {item.plot && (
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-4">
          {item.plot}
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
          {t("previews.loadingEpisodes")}
        </div>
      )}

      {seasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5 my-3">
          {seasons.map((s) => (
            <button
              key={s}
              onClick={() => setSeason(s)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium ${s === season ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}
            >
              T{s}
            </button>
          ))}
        </div>
      )}

      {allEpisodes.length > 0 && (
        <div className="flex gap-2 mb-3">
          {eps.length > 0 && (
            <button
              onClick={() => downloadEpisodes(eps, season)}
              className="flex-1 bg-secondary hover:bg-accent font-semibold rounded-lg py-2 text-xs flex items-center justify-center gap-2"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
              </svg>
              {t("previews.downloadSeason", { count: eps.length })}
            </button>
          )}
          <button
            onClick={downloadAll}
            className="flex-1 bg-secondary hover:bg-accent font-semibold rounded-lg py-2 text-xs flex items-center justify-center gap-2"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
            </svg>
            {t("previews.downloadAll", { count: allEpisodes.length })}
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {eps.map((ep: any) => (
          <div
            key={ep.id}
            className="flex items-center gap-2 rounded-md hover:bg-accent px-2 py-1.5"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">
                {ep.episode_num}.{" "}
                {ep.title
                  ? smartTitleCase(ep.title)
                  : t("previews.episode", { number: ep.episode_num })}
              </div>
            </div>
            <button
              title={t("previews.watch")}
              onClick={() =>
                onPlay({
                  type: "series",
                  id: ep.id,
                  ext: ep.container_extension,
                  name: `${item.name} · T${season}E${ep.episode_num}`,
                })
              }
              className="h-7 w-7 grid place-items-center rounded-md bg-muted hover:bg-accent"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <button
              title={t("previews.download")}
              onClick={() =>
                onDownload?.({
                  type: "series",
                  id: ep.id,
                  ext: ep.container_extension,
                  name: `${item.name} T${season}E${ep.episode_num}`,
                  icon: item.icon,
                })
              }
              className="h-7 w-7 grid place-items-center rounded-md bg-muted hover:bg-accent"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
