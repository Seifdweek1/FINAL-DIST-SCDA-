# Final project compliance checklist (SCDA)

**Official rubric:** *Secure Distributed System Design & Implementation – Final Project* (course text as provided). This file maps **mandatory architecture**, **Tasks 1–20**, and **Docker Compose** to this repository.

**Evidence:** `code:` paths · `cmd:` see `RUNBOOK.md` · `ui:` screenshot ideas

---

## Mandatory architecture (rubric §2)

| Rubric item | Status | Evidence |
|-------------|--------|----------|
| 1. API Gateway (Nginx) + HTTPS + rate limiting | **Met** | `nginx/nginx.conf` |
| 2. Auth — register, login, JWT, password hashing | **Met** | `auth-service/` |
| 3. Business service 1 | **Met** | `document-service/` |
| 4. Business service 2 | **Met** | `ai-service/` |
| 5. PostgreSQL | **Met** | `docker-compose.yml` + Prisma |
| 6. Message queue (RabbitMQ) | **Met** | `rabbitmq`; publish/consume |
| 7. Worker | **Met** | `worker-service/` |
| 8. Logging / audit service | **Met** | `audit-service/` + `audit_logs` |
| AI: AI service | **Met** | `ai-service/` |
| AI: Vector DB | **Met** | `qdrant` |

---

## Task 1 — Authentication

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Register, login, JWT, expiration, protected routes | **Met** | `auth-service/` |
| Valid login; invalid fails; missing/invalid token rejected | **Met** | Middleware + `RUNBOOK.md` §3 |

## Task 2 — Password hashing

| Requirement | Status | Evidence |
|-------------|--------|----------|
| bcrypt; hash in DB; compare on login; not logged | **Met** | `password.util.js`, `users.password_hash`, audits omit password |

## Task 3 — RBAC

| Requirement | Status | Evidence |
|-------------|--------|----------|
| admin + user; user ≠ admin endpoint; user ≠ others’ docs; admin audit API | **Met** | Prisma `Role`, `document.service.js` `canAccess`, `audit` routes + `auth.admin.access_denied` |

## Task 4 — OAuth

| Requirement | Status | Evidence |
|-------------|--------|----------|
| OAuth code (Google, GitHub, Microsoft) | **Met** | `auth-service/src/services/oauth.service.js`, `docs/OAUTH.md` |
| Live provider login | **Partial** | Requires `GOOGLE_*` / `GITHUB_*` / `MICROSOFT_*` in `.env`; email/password always works |
| Flow documentation | **Met** | `docs/OAUTH.md` |

## Task 5 — API Gateway

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Routing, HTTPS termination, rate limit, body limit, headers | **Met** | `nginx/nginx.conf` |
| Not all services on public ports | **Met** | Gateway **443**; DB/Qdrant exposed for **dev** only |

## Task 6 — HTTPS

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Cert in Nginx; HTTPS works; HTTP redirected | **Met** | `nginx/certs`, `README.md` |

## Task 7 — Rate limiting

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Stricter login; abuse → 429 | **Met** | `api_login` zone; `RUNBOOK.md` §5 |

## Task 8 — Input validation

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Auth, files, AI inputs validated; safe errors | **Met** | `express-validator` + `error.middleware.js` |

## Task 9 — Secure file upload

| Requirement | Status | Evidence |
|-------------|--------|----------|
| MIME/extension/size/name; non-public storage; block dangerous ext | **Met** | `document-service` + `security.util.js` |

## Task 10 — File encryption

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Validate → encrypt → store; decrypt if authorized | **Met** | AES-256-GCM `encryption.util.js`, `document.service.js` |

## Task 11 — Integrity

| Requirement | Status | Evidence |
|-------------|--------|----------|
| SHA-256 + verify; original passes | **Met** | `verifyDocument`, `timingSafeEqual` |
| Modified fails | **Partial** | Ciphertext model — corrupt file / hash mismatch (see `RUNBOOK.md`) |

