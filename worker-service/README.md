# worker-service

Consumes **`document.jobs`** (`document.uploaded` JSON payloads from document-service), simulates processing (virus scan / OCR / metadata), updates **`documents.status`** in PostgreSQL (`queued` → `processing` → **`ready`** — the Prisma enum has no `processed`; **`ready` is the terminal processed state**), and posts structured rows to **audit-service** via `POST /api/audit/log` using **`INTERNAL_API_KEY`**.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | Same Postgres as document-service |
| `RABBITMQ_URL` | yes | AMQP URL |
| `INTERNAL_API_KEY` | yes | Same value audit-service expects (`X-Internal-Api-Key`) |
| `AUDIT_SERVICE_URL` | yes | e.g. `http://audit-service:3004` in Compose |
| `DOCUMENT_JOBS_QUEUE` | no | Default `document.jobs` |
| `DOCUMENT_JOBS_DLQ` | no | Default `document.jobs.dlq` |
| `RABBIT_PREFETCH` | no | Default `1` |

## Behaviour

- **Malformed JSON / unknown event / bad UUID** → message copied to **DLQ** (`document.jobs.dlq`), **acked** from main queue (poison-safe).
- **Unknown document id** → DLQ + **ack**.
- **Document already `ready`** → audit `worker.document.duplicate`, **ack** (idempotent).
- **Document `failed`** → DLQ + **ack**.
- **Processing throws** → first failure **nack(requeue=true)** once; if redelivered and still failing → **DLQ**, document set to **`failed`**, **ack**.

## Prisma

`prisma/schema.prisma` mirrors the `documents` table for type-safe updates. **Migrations are not shipped here** — run `npx prisma generate` (Dockerfile does this). Schema changes remain owned by **document-service**.

---

## PowerShell — rebuild, run, verify

From repo root (`.env` must include `JWT_SECRET`, `INTERNAL_API_KEY`, `ENCRYPTION_KEY`, etc.):

```powershell
Set-Location "C:\Users\Seif\OneDrive\Desktop\FINAL-DIST"

docker compose build worker-service
docker compose up -d postgres rabbitmq auth-service document-service audit-service worker-service
```

**Upload a document** (uses existing auth user; produces Rabbit job when queue publish succeeds):

```powershell
$login = Invoke-RestMethod -Uri "http://localhost/api/auth/login" `
  -Method Post `
  -Body '{"email":"testuser@example.com","password":"password123"}' `
  -ContentType "application/json"

$token = $login.access_token
$tmp = Join-Path $env:TEMP "worker-test.txt"
Set-Content -Path $tmp -Value "worker pipeline test" -Encoding utf8

$upload = curl.exe -s -X POST "http://localhost/api/documents/upload" `
  -H "Authorization: Bearer $token" `
  -F "file=@$tmp;type=text/plain" | ConvertFrom-Json

$docId = $upload.document.id
$docId
```

**Watch worker logs**

```powershell
docker compose logs -f worker-service
```

**Confirm document status** (`ready` means processed):

```powershell
Invoke-RestMethod -Uri "http://localhost/api/documents/$docId" `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 6
```

**Verify audit-service received worker events** (`GET /api/audit/logs` is **admin-only** — promote a user to `admin` in Postgres per `auth-service/README.md`, then log in as that user):

```powershell
$adminLogin = Invoke-RestMethod -Uri "http://localhost/api/auth/login" `
  -Method Post `
  -Body '{"email":"YOUR_ADMIN_EMAIL","password":"YOUR_ADMIN_PASSWORD"}' `
  -ContentType "application/json"

$adminHeaders = @{ Authorization = "Bearer $($adminLogin.access_token)" }
Invoke-RestMethod -Uri "http://localhost/api/audit/logs?action=worker.document&service=worker-service" -Headers $adminHeaders | ConvertTo-Json -Depth 8
```

**Inspect DLQ** (management UI): `http://localhost:15672` — log in with `RABBITMQ_USER` / `RABBITMQ_PASS` from root `.env` (see `.env.example`; not `guest`/`guest`).
