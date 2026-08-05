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
const QQ_BACKUP3_PARSE_URL = "https://yutangxiaowu.cn:3015/api/parseqmusic";
const QQ_BACKUP3_ALLOWED_FILTERS = new Set(["name", "id"]);
const QQ_BACKUP3_TIMEOUT_MS = 18000;
const BACKUP4_ALLOWED_PLATFORMS = new Set(["netease", "qq", "kuwo"]);
const BACKUP4_TIMEOUT_MS = 18000;
const BACKUP4_QQMP3_TIMEOUT_MS = 8000;
const BACKUP4_LXMUSIC_ONRENDER_URL = "https://lxmusicapi.onrender.com";
const BACKUP4_LXMUSIC_ONRENDER_KEY = "share-v3";
const BACKUP4_LXMUSIC_SIGNED_URL = "https://88.lxmusic.xn--fiqs8s";
const BACKUP4_LXMUSIC_SCRIPT_MD5 = "1888f9865338afe6d5534b35171c61a4";
const BACKUP4_LXMUSIC_SECRET_KEY = "JaJ?a7Nwk_Fgj?2o:znAkst";
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
// ChKSz 提供公开网易云接口；仅作为已有网易云备用链路的最后一层。
const BACKUP4_CHKSZ_API_URL = "https://api.chksz.top/api";

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
    if (url.pathname === "/api/library" && request.method === "GET") {
      return withCors(request, env, await handleLibraryGet(request, env));
    }
    if (url.pathname === "/api/library" && request.method === "PUT") {
      return withCors(request, env, await handleLibraryPut(request, env));
    }
    if (url.pathname === "/api/auth/invitation/complete" && request.method === "POST") {
      return withCors(request, env, await handleInvitationComplete(request, env));
    }
    if (url.pathname === "/api/admin/invites" && request.method === "POST") {
      return withCors(request, env, await handleAdminCreateInvites(request, env));
    }
    if (url.pathname === "/api/admin/invites" && request.method === "GET") {
      return withCors(request, env, await handleAdminListInvites(request, env));
    }
    const revokeInviteMatch = url.pathname.match(/^\/api\/admin\/invites\/(\d+)\/revoke$/);
    if (revokeInviteMatch && request.method === "POST") {
      return withCors(request, env, await handleAdminRevokeInvite(request, env, revokeInviteMatch[1]));
    }

    if (url.pathname === "/api/proxy/methods" && request.method === "GET") {
      return withCors(request, env, await handleMethods(request, env));
    }
    if (url.pathname === "/api/proxy/method" && request.method === "GET") {
      return withCors(request, env, await handleMethod(request, env));
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
    if (url.pathname === "/api/proxy/backup4" && request.method === "GET") {
      return withCors(request, env, await handleBackup4(request, env));
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
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Tunehub-Key");
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
  if (parsed.type === "linuxdo" && invitationLoginEnabled(env)) {
    const db = getInviteDatabase(env);
    if (!db) return null;
    const linuxdoId = String(parsed?.user?.linuxdo_id || parsed?.user?.id || "").trim();
    if (!linuxdoId) return null;
    const user = await db
      .prepare("SELECT disabled_at FROM linuxdo_users WHERE linuxdo_id = ?")
      .bind(linuxdoId)
      .first();
    if (!user || user.disabled_at) return null;
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

function invitationLoginEnabled(env) {
  return ["1", "true", "yes", "on"].includes(String(env.INVITE_LINUXDO_ENABLED || "").trim().toLowerCase());
}

function getInviteDatabase(env) {
  return env.DB && typeof env.DB.prepare === "function" ? env.DB : null;
}

function libraryOwnerKey(session) {
  if (session?.type === "password") return "password:family";
  if (session?.type !== "linuxdo") return "";
  const id = String(session?.user?.linuxdo_id || session?.user?.id || "").trim();
  return id ? `linuxdo:${id}` : "";
}

function getLibraryDatabase(env) {
  return getInviteDatabase(env);
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
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  const db = getLibraryDatabase(env);
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
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  const db = getLibraryDatabase(env);
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

function toSqlDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(value || "")));
  return Array.from(new Uint8Array(digest))
    .map((item) => item.toString(16).padStart(2, "0"))
    .join("");
}

function randomInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const groups = [];
  for (let start = 0; start < bytes.length; start += 5) {
    let group = "";
    for (let i = start; i < start + 5; i += 1) {
      group += alphabet[bytes[i] % alphabet.length];
    }
    groups.push(group);
  }
  return `DM-${groups.join("-")}`;
}

