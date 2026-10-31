import { net, session } from "electron";
import { Readable } from "stream";
import { proxyCredentials } from "./proxy";

/** GET transport for provider APIs, live streams and resumable downloads. */
export function providerFetch(
  url: string,
  options: { signal?: AbortSignal; headers?: Record<string, string> } = {},
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const { signal } = options;
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const request = net.request({
      url,
      session: session.defaultSession,
      redirect: "follow",
      credentials: "include",
      headers: options.headers,
      cache: "no-store",
    });
    let response: Readable | null = null;
    let stopped = false;
    let authenticated = false;
    const cleanup = (): void => signal?.removeEventListener("abort", abort);
    const abort = (): void => {
      const reason = signal?.reason ?? new DOMException("Request aborted", "AbortError");
      stopped = true;
      reject(reason);
      response?.destroy(reason instanceof Error ? reason : new Error("Request aborted"));
      request.abort();
    };
    signal?.addEventListener("abort", abort, { once: true });
    // Electron 42's net.fetch does not expose this event, so it cannot answer
    // an authenticated proxy challenge. Handle it directly on ClientRequest.
    request.on("login", (authInfo, callback) => {
      const credentials = proxyCredentials(authInfo);
      if (!authenticated && credentials) {
        authenticated = true;
        callback(credentials.username, credentials.password);
      } else callback();
    });
    request.on("error", (error) => {
      stopped = true;
      cleanup();
      response?.destroy(error);
      reject(error);
    });
    request.on("response", (incoming) => {
      // Electron's IncomingMessage is a Node Readable at runtime, although its
      // public declarations expose only its EventEmitter surface.
      response = incoming as unknown as Readable;
      if (stopped) {
        response.destroy();
        return;
      }
      response.once("end", cleanup);
      response.once("error", (error) => {
        cleanup();
        reject(error);
      });
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
      }
      let body: ReadableStream<Uint8Array> | null = null;
      if (![204, 205, 304].includes(incoming.statusCode)) {
        const reader = (Readable.toWeb(response) as ReadableStream<Uint8Array>).getReader();
        body = new ReadableStream<Uint8Array>({
          async pull(controller) {
            try {
              const result = await reader.read();
              if (result.done) controller.close();
              else controller.enqueue(result.value);
            } catch (error) {
              controller.error(error);
            }
          },
          async cancel(reason) {
            stopped = true;
            cleanup();
            try {
              await reader.cancel(reason);
            } finally {
              request.abort();
            }
          },
        });
      } else {
        response.resume();
      }
      resolve(
        new Response(body, {
          status: incoming.statusCode,
          statusText: incoming.statusMessage,
          headers,
        }),
      );
    });
    request.end();
  });
}
