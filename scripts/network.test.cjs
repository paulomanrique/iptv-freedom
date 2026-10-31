const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const { PassThrough } = require("node:stream");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = path.resolve(__dirname, "../apps/desktop/src/main/network.ts");
const compiled = ts.transpileModule(readFileSync(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const challenge = { isProxy: true, host: "proxy.test", port: 3128 };
const credentials = { username: "proxy-user", password: "proxy-password" };

// Model ClientRequest's request-scoped login event, including its default
// cancellation when no listener is installed. No Electron process is launched.
function fixture(handler) {
  const requests = [];
  const session = {};
  const electron = {
    session: { defaultSession: session },
    net: {
      request: (options) => {
        const request = new EventEmitter();
        request.options = options;
        request.aborted = false;
        request.abort = () => {
          request.aborted = true;
          request.response?.destroy();
          request.emit("abort");
        };
        request.end = () => queueMicrotask(() => handler(request));
        request.respond = (status, body, headers = {}) => {
          const response = new PassThrough();
          response.statusCode = status;
          response.statusMessage = "";
          response.headers = headers;
          request.response = response;
          request.emit("response", response);
          if (body !== undefined) response.end(body);
          return response;
        };
        requests.push(request);
        return request;
      },
    },
  };
  const realRequire = createRequire(source);
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    Headers,
    Response,
    ReadableStream,
    DOMException,
    Error,
    require: (name) => {
      if (name === "electron") return electron;
      if (name === "./proxy")
        return {
          proxyCredentials: (info) =>
            info.isProxy && info.host === challenge.host && info.port === challenge.port
              ? credentials
              : null,
        };
      return realRequire(name);
    },
  });
  return { fetch: module.exports.providerFetch, requests, session };
}

void test("authenticated proxy challenges are answered on each main-process request", async () => {
  let logins = 0;
  const f = fixture((request) => {
    let authorized = false;
    const handled = request.emit("login", challenge, (user, password) => {
      logins++;
      authorized = user === credentials.username && password === credentials.password;
    });
    request.respond(handled && authorized ? 200 : 407, JSON.stringify({ auth: authorized }));
  });
  // Concurrent requests to the same URL must not cancel one another's login.
  const responses = await Promise.all([
    f.fetch("http://provider.test/api"),
    f.fetch("http://provider.test/api"),
  ]);
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { auth: true });
  }
  assert.equal(logins, 2);
  assert.equal(f.requests[0].options.session, f.session);
  assert.equal(f.requests[0].options.redirect, "follow");
  assert.equal(f.requests[0].options.credentials, "include");
  assert.doesNotMatch(JSON.stringify(f.requests[0].options), /proxy-password|Proxy-Authorization/);
});

void test("rejected credentials are not retried indefinitely", async () => {
  const f = fixture((request) => {
    const answers = [];
    for (let i = 0; i < 2; i++) request.emit("login", challenge, (...args) => answers.push(args));
    assert.deepEqual(answers, [[credentials.username, credentials.password], []]);
    request.respond(407, "Authentication required");
  });
  const response = await f.fetch("https://provider.test/video");
  assert.equal(response.status, 407);
  await response.body.cancel();
  assert.equal(f.requests[0].aborted, true);
});

void test("origin and unrelated proxy challenges never receive proxy credentials", async () => {
  const f = fixture((request) => {
    for (const info of [
      { ...challenge, isProxy: false },
      { ...challenge, host: "other.test" },
    ]) {
      request.emit("login", info, (...args) => assert.deepEqual(args, []));
    }
    request.respond(401, "Unauthorized");
  });
  assert.equal((await f.fetch("https://provider.test/api")).status, 401);
});

void test("resumable headers and streamed chunks survive early ClientRequest close", async () => {
  const f = fixture((request) => {
    // ClientRequest may close its writable side before response consumption.
    request.emit("close");
    const response = request.respond(206, undefined, { "content-range": "bytes 4-7/8" });
    response.write("ab");
    response.end("cd");
  });
  const response = await f.fetch("https://provider.test/video", { headers: { Range: "bytes=4-" } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-range"), "bytes 4-7/8");
  assert.equal(await response.text(), "abcd");
  assert.equal(f.requests[0].options.headers.Range, "bytes=4-");
});

void test("pre-aborted requests never start and aborts before headers reject", async () => {
  const f = fixture(() => {});
  const controller = new AbortController();
  controller.abort(new Error("Cancelled"));
  await assert.rejects(f.fetch("http://provider.test", { signal: controller.signal }), /Cancelled/);
  assert.equal(f.requests.length, 0);
  const next = new AbortController();
  const pending = f.fetch("http://provider.test", { signal: next.signal });
  next.abort(new Error("Cancelled"));
  await assert.rejects(pending, /Cancelled/);
  assert.equal(f.requests[0].aborted, true);
});

void test("abort after headers interrupts body reads and cancelling the body closes upstream", async () => {
  const f = fixture((request) => request.respond(200, undefined));
  const controller = new AbortController();
  const response = await f.fetch("http://provider.test/live", { signal: controller.signal });
  const body = response.text();
  controller.abort(new Error("Stream cancelled"));
  await assert.rejects(body, /Stream cancelled/);
  assert.equal(f.requests[0].aborted, true);
  const another = await f.fetch("http://provider.test/live");
  await another.body.cancel();
  assert.equal(f.requests[1].aborted, true);
});

void test("network failures reject before headers and propagate into a streaming body", async () => {
  const initial = fixture((request) =>
    request.emit("error", new Error("net::ERR_PROXY_CONNECTION_FAILED")),
  );
  await assert.rejects(initial.fetch("http://provider.test"), /ERR_PROXY_CONNECTION_FAILED/);
  const streaming = fixture((request) => {
    request.respond(200, undefined);
    queueMicrotask(() => request.emit("error", new Error("net::ERR_CONNECTION_RESET")));
  });
  const response = await streaming.fetch("http://provider.test/live");
  await assert.rejects(response.text(), /ERR_CONNECTION_RESET/);
});

void test("empty responses have no body and complete normally", async () => {
  const f = fixture((request) => request.respond(204, ""));
  const response = await f.fetch("http://provider.test");
  assert.equal(response.status, 204);
  assert.equal(response.body, null);
});
