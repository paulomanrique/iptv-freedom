// VOD download manager.
// Respects the provider limit: one active download at a time (queue).
// Supports resume via the Range header and follows the 302 redirect with token.
import { app, shell } from "electron";
import { join } from "path";
import { createWriteStream } from "fs";
import { stat, mkdir, unlink } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { randomUUID } from "crypto";
import { streamUrl } from "./xtream";
import type { DownloadAddItem, DownloadItem, DownloadProgress } from "@iptv/contracts";

type Sender = (channel: string, payload: unknown) => void;
let send: Sender = () => {};
export function setSender(fn: Sender): void {
  send = fn;
}

// Internal entry: the public DownloadItem plus fields kept in the main process.
interface DownloadEntry extends DownloadItem {
  url: string;
  controller: AbortController | null;
}

const downloads: DownloadEntry[] = [];
let activeId: string | null = null;

const destDir = (): string => join(app.getPath("downloads"), "IPTV Freedom");
const sanitize = (name: string): string =>
  String(name)
    .replace(/[<>:"/\\|?* -]/g, "_")
    .trim()
    .slice(0, 150) || "video";

function publicList(): DownloadItem[] {
  return downloads.map(({ controller: _c, url: _u, ...rest }) => rest);
}
function emitChanged(): void {
  send("download:changed", publicList());
}
function emitProgress(e: DownloadEntry): void {
  const progress: DownloadProgress = {
    id: e.id,
    received: e.received,
    total: e.total,
    speed: e.speed,
    status: e.status,
  };
  send("download:progress", progress);
}

export function list(): DownloadItem[] {
  return publicList();
}

export function add(item: DownloadAddItem): { id: string } {
  const ext = item.ext || "mp4";
  const entry: DownloadEntry = {
    id: randomUUID(),
    name: item.name,
    type: item.type,
    icon: item.icon || null,
    url: streamUrl(item.account, item.type, item.id, ext),
    filePath: join(destDir(), `${sanitize(item.name)}.${ext}`),
    received: 0,
    total: 0,
    status: "queued",
    speed: 0,
    error: null,
    controller: null,
  };
  downloads.push(entry);
  emitChanged();
  pump();
  return { id: entry.id };
}

function find(id: string): DownloadEntry | undefined {
  return downloads.find((d) => d.id === id);
}

export function pause(id: string): DownloadItem[] {
  const e = find(id);
  if (e && e.status === "downloading") {
    e.status = "paused";
    e.controller?.abort();
  }
  return publicList();
}

export function resume(id: string): DownloadItem[] {
  const e = find(id);
  if (e && (e.status === "paused" || e.status === "error")) {
    e.status = "queued";
    e.error = null;
    emitChanged();
    pump();
  }
  return publicList();
}

export async function cancel(id: string): Promise<DownloadItem[]> {
  const e = find(id);
  if (!e) return publicList();
  e.status = "canceled";
  e.controller?.abort();
  const idx = downloads.indexOf(e);
  if (idx >= 0) downloads.splice(idx, 1);
  try {
    await unlink(e.filePath);
  } catch {
    /* the file may not exist */
  }
  if (activeId === id) activeId = null;
  emitChanged();
  pump();
  return publicList();
}

export function openFolder(id: string): void {
  const e = find(id);
  if (e) shell.showItemInFolder(e.filePath);
}

export function clearCompleted(): DownloadItem[] {
  for (let i = downloads.length - 1; i >= 0; i--) {
    if (downloads[i].status === "done") downloads.splice(i, 1);
  }
  emitChanged();
  return publicList();
}

function pump(): void {
  if (activeId !== null) return;
  const next = downloads.find((d) => d.status === "queued");
  if (next) start(next);
}

async function start(entry: DownloadEntry): Promise<void> {
  activeId = entry.id;
  entry.status = "downloading";
  entry.speed = 0;
  emitChanged();

  const controller = new AbortController();
  entry.controller = controller;

  try {
    await mkdir(destDir(), { recursive: true });

    // If a partial file already exists, resume from its current size.
    try {
      entry.received = (await stat(entry.filePath)).size;
    } catch {
      entry.received = 0;
    }

    const headers: Record<string, string> =
      entry.received > 0 ? { Range: `bytes=${entry.received}-` } : {};
    const res = await fetch(entry.url, { headers, signal: controller.signal, redirect: "follow" });
    if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);

    const append = res.status === 206;
    if (!append) entry.received = 0; // server ignored the Range -> restart

    const len = Number(res.headers.get("content-length")) || 0;
    if (res.status === 206) {
      const m = /\/(\d+)\s*$/.exec(res.headers.get("content-range") || "");
      entry.total = m ? Number(m[1]) : entry.received + len;
    } else {
      entry.total = len;
    }

    const file = createWriteStream(entry.filePath, { flags: append ? "a" : "w" });
    const body = Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]);

    let lastT = Date.now();
    let lastR = entry.received;
    body.on("data", (chunk: Buffer) => {
      entry.received += chunk.length;
      const now = Date.now();
      if (now - lastT >= 500) {
        entry.speed = Math.round((entry.received - lastR) / ((now - lastT) / 1000));
        lastT = now;
        lastR = entry.received;
        emitProgress(entry);
      }
    });

    await pipeline(body, file);

    entry.status = "done";
    entry.speed = 0;
    entry.total = entry.total || entry.received;
    emitProgress(entry);
  } catch (err) {
    // Pause/cancel abort the fetch — those are not real errors.
    // `status` may have been changed across the await by pause()/cancel().
    const status: string = entry.status;
    if (status === "paused" || status === "canceled") {
      // keep the state set by the user
    } else {
      entry.status = "error";
      entry.error = String((err as Error)?.message || err);
    }
  } finally {
    entry.controller = null;
    if (activeId === entry.id) activeId = null;
    emitChanged();
    pump(); // start the next item in the queue
  }
}
