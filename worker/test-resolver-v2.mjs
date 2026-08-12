import assert from "node:assert/strict";
import worker from "./src/index.js";

const uptimeRows = [];
const DB = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes("FROM app_settings")) return null;
            return null;
          },
          async all() {
            if (sql.includes("FROM service_uptime_checks")) return { results: [...uptimeRows] };
            return { results: [] };
          },
          async run() {
            if (sql.startsWith("INSERT INTO service_uptime_checks")) {
              uptimeRows.push({
                checked_at: args[0],
                platform: args[1],
                success: args[2],
                duration_ms: args[3],
                status_code: args[4],
                error_code: args[5],
                canary_id: args[6],
              });
            }
            return { meta: { changes: 1 } };
          },
        };
      },
    };
  },
  async batch(statements) {
    return Promise.all(statements.map((statement) => statement.run()));
  },
};

const env = {
  ADMIN_PASSWORD: "family-password",
  SESSION_SECRET: "test-session-secret",
  DB,
  RESOLVER_TOTAL_BUDGET_MS: "3000",
  RESOLVER_EXPANSION_DELAY_MS: "150",
  RESOLVER_INITIAL_CONCURRENCY: "3",
  TUNEHUB_API_KEY: "th_test-tunehub-key",
  APIBYTE_KUWO_API_KEY: "test-apibyte-key",
  UPTIME_QQ_CANARIES: "qq-primary-fail|受限样本|测试歌手,qq-fallback-ok|可播样本|测试歌手,qq-third|第三样本|测试歌手",
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
let cancelledHedgedRequests = 0;
let trustedCanaryMediaProbes = 0;
let apibytePlaylistCalls = 0;
const twoWaveStartedAt = [];
globalThis.fetch = async (input, init = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.startsWith("https://apione.apibyte.cn/kwmusic")) {
    apibytePlaylistCalls += 1;
    assert.equal(init.headers?.["X-Api-Key"], "test-apibyte-key");
    assert.doesNotMatch(url, /action=music_url/, "APIByte must never be used to resolve playback URLs");
    if (url.includes("action=playlist_detail")) {
      return new Response(JSON.stringify({ code: 200, msg: "success", data: { music_list: [
        { rid: 228741121, name: "暖暖", artist: "香皂泡", album: "暖暖", images: { pic: "https://img.kuwo.test/song.jpg" } },
      ] } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    assert.match(url, /action=search/);
    assert.match(url, /type=playlist/);
    return new Response(JSON.stringify({ code: 200, msg: "success", data: [
      { id: "3706893759", name: "热门DJ歌单", img: "https://img.kuwo.test/playlist.jpg", total: "482", listencnt: "37921273" },
    ] }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (url.includes("qq-primary-fail")) {
    if (url.startsWith("https://api.bugpk.com/")) {
      return new Response(JSON.stringify({ code: 200, msg: "解析成功", data: { url: "版权限制或该音乐不存在！" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: false, message: "unavailable canary" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (url.includes("two-wave")) {
    twoWaveStartedAt.push({ url, at: Date.now() });
    if (url.includes("api.11na.cn")) {
      return new Response("a", {
        status: 206,
        headers: { "Content-Type": "audio/mpeg", "Content-Range": "bytes 0-0/2000000" },
      });
    }
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 1200);
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (init.signal?.aborted) abort();
      else init.signal?.addEventListener("abort", abort, { once: true });
    });
    throw new Error("first-wave provider intentionally slow");
  }
  if (url.startsWith("https://music-api.gdstudio.xyz/api.php")) {
    resolverUpstreamCalls += 1;
    const uptimeCanary = url.includes("id=108914") || url.includes("id=66842");
    if (url.includes("id=cancel-hedge")) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 1000);
        const abort = () => {
          clearTimeout(timer);
          cancelledHedgedRequests += 1;
          reject(new DOMException("Aborted", "AbortError"));
        };
        if (init.signal?.aborted) abort();
        else init.signal?.addEventListener("abort", abort, { once: true });
      });
    }
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
    return new Response(JSON.stringify(uptimeCanary
      ? { url: "https://m8.music.126.net/song/canary.mp3", size: 2_000_000 }
      : { url: smallAudio ? "https://cdn.example.test/short-prompt.mp3" : "https://cdn.example.test/music.mp3" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (url === "https://m8.music.126.net/song/canary.mp3") {
    trustedCanaryMediaProbes += 1;
    throw new Error("trusted GDStudio metadata should avoid a region-sensitive media probe");
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
  if (url.startsWith("https://api.yutangxiaowu.cn/api/music/Song_V1") && url.includes("cancel-hedge")) {
    return new Response(JSON.stringify({ status: 200, url: "https://cdn.example.test/music.mp3" }), {
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

  const twoWaveStarted = Date.now();
  const twoWave = await worker.fetch(new Request("https://api.example.com/api/proxy/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ platform: "netease", id: "two-wave", quality: "320k" }),
  }), env);
  assert.equal(twoWave.status, 200, "a validated second-wave provider should win");
  assert.ok(twoWaveStartedAt.length >= 4, "the remaining provider pool should be released after the grace period");
  const secondWaveCall = twoWaveStartedAt.find((entry) => entry.url.includes("api.11na.cn"));
  assert.ok(secondWaveCall, "a low-priority rescue provider should be attempted");
  assert.ok(secondWaveCall.at - twoWaveStarted >= 100, "rescue providers should wait for the short first-wave grace period");

  const hedged = await worker.fetch(new Request("https://api.example.com/api/proxy/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ platform: "netease", id: "cancel-hedge", quality: "320k" }),
  }), env);
  assert.equal(hedged.status, 200);
  assert.equal(cancelledHedgedRequests, 1, "a slower provider should be aborted after a hedged provider succeeds");

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

  const createShortAudioRequest = () => new Request("https://api.example.com/api/proxy/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ platform: "netease", id: "small-audio", quality: "320k" }),
  });
  const shortAudio = await worker.fetch(createShortAudioRequest(), env);
  const shortAudioPayload = await shortAudio.json();
  assert.equal(shortAudio.status, 502, "a suspiciously short audio result must be retried instead of returned");
  assert.equal(shortAudioPayload.message, "暂时无法解析这首歌，请稍后重试");
  const callsAfterShortAudioFailure = resolverUpstreamCalls;
  const repeatedShortAudio = await worker.fetch(createShortAudioRequest(), env);
  assert.equal(repeatedShortAudio.status, 502);
  assert.equal(resolverUpstreamCalls, callsAfterShortAudioFailure, "a recent resolver failure should be cached briefly");

  const qq = await worker.fetch(new Request("https://api.example.com/api/proxy/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ platform: "qq", id: "003jIJwK09Kchl", quality: "320k" }),
  }), env);
  assert.equal(qq.status, 200);
  assert.equal(unconfiguredProviderCalls, 0, "unconfigured QQ providers should be skipped before resolving");

  let scheduledTask = null;
  await worker.scheduled({ scheduledTime: 15 * 60 * 1000 }, env, {
    waitUntil(task) { scheduledTask = task; },
  });
  await scheduledTask;
  assert.equal(uptimeRows.length, 1, "one Cron trigger should persist one isolated uptime check");
  assert.equal(uptimeRows[0].platform, "netease");
  assert.equal(uptimeRows[0].success, 1);
  assert.equal(trustedCanaryMediaProbes, 0, "trusted official-CDN metadata should prevent Cron colo false negatives");

  scheduledTask = null;
  await worker.scheduled({ scheduledTime: 5 * 60 * 1000 }, env, {
    waitUntil(task) { scheduledTask = task; },
  });
  await scheduledTask;
  assert.equal(uptimeRows.length, 2, "a QQ Cron trigger should still persist one platform-level check");
  assert.equal(uptimeRows[1].platform, "qq");
  assert.equal(uptimeRows[1].success, 1, "a playable fallback canary should recover the platform check");
  assert.equal(uptimeRows[1].canary_id, "v2:qq-primary-fail>qq-fallback-ok");
  assert.match(uptimeRows[1].error_code, /recovered_after:qq-primary-fail:copyright_unavailable/);

  const kuwoPlaylists = await worker.fetch(new Request("https://api.example.com/api/proxy/playlists?platform=kuwo", {
    headers: { Cookie: cookie },
  }), env);
  const kuwoPlaylistsPayload = await kuwoPlaylists.json();
  assert.equal(kuwoPlaylists.status, 200);
  assert.deepEqual(kuwoPlaylistsPayload.data.playlists[0], {
    id: "3706893759",
    name: "热门DJ歌单",
    cover: "https://img.kuwo.test/playlist.jpg",
    trackCount: 482,
    playCount: 37921273,
  });

  const kuwoPlaylistDetail = await worker.fetch(new Request("https://api.example.com/api/proxy/method?platform=kuwo&functionName=playlist&id=3706893759", {
    headers: { Cookie: cookie },
  }), env);
  const kuwoPlaylistDetailPayload = await kuwoPlaylistDetail.json();
  assert.equal(kuwoPlaylistDetail.status, 200);
  assert.deepEqual(kuwoPlaylistDetailPayload.data.list[0], {
    id: "228741121",
    name: "暖暖",
    artist: "香皂泡",
    album: "暖暖",
    cover: "https://img.kuwo.test/song.jpg",
  });
  assert.equal(apibytePlaylistCalls, 2, "APIByte should only serve the playlist list and detail requests");

  const publicStatus = await worker.fetch(new Request("https://api.example.com/api/public/service-status"), env);
  const publicStatusPayload = await publicStatus.json();
  assert.equal(publicStatus.status, 200);
  assert.equal(publicStatusPayload.data.platforms[0].state, "healthy");
  assert.equal(publicStatusPayload.data.platforms[0].history.length, 24);
  assert.equal("provider" in publicStatusPayload.data.platforms[0], false, "public uptime must not expose resolver sources");

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
