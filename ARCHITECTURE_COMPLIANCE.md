# Architecture Compliance Report — SCDA (FINAL-DIST)

**Project:** Secure Compliance Document Assistant  
**Checked against:** Distributed-systems final project PDF (mandatory services + AI extensions)  
**Date:** 2026-05-16  
**Verdict:** **All mandatory architecture items are MET.** No blocking gaps; no database volume reset required.

---

## Executive summary

| Tier | Result |
|------|--------|
| Core distributed architecture (items 1–8) | **Met** |
| AI extensions (items 9–10) | **Met** |
| Expected Compose services (10 containers) | **Met** — all present and routable |

**Business service mapping (this repo):**

| Rubric role | Service |
|-------------|---------|
| Business Service 1 | `document-service` |
| Business Service 2 | `audit-service` (central audit + admin monitoring) |
| Logging / Audit (item 8) | `audit-service` (same service; satisfies both) |
| AI / RAG | `ai-service` |
| Vector DB | `qdrant` |
| Background processing | `worker-service` (not exposed via gateway; consumes queue) |

---

## Compliance matrix

| # | Required item | Implementation in this project | Status | Evidence (file / path) | Test command or screenshot |
|---|---------------|------------------------------|--------|------------------------|----------------------------|
| **1a** | API Gateway (Nginx or similar) | `nginx-api-gateway` service; `nginx/nginx.conf` | **Met** | `docker-compose.yml` L4–27, `nginx/nginx.conf` | `docker compose ps nginx-api-gateway` |
| **1b** | HTTPS | TLS on `:443` with certs in `nginx/certs/` | **Met** | `nginx/nginx.conf` L63–74 | Browser: `https://localhost` (padlock). `curl.exe -sk https://localhost/nginx-health` |
| **1c** | Rate limiting | `limit_req_zone` + per-route `limit_req` | **Met** | `nginx/nginx.conf` L21–25, L96–137 | Burst login attempts → HTTP 429 on `/api/auth/login` |
| **1d** | HTTP → HTTPS redirect | Port 80 redirects except `/nginx-health` | **Met** | `nginx/nginx.conf` L47–60 | `curl.exe -sI http://localhost/` → `301` Location `https://...` |
| **1e** | Route auth, documents, audit, AI, frontend | Upstreams + `location` blocks | **Met** | `nginx/nginx.conf` L27–45, L104–140 | `curl.exe -sk https://localhost/api/auth/profile` (401 without token) |
| **2a** | Register | `POST /api/auth/register` | **Met** | `auth-service/src/routes/auth.routes.js` L29–34 | See § PowerShell — Register |
| **2b** | Login | `POST /api/auth/login` | **Met** | `auth-service/src/routes/auth.routes.js` L36 | See § PowerShell — Login |
| **2c** | JWT generation | `signAccessToken` / `buildLoginResult` | **Met** | `auth-service/src/utils/jwt.util.js`, `loginResult.util.js` | Login response contains `access_token` |
| **2d** | Password hashing (bcrypt) | `bcrypt.hash` / `bcrypt.compare` | **Met** | `auth-service/src/utils/password.util.js` | DB: `users.password_hash` is bcrypt, not plaintext |
| **2e** | Protected routes | `authenticate` middleware on profile, documents, AI, audit admin | **Met** | `auth-service/src/middleware/auth.middleware.js`, per-service routes | `GET /api/auth/profile` without `Authorization` → 401 |
| **3a** | Business Service 1 — documents | `document-service` | **Met** | `docker-compose.yml` L68–98, `document-service/` | `curl.exe -sk https://localhost/api/documents/` with JWT |
| **3b** | Secure file upload | Multer + auth + MIME/size checks | **Met** | `document-service/src/routes/document.routes.js` L51–57, `upload.middleware.js` | See § PowerShell — Document upload |
| **3c** | Document metadata | Prisma `Document` model + list/get APIs | **Met** | `document-service/prisma/schema.prisma`, `document.service.js` | `GET /api/documents/{id}` |
| **3d** | Encryption at rest | AES-256-GCM before write | **Met** | `document-service/src/utils/encryption.util.js`, `document.service.js` | Encrypted blob on disk under `uploads/` volume |
| **3e** | Integrity verification | SHA-256 hash stored + verify endpoint | **Met** | `document.service.js` `verifyDocument`, `GET .../verify` | See § PowerShell — Verify integrity |
| **3f** | RabbitMQ job publishing | `publishDocumentUploaded` → `document.jobs` | **Met** | `document-service/src/services/rabbitmq.service.js` | See § PowerShell — RabbitMQ queue |
| **4a** | Business Service 2 — audit | `audit-service` (admin logs + stats) | **Met** | `audit-service/`, `GET /api/audit/logs` | Admin JWT → `/audit` UI or stats API |
| **4b** | `audit_logs` table | Prisma `AuditLog` → `audit_logs` | **Met** | `audit-service/prisma/schema.prisma`, migration `20260512200000_audit_logs` | See § PostgreSQL tables |
| **4c** | Log creation | `POST /api/audit/log` (internal API key) | **Met** | `audit-service/src/routes/audit.routes.js` L21–27 | Services call with `X-Internal-Api-Key` |
| **4d** | Admin log retrieval | `GET /api/audit/logs` (admin JWT) | **Met** | `audit-service/src/routes/audit.routes.js` L47–54 | See § PowerShell — Audit logs |
| **4e** | Stats / monitoring endpoint | `GET /api/audit/logs/stats` | **Met** | `audit-service/src/services/audit.service.js` `getStats()` | See § PowerShell — Audit stats |
| **5a** | PostgreSQL | `postgres` service + shared `scda_db` | **Met** | `docker-compose.yml` L180–197 | `docker compose ps postgres` |
| **5b** | `users` table | Auth Prisma `User` → `users` | **Met** | `auth-service/prisma/schema.prisma` | `SELECT COUNT(*) FROM users;` |
| **5c** | `documents` table | Document Prisma `Document` → `documents` | **Met** | `document-service/prisma/schema.prisma` | `SELECT COUNT(*) FROM documents;` |
| **5d** | `audit_logs` table | Audit Prisma `AuditLog` | **Met** | `audit-service/prisma/schema.prisma` | `SELECT COUNT(*) FROM audit_logs;` |
| **5e** | `chat_sessions` / `chat_messages` | AI service Prisma models | **Met** | `ai-service/prisma/schema.prisma` | `SELECT COUNT(*) FROM chat_sessions;` |
| **5f** | `document_chunks` | Document Prisma `DocumentChunk` | **Met** | `document-service/prisma/schema.prisma` | `SELECT COUNT(*) FROM document_chunks;` |
| **6a** | Message queue (RabbitMQ) | `rabbitmq:3-management-alpine` | **Met** | `docker-compose.yml` L199–208 | `docker compose ps rabbitmq` |
| **6b** | Custom user (not guest/guest) | `RABBITMQ_DEFAULT_USER` / `RABBITMQ_USER` default `scda_mq` | **Met** | `docker-compose.yml` L205–206, `.env` `RABBITMQ_USER` | `docker compose exec rabbitmq rabbitmqctl list_users` |
| **6c** | `document.jobs` queue | Asserted by publisher and consumer | **Met** | `document-service` + `worker-service` `env.js` | See § PowerShell — RabbitMQ |
| **7a** | Worker service | `worker-service` | **Met** | `docker-compose.yml` L148–178 | `docker compose ps worker-service` |
| **7b** | Consumes `document.jobs` | `channel.consume(documentJobsQueue)` | **Met** | `worker-service/src/services/rabbit.consumer.js` L155–160 | Worker logs after upload |
| **7c** | Processes documents | Extract, chunk, index, Qdrant upsert | **Met** | `worker-service/src/processing/`, `ragIndexer.js` | Document status → `ready` / `indexed` |
| **7d** | Updates status | Prisma document status transitions | **Met** | `rabbit.consumer.js`, `ragIndexer.js` | `GET /api/documents/{id}` shows `ready` |
| **7e** | Logs audit events | `audit.client` from worker | **Met** | `worker-service/src/services/rabbit.consumer.js`, `ragIndexer.js` | Actions `document.indexing.completed`, etc. |
| **8** | Logging / Audit service | `audit-service` (see 4) | **Met** | Same as Business Service 2 | Central audit for auth, document, AI, worker |
| **9a** | AI service | `ai-service` — search, analyze, chat | **Met** | `ai-service/`, `docker-compose.yml` L100–129 | `GET /api/ai/health` |
| **9b** | Semantic search | `GET /api/ai/search` | **Met** | `ai-service/src/routes/ai.routes.js`, `semanticSearch.service.js` | See § PowerShell — Semantic search |
| **9c** | RAG / chatbot | `POST /api/ai/chat/...` | **Met** | `ai-service/src/routes/chat.routes.js`, `chat.service.js` | UI: Knowledge workspace `/ai` |
| **9d** | Qdrant integration | `qdrant.client.js`, `QDRANT_URL` | **Met** | `ai-service/src/services/qdrant.client.js` | Health JSON includes Qdrant status |
| **9e** | Document-scoped retrieval | `document_id` filter + `selected_document_id` on chat | **Met** | `semanticSearch.service.js`, `chat.service.js` | Search with `?document_id=` or select doc in chat |
| **10a** | Vector database (Qdrant) | `qdrant` service | **Met** | `docker-compose.yml` L210–218 | `docker compose ps qdrant` |
| **10b** | Collection configured | `QDRANT_COLLECTION` default `scda_ai`, `ensureCollection()` | **Met** | `ai-service` + `worker-service` `qdrant.client.js` | See § PowerShell — Qdrant collection |
| **10c** | Vectors for document chunks | Worker upserts points with `document_id` payload | **Met** | `worker-service/src/services/ragIndexer.js` | Collection `points_count` > 0 after indexing |
| — | Frontend (SPA) | `frontend` behind gateway `/` | **Met** | `docker-compose.yml` L29–36 | Screenshot: login + workspace UI |
| — | `worker-service` not on gateway | Internal only (by design) | **Met** | No nginx upstream for worker | Correct for queue-driven workers |

