import { app, session } from "electron";
import { readFile, writeFile, rename } from "fs/promises";
import { join } from "path";
import type { ProxySettings } from "@iptv/contracts";

const DEFAULTS: ProxySettings = {
  mode: "direct",
  protocol: "http",
  host: "",
  port: 8080,
  username: "",
  password: "",
};

let current = { ...DEFAULTS };
let queue: Promise<unknown> = Promise.resolve();
const authAttempts = new Map<string, number>();
const filePath = (): string => join(app.getPath("userData"), "proxy.json");

export function validateProxy(input: ProxySettings): ProxySettings {
  if (
    !input ||
    !["direct", "system", "custom"].includes(input.mode) ||
    !["http", "https", "socks5"].includes(input.protocol) ||
    typeof input.host !== "string" ||
    typeof input.username !== "string" ||
    typeof input.password !== "string" ||
    !Number.isInteger(input.port) ||
    (input.mode === "custom" && (input.port < 1 || input.port > 65535))
  )
    throw new Error("proxy_invalid");
  const value: ProxySettings = {
    mode: input.mode,
    protocol: input.protocol,
    host: input.host.trim(),
    port: input.port >= 1 && input.port <= 65535 ? input.port : DEFAULTS.port,
    username: input.username,
    password: input.password,
  };
  if (value.mode === "custom") {
    // Only a host is accepted, never URL credentials, PAC rules or bypass lists.
    if (!/^(?:[a-zA-Z0-9._-]+|\[[a-fA-F0-9:]+\])$/.test(value.host)) {
      throw new Error("proxy_invalid");
    }
    try {
      new URL(`${value.protocol}://${value.host}:${value.port}`);
    } catch {
      throw new Error("proxy_invalid");
    }
    if (value.protocol === "socks5" && (value.username || value.password)) {
      throw new Error("proxy_socks_auth");
    }
  }
  return value;
}

export function getProxySettings(): ProxySettings {
  return { ...current };
}

async function apply(settings: ProxySettings): Promise<void> {
  const previous = current;
  current = settings;
  try {
    await session.defaultSession.setProxy(
      settings.mode === "custom"
        ? {
            mode: "fixed_servers",
            proxyRules: `${settings.protocol}://${settings.host}:${settings.port}`,
            // Preserve loopback playback, local recordings and the Vite dev server.
            proxyBypassRules: "localhost;127.0.0.1;[::1]",
          }
        : { mode: settings.mode },
    );
    authAttempts.clear();
    await session.defaultSession.clearAuthCache();
    await session.defaultSession.closeAllConnections();
  } catch {
    current = previous;
    throw new Error("proxy_apply_failed");
  }
}

export async function initializeProxy(): Promise<void> {
  let saved = { ...DEFAULTS };
  try {
    saved = validateProxy(JSON.parse(await readFile(filePath(), "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new Error("proxy_load_failed");
  }
  // Handle challenges for both native video and main-process net.fetch. Never
  // send proxy credentials to a provider's origin authentication challenge.
  app.on("login", (event, _contents, details, authInfo, callback) => {
    if (!authInfo.isProxy) return;
    event.preventDefault();
    // Electron 42 has no firstAuthAttempt flag. Limit repeated challenges for
    // the same URL so incorrect credentials cannot create an authentication loop.
    const now = Date.now();
    for (const [key, stamp] of authAttempts) if (now - stamp > 30000) authAttempts.delete(key);
    const key = `${details.pid}:${authInfo.host}:${authInfo.port}:${details.url}`;
    const attempted = authAttempts.has(key);
    const host = current.host.replace(/^\[|\]$/g, "").toLowerCase();
    if (
      current.mode === "custom" &&
      current.protocol !== "socks5" &&
      authInfo.host.replace(/^\[|\]$/g, "").toLowerCase() === host &&
      authInfo.port === current.port &&
      !attempted &&
      (current.username || current.password)
    ) {
      authAttempts.set(key, now);
      callback(current.username, current.password);
    } else {
      authAttempts.delete(key);
      callback();
    }
  });
  await apply(saved);
}

export function setProxySettings(input: ProxySettings): Promise<ProxySettings> {
  const next = validateProxy(input);
  const operation = queue.then(async () => {
    const previous = current;
    try {
      await apply(next);
      const file = filePath();
      // Same local-only storage model as accounts, with restricted file access.
      await writeFile(`${file}.tmp`, JSON.stringify(next, null, 2), { mode: 0o600 });
      await rename(`${file}.tmp`, file);
      return getProxySettings();
    } catch {
      await apply(previous);
      throw new Error("proxy_save_failed");
    }
  });
  queue = operation.catch(() => {});
  return operation;
}
