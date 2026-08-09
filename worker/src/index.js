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
const QQ_BACKUP3_SEARCH_URL = "https://yutangxiaowu.cn:3015/api/qmusic/search";
const QQ_BACKUP3_PARSE_URL = "https://api.yutangxiaowu.cn/api/v1/qqmusic/music";
const YUTANG_API_ROOT = "https://api.yutangxiaowu.cn";
const QQ_BACKUP3_ALLOWED_FILTERS = new Set(["name", "id"]);
const QQ_BACKUP3_TIMEOUT_MS = 18000;
const BACKUP4_ALLOWED_PLATFORMS = new Set(["netease", "qq", "kuwo"]);
// Keep one slow provider from consuming the browser's whole fallback budget.
const BACKUP4_TIMEOUT_MS = 6500;
const BACKUP4_QQMP3_TIMEOUT_MS = 8000;
const BACKUP4_LXMUSIC_ONRENDER_URL = "https://lxmusicapi.onrender.com";
const BACKUP4_LXMUSIC_SIGNED_URL = "https://88.lxmusic.xn--fiqs8s";
const BACKUP4_OIAPI_MUSIC163_URL = "https://oiapi.net/api/Music_163";
const BACKUP4_OIAPI_KUWO_URL = "https://oiapi.net/api/Kuwo";
const BACKUP4_QQMP3_ENDPOINTS = [
  "https://www.qqmp3.vip/api/kw.php",
  "https://bb.qqmp3.vip/api/kw.php",
];
const KUWO_TOPLIST_ENDPOINTS = [
  "https://www.qqmp3.vip/api/songs.php",
  "https://bb.qqmp3.vip/api/songs.php",
];
const BACKUP4_JKAPI_URL = "https://jkapi.com/api/music";
const TUNEHUB_API_BASE = "https://tunehub.sayqz.com/api";
const NXVAV_API_URL = "https://api.nxvav.cn/api/music/";
const NXVAV_DEFAULT_SECRET = "token";
const BACKUP4_11NA_URL = "https://api.11na.cn/v1/music";
const PREVIEW_MAX_BYTES = 1048576;
// ChKSz 网易云接口；密钥只从 Worker Secret 读取。
const BACKUP4_CHKSZ_API_URL = "https://api.chksz.com/api";
const BACKUP4_BUGPK_API_ROOT = "https://api.bugpk.com/api";
const BACKUP4_PAUGRAM_NETEASE_URL = "https://api.paugram.com/netease/";
const SERVICE_METRICS_RETENTION_DAYS = 30;
const SERVICE_METRICS_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MONITORING_SERVICE_CATALOG = [
  { source: "gdstudio", category: "resolve", order: 20, name: "GDStudio", detail: "备用解析服务 · 网易云 / 酷我 / QQ 音乐", endpoint: "music-api.gdstudio.xyz" },
  { source: "onrender", category: "resolve", order: 30, name: "LXMusic Onrender", detail: "多平台备用 · 网易云 / 酷我 / QQ 音乐", endpoint: "lxmusicapi.onrender.com" },
  { source: "lxmusic_signed", category: "resolve", order: 40, name: "LXMusic 签名源", detail: "多平台备用 · 网易云 / 酷我 / QQ 音乐", endpoint: "88.lxmusic.xn--fiqs8s" },
  { source: "qq_backup3", category: "resolve", order: 50, name: "雨糖小屋 QQ 接口", detail: "QQ 音乐专用接口 · 搜索与播放链接解析", endpoint: "api.yutangxiaowu.cn" },
  { source: "yutang_netease", category: "resolve", order: 51, name: "雨糖小屋 网易云接口", detail: "网易云音乐专用接口 · 播放链接解析", endpoint: "api.yutangxiaowu.cn" },
  { source: "yutang_kuwo", category: "resolve", order: 52, name: "雨糖小屋 酷我接口", detail: "酷我音乐专用接口 · 播放链接解析", endpoint: "api.yutangxiaowu.cn" },
  { source: "jkapi", category: "resolve", order: 60, name: "JKAPI 音乐接口", detail: "网易云 / QQ 音乐接口 · 播放链接解析", endpoint: "jkapi.com/api/music" },
  { source: "oiapi_music163", category: "resolve", order: 70, name: "OIAPI 网易云接口", detail: "网易云音乐专用接口 · 播放链接解析", endpoint: "oiapi.net" },
  { source: "oiapi_kuwo", category: "resolve", order: 80, name: "OIAPI 酷我接口", detail: "酷我音乐专用接口 · 播放链接解析", endpoint: "oiapi.net" },
  { source: "chksz_163", category: "resolve", order: 90, name: "CHKSZ 音乐接口", detail: "网易云 / QQ 音乐接口 · 搜索与播放链接解析", endpoint: "api.chksz.com" },
  { source: "chksz_qq", category: "resolve", order: 91, name: "CHKSZ 音乐接口", detail: "网易云 / QQ 音乐接口 · 搜索与播放链接解析", endpoint: "api.chksz.com" },
  { source: "bugpk", category: "resolve", order: 95, name: "BugPK 音乐解析聚合", detail: "QQ / 网易云音乐接口 · 播放链接解析", endpoint: "api.bugpk.com" },
  { source: "paugram_netease", category: "resolve", order: 96, name: "Paugram 网易云接口", detail: "网易云音乐专用接口 · 播放链接解析", endpoint: "api.paugram.com" },
  { source: "qqmp3", category: "resolve", order: 100, name: "QQMP3 酷我接口", detail: "酷我音乐专用接口 · 播放链接解析", endpoint: "qqmp3.vip" },
  { source: "nxvav", category: "resolve", order: 101, name: "NXVAV 音乐解析", detail: "网易云 / QQ 音乐 · 搜索与播放链接解析", endpoint: "api.nxvav.cn" },
  { source: "11na", category: "resolve", order: 102, name: "11NA 音乐接口", detail: "网易云 / QQ / 酷我 · 搜索与播放链接解析", endpoint: "api.11na.cn" },
  { source: "netease", category: "data", order: 10, name: "网易云音乐", detail: "网易云音乐平台接口 · 搜索 / 歌单", endpoint: "music.163.com" },
  { source: "qq", category: "data", order: 20, name: "QQ 音乐", detail: "QQ 音乐平台接口 · 搜索 / 歌单", endpoint: "y.qq.com" },
  { source: "kuwo", category: "data", order: 30, name: "酷我音乐", detail: "酷我音乐平台接口 · 搜索 / 歌单", endpoint: "kuwo.cn" },
];
const PUBLIC_PLATFORM_RESOLVE_SOURCES = {
  netease: ["gdstudio", "onrender", "lxmusic_signed", "jkapi", "oiapi_music163", "chksz_163", "bugpk", "paugram_netease"],
  qq: ["gdstudio", "onrender", "lxmusic_signed", "qq_backup3", "jkapi", "chksz_163", "bugpk"],
  kuwo: ["gdstudio", "onrender", "lxmusic_signed", "oiapi_kuwo", "qqmp3"],
};
let lastServiceMetricsCleanupAt = 0;
const resolverInflight = new Map();
const resolverMemoryCache = new Map();
const resolverProviderHealth = new Map();
const resolverProviderInFlight = new Map();

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },
};

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    if (url.pathname === "/api/topone") {
      return toponeCors(request, new Response(null, { status: 204 }));
    }
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
    if (url.pathname === "/api/public/service-status" && request.method === "GET") {
      return withCors(request, env, await handlePublicServiceStatus(env));
    }
    if (url.pathname === "/api/membership" && request.method === "GET") {
      return withCors(request, env, await handleMembership(request, env));
    }
    if (url.pathname === "/api/billing/checkout" && request.method === "POST") {
      return withCors(request, env, await handleCheckout(request, env));
    }
    if (url.pathname === "/api/billing/notify/linuxdo" && request.method === "GET") {
      return withCors(request, env, await handleBillingNotify(request, env));
    }
    if (url.pathname === "/api/library" && request.method === "GET") {
      return withCors(request, env, await handleLibraryGet(request, env));
    }
    if (url.pathname === "/api/library" && request.method === "PUT") {
      return withCors(request, env, await handleLibraryPut(request, env));
    }
    if (url.pathname === "/api/admin/overview" && request.method === "GET") {
      return withCors(request, env, await handleAdminOverview(request, env));
    }
    if (url.pathname === "/api/admin/settings/membership" && request.method === "PUT") {
      return withCors(request, env, await handleAdminMembershipSettings(request, env));
    }
    if (url.pathname === "/api/admin/members" && request.method === "GET") {
      return withCors(request, env, await handleAdminMembers(request, env));
    }
    if (url.pathname === "/api/admin/members/grant" && request.method === "POST") {
      return withCors(request, env, await handleAdminMemberGrant(request, env));
    }
    if (url.pathname === "/api/admin/monitoring" && request.method === "GET") {
      return withCors(request, env, await handleAdminMonitoring(request, env));
    }
    if (url.pathname === "/api/admin/monitoring/sources" && request.method === "PUT") {
      return withCors(request, env, await handleAdminSourceToggle(request, env));
    }
    if (url.pathname === "/api/keys" && request.method === "GET") {
      return withCors(request, env, await handleKeysStatus(request, env));
    }
    if (url.pathname === "/api/keys" && request.method === "POST") {
      return withCors(request, env, await handleKeysCreate(request, env));
    }
    if (url.pathname === "/api/keys/reset" && request.method === "POST") {
      return withCors(request, env, await handleKeysReset(request, env));
    }
    if (url.pathname === "/api/keys/unbind" && request.method === "POST") {
      return withCors(request, env, await handleKeysUnbind(request, env));
    }
    if (url.pathname === "/api/client/bind" && request.method === "POST") {
      return withCors(request, env, await handleClientBind(request, env));
    }
    if (url.pathname === "/api/topone" && request.method === "POST") {
      return toponeCors(request, await handleTopone(request, env, ctx));
    }
    if (url.pathname.startsWith("/api/proxy/")) {
      const sessionAuth = await requireClientAuth(request, env);
      if (!sessionAuth.ok) return withCors(request, env, sessionAuth.response);
    }
    const membershipRequiredRoutes = new Set(["/api/proxy/parse", "/api/proxy/media", "/api/proxy/resolve"]);
    if (membershipRequiredRoutes.has(url.pathname)) {
      const access = await requireMusicAccess(request, env);
      if (!access.ok) return withCors(request, env, access.response);
    }

    if (url.pathname === "/api/proxy/methods" && request.method === "GET") {
      return withCors(request, env, await handleMethods(request, env));
    }
    if (url.pathname === "/api/proxy/method" && request.method === "GET") {
      return withCors(request, env, await handleMethod(request, env));
    }
    if (url.pathname === "/api/proxy/search" && request.method === "GET") {
      return withCors(request, env, await handleSearch(request, env));
    }
    if (url.pathname === "/api/proxy/toplists" && request.method === "GET") {
      return withCors(request, env, await handleToplists(request, env));
    }
    if (url.pathname === "/api/proxy/toplist" && request.method === "GET") {
      return withCors(request, env, await handleToplist(request, env));
    }
    if (url.pathname === "/api/proxy/playlists" && request.method === "GET") {
      return withCors(request, env, await handlePlaylists(request, env));
    }
    if (url.pathname === "/api/proxy/parse" && request.method === "POST") {
      return withCors(request, env, await handleParse(request, env));
    }
    if (url.pathname === "/api/proxy/resolve" && request.method === "POST") {
      return withCors(request, env, await handleResolve(request, env, ctx));
    }
    if (url.pathname === "/api/proxy/meta" && request.method === "GET") {
      return withCors(request, env, await handleMeta(request, env));
    }
    if (url.pathname === "/api/proxy/media" && request.method === "GET") {
      return withCors(request, env, await handleMedia(request, env));
    }
    if (url.pathname === "/api/proxy/cover" && request.method === "GET") {
      return withCors(request, env, await handleCover(request, env));
    }
    if (url.pathname === "/api/proxy/lyric" && request.method === "GET") {
      return withCors(request, env, await handleLyric(request, env));
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
  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Tunehub-Key, X-DM-Key, X-DM-Device-Id, X-DM-Device-Name, X-DM-Mi-Uid, X-DM-Device-Token",
  );
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

// topone 是 NAS 本地页面（任意内网地址）也可能调用的接口，按请求来源回显 Origin；
// 接口本身靠 Bearer KEY 鉴权，不需要 Cookie，因此不依赖站点白名单。
function toponeCors(request, response) {
  const headers = new Headers(response.headers);
  const requestOrigin = request.headers.get("Origin");
  headers.set("Access-Control-Allow-Origin", requestOrigin || "*");
  headers.set("Vary", "Origin");
  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-DM-Key, X-DM-Device-Id, X-DM-Device-Name, X-DM-Mi-Uid, X-DM-Device-Token",
  );
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

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

function getApiKeyFromRequest(request) {
  return String(request.headers.get("X-DM-Key") || "").trim();
}

// topone（小爱音箱外部搜索源）同时接受 Authorization: Bearer <KEY> 与 X-DM-Key。
function getToponeApiKey(request) {
  const headerKey = getApiKeyFromRequest(request);
  if (headerKey) return headerKey;
  const auth = String(request.headers.get("Authorization") || "").trim();
  if (!auth) return "";
  return auth.replace(/^Bearer\s+/i, "").trim();
}

function requestWithApiKeyHeader(request, key) {
  const headers = new Headers(request.headers);
  headers.set("X-DM-Key", String(key || "").trim());
  return new Request("https://local/api/topone", { method: "POST", headers });
}

function getApiDeviceId(request) {
  return String(request.headers.get("X-DM-Device-Id") || "").trim();
}

function getApiDeviceName(request) {
  return String(request.headers.get("X-DM-Device-Name") || "").trim().slice(0, 60);
}

function getApiMiUid(request) {
  return String(request.headers.get("X-DM-Mi-Uid") || "").trim();
}

function getApiDeviceToken(request) {
  return String(request.headers.get("X-DM-Device-Token") || "").trim();
}

function generateApiKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `xm_${hex}`;
}

function generateDeviceToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function maskApiKey(key) {
  const value = String(key || "");
  if (value.length <= 10) return value;
  return `${value.slice(0, 7)}${"*".repeat(value.length - 11)}${value.slice(-4)}`;
}

function maskMiUid(uid) {
  const value = String(uid || "").trim();
  if (!value) return "";
  return value.length <= 4 ? "****" : `****${value.slice(-4)}`;
}

async function lookupApiKeyRecord(key, env) {
  const db = getDatabase(env);
  if (!db) return null;
  try {
    return await db
      .prepare(
        "SELECT id, owner_key, api_key, name, created_at, last_used_at, mi_uid, device_id, device_name, device_token, bound_at, enabled, expires_at FROM api_keys WHERE api_key = ? LIMIT 1",
      )
      .bind(String(key || ""))
      .first();
  } catch {
    return null;
  }
}

async function validateApiKeyOnly(request, env) {
  const key = getApiKeyFromRequest(request);
  if (!key) return null;
  const record = await lookupApiKeyRecord(key, env);
  if (!record || Number(record.enabled) !== 1) {
    return { error: jsonResponse(401, { code: 401, message: "API Key 无效" }) };
  }
  if (record.expires_at && Date.parse(record.expires_at) <= Date.now()) {
    return { error: jsonResponse(401, { code: 401, message: "API Key 已过期" }) };
  }
  const db = getDatabase(env);
  if (db) db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").bind(sqlNow(), record.id).run().catch(() => {});

  return {
    session: {
      type: "apikey",
      api_key_id: Number(record.id),
      api_key_name: String(record.name || ""),
      owner_key: String(record.owner_key || ""),
      user: { name: String(record.name || "API Key") },
    },
  };
}

async function validateBoundApiKey(request, env) {
  const key = getApiKeyFromRequest(request);
  if (!key) return null;
  const miUid = getApiMiUid(request);
  const token = getApiDeviceToken(request);
  if (!miUid) {
    return { error: jsonResponse(400, { code: -1, message: "缺少小米账号 ID X-DM-Mi-Uid" }) };
  }
  if (!token) {
    return { error: jsonResponse(400, { code: -1, message: "缺少设备令牌 X-DM-Device-Token，请先在客户端保存绑定" }) };
  }
  const record = await lookupApiKeyRecord(key, env);
  if (!record || Number(record.enabled) !== 1) {
    return { error: jsonResponse(401, { code: 401, message: "API Key 无效" }) };
  }
  if (record.expires_at && Date.parse(record.expires_at) <= Date.now()) {
    return { error: jsonResponse(401, { code: 401, message: "API Key 已过期" }) };
  }
  if (String(record.mi_uid || "").trim() !== miUid) {
    return { error: jsonResponse(403, { code: 403, message: "小米账号与绑定不符" }) };
  }
  if (String(record.device_token || "").trim() !== token) {
    return { error: jsonResponse(401, { code: 401, message: "设备令牌无效，请重新保存绑定" }) };
  }
  const db = getDatabase(env);
  if (db) db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").bind(sqlNow(), record.id).run().catch(() => {});
  return {
    session: {
      type: "apikey",
      api_key_id: Number(record.id),
      api_key_name: String(record.name || ""),
      owner_key: String(record.owner_key || ""),
      mi_uid: miUid,
      device_id: getApiDeviceId(request),
      device_name: String(record.device_name || ""),
      user: { name: String(record.name || "API Key") },
    },
  };
}

async function requireClientAuth(request, env) {
  const key = getApiKeyFromRequest(request);
  if (!key) {
    const session = await getSession(request, env);
    if (!session) {
      return { ok: false, response: jsonResponse(401, { code: 401, message: "Unauthorized" }) };
    }
    return { ok: true, session, auth_mode: "session" };
  }
  const bound = await validateBoundApiKey(request, env);
  if (!bound) return { ok: false, response: jsonResponse(401, { code: 401, message: "Unauthorized" }) };
  if (bound.error) return { ok: false, response: bound.error };
  return { ok: true, session: bound.session, auth_mode: "apikey" };
}

async function requireAnyAuth(request, env) {
  const apiAuth = await validateApiKeyOnly(request, env);
  if (apiAuth) {
    if (apiAuth.error) return { ok: false, response: apiAuth.error };
    return { ok: true, session: apiAuth.session, auth_mode: "apikey" };
  }
  const session = await getSession(request, env);
  if (!session) {
    return { ok: false, response: jsonResponse(401, { code: 401, message: "Unauthorized" }) };
  }
  return { ok: true, session, auth_mode: "session" };
}

function getDatabase(env) {
  return env.DB && typeof env.DB.prepare === "function" ? env.DB : null;
}

function getLinuxdoId(session) {
  return String(session?.user?.linuxdo_id || session?.user?.id || "").trim();
}

