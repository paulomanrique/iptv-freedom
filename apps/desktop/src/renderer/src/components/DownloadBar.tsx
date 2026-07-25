import { useTranslation } from "react-i18next";
import type { DownloadItem } from "@iptv/contracts";
import { Progress } from "@iptv/ui";
import { formatSpeed, downloadLabel } from "../format";

interface DownloadBarProps {
  downloads: DownloadItem[];
  onOpen: () => void;
}

// Fixed bottom bar: shows the active download (or queue) and the limit notice.
export default function DownloadBar({ downloads, onOpen }: DownloadBarProps) {
  const { t } = useTranslation();
  const active = downloads.find((d) => d.status === "downloading");
  const queued = downloads.filter((d) => d.status === "queued").length;
  const current = active || downloads.find((d) => d.status === "queued");
  const pct = current?.total
    ? Math.min(100, Math.round((current.received / current.total) * 100))
    : 0;

  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-t border-border bg-sidebar px-3 text-xs text-muted-foreground">
      <svg
        className="h-3.5 w-3.5 shrink-0 text-primary"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
      </svg>
      {current ? (
        <>
          <button
            className="max-w-[40%] truncate transition-colors hover:text-foreground"
            onClick={onOpen}
          >
            <b className="text-foreground">{current.name}</b> ·{" "}
            {active ? `${pct}%` : downloadLabel(current.status)}
            {active && current.speed ? ` · ${formatSpeed(current.speed)}` : ""}
          </button>
          <Progress value={pct} className="h-1 w-40" />
          {queued > 0 && (
            <span>{t("downloadBar.queued", { count: active ? queued : queued - 1 })}</span>
          )}
        </>
      ) : (
        <button className="transition-colors hover:text-foreground" onClick={onOpen}>
          {t("downloadBar.none")}
        </button>
      )}
      <div className="flex-1" />
      <span className="shrink-0 text-warning">{t("downloadBar.connectionLimit")}</span>
    </div>
  );
}
