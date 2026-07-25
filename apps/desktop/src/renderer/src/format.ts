// i18n-coupled formatting helpers. Pure formatters live in @iptv/core and are
// re-exported here so existing import paths keep working.
import i18n from "./i18n";
import type { XtreamUserInfo } from "@iptv/contracts";

export { formatBytes, formatSpeed, smartTitleCase, normalizeSearch } from "@iptv/core";

export function formatDate(unix?: string | number | null): string {
  if (!unix) return "—";
  const d = new Date(Number(unix) * 1000);
  if (isNaN(d.getTime())) return "—";
  try {
    return d.toLocaleDateString(i18n.language || "en");
  } catch {
    return d.toLocaleDateString("en");
  }
}

export function daysLeft(unix: string | number | null | undefined, now: number): number | null {
  if (!unix) return null;
  const ms = Number(unix) * 1000 - now;
  return Math.max(0, Math.round(ms / 86400000));
}

export function statusLabel(userInfo?: XtreamUserInfo): { label: string; ok: boolean } {
  if (!userInfo) return { label: i18n.t("status.account.unknown"), ok: false };
  const active = String(userInfo.status).toLowerCase() === "active";
  return {
    label: userInfo.status || i18n.t(active ? "status.account.active" : "status.account.inactive"),
    ok: active,
  };
}

const DL_STATUSES = new Set(["queued", "downloading", "paused", "done", "error", "canceled"]);
export const downloadLabel = (s: string): string =>
  DL_STATUSES.has(s) ? i18n.t(`status.download.${s}`) : s;

const REC_STATUSES = new Set(["recording", "stopped", "error"]);
export const recordingLabel = (s: string): string =>
  REC_STATUSES.has(s) ? i18n.t(`status.recording.${s}`) : s;

// Epoch ms -> localized date + time (e.g. "25/07/2026, 08:24").
export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "—";
  const opts: Intl.DateTimeFormatOptions = {
    dateStyle: "short",
    timeStyle: "short",
  };
  try {
    return d.toLocaleString(i18n.language || "en", opts);
  } catch {
    return d.toLocaleString("en", opts);
  }
}

// Elapsed time in ms -> H:MM:SS (or M:SS under an hour).
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number): string => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
