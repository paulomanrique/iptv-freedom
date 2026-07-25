// Live-channel session proxy + recorder.
//
// The main process owns a single upstream connection per live channel and tees
// the MPEG-TS bytes to two kinds of sinks:
//   1. the player, via a loopback HTTP server (mpegts.js plays a normal TS URL);
//   2. an ffmpeg process that remuxes the stream to MP4 on disk (recording).
//
// Because playback and recording share the same upstream fetch, watching a
// channel and recording it at the same time uses only ONE provider connection.
// The upstream stays alive while any sink is attached, so a recording keeps
// running after the player modal is closed.
import { app, shell } from "electron";
import { join } from "path";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "http";
import { AddressInfo } from "net";
import { createReadStream, statSync } from "fs";
import { unlink, mkdir } from "fs/promises";
import { spawn, type ChildProcessByStdio } from "child_process";
import { Readable, type Writable } from "stream";
import { randomUUID, randomBytes } from "crypto";
import { streamUrl } from "./xtream";
import type { Account, RecordingItem, RecordingProgress } from "@iptv/contracts";

type Sender = (channel: string, payload: unknown) => void;
let send: Sender = () => {};
export function setSender(fn: Sender): void {
  send = fn;
}

// ---- ffmpeg binary resolution ----
// Dev: the host binary from @ffmpeg-installer. Packaged: the arch-specific
// binary the electron-builder afterPack hook copies into Resources.
function ffmpegPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  }
  // Lazy require so packaging without the dev dep never breaks.
  return require("@ffmpeg-installer/ffmpeg").path as string;
}

// ---- Sessions ----
interface Session {
  id: string;
  token: string; // path segment guarding the loopback route
  controller: AbortController;
  players: Set<ServerResponse>; // attached HTTP player clients
  recordingId: string | null; // active recording bound to this session, if any
  closed: boolean;
}

const sessions = new Map<string, Session>();
let server: Server | null = null;

function ensureServer(): Promise<Server> {
  if (server) return Promise.resolve(server);
  return new Promise((resolve, reject) => {
    const s = createServer((req, res) => {
      // Route: /rec/<token>.mp4 — plays a finished recording back from disk.
      const rec = /^\/rec\/([a-f0-9]+)\.mp4$/.exec(req.url || "");
      if (rec) {
        serveRecording(rec[1], req, res);
        return;
      }
      // Route: /live/<token>.ts
      const m = /^\/live\/([a-f0-9]+)\.ts$/.exec(req.url || "");
      const session = m ? findByToken(m[1]) : undefined;
      if (!session || session.closed) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": "video/mp2t",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
        // The renderer origin (vite dev server or file://) differs from this
        // loopback origin, so mpegts.js needs CORS to read the stream.
        "Access-Control-Allow-Origin": "*",
      });
      session.players.add(res);
      const detach = (): void => {
        session.players.delete(res);
        maybeCloseSession(session);
      };
      res.on("close", detach);
      res.on("error", detach);
    });
    s.on("error", reject);
    // Bind to loopback only, ephemeral port.
    s.listen(0, "127.0.0.1", () => {
      server = s;
      resolve(s);
    });
  });
}

function findByToken(token: string): Session | undefined {
  for (const s of sessions.values()) if (s.token === token) return s;
  return undefined;
}

// Streams a finished recording from disk, honouring Range so the <video>
// element can seek. Served over the same loopback server as live playback.
function serveRecording(token: string, req: IncomingMessage, res: ServerResponse): void {
  const entry = recordings.find((r) => r.playToken === token);
  if (!entry) {
    res.writeHead(404).end();
    return;
  }
  let size: number;
  try {
    size = statSync(entry.filePath).size;
  } catch {
    res.writeHead(404).end();
    return;
  }
  const common = {
    "Content-Type": "video/mp4",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (Number.isNaN(start) || start >= size || end < start) {
      res.writeHead(416, { ...common, "Content-Range": `bytes */${size}` }).end();
      return;
    }
    res.writeHead(206, {
      ...common,
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": end - start + 1,
    });
    createReadStream(entry.filePath, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...common, "Accept-Ranges": "bytes", "Content-Length": size });
  createReadStream(entry.filePath).pipe(res);
}

