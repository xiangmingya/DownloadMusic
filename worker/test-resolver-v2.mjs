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
  TUNEHUB_API_KEY: "th_test-tunehub-key",
};

const login = await worker.fetch(new Request("https://api.example.com/api/auth/login/password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: "family-password" }),
}), env);
const cookie = login.headers.get("Set-Cookie").split(";", 1)[0];

const originalFetch = globalThis.fetch;
let resolverUpstreamCalls = 0;
let losslessRequested = false;
let qualityFallbackUsed = false;
let unconfiguredProviderCalls = 0;
globalThis.fetch = async (input) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.startsWith("https://music-api.gdstudio.xyz/api.php")) {
    resolverUpstreamCalls += 1;
    const smallAudio = url.includes("id=small-audio");
    if (url.includes("id=flac-ok")) losslessRequested = url.includes("br=999");
    const flacFallback = url.includes("id=flac-fallback");
    if (flacFallback && url.includes("br=320")) qualityFallbackUsed = true;
    await new Promise((resolve) => setTimeout(resolve, 25));
    if (flacFallback && url.includes("br=999")) {
      return new Response(JSON.stringify({ message: "lossless unavailable" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ url: smallAudio ? "https://cdn.example.test/short-prompt.mp3" : "https://cdn.example.test/music.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (url === "https://cdn.example.test/music.mp3") {
    return new Response("a", { status: 206, headers: { "Content-Type": "audio/mpeg", "Content-Range": "bytes 0-0/2000000" } });
  }
  if (url === "https://cdn.example.test/short-prompt.mp3") {
    return new Response("a", { status: 206, headers: { "Content-Type": "audio/mpeg", "Content-Range": "bytes 0-0/500000" } });
  }
  if (url.startsWith("https://lxmusicapi.onrender.com/")) {
    unconfiguredProviderCalls += 1;
    throw new Error("unconfigured provider should not be called");
  }
  if (url.startsWith("https://api.yutangxiaowu.cn/api/v1/qqmusic/music")) {
    return new Response(JSON.stringify({ success: true, url: "https://cdn.example.test/music.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (url === "https://tunehub.sayqz.com/api/v1/parse") {
    return new Response(JSON.stringify({
      code: 0,
      message: "Success",
      provider: "tunehub-internal",
      debug: { endpoint: "private.example.test" },
      data: { data: [{ id: "123", success: true, url: "https://cdn.example.test/music.mp3", provider: "upstream-provider", token: "not-for-client" }] },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
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
  const firstPayload = await first.json();
  const secondPayload = await second.json();
  assert.equal(firstPayload.data.url, "https://cdn.example.test/music.mp3");
  assert.equal(secondPayload.data.url, "https://cdn.example.test/music.mp3");
  assert.deepEqual(Object.keys(firstPayload.data).sort(), ["cover", "lyrics", "url"]);
  assert.equal(resolverUpstreamCalls, 1, "identical concurrent resolves should share one upstream request");

  const cached = await worker.fetch(createResolveRequest(), env);
  assert.equal(cached.status, 200);
  assert.deepEqual(Object.keys((await cached.json()).data).sort(), ["cover", "lyrics", "url"]);
  assert.equal(resolverUpstreamCalls, 1, "a cache hit should not call upstream again");

  const flac = await worker.fetch(new Request("https://api.example.com/api/proxy/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ platform: "netease", id: "flac-ok", quality: "flac" }),
  }), env);
  assert.equal(losslessRequested, true, "lossless requests should not be downgraded to 320k");
  assert.equal(flac.status, 200);

  const flacFallback = await worker.fetch(new Request("https://api.example.com/api/proxy/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ platform: "netease", id: "flac-fallback", quality: "flac" }),
  }), env);
  assert.equal(flacFallback.status, 200);
  assert.equal(qualityFallbackUsed, true, "unavailable lossless audio should fall back to 320k");

  const shortAudio = await worker.fetch(new Request("https://api.example.com/api/proxy/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ platform: "netease", id: "small-audio", quality: "320k" }),
  }), env);
  const shortAudioPayload = await shortAudio.json();
  assert.equal(shortAudio.status, 502, "a suspiciously short audio result must be retried instead of returned");
  assert.equal(shortAudioPayload.message, "暂时无法解析这首歌，请稍后重试");

  const qq = await worker.fetch(new Request("https://api.example.com/api/proxy/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ platform: "qq", id: "003jIJwK09Kchl", quality: "320k" }),
  }), env);
  assert.equal(qq.status, 200);
  assert.equal(unconfiguredProviderCalls, 0, "unconfigured QQ providers should be skipped before resolving");

  const parseResponse = await worker.fetch(new Request("https://api.example.com/api/proxy/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ platform: "netease", ids: "123", quality: "320k" }),
  }), env);
  const parsePayload = await parseResponse.json();
  assert.equal(parseResponse.status, 200);
  assert.deepEqual(Object.keys(parsePayload).sort(), ["code", "data", "message"]);
  assert.deepEqual(Object.keys(parsePayload.data.data[0]).sort(), ["cover", "error", "id", "info", "lyrics", "pic", "success", "url"]);

  const retiredRoute = await worker.fetch(new Request("https://api.example.com/api/proxy/backup4?mode=url", {
    headers: { Cookie: cookie },
  }), env);
  assert.equal(retiredRoute.status, 404, "legacy backup routes must no longer be exposed");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("resolver v2 cache and request coalescing: ok");
