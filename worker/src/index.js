const METHODS_MAP = {
  netease: ["search", "playlist"],
  qq: ["search", "playlist"],
  kuwo: ["search", "playlist"],
};
const BACKUP_API_URL = "https://music-api.gdstudio.xyz/api.php";
const BACKUP_ALLOWED_TYPES = new Set(["search", "url", "lyric", "pic"]);
const BACKUP_ALLOWED_PARAMS = new Set(["types", "source", "id", "name", "count", "pages", "br", "size"]);
const BACKUP_ALLOWED_SOURCES = new Set(["netease", "kuwo", "tencent", "netease_album", "kuwo_album", "tencent_album"]);
const BACKUP_TIMEOUT_MS = 18000;
const MUSICJX_API_URL = "https://musicjx.com/";
const MUSICJX_ALLOWED_TYPES = new Set(["netease", "qq", "kuwo"]);
const MUSICJX_ALLOWED_FILTERS = new Set(["name", "id"]);

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    return withCors(request, env, new Response(null, { status: 204 }));
  }

  try {
    if (url.pathname === "/api/auth/login/password" && request.method === "POST") {
      return withCors(request, env, await handlePasswordLogin(request, env));
    }
    if (url.pathname === "/api/auth/login/linuxdo" && request.method === "GET") {
      return withCors(request, env, await handleLinuxdoLoginStart(request, env));
    }
    if (url.pathname === "/api/auth/callback/linuxdo" && request.method === "GET") {
      return withCors(request, env, await handleLinuxdoLoginCallback(request, env));
    }
    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      return withCors(request, env, await handleLogout(env));
    }
    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      return withCors(request, env, await handleMe(request, env));
    }
    if (url.pathname === "/api/auth/linuxdo-status" && request.method === "GET") {
      return withCors(request, env, await handleLinuxdoStatus(env));
    }

    if (url.pathname === "/api/proxy/methods" && request.method === "GET") {
      return withCors(request, env, await handleMethods(request, env));
    }
    if (url.pathname === "/api/proxy/method" && request.method === "GET") {
      return withCors(request, env, await handleMethod(request, env));
    }
    if (url.pathname === "/api/proxy/parse" && request.method === "POST") {
      return withCors(request, env, await handleParse(request, env));
    }
    if (url.pathname === "/api/proxy/meta" && request.method === "GET") {
      return withCors(request, env, await handleMeta(request, env));
    }
    if (url.pathname === "/api/proxy/media" && request.method === "GET") {
      return withCors(request, env, await handleMedia(request, env));
    }
    if (url.pathname === "/api/proxy/backup" && request.method === "GET") {
      return withCors(request, env, await handleBackup(request, env));
    }
    if (url.pathname === "/api/proxy/backup3" && request.method === "GET") {
      return withCors(request, env, await handleBackup3(request, env));
    }

    return withCors(request, env, jsonResponse(404, { code: 404, message: "Not Found" }));
  } catch (err) {
    return withCors(
      request,
      env,
      jsonResponse(500, {
        code: 500,
        message: err instanceof Error ? err.message : "Internal Error",
      }),
    );
  }
}