function randomTicket() {
  return b64urlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

function normalizeInviteCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "");
}

function inviteError(message, status = 400) {
  return jsonResponse(status, { code: -1, message });
}

function getBearerToken(request) {
  const header = String(request.headers.get("Authorization") || "");
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function requireInviteAdmin(request, env) {
  const configured = String(env.ADMIN_INVITE_TOKEN || "").trim();
  const supplied = getBearerToken(request);
  if (!configured) return inviteError("ADMIN_INVITE_TOKEN is not configured", 503);
  if (!supplied || !safeEqual(supplied, configured)) return inviteError("Unauthorized", 401);
  return null;
}

function sanitizeInviteRecord(record) {
  return {
    id: Number(record.id),
    prefix: String(record.prefix || ""),
    max_uses: Number(record.max_uses || 0),
    used_count: Number(record.used_count || 0),
    expires_at: record.expires_at || null,
    revoked_at: record.revoked_at || null,
    created_at: record.created_at || null,
  };
}

async function findLinuxdoUser(db, linuxdoId) {
  return db
    .prepare(
      "SELECT id, linuxdo_id, name, avatar, disabled_at, created_at, last_login_at FROM linuxdo_users WHERE linuxdo_id = ?",
    )
    .bind(linuxdoId)
    .first();
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
  const redirectTo = safeRedirectUrl(statePayload.redirect, env, request.url);

  // 默认保持旧行为，方便先部署数据库和管理接口；启用后仅 Linux DO 新用户需要邀请码。
  if (!invitationLoginEnabled(env)) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectTo,
        "Set-Cookie": await createLinuxdoSession(linuxdoId, userName, avatar, env),
      },
    });
  }

  const db = getInviteDatabase(env);
  if (!db) {
    return Response.redirect(`${redirectTo}?login=invite_unavailable`, 302);
  }

  const knownUser = await findLinuxdoUser(db, linuxdoId);
  if (knownUser?.disabled_at) {
    return Response.redirect(`${redirectTo}?login=disabled`, 302);
  }
  if (knownUser) {
    await db
      .prepare("UPDATE linuxdo_users SET name = ?, avatar = ?, last_login_at = ? WHERE id = ?")
      .bind(userName, avatar, sqlNow(), knownUser.id)
      .run();
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectTo,
        "Set-Cookie": await createLinuxdoSession(linuxdoId, userName, avatar, env),
      },
    });
  }

  const ticket = randomTicket();
  const ticketHash = await sha256Hex(ticket);
  const createdAt = sqlNow();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db
    .prepare(
      "INSERT INTO pending_linuxdo_registrations (ticket_hash, linuxdo_id, name, avatar, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(linuxdo_id) DO UPDATE SET ticket_hash = excluded.ticket_hash, name = excluded.name, avatar = excluded.avatar, expires_at = excluded.expires_at, created_at = excluded.created_at",
    )
    .bind(ticketHash, linuxdoId, userName, avatar, expiresAt, createdAt)
    .run();

  const inviteUrl = new URL(redirectTo);
  inviteUrl.searchParams.set("login", "invite");
  inviteUrl.searchParams.set("ticket", ticket);
  return new Response(null, {
    status: 302,
    headers: {
      Location: inviteUrl.toString(),
    },
  });
}