function getAdminLinuxdoIds(env) {
  return new Set(splitCsvValues(env.ADMIN_LINUXDO_IDS || ""));
}

function isAdminSession(session, env) {
  return session?.type === "linuxdo" && getAdminLinuxdoIds(env).has(getLinuxdoId(session));
}

async function requireAdminSession(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth;
  if (!isAdminSession(auth.session, env)) {
    return { ok: false, response: jsonResponse(403, { code: 403, message: "管理员权限不足" }) };
  }
  return auth;
}

function membershipRequired(env) {
  return ["1", "true", "yes", "on"].includes(String(env.MEMBERSHIP_REQUIRED || "").trim().toLowerCase());
}

function parseMembershipPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999 || Math.round(amount * 100) !== amount * 100) return "";
  return amount.toFixed(2);
}

async function getMembershipPrice(db) {
  try {
    const row = await db.prepare("SELECT value FROM app_settings WHERE key = 'monthly_membership_price'").first();
    return parseMembershipPrice(row?.value) || "10.00";
  } catch {
    return "10.00";
  }
}

async function getMembershipRecord(db, linuxdoId) {
  return db.prepare("SELECT expires_at, updated_at FROM memberships WHERE linuxdo_id = ?").bind(linuxdoId).first();
}

function membershipActive(record) {
  return Boolean(record?.expires_at && Date.parse(record.expires_at) > Date.now());
}

async function getMembershipStatus(session, env) {
  if (session?.type === "password" || session?.type === "apikey") {
    return {
      active: true,
      expires_at: null,
      source: session?.type === "apikey" ? "apikey" : "admin",
    };
  }
  const linuxdoId = getLinuxdoId(session);
  const db = getDatabase(env);
  if (!linuxdoId || !db) return { active: false, expires_at: null, source: "unavailable" };
  try {
    const record = await getMembershipRecord(db, linuxdoId);
    return { active: membershipActive(record), expires_at: record?.expires_at || null, source: "membership" };
  } catch {
    return { active: false, expires_at: null, source: "unavailable" };
  }
}

async function requireMusicAccess(request, env) {
  const auth = await requireAnyAuth(request, env);
  if (!auth.ok) return auth;
  if (auth.session?.type === "apikey") return auth;
  if (!membershipRequired(env)) return auth;
  const membership = await getMembershipStatus(auth.session, env);
  if (membership.active) return auth;
  if (isAdminSession(auth.session, env)) return auth;
  return { ok: false, response: jsonResponse(402, { code: 402, message: "需要有效的月会员" }) };
}

function libraryOwnerKey(session) {
  if (session?.type === "apikey") return String(session?.owner_key || "");
  if (session?.type === "password") return "password:family";
  if (session?.type !== "linuxdo") return "";
  const id = String(session?.user?.linuxdo_id || session?.user?.id || "").trim();
  return id ? `linuxdo:${id}` : "";
}

function libraryUnavailableResponse() {
  return jsonResponse(503, { code: 503, message: "资料库同步暂不可用" });
}

function parseLibraryDocument(value) {
  try {
    const parsed = JSON.parse(String(value || ""));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function serializeLibraryDocument(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "";
  const serialized = JSON.stringify(value);
  return encoder.encode(serialized).byteLength <= 1024 * 1024 ? serialized : "";
}

async function handleLibraryGet(request, env) {
  const auth = await requireAnyAuth(request, env);
  if (!auth.ok) return auth.response;
  const db = getDatabase(env);
  const ownerKey = libraryOwnerKey(auth.session);
  if (!db) return libraryUnavailableResponse();
  if (!ownerKey) return jsonResponse(401, { code: 401, message: "Unauthorized" });

  const row = await db
    .prepare("SELECT document, updated_at FROM user_libraries WHERE owner_key = ?")
    .bind(ownerKey)
    .first();
  return jsonResponse(200, {
    code: 0,
    message: "Success",
    data: {
      library: row ? parseLibraryDocument(row.document) : null,
      updated_at: String(row?.updated_at || ""),
    },
  });
}

async function handleLibraryPut(request, env) {
  const auth = await requireAnyAuth(request, env);
  if (!auth.ok) return auth.response;
  const db = getDatabase(env);
  const ownerKey = libraryOwnerKey(auth.session);
  if (!db) return libraryUnavailableResponse();
  if (!ownerKey) return jsonResponse(401, { code: 401, message: "Unauthorized" });

  const body = await parseJsonBody(request);
  const document = serializeLibraryDocument(body.library);
  if (!document) return jsonResponse(400, { code: -1, message: "资料库数据无效或超过 1 MB" });

  const updatedAt = sqlNow();
  await db
    .prepare(
      "INSERT INTO user_libraries (owner_key, document, updated_at) VALUES (?, ?, ?) ON CONFLICT(owner_key) DO UPDATE SET document = excluded.document, updated_at = excluded.updated_at",
    )
    .bind(ownerKey, document, updatedAt)
    .run();
  return jsonResponse(200, { code: 0, message: "Success", data: { updated_at: updatedAt } });
}

function sqlNow() {
  return new Date().toISOString();
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(value || "")));
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

function apiError(message, status = 400) {
  return jsonResponse(status, { code: -1, message });
}

function metricLabel(value, fallback = "unknown") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return normalized || fallback;
}

