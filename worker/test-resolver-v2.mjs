import assert from "node:assert/strict";
import worker from "./src/index.js";

const uptimeRows = [];
let publicStatusReads = 0;
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
            if (sql.includes("FROM service_uptime_checks")) {
              publicStatusReads += 1;
              return { results: [...uptimeRows] };
            }
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
  ALLOW_LEGACY_SESSIONS: "true",
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
const originalCaches = globalThis.caches;
let resolverUpstreamCalls = 0;
let losslessRequested = false;
let qualityFallbackUsed = false;
let unconfiguredProviderCalls = 0;
let cancelledHedgedRequests = 0;
let trustedCanaryMediaProbes = 0;
let apibytePlaylistCalls = 0;
let ikunFallbackCalls = 0;
const twoWaveStartedAt = [];
globalThis.fetch = async (input, init = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.startsWith("https://apione.apibyte.cn/kwmusic")) {
    apibytePlaylistCalls += 1;
    assert.equal(init.headers?.["X-Api-Key"], "test-apibyte-key");
    assert.doesNotMatch(url, /action=music_url/, "APIByte must never be used to resolve playback URLs");
    if (url.includes("action=playlist_detail")) {
      assert.match(url, /page=0/);
      assert.match(url, /size=200/);
      return new Response(JSON.stringify({ code: 200, msg: "success", data: { music_list: [
        { rid: 228741121, name: "暖暖", artist: "香皂泡", album: "暖暖", albumpic: "https://img.kuwo.test/song.jpg" },
      ] } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    assert.match(url, /action=search/);
    assert.match(url, /type=playlist/);
    if (url.includes("keyword=DJ")) {
      assert.match(url, /page=1/);
      assert.match(url, /size=10/);
    } else {
      assert.match(url, /keyword=%E7%83%AD%E9%97%A8/);
      assert.match(url, /page=0/);
      assert.match(url, /size=30/);
    }
    return new Response(JSON.stringify({ code: 200, msg: "success", data: [
      { id: "3706893759", name: "热门DJ歌单", img: "https://img.kuwo.test/playlist.jpg", total: "482", listencnt: "37921273" },
    ] }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (url.startsWith("http://search.kuwo.cn/r.s") && url.includes("ft=playlist")) {
    return new Response(String.raw`{'TOTAL':'1','abslist':[{'playlistid':'kw-real-1','name':'Today\'s 酷我歌单','pic':'http://img1.kuwo.cn/playlist.jpg','songnum':'18','playcnt':'12345','nickname':'酷我用户'}]}`, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (url.startsWith("https://music.163.com/api/search/get/web") && url.includes("type=1000")) {
    assert.match(url, /s=%E6%91%87%E6%BB%9A/);
    assert.match(url, /offset=20/);
    assert.match(url, /limit=20/);
    return new Response(JSON.stringify({ result: { playlistCount: 21, playlists: [
      { id: 123, name: "摇滚现场", coverImgUrl: "https://img.163.test/playlist.jpg", trackCount: 36, playCount: 9000, creator: { nickname: "测试用户" } },
    ] } }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (url.startsWith("http://c.y.qq.com/soso/fcgi-bin/client_music_search_songlist")) {
    assert.match(url, /query=%E6%91%87%E6%BB%9A/);
    assert.match(url, /page_no=1/);
    assert.match(url, /num_per_page=20/);
    return new Response(JSON.stringify({ data: { sum: 21, list: [
      { dissid: "qq-123", dissname: "QQ 摇滚", imgurl: "https://img.qq.test/playlist.jpg", song_count: 24, listennum: 8000, creator: { name: "QQ 用户" } },
    ] } }), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } });
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
  if (url === "https://c.wwwweb.top/music/url") {
    const body = JSON.parse(String(init.body || "{}"));
    if (body.musicId === "ikun-fallback") {
      ikunFallbackCalls += 1;
      assert.deepEqual(body, { source: "wy", musicId: "ikun-fallback", quality: "320k" });
      return new Response(JSON.stringify({ code: 200, url: "https://cdn.example.test/music.mp3" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ code: 500, message: "unavailable" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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
    const ikunFallback = url.includes("id=ikun-fallback");
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
    return new Response(JSON.stringify(ikunFallback
      ? { message: "fallback only" }
      : uptimeCanary
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

  const ikunFallback = await worker.fetch(new Request("https://api.example.com/api/proxy/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ platform: "netease", id: "ikun-fallback", quality: "320k" }),
  }), env);
  assert.equal(ikunFallback.status, 200, "ikun should rescue a failed Netease resolver chain");
  assert.equal(ikunFallbackCalls, 1, "ikun should receive the Netease source code and normalized quality");

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
  assert.equal(kuwoPlaylistsPayload.data.page, 1);
  assert.equal(kuwoPlaylistsPayload.data.limit, 30);
  assert.equal(kuwoPlaylistsPayload.data.returnedCount, 1);

  const kuwoPlaylistSearch = await worker.fetch(new Request("https://api.example.com/api/proxy/playlists?platform=kuwo&keyword=DJ&page=2&limit=10", {
    headers: { Cookie: cookie },
  }), env);
  const kuwoPlaylistSearchPayload = await kuwoPlaylistSearch.json();
  assert.equal(kuwoPlaylistSearch.status, 200);
  assert.equal(kuwoPlaylistSearchPayload.data.page, 2);
  assert.equal(kuwoPlaylistSearchPayload.data.limit, 10);
  assert.equal(kuwoPlaylistSearchPayload.data.playlists[0].name, "热门DJ歌单");

  for (const [platform, expectedName] of [["netease", "摇滚现场"], ["qq", "QQ 摇滚"]]) {
    const response = await worker.fetch(new Request(`https://api.example.com/api/proxy/playlists?platform=${platform}&keyword=${encodeURIComponent("摇滚")}&page=2&limit=20`, {
      headers: { Cookie: cookie },
    }), env);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.data.playlists[0].name, expectedName);
    assert.equal(payload.data.page, 2);
    assert.equal(payload.data.total, 21);
    assert.equal(payload.data.hasMore, false);
  }

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
  assert.deepEqual({
    page: kuwoPlaylistDetailPayload.data.page,
    limit: kuwoPlaylistDetailPayload.data.limit,
    returnedCount: kuwoPlaylistDetailPayload.data.returnedCount,
    hasMore: kuwoPlaylistDetailPayload.data.hasMore,
  }, { page: 1, limit: 200, returnedCount: 1, hasMore: false });
  assert.equal(apibytePlaylistCalls, 3, "APIByte should only serve playlist list, search, and detail requests");

  const kuwoDirect = await worker.fetch(new Request("https://api.example.com/api/proxy/playlists?platform=kuwo", {
    headers: { Cookie: cookie },
  }), { ...env, APIBYTE_KUWO_API_KEY: "" });
  const kuwoDirectPayload = await kuwoDirect.json();
  assert.equal(kuwoDirect.status, 200);
  assert.deepEqual(kuwoDirectPayload.data.playlists[0], {
    id: "kw-real-1",
    name: "Today's 酷我歌单",
    cover: "http://img1.kuwo.cn/playlist.jpg",
    trackCount: 18,
    playCount: 12345,
    author: "酷我用户",
  });

  const publicStatusCache = new Map();
  globalThis.caches = { default: {
    async match(request) {
      return publicStatusCache.get(request.url)?.clone();
    },
    async put(request, response) {
      publicStatusCache.set(request.url, response.clone());
    },
  } };
  const readsBeforePublicStatus = publicStatusReads;
  const publicStatus = await worker.fetch(new Request("https://api.example.com/api/public/service-status"), env);
  const publicStatusPayload = await publicStatus.json();
  assert.equal(publicStatus.status, 200);
  assert.equal(publicStatusPayload.data.platforms[0].state, "healthy");
  assert.equal(publicStatusPayload.data.platforms[0].history.length, 24);
  assert.equal("provider" in publicStatusPayload.data.platforms[0], false, "public uptime must not expose resolver sources");
  const cachedPublicStatus = await worker.fetch(new Request("https://api.example.com/api/public/service-status"), env);
  assert.equal(cachedPublicStatus.status, 200);
  assert.equal(publicStatusReads - readsBeforePublicStatus, 1, "public uptime should read D1 once per cache window");

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
  if (originalCaches === undefined) delete globalThis.caches;
  else globalThis.caches = originalCaches;
}

console.log("resolver v2 cache and request coalescing: ok");
