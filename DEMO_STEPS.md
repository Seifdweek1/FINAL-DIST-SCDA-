# Demo steps — exact order (presentation)

Use a running stack (`RUNBOOK.md`). Browser baseline: **`https://localhost/`** (accept the dev certificate once).

| Step | What to show |
|------|----------------|
| 1 | Open **`https://localhost/`** — address bar, TLS warning acceptance (dev). |
| 2 | **Login as admin** — register a user if needed; promote to admin once with SQL in `RUNBOOK.md` “End-to-end” block, then log in again. |
| 3 | **Upload document** — Documents page; drag-drop or pick PDF/TXT/DOC/DOCX. |
| 4 | **Queued → ready** — refresh or wait for poll; status badge transitions; optional RabbitMQ queue view. |
| 5 | **Verify SHA-256** — Verify on a ready row; success alert with hash. |
| 6 | **Download** — decrypt-on-read narrative; file opens locally. |
| 7 | **AI analyze / search** — AI page: Analyze with sample text, then Search; show JSON scoped to user. |
| 8 | **Assistant Chat** — `/chat`: create session, send message (Qdrant-backed reply), refresh page and confirm history reloads from API. |
| 9 | **Audit logs** — Admin → Audit; filter by `chat.` actions after chat traffic. |
| 10 | **RabbitMQ UI proof** — `http://127.0.0.1:15672` — queue **`document.jobs`** (or your `DOCUMENT_JOBS_QUEUE`); log in with **`.env`** broker user/pass (**never** `guest`/`guest` on slides). |
| 11 | **Qdrant UI proof** — `http://localhost:6333/dashboard` — collection (e.g. **`scda_ai`**). |
| 12 | **HTTPS / security headers** — DevTools → Network → response headers (CSP, HSTS, etc. via nginx); `curl -skI https://localhost/`. |
| 13 | **Rate limiting → 429** — burst failed logins per `FINAL_TEST_COMMANDS.md` / `RUNBOOK.md`. |
| 14 | **Database tables** — `psql \dt` from `RUNBOOK.md`; mention `users`, `documents`, `audit_logs`, **`chat_sessions`**, **`chat_messages`**. |

Narrative detail and timing: **`DEMO_SCRIPT.md`**. Evidence matrix: **`COMPLIANCE_CHECKLIST.md`**.
