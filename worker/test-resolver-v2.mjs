import assert from "node:assert/strict";
import worker from "./src/index.js";

const DB = {
  prepare(sql) {
    return {
      bind() {
        return {
          async first() {
            if (sql.includes("FROM app_settings")) return null;
            return null;
          },
          async run() {
            return { meta: { changes: 1 } };
          },
        };
      },
    };
  },
};

const env = {
  ADMIN_PASSWORD: "family-password",
  SESSION_SECRET: "test-session-secret",
  DB,
  RESOLVER_TOTAL_BUDGET_MS: "3000",
  RESOLVER_HEDGE_DELAY_MS: "1000",
  RESOLVER_MAX_ATTEMPTS: "2",
};

const login = await worker.fetch(new Request("https://api.example.com/api/auth/login/password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: "family-password" }),
}), env);
const cookie = login.headers.get("Set-Cookie").split(";", 1)[0];

const originalFetch = globalThis.fetch;
let resolverUpstreamCalls = 0;
globalThis.fetch = async (input) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.startsWith("https://music-api.gdstudio.xyz/api.php")) {
    resolverUpstreamCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, 25));
    return new Response(JSON.stringify({ url: "https://cdn.example.test/music.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (url === "https://cdn.example.test/music.mp3") {
    return new Response("a", { status: 206, headers: { "Content-Type": "audio/mpeg", "Content-Range": "bytes 0-0/2000000" } });
  }
  throw new Error(`unexpected upstream request: ${url}`);
};

try {
  const createResolveRequest = () => new Request("https://api.example.com/api/proxy/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ platform: "netease", id: "123", quality: "320k", name: "测试歌曲", artist: "测试歌手" }),
  });
  const [first, second] = await Promise.all([
    worker.fetch(createResolveRequest(), env),
    worker.fetch(createResolveRequest(), env),
  ]);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal((await first.json()).data.url, "https://cdn.example.test/music.mp3");
  assert.equal((await second.json()).data.url, "https://cdn.example.test/music.mp3");
  assert.equal(resolverUpstreamCalls, 1, "identical concurrent resolves should share one upstream request");

  const cached = await worker.fetch(createResolveRequest(), env);
  assert.equal(cached.status, 200);
  assert.equal((await cached.json()).data.cached, true);
  assert.equal(resolverUpstreamCalls, 1, "a cache hit should not call upstream again");

  const retiredRoute = await worker.fetch(new Request("https://api.example.com/api/proxy/backup4?mode=url", {
    headers: { Cookie: cookie },
  }), env);
  assert.equal(retiredRoute.status, 404, "legacy backup routes must no longer be exposed");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("resolver v2 cache and request coalescing: ok");
