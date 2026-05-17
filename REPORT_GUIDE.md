# Report guide — SCDA final write-up

Use this as the outline for the PDF/report. Pair every claim with paths in **`COMPLIANCE_CHECKLIST.md`** and commands in **`RUNBOOK.md`** / **`FINAL_TEST_COMMANDS.md`**.

---

## Suggested table of contents

1. Title, team, project idea (secure document assistant with AI retrieval)  
2. Architecture (diagram + narrative)  
3. Services and responsibilities  
4. Database design  
5. Security requirements mapping (Tasks 1–20 summary table)  
6. Docker & deployment  
7. Demo scenario (reference **`DEMO_STEPS.md`**)  
8. Challenges and trade-offs  
9. Conclusion and future work  

---

## Architecture (what to describe)

- **Edge:** `nginx-api-gateway` — TLS termination, HTTP→HTTPS redirect, rate limiting, security headers, reverse proxy to internal services.  
- **Clients:** React SPA served via gateway; all API calls same-origin `https://localhost/api/...`.  
- **Identity:** `auth-service` — JWT issuance, bcrypt passwords, PostgreSQL `users`.  
- **Domain:** `document-service` — validation, encryption at rest, integrity hashes, RabbitMQ publish.  
- **Async:** RabbitMQ + `worker-service` — durable jobs, status updates.  
- **AI:** `ai-service` + **Qdrant** — embeddings (demo hash-simulated vectors), upsert, filtered search.  
- **Observability:** `audit-service` — centralized `audit_logs` with internal API key for workers/AI.  
- **Data:** PostgreSQL (shared DB name in compose; services use Prisma per repo).  

Include one diagram: browser → nginx → {auth, document, ai, audit} → postgres / rabbitmq / qdrant / worker.

---

## Services (explain each in 2–4 sentences)

| Service | Role |
|---------|------|
| nginx-api-gateway | TLS, routing, limits, headers |
| frontend | Vite/React UI |
| auth-service | Register, login, JWT, RBAC source |
| document-service | Upload, encrypt, verify, download, queue publish |
| worker-service | Consume jobs, update status, audit |
| ai-service | Analyze + search APIs |
| audit-service | Persist audit rows |
| postgres | Relational data |
| rabbitmq | Work queue |
| qdrant | Vector index |

---

## Database design

Cover at least:

- **`users`:** `id`, `email`, `password_hash` (bcrypt), **`role`** enum (`user` \| `admin`).  
- **`documents`:** ownership, ciphertext path, MIME, size, `sha256_hash`, **status** (uploaded → queued → processing → ready/failed).  
- **`audit_logs` central store:** who / what / when / IP / status / JSON `details` (no passwords).  
- **`chat_sessions` / `chat_messages`:** persisted Assistant Chat (ai-service); scoped by `user_id`; admin can list all sessions and read any thread (post/delete remain owner-only).

State clearly: **roles/permissions are simplified** — rubric-style separate permission tables are **not** used; access is enforced in code using `users.role` and resource checks.

---

## Security requirements mapping

Point to **`COMPLIANCE_CHECKLIST.md`** for Tasks 1–20. In prose, call out **partial** items so graders are not surprised:

| Topic | How to phrase |
|-------|----------------|
| **OAuth (Task 4)** | Not fully implemented; **`docs/OAUTH.md`** documents intended flow (partial credit narrative). |
| **RBAC / DB (Task 14)** | Admin vs user via **`users.role`** enum; no separate `roles` / `permissions` tables. |
| **AI / Docker (Task 20)** | **Single `ai-service`** combines embedding + RAG-style API; **Qdrant** is the vector DB; optional **Ollama** / extra containers not required for this demo. |
| **Integrity “modified file” (Task 11)** | Verify passes on authentic pipeline; **failure** demonstrated by **corrupting ciphertext** on disk (advanced) or **explained** as hash mismatch vs stored SHA-256. |
| **Logout (Task 17 note)** | **Client-only** — JWT removed from storage; no server-side session revocation or audit row for “logout” by design in this stack. |
| **Monitoring (Task 18)** | **Partial** — Dashboard KPIs + admin audit stats, not a full Prometheus/Grafana story. |
| **Unauthorized logging (Task 17)** | **Partial** — notable denials (e.g. admin) are audited; not every anonymous 401 may emit a row. |

---

## Screenshots checklist

Capture (with **secrets redacted**):

1. Landing/login on **`https://localhost`**.  
2. Dashboard with role badge.  
3. Documents: upload area + table with **queued/ready** + **Verify** success.  
4. AI: Analyze success + Search JSON.  
5. **Assistant Chat** (`/chat`): session list, conversation bubbles, persisted reload after refresh.  
6. Audit: filtered rows (auth, document, worker, ai, **`chat.*`**).  
7. RabbitMQ: **Queues** tab showing **`document.jobs`** (blur credentials).  
8. Qdrant: collection list / collection detail.  
9. Browser or `curl`: **response headers** (security headers visible).  
10. Terminal: **429** from rate-limit loop or screenshot of status codes.  
11. `psql \dt` or IDE showing **`users`**, **`documents`**, **`audit_logs`**, **`chat_sessions`**, **`chat_messages`**.  
12. **Security** page in the SPA showing **Tasks 1–20** compliance table (optional but strong).  

---

## Challenges (ideas)

- **Self-signed TLS** in dev vs production CA.  
- **Balancing** rubric breadth vs time (OAuth, separate RAG containers).  
- **Corrupt ciphertext demo** for integrity failure without breaking the happy path.  
- **Rate-limit tuning** so live demo still works while proof remains reproducible.  

---

## Conclusion

Summarize: defense-in-depth (gateway + app + DB + queue + audit + vectors), what is **fully met**, what is **documented partial**, and one **concrete improvement** (e.g. production OAuth, separate queue users, server-side logout denylist).

---

## Related files

- **`COMPLIANCE_CHECKLIST.md`** — authoritative task matrix  
- **`DEMO_STEPS.md`** / **`DEMO_SCRIPT.md`** — presentation flow  
- **`RUNBOOK.md`** / **`FINAL_TEST_COMMANDS.md`** — reproducible commands  
- **`docs/OAUTH.md`** — OAuth partial  