---

## Docker Compose service checklist

| Expected service | Compose key | Image / build | Status |
|------------------|---------------|---------------|--------|
| nginx-api-gateway | `nginx-api-gateway` | `./nginx/Dockerfile` | **Present** |
| auth-service | `auth-service` | `./auth-service` | **Present** |
| document-service | `document-service` | `./document-service` | **Present** |
| audit-service | `audit-service` | `./audit-service` | **Present** |
| worker-service | `worker-service` | `./worker-service` | **Present** |
| ai-service | `ai-service` | `./ai-service` | **Present** |
| frontend | `frontend` | `./frontend` | **Present** |
| postgres | `postgres` | `postgres:16-alpine` | **Present** |
| rabbitmq | `rabbitmq` | `rabbitmq:3-management-alpine` | **Present** |
| qdrant | `qdrant` | `qdrant/qdrant:latest` | **Present** |

---

## NGINX gateway detail

| Check | Result | Location |
|-------|--------|----------|
| Auth routes | `/api/auth/` → `auth-service:3001` | `nginx/nginx.conf` L104–110 |
| Document routes | `/api/documents/` → `document-service:3002` | L112–118 |
| AI routes (search, chat, health) | `/api/ai/` → `ai-service:3003` | L120–126 |
| Audit routes | `/api/audit/` → `audit-service:3004` | L128–134 |
| Frontend SPA | `/` → `frontend:80` | L136–140 |
| Login rate limit | `10r/m` zone `api_login` | L24, L96–102 |
| General API rate limit | `25r/s` zone `api_general` | L22, L104–137 |
| TLS certificates | `/etc/nginx/certs/fullchain.pem`, `privkey.pem` | L68–69 |

