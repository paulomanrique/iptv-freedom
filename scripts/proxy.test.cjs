const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { mkdtemp, readFile, rm, writeFile } = require("node:fs/promises");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const source = path.resolve(__dirname, "../apps/desktop/src/main/proxy.ts");
const compiled = ts.transpileModule(readFileSync(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const manual = {
  mode: "custom",
  protocol: "http",
  host: "proxy.example.test",
  port: 8080,
  username: "user",
  password: "secret:@password",
};

async function fixture(t, saved) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "iptv-proxy-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  if (saved) await writeFile(path.join(directory, "proxy.json"), JSON.stringify(saved));
  const app = new EventEmitter();
  app.getPath = () => directory;
  const configs = [];
  let failNext = false;
  let authCleared = 0;
  let connectionsClosed = 0;
  const electron = {
    app,
    session: {
      defaultSession: {
        setProxy: async (config) => {
          if (failNext) {
            failNext = false;
            throw new Error("Network failure");
          }
          configs.push(JSON.parse(JSON.stringify(config)));
        },
        clearAuthCache: async () => {
          authCleared++;
        },
        closeAllConnections: async () => {
          connectionsClosed++;
        },
      },
    },
  };
  const realRequire = createRequire(source);
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    URL,
    require: (name) => (name === "electron" ? electron : realRequire(name)),
  });
  return {
    api: module.exports,
    app,
    configs,
    directory,
    fail: () => {
      failNext = true;
    },
    counts: () => ({ authCleared, connectionsClosed }),
  };
}

void test("manual proxy applies to the default session, bypasses loopback, and persists", async (t) => {
  const f = await fixture(t);
  await f.api.initializeProxy();
  assert.equal(f.configs[0].mode, "direct");
  await f.api.setProxySettings(manual);
  assert.deepEqual(f.configs.at(-1), {
    mode: "fixed_servers",
    proxyRules: "http://proxy.example.test:8080",
    proxyBypassRules: "localhost;127.0.0.1;[::1]",
  });
  assert.doesNotMatch(JSON.stringify(f.configs), /secret|password/);
  assert.deepEqual(
    JSON.parse(await readFile(path.join(f.directory, "proxy.json"), "utf8")),
    manual,
  );
  assert.deepEqual(f.counts(), { authCleared: 2, connectionsClosed: 2 });
  const copy = f.api.getProxySettings();
  copy.mode = "direct";
  assert.equal(f.api.getProxySettings().mode, "custom");
});

void test("saved HTTPS and SOCKS5 settings load before networking starts", async (t) => {
  for (const protocol of ["https", "socks5"]) {
    const f = await fixture(t, { ...manual, protocol, host: "[::1]", username: "", password: "" });
    await f.api.initializeProxy();
    assert.equal(f.configs[0].proxyRules, `${protocol}://[::1]:8080`);
    assert.equal(f.api.getProxySettings().protocol, protocol);
  }
});

void test("system and direct modes remove manual routing", async (t) => {
  const f = await fixture(t, manual);
  await f.api.initializeProxy();
  await f.api.setProxySettings({ ...manual, mode: "system" });
  assert.deepEqual(f.configs.at(-1), { mode: "system" });
  await f.api.setProxySettings({ ...manual, mode: "direct" });
  assert.deepEqual(f.configs.at(-1), { mode: "direct" });
});

void test("invalid rules and authenticated SOCKS5 are rejected before applying", async (t) => {
  const f = await fixture(t);
  await f.api.initializeProxy();
  for (const patch of [
    { host: "http://proxy.test" },
    { host: "user:secret@proxy.test" },
    { host: "proxy.test;DIRECT" },
    { host: "proxy.test/path" },
    { port: 0 },
    { port: 65536 },
    { port: 1.5 },
    { mode: "unknown" },
    { protocol: "socks4" },
    { host: "[invalid]" },
  ])
    assert.throws(() => f.api.validateProxy({ ...manual, ...patch }), /proxy_invalid/);
  assert.throws(() => f.api.validateProxy({ ...manual, protocol: "socks5" }), /proxy_socks_auth/);
  assert.equal(f.configs.length, 1);
});

function challenge(app, patch = {}) {
  let prevented = false;
  let credentials;
  app.emit(
    "login",
    {
      preventDefault: () => {
        prevented = true;
      },
    },
    null,
    { url: "https://provider.test/live", pid: 1 },
    { isProxy: true, host: manual.host, port: manual.port, ...patch },
    (...args) => {
      credentials = args;
    },
  );
  return { prevented, credentials };
}

void test("credentials go only to the configured proxy and repeated failures cancel", async (t) => {
  const f = await fixture(t, manual);
  await f.api.initializeProxy();
  assert.deepEqual(challenge(f.app, { isProxy: false }), {
    prevented: false,
    credentials: undefined,
  });
  assert.deepEqual(challenge(f.app, { host: "other.test" }).credentials, []);
  assert.deepEqual(challenge(f.app, { port: 9000 }).credentials, []);
  assert.deepEqual(challenge(f.app).credentials, [manual.username, manual.password]);
  assert.deepEqual(challenge(f.app).credentials, []);
  await f.api.setProxySettings({ ...manual, mode: "direct" });
  assert.deepEqual(challenge(f.app).credentials, []);
});

void test("failed application restores the previous routing without overwriting disk", async (t) => {
  const f = await fixture(t, manual);
  await f.api.initializeProxy();
  f.fail();
  await assert.rejects(f.api.setProxySettings({ ...manual, mode: "direct" }), /proxy_save_failed/);
  assert.equal(f.api.getProxySettings().mode, "custom");
  assert.equal(f.configs.at(-1).proxyRules, "http://proxy.example.test:8080");
  assert.deepEqual(
    JSON.parse(await readFile(path.join(f.directory, "proxy.json"), "utf8")),
    manual,
  );
});

void test("write failure restores routing and concurrent saves persist in order", async (t) => {
  const f = await fixture(t);
  await f.api.initializeProxy();
  await Promise.all([
    f.api.setProxySettings(manual),
    f.api.setProxySettings({ ...manual, mode: "system" }),
  ]);
  assert.equal(f.api.getProxySettings().mode, "system");
  assert.equal(
    JSON.parse(await readFile(path.join(f.directory, "proxy.json"), "utf8")).mode,
    "system",
  );
  await rm(f.directory, { recursive: true, force: true });
  await assert.rejects(f.api.setProxySettings(manual), /proxy_save_failed/);
  assert.deepEqual(f.configs.at(-1), { mode: "system" });
});

void test("invalid persisted settings fail closed instead of silently connecting directly", async (t) => {
  const f = await fixture(t, { ...manual, host: "bad;DIRECT" });
  await assert.rejects(f.api.initializeProxy(), /proxy_load_failed/);
  assert.equal(f.configs.length, 0);
});
