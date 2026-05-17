# SCDA Frontend (Vite + React)

Single-page application for the Secure Compliance Document Assistant. All API calls go through the **nginx gateway** using same-origin paths (`/api/...`) when deployed behind `https://localhost`.

## Environment

| Variable | When | Description |
|----------|------|---------------|
| `VITE_API_BASE_URL` | **Build time** | Empty = same-origin `/api`. Set to full origin (e.g. `https://localhost`) only if the static bundle is hosted on a different origin. |
| `VITE_DEV_PROXY_TARGET` | **Dev only** | Target for Vite proxy (default `https://localhost`). Used with `npm run dev` so `/api` proxies to the gateway with TLS verification disabled for self-signed certs. |

## Local development

```powershell
Set-Location "C:\Users\Seif\OneDrive\Desktop\FINAL-DIST\frontend"
npm install
npm run dev
```

Open `http://127.0.0.1:5173` — API requests use the Vite dev proxy to `https://localhost` (see `vite.config.ts`). Your gateway must be up with valid TLS.

## Production (Docker)

Built by `docker compose build frontend` and served on port **80** inside the `frontend` container. **nginx-api-gateway** proxies `/` to this service.

```powershell
Set-Location "C:\Users\Seif\OneDrive\Desktop\FINAL-DIST"
docker compose build frontend nginx-api-gateway
docker compose up -d
# SPA: https://localhost/
```

## Features

- Login / register (no role picker — backend assigns `user` by default).
- Dashboard, documents (upload, list, verify, download, delete, status polling).
- AI analyze + semantic search.
- Admin audit logs + stats (admin only).
- Security overview page; JWT stored in `localStorage` (`scda_access_token`) for this student build.
