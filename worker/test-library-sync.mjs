import assert from "node:assert/strict";
import worker from "./src/index.js";

const documents = new Map();
const DB = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (!sql.includes("FROM user_libraries")) return null;
            const record = documents.get(args[0]);
            return record ? { document: record.document, updated_at: record.updatedAt } : null;
          },
          async run() {
            if (sql.includes("INSERT INTO user_libraries")) {
              documents.set(args[0], { document: args[1], updatedAt: args[2] });
            }
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
  ALLOWED_ORIGINS: "https://music.example.com",
};

const login = await worker.fetch(new Request("https://api.example.com/api/auth/login/password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: "family-password" }),
}), env);
assert.equal(login.status, 200);
const cookie = login.headers.get("Set-Cookie").split(";", 1)[0];

const library = { version: 1, favorites: [{ id: "1", name: "测试", platform: "qq" }], recent: [], playlists: [] };
const save = await worker.fetch(new Request("https://api.example.com/api/library", {
  method: "PUT",
  headers: { "Content-Type": "application/json", Cookie: cookie, Origin: "https://music.example.com" },
  body: JSON.stringify({ library }),
}), env);
assert.equal(save.status, 200);

const read = await worker.fetch(new Request("https://api.example.com/api/library", {
  headers: { Cookie: cookie, Origin: "https://music.example.com" },
}), env);
assert.equal(read.status, 200);
assert.deepEqual((await read.json()).data.library, library);
assert.equal(documents.size, 1);

console.log("library sync route: ok");
