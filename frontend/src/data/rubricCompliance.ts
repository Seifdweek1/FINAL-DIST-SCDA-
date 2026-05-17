/** Course rubric Tasks 1–20. No secrets. Align with `COMPLIANCE_CHECKLIST.md`. */

export type RubricTaskStatus = 'Met' | 'Partial' | 'N/A';

export type RubricTaskRow = {
  task: number;
  title: string;
  status: RubricTaskStatus;
  evidence: string;
  demo: string;
};

export const RUBRIC_TASKS: RubricTaskRow[] = [
  {
    task: 1,
    title: 'Authentication',
    status: 'Met',
    evidence: 'auth-service: register, login, JWT expiry; middleware rejects missing/invalid tokens.',
    demo: 'Login / Register UI; bad password → 401; API call without Authorization → 401.',
  },
  {
    task: 2,
    title: 'Password hashing',
    status: 'Met',
    evidence: 'bcrypt rounds; password_hash in PostgreSQL; hashes never written to audit payloads.',
    demo: 'Register then inspect `users.password_hash` shape in DB (hashed only).',
  },
  {
    task: 3,
    title: 'RBAC',
    status: 'Met',
    evidence: 'Prisma Role enum; document access checks; admin-only audit routes.',
    demo: 'Audit page as admin vs redirect/deny as user; cross-user document access blocked.',
  },
  {
    task: 4,
    title: 'OAuth',
    status: 'Partial',
    evidence: 'Provider login not wired; documented partial flow in `docs/OAUTH.md`.',
    demo: 'Security page + report: explain documented flow only.',
  },
  {
    task: 5,
    title: 'API gateway',
    status: 'Met',
    evidence: 'nginx: routing, TLS, rate zones, body limits, security headers.',
    demo: 'Browser Network tab → `https://localhost/api/...`; internal DB/Qdrant not browser-exposed.',
  },
  {
    task: 6,
    title: 'HTTPS',
    status: 'Met',
    evidence: 'TLS termination in nginx; dev certs under `nginx/certs`.',
    demo: 'Open `https://localhost`; `curl -v http://localhost/...` → redirect to HTTPS.',
  },
  {
    task: 7,
    title: 'Rate limiting',
    status: 'Met',
    evidence: 'nginx zones (stricter on login).',
    demo: '`RUNBOOK.md` / `FINAL_TEST_COMMANDS.md` login burst → HTTP 429.',
  },
  {
    task: 8,
    title: 'Input validation',
    status: 'Met',
    evidence: 'express-validator on auth, uploads, AI endpoints; centralized error middleware.',
    demo: 'Malformed JSON on register; oversized/invalid AI body → safe validation errors.',
  },
  {
    task: 9,
    title: 'Secure file upload',
    status: 'Met',
    evidence: 'MIME, extension, size, filename checks; encrypted opaque storage path.',
    demo: 'Documents page: allowed types succeed; disallowed extension rejected.',
  },
  {
    task: 10,
    title: 'File encryption',
    status: 'Met',
    evidence: 'AES-256-GCM in document-service; ciphertext at rest.',
    demo: 'Upload + authorized download; explain decrypt-on-read in narration.',
  },
  {
    task: 11,
    title: 'Integrity (SHA-256)',
    status: 'Partial',
    evidence: 'Stored hash + verify endpoint; timing-safe compare.',
    demo: 'Verify button in UI; modified ciphertext / mismatch scenario in `RUNBOOK.md` narrative.',
  },
  {
    task: 12,
    title: 'Service-to-service security',
    status: 'Met',
    evidence: 'INTERNAL_API_KEY on audit ingestion; worker/AI clients must present key.',
    demo: 'Code walkthrough; rubric “worker→AI” path N/A — worker logs to audit instead.',
  },
  {
    task: 13,
    title: 'Secrets management',
    status: 'Met',
    evidence: '`.env` gitignored; `.env.example` documents variables without real secrets.',
    demo: 'Show `.env.example` in repo; never show production `.env` on slides.',
  },
  {
    task: 14,
    title: 'Database security',
    status: 'Partial',
    evidence: 'Normalized schema; hashed passwords; `audit_logs` table.',
    demo: '`\\dt` in Postgres; note simplified RBAC: `users.role` enum vs separate permissions tables.',
  },
  {
    task: 15,
    title: 'Message queue',
    status: 'Met',
    evidence: 'Publish after upload → worker consumes → status queued → ready/failed.',
    demo: 'Documents table status animation; RabbitMQ queue `document.jobs` in management UI.',
  },
  {
    task: 16,
    title: 'Queue security',
    status: 'Met',
    evidence: 'Dedicated broker user (not guest/guest); management UI bound to loopback in dev.',
    demo: 'RabbitMQ UI at `http://127.0.0.1:15672` — log in with values from your `.env` locally.',
  },
  {
    task: 17,
    title: 'Audit trail',
    status: 'Partial',
    evidence: 'Central audit_logs; login, upload, download, AI, worker, admin views.',
    demo: 'Admin Audit page filters; mention logout is client-side token clear only (no server audit row).',
  },
  {
    task: 18,
    title: 'Monitoring dashboard',
    status: 'Partial',
    evidence: 'Dashboard KPIs + admin audit stats — not a dedicated metrics product.',
    demo: 'Dashboard cards + Audit stats grid; optional external APM N/A.',
  },
  {
    task: 19,
    title: 'Error handling',
    status: 'Met',
    evidence: 'Services normalize errors; no stack traces/secrets in JSON responses.',
    demo: 'Trigger validation or auth errors — generic, safe messages.',
  },
  {
    task: 20,
    title: 'Docker Compose',
    status: 'Met',
    evidence: 'Full stack in `docker-compose.yml`; optional `docker compose up --build -d`.',
    demo: '`docker compose ps`; note AI = single service (embedding+RAG API) + Qdrant vector DB.',
  },
];