function getAllowedOrigin(request, env) {
  const requestOrigin = request.headers.get("Origin");
  const configuredOrigins = getAllowedOrigins(env);

  if (!requestOrigin) {
    return configuredOrigins.length === 1 ? configuredOrigins[0] : "";
  }
  if (configuredOrigins.length === 0) {
    return requestOrigin;
  }
  if (configuredOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  return "";
}

function withCors(request, env, response) {
  const headers = new Headers(response.headers);
  const allowOrigin = getAllowedOrigin(request, env);

  if (allowOrigin) {
    headers.set("Access-Control-Allow-Origin", allowOrigin);
  }
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Headers", "Content-Type, X-Tunehub-Key");
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

function jsonResponse(status, payload, extraHeaders = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
  });
  for (const [k, v] of Object.entries(extraHeaders)) {
    headers.set(k, v);
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

async function parseJsonBody(request) {
  try {
    const data = await request.json();
    return typeof data === "object" && data !== null ? data : {};
  } catch {
    return {};
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonText(text) {
  try {
    const parsed = JSON.parse(String(text || ""));
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function splitCsvValues(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

function getAllowedOrigins(env) {
  const values = [
    ...splitCsvValues(env.ALLOWED_ORIGINS || ""),
    ...splitCsvValues(env.ALLOWED_ORIGIN || ""),
  ];
  const origins = values.map(normalizeOrigin).filter(Boolean);
  return Array.from(new Set(origins));
}

function getFrontendUrls(env) {
  const values = [
    ...splitCsvValues(env.FRONTEND_URLS || ""),
    ...splitCsvValues(env.FRONTEND_URL || ""),
  ];
  const urls = values.filter((value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  });
  return Array.from(new Set(urls));
}

function getOAuthConfig(env) {
  return {
    clientId: String(env.LINUXDO_CLIENT_ID || "").trim(),
    clientSecret: String(env.LINUXDO_CLIENT_SECRET || "").trim(),
    authorizationEndpoint: String(env.LINUXDO_AUTHORIZATION_ENDPOINT || "https://connect.linux.do/oauth2/authorize").trim(),
    tokenEndpoint: String(env.LINUXDO_TOKEN_ENDPOINT || "https://connect.linux.do/oauth2/token").trim(),
    userEndpoint: String(env.LINUXDO_USER_ENDPOINT || "https://connect.linux.do/api/user").trim(),
    redirectUri: String(env.LINUXDO_REDIRECT_URI || "").trim(),
    scope: String(env.LINUXDO_SCOPE || "openid profile").trim(),
  };
}

function oauthConfigured(cfg) {
  return Boolean(
    cfg.clientId &&
      cfg.clientSecret &&
      cfg.authorizationEndpoint &&
      cfg.tokenEndpoint &&
      cfg.userEndpoint &&
      cfg.redirectUri,
  );
}

async function handleLinuxdoStatus(env) {
  const cfg = getOAuthConfig(env);
  if (!oauthConfigured(cfg)) {
    return jsonResponse(200, {
      code: 0,
      message: "Success",
      data: { configured: false, reachable: false, reason: "not_configured" },
    });
  }

  try {
    const resp = await fetch(cfg.authorizationEndpoint, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(6000),
    });
    return jsonResponse(200, {
      code: 0,
      message: "Success",
      data: {
        configured: true,
        reachable: resp.status > 0,
        reason: resp.status > 0 ? "ok" : "no_http_status",
      },
    });
  } catch (err) {
    return jsonResponse(200, {
      code: 0,
      message: "Success",
      data: {
        configured: true,
        reachable: false,
        reason: err instanceof Error ? err.message : "network_error",
      },
    });
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64urlEncode(input) {
  const arr = typeof input === "string" ? encoder.encode(input) : input;
  let binary = "";
  for (let i = 0; i < arr.length; i += 1) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function signPayload(payloadB64, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  return b64urlEncode(new Uint8Array(signature));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function encodeSignedToken(payload, secret) {
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = await signPayload(body, secret);
  return `${body}.${sig}`;
}

async function decodeSignedToken(token, secret) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const expected = await signPayload(body, secret);
  if (!safeEqual(expected, sig)) return null;
  try {
    const parsed = JSON.parse(decoder.decode(b64urlDecode(body)));
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function sessionSecret(env) {
  const value = String(env.SESSION_SECRET || "").trim();
  if (!value) {
    throw new Error("SESSION_SECRET is required");
  }
  return value;
}

function cookieName(env) {
  return String(env.SESSION_COOKIE_NAME || "dm_session").trim() || "dm_session";
}

function parseCookies(header) {
  const out = {};
  for (const pair of String(header || "").split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

function buildSessionCookie(env, token, maxAgeSeconds) {
  const name = cookieName(env);
  const sameSite = String(env.SESSION_COOKIE_SAMESITE || "None").trim() || "None";
  const domain = String(env.SESSION_COOKIE_DOMAIN || "").trim();
  const parts = [
    `${name}=${token}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "Secure",
    `SameSite=${sameSite}`,
  ];
  if (domain) {
    parts.push(`Domain=${domain}`);
  }
  return parts.join("; ");
}

function buildSessionClearCookie(env) {
  return buildSessionCookie(env, "", 0);
}

async function createSessionToken(payload, env) {
  const now = Math.floor(Date.now() / 1000);
  const ttl = Number(env.SESSION_TTL_SECONDS || 30 * 24 * 3600);
  const data = {
    ...payload,
    iat: now,
    exp: now + ttl,
  };
  return encodeSignedToken(data, sessionSecret(env));
}

async function getSession(request, env) {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies[cookieName(env)];
  if (!token) return null;
  const parsed = await decodeSignedToken(token, sessionSecret(env));
  if (!parsed || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return parsed;
}

async function requireSession(request, env) {
  const session = await getSession(request, env);
  if (!session) {
    return { ok: false, response: jsonResponse(401, { code: 401, message: "Unauthorized" }) };
  }
  return { ok: true, session };
}

async function handlePasswordLogin(request, env) {
  const body = await parseJsonBody(request);
  const password = String(body.password || "");
  const configured = String(env.ADMIN_PASSWORD || "").trim();
  if (!configured) {
    return jsonResponse(500, { code: -1, message: "ADMIN_PASSWORD is not configured" });
  }
  if (!password || password !== configured) {
    return jsonResponse(401, { code: -1, message: "密码错误，请重试。" });
  }

  const token = await createSessionToken(
    {
      type: "password",
      user: {
        id: "admin",
        name: "管理员",
        linuxdo_id: "",
        avatar: "",
      },
    },
    env,
  );

  return jsonResponse(
    200,
    { code: 0, message: "Success" },
    { "Set-Cookie": buildSessionCookie(env, token, Number(env.SESSION_TTL_SECONDS || 30 * 24 * 3600)) },
  );
}

async function createOAuthStateToken(redirectUrl, env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + 10 * 60,
    nonce: crypto.randomUUID(),
    redirect: redirectUrl,
  };
  return encodeSignedToken(payload, sessionSecret(env));
}

async function verifyOAuthStateToken(state, env) {
  const payload = await decodeSignedToken(state, sessionSecret(env));
  if (!payload) return null;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function safeRedirectUrl(url, env, requestUrl) {
  const frontendUrls = getFrontendUrls(env);
  const allowedOrigins = frontendUrls.map((item) => new URL(item).origin);
  const fallback = frontendUrls[0] || new URL(requestUrl).origin;
  if (!url) return fallback;
  try {
    const parsed = new URL(url);
    if (allowedOrigins.length > 0) {
      if (!allowedOrigins.includes(parsed.origin)) return fallback;
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

async function handleLinuxdoLoginStart(request, env) {
  const cfg = getOAuthConfig(env);
  if (!oauthConfigured(cfg)) {
    return jsonResponse(500, { code: -1, message: "Linux DO OAuth not configured" });
  }

  const url = new URL(request.url);
  const redirectUrl = safeRedirectUrl(url.searchParams.get("redirect"), env, request.url);
  const state = await createOAuthStateToken(redirectUrl, env);

  const authUrl = new URL(cfg.authorizationEndpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", cfg.clientId);
  authUrl.searchParams.set("redirect_uri", cfg.redirectUri);
  authUrl.searchParams.set("state", state);
  if (cfg.scope) {
    authUrl.searchParams.set("scope", cfg.scope);
  }

  return Response.redirect(authUrl.toString(), 302);
}

async function fetchJson(url, init = {}) {
  const resp = await fetch(url, init);
  const text = await resp.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { resp, text, json };
}

function pickLinuxdoPayload(raw) {
  if (raw && typeof raw === "object" && raw.data && typeof raw.data === "object") {
    return raw.data;
  }
  return raw;
}

function pickLinuxdoUserId(payload) {
  for (const key of ["id", "sub", "user_id"]) {
    const value = String(payload?.[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

function pickLinuxdoName(payload, fallbackId) {
  for (const key of ["username", "name", "login", "nickname"]) {
    const value = String(payload?.[key] ?? "").trim();
    if (value) return value;
  }
  return `linuxdo_${fallbackId}`;
}

function pickLinuxdoAvatar(payload) {
  for (const key of ["avatar", "avatar_url", "picture"]) {
    const value = String(payload?.[key] ?? "").trim();
    if (value) return normalizeMediaUrl(value);
  }
  return "";
}

async function handleLinuxdoLoginCallback(request, env) {
  const cfg = getOAuthConfig(env);
  const url = new URL(request.url);
  const code = String(url.searchParams.get("code") || "").trim();
  const state = String(url.searchParams.get("state") || "").trim();

  if (!oauthConfigured(cfg) || !code || !state) {
    return Response.redirect(`${safeRedirectUrl("", env, request.url)}?login=failed`, 302);
  }

  const statePayload = await verifyOAuthStateToken(state, env);
  if (!statePayload) {
    return Response.redirect(`${safeRedirectUrl("", env, request.url)}?login=failed_state`, 302);
  }

  const tokenRes = await fetchJson(cfg.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!tokenRes.resp.ok || !tokenRes.json?.access_token) {
    return Response.redirect(`${safeRedirectUrl(statePayload.redirect, env, request.url)}?login=failed_token`, 302);
  }

  const userRes = await fetchJson(cfg.userEndpoint, {
    headers: {
      Authorization: `Bearer ${tokenRes.json.access_token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!userRes.resp.ok || !userRes.json) {
    return Response.redirect(`${safeRedirectUrl(statePayload.redirect, env, request.url)}?login=failed_user`, 302);
  }

  const payload = pickLinuxdoPayload(userRes.json);
  const linuxdoId = pickLinuxdoUserId(payload);
  if (!linuxdoId) {
    return Response.redirect(`${safeRedirectUrl(statePayload.redirect, env, request.url)}?login=failed_userid`, 302);
  }

  const userName = pickLinuxdoName(payload, linuxdoId);
  const avatar = pickLinuxdoAvatar(payload);
  const token = await createSessionToken(
    {
      type: "linuxdo",
      user: {
        id: linuxdoId,
        name: userName,
        linuxdo_id: linuxdoId,
        avatar,
      },
    },
    env,
  );

  const redirectTo = safeRedirectUrl(statePayload.redirect, env, request.url);
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": buildSessionCookie(env, token, Number(env.SESSION_TTL_SECONDS || 30 * 24 * 3600)),
    },
  });
}

async function handleLogout(env) {
  return jsonResponse(200, { code: 0, message: "Success" }, { "Set-Cookie": buildSessionClearCookie(env) });
}

async function handleMe(request, env) {
  const session = await getSession(request, env);
  if (!session) {
    return jsonResponse(401, { code: 401, message: "Unauthorized" });
  }
  return jsonResponse(200, {
    code: 0,
    message: "Success",
    data: {
      auth_type: String(session.type || ""),
      user: session.user || {},
      using_server_key: session.type === "password",
    },
  });
}

async function handleMethods(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  return jsonResponse(200, { code: 0, message: "Success", data: METHODS_MAP });
}

function toPositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function normalizeMediaUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  return value;
}

function qqAlbumCoverUrl(album) {
  const mid = String(album?.mid || album?.albummid || "").trim();
  if (!mid) return "";
  return `https://y.qq.com/music/photo_new/T002R300x300M000${mid}.jpg`;
}

function kuwoAlbumCoverUrl(item) {
  const short = String(item?.web_albumpic_short || "").trim();
  if (short) {
    if (short.startsWith("http://") || short.startsWith("https://") || short.startsWith("//")) {
      return normalizeMediaUrl(short);
    }
    return normalizeMediaUrl(`https://img4.kuwo.cn/star/albumcover/${short.replace(/^\/+/, "")}`);
  }

  const pic = String(item?.pic || "").trim();
  if (pic) return normalizeMediaUrl(pic);

  const hts = String(item?.hts_MVPIC || "").trim();
  if (hts) return normalizeMediaUrl(hts);

  const mv = String(item?.MVPIC || "").trim();
  if (mv) return normalizeMediaUrl(`https://img1.kuwo.cn/wmvpic/${mv.replace(/^\/+/, "")}`);

  return "";
}

function parseSearchNetease(resp) {
  const songs = Array.isArray(resp?.result?.songs) ? resp.result.songs : [];
  return songs.map((item) => ({
    id: String(item?.id ?? ""),
    name: String(item?.name || "未知歌曲"),
    artist: (Array.isArray(item?.artists) ? item.artists : []).map((a) => a?.name).filter(Boolean).join(", "),
    album: String(item?.album?.name || ""),
    cover: normalizeMediaUrl(item?.album?.picUrl || ""),
  }));
}

function parseSearchQQ(resp) {
  const songs = Array.isArray(resp?.req?.data?.body?.song?.list) ? resp.req.data.body.song.list : [];
  return songs.map((item) => ({
    id: String(item?.mid ?? ""),
    name: String(item?.name || "未知歌曲"),
    artist: (Array.isArray(item?.singer) ? item.singer : []).map((s) => s?.name).filter(Boolean).join(", "),
    album: String(item?.album?.name || ""),
    cover: normalizeMediaUrl(qqAlbumCoverUrl(item?.album || {})),
  }));
}

function parseSearchKuwo(resp) {
  const songs = Array.isArray(resp?.abslist) ? resp.abslist : [];
  return songs.map((item) => {
    const rid = String(item?.MUSICRID || "");
    return {
      id: rid.replace("MUSIC_", ""),
      name: String(item?.SONGNAME || "未知歌曲"),
      artist: String(item?.ARTIST || "").replaceAll("&", ", "),
      album: String(item?.ALBUM || ""),
      cover: normalizeMediaUrl(kuwoAlbumCoverUrl(item)),
    };
  });
}

function parsePlaylistNetease(resp) {
  const tracks = Array.isArray(resp?.result?.tracks) ? resp.result.tracks : [];
  return {
    list: tracks.map((item) => ({
      id: String(item?.id ?? ""),
      name: String(item?.name || "未知歌曲"),
      artist: (Array.isArray(item?.artists) ? item.artists : []).map((a) => a?.name).filter(Boolean).join(", "),
      album: String(item?.album?.name || ""),
      cover: normalizeMediaUrl(item?.album?.picUrl || ""),
    })),
  };
}

function parsePlaylistQQ(resp) {
  const first = Array.isArray(resp?.cdlist) ? resp.cdlist[0] : null;
  const songs = Array.isArray(first?.songlist) ? first.songlist : [];
  return {
    list: songs.map((item) => ({
      id: String(item?.mid ?? ""),
      name: String(item?.title || "未知歌曲"),
      artist: (Array.isArray(item?.singer) ? item.singer : []).map((s) => s?.name).filter(Boolean).join(", "),
      album: String(item?.album?.name || ""),
      cover: normalizeMediaUrl(qqAlbumCoverUrl(item?.album || {})),
    })),
  };
}

function parsePlaylistKuwo(resp) {
  if (String(resp?.result || "") !== "ok") return { list: [] };
  const songs = Array.isArray(resp?.musiclist) ? resp.musiclist : [];
  return {
    list: songs.map((item) => ({
      id: String(item?.id ?? ""),
      name: String(item?.name || "未知歌曲"),
      artist: String(item?.artist || "").replaceAll("&", ", "),
      album: String(item?.album || ""),
      cover: normalizeMediaUrl(kuwoAlbumCoverUrl(item)),
    })),
  };
}

async function upstreamJson(url, init = {}) {
  const resp = await fetch(url, init);
  const text = await resp.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: resp.status, json, text };
}

const NETEASE_WEB_HEADERS = {
  Referer: "https://music.163.com/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

async function callSearch(platform, keyword, page, limit) {
  if (platform === "netease") {
    const endpoint = new URL("https://music.163.com/api/search/get/web");
    endpoint.searchParams.set("s", keyword);
    endpoint.searchParams.set("type", "1");
    endpoint.searchParams.set("offset", String((page - 1) * limit));
    endpoint.searchParams.set("limit", String(limit));
    const { status, json } = await upstreamJson(endpoint.toString(), {
      headers: NETEASE_WEB_HEADERS,
    });
    if (status < 200 || status >= 300 || !json) throw new Error(`上游请求失败 (${status})`);
    return parseSearchNetease(json);
  }

  if (platform === "qq") {
    const body = {
      comm: {
        cv: 4747474,
        ct: 24,
        format: "json",
        inCharset: "utf-8",
        outCharset: "utf-8",
        uin: 0,
      },
      req: {
        method: "DoSearchForQQMusicDesktop",
        module: "music.search.SearchCgiService",
        param: {
          query: keyword,
          page_num: String(page),
          num_per_page: String(limit),
        },
      },
    };
    const { status, json } = await upstreamJson("https://u.y.qq.com/cgi-bin/musicu.fcg", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://y.qq.com/",
      },
      body: JSON.stringify(body),
    });
    if (status < 200 || status >= 300 || !json) throw new Error(`上游请求失败 (${status})`);
    return parseSearchQQ(json);
  }

  if (platform === "kuwo") {
    const endpoint = new URL("http://search.kuwo.cn/r.s");
    const query = {
      client: "kt",
      all: keyword,
      pn: String(page - 1),
      rn: String(limit),
      uid: "794762570",
      ver: "kwplayer_ar_9.2.2.1",
      vipver: "1",
      show_copyright_off: "1",
      newver: "1",
      ft: "music",
      cluster: "0",
      strategy: "2012",
      encoding: "utf8",
      rformat: "json",
      vermerge: "1",
      mobi: "1",
      issubtitle: "1",
    };
    Object.entries(query).forEach(([k, v]) => endpoint.searchParams.set(k, v));

    const { status, json } = await upstreamJson(endpoint.toString(), {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (status < 200 || status >= 300 || !json) throw new Error(`上游请求失败 (${status})`);
    return parseSearchKuwo(json);
  }

  throw new Error("不支持的平台");
}

async function callPlaylist(platform, id) {
  if (platform === "netease") {
    const endpoint = new URL("https://music.163.com/api/playlist/detail");
    endpoint.searchParams.set("id", id);
    endpoint.searchParams.set("n", "100000");
    endpoint.searchParams.set("s", "8");
    const { status, json } = await upstreamJson(endpoint.toString(), {
      headers: NETEASE_WEB_HEADERS,
    });
    if (status < 200 || status >= 300 || !json) throw new Error(`上游请求失败 (${status})`);
    return parsePlaylistNetease(json);
  }

  if (platform === "qq") {
    const endpoint = new URL("https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg");
    const query = {
      type: "1",
      json: "1",
      utf8: "1",
      onlysong: "0",
      new_format: "1",
      disstid: id,
      loginUin: "0",
      hostUin: "0",
      format: "json",
      inCharset: "utf8",
      outCharset: "utf-8",
      notice: "0",
      platform: "yqq.json",
      needNewCode: "0",
    };
    Object.entries(query).forEach(([k, v]) => endpoint.searchParams.set(k, v));

    const { status, json } = await upstreamJson(endpoint.toString(), {
      headers: {
        Origin: "https://y.qq.com",
        Referer: "https://y.qq.com/",
      },
    });
    if (status < 200 || status >= 300 || !json) throw new Error(`上游请求失败 (${status})`);
    return parsePlaylistQQ(json);
  }

  if (platform === "kuwo") {
    const endpoint = new URL("http://nplserver.kuwo.cn/pl.svc");
    const query = {
      op: "getlistinfo",
      pid: id,
      pn: "0",
      rn: "1000",
      encode: "utf8",
      keyset: "pl2012",
      identity: "kuwo",
      pcmp4: "1",
      vipver: "MUSIC_9.0.5.0_W1",
      newver: "1",
    };
    Object.entries(query).forEach(([k, v]) => endpoint.searchParams.set(k, v));

    const { status, json } = await upstreamJson(endpoint.toString(), {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (status < 200 || status >= 300 || !json) throw new Error(`上游请求失败 (${status})`);
    return parsePlaylistKuwo(json);
  }

  throw new Error("不支持的平台");
}

async function handleMethod(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const platform = String(url.searchParams.get("platform") || "").trim();
  const functionName = String(url.searchParams.get("functionName") || "").trim();
  if (!platform || !functionName) {
    return jsonResponse(400, { code: -1, message: "缺少参数: platform / functionName" });
  }

  try {
    if (functionName === "search") {
      const keyword = String(url.searchParams.get("keyword") || "").trim();
      if (!keyword) return jsonResponse(400, { code: -1, message: "缺少参数: keyword" });
      const page = toPositiveInt(url.searchParams.get("page"), 1);
      const limit = toPositiveInt(url.searchParams.get("limit"), 20);
      const data = await callSearch(platform, keyword, page, limit);
      return jsonResponse(200, { code: 0, message: "Success", data });
    }

    if (functionName === "playlist") {
      const id = String(url.searchParams.get("id") || "").trim();
      if (!id) return jsonResponse(400, { code: -1, message: "缺少参数: id" });
      const data = await callPlaylist(platform, id);
      return jsonResponse(200, { code: 0, message: "Success", data });
    }

    return jsonResponse(400, { code: -1, message: "不支持的方法，只支持 search / playlist" });
  } catch (err) {
    return jsonResponse(500, {
      code: -1,
      message: err instanceof Error ? err.message : "请求失败",
    });
  }
}

async function handleBackup(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;

  const reqUrl = new URL(request.url);
  const backupUrl = new URL(BACKUP_API_URL);

  for (const [key, value] of reqUrl.searchParams.entries()) {
    if (!BACKUP_ALLOWED_PARAMS.has(key)) continue;
    const text = String(value || "").trim();
    if (!text) continue;
    backupUrl.searchParams.set(key, text);
  }

  const types = String(backupUrl.searchParams.get("types") || "").trim();
  if (!BACKUP_ALLOWED_TYPES.has(types)) {
    return jsonResponse(400, { code: -1, message: "备用源参数无效: types" });
  }

  const source = String(backupUrl.searchParams.get("source") || "").trim();
  if (!BACKUP_ALLOWED_SOURCES.has(source)) {
    return jsonResponse(400, { code: -1, message: "备用源参数无效: source" });
  }

  const isPic = types === "pic";
  const maxAttempts = isPic ? 3 : 2;
  const cache = caches.default;
  const cacheKey = isPic ? new Request(backupUrl.toString(), { method: "GET" }) : null;
  const cached = cacheKey ? await cache.match(cacheKey) : null;

  let lastStatus = 502;
  let lastText = JSON.stringify({ code: -1, message: "备用源请求失败" });
  let lastContentType = "application/json; charset=utf-8";

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const upstream = await fetch(backupUrl.toString(), {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(BACKUP_TIMEOUT_MS),
        headers: {
          Accept: "application/json, text/plain, */*",
        },
      });

      const text = await upstream.text();
      const contentType = upstream.headers.get("Content-Type") || "application/json; charset=utf-8";

      if (upstream.ok) {
        const response = new Response(text, {
          status: upstream.status,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": isPic ? "public, max-age=43200" : "no-store",
          },
        });
        if (isPic && cacheKey) {
          try {
            await cache.put(cacheKey, response.clone());
          } catch {
            // ignore cache put failures
          }
        }
        return response;
      }

      lastStatus = upstream.status;
      lastText = text || JSON.stringify({ code: -1, message: `备用源请求失败 (${upstream.status})` });
      lastContentType = contentType;

      const canRetry = upstream.status >= 500 || upstream.status === 429;
      if (canRetry && attempt < maxAttempts - 1) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      break;
    } catch (err) {
      lastStatus = 502;
      lastText = JSON.stringify({
        code: -1,
        message: err instanceof Error ? err.message : "备用源请求失败",
      });
      lastContentType = "application/json; charset=utf-8";
      if (attempt < maxAttempts - 1) {
        await sleep(250 * (attempt + 1));
        continue;
      }
    }
  }

  if (isPic && cached) {
    const headers = new Headers(cached.headers);
    headers.set("X-Backup-Stale", "1");
    headers.set("Cache-Control", "public, max-age=43200");
    return new Response(cached.body, {
      status: 200,
      headers,
    });
  }

  return new Response(lastText, {
    status: lastStatus,
    headers: {
      "Content-Type": lastContentType,
      "Cache-Control": "no-store",
    },
  });
}

async function callMusicjx({ input, filter, type, page }) {
  const body = new URLSearchParams({
    input: String(input || ""),
    filter: String(filter || "name"),
    type: String(type || ""),
    page: String(page || 1),
  });

  const response = await fetch(MUSICJX_API_URL, {
    method: "POST",
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Origin: "https://musicjx.com",
      Referer: "https://musicjx.com/",
    },
    body,
  });
  const text = await response.text();
  return { response, text, parsed: parseJsonText(text) };
}

async function handleBackup3(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;

  const reqUrl = new URL(request.url);
  const input = String(reqUrl.searchParams.get("input") || "").trim();
  const filter = String(reqUrl.searchParams.get("filter") || "name").trim();
  const type = String(reqUrl.searchParams.get("type") || "").trim();
  const page = toPositiveInt(reqUrl.searchParams.get("page"), 1);

  if (!input || !type) {
    return jsonResponse(400, { code: -1, message: "缺少参数: input / type" });
  }
  if (!MUSICJX_ALLOWED_FILTERS.has(filter)) {
    return jsonResponse(400, { code: -1, message: "备用源3参数无效: filter" });
  }
  if (!MUSICJX_ALLOWED_TYPES.has(type)) {
    return jsonResponse(400, { code: -1, message: "备用源3参数无效: type" });
  }

  const maxAttempts = 2;
  let lastStatus = 502;
  let lastPayload = { code: -1, message: "备用源3请求失败" };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const { response, text, parsed } = await callMusicjx({ input, filter, type, page });
      if (response.ok && parsed && typeof parsed === "object") {
        return new Response(JSON.stringify(parsed), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }

      lastStatus = response.status || 502;
      lastPayload = parsed && typeof parsed === "object"
        ? parsed
        : { code: -1, message: text || `备用源3请求失败 (${lastStatus})` };

      const canRetry = response.status >= 500 || response.status === 429;
      if (canRetry && attempt < maxAttempts - 1) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      break;
    } catch (err) {
      lastStatus = 502;
      lastPayload = { code: -1, message: err instanceof Error ? err.message : "备用源3请求失败" };
      if (attempt < maxAttempts - 1) {
        await sleep(250 * (attempt + 1));
        continue;
      }
    }
  }

  return jsonResponse(lastStatus, {
    code: Number(lastPayload?.code ?? -1),
    message: String(lastPayload?.error || lastPayload?.message || "备用源3请求失败"),
    data: Array.isArray(lastPayload?.data) ? lastPayload.data : [],
  });
}

function keyLooksInvalid(key) {
  const value = String(key || "").trim();
  if (!value) return true;
  if (!value.startsWith("th_")) return true;
  if (value.includes("replace_with_your_real_key")) return true;
  return false;
}

function resolveTunehubKey(session, request, env) {
  if (session.type === "password") {
    return String(env.TUNEHUB_API_KEY || "").trim();
  }
  return String(request.headers.get("X-Tunehub-Key") || "").trim();
}

function getMediaAllowedHosts(env) {
  return splitCsvValues(env.MEDIA_PROXY_ALLOWED_HOSTS || "")
    .map((item) => item.toLowerCase())
    .filter(Boolean);
}

function hostMatchesRule(hostname, rule) {
  const host = String(hostname || "").toLowerCase();
  const normalizedRule = String(rule || "").trim().toLowerCase();
  if (!host || !normalizedRule) return false;

  if (normalizedRule.startsWith(".")) {
    const suffix = normalizedRule.slice(1);
    return host === suffix || host.endsWith(`.${suffix}`);
  }
  return host === normalizedRule || host.endsWith(`.${normalizedRule}`);
}

function isPrivateIpv4(hostname) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  const nums = hostname.split(".").map((n) => Number(n));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;

  if (nums[0] === 10) return true;
  if (nums[0] === 127) return true;
  if (nums[0] === 192 && nums[1] === 168) return true;
  if (nums[0] === 172 && nums[1] >= 16 && nums[1] <= 31) return true;
  if (nums[0] === 169 && nums[1] === 254) return true;
  if (nums[0] === 0) return true;
  return false;
}

function isBlockedMediaHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  if (host === "169.254.169.254") return true;
  if (host.startsWith("fe80:")) return true;
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (isPrivateIpv4(host)) return true;
  return false;
}

function sanitizeDownloadFilename(value) {
  const raw = String(value || "").trim();
  const fallback = "music";
  const cleaned = raw
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
}

async function fetchMediaUpstream(targetUrl, request) {
  const headers = new Headers();
  const range = request.headers.get("Range");
  if (range) headers.set("Range", range);
  const userAgent = request.headers.get("User-Agent");
  if (userAgent) headers.set("User-Agent", userAgent);

  try {
    return await fetch(targetUrl.toString(), {
      method: "GET",
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    if (targetUrl.protocol === "https:") {
      const fallback = new URL(targetUrl.toString());
      fallback.protocol = "http:";
      return fetch(fallback.toString(), {
        method: "GET",
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      });
    }
    throw err;
  }
}

async function handleMedia(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;

  const reqUrl = new URL(request.url);
  const targetRaw = normalizeMediaUrl(reqUrl.searchParams.get("url") || "");
  if (!targetRaw) {
    return jsonResponse(400, { code: -1, message: "缺少参数: url" });
  }

  let target;
  try {
    target = new URL(targetRaw);
  } catch {
    return jsonResponse(400, { code: -1, message: "url 参数无效" });
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return jsonResponse(400, { code: -1, message: "仅支持 http/https 媒体链接" });
  }

  if (isBlockedMediaHost(target.hostname)) {
    return jsonResponse(400, { code: -1, message: "不允许访问该媒体地址" });
  }

  const allowedHosts = getMediaAllowedHosts(env);
  if (allowedHosts.length > 0 && !allowedHosts.some((rule) => hostMatchesRule(target.hostname, rule))) {
    return jsonResponse(400, { code: -1, message: "该域名未在媒体代理白名单中" });
  }

  let upstream;
  try {
    upstream = await fetchMediaUpstream(target, request);
  } catch (err) {
    return jsonResponse(502, {
      code: -1,
      message: err instanceof Error ? err.message : "媒体请求失败",
    });
  }

  const headers = new Headers();
  const passthrough = [
    "Content-Type",
    "Content-Length",
    "Content-Range",
    "Accept-Ranges",
    "Cache-Control",
    "Last-Modified",
    "ETag",
  ];
  passthrough.forEach((name) => {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  });

  if (reqUrl.searchParams.get("download") === "1") {
    const filename = sanitizeDownloadFilename(reqUrl.searchParams.get("filename"));
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

async function handleParse(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;

  const body = await parseJsonBody(request);
  const platform = String(body.platform || "").trim();
  const ids = String(body.ids || "").trim();
  const quality = String(body.quality || "").trim();
  if (!platform || !ids || !quality) {
    return jsonResponse(400, {
      code: -1,
      message: "缺少参数: platform / ids / quality",
    });
  }

  const key = resolveTunehubKey(auth.session, request, env);
  if (keyLooksInvalid(key)) {
    const message =
      auth.session.type === "password"
        ? "请先在 Worker Secret 配置 TUNEHUB_API_KEY"
        : "请先在页面填写你自己的 TuneHub API Key";
    return jsonResponse(400, { code: -1, message });
  }

  const resp = await fetch("https://tunehub.sayqz.com/api/v1/parse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
    },
    body: JSON.stringify({ platform, ids, quality }),
    signal: AbortSignal.timeout(20000),
  });

  const text = await resp.text();
  return new Response(text, {
    status: resp.status,
    headers: {
      "Content-Type": resp.headers.get("Content-Type") || "application/json; charset=utf-8",
    },
  });
}

function extractOgImage(html) {
  if (!html) return "";
  const m = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"\s*\/?>/i);
  return normalizeMediaUrl(m?.[1] || "");
}

function extractReduxState(html) {
  if (!html) return null;
  const m = html.match(/window\.REDUX_STATE\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (!m?.[1]) return null;
  try {
    const parsed = JSON.parse(m[1]);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

async function handleMeta(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const platform = String(url.searchParams.get("platform") || "").trim();
  const id = String(url.searchParams.get("id") || "").trim();
  if (!platform || !id) {
    return jsonResponse(400, { code: -1, message: "缺少参数: platform / id" });
  }
  if (platform !== "netease") {
    return jsonResponse(200, { code: 0, message: "Success", data: {} });
  }

  const target = `https://y.music.163.com/m/song?id=${encodeURIComponent(id)}`;
  const resp = await fetch(target, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Mobile Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: "https://music.163.com/",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) {
    return jsonResponse(500, { code: -1, message: `上游请求失败 (${resp.status})` });
  }
  const html = await resp.text();
  const state = extractReduxState(html);
  const song = state?.Song || {};

  const artist = Array.isArray(song?.ar) ? song.ar.map((a) => a?.name).filter(Boolean).join(", ") : "";
  let cover = normalizeMediaUrl(song?.al?.picUrl || song?.album?.picUrl || "");
  if (!cover) {
    cover = extractOgImage(html);
  }

  return jsonResponse(200, {
    code: 0,
    message: "Success",
    data: {
      id: String(song?.id || id),
      name: String(song?.name || ""),
      artist,
      album: String(song?.al?.name || song?.album?.name || ""),
      cover,
    },
  });
}
