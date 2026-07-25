import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Account, StreamType } from "@iptv/contracts";
import mpegts from "mpegts.js";

// Pre-cache (buffer) presets for live playback via mpegts.js.
// stashInitialSize = initial buffer; latencyChasing trims the buffer to lower latency.
// Each preset label comes from i18n (player.buffer.<key>).
const BUFFER_PRESETS = {
  low: {
    enableStashBuffer: true,
    stashInitialSize: 384 * 1024,
    liveBufferLatencyChasing: true,
    liveBufferLatencyMaxLatency: 4.0,
    liveBufferLatencyMinRemain: 1.0,
  },
  balanced: {
    enableStashBuffer: true,
    stashInitialSize: 1024 * 1024,
    liveBufferLatencyChasing: false,
  },
  high: {
    enableStashBuffer: true,
    stashInitialSize: 4 * 1024 * 1024,
    liveBufferLatencyChasing: false,
  },
} as const;

export type BufferPreset = keyof typeof BUFFER_PRESETS;
export const BUFFER_ORDER: BufferPreset[] = ["low", "balanced", "high"];

const BUFFER_KEY = "iptvfreedom.bufferPreset";
const AUTO_KEY = "iptvfreedom.bufferAuto";
const AUTO_WINDOW_MS = 20000; // stall observation window
const AUTO_MAX_STALLS = 2; // stalls within the window before moving up a level

/** Anything the player can be pointed at: live channel, VOD, or a local file. */
export interface PlayerItem {
  account: Account;
  type: StreamType;
  id: string | number;
  ext?: string;
  name?: string;
  icon?: string | null;
  live?: boolean;
  /** Ready-made URL (local recording playback); skips Xtream URL resolution. */
  url?: string;
}

export interface PlayerStats {
  mbps: number;
  buffer: number;
  dropped: number;
}

/**
 * Owns playback for one item: resolves the source (live goes through the
 * main-process session proxy so playback and recording share one upstream
 * connection), drives mpegts.js/`<video>`, and tracks live statistics.
 *
 * The returned `videoRef` must be attached to a `<video>` that stays mounted —
 * unmounting it tears the stream down.
 */
