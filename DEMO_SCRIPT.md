# Demo script — SCDA (5–10 minute presentation)

Run the stack first (`RUNBOOK.md` — **End-to-end** block for copy-paste). Use **`https://localhost/`** in the browser.

**Exact step order (checklist):** **`DEMO_STEPS.md`** — use this script for *what to say* between those steps.

---

## 1. Introduce the boundary (30 s)

1. Open **Network** tab (F12) → show calls go to **`https://localhost/api/...`** (same origin via nginx).  
2. Mention **TLS** (self-signed in dev) and **HTTP → HTTPS** redirect if you briefly hit `http://localhost/…`.

---

## 2. Identity & RBAC (2 min)

1. **Register** a new user (`/register`) → **Login** (`/login`).  
2. Show **JWT** stored (Application → Local Storage — explain demo tradeoff).  
3. Open **Dashboard** — role badge (**user** vs **admin**).  
4. **Admin demo (if you have an admin account):**  
   - Log in as **admin** → open **Audit logs** — list loads.  
   - Log in as **user** → navigate to `/audit` — should **redirect** away; mention **403** on `GET /api/auth/admin` for non-admin via API.

---

## 3. Document pipeline & security (3 min)

1. **Documents** — upload an allowed file (PDF / TXT / DOC / DOCX).  
2. Point out **status**: `queued` → `processing` → `ready` (worker + RabbitMQ).  
3. Click **Verify** — show **integrity OK** for untouched file.  
4. (Optional) Mention **blocked types** — try uploading a renamed `.exe` in QA; expect **415** (not in live demo if risky).  
5. **Download** — file opens; explain **encryption at rest** + **decrypt on authorized download**.

---

## 4. AI, chat & audit (2 min)

1. **AI Assistant** — run **Analyze** with sample text + small JSON metadata.  
2. Run **Search** — show JSON **hits** scoped to current user.  
3. **Assistant Chat** (`/chat`) — new session, send a question; show bubbles; **refresh** and reopen the session to prove **PostgreSQL persistence**; mention Qdrant-backed context line in the reply.  
4. **Audit logs** (admin) — filter `service` = `ai-service`; show **`chat.session.created`**, **`chat.message.sent`**, **`chat.message.answered`** (and **`chat.session.deleted`** if you deleted a session).  
5. Filter `worker-service` / `auth-service` as before for breadth.

---

## 5. Security narrative (1 min)

1. **Security & demo** page — walk one capability card (JWT, RBAC, TLS, rate limits).  
2. Show **Architecture summary** + **Live demo anchors**.  
3. Scroll the **Compliance checklist — Tasks 1–20** table (Met / Partial / N/A) — point to **`COMPLIANCE_CHECKLIST.md`** for file-level evidence.

---

## 6. Close — proof without UI (optional)

1. From **`RUNBOOK.md`**, run **rate-limit curl loop** — show **429**.  
2. `curl -k https://localhost/api/ai/health` — **JSON health**.

---

## Backup if live demo fails

- Show **Docker Desktop** containers all **running**.  
- Show **`COMPLIANCE_CHECKLIST.md`** with **Evidence** column pointing to files.  
- Show **`REPORT_GUIDE.md`** screenshots checklist + **screenshots** captured earlier.