---

## PowerShell proof commands

Run from project root after `docker compose up -d` and TLS certs in `nginx/certs/`. Replace email/password if needed.

### 1. All services running

```powershell
cd "c:\Users\Seif\OneDrive\Desktop\FINAL-DIST"
docker compose ps
```

**Screenshot:** Terminal showing 10 services `Up` (especially `nginx-api-gateway` healthy, `postgres` healthy).

### 2. HTTPS health (gateway + AI)

```powershell
# Gateway health (TLS)
curl.exe -sk https://localhost/nginx-health

# AI health via gateway
curl.exe -sk https://localhost/api/ai/health
```

**Screenshot:** `OK` from nginx; AI JSON with `status` and Qdrant info.

### 3. HTTP → HTTPS redirect

```powershell
curl.exe -sI http://localhost/ | Select-String -Pattern "301|Location"
```

**Screenshot:** `301` and `Location: https://localhost/...`

### 4. Register and login

```powershell
curl.exe -sk https://localhost/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"arch-test@example.com","password":"password12345"}'

$login = curl.exe -sk https://localhost/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"arch-test@example.com","password":"password12345"}' | ConvertFrom-Json

$token = $login.access_token
$token.Substring(0, [Math]::Min(40, $token.Length)) + "..."
```

**Screenshot:** JSON with `access_token`; optional failed login with wrong password (401).

### 5. Promote admin (one-time, for audit tests)

```powershell
docker compose exec -T postgres psql -U scda_user -d scda_db `
  -c "UPDATE users SET role = 'admin' WHERE email = 'arch-test@example.com';"

$login = curl.exe -sk https://localhost/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"arch-test@example.com","password":"password12345"}' | ConvertFrom-Json
$token = $login.access_token
```

### 6. Document upload

```powershell
curl.exe -sk https://localhost/api/documents/upload `
  -H "Authorization: Bearer $token" `
  -F "file=@test-document.pdf"
```

