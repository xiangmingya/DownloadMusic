import assert from "node:assert/strict";
import worker from "./src/index.js";

const secret = "admin-user-management-test";
const users = new Map([
  ["admin1", { linuxdo_id: "admin1", name: "管理员", disabled_at: null, last_used_at: null }],
  ["user1", { linuxdo_id: "user1", name: "测试用户", disabled_at: null, last_used_at: "2026-08-09T08:00:00.000Z" }],
]);
const apiKey = {
  id: 7,
  owner_key: "linuxdo:user1",
  api_key: "xm_1234567890abcdef1234567890abcdef",
  name: "默认",
  created_at: "2026-08-01T08:00:00.000Z",
  last_used_at: "2026-08-10T08:00:00.000Z",
  mi_uid: "12345678",
  device_id: "speaker-1",
  device_name: "客厅音箱",
  device_token: "device-token",
  bound_at: "2026-08-02T08:00:00.000Z",
  enabled: 1,
  expires_at: null,
};

const DB = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes("FROM linuxdo_users WHERE linuxdo_id = ?")) return users.get(String(args[0])) || null;
            if (sql.includes("FROM api_keys WHERE owner_key = ?")) return args[0] === apiKey.owner_key ? { ...apiKey } : null;
            if (sql.includes("FROM api_keys WHERE api_key = ?")) return args[0] === apiKey.api_key ? { ...apiKey } : null;
            if (sql.includes("FROM memberships WHERE linuxdo_id")) return { expires_at: "2027-01-01T00:00:00.000Z", updated_at: "2026-08-01T00:00:00.000Z" };
            if (sql.includes("FROM app_settings")) return { value: "10.00" };
            return null;
          },
          async all() {
            if (sql.includes("FROM memberships m")) {
              const user = users.get("user1");
              return { results: [{
                linuxdo_id: "user1",
                expires_at: "2027-01-01T00:00:00.000Z",
                updated_at: "2026-08-01T00:00:00.000Z",
                name: user.name,
                avatar: "",
                registered_at: "2026-07-01T00:00:00.000Z",
                last_login_at: "2026-08-08T00:00:00.000Z",
                last_used_at: user.last_used_at,
                recent_used_at: apiKey.last_used_at,
                disabled_at: user.disabled_at,
                api_key_id: apiKey.id,
                api_key_enabled: apiKey.enabled,
                membership_started_at: "2026-08-01T00:00:00.000Z",
              }] };
            }
            return { results: [] };
          },
          async run() {
            if (sql.startsWith("UPDATE linuxdo_users SET last_used_at")) {
              const user = users.get(String(args[1]));
              if (user) user.last_used_at = args[0];
              return { meta: { changes: user ? 1 : 0 } };
            }
            if (sql.startsWith("UPDATE linuxdo_users SET disabled_at")) {
              const user = users.get(String(args[1]));
              if (user) user.disabled_at = args[0];
              return { meta: { changes: user ? 1 : 0 } };
            }
            if (sql.startsWith("UPDATE api_keys SET enabled")) {
              if (args[1] !== apiKey.owner_key) return { meta: { changes: 0 } };
              apiKey.enabled = Number(args[0]);
              return { meta: { changes: 1 } };
            }
            if (sql.startsWith("UPDATE api_keys SET last_used_at")) {
              apiKey.last_used_at = args[0];
              return { meta: { changes: 1 } };
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

function b64url(value) {
  return Buffer.from(value).toString("base64url");
}

async function sessionCookie(linuxdoId, name) {
  const body = b64url(JSON.stringify({
    type: "linuxdo",
    user: { id: linuxdoId, linuxdo_id: linuxdoId, name },
    exp: Math.floor(Date.now() / 1000) + 3600,
  }));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `dm_session=${body}.${Buffer.from(signature).toString("base64url")}`;
}

const env = { DB, SESSION_SECRET: secret, ADMIN_LINUXDO_IDS: "admin1", MEMBERSHIP_REQUIRED: "true" };
const adminCookie = await sessionCookie("admin1", "管理员");
const userCookie = await sessionCookie("user1", "测试用户");
const jsonRequest = (path, body) => new Request(`https://api.example.com${path}`, {
  method: "PUT",
  headers: { Cookie: adminCookie, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const membersResponse = await worker.fetch(new Request("https://api.example.com/api/admin/members", { headers: { Cookie: adminCookie } }), env);
const members = (await membersResponse.json()).data.members;
assert.equal(membersResponse.status, 200);
assert.equal(members[0].last_used_at, apiKey.last_used_at, "member list should show latest real use including API Key activity");
assert.equal(members[0].has_api_key, true);

const keyResponse = await worker.fetch(new Request("https://api.example.com/api/admin/members/api-key?linuxdo_id=user1", { headers: { Cookie: adminCookie } }), env);
const keyPayload = await keyResponse.json();
assert.equal(keyResponse.status, 200);
assert.equal(keyPayload.data.key.device_name, "客厅音箱");
assert.equal(keyPayload.data.key.key_preview.includes("*"), true);
assert.equal("api_key" in keyPayload.data.key, false, "admin API must not expose the full API key");

const disableUser = await worker.fetch(jsonRequest("/api/admin/members/status", { linuxdo_id: "user1", disabled: true }), env);
assert.equal(disableUser.status, 200);
const blockedSession = await worker.fetch(new Request("https://api.example.com/api/auth/me", { headers: { Cookie: userCookie } }), env);
assert.equal(blockedSession.status, 403, "disabling a user should invalidate existing sessions");
const blockedKey = await worker.fetch(new Request("https://api.example.com/api/auth/me", { headers: { "X-DM-Key": apiKey.api_key } }), env);
assert.equal(blockedKey.status, 403, "disabling a user should also block their API Key");

await worker.fetch(jsonRequest("/api/admin/members/status", { linuxdo_id: "user1", disabled: false }), env);
const disableKey = await worker.fetch(jsonRequest("/api/admin/members/api-key", { linuxdo_id: "user1", enabled: false }), env);
assert.equal(disableKey.status, 200);
const rejectedDisabledKey = await worker.fetch(new Request("https://api.example.com/api/auth/me", { headers: { "X-DM-Key": apiKey.api_key } }), env);
assert.equal(rejectedDisabledKey.status, 401, "an administrator-disabled API Key must be rejected");

const disableAdmin = await worker.fetch(jsonRequest("/api/admin/members/status", { linuxdo_id: "admin1", disabled: true }), env);
assert.equal(disableAdmin.status, 400, "administrator accounts must be protected from accidental disable");

console.log("admin user and API Key management: ok");