export function usePlayerEngine(item: PlayerItem | Record<string, any> | null) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const statsRef = useRef<Record<string, any>>({}); // latest STATISTICS_INFO (speed in KB/s, etc.)
  const rebufferTimes = useRef<number[]>([]);
  const loadStamp = useRef(0);
  const sessionIdRef = useRef<string | null>(null);

  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [status, setStatus] = useState("loading"); // loading | playing | error
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [auto, setAuto] = useState(() => localStorage.getItem(AUTO_KEY) !== "false");
  const [buffer, setBuffer] = useState<BufferPreset>(() => {
    const saved = localStorage.getItem(BUFFER_KEY);
    return localStorage.getItem(AUTO_KEY) !== "false"
      ? "low"
      : saved === "low" || saved === "high"
        ? saved
        : "balanced";
  });

  const isLive = Boolean(item?.live || item?.type === "live" || item?.ext === "ts");

  // Manual buffer selection (turns off automatic mode)
  const pickBuffer = (key: BufferPreset): void => {
    setAuto(false);
    localStorage.setItem(AUTO_KEY, "false");
    localStorage.setItem(BUFFER_KEY, key);
    setBuffer(key);
  };

  // Toggles automatic mode (starts at low latency and rises if it stalls)
  const toggleAuto = (): void => {
    const next = !auto;
    setAuto(next);
    localStorage.setItem(AUTO_KEY, String(next));
    if (next) {
      rebufferTimes.current = [];
      setBuffer("low");
    }
  };

  // Acquire the stream URL. Live goes through the main-process session proxy
  // (one upstream connection, shared with any recording); VOD uses the direct
  // URL. Depends on `item` only — buffer changes must NOT reopen the session.
  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setPlayUrl(null);
    setStatus("loading");
    setError(null);

    async function acquire() {
      try {
        if (item!.url) {
          // Already-resolved source (e.g. replaying a local recording).
          if (!cancelled) setPlayUrl(item!.url);
        } else if (isLive) {
          const s = await window.api.live.open(item!.account, item!.id);
          if (cancelled) {
            window.api.live.close(s.sessionId);
            return;
          }
          sessionIdRef.current = s.sessionId;
          setSessionId(s.sessionId);
          setPlayUrl(s.url);
        } else {
          const url = await window.api.xtream.streamUrl(
            item!.account,
            item!.type,
            item!.id,
            item!.ext,
          );
          if (!cancelled) setPlayUrl(url);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(String(e instanceof Error ? e.message : e));
          setStatus("error");
        }
      }
    }
    acquire();

    return () => {
      cancelled = true;
      const sid = sessionIdRef.current;
      sessionIdRef.current = null;
      setSessionId(null);
      // Closing detaches this player; an in-progress recording keeps the
      // upstream alive in the main process and continues in the background.
      if (sid) window.api.live.close(sid);
    };
  }, [item]);

  // Build the player from the resolved URL. Rebuilds on buffer change WITHOUT
  // touching the live session, so changing the buffer never opens a 2nd
  // connection (important while recording).
  useEffect(() => {
    if (!item || !playUrl) return;
    let mpegtsPlayer: ReturnType<typeof mpegts.createPlayer> | null = null;
    let cancelled = false;
    rebufferTimes.current = [];
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isLive && mpegts.isSupported()) {
        const cfg = BUFFER_PRESETS[buffer] || BUFFER_PRESETS.balanced;
        mpegtsPlayer = mpegts.createPlayer(
          { type: "mpegts", isLive: true, url: playUrl },
          { lazyLoad: false, ...cfg },
        );
        mpegtsPlayer.attachMediaElement(video);
        mpegtsPlayer.on(mpegts.Events.ERROR, (type, detail) => {
          if (!cancelled) {
            setError(`${type}: ${detail}`);
            setStatus("error");
          }
        });
        mpegtsPlayer.on(mpegts.Events.STATISTICS_INFO, (info) => {
          statsRef.current = info;
        });
        mpegtsPlayer.load();
        video.play().catch(() => {});
      } else {
        video.src = playUrl;
        video.play().catch(() => {});
      }
      loadStamp.current = Date.now();
      if (!cancelled) setStatus("playing");
    } catch (e: unknown) {
      if (!cancelled) {
        setError(String(e instanceof Error ? e.message : e));
        setStatus("error");
      }
    }

    return () => {
      cancelled = true;
      if (mpegtsPlayer) {
        try {
          mpegtsPlayer.destroy();
        } catch {
          /* noop */
        }
      }
      const v = videoRef.current;
      if (v) {
        try {
          v.pause();
          v.removeAttribute("src");
          v.load();
        } catch {
          /* noop */
        }
      }
    };
  }, [item, playUrl, buffer]);

  // Live statistics (download speed + buffer ahead)
  useEffect(() => {
    if (!item || !isLive) {
      setStats(null);
      return;
    }
    statsRef.current = {};
    const id = setInterval(() => {
      const v = videoRef.current;
      let ahead = 0;
      if (v && v.buffered && v.buffered.length) {
        for (let i = 0; i < v.buffered.length; i++) {
          if (v.currentTime >= v.buffered.start(i) && v.currentTime <= v.buffered.end(i)) {
            ahead = v.buffered.end(i) - v.currentTime;
            break;
          }
        }
      }
      const info = statsRef.current || {};
      // info.speed comes in KB/s; convert to Mbps
      const mbps = info.speed ? (info.speed * 8) / 1000 : 0;
      setStats({ mbps, buffer: ahead, dropped: info.droppedFrames || 0 });
    }, 1000);
    return () => clearInterval(id);
  }, [item, isLive]);

  // Automatic mode: raises the buffer level when it stalls too often
  useEffect(() => {
    if (!item || !isLive || !auto) return;
    const v = videoRef.current;
    if (!v) return;
    const onWaiting = () => {
      if (Date.now() - loadStamp.current < 3000) return; // ignore the initial buffering
      const now = Date.now();
      rebufferTimes.current = rebufferTimes.current.filter((ts) => now - ts < AUTO_WINDOW_MS);
      rebufferTimes.current.push(now);
      if (rebufferTimes.current.length >= AUTO_MAX_STALLS) {
        const i = BUFFER_ORDER.indexOf(buffer);
        if (i < BUFFER_ORDER.length - 1) {
          const next = BUFFER_ORDER[i + 1];
          rebufferTimes.current = [];
          setBuffer(next); // restart the stream with more buffer
          setNotice(t("player.autoBuffering", { label: t(`player.buffer.${next}`) }));
        }
      }
    };
    v.addEventListener("waiting", onWaiting);
    return () => v.removeEventListener("waiting", onWaiting);
  }, [item, isLive, auto, buffer, t]);

  // Hide the notice automatically
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(id);
  }, [notice]);

  return {
    videoRef,
    status,
    error,
    stats,
    notice,
    isLive,
    sessionId,
    buffer,
    auto,
    pickBuffer,
    toggleAuto,
  };
}