function metricHour(value = Date.now()) {
  const date = new Date(value);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function metricError(error) {
  return String(error instanceof Error ? error.message : error || "请求失败")
    .replace(/\s+/g, " ")
    .slice(0, 240);
}

async function recordServiceMetric(env, { source, operation, success, status = 0, durationMs = 0, error = "" }) {
  const db = getDatabase(env);
  if (!db) return;
  const now = sqlNow();
  const bucket = metricHour();
  const isSuccess = Boolean(success);
  const safeStatus = Number.isFinite(Number(status)) ? Math.max(0, Math.floor(Number(status))) : 0;
  const safeDuration = Math.max(0, Math.min(300000, Math.round(Number(durationMs) || 0)));
  try {
    await db.prepare(
      "INSERT INTO service_metrics_hourly (bucket_hour, source, operation, requests, successes, failures, total_duration_ms, last_success_at, last_failure_at, last_status, last_error) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(bucket_hour, source, operation) DO UPDATE SET requests = requests + 1, successes = successes + excluded.successes, failures = failures + excluded.failures, total_duration_ms = total_duration_ms + excluded.total_duration_ms, last_success_at = CASE WHEN excluded.successes = 1 THEN excluded.last_success_at ELSE last_success_at END, last_failure_at = CASE WHEN excluded.failures = 1 THEN excluded.last_failure_at ELSE last_failure_at END, last_status = excluded.last_status, last_error = CASE WHEN excluded.failures = 1 THEN excluded.last_error ELSE last_error END",
    ).bind(
      bucket,
      metricLabel(source),
      metricLabel(operation),
      isSuccess ? 1 : 0,
      isSuccess ? 0 : 1,
      safeDuration,
      isSuccess ? now : null,
      isSuccess ? null : now,
      safeStatus,
      isSuccess ? null : metricError(error),
    ).run();

    if (Date.now() - lastServiceMetricsCleanupAt > SERVICE_METRICS_CLEANUP_INTERVAL_MS) {
      lastServiceMetricsCleanupAt = Date.now();
      const cutoff = metricHour(Date.now() - SERVICE_METRICS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      await db.prepare("DELETE FROM service_metrics_hourly WHERE bucket_hour < ?").bind(cutoff).run();
    }
  } catch {
    // 监控本身绝不能让用户的搜索、播放或下载失败。
  }
}

async function monitoredServiceCall(env, { source, operation }, run) {
  const startedAt = Date.now();
  try {
    const result = await run();
    const status = Number(result?.status || result?.response?.status || result?.resp?.status || 200);
    const success = status >= 200 && status < 300;
    if (!success) {
      const error = new Error(`上游请求失败 (${status})`);
      error.status = status;
      throw error;
    }
    await recordServiceMetric(env, { source, operation, success: true, status, durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    await recordServiceMetric(env, {
      source,
      operation,
      success: false,
      status: Number(error?.status || 0),
      durationMs: Date.now() - startedAt,
      error,
    });
    throw error;
  }
}

async function recordFinalParseHit(env, source, durationMs = 0) {
  await recordServiceMetric(env, {
    source,
    operation: "final_parse",
    success: true,
    status: 200,
    durationMs,
  });
}

function serviceHealth(row, now = Date.now()) {
  const requests = Number(row?.requests || 0);
  const successes = Number(row?.successes || 0);
  const failures = Number(row?.failures || 0);
  const successRate = requests > 0 ? successes / requests : null;
  const lastSuccessAt = Date.parse(row?.last_success_at || "");
  const lastFailureAt = Date.parse(row?.last_failure_at || "");
  if (requests === 0) return { state: "unknown", label: "暂无数据", success_rate: null };
  if (successRate === 0 || (Number.isFinite(lastFailureAt) && (!Number.isFinite(lastSuccessAt) || lastFailureAt > lastSuccessAt) && successRate < 0.5)) {
    return { state: "down", label: "不可用", success_rate: successRate };
  }
  if (successRate < 0.85 || (Number.isFinite(lastSuccessAt) && now - lastSuccessAt > 6 * 60 * 60 * 1000 && failures > 0)) {
    return { state: "unstable", label: "波动", success_rate: successRate };
  }
  return { state: "healthy", label: "正常", success_rate: successRate };
}

async function createLinuxdoSession(linuxdoId, userName, avatar, env) {
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
  return buildSessionCookie(env, token, Number(env.SESSION_TTL_SECONDS || 30 * 24 * 3600));
}

async function recordMemberLogin(linuxdoId, userName, avatar, env) {
  const db = getDatabase(env);
  if (!db || !linuxdoId) return;
  const now = sqlNow();
  await db.prepare("INSERT INTO linuxdo_users (linuxdo_id, name, avatar, created_at, last_login_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(linuxdo_id) DO UPDATE SET name = excluded.name, avatar = excluded.avatar, last_login_at = excluded.last_login_at")
    .bind(String(linuxdoId), String(userName || linuxdoId), String(avatar || ""), now, now)
    .run();
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
  let idLikeName = "";
  const profiles = [payload, payload?.user].filter((value) => value && typeof value === "object");
  for (const profile of profiles) {
    for (const key of ["name", "nickname", "username", "login"]) {
      const value = String(profile?.[key] ?? "").trim();
      if (!value) continue;
      if (value !== String(fallbackId)) return value;
      idLikeName = value;
    }
  }
  return idLikeName || `linuxdo_${fallbackId}`;
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
  await recordMemberLogin(linuxdoId, userName, avatar, env).catch(() => {});
  const redirectTo = safeRedirectUrl(statePayload.redirect, env, request.url);
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": await createLinuxdoSession(linuxdoId, userName, avatar, env),
    },
  });
}

async function handleAdminOverview(request, env) {
  const auth = await requireAdminSession(request, env);
  if (!auth.ok) return auth.response;
  const db = getDatabase(env);
  if (!db) return apiError("D1 数据库未配置", 503);
  const price = await getMembershipPrice(db);
  const members = await db.prepare("SELECT COUNT(*) AS count FROM memberships WHERE expires_at > ?").bind(sqlNow()).first();
  const orders = await db.prepare("SELECT COUNT(*) AS count FROM billing_orders WHERE status = 'paid'").first();
  return jsonResponse(200, { code: 0, message: "Success", data: {
    monthly_price: price,
    active_members: Number(members?.count || 0),
    paid_orders: Number(orders?.count || 0),
  } });
}

function publicPlatformHealth(row, now) {
  const requests = Number(row?.requests || 0);
  const successes = Number(row?.successes || 0);
  const failures = Number(row?.failures || 0);
  const lastUpdatedAt = row?.last_updated_at || null;
  if (!requests) return { state: "unknown", label: "检测中", last_updated_at: lastUpdatedAt };
  if (!successes) return { state: "down", label: "维护中", last_updated_at: lastUpdatedAt };
  const successRate = successes / requests;
  const stale = lastUpdatedAt && (now - Date.parse(lastUpdatedAt)) > 6 * 60 * 60 * 1000;
  if (stale || failures > 0 || successRate < 0.8) return { state: "unstable", label: "波动", last_updated_at: lastUpdatedAt };
  return { state: "healthy", label: "正常", last_updated_at: lastUpdatedAt };
}

function aggregatePublicPlatformHealth(platform, platformRows, resolveRows, now) {
  const direct = platformRows.get(`platform_${platform}`);
  if (Number(direct?.requests || 0) > 0) return publicPlatformHealth(direct, now);
  const candidates = (PUBLIC_PLATFORM_RESOLVE_SOURCES[platform] || []).map((source) => resolveRows.get(source)).filter(Boolean);
  const latest = candidates.map((row) => row.last_updated_at).filter(Boolean).sort().at(-1) || null;
  if (!candidates.length) return { state: "unknown", label: "检测中", last_updated_at: latest };
  const healths = candidates.map((row) => publicPlatformHealth(row, now));
  if (healths.some((item) => item.state === "healthy")) return { state: "healthy", label: "正常", last_updated_at: latest };
  if (healths.some((item) => item.state === "unstable")) return { state: "unstable", label: "波动", last_updated_at: latest };
  if (healths.some((item) => item.state === "down")) return { state: "down", label: "维护中", last_updated_at: latest };
  return { state: "unknown", label: "检测中", last_updated_at: latest };
}

async function handlePublicServiceStatus(env) {
  const db = getDatabase(env);
  const generatedAt = sqlNow();
  const platforms = ["netease", "qq", "kuwo"];
  if (!db) return jsonResponse(200, { code: 0, message: "Success", data: { generated_at: generatedAt, overall: "unknown", overall_label: "检测中", platforms: platforms.map((platform) => ({ platform, state: "unknown", label: "检测中", last_updated_at: null })) } }, { "Cache-Control": "no-store" });

  try {
    const since = metricHour(Date.now() - 24 * 60 * 60 * 1000);
    const [platformResult, resolveResult] = await Promise.all([
      db.prepare("SELECT source, SUM(requests) AS requests, SUM(successes) AS successes, SUM(failures) AS failures, MAX(COALESCE(last_success_at, last_failure_at)) AS last_updated_at FROM service_metrics_hourly WHERE bucket_hour >= ? AND operation = 'platform_parse' GROUP BY source").bind(since).all(),
      db.prepare("SELECT source, SUM(requests) AS requests, SUM(successes) AS successes, SUM(failures) AS failures, MAX(COALESCE(last_success_at, last_failure_at)) AS last_updated_at FROM service_metrics_hourly WHERE bucket_hour >= ? AND operation = 'parse' GROUP BY source").bind(since).all(),
    ]);
    const platformRows = new Map((platformResult.results || []).map((row) => [String(row.source || ""), row]));
    const resolveRows = new Map((resolveResult.results || []).map((row) => [String(row.source || ""), row]));
    const platformStates = platforms.map((platform) => ({ platform, ...aggregatePublicPlatformHealth(platform, platformRows, resolveRows, Date.now()) }));
    const states = platformStates.map((item) => item.state);
    const overall = states.every((state) => state === "healthy") ? "healthy" : states.every((state) => state === "down") ? "down" : states.some((state) => state === "down") ? "unstable" : states.some((state) => state === "unstable") ? "unstable" : "unknown";
    const overallLabel = overall === "healthy" ? "正常运行" : overall === "down" ? "服务维护中" : overall === "unstable" ? "部分服务波动" : "检测中";
    return jsonResponse(200, { code: 0, message: "Success", data: { generated_at: generatedAt, overall, overall_label: overallLabel, platforms: platformStates } }, { "Cache-Control": "no-store" });
  } catch {
    return jsonResponse(200, { code: 0, message: "Success", data: { generated_at: generatedAt, overall: "unknown", overall_label: "检测中", platforms: platforms.map((platform) => ({ platform, state: "unknown", label: "检测中", last_updated_at: null })) } }, { "Cache-Control": "no-store" });
  }
}

async function handleAdminMembershipSettings(request, env) {
  const auth = await requireAdminSession(request, env);
  if (!auth.ok) return auth.response;
  const db = getDatabase(env);
  if (!db) return apiError("D1 数据库未配置", 503);
  const price = parseMembershipPrice((await parseJsonBody(request)).monthly_price);
  if (!price) return apiError("月会员价格必须是大于 0、最多两位小数的积分数", 400);
  await db.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES ('monthly_membership_price', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(price, sqlNow()).run();
  return jsonResponse(200, { code: 0, message: "Success", data: { monthly_price: price } });
}

async function handleAdminMembers(request, env) {
  const auth = await requireAdminSession(request, env);
  if (!auth.ok) return auth.response;
  const db = getDatabase(env);
  if (!db) return apiError("D1 数据库未配置", 503);
  const keyword = String(new URL(request.url).searchParams.get("q") || "").trim().slice(0, 80);
  const now = sqlNow();
  const statement = keyword
    ? db.prepare("SELECT m.linuxdo_id, m.expires_at, m.updated_at, u.name, u.avatar, u.created_at AS registered_at, u.last_login_at, (SELECT MIN(granted_at) FROM membership_grants g WHERE g.linuxdo_id = m.linuxdo_id) AS membership_started_at FROM memberships m LEFT JOIN linuxdo_users u ON u.linuxdo_id = m.linuxdo_id WHERE m.expires_at > ? AND (m.linuxdo_id LIKE ? OR u.name LIKE ?) ORDER BY m.expires_at ASC LIMIT 500").bind(now, `%${keyword}%`, `%${keyword}%`)
    : db.prepare("SELECT m.linuxdo_id, m.expires_at, m.updated_at, u.name, u.avatar, u.created_at AS registered_at, u.last_login_at, (SELECT MIN(granted_at) FROM membership_grants g WHERE g.linuxdo_id = m.linuxdo_id) AS membership_started_at FROM memberships m LEFT JOIN linuxdo_users u ON u.linuxdo_id = m.linuxdo_id WHERE m.expires_at > ? ORDER BY m.expires_at ASC LIMIT 500").bind(now);
  const rows = await statement.all();
  return jsonResponse(200, { code: 0, message: "Success", data: { members: (rows.results || []).map((row) => ({
    linuxdo_id: String(row.linuxdo_id || ""),
    name: String(row.name || row.linuxdo_id || ""),
    is_admin: getAdminLinuxdoIds(env).has(String(row.linuxdo_id || "")),
    avatar: String(row.avatar || ""),
    registered_at: row.registered_at || null,
    last_login_at: row.last_login_at || null,
    membership_started_at: row.membership_started_at || row.updated_at || null,
    expires_at: row.expires_at || null,
    updated_at: row.updated_at || null,
  })) } });
}

async function handleAdminMemberGrant(request, env) {
  const auth = await requireAdminSession(request, env);
  if (!auth.ok) return auth.response;
  const db = getDatabase(env);
  if (!db) return apiError("D1 数据库未配置", 503);

  const body = await parseJsonBody(request);
  const target = String(body.target || "").trim().slice(0, 160);
  const days = Number(body.days);
  const note = String(body.note || "").trim().slice(0, 240);
  if (!target) return apiError("请输入 Linux DO ID 或完整昵称", 400);
  if (!Number.isInteger(days) || days < 1 || days > 3650) return apiError("赠送天数须为 1 到 3650 天之间的整数", 400);

  const matches = await db.prepare("SELECT linuxdo_id, name FROM linuxdo_users WHERE linuxdo_id = ? OR name = ? COLLATE NOCASE LIMIT 2").bind(target, target).all();
  if (!matches.results?.length) return apiError("未找到该用户；对方需先使用 Linux DO 登录一次", 404);
  if (matches.results.length > 1) return apiError("昵称不唯一，请改用 Linux DO ID", 409);

  const member = matches.results[0];
  const current = await db.prepare("SELECT expires_at FROM memberships WHERE linuxdo_id = ?").bind(member.linuxdo_id).first();
  const baseTime = membershipActive(current) ? Date.parse(current.expires_at) : Date.now();
  const now = sqlNow();
  const expiresAt = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString();
  await db.batch([
    db.prepare("INSERT INTO memberships (linuxdo_id, expires_at, updated_at) VALUES (?, ?, ?) ON CONFLICT(linuxdo_id) DO UPDATE SET expires_at = excluded.expires_at, updated_at = excluded.updated_at").bind(member.linuxdo_id, expiresAt, now),
    db.prepare("INSERT INTO membership_grants (linuxdo_id, days, source, granted_by, granted_at, expires_at, note) VALUES (?, ?, 'admin_gift', ?, ?, ?, ?)").bind(member.linuxdo_id, days, String(auth.session?.user?.linuxdo_id || "admin"), now, expiresAt, note || null),
  ]);
  return jsonResponse(200, { code: 0, message: "Success", data: { linuxdo_id: member.linuxdo_id, name: member.name, days, expires_at: expiresAt } });
}

async function handleAdminMonitoring(request, env) {
  const auth = await requireAdminSession(request, env);
  if (!auth.ok) return auth.response;
  const db = getDatabase(env);
  if (!db) return apiError("D1 数据库未配置", 503);

  const requestedDays = Number(new URL(request.url).searchParams.get("days") || 7);
  const days = [1, 7, 30].includes(requestedDays) ? requestedDays : 7;
  const now = Date.now();
  const cutoff = metricHour(now - days * 24 * 60 * 60 * 1000);
  const trendCutoff = metricHour(now - 24 * 60 * 60 * 1000);
  try {
    const [summaryResult, latestResult, trendResult, finalResult] = await Promise.all([
      db.prepare("SELECT source, SUM(requests) AS requests, SUM(successes) AS successes, SUM(failures) AS failures, SUM(total_duration_ms) AS total_duration_ms, MAX(last_success_at) AS last_success_at, MAX(last_failure_at) AS last_failure_at FROM service_metrics_hourly WHERE bucket_hour >= ? AND operation NOT IN ('final_parse', 'platform_parse') GROUP BY source ORDER BY requests DESC, source ASC").bind(cutoff).all(),
      db.prepare("SELECT source, last_status, last_error, bucket_hour FROM service_metrics_hourly WHERE bucket_hour >= ? AND operation NOT IN ('final_parse', 'platform_parse') ORDER BY bucket_hour DESC").bind(cutoff).all(),
      db.prepare("SELECT bucket_hour, SUM(requests) AS requests, SUM(successes) AS successes, SUM(failures) AS failures FROM service_metrics_hourly WHERE bucket_hour >= ? AND operation NOT IN ('final_parse', 'platform_parse') GROUP BY bucket_hour ORDER BY bucket_hour ASC").bind(trendCutoff).all(),
      db.prepare("SELECT source, SUM(successes) AS hits FROM service_metrics_hourly WHERE bucket_hour >= ? AND operation = 'final_parse' GROUP BY source ORDER BY hits DESC, source ASC").bind(cutoff).all(),
    ]);
    const latestBySource = new Map();
    for (const row of latestResult.results || []) {
      if (!latestBySource.has(row.source)) latestBySource.set(row.source, row);
    }
    const summaryBySource = new Map((summaryResult.results || []).map((row) => [String(row.source || "unknown"), row]));
    const catalogBySource = new Map(MONITORING_SERVICE_CATALOG.map((item) => [item.source, item]));
    const allSources = [...MONITORING_SERVICE_CATALOG, ...Array.from(summaryBySource.keys()).filter((source) => !catalogBySource.has(source)).map((source, index) => ({ source, category: "other", order: 1000 + index }))];
    const disabledSources = new Set(await getDisabledSources(env));
    const services = allSources.map((catalog) => {
      const row = summaryBySource.get(catalog.source) || {};
      const latest = latestBySource.get(catalog.source) || {};
      const requests = Number(row.requests || 0);
      const successes = Number(row.successes || 0);
      const failures = Number(row.failures || 0);
      const health = serviceHealth({ ...row, requests, successes, failures }, now);
      return {
        source: String(catalog.source || "unknown"),
        disabled: disabledSources.has(String(catalog.source || "")),
        category: catalog.category,
        catalog_order: catalog.order,
        name: String(catalog.name || "未分类接口"),
        detail: String(catalog.detail || "运行时发现的内部服务"),
        endpoint: String(catalog.endpoint || "仅管理员可见"),
        requests,
        successes,
        failures,
        success_rate: health.success_rate,
        average_duration_ms: requests > 0 ? Math.round(Number(row.total_duration_ms || 0) / requests) : 0,
        last_success_at: row.last_success_at || null,
        last_failure_at: row.last_failure_at || null,
        last_status: Number(latest.last_status || 0) || null,
        last_error: latest.last_error || "",
        health: health.state,
        health_label: health.label,
      };
    });
    const trendLookup = new Map((trendResult.results || []).map((row) => [String(row.bucket_hour), row]));
    const trend = Array.from({ length: 24 }, (_, index) => {
      const bucket = metricHour(now - (23 - index) * 60 * 60 * 1000);
      const row = trendLookup.get(bucket) || {};
      return {
        bucket_hour: bucket,
        requests: Number(row.requests || 0),
        successes: Number(row.successes || 0),
        failures: Number(row.failures || 0),
      };
    });
    const finalSources = (finalResult.results || []).map((row) => ({
      source: String(row.source || "unknown"),
      name: String(catalogBySource.get(String(row.source || "unknown"))?.name || "未分类接口"),
      hits: Number(row.hits || 0),
    }));
    return jsonResponse(200, { code: 0, message: "Success", data: {
      window_days: days,
      retained_days: SERVICE_METRICS_RETENTION_DAYS,
      generated_at: sqlNow(),
      services,
      trend,
      final_sources: finalSources,
    } });
  } catch {
    return apiError("服务监控表尚未初始化，请先执行最新 schema.sql", 503);
  }
}

let disabledSourcesCache = { at: 0, value: null };

async function getDisabledSources(env) {
  const now = Date.now();
  if (Array.isArray(disabledSourcesCache.value) && now - disabledSourcesCache.at < 10000) {
    return disabledSourcesCache.value;
  }
  const db = getDatabase(env);
  let list = [];
  if (db) {
    try {
      const row = await db.prepare("SELECT value FROM app_settings WHERE key = 'disabled_sources'").first();
      const parsed = JSON.parse(String(row?.value || "[]"));
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      list = [];
    }
  }
  disabledSourcesCache = { at: now, value: list };
  return list;
}

async function isSourceDisabled(env, source) {
  const list = await getDisabledSources(env);
  return list.includes(String(source || ""));
}

async function setSourceDisabled(env, source, disabled) {
  const db = getDatabase(env);
  if (!db) return false;
  const current = await getDisabledSources(env);
  const next = new Set(current);
  if (disabled) {
    next.add(String(source || ""));
  } else {
    next.delete(String(source || ""));
  }
  await db.prepare("INSERT INTO app_settings (key, value, updated_at) VALUES ('disabled_sources', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(JSON.stringify([...next]))
    .run();
  disabledSourcesCache = { at: 0, value: null };
  return true;
}

async function handleAdminSourceToggle(request, env) {
  const auth = await requireAdminSession(request, env);
  if (!auth.ok) return auth.response;
  const db = getDatabase(env);
  if (!db) return apiError("D1 数据库未配置", 503);
  const body = await parseJsonBody(request);
  const source = String(body.source || "").trim();
  if (!source) {
    return jsonResponse(400, { code: -1, message: "缺少参数: source" });
  }
  const disabled = Boolean(body.disabled);
  await setSourceDisabled(env, source, disabled);
  return jsonResponse(200, { code: 0, message: "Success", data: { source, disabled } });
}

async function handleMembership(request, env) {
  const auth = await requireAnyAuth(request, env);
  if (!auth.ok) return auth.response;
  const db = getDatabase(env);
  const membership = await getMembershipStatus(auth.session, env);
  const price = db ? await getMembershipPrice(db) : "10.00";
  return jsonResponse(200, { code: 0, message: "Success", data: {
    ...membership,
    monthly_price: price,
    payment_configured: creditConfigured(env),
    is_admin: isAdminSession(auth.session, env),
  } });
}

function getCreditConfig(env) {
  return {
    clientId: String(env.LDC_CLIENT_ID || "").trim(),
    clientSecret: String(env.LDC_CLIENT_SECRET || "").trim(),
    notifyUrl: String(env.LDC_NOTIFY_URL || "").trim(),
    returnUrl: String(env.LDC_RETURN_URL || "").trim(),
  };
}

function creditConfigured(env) {
  const cfg = getCreditConfig(env);
  return Boolean(cfg.clientId && cfg.clientSecret && cfg.notifyUrl && cfg.returnUrl);
}

function createBillingOrderNo(linuxdoId) {
  return `DM${Date.now().toString(36).toUpperCase()}${String(linuxdoId).slice(-6)}${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function md5Hex(input) {
  const source = encoder.encode(String(input));
  const paddedLength = ((source.length + 9 + 63) >> 6) << 6;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(source);
  bytes[source.length] = 0x80;
  let bitLength = BigInt(source.length) * 8n;
  for (let index = 0; index < 8; index += 1) {
    bytes[paddedLength - 8 + index] = Number(bitLength & 0xffn);
    bitLength >>= 8n;
  }
  const shifts = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const constants = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0);
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const rotateLeft = (value, amount) => ((value << amount) | (value >>> (32 - amount))) >>> 0;
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) => {
      const position = offset + index * 4;
      return (bytes[position] | (bytes[position + 1] << 8) | (bytes[position + 2] << 16) | (bytes[position + 3] << 24)) >>> 0;
    });
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    for (let index = 0; index < 64; index += 1) {
      let f;
      let g;
      if (index < 16) { f = (b & c) | (~b & d); g = index; }
      else if (index < 32) { f = (d & b) | (~d & c); g = (5 * index + 1) % 16; }
      else if (index < 48) { f = b ^ c ^ d; g = (3 * index + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * index) % 16; }
      const next = d;
      d = c;
      c = b;
      b = (b + rotateLeft((a + f + constants[index] + words[g]) >>> 0, shifts[index])) >>> 0;
      a = next;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  return [a0, b0, c0, d0].map((word) => [word & 0xff, (word >>> 8) & 0xff, (word >>> 16) & 0xff, (word >>> 24) & 0xff].map((byte) => byte.toString(16).padStart(2, "0")).join("")).join("");
}

function easyPaySignature(params, clientSecret) {
  const payload = Object.entries(params)
    .filter(([key, value]) => key !== "sign" && key !== "sign_type" && value !== undefined && value !== null && String(value) !== "")
    .sort(([a], [b]) => (a < b ? -1 : (a > b ? 1 : 0)))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return md5Hex(`${payload}${clientSecret}`);
}

async function handleCheckout(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  if (auth.session.type !== "linuxdo") {
    return apiError("该账号无需购买会员", 400);
  }
  const db = getDatabase(env);
  if (!db) return apiError("D1 数据库未配置", 503);
  if (!creditConfigured(env)) return apiError("积分支付尚未配置", 503);
  const cfg = getCreditConfig(env);
  const linuxdoId = getLinuxdoId(auth.session);
  const amount = await getMembershipPrice(db);
  const outTradeNo = createBillingOrderNo(linuxdoId);
  const createdAt = sqlNow();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await db.prepare("INSERT INTO billing_orders (out_trade_no, linuxdo_id, amount, status, created_at, expires_at) VALUES (?, ?, ?, 'pending', ?, ?)").bind(outTradeNo, linuxdoId, amount, createdAt, expiresAt).run();

  const params = {
    pid: cfg.clientId,
    type: "epay",
    out_trade_no: outTradeNo,
    name: "Music Downloader 月会员",
    money: amount,
    notify_url: cfg.notifyUrl,
    return_url: cfg.returnUrl,
    sign_type: "MD5",
  };
  try {
    const sign = easyPaySignature(params, cfg.clientSecret);
    const response = await fetch("https://credit.linux.do/epay/pay/submit.php", {
      method: "POST",
      redirect: "manual",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...params, sign }),
      signal: AbortSignal.timeout(15000),
    });
    const location = response.headers.get("Location");
    if (!(response.status >= 300 && response.status < 400 && location)) throw new Error(`积分服务未返回付款链接（HTTP ${response.status}）`);
    const checkoutUrl = new URL(location, "https://credit.linux.do/epay/pay/submit.php").toString();
    return jsonResponse(200, { code: 0, message: "Success", data: { out_trade_no: outTradeNo, checkout_url: checkoutUrl, amount } });
  } catch (err) {
    await db.prepare("UPDATE billing_orders SET status = 'failed' WHERE out_trade_no = ? AND status = 'pending'").bind(outTradeNo).run();
    return apiError(err instanceof Error ? err.message : "创建积分订单失败", 502);
  }
}

async function queryCreditOrder(outTradeNo, cfg) {
  const url = new URL("https://credit.linux.do/epay/api.php");
  url.searchParams.set("act", "order");
  url.searchParams.set("pid", cfg.clientId);
  url.searchParams.set("key", cfg.clientSecret);
  url.searchParams.set("out_trade_no", outTradeNo);
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: "application/json" } });
  const payload = parseJsonText(await response.text());
  return { response, payload };
}

async function handleBillingNotify(request, env) {
  const cfg = getCreditConfig(env);
  const outTradeNo = String(new URL(request.url).searchParams.get("out_trade_no") || "").trim();
  const db = getDatabase(env);
  if (!db || !creditConfigured(env) || !outTradeNo) return new Response("failure", { status: 400 });
  const order = await db.prepare("SELECT out_trade_no, linuxdo_id, amount, status FROM billing_orders WHERE out_trade_no = ?").bind(outTradeNo).first();
  if (!order) return new Response("failure", { status: 404 });
  if (order.status === "paid") return new Response("success");
  try {
    const { response, payload } = await queryCreditOrder(outTradeNo, cfg);
    const paid = response.ok && Number(payload?.status) === 1 && String(payload?.out_trade_no || "") === outTradeNo && parseMembershipPrice(payload?.money) === String(order.amount);
    if (!paid) return new Response("failure", { status: 400 });
    const now = sqlNow();
    const result = await db.prepare("UPDATE billing_orders SET status = 'paid', trade_no = ?, paid_at = ? WHERE out_trade_no = ? AND status = 'pending'").bind(String(payload?.trade_no || ""), now, outTradeNo).run();
    if (Number(result.meta?.changes || 0) === 1) {
      const current = await getMembershipRecord(db, String(order.linuxdo_id));
      const start = membershipActive(current) ? Date.parse(current.expires_at) : Date.now();
      const nextExpiry = new Date(start + 30 * 24 * 60 * 60 * 1000).toISOString();
      await db.batch([
        db.prepare("INSERT INTO memberships (linuxdo_id, expires_at, updated_at) VALUES (?, ?, ?) ON CONFLICT(linuxdo_id) DO UPDATE SET expires_at = excluded.expires_at, updated_at = excluded.updated_at").bind(String(order.linuxdo_id), nextExpiry, now),
        db.prepare("INSERT INTO membership_grants (linuxdo_id, days, source, granted_by, granted_at, expires_at, note) VALUES (?, 30, 'purchase', NULL, ?, ?, 'Linux DO Credit 支付')").bind(String(order.linuxdo_id), now, nextExpiry),
      ]);
    }
    return new Response("success");
  } catch {
    return new Response("failure", { status: 502 });
  }
}

async function handleLogout(env) {
  return jsonResponse(200, { code: 0, message: "Success" }, { "Set-Cookie": buildSessionClearCookie(env) });
}

async function handleMe(request, env) {
  const auth = await requireAnyAuth(request, env);
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const membership = await getMembershipStatus(session, env);
  return jsonResponse(200, {
    code: 0,
    message: "Success",
    data: {
      auth_type: String(session.type || ""),
      user: session.user || {},
      using_server_key: session.type === "password",
      is_admin: isAdminSession(session, env),
      api_key:
        session.type === "apikey"
          ? {
              id: session.api_key_id,
              name: session.api_key_name,
              device_name: session.device_name || "",
              mi_uid_tail: session.mi_uid ? maskMiUid(session.mi_uid) : null,
            }
          : null,
      membership,
    },
  });
}

function apiKeyOwnerKey(session) {
  return libraryOwnerKey(session);
}

function apiKeyUnavailableResponse() {
  return jsonResponse(503, { code: 503, message: "D1 数据库未配置" });
}

async function handleKeysStatus(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  const db = getDatabase(env);
  const ownerKey = apiKeyOwnerKey(auth.session);
  if (!db) return apiKeyUnavailableResponse();
  if (!ownerKey) return jsonResponse(401, { code: 401, message: "Unauthorized" });
  const row = await db
    .prepare(
      "SELECT id, api_key, name, created_at, last_used_at, mi_uid, device_id, device_name, bound_at FROM api_keys WHERE owner_key = ? LIMIT 1",
    )
    .bind(ownerKey)
    .first();
  if (!row) {
    return jsonResponse(200, { code: 0, message: "Success", data: { has_key: false } });
  }
  return jsonResponse(200, {
    code: 0,
    message: "Success",
    data: {
      has_key: true,
      id: row.id,
      name: row.name || "",
      key: row.api_key,
      key_preview: maskApiKey(row.api_key),
      created_at: row.created_at,
      last_used_at: row.last_used_at,
      mi_uid_tail: row.mi_uid ? maskMiUid(row.mi_uid) : null,
      device_id: row.device_id || null,
      device_name: row.device_name || null,
      bound_at: row.bound_at || null,
    },
  });
}

async function handleKeysCreate(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  const db = getDatabase(env);
  const ownerKey = apiKeyOwnerKey(auth.session);
  if (!db) return apiKeyUnavailableResponse();
  if (!ownerKey) return jsonResponse(401, { code: 401, message: "Unauthorized" });
  const existing = await db.prepare("SELECT id FROM api_keys WHERE owner_key = ? LIMIT 1").bind(ownerKey).first();
  if (existing) {
    return jsonResponse(400, { code: -1, message: "该账号已申请过 Key，请使用「重新生成」" });
  }
  const key = generateApiKey();
  const now = sqlNow();
  await db
    .prepare("INSERT INTO api_keys (owner_key, api_key, name, created_at) VALUES (?, ?, ?, ?)")
    .bind(ownerKey, key, "默认", now)
    .run();
  const row = await db.prepare("SELECT id FROM api_keys WHERE owner_key = ? LIMIT 1").bind(ownerKey).first();
  return jsonResponse(200, {
    code: 0,
    message: "Success",
    data: { id: row?.id, name: "默认", key, key_preview: maskApiKey(key), created_at: now },
  });
}

async function handleKeysReset(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  const db = getDatabase(env);
  const ownerKey = apiKeyOwnerKey(auth.session);
  if (!db) return apiKeyUnavailableResponse();
  if (!ownerKey) return jsonResponse(401, { code: 401, message: "Unauthorized" });
  const key = generateApiKey();
  const now = sqlNow();
  await db
    .prepare(
      "INSERT INTO api_keys (owner_key, api_key, name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(owner_key) DO UPDATE SET api_key = excluded.api_key, mi_uid = NULL, device_id = NULL, device_name = NULL, device_token = NULL, bound_at = NULL, enabled = 1, expires_at = NULL, last_used_at = NULL",
    )
    .bind(ownerKey, key, "默认", now)
    .run();
  const row = await db.prepare("SELECT id FROM api_keys WHERE owner_key = ? LIMIT 1").bind(ownerKey).first();
  return jsonResponse(200, {
    code: 0,
    message: "Success",
    data: { id: row?.id, name: "默认", key, key_preview: maskApiKey(key), created_at: now },
  });
}

async function handleKeysUnbind(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  const db = getDatabase(env);
  const ownerKey = apiKeyOwnerKey(auth.session);
  if (!db) return apiKeyUnavailableResponse();
  if (!ownerKey) return jsonResponse(401, { code: 401, message: "Unauthorized" });
  const result = await db
    .prepare("UPDATE api_keys SET mi_uid = NULL, device_id = NULL, device_name = NULL, device_token = NULL, bound_at = NULL WHERE owner_key = ?")
    .bind(ownerKey)
    .run();
  if (!result.meta?.changes) {
    return jsonResponse(404, { code: 404, message: "Key 不存在或未绑定设备" });
  }
  return jsonResponse(200, { code: 0, message: "Success", data: { unbound: true } });
}

async function handleClientBind(request, env) {
  const key = getApiKeyFromRequest(request);
  if (!key) {
    return jsonResponse(401, { code: 401, message: "缺少 API Key" });
  }
  const miUid = getApiMiUid(request);
  const deviceId = getApiDeviceId(request);
  if (!miUid) {
    return jsonResponse(400, { code: -1, message: "缺少小米账号 ID X-DM-Mi-Uid" });
  }
  if (!deviceId) {
    return jsonResponse(400, { code: -1, message: "缺少设备标识 X-DM-Device-Id" });
  }
  const record = await lookupApiKeyRecord(key, env);
  const db = getDatabase(env);
  if (!record || Number(record.enabled) !== 1) {
    return jsonResponse(401, { code: 401, message: "API Key 无效" });
  }
  if (record.expires_at && Date.parse(record.expires_at) <= Date.now()) {
    return jsonResponse(401, { code: 401, message: "API Key 已过期" });
  }
  if (!db) {
    return jsonResponse(503, { code: 503, message: "D1 数据库未配置" });
  }

  const now = sqlNow();
  const deviceName = getApiDeviceName(request) || deviceId;
  const boundMi = String(record.mi_uid || "").trim();
  const boundDeviceId = String(record.device_id || "").trim();

  if (boundMi) {
    if (boundMi !== miUid) {
      return jsonResponse(403, { code: 403, message: "该 Key 已绑定其他小米账号" });
    }
    if (boundDeviceId && boundDeviceId !== deviceId) {
      return jsonResponse(403, { code: 403, message: "该 Key 已在其他设备绑定" });
    }
    await db.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").bind(now, record.id).run().catch(() => {});
    return jsonResponse(200, {
      code: 0,
      message: "Success",
      data: {
        bound: true,
        mi_uid_tail: maskMiUid(miUid),
        device_name: String(record.device_name || boundDeviceId || deviceId),
        device_token: String(record.device_token || ""),
        bound_at: record.bound_at,
      },
    });
  }

  const token = generateDeviceToken();
  await db
    .prepare(
      "UPDATE api_keys SET mi_uid = ?, device_id = ?, device_name = ?, device_token = ?, bound_at = ?, last_used_at = ? WHERE id = ?",
    )
    .bind(miUid, deviceId, deviceName, token, now, now, record.id)
    .run();
  return jsonResponse(200, {
    code: 0,
    message: "Success",
    data: {
      bound: true,
      mi_uid_tail: maskMiUid(miUid),
      device_name: deviceName,
      device_token: token,
      bound_at: now,
    },
  });
}

async function handleMethods(request, env) {
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
  try {
    const parsed = new URL(value);
    if (parsed.hostname === "y.qq.com" && parsed.pathname.startsWith("/music/photo_new/")) {
      parsed.hostname = "y.gtimg.cn";
      return parsed.toString();
    }
  } catch {
    // Let the caller reject malformed upstream URLs as before.
  }
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

async function upstreamJson(url, init = {}, encoding = "utf-8") {
  const resp = await fetch(url, init);
  const bytes = await resp.arrayBuffer();
  let text = "";
  try {
    text = new TextDecoder(encoding).decode(bytes);
  } catch {
    text = new TextDecoder().decode(bytes);
  }
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

function fillTemplateExpr(template, vars) {
  return String(template || "").replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
    const source = String(expr || "").trim();
    const simple = { keyword: vars.keyword, page: vars.page, limit: vars.limit }[source];
    if (simple !== undefined) return String(simple);
    if (!/^[\d\s()+\-*/|a-z]{0,80}$/i.test(source)) return match;
    try {
      const value = new Function("page", "limit", `"use strict"; return (${source});`)(vars.page, vars.limit);
      return value === undefined || value === null ? "" : String(value);
    } catch {
      return match;
    }
  });
}

async function callTunehubSearch(platform, keyword, page, limit) {
  const cfgRes = await fetch(`${TUNEHUB_API_BASE}/v1/methods/${encodeURIComponent(platform)}/search`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!cfgRes.ok) throw new Error(`TuneHub 方法下发失败 (${cfgRes.status})`);
  const cfg = parseJsonText(await cfgRes.text())?.data;
  if (!cfg || !cfg.url || typeof cfg.transform !== "string") {
    throw new Error("TuneHub 搜索配置无效");
  }

  const requestPage = Math.max(1, Number(page) || 1);
  const requestLimit = Math.max(1, Number(limit) || 20);
  const params = {};
  for (const [key, value] of Object.entries(cfg.params || {})) {
    params[key] = fillTemplateExpr(String(value), { keyword, page: requestPage, limit: requestLimit });
  }

  const url = new URL(cfg.url);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });

  const upstream = await fetch(url.toString(), {
    method: String(cfg.method || "GET").toUpperCase(),
    headers: cfg.headers || {},
    signal: AbortSignal.timeout(15000),
  });
  const text = await upstream.text();
  if (!upstream.ok) throw new Error(`TuneHub 搜索上游失败 (${upstream.status})`);

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("TuneHub 搜索响应不是 JSON");
  }

  const transformFn = new Function("response", `return (${cfg.transform})(response);`);
  const transformed = transformFn(parsed);
  const list = Array.isArray(transformed) ? transformed : (Array.isArray(transformed?.list) ? transformed.list : []);
  return list
    .map((item) => ({
      id: String(item?.id ?? ""),
      name: String(item?.name || "未知歌曲"),
      artist: String(item?.artist || "未知歌手"),
      album: String(item?.album || ""),
      cover: normalizeMediaUrl(item?.cover || item?.pic || ""),
    }))
    .filter((item) => item.id);
}

async function callSearch(platform, keyword, page, limit) {
  if (platform === "netease" || platform === "kuwo") {
    try {
      const tunehubList = await callTunehubSearch(platform, keyword, page, limit);
      if (tunehubList.length > 0) return tunehubList;
    } catch {
      // TuneHub 方法下发不可用时回退到直连搜索。
    }
  }

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

function parseToplistsNetease(resp) {
  const lists = Array.isArray(resp?.list) ? resp.list : [];
  return lists.slice(0, 30).map((item) => ({
    id: String(item?.id || ""),
    name: String(item?.name || "网易云榜单"),
    description: String(item?.description || item?.updateFrequency || "实时更新"),
    cover: normalizeMediaUrl(item?.coverImgUrl || ""),
    count: Number(item?.trackCount || 0),
  })).filter((item) => item.id);
}

function parseToplistsQQ(resp) {
  const groups = Array.isArray(resp?.toplist?.data?.group) ? resp.toplist.data.group : [];
  return groups.flatMap((group) => {
    const groupName = String(group?.groupName || "QQ 音乐榜单");
    const lists = Array.isArray(group?.toplist) ? group.toplist : [];
    return lists.map((item) => ({
      id: String(item?.topId || ""),
      name: String(item?.title || "QQ 音乐榜单"),
      description: String(item?.updateTips || item?.intro || groupName).replace(/<[^>]+>/g, " ").trim(),
      cover: normalizeMediaUrl(item?.frontPicUrl || item?.mbFrontPicUrl || ""),
      count: Number(item?.totalNum || 0),
    })).filter((item) => item.id);
  }).slice(0, 30);
}

function parseToplistQQSongs(resp, id) {
  const data = resp?.toplist?.data || {};
  const info = data?.data || {};
  const songs = Array.isArray(data?.songInfoList) ? data.songInfoList : [];
  return {
    id: String(info?.topId || id),
    name: String(info?.title || "QQ 音乐榜单"),
    cover: normalizeMediaUrl(info?.frontPicUrl || info?.mbFrontPicUrl || ""),
    songs: songs.map((item) => ({
      id: String(item?.mid || ""),
      name: String(item?.name || item?.title || "未知歌曲"),
      artist: (Array.isArray(item?.singer) ? item.singer : []).map((singer) => singer?.name || singer?.title).filter(Boolean).join(", "),
      album: String(item?.album?.name || item?.album?.title || ""),
      cover: normalizeMediaUrl(qqAlbumCoverUrl(item?.album || {})),
    })).filter((item) => item.id),
  };
}

async function callToplists(platform) {
  if (platform === "netease") {
    const { status, json } = await upstreamJson("https://music.163.com/api/toplist", {
      headers: NETEASE_WEB_HEADERS,
    });
    if (status < 200 || status >= 300 || !json) throw new Error(`上游请求失败 (${status})`);
    return parseToplistsNetease(json);
  }

  if (platform === "qq") {
    const body = {
      comm: { cv: 4747474, ct: 24, format: "json", inCharset: "utf-8", outCharset: "utf-8", platform: "yqq.json", needNewCode: 1 },
      toplist: { module: "musicToplist.ToplistInfoServer", method: "GetAll", param: {} },
    };
    const { status, json } = await upstreamJson("https://u.y.qq.com/cgi-bin/musicu.fcg", {
      method: "POST",
      headers: { "Content-Type": "application/json", Referer: "https://y.qq.com/" },
      body: JSON.stringify(body),
    });
    if (status < 200 || status >= 300 || !json) throw new Error(`上游请求失败 (${status})`);
    return parseToplistsQQ(json);
  }

  if (platform === "kuwo") {
    throw new Error("酷我官网榜单暂不允许匿名读取");
  }

  throw new Error("不支持的平台");
}

async function callToplist(platform, id) {
  if (platform === "netease") {
    const data = await callPlaylist(platform, id);
    return { id, name: "网易云榜单", cover: "", songs: data.list || [] };
  }

  if (platform === "qq") {
    const body = {
      comm: { cv: 4747474, ct: 24, format: "json", inCharset: "utf-8", outCharset: "utf-8", platform: "yqq.json", needNewCode: 1 },
      toplist: { module: "musicToplist.ToplistInfoServer", method: "GetDetail", param: { topid: Number(id), offset: 0, num: 100 } },
    };
    const { status, json } = await upstreamJson("https://u.y.qq.com/cgi-bin/musicu.fcg", {
      method: "POST",
      headers: { "Content-Type": "application/json", Referer: "https://y.qq.com/" },
      body: JSON.stringify(body),
    });
    if (status < 200 || status >= 300 || !json) throw new Error(`上游请求失败 (${status})`);
    return parseToplistQQSongs(json, id);
  }

  if (platform === "kuwo") {
    const isNew = id === "new";
    let lastError = null;
    for (const baseUrl of KUWO_TOPLIST_ENDPOINTS) {
      const endpoint = new URL(baseUrl);
      if (isNew) endpoint.searchParams.set("type", "new");
      try {
        const { status, json } = await upstreamJson(endpoint.toString(), {
          headers: {
            Accept: "application/json, text/plain, */*",
            Origin: "https://www.qqmp3.vip",
            Referer: "https://www.qqmp3.vip/",
            "User-Agent": "Mozilla/5.0",
          },
        });
        const rows = Array.isArray(json?.data) ? json.data : [];
        if (status < 200 || status >= 300 || Number(json?.code) !== 200 || rows.length === 0) {
          throw new Error(`上游请求失败 (${status})`);
        }
        return {
          id,
          name: isNew ? "酷我新歌榜" : "酷我热歌榜",
          cover: "",
          songs: rows.slice(0, 50).map((item, index) => ({
            // 该榜单数据没有酷我歌曲 ID；前端在用户操作歌曲时再按歌名和歌手匹配酷我 ID。
            id: `kuwo-chart-${String(item?.rid || index)}`,
            name: String(item?.name || "未知歌曲"),
            artist: String(item?.artist || "未知歌手"),
            album: "",
            cover: normalizeMediaUrl(item?.pic || ""),
            lookupOnly: true,
          })).filter((item) => item.name && item.artist),
        };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("酷我榜单暂不可用");
  }

  throw new Error("该音乐源暂不支持榜单详情");
}

async function handleToplists(request, env) {
  const platform = String(new URL(request.url).searchParams.get("platform") || "").trim();
  if (!platform) return jsonResponse(400, { code: -1, message: "缺少参数: platform" });
  if (await isSourceDisabled(env, platform)) {
    return jsonResponse(503, { code: -1, message: "该平台已被管理员禁用" });
  }
  try {
    const data = await monitoredServiceCall(env, { source: platform, operation: "toplists" }, () => callToplists(platform));
    return jsonResponse(200, { code: 0, message: "Success", data });
  } catch (err) {
    return jsonResponse(502, { code: -1, message: err instanceof Error ? err.message : "获取榜单失败" });
  }
}

async function handleToplist(request, env) {
  const url = new URL(request.url);
  const platform = String(url.searchParams.get("platform") || "").trim();
  const id = String(url.searchParams.get("id") || "").trim();
  if (!platform || !id) return jsonResponse(400, { code: -1, message: "缺少参数: platform / id" });
  if (await isSourceDisabled(env, platform)) {
    return jsonResponse(503, { code: -1, message: "该平台已被管理员禁用" });
  }
  try {
    const data = await monitoredServiceCall(env, { source: platform, operation: "toplist" }, () => callToplist(platform, id));
    return jsonResponse(200, { code: 0, message: "Success", data });
  } catch (err) {
    return jsonResponse(502, { code: -1, message: err instanceof Error ? err.message : "获取榜单详情失败" });
  }
}

function parseJsonpJson(text) {
  try {
    return JSON.parse(String(text || ""));
  } catch {
    const raw = String(text || "").trim();
    const start = raw.indexOf("(");
    const end = raw.lastIndexOf(")");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start + 1, end));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callPlaylists(platform) {
  if (platform === "netease") {
    const endpoint = new URL("https://music.163.com/api/playlist/list");
    endpoint.searchParams.set("cat", "全部");
    endpoint.searchParams.set("order", "hot");
    endpoint.searchParams.set("limit", "30");
    endpoint.searchParams.set("offset", "0");
    const { status, json } = await upstreamJson(endpoint.toString(), {
      headers: NETEASE_WEB_HEADERS,
    });
    if (status < 200 || status >= 300 || !json) throw new Error(`上游请求失败 (${status})`);
    const playlists = Array.isArray(json?.playlists) ? json.playlists : [];
    return playlists.slice(0, 30).map((item) => ({
      id: String(item?.id || ""),
      name: String(item?.name || "热门歌单"),
      cover: normalizeMediaUrl(item?.coverImgUrl || item?.picUrl || ""),
      trackCount: Number(item?.trackCount || 0),
      playCount: Number(item?.playCount || item?.subscribedCount || 0),
    })).filter((item) => item.id);
  }

  if (platform === "qq") {
    const endpoint = new URL("https://c.y.qq.com/splcloud/fcgi-bin/fcg_get_diss_by_tag.fcg");
    endpoint.searchParams.set("new_format", "1");
    endpoint.searchParams.set("picmid", "1");
    endpoint.searchParams.set("rnd", String(Math.random()));
    endpoint.searchParams.set("categoryId", "10000000");
    endpoint.searchParams.set("sortId", "5");
    endpoint.searchParams.set("sin", "0");
    endpoint.searchParams.set("ein", "29");
    // 此接口仍会以 GBK/GB18030 回传中文；默认 UTF-8 解码会产生 � 字符。
    const { status, text } = await upstreamJson(endpoint.toString(), {
      headers: {
        Origin: "https://y.qq.com",
        Referer: "https://y.qq.com/",
        "User-Agent": "Mozilla/5.0",
      },
    }, "gb18030");
    if (status < 200 || status >= 300) throw new Error(`上游请求失败 (${status})`);
    const json = parseJsonpJson(text);
    const list = Array.isArray(json?.data?.list) ? json.data.list : [];
    return list.slice(0, 30).map((item) => ({
      id: String(item?.dissid || ""),
      name: String(item?.dissname || "热门歌单"),
      cover: normalizeMediaUrl(item?.imgurl || item?.picurl || ""),
      trackCount: Number(item?.songnum || item?.song_cnt || 0),
      playCount: Number(item?.listennum || 0),
    })).filter((item) => item.id);
  }

  throw new Error("不支持的平台");
}

async function handlePlaylists(request, env) {
  const url = new URL(request.url);
  const platform = String(url.searchParams.get("platform") || "netease").trim();
  if (await isSourceDisabled(env, platform)) {
    return jsonResponse(503, { code: -1, message: "该平台已被管理员禁用" });
  }
  try {
    const playlists = await monitoredServiceCall(env, { source: platform, operation: "playlists" }, () => callPlaylists(platform));
    return jsonResponse(200, { code: 0, message: "Success", data: { playlists } });
  } catch (err) {
    return jsonResponse(502, { code: -1, message: err instanceof Error ? err.message : "获取歌单列表失败" });
  }
}

async function handleMethod(request, env) {

  const url = new URL(request.url);
  const platform = String(url.searchParams.get("platform") || "").trim();
  const functionName = String(url.searchParams.get("functionName") || "").trim();
  if (!platform || !functionName) {
    return jsonResponse(400, { code: -1, message: "缺少参数: platform / functionName" });
  }
  if (await isSourceDisabled(env, platform)) {
    return jsonResponse(503, { code: -1, message: "该平台已被管理员禁用" });
  }

  try {
    if (functionName === "search") {
      const keyword = String(url.searchParams.get("keyword") || "").trim();
      if (!keyword) return jsonResponse(400, { code: -1, message: "缺少参数: keyword" });
      const page = toPositiveInt(url.searchParams.get("page"), 1);
      const limit = toPositiveInt(url.searchParams.get("limit"), 20);
      const data = await monitoredServiceCall(env, { source: platform, operation: "search" }, () => callSearch(platform, keyword, page, limit));
      return jsonResponse(200, { code: 0, message: "Success", data });
    }

    if (functionName === "playlist") {
      const id = String(url.searchParams.get("id") || "").trim();
      if (!id) return jsonResponse(400, { code: -1, message: "缺少参数: id" });
      const data = await monitoredServiceCall(env, { source: platform, operation: "playlist" }, () => callPlaylist(platform, id));
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

// 统一搜索入口：优先主搜索，失败后仅在 Worker 内部使用多源搜索兜底。
// 前端不再感知或调用旧 backup* 路由。
async function handleSearch(request, env) {
  const url = new URL(request.url);
  const platform = normalizeBackup4Platform(url.searchParams.get("platform"));
  const keyword = String(url.searchParams.get("keyword") || "").trim();
  const page = toPositiveInt(url.searchParams.get("page"), 1);
  const limit = Math.min(50, toPositiveInt(url.searchParams.get("limit"), 20));
  if (!BACKUP4_ALLOWED_PLATFORMS.has(platform) || !keyword) {
    return jsonResponse(400, { code: -1, message: "缺少或无效参数: platform / keyword" });
  }
  if (await isSourceDisabled(env, platform)) {
    return jsonResponse(503, { code: -1, message: "该平台已被管理员禁用" });
  }
  try {
    const list = await monitoredServiceCall(env, { source: platform, operation: "search" }, () => callSearch(platform, keyword, page, limit));
    if (Array.isArray(list) && list.length) {
      return jsonResponse(200, { code: 0, message: "Success", data: list, provider: "primary" }, { "Cache-Control": "no-store" });
    }
  } catch {
    // Continue to the internal fallback chain.
  }
  try {
    const fallback = await backup4Search(platform, keyword, page, limit, env);
    return jsonResponse(200, { code: 0, message: "Success", data: fallback.list || [], provider: "resolver_search" }, { "Cache-Control": "no-store" });
  } catch (error) {
    return jsonResponse(502, { code: -1, message: error instanceof Error ? error.message : "搜索失败", data: [] });
  }
}

// 小爱音箱外部搜索源（topone 规范，供 Songloft 智能音箱插件配置）：
// POST /api/topone?platform=netease,qq,kuwo
// Body: { keyword, hint?, quality? }
// Auth: Authorization: Bearer <KEY> 或 X-DM-Key: <KEY>（只验 Key，设备绑定为后续锚点）
// 各平台并发搜索，按平台优先级消费结果；平台内按标题匹配度 + 歌手提示优先尝试候选，
// 取第一个能解析出播放地址的结果（整体预算 5.5 秒，单平台预算 4 秒）。
async function handleTopone(request, env, ctx) {
  const startedAt = Date.now();
  const body = await parseJsonBody(request);
  const keyword = String(body?.keyword || "").trim();
  if (!keyword) {
    return jsonResponse(400, { code: 400, msg: "缺少参数: keyword", data: null });
  }
  const quality = backup4NormalizeQuality(body?.quality || "320k");
  const hintTitle = String(body?.hint?.title || "").trim();
  const hintArtist = String(body?.hint?.artist || "").trim();
  // 带歌手提示时把「歌名 + 歌手」拼进搜索词，平台侧更容易命中原唱版本。
  const searchKeyword = hintArtist ? `${hintTitle || keyword} ${hintArtist}` : keyword;

  const key = getToponeApiKey(request);
  if (!key) {
    return jsonResponse(401, { code: 401, msg: "缺少 API Key", data: null });
  }
  const auth = await validateApiKeyOnly(requestWithApiKeyHeader(request, key), env);
  if (!auth || auth.error) {
    const status = auth?.error?.status || 401;
    const payload = auth?.error ? await auth.error.json().catch(() => null) : null;
    return jsonResponse(status, { code: payload?.code ?? -1, msg: payload?.message || "API Key 无效", data: null });
  }

  const url = new URL(request.url);
  const requested = String(url.searchParams.get("platform") || "").trim().toLowerCase();
  const platforms = requested
    ? requested.split(",").map(normalizeBackup4Platform).filter((p) => BACKUP4_ALLOWED_PLATFORMS.has(p))
    : ["netease", "qq", "kuwo"];
  if (platforms.length === 0) {
    return jsonResponse(400, { code: 400, msg: "platform 参数无效", data: null });
  }

  const overallBudgetMs = 5500;
  const tasks = platforms.map((platform) =>
    runToponePlatform(platform, searchKeyword, keyword, hintArtist, quality, env, ctx, startedAt),
  );
  for (let i = 0; i < tasks.length; i += 1) {
    const result = await withTimeout(tasks[i], overallBudgetMs - (Date.now() - startedAt));
    if (!result) continue;
    const { hit, parseData } = result;
    console.log(`[topone] hit platform=${result.platform} id=${hit.id} elapsed=${Date.now() - startedAt}ms`);
    return jsonResponse(200, {
      code: 0,
      msg: "success",
      data: {
        title: hit.name,
        artist: hit.artist,
        album: hit.album || undefined,
        cover_url: hit.cover || undefined,
        url: parseData.url,
        source_data: {
          platform: result.platform,
          quality,
          songInfo: { id: hit.id },
        },
      },
    });
  }

  console.log(`[topone] done 404 elapsed=${Date.now() - startedAt}ms keyword=${keyword}`);
  return jsonResponse(404, { code: 404, msg: "未找到歌曲", data: null });
}

async function runToponePlatform(platform, searchKeyword, title, artist, quality, env, ctx, startedAt) {
  if (await isSourceDisabled(env, platform)) return null;

  const candidates = await withTimeout(searchToponeCandidates(platform, searchKeyword, env), 4000);
  if (!Array.isArray(candidates) || candidates.length === 0) {
    console.log(`[topone] ${platform} search none keyword=${searchKeyword}`);
    return null;
  }
  const sorted = toponeSortCandidates(candidates, title, artist);

  const platformBudgetMs = 4000;
  const platformStartedAt = Date.now();
  for (const hit of sorted.slice(0, 4)) {
    if (Date.now() - platformStartedAt > platformBudgetMs) break;
    if (Date.now() - startedAt > 5200) break;
    const parseData = await withTimeout(parseToponeCandidate(platform, hit, quality, env, ctx), 1500);
    if (parseData && parseData.url) {
      return { platform, hit, parseData };
    }
  }
  console.log(`[topone] ${platform} no parseable candidate keyword=${searchKeyword}`);
  return null;
}

async function searchToponeCandidates(platform, keyword, env) {
  // 官方直连 / TuneHub 与 backup4 备用搜索链并发跑，优先采纳官方结果，
  // 官方被上游屏蔽（返回空）时用备用链结果兜底。
  const primary = (async () => {
    try {
      const list = await monitoredServiceCall(env, { source: platform, operation: "search" }, () =>
        callSearch(platform, keyword, 1, 5),
      );
      return Array.isArray(list) && list.length > 0 ? list : null;
    } catch {
      return null;
    }
  })();
  const backup = (async () => {
    try {
      const result = await backup4Search(platform, keyword, 1, 5, env);
      return Array.isArray(result?.list) && result.list.length > 0 ? result.list : null;
    } catch {
      return null;
    }
  })();

  const primaryResult = await withTimeout(primary, 2000);
  if (Array.isArray(primaryResult) && primaryResult.length > 0) return primaryResult;
  const backupResult = await withTimeout(backup, 3000);
  if (Array.isArray(backupResult) && backupResult.length > 0) return backupResult;
  return [];
}

async function parseToponeCandidate(platform, hit, quality, env, ctx) {
  try {
    return await resolveWithHedging({
      platform,
      id: String(hit.id || ""),
      quality: backup4NormalizeQuality(quality),
      name: String(hit.name || ""),
      artist: String(hit.artist || ""),
      album: String(hit.album || ""),
      cover: normalizeMediaUrl(hit.cover || ""),
    }, env, ctx);
  } catch {
    return null;
  }
}

function toponeSortCandidates(list, title, artist) {
  const normalizedTitle = String(title || "").replace(/\s+/g, "").toLowerCase();
  const artistTokens = String(artist || "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .split(/[,，/、&]/)
    .filter(Boolean);
  return [...list].sort((a, b) => {
    const scoreA = toponeCandidateScore(a, normalizedTitle, artistTokens);
    const scoreB = toponeCandidateScore(b, normalizedTitle, artistTokens);
    return scoreB - scoreA;
  });
}

function toponeCandidateScore(item, normalizedTitle, artistTokens) {
  const title = String(item?.name || "");
  const normalized = String(title || "").replace(/\s+/g, "").toLowerCase();
  let score = 0;
  if (normalizedTitle) {
    if (normalized === normalizedTitle) score += 100;
    else if (normalized.startsWith(normalizedTitle)) score += 60;
    else if (normalized.includes(normalizedTitle)) score += 30;
  }
  const candidateArtist = String(item?.artist || "").replace(/\s+/g, "").toLowerCase();
  if (artistTokens.length > 0 && artistTokens.some((token) => token && candidateArtist.includes(token))) {
    score += 50;
  }
  return score;
}

function withTimeout(promise, ms) {
  const timeoutMs = Math.max(1, Math.floor(Number(ms) || 1000));
  return Promise.race([promise, sleep(timeoutMs).then(() => null)]);
}

async function handleBackup(request, env) {
  const reqUrl = new URL(request.url);
  const types = String(reqUrl.searchParams.get("types") || "").trim();
  if (!BACKUP_ALLOWED_TYPES.has(types)) {
    return jsonResponse(400, { code: -1, message: "备用源参数无效: types" });
  }
  if (types !== "search" && types !== "pic") {
    const auth = await requireMusicAccess(request, env);
    if (!auth.ok) return auth.response;
  }
  if (await isSourceDisabled(env, "gdstudio")) {
    return jsonResponse(503, { code: -1, message: "该源已被管理员禁用" });
  }

  const backupUrl = new URL(BACKUP_API_URL);

  for (const [key, value] of reqUrl.searchParams.entries()) {
    if (!BACKUP_ALLOWED_PARAMS.has(key)) continue;
    const text = String(value || "").trim();
    if (!text) continue;
    backupUrl.searchParams.set(key, text);
  }

  const source = String(backupUrl.searchParams.get("source") || "").trim();
  if (!BACKUP_ALLOWED_SOURCES.has(source)) {
    return jsonResponse(400, { code: -1, message: "备用源参数无效: source" });
  }

  const isPic = types === "pic";
  const startedAt = Date.now();
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
        await recordServiceMetric(env, {
          source: "gdstudio",
          operation: `backup_${types}`,
          success: true,
          status: upstream.status,
          durationMs: Date.now() - startedAt,
        });
        if (types === "url") await recordFinalParseHit(env, "gdstudio", Date.now() - startedAt);
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
    await recordServiceMetric(env, {
      source: "gdstudio",
      operation: `backup_${types}`,
      success: false,
      status: lastStatus,
      durationMs: Date.now() - startedAt,
      error: "上游失败，已返回封面缓存",
    });
    const headers = new Headers(cached.headers);
    headers.set("X-Backup-Stale", "1");
    headers.set("Cache-Control", "public, max-age=43200");
    return new Response(cached.body, {
      status: 200,
      headers,
    });
  }

  await recordServiceMetric(env, {
    source: "gdstudio",
    operation: `backup_${types}`,
    success: false,
    status: lastStatus,
    durationMs: Date.now() - startedAt,
    error: `上游请求失败 (${lastStatus})`,
  });

  return new Response(lastText, {
    status: lastStatus,
    headers: {
      "Content-Type": lastContentType,
      "Cache-Control": "no-store",
    },
  });
}

function getSingerNames(singerList) {
  const list = Array.isArray(singerList) ? singerList : [];
  const names = list
    .map((item) => String(item?.name || "").trim())
    .filter(Boolean);
  return names.join(", ");
}

function buildQqAlbumCover(albummid) {
  const mid = String(albummid || "").trim();
  if (!mid) return "";
  return `https://y.gtimg.cn/music/photo_new/T002R500x500M000${mid}.jpg`;
}

function buildQqSongLink(songmid) {
  const mid = String(songmid || "").trim();
  if (!mid) return "";
  return `https://y.qq.com/n/ryqq/songDetail/${mid}`;
}

async function callQqBackup3Search({ keyword, page, limit }) {
  const endpoint = new URL(QQ_BACKUP3_SEARCH_URL);
  endpoint.searchParams.set("key", String(keyword || ""));
  endpoint.searchParams.set("t", "0");
  endpoint.searchParams.set("pageNo", String(page || 1));
  endpoint.searchParams.set("pageSize", String(limit || 20));

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(QQ_BACKUP3_TIMEOUT_MS),
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0",
      Referer: "https://yutangxiaowu.cn/step/api/qmusic.html",
    },
  });
  const text = await response.text();
  return { response, text, parsed: parseJsonText(text) };
}

