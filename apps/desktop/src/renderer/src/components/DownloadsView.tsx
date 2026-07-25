import { useTranslation } from "react-i18next";
import type { DownloadItem } from "@iptv/contracts";
import { Progress } from "@iptv/ui";
import { Poster } from "./Previews";
import { formatBytes, formatSpeed, downloadLabel } from "../format";

interface RowProps {
  d: DownloadItem;
  seed: number;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onOpen: (id: string) => void;
}

function Row({ d, seed, onPause, onResume, onCancel, onOpen }: RowProps) {
  const { t } = useTranslation();
  const pct = d.total ? Math.min(100, Math.round((d.received / d.total) * 100)) : 0;
  const done = d.status === "done";
  const active = d.status === "downloading";
  const err = d.status === "error";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Poster icon={d.icon} seed={seed} className="h-10 w-7" />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <span className="font-medium truncate">{d.name}</span>
          <span
            className={`text-[10px] shrink-0 ${done ? "text-success" : err ? "text-destructive" : "text-muted-foreground"}`}
          >
            {active && d.speed ? formatSpeed(d.speed) : downloadLabel(d.status)}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground mb-1">
          {d.total
            ? `${formatBytes(d.received)} / ${formatBytes(d.total)}`
            : formatBytes(d.received)}
          {err && d.error ? ` · ${d.error}` : ""}
        </div>
        <Progress value={done ? 100 : pct} className="h-1" />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {done && (
          <button
            title={t("downloads.openFolder")}
            onClick={() => onOpen(d.id)}
            className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent text-muted-foreground"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </button>
        )}
        {active && (
          <button
            title={t("downloads.pause")}
            onClick={() => onPause(d.id)}
            className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent text-muted-foreground"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          </button>
        )}
        {(d.status === "paused" || err) && (
          <button
            title={t("downloads.resume")}
            onClick={() => onResume(d.id)}
            className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent text-muted-foreground"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
        {!done && (
          <button
            title={t("downloads.cancel")}
            onClick={() => onCancel(d.id)}
            className="h-7 w-7 grid place-items-center rounded-md hover:bg-destructive/30 text-muted-foreground"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface DownloadsViewProps extends Omit<RowProps, "d" | "seed"> {
  downloads: DownloadItem[];
  onClearCompleted: () => void;
}

export default function DownloadsView({
  downloads,
  onPause,
  onResume,
  onCancel,
  onOpen,
  onClearCompleted,
}: DownloadsViewProps) {
  const { t } = useTranslation();
  const completedCount = downloads.filter((d) => d.status === "done").length;

  return (
    <section className="flex-1 min-w-0 flex flex-col">
      <div className="px-4 py-2 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-xs text-muted-foreground">
          {t("downloads.itemCount", { count: downloads.length })}
        </span>
        <button
          onClick={onClearCompleted}
          disabled={completedCount === 0}
          className="text-xs px-2.5 py-1 rounded-md bg-muted hover:bg-accent text-foreground disabled:opacity-40 disabled:hover:bg-accent flex items-center gap-1.5"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
          {t("downloads.clearCompleted")}
          {completedCount > 0 ? ` (${completedCount})` : ""}
        </button>
      </div>

      <div className="flex-1 scroll overflow-y-auto">
        {downloads.length === 0 ? (
          <div className="p-10 text-xs text-muted-foreground text-center">
            {t("downloads.empty")}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {downloads.map((d, i) => (
              <Row
                key={d.id}
                d={d}
                seed={i + 1}
                onPause={onPause}
                onResume={onResume}
                onCancel={onCancel}
                onOpen={onOpen}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
