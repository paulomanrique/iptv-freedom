const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const http = require("node:http");
const { createRequire } = require("node:module");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = path.resolve(__dirname, "../apps/desktop/src/main/live.ts");
const compiled = ts.transpileModule(readFileSync(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

// Exercise the real session proxy against a local provider. Only Electron and
// credential URL construction are replaced; no real account is required.
async function fixture(t, handler) {
  const provider = http.createServer(handler);
  await new Promise((done) => provider.listen(0, "127.0.0.1", done));
  const servers = [provider];
  const sessions = [];
  const realRequire = createRequire(source);
  const module = { exports: {} };
  const requireMock = (name) => {
    if (name === "electron") return { app: {}, shell: {} };
    if (name === "./xtream") {
      return { streamUrl: () => `http://127.0.0.1:${provider.address().port}/user/password/1.ts` };
    }
    if (name === "http") {
      return {
        ...http,
        createServer: (...args) => {
          const server = http.createServer(...args);
          servers.push(server);
          return server;
        },
      };
    }
    return realRequire(name);
  };
  // Make the production 20-second deadline short enough for regression tests.
  vm.runInNewContext(compiled, {
    require: requireMock,
    module,
    exports: module.exports,
    setTimeout: (callback, delay) => setTimeout(() => callback(), delay === 20000 ? 150 : delay),
    clearTimeout,
    fetch,
    AbortController,
    Buffer,
    process,
  });
  const api = module.exports;
  t.after(async () => {
    for (const session of sessions) api.closeSession(session.sessionId);
    await Promise.all(
      servers.map(
        (server) =>
          new Promise((done) => {
            server.closeAllConnections();
            server.close(done);
          }),
      ),
    );
  });
  return {
    api,
    open: async () => {
      const session = await api.openSession({}, 1);
      sessions.push(session);
      return session;
    },
  };
}

async function failure(api, id) {
  for (let i = 0; i < 100; i++) {
    const result = api.sessionFailure(id);
    if (result) return JSON.parse(JSON.stringify(result));
    await new Promise((done) => setTimeout(done, 10));
  }
  assert.fail("Session did not report a failure");
}

void test("HTTP failure survives until a late player reads it, then closes cleanly", async (t) => {
  const { api, open } = await fixture(t, (_req, res) => res.writeHead(403).end());
  const session = await open();
  assert.deepEqual(await failure(api, session.sessionId), { code: "http", detail: "HTTP 403" });
  const response = await fetch(session.url);
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  api.closeSession(session.sessionId);
  assert.equal(api.sessionFailure(session.sessionId), null);
});

void test("HTTP failure ends an already attached player and remains available", async (t) => {
  const { api, open } = await fixture(t, (_req, res) => {
    setTimeout(() => res.writeHead(503).end(), 40);
  });
  const session = await open();
  const player = fetch(session.url).then((res) => res.text());
  assert.equal((await failure(api, session.sessionId)).detail, "HTTP 503");
  await player;
  assert.equal(api.sessionFailure(session.sessionId).code, "http");
});

void test("premature end of a live stream is reported", async (t) => {
  const { api, open } = await fixture(t, (_req, res) => res.end("stream bytes"));
  const session = await open();
  assert.deepEqual(await failure(api, session.sessionId), { code: "ended" });
});

void test("network failures expose a safe code without the credential URL", async (t) => {
  const { api, open } = await fixture(t, (req) => req.socket.destroy());
  const session = await open();
  const result = await failure(api, session.sessionId);
  assert.equal(result.code, "network");
  assert.doesNotMatch(JSON.stringify(result), /password|\/user|http:/);
});

void test("connection setup and stalled response bodies time out", async (t) => {
  for (const sendHeaders of [false, true]) {
    const { api, open } = await fixture(t, (_req, res) => {
      if (sendHeaders) {
        res.writeHead(200);
        res.write("initial bytes");
      }
    });
    const session = await open();
    assert.deepEqual(await failure(api, session.sessionId), { code: "timeout" });
  }
});

void test("intentional close reports no error and retry starts a fresh session", async (t) => {
  let requests = 0;
  const { api, open } = await fixture(t, (_req, res) => {
    requests++;
    if (requests === 1) res.writeHead(401).end();
    else {
      const timer = setInterval(() => res.write("stream bytes"), 10);
      res.on("close", () => clearInterval(timer));
    }
  });
  const first = await open();
  assert.equal((await failure(api, first.sessionId)).code, "http");
  api.closeSession(first.sessionId);
  const second = await open();
  assert.notEqual(first.sessionId, second.sessionId);
  const player = await fetch(second.url);
  assert.equal(player.status, 200);
  assert.equal(api.sessionFailure(second.sessionId), null);
  api.closeSession(second.sessionId);
  await player.text();
  assert.equal(api.sessionFailure(second.sessionId), null);
});