async function callQqBackup3ParseBySongmid(songmid, timeoutMs = QQ_BACKUP3_TIMEOUT_MS) {
  const endpoint = new URL(QQ_BACKUP3_PARSE_URL);
  endpoint.searchParams.set("songmid", String(songmid || ""));
  const response = await fetch(endpoint.toString(), {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0",
      Referer: "https://yutangxiaowu.cn/step/api/qqmusic.html",
    },
  });
  const text = await response.text();
  return { response, text, parsed: parseJsonText(text) };
}

function normalizeQqBackup3SearchList(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map((item) => {
      const songmid = String(item?.songmid || "").trim();
      const songid = songmid || String(item?.songid || "").trim();
      const cover = buildQqAlbumCover(item?.albummid);
      return {
        songid,
        title: String(item?.songname || "未知歌曲"),
        author: getSingerNames(item?.singer) || "未知歌手",
        url: "",
        pic: cover,
        lrc: "",
        link: buildQqSongLink(songmid),
      };
    })
    .filter((item) => String(item.songid || "").trim());
}

function normalizeQqBackup3ParseToList(parsed) {
  const success = Boolean(parsed?.success);
  if (!success) return [];

  const songmid = String(parsed?.songmid || "").trim();
  const detail = parsed?.detail && typeof parsed.detail === "object" ? parsed.detail : {};
  const streamUrl = String(parsed?.url || "").trim();

  if (!songmid || !streamUrl) {
    return [];
  }

  return [{
    songid: songmid,
    title: String(detail?.songName || songmid),
    author: String(detail?.singer || "未知歌手"),
    url: streamUrl,
    pic: "",
    lrc: String(parsed?.lyric || ""),
    link: buildQqSongLink(songmid),
  }];
}

