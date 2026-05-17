# document-service

Secure document ingestion for SCDA: **JWT auth**, **extension/MIME allowlists**, **AES-256-GCM encryption at rest**, **SHA-256 integrity**, **RabbitMQ** `document.uploaded` jobs, **append-only JSONL audit** logs, and **RBAC** (users see only their rows; admins see all).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | yes | Same as `auth-service` |
| `DATABASE_URL` | yes | PostgreSQL (`users` table must exist) |
| `ENCRYPTION_KEY` | yes | **64 hex characters** (32 bytes) for AES-256-GCM |
| `RABBITMQ_URL` | yes | AMQP connection string |
| `UPLOAD_DIR` | no | Encrypted file root (default `./uploads`; Docker `/app/uploads`) |
| `MAX_FILE_SIZE` | no | Max plaintext bytes before encryption (default 20 MiB). `MAX_FILE_BYTES` is accepted as an alias. |
| `ALLOWED_MIME_TYPES` | no | Comma-separated lowercase MIME list |
| `ALLOWED_EXTENSIONS` | no | Comma-separated lowercase extensions (must include leading `.`) |
| `DOCUMENT_JOBS_QUEUE` | no | Queue name (default `document.jobs`) |
| `AUDIT_LOG_FILE` | no | JSONL audit path (default `<UPLOAD_DIR>/.audit/documents.jsonl`) |

Generate a dev **ENCRYPTION_KEY** (PowerShell):

```powershell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
```

## Data model (`documents`)

`id`, `user_id`, `original_filename`, `stored_filename` (opaque `.enc` name), `encrypted_path` (relative path under `UPLOAD_DIR`), `mime_type`, `size` (plaintext bytes), `sha256_hash` (hex of plaintext), `status` (`uploaded` → `queued` when RabbitMQ publish succeeds), `created_at`, `updated_at`.

## Security behavior

- **Blocked extensions** anywhere in the basename pattern: `.exe`, `.php`, `.js`, `.bat`, `.sh` (case-insensitive), plus extension allowlist enforcement.
- **MIME allowlist** on upload (multer + service).
- **Disk**: only **encrypted** blobs are written for new uploads (`enc/../*.enc`).
- **Integrity**: `GET /api/documents/:id/verify` decrypts (when applicable), recomputes SHA-256, compares with `crypto.timingSafeEqual`.
- **Errors**: JSON `{ error: { message } }` — no stack traces in HTTP responses.
- **Audit** (no file contents, no secrets): `document.upload.stored`, `document.upload.queued`, `document.upload.queue_failed`, `document.verify*`, `document.download`, `document.delete`.

## API (prefix `/api/documents`)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| `GET` | `/me` | JWT | Smoke |
| `GET` | `/admin/ping` | JWT + admin | Smoke |
| `POST` | `/upload` | JWT | `multipart/form-data` field **`file`** |
| `GET` | `/` | JWT | List (trailing slash through nginx: `/api/documents/`) |
| `GET` | `/:id/verify` | JWT | Integrity JSON |
| `GET` | `/:id/download` | JWT | Decrypted bytes, original MIME |
| `GET` | `/:id` | JWT | Metadata JSON |
| `DELETE` | `/:id` | JWT | Deletes ciphertext + DB row |

## RabbitMQ message

Queue: `DOCUMENT_JOBS_QUEUE` (default `document.jobs`), durable. Payload JSON includes `event: "document.uploaded"`, `documentId`, `userId`, `mimeType`, `size`, `sha256`. Header `x-event: document.uploaded`.

If publish fails, the document stays `uploaded` and an audit `document.upload.queue_failed` line is written.

---

## Exact PowerShell — rebuild, run, test (via NGINX)

**0) Required environment** next to `docker-compose.yml` in a `.env` file (or export in the shell before Compose):

- `JWT_SECRET`
- `ENCRYPTION_KEY` — **64 hex characters** (see generator above)
- `RABBITMQ_URL` — must match the `rabbitmq` service user/password (see root `.env.example`; dedicated user, not guest)

Quick session override (PowerShell, not persisted):

```powershell
$env:ENCRYPTION_KEY = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
```

```powershell
Set-Location "C:\Users\Seif\OneDrive\Desktop\FINAL-DIST"

docker compose build document-service nginx-api-gateway
docker compose up -d postgres rabbitmq auth-service document-service nginx-api-gateway
```

**1) Login and save token**

```powershell
$login = Invoke-RestMethod -Uri "http://localhost/api/auth/login" `
  -Method Post `
  -Body '{"email":"testuser@example.com","password":"password123"}' `
  -ContentType "application/json"
$token = $login.access_token
$headers = @{ Authorization = "Bearer $token" }
```

**3) Upload a valid PDF** (path to a real `.pdf` on disk):

```powershell
$pdf = "C:\path\to\sample.pdf"
curl.exe -s -X POST "http://localhost/api/documents/upload" `
  -H "Authorization: Bearer $token" `
  -F "file=@$pdf;type=application/pdf"
```

**4) Reject invalid extension** (wrong name but PDF MIME — still blocked):

```powershell
$bad = Join-Path $env:TEMP "malware.exe"
Set-Content -Path $bad -Value "not-a-real-exe" -Encoding Byte
try {
  curl.exe -s -i -X POST "http://localhost/api/documents/upload" `
    -H "Authorization: Bearer $token" `
    -F "file=@$bad;type=application/pdf"
} catch { $_ }
```

Expect HTTP **415** with `File extension not allowed`.

**5) Reject missing token**

```powershell
try {
  Invoke-RestMethod -Uri "http://localhost/api/documents/" -Method Get
} catch {
  $_.Exception.Response.StatusCode.value__
  $_.ErrorDetails.Message
}
```

Expect **401** / `Authentication required`.

**6) List documents**

```powershell
Invoke-RestMethod -Uri "http://localhost/api/documents/" -Headers $headers | ConvertTo-Json -Depth 8
```

**7) Verify integrity** (set `$docId` from upload/list JSON):

```powershell
$docId = "PASTE_UUID"
Invoke-RestMethod -Uri "http://localhost/api/documents/$docId/verify" -Headers $headers | ConvertTo-Json -Depth 6
```

**8) Download decrypted file**

```powershell
curl.exe -s -D - -o "$env:TEMP\downloaded.pdf" `
  -H "Authorization: Bearer $token" `
  "http://localhost/api/documents/$docId/download"
```

**9) Delete**

```powershell
Invoke-RestMethod -Uri "http://localhost/api/documents/$docId" -Headers $headers -Method Delete | ConvertTo-Json
```

**10) Admin access** — log in as a PostgreSQL `admin` user; `GET http://localhost/api/documents/` lists **all** documents; `GET`/`download`/`verify`/`DELETE` work for **any** `id`. A normal user receives **404** on another user’s id.

**Audit tail (inside container)**

```powershell
docker compose exec document-service sh -c "tail -n 20 /app/uploads/.audit/documents.jsonl"
```

Legacy rows (created before encryption) may have empty `sha256_hash`; verify/download use compatibility behavior documented in code comments.
