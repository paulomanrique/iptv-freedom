import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RecordingItem } from "@iptv/contracts";
import { usePlayerEngine, BUFFER_ORDER, type BufferPreset } from "../usePlayerEngine";
import { formatBytes, formatDuration } from "../format";

export type PlayerMode = "full" | "mini";

interface PlayerHostProps {
  item: Record<string, any> | null;
  /** "full" fills the content area (Now Playing tab); "mini" floats over other tabs. */
  mode: PlayerMode;
  recordings: RecordingItem[];
  notify?: (msg: string) => void;
  onClose: () => void;
  onExpand: () => void;
  onMinimize: () => void;
}

/**
 * The app's single video surface. It is mounted once and never moved in the
 * tree: switching between the Now Playing tab and the floating mini player only
 * changes CSS, so the `<video>` element (and the stream behind it) survives
 * navigation. Keep the JSX shape identical across modes for that reason.
 */
export default function PlayerHost({
  item,
  mode,
  recordings,
  notify,
  onClose,
  onExpand,
  onMinimize,
}: PlayerHostProps) {
  const { t } = useTranslation();
  const engine = usePlayerEngine(item);
  const { videoRef, status, error, stats, notice, isLive, sessionId, buffer, auto } = engine;

  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const full = mode === "full";
  const activeRecording = recordingId ? recordings.find((r) => r.id === recordingId) || null : null;
  const isRecording = activeRecording?.status === "recording";

  // Forget the recording binding when the played item changes.
  useEffect(() => setRecordingId(null), [item]);

  // Tick while recording so the elapsed time advances.
  useEffect(() => {
    if (!isRecording) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  // ESC returns to the previous tab instead of killing playback.
  useEffect(() => {
    if (!item || !full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onMinimize();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, full, onMinimize]);

  const toggleRecording = async (): Promise<void> => {
    if (isRecording && recordingId) {
      window.api.recordings.stop(recordingId);
      return;
    }
    if (!sessionId) return;
    try {
      const { id } = await window.api.recordings.start({
        sessionId,
        name: item?.name || t("player.onAir"),
        icon: item?.icon ?? null,
      });
      setRecordingId(id);
      notify?.(t("toast.recordingStarted", { name: item?.name || "" }));
    } catch {
      notify?.(t("recordings.startFailed"));
    }
  };

  if (!item) return null;

  const iconBtn =
    "grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

  return (
    <div
      className={
        full
          ? "flex min-w-0 flex-1 flex-col bg-background"
          : "fixed bottom-12 end-4 z-40 w-80 overflow-hidden rounded-lg bg-black shadow-2xl ring-1 ring-border"
      }
    >
      {/* Video surface — identical node in both modes. */}
      <div className={`group relative bg-black ${full ? "min-h-0 flex-1" : "aspect-video"}`}>
        <video
          ref={videoRef}
          controls={full}
          autoPlay
          className="h-full w-full bg-black object-contain"
        />

        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30">
            <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 px-6 text-center">
            <div>
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-red-500/15">
                <svg
                  className="h-5 w-5 text-red-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-white">{t("player.cantPlay")}</div>
              {full && (
                <>
                  <div className="mx-auto mt-2 max-w-md text-2xs text-white/50">{error}</div>
                  <div className="mt-3 text-[10px] text-white/35">{t("player.oneConnHint")}</div>
                </>
              )}
            </div>
          </div>
        )}

        {notice && full && (
          <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3.5 py-1.5 text-2xs text-white shadow-lg backdrop-blur">
            <svg
              className="h-3.5 w-3.5 text-amber-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
            </svg>
            {notice}
          </div>
        )}

        {/* Mini-player affordances (hidden in full mode). */}
        <div className={full ? "hidden" : "absolute inset-0"}>
          <button
            onClick={onExpand}
            title={t("player.expand")}
            className="absolute inset-0 h-full w-full cursor-pointer bg-black/0 transition-colors hover:bg-black/30"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="pointer-events-none truncate rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
              {item.name}
            </span>
            <span className="pointer-events-auto flex gap-1">
              <button
                onClick={onExpand}
                title={t("player.expand")}
                className="grid h-6 w-6 place-items-center rounded bg-black/70 text-white/90 hover:text-white"
              >
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 14v6h6M20 10V4h-6M20 4l-7 7M4 20l7-7" />
                </svg>
              </button>
              <button
                onClick={onClose}
                title={t("player.stop")}
                className="grid h-6 w-6 place-items-center rounded bg-black/70 text-white/90 hover:text-white"
              >
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </span>
          </div>
          {isRecording && (
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white">
              <span className="h-1 w-1 animate-pulse rounded-full bg-destructive" />
              REC
            </span>
          )}
        </div>
      </div>

      {/* Control bar under the video (full mode only). */}
      <div
        className={
          full
            ? "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-sidebar px-4 py-2.5"
            : "hidden"
        }
      >
        {isLive && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            {t("player.onAir")}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{item.name}</div>
        </div>

        {isLive && stats && (
          <span className="flex shrink-0 items-center gap-2 rounded-md bg-muted px-2.5 py-1 text-[11px] tabular-nums text-muted-foreground">
            <span title={t("player.speedTip")}>↓ {stats.mbps.toFixed(1)} Mbps</span>
            <span className="text-border">·</span>
            <span
              title={t("player.bufferTip")}
              className={
                stats.buffer < 1
                  ? "text-destructive"
                  : stats.buffer < 2.5
                    ? "text-warning"
                    : "text-success"
              }
            >
              {t("player.bufferLabel", { seconds: stats.buffer.toFixed(1) })}
            </span>
            {stats.dropped > 0 && (
              <>
                <span className="text-border">·</span>
                <span title={t("player.dropsTip")}>
                  {t("player.drops", { count: stats.dropped })}
                </span>
              </>
            )}
          </span>
        )}

        {isLive && (
          <div
            className="flex shrink-0 items-center gap-0.5 rounded-md border border-border p-0.5"
            title={t("player.cacheTip")}
          >
            <button
              onClick={engine.toggleAuto}
              className={`rounded-sm px-2 py-1 text-[11px] transition-colors ${
                auto
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("player.auto")}
            </button>
            {BUFFER_ORDER.map((key: BufferPreset) => {
              const manualActive = !auto && buffer === key;
              const autoAt = auto && buffer === key;
              return (
                <button
                  key={key}
                  onClick={() => engine.pickBuffer(key)}
                  className={`rounded-sm px-2 py-1 text-[11px] transition-colors ${
                    manualActive
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  } ${autoAt ? "ring-1 ring-primary/60" : ""}`}
                >
                  {t(`player.buffer.${key}`)}
                </button>
              );
            })}
          </div>
        )}

        {isLive && (
          <button
            onClick={toggleRecording}
            disabled={!isRecording && !sessionId}
            title={isRecording ? t("player.stopRecording") : t("player.record")}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40 ${
              isRecording
                ? "bg-destructive text-destructive-foreground"
                : "border border-border text-foreground hover:bg-accent"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${isRecording ? "animate-pulse bg-white" : "bg-destructive"}`}
            />
            {isRecording && activeRecording
              ? `${t("player.stopRecording")} · ${formatDuration(now - activeRecording.startedAt)} · ${formatBytes(activeRecording.received)}`
              : t("player.record")}
          </button>
        )}

        <button onClick={onMinimize} title={t("player.minimize")} className={iconBtn}>
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 14h6v6M20 10h-6V4" />
          </svg>
        </button>
        <button onClick={onClose} title={t("player.stop")} className={iconBtn}>
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