**Screenshot:** Upload response with `id`, `status` (`queued` or `processing`); Documents page in UI.

### 7. Integrity verify

```powershell
# Use document id from upload response
$docId = "YOUR-DOCUMENT-UUID"
curl.exe -sk "https://localhost/api/documents/$docId/verify" `
  -H "Authorization: Bearer $token"
```

**Screenshot:** `"integrity_valid": true`.

### 8. RabbitMQ queue and consumer

```powershell
docker compose exec rabbitmq rabbitmqctl list_queues name messages consumers
```

Expect queue `document.jobs` with consumer ≥ 1 when worker is up.

```powershell
docker compose logs worker-service --tail 40
```

**Screenshot:** RabbitMQ Management UI (`http://127.0.0.1:15672`) showing `document.jobs` and consumer; worker log lines `processing.completed` or `indexing.completed`.

### 9. Audit logs and stats (admin)

```powershell
curl.exe -sk "https://localhost/api/audit/logs?limit=5" `
  -H "Authorization: Bearer $token"

curl.exe -sk https://localhost/api/audit/logs/stats `
  -H "Authorization: Bearer $token"
```

**Screenshot:** Admin **Monitoring dashboard** at `https://localhost/audit` (7 metric cards + log table).

### 10. AI semantic search

```powershell
# After worker indexes document to ready
curl.exe -sk "https://localhost/api/ai/search?q=integrity+verification&limit=5" `
  -H "Authorization: Bearer $token"
```

**Screenshot:** Search results JSON or Knowledge workspace search panel with hits.

### 11. Qdrant collection

```powershell
curl.exe -s http://localhost:6333/collections/scda_ai
```

Or:

```powershell
docker compose exec -T qdrant wget -qO- http://127.0.0.1:6333/collections/scda_ai
```

**Screenshot:** JSON showing `points_count` > 0 after documents indexed.

### 12. PostgreSQL tables

```powershell
docker compose exec -T postgres psql -U scda_user -d scda_db -c "\dt"
docker compose exec -T postgres psql -U scda_user -d scda_db -c "
  SELECT 'users' AS tbl, COUNT(*)::int AS n FROM users
  UNION ALL SELECT 'documents', COUNT(*)::int FROM documents
  UNION ALL SELECT 'audit_logs', COUNT(*)::int FROM audit_logs
  UNION ALL SELECT 'document_chunks', COUNT(*)::int FROM document_chunks
  UNION ALL SELECT 'chat_sessions', COUNT(*)::int FROM chat_sessions
  UNION ALL SELECT 'chat_messages', COUNT(*)::int FROM chat_messages;
"
```

**Screenshot:** Table list including `users`, `documents`, `audit_logs`, `document_chunks`, `chat_sessions`, `chat_messages`.

---

## Screenshots recommended for report / presentation

1. **`docker compose ps`** — full stack running (10 services).
2. **Browser `https://localhost`** — TLS padlock + SCDA UI.
3. **Register / login** — Network tab or PowerShell JSON with JWT.
4. **Document upload + verify** — UI or API showing encrypted upload and `integrity_valid: true`.
5. **RabbitMQ Management** — `document.jobs` queue with messages/consumers.
6. **`docker compose logs worker-service`** — processing/indexing lines.
7. **Admin monitoring** — `https://localhost/audit` stat grid (users, requests, failed logins, uploads, jobs, unauthorized, AI queries).
8. **Semantic search** — query with relevant hit (e.g. integrity / encryption).
9. **Qdrant collection** — `scda_ai` with `points_count`.
10. **PostgreSQL `\dt` + row counts** — shared schema evidence.

---

## Gaps and fixes applied during this audit

| Finding | Action |
|---------|--------|
| No `ARCHITECTURE_COMPLIANCE.md` | **Created** (this file) |
| Missing mandatory services | **None** — all required containers exist in `docker-compose.yml` |
| Broken routes / missing bcrypt / queue | **None** — no code changes required |

Optional enhancements (not required for architecture pass): dedicated `/monitoring` route alias, Kafka alternative, OAuth provider credentials in `.env` (see `docs/OAUTH.md`).

---

## Files changed in this audit

| File | Change |
|------|--------|
| `ARCHITECTURE_COMPLIANCE.md` | **Created** — full compliance matrix and proof commands |

No application code, Compose services, or database volumes were modified.

---

## Related documentation

- `COMPLIANCE_CHECKLIST.md` — Tasks 1–20 rubric mapping  
- `RUNBOOK.md` — Step-by-step operator commands  
- `README.md` — Stack overview and startup  
- `nginx/README.md` — TLS certificate setup  
