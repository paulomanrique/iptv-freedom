import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RecordingItem } from "@iptv/contracts";
import { Poster } from "./Previews";
import {
  formatBytes,
  formatSpeed,
  formatDuration,
  formatDateTime,
  recordingLabel,
} from "../format";

interface RowProps {
  r: RecordingItem;
  seed: number;
  now: number;
  onStop: (id: string) => void;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onPlay: (r: RecordingItem) => void;
}

function Row({ r, seed, now, onStop, onOpen, onRemove, onPlay }: RowProps) {
  const { t } = useTranslation();
  const active = r.status === "recording";
  const err = r.status === "error";
  const playable = r.status === "stopped";
  const elapsed = active ? now - r.startedAt : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {/* Thumbnail doubles as the play button once the recording is finished. */}
      <button
        onClick={() => playable && onPlay(r)}
        disabled={!playable}
        title={playable ? t("recordings.play") : undefined}
        className="relative group shrink-0 disabled:cursor-default"
      >
        <Poster icon={r.icon} seed={seed} className="h-12 w-[68px]" />
        {playable && (
          <span className="absolute inset-0 grid place-items-center rounded-md bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
            <svg className="h-5 w-5 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        )}
        {active && (
          <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
            <span className="h-1 w-1 rounded-full bg-destructive animate-pulse" />
            REC
          </span>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <span className="font-medium truncate">{r.name}</span>
          <span
            className={`text-[10px] shrink-0 ${active || err ? "text-destructive" : "text-muted-foreground"}`}
          >
            {active && r.speed ? formatSpeed(r.speed) : recordingLabel(r.status)}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {formatDateTime(r.startedAt)}
          {" · "}
          {active ? `${formatDuration(elapsed)} · ` : ""}
          {formatBytes(r.received)}
          {err && r.error ? ` · ${r.error}` : ""}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {playable && (
          <button
            title={t("recordings.play")}
            onClick={() => onPlay(r)}
            className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent text-muted-foreground"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
        {active && (
          <button
            title={t("recordings.stop")}
            onClick={() => onStop(r.id)}
            className="h-7 w-7 grid place-items-center rounded-md hover:bg-accent text-destructive"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="5" width="14" height="14" rx="2" />
            </svg>
          </button>
        )}
        {!active && (
          <button
            title={t("recordings.openFolder")}
            onClick={() => onOpen(r.id)}
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
        <button
          title={t("recordings.remove")}
          onClick={() => onRemove(r.id)}
          className="h-7 w-7 grid place-items-center rounded-md hover:bg-destructive/30 text-muted-foreground"
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
        </button>
      </div>
    </div>
  );
}

interface RecordingsViewProps {
  recordings: RecordingItem[];
  onStop: (id: string) => void;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onClearStopped: () => void;
  onPlay: (r: RecordingItem) => void;
}

export default function RecordingsView({
  recordings,
  onStop,
  onOpen,
  onRemove,
  onClearStopped,
  onPlay,
}: RecordingsViewProps) {
  const { t } = useTranslation();
  const stoppedCount = recordings.filter((r) => r.status !== "recording").length;
  const hasActive = recordings.some((r) => r.status === "recording");

  // Tick every second so the elapsed time of active recordings advances.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasActive]);

  return (
    <section className="flex-1 min-w-0 flex flex-col">
      <div className="px-4 py-2 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-xs text-muted-foreground">
          {t("recordings.itemCount", { count: recordings.length })}
        </span>
        <button
          onClick={onClearStopped}
          disabled={stoppedCount === 0}
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
          {t("recordings.clearStopped")}
          {stoppedCount > 0 ? ` (${stoppedCount})` : ""}
        </button>
      </div>

      <div className="flex-1 scroll overflow-y-auto">
        {recordings.length === 0 ? (
          <div className="p-10 text-xs text-muted-foreground text-center">
            {t("recordings.empty")}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recordings.map((r, i) => (
              <Row
                key={r.id}
                r={r}
                seed={i + 1}
                now={now}
                onStop={onStop}
                onOpen={onOpen}
                onRemove={onRemove}
                onPlay={onPlay}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
