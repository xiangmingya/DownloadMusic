# Cloudflare Worker（鉴权 + 代理）

这个 Worker 提供：
- 密码登录
- Linux DO OAuth 登录
- 会话管理（HttpOnly Cookie）
- 代理接口：`/api/proxy/methods` `/api/proxy/method` `/api/proxy/parse` `/api/proxy/meta`

## 路由

- `POST /api/auth/login/password`
- `GET /api/auth/login/linuxdo`
- `GET /api/auth/callback/linuxdo`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/linuxdo-status`

## 必填 Secrets

```bash
wrangler secret put SESSION_SECRET
wrangler secret put ADMIN_PASSWORD
wrangler secret put TUNEHUB_API_KEY
wrangler secret put LINUXDO_CLIENT_ID
wrangler secret put LINUXDO_CLIENT_SECRET
wrangler secret put LINUXDO_REDIRECT_URI
```

## 快速部署

1. 复制配置：
```bash
cp worker/wrangler.toml.example worker/wrangler.toml
```

2. 修改 `worker/wrangler.toml` 的 `ALLOWED_ORIGIN`、`FRONTEND_URL`

3. 配置上面的 secrets

4. 发布：
```bash
cd worker
wrangler deploy
```

## 前端对接要求

- 前端页面在仓库 `web/` 目录（帽子云发布目录设置为 `web/`）
- 前端接口基址：
  - `AUTH_API_BASE=https://你的worker域名/api/auth`
  - `APP_API_BASE=https://你的worker域名/api/proxy`
- 浏览器请求必须带 `credentials: 'include'`
- Linux DO 用户 key 继续只存浏览器本地，并在请求头 `X-Tunehub-Key` 携带

## Cookie 注意事项

- 若前端和 Worker 是跨站点域名，浏览器可能拦截第三方 Cookie
- 最稳方案：前端与 Worker 使用同一主域的子域名（例如 `app.example.com` + `api.example.com`）
- `ALLOWED_ORIGIN` 必须精确填写前端地址（含 `https://`）