async function handleInvitationComplete(request, env) {
  if (!invitationLoginEnabled(env)) return inviteError("邀请码注册尚未启用", 403);
  const db = getInviteDatabase(env);
  if (!db) return inviteError("邀请码数据库未配置", 503);

  const body = await parseJsonBody(request);
  const ticket = String(body.ticket || "").trim();
  const inviteCode = normalizeInviteCode(body.invite_code);
  if (!ticket || !inviteCode) return inviteError("请输入邀请码", 400);

  const pending = await db
    .prepare(
      "SELECT ticket_hash, linuxdo_id, name, avatar, expires_at FROM pending_linuxdo_registrations WHERE ticket_hash = ?",
    )
    .bind(await sha256Hex(ticket))
    .first();
  if (!pending || Date.parse(pending.expires_at) <= Date.now()) {
    return inviteError("邀请码验证已过期，请重新使用 Linux DO 登录", 410);
  }

  const existing = await findLinuxdoUser(db, pending.linuxdo_id);
  if (existing?.disabled_at) return inviteError("此账号已被停用", 403);
  if (existing) {
    await db.prepare("DELETE FROM pending_linuxdo_registrations WHERE ticket_hash = ?").bind(pending.ticket_hash).run();
    return jsonResponse(
      200,
      { code: 0, message: "Success" },
      { "Set-Cookie": await createLinuxdoSession(pending.linuxdo_id, existing.name, existing.avatar, env) },
    );
  }

  const codeHash = await sha256Hex(inviteCode);
  const now = sqlNow();
  // 此 UPDATE 同时判断有效期、撤销状态和余量，避免并发兑换超过邀请码额度。
  const consume = await db
    .prepare(
      "UPDATE invite_codes SET used_count = used_count + 1 WHERE code_hash = ? AND revoked_at IS NULL AND used_count < max_uses AND (expires_at IS NULL OR expires_at > ?)",
    )
    .bind(codeHash, now)
    .run();
  if (Number(consume.meta?.changes || 0) !== 1) {
    return inviteError("邀请码无效、已用完、已撤销或已过期", 400);
  }

  const invite = await db.prepare("SELECT id FROM invite_codes WHERE code_hash = ?").bind(codeHash).first();
  try {
    await db
      .prepare(
        "INSERT INTO linuxdo_users (linuxdo_id, name, avatar, invite_code_id, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind(pending.linuxdo_id, pending.name, pending.avatar, invite.id, now, now)
      .run();
  } catch (err) {
    // 极少数并发重复提交时尽量归还一次额度，随后让用户重新登录获取最新状态。
    await db.prepare("UPDATE invite_codes SET used_count = MAX(used_count - 1, 0) WHERE id = ?").bind(invite?.id || 0).run();
    return inviteError("注册状态已变化，请重新使用 Linux DO 登录", 409);
  }
  await db.prepare("DELETE FROM pending_linuxdo_registrations WHERE ticket_hash = ?").bind(pending.ticket_hash).run();

  return jsonResponse(
    200,
    { code: 0, message: "Success" },
    { "Set-Cookie": await createLinuxdoSession(pending.linuxdo_id, pending.name, pending.avatar, env) },
  );
}

async function handleAdminCreateInvites(request, env) {
  const authError = requireInviteAdmin(request, env);
  if (authError) return authError;
  const db = getInviteDatabase(env);
  if (!db) return inviteError("邀请码数据库未配置", 503);

  const body = await parseJsonBody(request);
  const count = Math.max(1, Math.min(20, Number.parseInt(body.count, 10) || 1));
  const maxUses = Math.max(1, Math.min(100, Number.parseInt(body.max_uses, 10) || 1));
  let expiresAt = null;
  if (body.expires_at) {
    expiresAt = toSqlDate(body.expires_at);
    if (!expiresAt || Date.parse(expiresAt) <= Date.now()) return inviteError("expires_at 必须是未来的有效时间", 400);
  }

  const createdAt = sqlNow();
  const generated = [];
  for (let i = 0; i < count; i += 1) {
    const code = randomInviteCode();
    const codeHash = await sha256Hex(code);
    const result = await db
      .prepare(
        "INSERT INTO invite_codes (code_hash, prefix, max_uses, used_count, expires_at, created_at) VALUES (?, ?, ?, 0, ?, ?)",
      )
      .bind(codeHash, code.slice(0, 8), maxUses, expiresAt, createdAt)
      .run();
    generated.push({ id: Number(result.meta?.last_row_id || 0), code, max_uses: maxUses, expires_at: expiresAt });
  }
  return jsonResponse(200, { code: 0, message: "Success", data: { invites: generated } });
}

async function handleAdminListInvites(request, env) {
  const authError = requireInviteAdmin(request, env);
  if (authError) return authError;
  const db = getInviteDatabase(env);
  if (!db) return inviteError("邀请码数据库未配置", 503);

  const rows = await db
    .prepare(
      "SELECT id, prefix, max_uses, used_count, expires_at, revoked_at, created_at FROM invite_codes ORDER BY id DESC LIMIT 200",
    )
    .all();
  return jsonResponse(200, { code: 0, message: "Success", data: { invites: (rows.results || []).map(sanitizeInviteRecord) } });
}

async function handleAdminRevokeInvite(request, env, inviteId) {
  const authError = requireInviteAdmin(request, env);
  if (authError) return authError;
  const db = getInviteDatabase(env);
  if (!db) return inviteError("邀请码数据库未配置", 503);

  const result = await db
    .prepare("UPDATE invite_codes SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?")
    .bind(sqlNow(), Number(inviteId))
    .run();
  if (Number(result.meta?.changes || 0) !== 1) return inviteError("邀请码不存在", 404);
  return jsonResponse(200, { code: 0, message: "Success" });
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
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  const platform = String(new URL(request.url).searchParams.get("platform") || "").trim();
  if (!platform) return jsonResponse(400, { code: -1, message: "缺少参数: platform" });
  try {
    return jsonResponse(200, { code: 0, message: "Success", data: await callToplists(platform) });
  } catch (err) {
    return jsonResponse(502, { code: -1, message: err instanceof Error ? err.message : "获取榜单失败" });
  }
}

async function handleToplist(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const platform = String(url.searchParams.get("platform") || "").trim();
  const id = String(url.searchParams.get("id") || "").trim();
  if (!platform || !id) return jsonResponse(400, { code: -1, message: "缺少参数: platform / id" });
  try {
    return jsonResponse(200, { code: 0, message: "Success", data: await callToplist(platform, id) });
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
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const platform = String(url.searchParams.get("platform") || "netease").trim();
  try {
    return jsonResponse(200, { code: 0, message: "Success", data: { playlists: await callPlaylists(platform) } });
  } catch (err) {
    return jsonResponse(502, { code: -1, message: err instanceof Error ? err.message : "获取歌单列表失败" });
  }
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

async function callQqBackup3ParseBySongmid(songmid) {
  const endpoint = new URL(QQ_BACKUP3_PARSE_URL);
  endpoint.searchParams.set("songmid", String(songmid || ""));
  const response = await fetch(endpoint.toString(), {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(QQ_BACKUP3_TIMEOUT_MS),
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
  if (!QQ_BACKUP3_ALLOWED_FILTERS.has(filter)) {
    return jsonResponse(400, { code: -1, message: "备用源3参数无效: filter" });
  }
  if (type !== "qq") {
    return jsonResponse(400, { code: -1, message: "备用源3仅支持 QQ 平台" });
  }

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

async function backup4TryGdstudio(platform, id, quality) {
  if (platform !== "netease" && platform !== "kuwo") return null;

  const source = platform === "netease" ? "netease" : "kuwo";
  const endpoint = new URL(BACKUP_API_URL);
  endpoint.searchParams.set("types", "url");
  endpoint.searchParams.set("source", source);
  endpoint.searchParams.set("id", id);
  endpoint.searchParams.set("br", String(backup4BrFromQuality(quality)));

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: { Accept: "application/json, text/plain, */*" },
    redirect: "follow",
    signal: AbortSignal.timeout(BACKUP4_TIMEOUT_MS),
  });
  const text = await response.text();
  const parsed = parseJsonText(text);
  const url = normalizeMediaUrl(parsed?.url || "");
  if (response.ok && url) {
    return { url, provider: "gdstudio" };
  }
  throw new Error(String(parsed?.detail || parsed?.message || `gdstudio failed (${response.status})`));
}

async function backup4TryOnrender(platform, id, quality) {
  const source = backup4PlatformCode(platform);
  if (!source) return null;

  const endpoint = `${BACKUP4_LXMUSIC_ONRENDER_URL}/url/${source}/${encodeURIComponent(id)}/${backup4NormalizeQuality(quality)}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Request-Key": BACKUP4_LXMUSIC_ONRENDER_KEY,
      "User-Agent": "Mozilla/5.0",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(BACKUP4_TIMEOUT_MS),
  });
  const text = await response.text();
  const parsed = parseJsonText(text);
  const url = normalizeMediaUrl(parsed?.url || "");
  if (response.ok && Number(parsed?.code) === 0 && url) {
    return { url, provider: "onrender" };
  }
  throw new Error(String(parsed?.msg || parsed?.message || `onrender failed (${response.status})`));
}

async function backup4TryLxmusicSigned(platform, id, quality) {
  const source = backup4PlatformCode(platform);
  if (!source) return null;

  const q = backup4NormalizeQuality(quality);
  const requestPath = `/lxmusicv4/url/${source}/${id}/${q}`;
  const sign = await sha256Hex(`${requestPath}${BACKUP4_LXMUSIC_SCRIPT_MD5}${BACKUP4_LXMUSIC_SECRET_KEY}`);
  const endpoint = `${BACKUP4_LXMUSIC_SIGNED_URL}${requestPath}?sign=${sign}`;

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-request-key": "lxmusic",
      "user-agent": "lx-music-mobile/2.0.0",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(BACKUP4_TIMEOUT_MS),
  });
  const text = await response.text();
  const parsed = parseJsonText(text);
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

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: { Accept: "application/json, text/plain, */*" },
    redirect: "follow",
    signal: AbortSignal.timeout(BACKUP4_TIMEOUT_MS),
  });
  const text = await response.text();
  const parsed = parseJsonText(text);
  const first = Array.isArray(parsed?.data) ? parsed.data[0] : null;
  const url = normalizeMediaUrl(first?.url || "");
  if (response.ok && Number(parsed?.code) === 0 && url) {
    return { url, provider: "oiapi_music163" };
  }
  throw new Error(String(parsed?.message || `oiapi music163 failed (${response.status})`));
}

async function backup4TryChkszMusic163(platform, id, quality) {
  if (platform !== "netease") return null;

  const endpoint = new URL(`${BACKUP4_CHKSZ_API_URL}/163_music`);
  endpoint.searchParams.set("id", id);
  endpoint.searchParams.set("level", backup4NormalizeQuality(quality) === "128k" ? "standard" : "lossless");

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: { Accept: "application/json, text/plain, */*" },
    redirect: "follow",
    signal: AbortSignal.timeout(BACKUP4_TIMEOUT_MS),
  });
  const text = await response.text();
  const parsed = parseJsonText(text);
  const url = normalizeMediaUrl(parsed?.data?.url || "");
  if (response.ok && Number(parsed?.code) === 200 && url) {
    return { url, provider: "chksz_163" };
  }
  throw new Error(String(parsed?.msg || parsed?.message || `chksz music163 failed (${response.status})`));
}

async function backup4TryOiapiKuwo(platform, id, quality, name, artist) {
  if (platform !== "kuwo") return null;

  const keyword = backup4BuildKuwoKeyword(name, artist, id);
  if (!keyword) return null;

  const endpoint = new URL(BACKUP4_OIAPI_KUWO_URL);
  endpoint.searchParams.set("msg", keyword);
  endpoint.searchParams.set("n", "1");
  endpoint.searchParams.set("br", backup4NormalizeQuality(quality) === "128k" ? "7" : "5");

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: { Accept: "application/json, text/plain, */*" },
    redirect: "follow",
    signal: AbortSignal.timeout(BACKUP4_TIMEOUT_MS),
  });
  const text = await response.text();
  const parsed = parseJsonText(text);
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
      const response = await fetch(endpoint.toString(), {
        method: "GET",
        headers: { Accept: "application/json, text/plain, */*" },
        redirect: "follow",
        signal: AbortSignal.timeout(BACKUP4_QQMP3_TIMEOUT_MS),
      });
      const text = await response.text();
      const parsed = parseJsonText(text);
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
  const keyword = [title, singer]
    .filter((item) => item && item !== "未知歌手" && item !== "未知歌曲" && !item.startsWith("ID "))
    .join(" ")
    .trim();

  // JKAPI 的 Key 必须由本 Worker 的管理员配置；未配置时静默跳过该备用源。
  if (!apiKey || !source || !keyword) return null;

  const endpoint = new URL(String(env.JKAPI_API_URL || BACKUP4_JKAPI_URL).trim());
  endpoint.searchParams.set("plat", source);
  endpoint.searchParams.set("type", "json");
  endpoint.searchParams.set("apiKey", apiKey);
  endpoint.searchParams.set("name", keyword);

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: { Accept: "application/json, text/plain, */*" },
    redirect: "follow",
    signal: AbortSignal.timeout(BACKUP4_TIMEOUT_MS),
  });
  const text = await response.text();
  const parsed = parseJsonText(text);
  const url = normalizeMediaUrl(parsed?.music_url || parsed?.data?.music_url || parsed?.data?.url || "");
  if (response.ok && Number(parsed?.code) === 1 && url) {
    return { url, provider: "jkapi" };
  }
  throw new Error(String(parsed?.msg || parsed?.message || `jkapi failed (${response.status})`));
}

async function backup4TryQqBackup3(platform, id) {
  if (platform !== "qq") return null;

  const result = await callQqBackup3ParseBySongmid(id);
  const url = normalizeMediaUrl(result?.parsed?.url || "");
  if (result?.response?.ok && result?.parsed?.success && url) {
    return { url, provider: "qq_backup3_parse" };
  }
  throw new Error(String(result?.parsed?.errMsg || "qq backup3 parse failed"));
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

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: { Accept: "application/json, text/plain, */*" },
    redirect: "follow",
    signal: AbortSignal.timeout(BACKUP4_TIMEOUT_MS),
  });
  const text = await response.text();
  const parsed = parseJsonText(text);
  const list = mapBackup4SearchItems(parsed);
  if (response.ok && list.length > 0) {
    return { list, provider: "gdstudio_search" };
  }
  throw new Error(String(parsed?.detail || parsed?.message || `gdstudio search failed (${response.status})`));
}

async function backup4SearchViaChkszMusic163(platform, keyword, page, limit) {
  if (platform !== "netease") return null;

  const endpoint = new URL(`${BACKUP4_CHKSZ_API_URL}/163_search`);
  endpoint.searchParams.set("keyword", keyword);
  endpoint.searchParams.set("limit", String(limit));
  endpoint.searchParams.set("offset", String(Math.max(0, (page - 1) * limit)));

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: { Accept: "application/json, text/plain, */*" },
    redirect: "follow",
    signal: AbortSignal.timeout(BACKUP4_TIMEOUT_MS),
  });
  const text = await response.text();
  const parsed = parseJsonText(text);
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

function getBackup4SearchChain(platform) {
  if (platform === "qq") {
    return [
      (p, k, page, limit) => backup4SearchViaQqBackup3(k, page, limit),
      (p, k, page, limit) => backup4SearchViaMethod(p, k, page, limit),
    ];
  }
  if (platform === "netease") {
    return [
      (p, k, page, limit) => backup4SearchViaGdstudio(p, k, page, limit),
      (p, k, page, limit) => backup4SearchViaMethod(p, k, page, limit),
      (p, k, page, limit) => backup4SearchViaChkszMusic163(p, k, page, limit),
    ];
  }
  return [
    (p, k, page, limit) => backup4SearchViaGdstudio(p, k, page, limit),
    (p, k, page, limit) => backup4SearchViaMethod(p, k, page, limit),
  ];
}

async function backup4Search(platform, keyword, page, limit) {
  const errors = [];
  const chain = getBackup4SearchChain(platform);
  for (const runner of chain) {
    try {
      const result = await runner(platform, keyword, page, limit);
      if (Array.isArray(result?.list) && result.list.length > 0) {
        return result;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err || "backup4 search error"));
    }
  }
  throw new Error(errors.join("; ") || "backup4 search failed");
}

function getBackup4ProviderChain(platform, env) {
  if (platform === "qq") {
    return [
      backup4TryOnrender,
      backup4TryLxmusicSigned,
      backup4TryQqBackup3,
      (p, id, quality, name, artist) => backup4TryJkapi(p, id, quality, name, artist, env),
    ];
  }
  if (platform === "netease") {
    return [
      backup4TryGdstudio,
      backup4TryOnrender,
      backup4TryLxmusicSigned,
      backup4TryOiapiMusic163,
      (p, id, quality, name, artist) => backup4TryJkapi(p, id, quality, name, artist, env),
      backup4TryChkszMusic163,
    ];
  }
  if (platform === "kuwo") {
    return [
      backup4TryGdstudio,
      backup4TryOnrender,
      backup4TryLxmusicSigned,
      backup4TryOiapiKuwo,
      backup4TryQqmp3,
    ];
  }
  return [];
}

async function handleBackup4(request, env) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;

  const reqUrl = new URL(request.url);
  const mode = String(reqUrl.searchParams.get("mode") || "url").trim().toLowerCase();
  const platform = normalizeBackup4Platform(reqUrl.searchParams.get("platform"));

  if (!BACKUP4_ALLOWED_PLATFORMS.has(platform)) {
    return jsonResponse(400, { code: -1, message: "备用源4参数无效: platform" });
  }

  if (mode === "search") {
    const keyword = String(reqUrl.searchParams.get("keyword") || "").trim();
    const page = toPositiveInt(reqUrl.searchParams.get("page"), 1);
    const limit = toPositiveInt(reqUrl.searchParams.get("limit"), 20);
    if (!keyword) {
      return jsonResponse(400, { code: -1, message: "缺少参数: keyword" });
    }
    try {
      const result = await backup4Search(platform, keyword, page, limit);
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
  const chain = getBackup4ProviderChain(platform, env);
  for (const runner of chain) {
    try {
      const result = await runner(platform, id, quality, name, artist);
      if (result?.url) {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || "unknown backup4 error");
      errors.push(message);
    }
  }

  return jsonResponse(502, {
    code: -1,
    message: "备用源4全部失败",
    errors,
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
