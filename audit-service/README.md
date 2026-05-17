# audit-service

Centralized **audit log API** for SCDA. Stores rows in PostgreSQL (`audit_logs`). Ingestion from other services uses **`X-Internal-Api-Key`**. Admin dashboards use **JWT** (same `JWT_SECRET` as auth).

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection |
| `JWT_SECRET` | yes | Same as auth-service (HS256 Bearer tokens) |
| `INTERNAL_API_KEY` | yes | Shared secret for `POST /api/audit/log` |
| `AUDIT_PAGE_SIZE` | no | Default page size (default `50`) |
| `AUDIT_MAX_PAGE_SIZE` | no | Max `limit` (default `200`) |

## API (`/api/audit`)

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/audit/log` | Header **`X-Internal-Api-Key`** = `INTERNAL_API_KEY` |
| `GET` | `/api/audit/logs` | JWT **admin** |
| `GET` | `/api/audit/logs/:id` | JWT **admin** |
| `GET` | `/api/audit/logs/stats` | JWT **admin** |

### POST `/api/audit/log` JSON body

- `service` (string, required)
- `action` (string, required)
- `status` (string, required)
- `user_id` (UUID, optional)
- `ip_address` (string, optional)
- `details` (object, optional)

### List filters (query string)

`user_id`, `service`, `action`, `status`, `from`, `to` (ISO-8601), `limit`, `offset`.

### Stats summary

`stats` applies the same filters as list (when provided) for audit-derived counts. Counts:

- `total_logs` / `total_requests` — audit rows matching filters
- `total_users` — row count in shared `users` table (global)
- `failed_logins` — actions mentioning `login` with failed-style **status**, or `login.failed` in action
- `uploaded_files` — row count in shared `documents` table (global)
- `uploads` — audit action contains `upload`
- `downloads` — action contains `download`
- `processed_jobs` — `document.indexing.completed` or `worker.document.processing.completed`
- `unauthorized_attempts` — `status` / action mentions `unauthorized`
- `ai_queries` — `ai.search.completed`, `ai.analyze.completed`, or `chat.message.sent`

## Database

Prisma migration `20260512200000_audit_logs` creates `audit_logs`.

## Docker / Nginx

Compose injects `DATABASE_URL`, `JWT_SECRET`, `INTERNAL_API_KEY`. Gateway path: `/api/audit/` → `audit-service:3004/api/audit/`.

---

## PowerShell — rebuild, run, test

**Prerequisites:** project `.env` (next to `docker-compose.yml`) must define **`JWT_SECRET`**, **`INTERNAL_API_KEY`**, and keys required by other services you start.

```powershell
Set-Location "C:\Users\Seif\OneDrive\Desktop\FINAL-DIST"

docker compose build audit-service nginx-api-gateway
docker compose up -d postgres auth-service audit-service nginx-api-gateway
```

**Create a log (internal key)** — replace key with your `INTERNAL_API_KEY` value:

```powershell
$key = "YOUR_INTERNAL_API_KEY"

$body = @{
  service = "document-service"
  action    = "document.test"
  status    = "success"
  user_id   = "00000000-0000-0000-0000-000000000001"
  ip_address = "203.0.113.10"
  details   = @{ note = "hello from powershell" }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost/api/audit/log" `
  -Method Post `
  -Headers @{ "X-Internal-Api-Key" = $key; "Content-Type" = "application/json" } `
  -Body $body | ConvertTo-Json -Depth 6
```

**Login as admin & query logs**

```powershell
$login = Invoke-RestMethod -Uri "http://localhost/api/auth/login" `
  -Method Post `
  -Body '{"email":"testuser@example.com","password":"password123"}' `
  -ContentType "application/json"

$headers = @{ Authorization = "Bearer $($login.access_token)" }

Invoke-RestMethod -Uri "http://localhost/api/audit/logs?limit=20" -Headers $headers | ConvertTo-Json -Depth 8

Invoke-RestMethod -Uri "http://localhost/api/audit/logs/stats" -Headers $headers | ConvertTo-Json -Depth 6
```

**Fetch one log by id** (paste UUID from create/list response):

```powershell
$logId = "PASTE_UUID"
Invoke-RestMethod -Uri "http://localhost/api/audit/logs/$logId" -Headers $headers | ConvertTo-Json -Depth 6
```

**Filter example**

```powershell
Invoke-RestMethod -Uri "http://localhost/api/audit/logs?service=document-service&from=2026-01-01T00:00:00.000Z" `
  -Headers $headers | ConvertTo-Json -Depth 6
```

Non-admin JWT receives **403** on GET audit endpoints.