function getBackup3PayloadMessage(payload, fallback = "备用源3请求失败") {
  return String(
    payload?.errMsg
    || payload?.error
    || payload?.message
    || fallback,
  );
}

async function handleBackup3(request, env) {
  const reqUrl = new URL(request.url);
  const input = String(reqUrl.searchParams.get("input") || "").trim();
  const filter = String(reqUrl.searchParams.get("filter") || "name").trim();
  const type = String(reqUrl.searchParams.get("type") || "").trim();
  const page = toPositiveInt(reqUrl.searchParams.get("page"), 1);

  if (!input || !type) {
    return jsonResponse(400, { code: -1, message: "缺少参数: input / type" });
  }
  if (!QQ_BACKUP3_ALLOWED_FILTERS.has(filter)) {
    return jsonResponse(400, { code: -1, message: "备用源3参数无效: filter" });
  }
  if (type !== "qq") {
    return jsonResponse(400, { code: -1, message: "备用源3仅支持 QQ 平台" });
  }
  if (filter !== "name") {
    const auth = await requireMusicAccess(request, env);
    if (!auth.ok) return auth.response;
  }
  if (await isSourceDisabled(env, "qq_backup3")) {
    return jsonResponse(503, { code: -1, message: "该源已被管理员禁用" });
  }

  const startedAt = Date.now();
  const maxAttempts = 2;
  let lastStatus = 502;
  let lastPayload = { code: -1, message: "备用源3请求失败" };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      let response = null;
      let text = "";
      let parsed = null;
      let data = [];
      let payloadOk = false;

      if (filter === "name") {
        const requestLimit = 20;
        const requestPage = page;
        const result = await callQqBackup3Search({
          keyword: input,
          page: requestPage,
          limit: requestLimit,
        });
        response = result.response;
        text = result.text;
        parsed = result.parsed;
        const rawList = Array.isArray(parsed?.data?.list) ? parsed.data.list : [];
        data = normalizeQqBackup3SearchList(rawList);
        payloadOk = Number(parsed?.result) === 100;
      } else {
        const result = await callQqBackup3ParseBySongmid(input);
        response = result.response;
        text = result.text;
        parsed = result.parsed;
        data = normalizeQqBackup3ParseToList(parsed);
        payloadOk = Boolean(parsed?.success) && data.length > 0;
      }

      if (response.ok && parsed && typeof parsed === "object" && payloadOk) {
        await recordServiceMetric(env, {
          source: "qq_backup3",
          operation: filter === "id" ? "parse" : "search",
          success: true,
          status: response.status,
          durationMs: Date.now() - startedAt,
        });
        if (filter === "id") await recordFinalParseHit(env, "qq_backup3", Date.now() - startedAt);
        return jsonResponse(200, {
          code: 200,
          message: getBackup3PayloadMessage(parsed, "Success"),
          data,
        }, {
          "Cache-Control": "no-store",
        });
      }

      lastStatus = response.ok ? 502 : (response.status || 502);
      lastPayload = parsed && typeof parsed === "object"
        ? parsed
        : { code: -1, message: text || `备用源3请求失败 (${lastStatus})` };

      const canRetry = response.status >= 500 || response.status === 429 || response.ok;
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

  await recordServiceMetric(env, {
    source: "qq_backup3",
    operation: filter === "id" ? "parse" : "search",
    success: false,
    status: lastStatus,
    durationMs: Date.now() - startedAt,
    error: `QQ 备用源请求失败 (${lastStatus})`,
  });

  return jsonResponse(lastStatus, {
    code: Number(lastPayload?.code ?? lastPayload?.result ?? -1),
    message: getBackup3PayloadMessage(lastPayload, "备用源3请求失败"),
    data: [],
  });
}