## Task 12 — Service-to-service security

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Internal API key; reject without key | **Met** | `audit-service` `internalApi.middleware.js`; worker/ai/auth/document clients |
| Rubric example worker→AI | **N/A here** | Worker posts to **audit**, not `ai-service`. Satisfies “one of: internal API key / service JWT / mTLS”. |

## Task 13 — Secrets

| Requirement | Status | Evidence |
|-------------|--------|----------|
| .env / Compose; not committed | **Met** | `.env.example`, `.gitignore` |

## Task 14 — Database security

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Design, ownership, hashed passwords, audit table | **Met** | Prisma schemas; `users`, `documents`, `audit_logs` |
| Separate roles/permissions tables | **Simplified** | `users.role` enum only |

## Task 15 — Message queue

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Async publish → consume → status update | **Met** | `document-service` → queue → `worker-service` |

## Task 16 — Queue security

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **No guest/guest** | **Met** | Default broker user **`scda_mq`** + `RABBITMQ_URL` in `.env.example` / compose defaults |
| Custom credentials + permissions | **Met** | `RABBITMQ_USER` / `RABBITMQ_PASS` |
| Protect management UI | **Met (dev)** | Management port **`127.0.0.1:15672`** only |
| Separate producer/consumer users | **Optional** | Not implemented |

## Task 17 — Audit trail

| Event | Status | Evidence |
|-------|--------|----------|
| Login success/fail | **Met** | `auth-service` → audit API |
| Logout | **N/A** | Client-only token clear |
| Upload/download | **Met** | `document-service` dual-write |
| Unauthorized | **Partial** | Admin denial audited; not every anonymous 401 |
| Admin action | **Met** | `audit.admin.logs.*` |
| AI query | **Met** | `ai.controller.js` |
| Job status | **Met** | `worker-service` |
| Fields (user, action, time, IP, status, details) | **Met** | `audit_logs` |

## Task 18 — Monitoring dashboard

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Metrics dashboard | **Met** | Admin **Audit** monitoring grid: users, requests, failed logins, uploaded files, processed jobs, unauthorized, AI queries (`GET /api/audit/logs/stats`) |

## Task 19 — Error handling

| Requirement | Status | Evidence |
|-------------|--------|----------|
| No sensitive errors to client | **Met** | Service `error.middleware.js` |

## Task 20 — Docker Compose

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `docker compose up --build` | **Met** | `README.md`, `docker-compose.yml` |
| Lists ollama / separate rag / embedding containers | **Consolidated** | **`ai-service`** = embedding + RAG API; **`qdrant`** = vector DB; no **Ollama** (demo vectors). State this in report. |
| Required tier: nginx, auth, 2 business, postgres, rabbitmq, worker, audit, AI+vector | **Met** | All present (+ `frontend`) |

---

## Presentation checklist (course guidance)

1. Project idea · 2. Architecture diagram · 3. Services · 4. Security · 5. DB design · 6. Queue flow · 7. Demo · 8. Attack simulation · 9. Challenges · 10. Conclusion — use **`DEMO_STEPS.md`**, **`DEMO_SCRIPT.md`**, **`REPORT_GUIDE.md`**, and this file.

---

## RabbitMQ migration (existing clones)

If an old volume still has **guest** only, reset broker data or volumes, then:

```powershell
docker compose down -v   # wipes all compose volumes — backup first if needed
docker compose up -d --build
```

---

## Cross-reference

- `RUNBOOK.md` — commands (including **End-to-end** sequence)  
- `DEMO_STEPS.md` — ordered presentation checklist  
- `DEMO_SCRIPT.md` — live demo narration  
- `FINAL_TEST_COMMANDS.md` — PowerShell proof suite  
- `REPORT_GUIDE.md` — report / PDF outline + partials explanation  
- `docs/OAUTH.md` — Task 4 documentation