function serverPort(): number {
  return (server?.address() as AddressInfo | null)?.port ?? 0;
}

export async function openSession(
  account: Account,
  channelId: string | number,
): Promise<{ url: string; sessionId: string }> {
  await ensureServer();
  const id = randomUUID();
  const token = randomBytes(8).toString("hex");
  const session: Session = {
    id,
    token,
    controller: new AbortController(),
    players: new Set(),
    recordingId: null,
    closed: false,
  };
  sessions.set(id, session);
  // Start pumping upstream bytes into the session's sinks. Runs detached; the
  // AbortController stops it when the last sink detaches.
  pumpUpstream(session, streamUrl(account, "live", channelId, "ts")).catch(() => {
    /* upstream errors are surfaced per-recording below and by the dead player socket */
  });
  return { url: `http://127.0.0.1:${serverPort()}/live/${token}.ts`, sessionId: id };
}

// Reads the upstream .ts once and fans out each chunk to every attached sink.
async function pumpUpstream(session: Session, url: string): Promise<void> {
  const res = await fetch(url, { signal: session.controller.signal, redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const body = Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]);
  body.on("data", (chunk: Buffer) => {
    // Deleting the current entry while iterating a Set is safe in JS.
    for (const client of session.players) {
      try {
        client.write(chunk);
      } catch {
        session.players.delete(client);
      }
    }
    const rec = session.recordingId ? recordings.find((r) => r.id === session.recordingId) : null;
    if (rec) feedRecording(rec, chunk);
  });
  const finish = (err?: Error): void => {
    for (const client of session.players) client.end();
    session.players.clear();
    const rec = session.recordingId ? recordings.find((r) => r.id === session.recordingId) : null;
    if (rec && rec.status === "recording") {
      // Flush ffmpeg so it writes the MP4 trailer; the proc 'close' handler
      // finalizes the entry ("error" if we recorded an upstream failure).
      if (err) rec.error = String(err.message || err);
      try {
        rec.stdin?.end();
      } catch {
        /* the proc 'close' handler finalizes */
      }
    }
    maybeCloseSession(session);
  };
  body.on("end", () => finish());
  body.on("error", (err: Error) => {
    if (session.controller.signal.aborted) return; // intentional close
    finish(err);
  });
}

// Drops the session (and upstream) once nothing is attached to it.
function maybeCloseSession(session: Session): void {
  if (session.closed) return;
  if (session.players.size > 0) return;
  if (session.recordingId) return; // keep the upstream alive for the recording
  session.closed = true;
  session.controller.abort();
  sessions.delete(session.id);
}

export function closeSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  // Detach every player socket; a live recording keeps the upstream alive.
  for (const res of session.players) {
    try {
      res.end();
    } catch {
      /* noop */
    }
  }
  session.players.clear();
  maybeCloseSession(session);
}

// ---- Recordings ----
interface RecordingEntry extends RecordingItem {
  sessionId: string;
  playToken: string; // path segment guarding the local playback route
  proc: ChildProcessByStdio<Writable, null, Readable> | null;
  stdin: Writable | null;
  stderrTail: string;
  lastT: number;
  lastR: number;
  // Retry support: providers ship either AAC (needs the adtstoasc bitstream
  // filter to go into MP4) or AC3/MP2 (which that filter rejects). We start
  // with the AAC filter and, if ffmpeg bails out immediately, respawn without
  // it and replay these buffered bytes. Dropped once we are past the window.
  preroll: Buffer[] | null;
  prerollBytes: number;
  retried: boolean;
}

// Enough to replay after a bitstream-filter mismatch (which fails in ~30ms).
const PREROLL_CAP = 4 * 1024 * 1024;

const recordings: RecordingEntry[] = [];

