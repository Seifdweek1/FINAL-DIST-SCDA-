# Security Section — Final Project Report (SCDA)

Use this section verbatim or adapt it for your PDF report. All claims are backed by `SECURITY_COMPLIANCE_CHECKLIST.md` and reproducible via `SECURITY_TEST_COMMANDS.md`.

---

## 1. Security overview

The Secure Compliance Document Assistant (SCDA) is a **distributed, security-first** microservice system. External traffic enters only through an **Nginx API gateway** on **HTTPS**. Authentication uses **JWT** after **bcrypt** password hashing. Documents are **validated**, **encrypted at rest (AES-256-GCM)**, and **integrity-checked (SHA-256)**. Background indexing runs over **RabbitMQ** with a dedicated broker user. **Central audit logging** records security-relevant events. **AI/RAG** features use a separate **ai-service** and **Qdrant** vector store with JWT-protected APIs.

---

## 2. Authentication and session security (Tasks 1–2)

Users register and log in through **auth-service**. Passwords are hashed with **bcrypt** (configurable cost via `BCRYPT_ROUNDS`) and stored only as `password_hash` in PostgreSQL. On successful login, the service issues a short-lived **HS256 JWT** (`JWT_EXPIRES_IN`, default 15 minutes). Protected APIs require `Authorization: Bearer <token>`; missing, malformed, or expired tokens receive **401** with a generic JSON error—no stack traces.

**Evidence:** `auth-service/src/utils/password.util.js`, `jwt.util.js`, `auth.middleware.js`.

---

## 3. Authorization (Task 3)

The system implements **role-based access control** with `user` and `admin` roles stored on the `users` table. Non-admin users cannot call admin audit APIs (**403**). Document access is scoped by `user_id`; attempts to read another user's document return **404** to avoid leaking existence. Admin-only actions (audit log listing, monitoring stats) require `role = admin`.

**Evidence:** `document.service.js` (`canAccess`), `audit-service` routes + `requireAdmin()`.

---

## 4. External login (Task 4)

**OAuth 2.0** (Google, GitHub, Microsoft) is implemented in **auth-service** with CSRF-protected `state`, provider callbacks, and the same JWT as password login. Operators enable providers by setting client IDs in `.env` (see **`docs/OAUTH.md`**). Without credentials, the UI falls back to email/password only—documented partial deployment, not missing code.

---

## 5. Perimeter controls (Tasks 5–7)

**Nginx** terminates TLS, applies **rate limiting** (stricter on `/api/auth/login`), sets **security headers** (HSTS, CSP, etc.), and limits upload body size. HTTP requests redirect to HTTPS. Microservices are on an internal Docker network; only the gateway and intentional dev ports (e.g. local RabbitMQ management on `127.0.0.1`) are exposed.

**Evidence:** `nginx/nginx.conf`.

---

## 6. Input validation and secure upload (Tasks 8–9)

**express-validator** enforces email format and password length on auth endpoints. **document-service** restricts MIME types and extensions, blocks dangerous extensions (`.exe`, `.php`, `.js`, `.bat`, `.sh`), enforces maximum file size, and stores files under a **private upload volume** with **UUID** stored filenames—not under the public web root.

---

## 7. Encryption and integrity (Tasks 10–11)

Uploaded files are encrypted with **AES-256-GCM** before being written to disk. Only authenticated owners (or admins per policy) can download decrypted content. **SHA-256** hashes of plaintext are stored at upload time; the **verify** API recomputes the hash after decryption and uses **timing-safe comparison**. Tampering with ciphertext yields **`integrity_valid: false`** (demonstrated by corrupting a test file—see test commands).

---

## 8. Service-to-service and secrets (Tasks 12–13)

Services post audit events to **audit-service** using **`X-Internal-Api-Key`** (timing-safe comparison). Missing or wrong keys receive **403**. Secrets (`JWT_SECRET`, `ENCRYPTION_KEY`, `INTERNAL_API_KEY`, RabbitMQ password) live in **`.env`** (gitignored); **`.env.example`** documents placeholders only.

---

## 9. Database and queue (Tasks 14–16)

PostgreSQL holds **users**, **documents**, **document_chunks**, **chat_sessions**, **chat_messages**, and **audit_logs** with ownership fields and hashed passwords. **RabbitMQ** uses a **custom user** (`scda_mq`), not `guest/guest`. **document-service** publishes to **`document.jobs`**; **worker-service** consumes, updates document status (`queued` → `processing` → `ready`), indexes vectors, and emits audit events. Management UI is bound to **localhost** in Compose.

---

## 10. Audit, monitoring, and errors (Tasks 17–19)

Critical actions (login success/failure, upload, download, admin access, AI search/analyze, chat, worker indexing) are written to **`audit_logs`** with `user_id`, `action`, `status`, `ip_address`, `details`, and `created_at`. Admins use the **monitoring dashboard** at `/audit` (seven metric cards + log table). API errors return safe JSON; server-side stack traces are logged internally, not returned to clients.

**Partial notes for honesty in viva:**

- Not every anonymous **401** generates an audit row; **admin RBAC denials** are audited.
- **Integrity tamper demo** targets encrypted blob corruption (appropriate for at-rest encryption).

---

## 11. Deployment (Task 20)

The full stack is defined in **`docker-compose.yml`**: nginx gateway, auth, document, audit, worker, ai, frontend, postgres, rabbitmq, qdrant. **ai-service** consolidates embedding/RAG/chat APIs; **Qdrant** is the dedicated vector database.

---

## 12. How we tested security

| Activity | Reference |
|----------|-----------|
| PowerShell curl proofs | `SECURITY_TEST_COMMANDS.md` |
| Extended E2E | `FINAL_TEST_COMMANDS.md`, `RUNBOOK.md` |
| Architecture matrix | `ARCHITECTURE_COMPLIANCE.md` |
| Task-by-task status | `SECURITY_COMPLIANCE_CHECKLIST.md` |

---

## 13. Recommended screenshots for presentation

1. `docker compose ps` — all services healthy  
2. Browser **https://localhost** — TLS padlock  
3. Login failure + **audit** row `auth.login.failed`  
4. Upload valid file + blocked `.exe`  
5. **Verify integrity** JSON `integrity_valid: true`  
6. Rate limit loop showing **429**  
7. Internal API key test **403** vs **201**  
8. RabbitMQ **`document.jobs`** queue with consumer  
9. Admin **monitoring dashboard** (`/audit`)  
10. PostgreSQL `\dt` showing security tables  

---

## 14. Conclusion

SCDA meets the course **mandatory security tasks 1–20** with **zero missing tasks**. Tasks **11** and **17** are marked **partial** only for demo/observability nuances, not absent controls. The system is suitable for demonstration of authentication, encryption, queue-based processing, auditability, and AI-specific controls in a distributed architecture.
