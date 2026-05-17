# Runbook — PowerShell (Windows)

Run from repo root: `FINAL-DIST` (adjust path).

---

## End-to-end — one clean proof sequence

Use after **§0** (`.env` filled from `.env.example`) and a working **`nginx/certs/*.pem`**. Replace email/password as you like. There is **no seeded admin** — promote one user for **`/audit`** UI and **`/api/audit/*`**.

```powershell
Set-Location "C:\Users\Seif\OneDrive\Desktop\FINAL-DIST"

# TLS (skip if fullchain.pem + privkey.pem already exist)
New-Item -ItemType Directory -Force -Path ".\nginx\certs" | Out-Null
docker run --rm -v "${PWD}/nginx/certs:/out" alpine:3.20 sh -c "apk add --no-cache openssl >/dev/null && openssl req -x509 -nodes -days 825 -newkey rsa:2048 -subj '/CN=localhost' -keyout /out/privkey.pem -out /out/fullchain.pem"

docker compose up --build -d
docker compose ps

# Register + login
curl.exe -sk https://localhost/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"demo@example.com\",\"password\":\"password12345\"}"
$login = curl.exe -sk https://localhost/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"demo@example.com\",\"password\":\"password12345\"}" | ConvertFrom-Json
$token = $login.access_token

# Promote to admin (once) — re-login for refreshed role in JWT
docker compose exec -T postgres psql -U scda_user -d scda_db -c "UPDATE users SET role = 'admin' WHERE email = 'demo@example.com';"
$login = curl.exe -sk https://localhost/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"demo@example.com\",\"password\":\"password12345\"}" | ConvertFrom-Json
$token = $login.access_token

# Upload + list + verify
echo "proof" | Out-File -Encoding utf8 demo-proof.txt
curl.exe -sk https://localhost/api/documents/upload -H "Authorization: Bearer $token" -F "file=@demo-proof.txt"
$docs = curl.exe -sk https://localhost/api/documents -H "Authorization: Bearer $token" | ConvertFrom-Json
$id = $docs.documents[0].id
curl.exe -sk "https://localhost/api/documents/$id/verify" -H "Authorization: Bearer $token"

# AI analyze + search
curl.exe -sk https://localhost/api/ai/analyze -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "{\"text\":\"demo analyze text\"}"
curl.exe -sk "https://localhost/api/ai/search?q=demo&limit=5" -H "Authorization: Bearer $token"

# Persisted chatbot (PostgreSQL + Qdrant context)
$chat = curl.exe -sk https://localhost/api/ai/chat/sessions -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "{}" | ConvertFrom-Json
$sid = $chat.session.id
curl.exe -sk "https://localhost/api/ai/chat/sessions/$sid/messages" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "{\"content\":\"What did I index about access reviews?\"}"
curl.exe -sk "https://localhost/api/ai/chat/sessions" -H "Authorization: Bearer $token"

# Audit (admin JWT)
curl.exe -sk "https://localhost/api/audit/logs?limit=10" -H "Authorization: Bearer $token"
```

**RabbitMQ management:** **`http://127.0.0.1:15672`** — **`RABBITMQ_USER` / `RABBITMQ_PASS`** from `.env` (not `guest`/`guest`).

**Qdrant dashboard:** **`http://localhost:6333/dashboard`** (collection e.g. **`scda_ai`** / `QDRANT_COLLECTION`).

**Database tables:**

```powershell
docker compose exec -T postgres psql -U scda_user -d scda_db -c "\dt"
```

More automated checks: **`FINAL_TEST_COMMANDS.md`**. Ordered UI demo: **`DEMO_STEPS.md`**.

---

## 0. One-time: `.env` and TLS