function normalizeBackup4Platform(platform) {
  const raw = String(platform || "").trim().toLowerCase();
  if (raw === "tx" || raw === "tencent") return "qq";
  if (raw === "wy") return "netease";
  if (raw === "kw") return "kuwo";
  return raw;
}

function backup4PlatformCode(platform) {
  if (platform === "qq") return "tx";
  if (platform === "netease") return "wy";
  if (platform === "kuwo") return "kw";
  return "";
}

function backup4JkapiPlatformCode(platform) {
  if (platform === "netease") return "wy";
  if (platform === "qq") return "qq";
  return "";
}

function backup4NormalizeQuality(quality) {
  const text = String(quality || "").trim().toLowerCase();
  return text.startsWith("128") ? "128k" : "320k";
}

function backup4BrFromQuality(quality) {
  return backup4NormalizeQuality(quality) === "128k" ? 128 : 320;
}

function backup4BuildKuwoKeyword(name, artist, fallbackId) {
  const title = String(name || "").trim();
  const singer = String(artist || "").trim();
  const merged = `${title}${singer}`.trim();
  if (merged) return merged;
  return String(fallbackId || "").trim();
}

function backup4ExtractLinkFromMessage(message) {
  const text = String(message || "");
  const matched = text.match(/音乐链接[：:](\S+)/);
  return normalizeMediaUrl(matched?.[1] || "");
}

async function backup4Json(url, { headers, timeoutMs = BACKUP4_TIMEOUT_MS } = {}) {
  const result = await upstreamJson(url, {
    method: "GET",
    headers: headers || { Accept: "application/json, text/plain, */*" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  return {
    ...result,
    ok: result.status >= 200 && result.status < 300,
    json: result.json || {},
  };
}

async function backup4TryGdstudio(platform, id, quality) {
  if (platform !== "netease" && platform !== "kuwo") return null;

  const source = platform === "netease" ? "netease" : "kuwo";
  const endpoint = new URL(BACKUP_API_URL);
  endpoint.searchParams.set("types", "url");
  endpoint.searchParams.set("source", source);
  endpoint.searchParams.set("id", id);
  endpoint.searchParams.set("br", String(backup4BrFromQuality(quality)));

  const response = await backup4Json(endpoint.toString());
  const parsed = response.json;
  const url = normalizeMediaUrl(parsed?.url || "");
  if (response.ok && url) {
    return { url, provider: "gdstudio" };
  }
  throw new Error(String(parsed?.detail || parsed?.message || `gdstudio failed (${response.status})`));
}

async function backup4TryOnrender(platform, id, quality, env) {
  const source = backup4PlatformCode(platform);
  if (!source) return null;
  const requestKey = String(env.BACKUP4_LXMUSIC_ONRENDER_KEY || "").trim();
  if (!requestKey) throw new Error("Onrender signing secret is not configured");

  const endpoint = `${BACKUP4_LXMUSIC_ONRENDER_URL}/url/${source}/${encodeURIComponent(id)}/${backup4NormalizeQuality(quality)}`;
  const response = await backup4Json(endpoint, {
    headers: {
      "Content-Type": "application/json",
      "X-Request-Key": requestKey,
      "User-Agent": "Mozilla/5.0",
    },
  });
  const parsed = response.json;
  const url = normalizeMediaUrl(parsed?.url || "");
  if (response.ok && Number(parsed?.code) === 0 && url) {
    return { url, provider: "onrender" };
  }
  throw new Error(String(parsed?.msg || parsed?.message || `onrender failed (${response.status})`));
}

async function backup4TryLxmusicSigned(platform, id, quality, env) {
  const source = backup4PlatformCode(platform);
  if (!source) return null;
  const scriptMd5 = String(env.BACKUP4_LXMUSIC_SCRIPT_MD5 || "").trim();
  const secretKey = String(env.BACKUP4_LXMUSIC_SECRET_KEY || "").trim();
  if (!scriptMd5 || !secretKey) throw new Error("LXMusic signing secrets are not configured");

  const q = backup4NormalizeQuality(quality);
  const requestPath = `/lxmusicv4/url/${source}/${id}/${q}`;
  const sign = await sha256Hex(`${requestPath}${scriptMd5}${secretKey}`);
  const endpoint = `${BACKUP4_LXMUSIC_SIGNED_URL}${requestPath}?sign=${sign}`;

  const response = await backup4Json(endpoint, {
    headers: {
      Accept: "application/json",
      "x-request-key": "lxmusic",
      "user-agent": "lx-music-mobile/2.0.0",
    },
  });
  const parsed = response.json;
  const url = normalizeMediaUrl(parsed?.data || "");
  if (response.ok && Number(parsed?.code) === 0 && url) {
    return { url, provider: "lxmusic_signed" };
  }
  throw new Error(String(parsed?.msg || parsed?.message || `lxmusic signed failed (${response.status})`));
}

async function backup4TryOiapiMusic163(platform, id) {
  if (platform !== "netease") return null;

  const endpoint = new URL(BACKUP4_OIAPI_MUSIC163_URL);
  endpoint.searchParams.set("id", id);

  const response = await backup4Json(endpoint.toString());
  const parsed = response.json;
  const first = Array.isArray(parsed?.data) ? parsed.data[0] : null;
  const url = normalizeMediaUrl(first?.url || "");
  if (response.ok && Number(parsed?.code) === 0 && url) {
    return { url, provider: "oiapi_music163" };
  }
  throw new Error(String(parsed?.message || `oiapi music163 failed (${response.status})`));
}

async function backup4TryChkszMusic163(platform, id, quality, env) {
  if (platform !== "netease") return null;
  const apiKey = String(env.CHKSZ_API_KEY || "").trim();
  if (!apiKey) return null;

  const endpoint = new URL(`${BACKUP4_CHKSZ_API_URL}/163_music`);
  endpoint.searchParams.set("id", id);
  endpoint.searchParams.set("level", backup4ChkszLevel(quality));
  endpoint.searchParams.set("apikey", apiKey);

  const response = await backup4Json(endpoint.toString());
  const parsed = response.json;
  const url = normalizeMediaUrl(parsed?.data?.url || "");
  if (response.ok && Number(parsed?.code) === 200 && url) {
    return { url, provider: "chksz_163" };
  }
  throw new Error(String(parsed?.msg || parsed?.message || `chksz music163 failed (${response.status})`));
}

function backup4ChkszLevel(quality) {
  const text = String(quality || "").trim().toLowerCase();
  if (text.startsWith("128")) return "standard";
  if (text.startsWith("flac")) return text.includes("24") ? "hires" : "lossless";
  return "jymaster";
}

async function backup4TryBugpk(platform, id, quality, name, artist) {
  if (platform === "netease") {
    const endpoint = new URL(`${BACKUP4_BUGPK_API_ROOT}/163_music`);
    endpoint.searchParams.set("ids", String(id));
    endpoint.searchParams.set("level", backup4NormalizeQuality(quality) === "128k" ? "standard" : "lossless");
    endpoint.searchParams.set("type", "json");
    const title = String(name || "").trim();
    if (title && !title.startsWith("ID ")) endpoint.searchParams.set("s", title);

    const response = await backup4Json(endpoint.toString(), {
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0",
      },
    });
    const parsed = response.json;
    const url = normalizeMediaUrl(parsed?.url || "");
    if (response.ok && Number(parsed?.status) === 200 && isHttpUrl(url)) {
      return { url, provider: "bugpk", lyrics: String(parsed?.lyric || "") };
    }
    const error = new Error(String(parsed?.msg || parsed?.message || `bugpk netease failed (${response.status})`));
    error.status = response.status;
    throw error;
  }

  if (platform !== "qq") return null;

  const endpoint = new URL(`${BACKUP4_BUGPK_API_ROOT}/qqmusic`);
  endpoint.searchParams.set("url", `https://y.qq.com/n/ryqq/songDetail/${encodeURIComponent(String(id))}`);
  endpoint.searchParams.set("type", "song");
  const title = String(name || "").trim();
  if (title && !title.startsWith("ID ")) endpoint.searchParams.set("name", title);

  const response = await backup4Json(endpoint.toString(), {
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0",
    },
  });
  const parsed = response.json;
  const url = normalizeMediaUrl(parsed?.url || parsed?.data?.url || "");
  if (response.ok && isHttpUrl(url)) {
    return { url, provider: "bugpk", lyrics: String(parsed?.lrc_data || parsed?.lyric || "") };
  }
  const error = new Error(String(parsed?.message || parsed?.msg || `bugpk qq failed (${response.status})`));
  error.status = response.status;
  throw error;
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(String(value || ""));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function backup4TryPaugramNetease(platform, id) {
  if (platform !== "netease") return null;

  const endpoint = new URL(BACKUP4_PAUGRAM_NETEASE_URL);
  endpoint.searchParams.set("id", id);
  const response = await backup4Json(endpoint.toString(), {
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0",
    },
  });
  const parsed = response.json;
  const url = normalizeMediaUrl(parsed?.link || parsed?.url || "");
  if (response.ok && url) {
    return { url, provider: "paugram_netease" };
  }
  const error = new Error(String(parsed?.message || parsed?.msg || `paugram netease failed (${response.status})`));
  error.status = response.status;
  throw error;
}

async function backup4TryOiapiKuwo(platform, id, quality, name, artist) {
  if (platform !== "kuwo") return null;

  const keyword = backup4BuildKuwoKeyword(name, artist, id);
  if (!keyword) return null;

  const endpoint = new URL(BACKUP4_OIAPI_KUWO_URL);
  endpoint.searchParams.set("msg", keyword);
  endpoint.searchParams.set("n", "1");
  endpoint.searchParams.set("br", backup4NormalizeQuality(quality) === "128k" ? "7" : "5");

  const response = await backup4Json(endpoint.toString());
  const parsed = response.json;
  const url = normalizeMediaUrl(parsed?.data?.url || backup4ExtractLinkFromMessage(parsed?.message || ""));
  if (response.ok && Number(parsed?.code) === 1 && url) {
    return { url, provider: "oiapi_kuwo" };
  }
  throw new Error(String(parsed?.message || `oiapi kuwo failed (${response.status})`));
}

async function backup4TryQqmp3(platform, id) {
  if (platform !== "kuwo") return null;

  const songId = String(id || "").trim();
  if (!/^\d+$/.test(songId)) return null;

  const errors = [];
  for (const baseUrl of BACKUP4_QQMP3_ENDPOINTS) {
    const endpoint = new URL(baseUrl);
    endpoint.searchParams.set("rid", songId);
    endpoint.searchParams.set("type", "json");
    endpoint.searchParams.set("level", "exhigh");
    endpoint.searchParams.set("lrc", "true");

    try {
      const response = await backup4Json(endpoint.toString(), {
        timeoutMs: BACKUP4_QQMP3_TIMEOUT_MS,
      });
      const parsed = response.json;
      const url = normalizeMediaUrl(parsed?.url || parsed?.data?.url || parsed?.data?.play_url || "");
      const code = Number(parsed?.code);
      if (response.ok && (Number.isNaN(code) || code === 0 || code === 200) && url) {
        return { url, provider: "qqmp3" };
      }
      errors.push(String(parsed?.msg || parsed?.message || `qqmp3 failed (${response.status})`));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "qqmp3 request failed");
    }
  }

  throw new Error(errors.join("; ") || "qqmp3 failed");
}

