# ai-service



Embeddings, **semantic search** over Qdrant, and **persisted Assistant Chat** (PostgreSQL) for SCDA.



## HTTP API

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/ai/health` | none |
| POST | `/api/ai/analyze` | JWT |
| GET | `/api/ai/search?q=...&limit=10` | JWT |
| POST | `/api/ai/chat/sessions` | JWT |
| GET | `/api/ai/chat/sessions` | JWT |
| GET | `/api/ai/chat/admin/sessions` | JWT admin |
| GET | `/api/ai/chat/sessions/:id/messages` | JWT; own session or admin read-only |
| POST | `/api/ai/chat/sessions/:id/messages` | JWT, session owner only |
| DELETE | `/api/ai/chat/sessions/:id` | JWT, session owner only |



### Chat behaviour



- **Sessions/messages** are stored in **`chat_sessions`** and **`chat_messages`** (Prisma migration in `prisma/migrations/`).

- **POST …/messages** saves the user line, runs the same **hash embedding + Qdrant search** as `/search` (scoped to JWT `sub`), then saves a **rule-based assistant** reply (no external LLM).

- **Audit** events: `chat.session.created`, `chat.message.sent`, `chat.message.answered`, `chat.session.deleted` (via `INTERNAL_API_KEY` → audit-service).



### Analyse / search (unchanged)



- **Analyze** accepts JSON with **`text`** (optional) and/or **`metadata`** (optional). At least one must be non-empty. Vectors are **L2-normalized** for cosine similarity; payloads include **`user_id`** for isolation.

- **Search** filters Qdrant by **`user_id`** from the JWT.



## Environment



| Variable | Required | Description |

|----------|----------|-------------|

| `DATABASE_URL` | yes | Same PostgreSQL as auth/documents/audit (Compose injects it) |

| `QDRANT_URL` | yes | REST API base, e.g. `http://qdrant:6333` |

| `JWT_SECRET` | yes | Same HS256 secret as **auth-service** |

| `INTERNAL_API_KEY` | yes | Same value **audit-service** expects |

| `AUDIT_SERVICE_URL` | yes | e.g. `http://audit-service:3004` in Compose |

| `QDRANT_API_KEY` | no | `api-key` header when Qdrant is secured |

| `QDRANT_COLLECTION` | no | Default `scda_ai` |

| `EMBEDDING_DIM` | no | Default `384` |

| `CHAT_MAX_MESSAGE_LENGTH` | no | Default `8000` (user message cap) |



On startup the service runs **`prisma migrate deploy`** then listens (applies `chat_*` tables without touching other services’ migrations).



## Run locally



```powershell

Copy-Item .env.example .env

# DATABASE_URL must point at Postgres (e.g. localhost:5432) with scda_db reachable

# JWT_SECRET, INTERNAL_API_KEY, AUDIT_SERVICE_URL, QDRANT_URL

npm install

npx prisma migrate deploy

npm start

```



---



## PowerShell — Docker (rebuild, run, test)



From repo root (`.env` must define `JWT_SECRET`, `INTERNAL_API_KEY`, `ENCRYPTION_KEY`, etc.):



```powershell

Set-Location "C:\Users\Seif\OneDrive\Desktop\FINAL-DIST"



docker compose build ai-service nginx-api-gateway

docker compose up -d postgres rabbitmq auth-service document-service audit-service qdrant ai-service worker-service nginx-api-gateway

```



**Chat API** (after login; `$token` from `/api/auth/login`):



```powershell

$chat = curl.exe -sk https://localhost/api/ai/chat/sessions -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "{}" | ConvertFrom-Json

$sid = $chat.session.id

curl.exe -sk "https://localhost/api/ai/chat/sessions/$sid/messages" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "{\"content\":\"Summarize my indexed security content.\"}"

curl.exe -sk "https://localhost/api/ai/chat/sessions" -H "Authorization: Bearer $token"

curl.exe -sk "https://localhost/api/ai/chat/sessions/$sid/messages" -H "Authorization: Bearer $token"

curl.exe -sk -X DELETE "https://localhost/api/ai/chat/sessions/$sid" -H "Authorization: Bearer $token"

```



**Analyze** (store embedding + payload in Qdrant) — same as before:



```powershell

$body = @{

  text      = "Policy 7.2 requires quarterly access reviews for privileged accounts."

  metadata  = @{ document_id = "00000000-0000-0000-0000-000000000001"; section = "7.2" }

} | ConvertTo-Json -Depth 5



curl.exe -sk https://localhost/api/ai/analyze `

  -H "Authorization: Bearer $token" `

  -H "Content-Type: application/json" `

  -d $body

```



**Semantic search**:



```powershell

$q = [uri]::EscapeDataString("access reviews privileged")

curl.exe -sk "https://localhost/api/ai/search?q=$q&limit=5" -H "Authorization: Bearer $token"

```



**Verify audit** (`GET /api/audit/logs` is **admin-only**): filter `action` contains `chat.` for chatbot events.



Collection name: override with `QDRANT_COLLECTION` in Compose if you changed it.