```powershell
Set-Location "C:\Users\Seif\OneDrive\Desktop\FINAL-DIST"
Copy-Item .env.example .env
# Edit .env: JWT_SECRET, INTERNAL_API_KEY, ENCRYPTION_KEY (64 hex chars)

New-Item -ItemType Directory -Force -Path ".\nginx\certs" | Out-Null
docker run --rm -v "${PWD}/nginx/certs:/out" alpine:3.20 sh -c "apk add --no-cache openssl >/dev/null && openssl req -x509 -nodes -days 825 -newkey rsa:2048 -subj '/CN=localhost' -keyout /out/privkey.pem -out /out/fullchain.pem"
```

---

## 1. Build and start full stack

```powershell
Set-Location "C:\Users\Seif\OneDrive\Desktop\FINAL-DIST"
docker compose build
docker compose up -d
docker compose ps
```

Rebuild only UI + gateway after frontend/nginx changes:

```powershell
docker compose build frontend nginx-api-gateway
docker compose up -d
```

---

## 2. After `up` — smoke tests

### HTTP health (no redirect path)

```powershell
Invoke-RestMethod -Uri "http://localhost/nginx-health"
```

### AI health (HTTPS, skip cert check)

```powershell
curl.exe -sk https://localhost/api/ai/health
```

### HTTP → HTTPS redirect

```powershell
curl.exe -v http://localhost/api/ai/health 2>&1 | Select-String -Pattern "301|Location: https"
```

---

## 3. Auth + audit (replace with real credentials)

```powershell
# Register
curl.exe -sk https://localhost/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"demo@example.com\",\"password\":\"password12345\"}"

# Login
$login = curl.exe -sk https://localhost/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"demo@example.com\",\"password\":\"password12345\"}" | ConvertFrom-Json
$token = $login.access_token

# Profile (JWT)
curl.exe -sk https://localhost/api/auth/profile -H "Authorization: Bearer $token"
```

### Failed login (expect 401; should create `auth.login.failed` in audit DB via API flow)

```powershell
curl.exe -sk -w "\nHTTP:%{http_code}\n" https://localhost/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"demo@example.com\",\"password\":\"wrongpassword\"}"
```

---

## 4. Admin audit API (must be admin JWT)

```powershell
curl.exe -sk "https://localhost/api/audit/logs?limit=20" -H "Authorization: Bearer $token"
curl.exe -sk "https://localhost/api/audit/logs/stats" -H "Authorization: Bearer $token"
```

---

## 5. Rate limiting proof (login)

```powershell
1..35 | ForEach-Object {
  curl.exe -sk -o NUL -w "%{http_code}`n" -X POST "https://localhost/api/auth/login" `
    -H "Content-Type: application/json" `
    -d "{\"email\":\"x@y.z\",\"password\":\"bad\"}"
}
```

Expect **`429`** after burst / minute window.

---

## 6. RabbitMQ management (optional)

- URL: **http://localhost:15672** (bound to **127.0.0.1** only in Compose)
- Log in with **`RABBITMQ_USER` / `RABBITMQ_PASS`** from `.env` (defaults in `.env.example`: `scda_mq` / `scda_mq_dev_change_me` — change for real deployments)

**Do not use `guest`/`guest`** — rubric Task 16; this stack uses a dedicated user.

---

## 7. Custom RabbitMQ user (optional)

If you override **`RABBITMQ_USER`** / **`RABBITMQ_PASS`**, set **`RABBITMQ_URL`** to the same credentials:

```env
RABBITMQ_USER=myuser
RABBITMQ_PASS=mysecret
RABBITMQ_URL=amqp://myuser:mysecret@rabbitmq:5672
```

Then restart broker + producers/consumers:

```powershell
docker compose up -d rabbitmq document-service worker-service
```

---

## 8. Stop / reset

```powershell
docker compose down
# Wipe volumes (DB, Qdrant, uploads):
docker compose down -v
```

---

## 9. Rebuild services after this compliance pass

Auth / document / audit logging changed:

```powershell
docker compose build auth-service document-service audit-service
docker compose up -d
```