const destDir = (): string => join(app.getPath("downloads"), "IPTV Freedom", "Recordings");
const sanitize = (name: string): string =>
  String(name)
    .replace(/[<>:"/\\|?* -]/g, "_")
    .trim()
    .slice(0, 150) || "recording";

function stamp(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function publicList(): RecordingItem[] {
  return recordings.map(
    ({
      sessionId: _s,
      playToken: _pt,
      proc: _p,
      stdin: _i,
      stderrTail: _e,
      lastT: _lt,
      lastR: _lr,
      preroll: _pr,
      prerollBytes: _pb,
      retried: _rt,
      ...rest
    }) => rest,
  );
}

// Loopback URL the renderer can hand to a <video> element to replay a
// finished recording (Range-capable, so seeking works).
export function playUrl(id: string): string | null {
  const e = recordings.find((r) => r.id === id);
  if (!e || e.status === "recording" || !server) return null;
  return `http://127.0.0.1:${serverPort()}/rec/${e.playToken}.mp4`;
}
function emitChanged(): void {
  send("recording:changed", publicList());
}
function emitProgress(e: RecordingEntry): void {
  const progress: RecordingProgress = {
    id: e.id,
    received: e.received,
    speed: e.speed,
    duration: Date.now() - e.startedAt,
    status: e.status,
  };
  send("recording:progress", progress);
}

export function list(): RecordingItem[] {
  return publicList();
}

export async function startRecording(item: {
  sessionId: string;
  name: string;
  icon?: string | null;
}): Promise<{ id: string }> {
  const session = sessions.get(item.sessionId);
  if (!session || session.closed) throw new Error("session_closed");
  if (session.recordingId) return { id: session.recordingId }; // already recording

  await mkdir(destDir(), { recursive: true });
  const filePath = join(destDir(), `${sanitize(item.name)} ${stamp()}.mp4`);

  const entry: RecordingEntry = {
    id: randomUUID(),
    name: item.name,
    icon: item.icon || null,
    filePath,
    received: 0,
    startedAt: Date.now(),
    status: "recording",
    error: null,
    sessionId: session.id,
    playToken: randomBytes(8).toString("hex"),
    proc: null,
    stdin: null,
    stderrTail: "",
    lastT: Date.now(),
    lastR: 0,
    speed: 0,
    preroll: [],
    prerollBytes: 0,
    retried: false,
  };

  const ok = spawnRemuxer(entry, true);
  recordings.push(entry);
  if (ok) session.recordingId = entry.id;
  emitChanged();
  return { id: entry.id };
}

// Spawns the ffmpeg remuxer for a recording. `aacBsf` applies the AAC->MP4
// bitstream filter; it is required for AAC (the common case) and rejected by
// AC3/MP2, so a mismatch is retried once with it off. Returns false if the
// process could not be spawned at all.
function spawnRemuxer(entry: RecordingEntry, aacBsf: boolean): boolean {
  // Remux the incoming TS to a crash-safe fragmented MP4 (no re-encode).
  // delay_moov lets formats like AC3 write their header once packets arrive.
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    "pipe:0",
    "-c",
    "copy",
    ...(aacBsf ? ["-bsf:a", "aac_adtstoasc"] : []),
    "-movflags",
    "frag_keyframe+empty_moov+default_base_moof+delay_moov",
    "-f",
    "mp4",
    entry.filePath,
  ];
  let proc: ChildProcessByStdio<Writable, null, Readable>;
  try {
    proc = spawn(ffmpegPath(), args, { stdio: ["pipe", "ignore", "pipe"] });
  } catch (err) {
    entry.status = "error";
    entry.error = String((err as Error)?.message || err);
    entry.preroll = null;
    return false;
  }
  entry.proc = proc;
  entry.stdin = proc.stdin;
  entry.stderrTail = "";
  proc.stderr.on("data", (d: Buffer) => {
    entry.stderrTail = (entry.stderrTail + d.toString()).slice(-2000);
  });
  proc.stdin.on("error", () => {
    /* ffmpeg gone; handled by the exit listener */
  });
  proc.on("error", (err) => {
    if (entry.status !== "recording") return;
    entry.error = String(err.message || err);
    finalizeRecording(entry, "error");
  });
  proc.on("close", (code) => {
    if (entry.status !== "recording") return; // already finalized by stop/upstream
    if (entry.error) {
      finalizeRecording(entry, "error"); // upstream failure recorded before flush
      return;
    }
    if (code && code !== 0) {
      // A codec/bitstream mismatch aborts within milliseconds — retry once
      // without the AAC filter and replay what we buffered so far.
      if (aacBsf && !entry.retried && entry.preroll) {
        entry.retried = true;
        const buffered = entry.preroll;
        if (spawnRemuxer(entry, false)) {
          for (const chunk of buffered) entry.stdin?.write(chunk);
          return;
        }
      }
      entry.error = entry.stderrTail.trim() || `ffmpeg exited ${code}`;
      finalizeRecording(entry, "error");
      return;
    }
    finalizeRecording(entry, "stopped");
  });
  return true;
}

// Writes an upstream chunk into the recording's ffmpeg stdin + tracks speed.
function feedRecording(entry: RecordingEntry, chunk: Buffer): void {
  if (entry.status !== "recording" || !entry.stdin) return;
  entry.stdin.write(chunk);
  // Hold the opening bytes until we know ffmpeg accepted the stream, so a
  // bitstream-filter retry can replay them; then release the memory.
  if (entry.preroll) {
    if (entry.prerollBytes < PREROLL_CAP) {
      entry.preroll.push(chunk);
      entry.prerollBytes += chunk.length;
    } else {
      entry.preroll = null;
    }
  }
  entry.received += chunk.length;
  const now = Date.now();
  if (now - entry.lastT >= 500) {
    entry.speed = Math.round((entry.received - entry.lastR) / ((now - entry.lastT) / 1000));
    entry.lastT = now;
    entry.lastR = entry.received;
    emitProgress(entry);
  }
}

function finalizeRecording(entry: RecordingEntry, status: "stopped" | "error"): void {
  entry.status = status;
  entry.speed = 0;
  entry.stdin = null;
  entry.preroll = null;
  const session = sessions.get(entry.sessionId);
  if (session && session.recordingId === entry.id) {
    session.recordingId = null;
    maybeCloseSession(session); // drop the upstream if the player is gone too
  }
  emitProgress(entry);
  emitChanged();
}

function find(id: string): RecordingEntry | undefined {
  return recordings.find((r) => r.id === id);
}

export function stopRecording(id: string): RecordingItem[] {
  const e = find(id);
  if (e && e.status === "recording") {
    // Flush ffmpeg: ending stdin lets it write the final moof/mfra atoms.
    try {
      e.stdin?.end();
    } catch {
      /* the 'close' listener finalizes the entry */
    }
  }
  return publicList();
}

export function openFolder(id: string): void {
  const e = find(id);
  if (e) shell.showItemInFolder(e.filePath);
}

export async function remove(id: string): Promise<RecordingItem[]> {
  const e = find(id);
  if (!e) return publicList();
  if (e.status === "recording") {
    e.status = "stopped";
    try {
      e.proc?.kill("SIGKILL");
    } catch {
      /* noop */
    }
    const session = sessions.get(e.sessionId);
    if (session && session.recordingId === e.id) {
      session.recordingId = null;
      maybeCloseSession(session);
    }
  }
  const idx = recordings.indexOf(e);
  if (idx >= 0) recordings.splice(idx, 1);
  try {
    await unlink(e.filePath);
  } catch {
    /* the file may not exist */
  }
  emitChanged();
  return publicList();
}

export function clearStopped(): RecordingItem[] {
  for (let i = recordings.length - 1; i >= 0; i--) {
    if (recordings[i].status !== "recording") recordings.splice(i, 1);
  }
  emitChanged();
  return publicList();
}