async function backup4TryJkapi(platform, id, quality, name, artist, env) {
  const apiKey = String(env.JKAPI_API_KEY || "").trim();
  const source = backup4JkapiPlatformCode(platform);
  const title = String(name || "").trim();
  const singer = String(artist || "").trim();
  // JKAPI 的 Key 必须由本 Worker 的管理员配置；未配置时静默跳过该备用源。
  if (!apiKey || !source) return null;

  const candidates = [];
  const pushIfUsable = (value) => {
    const text = String(value || "").trim();
    if (!text || text === "未知歌手" || text === "未知歌曲" || text.startsWith("ID ")) return;
    if (!candidates.includes(text)) candidates.push(text);
  };
  pushIfUsable(title);
  pushIfUsable(`${title} ${singer}`);
  pushIfUsable(`${singer} ${title}`);

  // JKAPI 的 name 参数主要按歌名匹配；带歌手组合失败时逐个降级尝试。
  let lastError = null;
  for (const keyword of candidates) {
    try {
      const endpoint = new URL(String(env.JKAPI_API_URL || BACKUP4_JKAPI_URL).trim());
      endpoint.searchParams.set("plat", source);
      endpoint.searchParams.set("type", "json");
      endpoint.searchParams.set("apiKey", apiKey);
      endpoint.searchParams.set("name", keyword);
      const response = await backup4Json(endpoint.toString(), {
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Referer: "https://jkapi.com/",
        },
      });
      const parsed = response.json;
      const url = normalizeMediaUrl(parsed?.music_url || parsed?.data?.music_url || parsed?.data?.url || "");
      if (response.ok && Number(parsed?.code) === 1 && url) {
        return { url, provider: "jkapi" };
      }
      lastError = new Error(String(parsed?.msg || parsed?.message || `jkapi failed (${response.status})`));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("jkapi 无结果");
}

async function backup4TryQqBackup3(platform, id) {
  if (platform !== "qq") return null;

  const result = await callQqBackup3ParseBySongmid(id, 6000);
  const url = normalizeMediaUrl(result?.parsed?.url?.url || result?.parsed?.url || "");
  if (result?.response?.ok && result?.parsed?.success && url) {
    return { url, provider: "qq_backup3_parse", lyrics: String(result?.parsed?.lyric || "") };
  }
  throw new Error(String(result?.parsed?.errMsg || "qq backup3 parse failed"));
}

async function backup4TryYutangNetease(platform, id, quality) {
  if (platform !== "netease") return null;
  const endpoint = new URL(`${YUTANG_API_ROOT}/api/music/Song_V1`);
  endpoint.searchParams.set("url", `https://music.163.com/song?id=${encodeURIComponent(id)}`);
  endpoint.searchParams.set("level", backup4NormalizeQuality(quality) === "128k" ? "standard" : "lossless");
  endpoint.searchParams.set("type", "json");
  const response = await backup4Json(endpoint.toString());
  const parsed = response.json;
  const url = normalizeMediaUrl(parsed?.url || "");
  if (response.ok && Number(parsed?.status || response.status) === 200 && url) {
    return { url, provider: "yutang_netease", cover: parsed?.pic || "", lyrics: parsed?.lyric || "" };
  }
  throw new Error(String(parsed?.msg || parsed?.message || `yutang netease failed (${response.status})`));
}

async function backup4TryYutangKuwo(platform, id) {
  if (platform !== "kuwo") return null;
  const endpoint = new URL(`${YUTANG_API_ROOT}/api/music/kuwo`);
  endpoint.searchParams.set("url", `https://www.kuwo.cn/play_detail/${encodeURIComponent(id)}`);
  const response = await backup4Json(endpoint.toString());
  const parsed = response.json;
  const data = parsed?.data || {};
  const url = normalizeMediaUrl(data?.music_url || "");
  if (response.ok && Number(parsed?.code) === 200 && url) {
    return { url, provider: "yutang_kuwo", cover: data?.pic || data?.albumpic || "", lyrics: data?.lyrics_url || "" };
  }
  throw new Error(String(parsed?.msg || parsed?.message || `yutang kuwo failed (${response.status})`));
}

function mapBackup4SearchItems(items) {
  const list = Array.isArray(items) ? items : [];
  return list
    .map((item) => {
      const id = String(item?.id || item?.songid || item?.songmid || "").trim();
      if (!id) return null;
      const artists = Array.isArray(item?.artist)
        ? item.artist.map((v) => String(v || "").trim()).filter(Boolean).join(", ")
        : String(item?.artist || item?.author || "").trim();
      return {
        id,
        name: String(item?.name || item?.title || "未知歌曲"),
        artist: artists || "未知歌手",
        album: String(item?.album || ""),
        cover: normalizeMediaUrl(item?.cover || item?.pic || ""),
      };
    })
    .filter(Boolean);
}

async function backup4SearchViaMethod(platform, keyword, page, limit) {
  const data = await callSearch(platform, keyword, page, limit);
  const mapped = mapBackup4SearchItems(data);
  if (mapped.length > 0) {
    return { list: mapped, provider: "method_search" };
  }
  throw new Error("method search empty");
}

async function backup4SearchViaGdstudio(platform, keyword, page, limit) {
  if (platform !== "netease" && platform !== "kuwo") return null;
  const source = platform === "netease" ? "netease" : "kuwo";
  const endpoint = new URL(BACKUP_API_URL);
  endpoint.searchParams.set("types", "search");
  endpoint.searchParams.set("source", source);
  endpoint.searchParams.set("name", keyword);
  endpoint.searchParams.set("count", String(limit));
  endpoint.searchParams.set("pages", String(page));

  const response = await backup4Json(endpoint.toString());
  const parsed = response.json;
  const list = mapBackup4SearchItems(parsed);
  if (response.ok && list.length > 0) {
    return { list, provider: "gdstudio_search" };
  }
  throw new Error(String(parsed?.detail || parsed?.message || `gdstudio search failed (${response.status})`));
}

async function backup4SearchViaChkszMusic163(platform, keyword, page, limit, env) {
  if (platform !== "netease") return null;
  const apiKey = String(env.CHKSZ_API_KEY || "").trim();
  if (!apiKey) return null;

  const endpoint = new URL(`${BACKUP4_CHKSZ_API_URL}/163_search`);
  endpoint.searchParams.set("keyword", keyword);
  endpoint.searchParams.set("limit", String(limit));
  endpoint.searchParams.set("offset", String(Math.max(0, (page - 1) * limit)));
  endpoint.searchParams.set("apikey", apiKey);

  const response = await backup4Json(endpoint.toString());
  const parsed = response.json;
  const list = (Array.isArray(parsed?.data?.songs) ? parsed.data.songs : [])
    .map((item) => {
      const id = String(item?.id || "").trim();
      if (!id) return null;
      return {
        id,
        name: String(item?.name || "未知歌曲"),
        artist: String(item?.artists || "未知歌手"),
        album: String(item?.album || ""),
        cover: normalizeMediaUrl(item?.picUrl || "").replace(/^http:\/\//i, "https://"),
      };
    })
    .filter(Boolean);
  if (response.ok && Number(parsed?.code) === 200 && list.length > 0) {
    return { list, provider: "chksz_163_search" };
  }
  throw new Error(String(parsed?.msg || parsed?.message || `chksz search failed (${response.status})`));
}

async function backup4SearchViaQqBackup3(keyword, page, limit) {
  const result = await callQqBackup3Search({ keyword, page, limit });
  const payload = result?.parsed;
  const success = Number(payload?.result) === 100;
  const normalized = normalizeQqBackup3SearchList(payload?.data?.list);
  const list = normalized
    .map((item) => ({
      id: String(item?.songid || "").trim(),
      name: String(item?.title || "未知歌曲"),
      artist: String(item?.author || "未知歌手"),
      album: "",
      cover: normalizeMediaUrl(item?.pic || ""),
    }))
    .filter((item) => item.id);
  if (result?.response?.ok && success && list.length > 0) {
    return { list, provider: "qq_backup3_search" };
  }
  throw new Error(String(payload?.errMsg || "qq backup3 search failed"));
}

function getBackup4SearchChain(platform, env) {
  if (platform === "qq") {
    return [
      { source: "qq_backup3", run: (p, k, page, limit) => backup4SearchViaQqBackup3(k, page, limit) },
      { source: "qq", run: (p, k, page, limit) => backup4SearchViaMethod(p, k, page, limit) },
      { source: "nxvav", run: (p, k) => backup4SearchViaNxvav(p, k) },
      { source: "11na", run: (p, k) => backup4SearchVia11na(p, k) },
    ];
  }
  if (platform === "netease") {
    return [
      { source: "gdstudio", run: (p, k, page, limit) => backup4SearchViaGdstudio(p, k, page, limit) },
      { source: "netease", run: (p, k, page, limit) => backup4SearchViaMethod(p, k, page, limit) },
      { source: "chksz_163", run: (p, k, page, limit) => backup4SearchViaChkszMusic163(p, k, page, limit, env) },
      { source: "nxvav", run: (p, k) => backup4SearchViaNxvav(p, k) },
      { source: "11na", run: (p, k) => backup4SearchVia11na(p, k) },
    ];
  }
  return [
    { source: "gdstudio", run: (p, k, page, limit) => backup4SearchViaGdstudio(p, k, page, limit) },
    { source: "kuwo", run: (p, k, page, limit) => backup4SearchViaMethod(p, k, page, limit) },
    { source: "11na", run: (p, k) => backup4SearchVia11na(p, k) },
  ];
}

async function backup4Search(platform, keyword, page, limit, env) {
  const errors = [];
  const chain = await prioritizeBackupChain(env, getBackup4SearchChain(platform, env), "search", `${platform}:${keyword}:${page}`);
  for (const runner of chain) {
    const startedAt = Date.now();
    try {
      const result = await runner.run(platform, keyword, page, limit);
      if (Array.isArray(result?.list) && result.list.length > 0) {
        await recordServiceMetric(env, { source: runner.source, operation: "search", success: true, status: 200, durationMs: Date.now() - startedAt });
        return result;
      }
      await recordServiceMetric(env, { source: runner.source, operation: "search", success: false, status: 502, durationMs: Date.now() - startedAt, error: "搜索结果为空" });
    } catch (err) {
      await recordServiceMetric(env, { source: runner.source, operation: "search", success: false, status: Number(err?.status || 0), durationMs: Date.now() - startedAt, error: "备用源搜索失败" });
      errors.push(err instanceof Error ? err.message : String(err || "backup4 search error"));
    }
  }
  throw new Error(errors.join("; ") || "backup4 search failed");
}

function nxvavServer(platform) {
  if (platform === "qq") return "tencent";
  if (platform === "netease") return "netease";
  return "";
}

function nxvavSecret(env) {
  return String(env?.NXVAV_SECRET || NXVAV_DEFAULT_SECRET).trim();
}

async function nxvavToken(server, type, id, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(String(secret || NXVAV_DEFAULT_SECRET)),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${server}${type}${String(id)}`));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function backup4SearchViaNxvav(platform, keyword) {
  const server = nxvavServer(platform);
  if (!server) throw new Error("nxvav 不支持该平台");
  const endpoint = new URL(NXVAV_API_URL);
  endpoint.searchParams.set("server", server);
  endpoint.searchParams.set("type", "search");
  endpoint.searchParams.set("id", keyword);
  const response = await fetch(endpoint.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  const parsed = await response.json().catch(() => null);
  const list = Array.isArray(parsed) ? parsed : [];
  const mapped = list
    .map((item) => {
      let id = "";
      try {
        id = String(new URL(String(item?.url || "")).searchParams.get("id") || "");
      } catch {
        // 忽略无法解析的条目。
      }
      if (!id) return null;
      return {
        id,
        name: String(item?.title || "未知歌曲"),
        artist: String(item?.author || "未知歌手").replace(/\s*\/\s*/g, ", "),
        album: "",
        cover: normalizeMediaUrl(item?.pic || ""),
      };
    })
    .filter(Boolean);
  if (mapped.length > 0) {
    return { list: mapped, provider: "nxvav_search" };
  }
  throw new Error(`nxvav search empty (${platform})`);
}

async function backup4TryNxvav(platform, id, quality, name, artist, env) {
  const server = nxvavServer(platform);
  if (!server || !id) throw new Error("nxvav 不支持该平台");
  const token = await nxvavToken(server, "url", String(id), nxvavSecret(env));
  const endpoint = new URL(NXVAV_API_URL);
  endpoint.searchParams.set("server", server);
  endpoint.searchParams.set("type", "url");
  endpoint.searchParams.set("id", String(id));
  endpoint.searchParams.set("auth", token);
  const probe = await fetch(endpoint.toString(), {
    headers: { Range: "bytes=0-1023" },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  if (!probe.ok) {
    throw new Error(`nxvav url failed (${probe.status})`);
  }
  const totalBytes = probeTotalSize(probe);
  if (totalBytes > 0 && totalBytes < PREVIEW_MAX_BYTES) {
    throw new Error(`nxvav 疑似试听片段 (${totalBytes} bytes)`);
  }
  return { url: endpoint.toString(), provider: "nxvav", validated: true };
}

function music11naServer(platform) {
  if (platform === "qq") return "tencent";
  if (platform === "netease") return "netease";
  if (platform === "kuwo") return "kuwo";
  return "";
}

async function backup4SearchVia11na(platform, keyword) {
  const server = music11naServer(platform);
  if (!server) throw new Error("11na 不支持该平台");
  const endpoint = new URL(BACKUP4_11NA_URL);
  endpoint.searchParams.set("server", server);
  endpoint.searchParams.set("type", "search");
  endpoint.searchParams.set("id", keyword);
  const response = await backup4Json(endpoint.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });
  const items = Array.isArray(response.json?.data?.items) ? response.json.data.items : [];
  const mapped = items
    .map((item) => {
      let id = "";
      try {
        id = String(new URL(String(item?.url || "")).searchParams.get("id") || "");
      } catch {
        // 忽略无法解析的条目。
      }
      if (!id) return null;
      return {
        id,
        name: String(item?.title || "未知歌曲"),
        artist: String(item?.artist || "未知歌手").replace(/\s*\/\s*/g, ", "),
        album: String(item?.album || ""),
        cover: normalizeMediaUrl(item?.pic || item?.cover || ""),
      };
    })
    .filter(Boolean);
  if (mapped.length > 0) {
    return { list: mapped, provider: "11na_search" };
  }
  throw new Error(`11na search empty (${platform})`);
}

async function backup4Try11na(platform, id, quality, name, artist) {
  const server = music11naServer(platform);
  if (!server || !id) throw new Error("11na 不支持该平台");
  const token = await nxvavToken(server, "url", String(id));
  const endpoint = new URL(BACKUP4_11NA_URL);
  endpoint.searchParams.set("server", server);
  endpoint.searchParams.set("type", "url");
  endpoint.searchParams.set("id", String(id));
  endpoint.searchParams.set("auth", token);
  const probe = await fetch(endpoint.toString(), {
    headers: { Range: "bytes=0-1023", "User-Agent": "Mozilla/5.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });
  if (!probe.ok) {
    throw new Error(`11na url failed (${probe.status})`);
  }
  const contentType = String(probe.headers.get("Content-Type") || "").toLowerCase();
  if (!contentType.startsWith("audio/")) {
    throw new Error("11na url 不是音频内容");
  }
  const totalBytes = probeTotalSize(probe);
  if (totalBytes > 0 && totalBytes < PREVIEW_MAX_BYTES) {
    throw new Error(`11na 疑似试听片段 (${totalBytes} bytes)`);
  }
  return { url: endpoint.toString(), provider: "11na", validated: true };
}

function probeTotalSize(response) {
  const range = String(response.headers.get("Content-Range") || "").trim();
  const fromRange = Number(range.split("/")[1] || 0);
  if (fromRange > 0) return fromRange;
  return Number(response.headers.get("Content-Length") || 0);
}

function getBackup4ProviderChain(platform, env) {
  if (platform === "qq") {
    return [
      { source: "onrender", run: (p, id, quality) => backup4TryOnrender(p, id, quality, env) },
      { source: "lxmusic_signed", run: (p, id, quality) => backup4TryLxmusicSigned(p, id, quality, env) },
      { source: "chksz_163", run: (p, id, quality, name, artist) => backup4TryChkszQq(p, id, quality, name, artist, env) },
      { source: "bugpk", run: backup4TryBugpk },
      { source: "qq_backup3", run: backup4TryQqBackup3 },
      { source: "jkapi", run: (p, id, quality, name, artist) => backup4TryJkapi(p, id, quality, name, artist, env) },
      { source: "nxvav", run: (p, id, quality, name, artist) => backup4TryNxvav(p, id, quality, name, artist, env) },
      { source: "11na", run: (p, id, quality, name, artist) => backup4Try11na(p, id, quality, name, artist) },
    ];
  }
  if (platform === "netease") {
    return [
      { source: "gdstudio", run: backup4TryGdstudio },
      { source: "yutang_netease", run: backup4TryYutangNetease },
      { source: "oiapi_music163", run: backup4TryOiapiMusic163 },
      { source: "jkapi", run: (p, id, quality, name, artist) => backup4TryJkapi(p, id, quality, name, artist, env) },
      { source: "chksz_163", run: (p, id, quality) => backup4TryChkszMusic163(p, id, quality, env) },
      { source: "bugpk", run: backup4TryBugpk },
      { source: "paugram_netease", run: backup4TryPaugramNetease },
      { source: "nxvav", run: (p, id, quality, name, artist) => backup4TryNxvav(p, id, quality, name, artist, env) },
      { source: "11na", run: (p, id, quality, name, artist) => backup4Try11na(p, id, quality, name, artist) },
    ];
  }
  if (platform === "kuwo") {
    return [
      { source: "gdstudio", run: backup4TryGdstudio },
      { source: "yutang_kuwo", run: backup4TryYutangKuwo },
      { source: "onrender", run: (p, id, quality) => backup4TryOnrender(p, id, quality, env) },
      { source: "lxmusic_signed", run: (p, id, quality) => backup4TryLxmusicSigned(p, id, quality, env) },
      { source: "oiapi_kuwo", run: backup4TryOiapiKuwo },
      { source: "qqmp3", run: backup4TryQqmp3 },
      { source: "11na", run: (p, id, quality, name, artist) => backup4Try11na(p, id, quality, name, artist) },
    ];
  }
  return [];
}

function backup4RoutingHash(value) {
  let hash = 0;
  for (const char of String(value || "")) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

// Use the last 24 hours of real service metrics to keep unreliable providers
// at the end of the fallback chain and distribute traffic across healthy ones.
async function prioritizeBackupChain(env, chain, operation, routingKey) {
  if (!Array.isArray(chain) || chain.length < 2) return chain;
  const disabledSet = new Set(await getDisabledSources(env));
  chain = chain.filter((item) => !disabledSet.has(item.source));
  if (chain.length < 2) return chain;
  const db = getDatabase(env);
  if (!db) return chain;

  const sources = [...new Set(chain.map((item) => item.source).filter(Boolean))];
  if (!sources.length) return chain;
  const placeholders = sources.map(() => "?").join(", ");
  const since = metricHour(Date.now() - 24 * 60 * 60 * 1000);
  try {
    const result = await db.prepare(
      `SELECT source, SUM(requests) AS requests, SUM(successes) AS successes, SUM(total_duration_ms) AS total_duration_ms
       FROM service_metrics_hourly
       WHERE operation = ? AND bucket_hour >= ? AND source IN (${placeholders})
       GROUP BY source`,
    ).bind(operation, since, ...sources).all();
    const metrics = new Map((result.results || []).map((row) => [String(row.source), {
      requests: Number(row.requests || 0),
      successes: Number(row.successes || 0),
      totalDurationMs: Number(row.total_duration_ms || 0),
    }]));
    const ranked = chain.map((runner, index) => {
      const metric = metrics.get(runner.source) || { requests: 0, successes: 0, totalDurationMs: 0 };
      const successRate = metric.requests ? metric.successes / metric.requests : null;
      // Healthy sources receive traffic first. Unknown sources are sampled before
      // known-bad sources so a recovered service can rejoin the pool.
      const tier = metric.requests < 3 ? 1 : successRate < 0.5 ? 4 : successRate < 0.85 ? 3 : 0;
      const averageDuration = metric.requests ? metric.totalDurationMs / metric.requests : 0;
      return { runner, index, tier, averageDuration };
    }).sort((a, b) => a.tier - b.tier || a.averageDuration - b.averageDuration || a.index - b.index);

    const healthy = ranked.filter((item) => item.tier === 0);
    if (healthy.length > 1) {
      const offset = backup4RoutingHash(routingKey) % healthy.length;
      const distributed = [...healthy.slice(offset), ...healthy.slice(0, offset)];
      const rest = ranked.filter((item) => item.tier !== 0);
      return [...distributed, ...rest].map((item) => item.runner);
    }
    return ranked.map((item) => item.runner);
  } catch (error) {
    // Metrics must not block music parsing when D1 is temporarily unavailable.
    return chain;
  }
}

function resolverConfig(env) {
  const int = (value, fallback, min, max) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
  };
  return {
    enabled: String(env.RESOLVER_V2_ENABLED || "true").toLowerCase() !== "false",
    totalBudgetMs: int(env.RESOLVER_TOTAL_BUDGET_MS, 7000, 2000, 15000),
    hedgeDelayMs: int(env.RESOLVER_HEDGE_DELAY_MS, 700, 150, 3000),
    maxAttempts: int(env.RESOLVER_MAX_ATTEMPTS, 4, 1, 8),
    maxConcurrent: int(env.RESOLVER_MAX_CONCURRENCY, 2, 1, 2),
    providerConcurrency: int(env.RESOLVER_PROVIDER_CONCURRENCY, 3, 1, 20),
    cacheTtlSeconds: int(env.RESOLVER_CACHE_TTL_SECONDS, 120, 15, 600),
  };
}

function resolverCacheKey(input) {
  return `resolve:v2:${input.platform}:${input.id}:${input.quality}`;
}

function resolverCacheRequest(key) {
  return new Request(`https://resolver-cache.internal/${encodeURIComponent(key)}`);
}

async function getResolverCache(key) {
  const now = Date.now();
  const memory = resolverMemoryCache.get(key);
  if (memory?.expiresAt > now) return { ...memory.data, cached: true };
  if (memory) resolverMemoryCache.delete(key);
  if (typeof caches === "undefined" || !caches.default) return null;
  try {
    const response = await caches.default.match(resolverCacheRequest(key));
    if (!response) return null;
    const data = await response.json();
    if (!data?.url || Number(data.expires_at || 0) <= now) return null;
    resolverMemoryCache.set(key, { expiresAt: Number(data.expires_at), data });
    return { ...data, cached: true };
  } catch {
    return null;
  }
}

async function putResolverCache(key, data, ttlSeconds) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const value = { ...data, cached: false, created_at: Date.now(), expires_at: expiresAt };
  if (resolverMemoryCache.size >= 1000) {
    const oldestKey = resolverMemoryCache.keys().next().value;
    if (oldestKey) resolverMemoryCache.delete(oldestKey);
  }
  resolverMemoryCache.set(key, { expiresAt, data: value });
  if (typeof caches === "undefined" || !caches.default) return value;
  try {
    await caches.default.put(
      resolverCacheRequest(key),
      new Response(JSON.stringify(value), {
        headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${ttlSeconds}` },
      }),
    );
  } catch {
    // Cache API is an optimization. A cache write failure must not reject playback.
  }
  return value;
}

function resolverHealthKey(platform, source) {
  return `${platform}:${source}`;
}

function getResolverHealth(platform, source) {
  return resolverProviderHealth.get(resolverHealthKey(platform, source)) || {
    successes: 0,
    failures: 0,
    consecutiveFailures: 0,
    averageDurationMs: 0,
    circuitUntil: 0,
    lastSuccessAt: 0,
  };
}

function updateResolverHealth(platform, source, success, durationMs, status = 0) {
  const key = resolverHealthKey(platform, source);
  const previous = getResolverHealth(platform, source);
  const now = Date.now();
  const consecutiveFailures = success ? 0 : previous.consecutiveFailures + 1;
  let circuitUntil = previous.circuitUntil;
  if (success) circuitUntil = 0;
  else if (status === 401 || status === 403) circuitUntil = now + 60 * 60 * 1000;
  else if (status === 429) circuitUntil = now + 10 * 60 * 1000;
  else if (consecutiveFailures >= 5) circuitUntil = now + 30 * 60 * 1000;
  else if (consecutiveFailures >= 3) circuitUntil = now + 5 * 60 * 1000;
  resolverProviderHealth.set(key, {
    successes: previous.successes + (success ? 1 : 0),
    failures: previous.failures + (success ? 0 : 1),
    consecutiveFailures,
    averageDurationMs: previous.averageDurationMs
      ? Math.round(previous.averageDurationMs * 0.7 + durationMs * 0.3)
      : Math.round(durationMs),
    circuitUntil,
    lastSuccessAt: success ? now : previous.lastSuccessAt,
  });
}

function resolverScore(platform, source, baseIndex) {
  const health = getResolverHealth(platform, source);
  const total = health.successes + health.failures;
  const successRate = total ? health.successes / total : 0.65;
  return successRate * 100 - Math.min(35, health.averageDurationMs / 100) - health.consecutiveFailures * 18 - baseIndex * 0.25;
}

function queueResolverMetric(ctx, env, metric) {
  const task = recordServiceMetric(env, metric);
  if (ctx?.waitUntil) ctx.waitUntil(task);
  else void task;
}

async function getResolverCandidates(platform, env) {
  const disabled = new Set(await getDisabledSources(env));
  return getBackup4ProviderChain(platform, env)
    .filter((item) => !disabled.has(item.source) && Date.now() >= getResolverHealth(platform, item.source).circuitUntil)
    .map((item, index) => ({ ...item, baseIndex: index, score: resolverScore(platform, item.source, index) }))
    .sort((a, b) => b.score - a.score || a.baseIndex - b.baseIndex);
}

async function runResolverProvider(candidate, input, env, config) {
  const source = candidate.source;
  const active = Number(resolverProviderInFlight.get(source) || 0);
  if (active >= config.providerConcurrency) {
    return { ok: false, source, status: 503, error: "provider_busy" };
  }
  resolverProviderInFlight.set(source, active + 1);
  const startedAt = Date.now();
  try {
    const result = await candidate.run(input.platform, input.id, input.quality, input.name, input.artist);
    const url = normalizeMediaUrl(result?.url || "");
    if (!url) return { ok: false, source, status: 502, error: "empty_url", durationMs: Date.now() - startedAt };
    const validated = Boolean(result?.validated);
    if (!validated) {
      const probe = await probeMediaUrl(url, { timeoutMs: 1800 });
      if (!probe.ok) return { ok: false, source, status: Number(probe.status || 502), error: "invalid_media", durationMs: Date.now() - startedAt };
    }
    return {
      ok: true,
      source,
      durationMs: Date.now() - startedAt,
      data: { url, provider: String(result?.provider || source), lyrics: String(result?.lyrics || ""), cover: normalizeMediaUrl(result?.cover || "") },
    };
  } catch (error) {
    return { ok: false, source, status: Number(error?.status || 0), error: error instanceof Error ? error.message : "provider_failed", durationMs: Date.now() - startedAt };
  } finally {
    const remaining = Math.max(0, Number(resolverProviderInFlight.get(source) || 1) - 1);
    if (remaining) resolverProviderInFlight.set(source, remaining);
    else resolverProviderInFlight.delete(source);
  }
}

async function resolveWithHedging(input, env, ctx) {
  const config = resolverConfig(env);
  const candidates = (await getResolverCandidates(input.platform, env)).slice(0, config.maxAttempts);
  if (!candidates.length) throw new Error("当前平台没有可用解析源");
  const startedAt = Date.now();
  const deadlineAt = startedAt + config.totalBudgetMs;
  let nextIndex = 0;
  const active = new Map();
  const errors = [];
  const start = () => {
    if (nextIndex >= candidates.length || active.size >= config.maxConcurrent) return false;
    const candidate = candidates[nextIndex++];
    const promise = runResolverProvider(candidate, input, env, config).then((result) => ({ candidate, result }));
    active.set(candidate.source, promise);
    return true;
  };
  start();
  let nextHedgeAt = startedAt + config.hedgeDelayMs;

  while (active.size > 0 && Date.now() < deadlineAt) {
    const waitMs = Math.max(1, Math.min(deadlineAt - Date.now(), nextHedgeAt - Date.now()));
    const raced = await Promise.race([
      ...active.values(),
      sleep(waitMs).then(() => ({ timer: true })),
    ]);
    if (raced?.timer) {
      if (active.size < config.maxConcurrent) start();
      nextHedgeAt = Date.now() + config.hedgeDelayMs;
      continue;
    }
    active.delete(raced.candidate.source);
    const { result } = raced;
    updateResolverHealth(input.platform, result.source, result.ok, Number(result.durationMs || 0), Number(result.status || 200));
    queueResolverMetric(ctx, env, {
      source: result.source,
      operation: "resolve_v2",
      success: result.ok,
      status: result.ok ? 200 : Number(result.status || 502),
      durationMs: Number(result.durationMs || 0),
      error: result.ok ? "" : result.error,
    });
    if (result.ok) {
      queueResolverMetric(ctx, env, { source: result.data.provider, operation: "final_parse", success: true, status: 200, durationMs: Date.now() - startedAt });
      return { ...result.data, attempt_count: nextIndex - active.size, elapsed_ms: Date.now() - startedAt };
    }
    errors.push(`${result.source}:${result.error}`);
    start();
  }
  throw new Error(errors.length ? `解析失败（${errors.join("; ").slice(0, 360)}）` : "解析超时");
}

async function handleResolve(request, env, ctx) {
  if (!resolverConfig(env).enabled) return jsonResponse(503, { code: -1, message: "统一解析器暂未启用" });
  const body = await parseJsonBody(request);
  const input = {
    platform: normalizeBackup4Platform(body.platform),
    id: String(body.id || "").trim(),
    quality: backup4NormalizeQuality(body.quality || "320k"),
    name: String(body.name || "").trim(),
    artist: String(body.artist || "").trim(),
    album: String(body.album || "").trim(),
    cover: normalizeMediaUrl(body.cover || ""),
  };
  if (!BACKUP4_ALLOWED_PLATFORMS.has(input.platform) || !input.id) {
    return jsonResponse(400, { code: -1, message: "缺少或无效参数: platform / id" });
  }
  const key = resolverCacheKey(input);
  if (!body.bypass_cache) {
    const cached = await getResolverCache(key);
    if (cached?.url) return jsonResponse(200, { code: 0, message: "Success", data: cached });
  }
  let task = resolverInflight.get(key);
  if (!task) {
    task = resolveWithHedging(input, env, ctx)
      .then((data) => putResolverCache(key, { ...data, platform: input.platform, id: input.id, quality: input.quality }, resolverConfig(env).cacheTtlSeconds))
      .finally(() => resolverInflight.delete(key));
    resolverInflight.set(key, task);
  }
  try {
    const data = await task;
    return jsonResponse(200, { code: 0, message: "Success", data });
  } catch (error) {
    return jsonResponse(502, { code: -1, message: error instanceof Error ? error.message : "统一解析失败" });
  }
}

async function handleBackup4(request, env) {
  const reqUrl = new URL(request.url);
  const mode = String(reqUrl.searchParams.get("mode") || "url").trim().toLowerCase();
  const platform = normalizeBackup4Platform(reqUrl.searchParams.get("platform"));

  if (!BACKUP4_ALLOWED_PLATFORMS.has(platform)) {
    return jsonResponse(400, { code: -1, message: "备用源4参数无效: platform" });
  }
  if (mode !== "search") {
    const auth = await requireMusicAccess(request, env);
    if (!auth.ok) return auth.response;
  }

  if (mode === "search") {
    const keyword = String(reqUrl.searchParams.get("keyword") || "").trim();
    const page = toPositiveInt(reqUrl.searchParams.get("page"), 1);
    const limit = toPositiveInt(reqUrl.searchParams.get("limit"), 20);
    if (!keyword) {
      return jsonResponse(400, { code: -1, message: "缺少参数: keyword" });
    }
    try {
      const result = await backup4Search(platform, keyword, page, limit, env);
      return jsonResponse(200, {
        code: 0,
        message: "Success",
        data: result.list,
        provider: result.provider,
      }, {
        "Cache-Control": "no-store",
      });
    } catch (err) {
      return jsonResponse(502, {
        code: -1,
        message: err instanceof Error ? err.message : "备用源4搜索失败",
        data: [],
      });
    }
  }

  if (mode !== "url") {
    return jsonResponse(400, { code: -1, message: "备用源4参数无效: mode" });
  }

  const id = String(reqUrl.searchParams.get("id") || "").trim();
  const quality = backup4NormalizeQuality(reqUrl.searchParams.get("quality"));
  const name = String(reqUrl.searchParams.get("name") || "").trim();
  const artist = String(reqUrl.searchParams.get("artist") || "").trim();
  if (!id) {
    return jsonResponse(400, { code: -1, message: "缺少参数: id" });
  }

  const errors = [];
  const chain = await prioritizeBackupChain(env, getBackup4ProviderChain(platform, env), "parse", `${platform}:${id}:${quality}`);
  for (const runner of chain) {
    const startedAt = Date.now();
    try {
      const result = await runner.run(platform, id, quality, name, artist);
      if (result?.url) {
        const probe = await probeMediaUrl(result.url);
        if (!probe.ok) {
          await recordServiceMetric(env, { source: runner.source, operation: "parse", success: false, status: Number(probe.status || 0), durationMs: Date.now() - startedAt, error: "链接失效" });
          errors.push(`${runner.source} 链接失效 (${probe.status || "timeout"})`);
          continue;
        }
        await recordServiceMetric(env, { source: runner.source, operation: "parse", success: true, status: 200, durationMs: Date.now() - startedAt });
        await recordServiceMetric(env, { source: `platform_${platform}`, operation: "platform_parse", success: true, status: 200, durationMs: Date.now() - startedAt });
        await recordFinalParseHit(env, result.provider || runner.source, Date.now() - startedAt);
        return jsonResponse(200, {
          code: 0,
          message: "Success",
          data: {
            url: result.url,
            provider: result.provider,
            platform,
            id,
            quality,
          },
        }, {
          "Cache-Control": "no-store",
        });
      }
      await recordServiceMetric(env, { source: runner.source, operation: "parse", success: false, status: 502, durationMs: Date.now() - startedAt, error: "未返回可播放链接" });
    } catch (err) {
      await recordServiceMetric(env, { source: runner.source, operation: "parse", success: false, status: Number(err?.status || 0), durationMs: Date.now() - startedAt, error: "备用源解析失败" });
      const message = err instanceof Error ? err.message : String(err || "unknown backup4 error");
      errors.push(message);
    }
  }

  await recordServiceMetric(env, { source: `platform_${platform}`, operation: "platform_parse", success: false, status: 502, durationMs: 0, error: "所有解析接口均未返回可播放链接" });

  return jsonResponse(502, {
    code: -1,
    message: "备用源4全部失败",
    errors,
  });
}

async function probeMediaUrl(url, { timeoutMs = 6000, signal } = {}) {
  try {
    const response = await fetch(String(url || ""), {
      method: "GET",
      headers: { Range: "bytes=0-0", "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
      signal: signal || AbortSignal.timeout(timeoutMs),
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

function keyLooksInvalid(key) {
  const value = String(key || "").trim();
  if (!value) return true;
  if (!value.startsWith("th_")) return true;
  if (value.includes("replace_with_your_real_key")) return true;
  return false;
}

function resolveTunehubKey(session, request, env) {
  if (session.type === "password" || session.type === "apikey") {
    return String(env.TUNEHUB_API_KEY || "").trim();
  }
  return String(request.headers.get("X-Tunehub-Key") || "").trim();
}

function getMediaAllowedHosts(env) {
  return [...splitCsvValues(env.MEDIA_PROXY_ALLOWED_HOSTS || ""), ".y.gtimg.cn"]
    .map((item) => item.toLowerCase())
    .filter(Boolean);
}

async function backup4TryChkszQq(platform, id, quality, name, artist, env) {
  if (platform !== "qq") return null;
  const apiKey = String(env.CHKSZ_API_KEY || "").trim();
  if (!apiKey) return null;
  const endpoint = new URL(`${BACKUP4_CHKSZ_API_URL}/qq_music`);
  endpoint.searchParams.set("mid", id);
  endpoint.searchParams.set("type", "json");
  endpoint.searchParams.set("apikey", apiKey);
  const response = await backup4Json(endpoint.toString());
  const parsed = response.json;
  const url = normalizeMediaUrl(parsed?.url || parsed?.data?.url || "");
  if (response.ok && url) return { url, provider: "chksz_qq" };
  throw new Error(String(parsed?.msg || parsed?.message || `chksz qq failed (${response.status})`));
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

function resolveProxyTarget(rawUrl, env) {
  const badRequest = (message) => ({ error: jsonResponse(400, { code: -1, message }) });
  const targetRaw = normalizeMediaUrl(rawUrl || "");
  if (!targetRaw) return badRequest("缺少参数: url");

  let target;
  try {
    target = new URL(targetRaw);
  } catch {
    return badRequest("url 参数无效");
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return badRequest("仅支持 http/https 媒体链接");
  }

  if (isBlockedMediaHost(target.hostname)) {
    return badRequest("不允许访问该媒体地址");
  }

  const allowedHosts = getMediaAllowedHosts(env);
  if (allowedHosts.length > 0 && !allowedHosts.some((rule) => hostMatchesRule(target.hostname, rule))) {
    return badRequest("该域名未在媒体代理白名单中");
  }

  return { target };
}

function buildUpstreamProxyResponse(upstream, extraHeaders = {}) {
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
  Object.entries(extraHeaders).forEach(([name, value]) => {
    if (value) headers.set(name, value);
  });
  return new Response(upstream.body, { status: upstream.status, headers });
}

async function handleMedia(request, env) {
  const auth = await requireAnyAuth(request, env);
  if (!auth.ok) return auth.response;

  const reqUrl = new URL(request.url);
  const resolved = resolveProxyTarget(reqUrl.searchParams.get("url") || "", env);
  if (resolved.error) return resolved.error;

  let upstream;
  try {
    upstream = await fetchMediaUpstream(resolved.target, request);
  } catch (err) {
    return jsonResponse(502, {
      code: -1,
      message: err instanceof Error ? err.message : "媒体请求失败",
    });
  }

  const contentType = String(upstream.headers.get("Content-Type") || "").toLowerCase();
  const contentLength = Number(upstream.headers.get("Content-Length") || 0);
  if (contentType.startsWith("audio/") && contentLength > 0 && contentLength < 102400) {
    return jsonResponse(502, { code: -1, message: "音频内容异常，请尝试其他音质或稍后重试" });
  }

  const extraHeaders = {};
  if (reqUrl.searchParams.get("download") === "1") {
    const filename = sanitizeDownloadFilename(reqUrl.searchParams.get("filename"));
    extraHeaders["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`;
  }
  return buildUpstreamProxyResponse(upstream, extraHeaders);
}

async function handleCover(request, env) {
  const reqUrl = new URL(request.url);
  const resolved = resolveProxyTarget(reqUrl.searchParams.get("url") || "", env);
  if (resolved.error) return resolved.error;

  let upstream;
  try {
    upstream = await fetchMediaUpstream(resolved.target, request);
  } catch (err) {
    return jsonResponse(502, {
      code: -1,
      message: err instanceof Error ? err.message : "封面请求失败",
    });
  }

  const contentType = String(upstream.headers.get("Content-Type") || "").toLowerCase();
  if (!upstream.ok || !contentType.startsWith("image/")) {
    return jsonResponse(400, { code: -1, message: "该地址不是图片资源" });
  }
  return buildUpstreamProxyResponse(upstream);
}

async function handleLyric(request, env) {
  const reqUrl = new URL(request.url);
  const platform = String(reqUrl.searchParams.get("platform") || "").trim();
  const id = String(reqUrl.searchParams.get("id") || "").trim();
  if (!platform || !id) {
    return jsonResponse(400, { code: -1, message: "缺少参数: platform / id" });
  }

  // 网易云优先使用 CHKSZ 免费歌词接口。
  if (platform === "netease") {
    const chkszKey = String(env.CHKSZ_API_KEY || "").trim();
    if (chkszKey) {
      try {
        const endpoint = new URL(`${BACKUP4_CHKSZ_API_URL}/163_lyric`);
        endpoint.searchParams.set("id", id);
        endpoint.searchParams.set("apikey", chkszKey);
        const response = await backup4Json(endpoint.toString(), {
          headers: {
            Accept: "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          },
        });
        const lyric = String(response.json?.data?.lrc || response.json?.lrc || "").trim();
        if (response.ok && Number(response.json?.code) === 200 && lyric) {
          return jsonResponse(200, { code: 0, message: "Success", data: { lyric } });
        }
      } catch {
        // 继续尝试通用备用歌词源。
      }
    }
  }

  // 通用兜底：GDStudio 歌词。
  try {
    const endpoint = new URL(BACKUP_API_URL);
    endpoint.searchParams.set("types", "lyric");
    endpoint.searchParams.set("source", platform === "qq" ? "tencent" : platform);
    endpoint.searchParams.set("id", id);
    const response = await backup4Json(endpoint.toString());
    const lyric = String(response.json?.lyric || response.json?.data?.lyric || "").trim();
    if (response.ok && lyric) {
      return jsonResponse(200, { code: 0, message: "Success", data: { lyric } });
    }
  } catch {
    // ignore
  }

  return jsonResponse(404, { code: -1, message: "未找到歌词" });
}

async function handleParse(request, env) {
  const auth = await requireAnyAuth(request, env);
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
      auth.session.type === "password" || auth.session.type === "apikey"
        ? "请先在 Worker Secret 配置 TUNEHUB_API_KEY"
        : "请先在页面填写你自己的 TuneHub API Key";
    return jsonResponse(400, { code: -1, message });
  }

  const startedAt = Date.now();
  try {
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
    const durationMs = Date.now() - startedAt;
    const payload = parseJsonText(text);
    const apiSuccess = resp.ok && Number(payload?.code) === 0;
    const parsedItems = Array.isArray(payload?.data?.data) ? payload.data.data : [];
    const hasPlayableItem = apiSuccess && (parsedItems.length === 0 || parsedItems.some((item) => item?.success));
    await recordServiceMetric(env, {
      source: "tunehub",
      operation: "parse",
      success: apiSuccess,
      status: resp.status,
      durationMs,
      error: apiSuccess ? "" : `TuneHub 请求失败 (${resp.status})`,
    });
    if (hasPlayableItem) await recordFinalParseHit(env, "tunehub", durationMs);
    return new Response(text, {
      status: resp.status,
      headers: {
        "Content-Type": resp.headers.get("Content-Type") || "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    await recordServiceMetric(env, {
      source: "tunehub",
      operation: "parse",
      success: false,
      status: 502,
      durationMs: Date.now() - startedAt,
      error,
    });
    return jsonResponse(502, { code: -1, message: error instanceof Error ? error.message : "TuneHub 解析请求失败" });
  }
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
