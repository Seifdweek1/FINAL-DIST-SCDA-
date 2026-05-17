# Security Test Commands — PowerShell (Tasks 1–20)

Run from repository root after:

```powershell
Set-Location "C:\Users\Seif\OneDrive\Desktop\FINAL-DIST"
# Ensure .env and nginx/certs/*.pem exist
docker compose up -d --build
```

Use **`curl.exe -sk`** for HTTPS (self-signed local certs).

Set shared variables:

```powershell
$Base = "https://localhost"
$Email = "sec-test@example.com"
$Pass  = "password12345"
```

---

## Task 1 — Authentication

### §1.1 Register

```powershell
curl.exe -sk "$Base/api/auth/register" -H "Content-Type: application/json" `
  -d "{`"email`":`"$Email`",`"password`":`"$Pass`"}"
```

### §1.2 Login (valid)

```powershell
$login = curl.exe -sk "$Base/api/auth/login" -H "Content-Type: application/json" `
  -d "{`"email`":`"$Email`",`"password`":`"$Pass`"}" | ConvertFrom-Json
$token = $login.access_token
$login | ConvertTo-Json
```

### §1.3 Missing token (401)

```powershell
curl.exe -sk -w "`nHTTP:%{http_code}`n" "$Base/api/documents"
```

### §1.4 Invalid token (401)

```powershell
curl.exe -sk -w "`nHTTP:%{http_code}`n" "$Base/api/auth/profile" `
  -H "Authorization: Bearer not-a-valid-jwt"
```

### §1.5 Protected route with valid token (200)

```powershell
curl.exe -sk "$Base/api/auth/profile" -H "Authorization: Bearer $token"
```

### §1.6 Invalid login (401)

```powershell
curl.exe -sk -w "`nHTTP:%{http_code}`n" "$Base/api/auth/login" -H "Content-Type: application/json" `
  -d "{`"email`":`"$Email`",`"password`":`"wrongpassword`"}"
```

---

## Task 2 — Password hashing

### §2.1 Verify hash in database (not plaintext)

```powershell
docker compose exec -T postgres psql -U scda_user -d scda_db -c `
  "SELECT email, LEFT(password_hash, 7) AS hash_prefix, LENGTH(password_hash) AS len FROM users WHERE email = '$Email';"
```

Expect prefix like `$2b$12$` (bcrypt), not the plain password.

---

## Task 3 — RBAC

### §3.1 Promote admin

```powershell
docker compose exec -T postgres psql -U scda_user -d scda_db -c `
  "UPDATE users SET role = 'admin' WHERE email = '$Email';"
$login = curl.exe -sk "$Base/api/auth/login" -H "Content-Type: application/json" `
  -d "{`"email`":`"$Email`",`"password`":`"$Pass`"}" | ConvertFrom-Json
$token = $login.access_token
```

### §3.2 Non-admin blocked from audit API

```powershell
docker compose exec -T postgres psql -U scda_user -d scda_db -c `
  "UPDATE users SET role = 'user' WHERE email = '$Email';"
$login = curl.exe -sk "$Base/api/auth/login" -H "Content-Type: application/json" `
  -d "{`"email`":`"$Email`",`"password`":`"$Pass`"}" | ConvertFrom-Json
$userToken = $login.access_token
curl.exe -sk -w "`nHTTP:%{http_code}`n" "$Base/api/audit/logs?limit=1" `
  -H "Authorization: Bearer $userToken"
```

Expect **403**.

### §3.3 User cannot access another user's document

```powershell
# Upload as sec-test user
docker compose exec -T postgres psql -U scda_user -d scda_db -c `
  "UPDATE users SET role = 'user' WHERE email = '$Email';"
$login = curl.exe -sk "$Base/api/auth/login" -H "Content-Type: application/json" `
  -d "{`"email`":`"$Email`",`"password`":`"$Pass`"}" | ConvertFrom-Json
$token = $login.access_token
"proof" | Out-File -Encoding utf8 t3-upload.txt
$up = curl.exe -sk "$Base/api/documents/upload" -H "Authorization: Bearer $token" -F "file=@t3-upload.txt" | ConvertFrom-Json
$docId = $up.document.id

# Second user
curl.exe -sk "$Base/api/auth/register" -H "Content-Type: application/json" `
  -d '{"email":"other@example.com","password":"password12345"}'
$other = curl.exe -sk "$Base/api/auth/login" -H "Content-Type: application/json" `
  -d '{"email":"other@example.com","password":"password12345"}' | ConvertFrom-Json
curl.exe -sk -w "`nHTTP:%{http_code}`n" "$Base/api/documents/$docId" `
  -H "Authorization: Bearer $($other.access_token)"
```

Expect **404** (not found — no cross-user leak).

### §3.4 Admin audit access

```powershell
docker compose exec -T postgres psql -U scda_user -d scda_db -c `
  "UPDATE users SET role = 'admin' WHERE email = '$Email';"
$login = curl.exe -sk "$Base/api/auth/login" -H "Content-Type: application/json" `
  -d "{`"email`":`"$Email`",`"password`":`"$Pass`"}" | ConvertFrom-Json
$token = $login.access_token
curl.exe -sk -w "`nHTTP:%{http_code}`n" "$Base/api/audit/logs?limit=3" `
  -H "Authorization: Bearer $token"
```

Expect **200**.

---

## Task 4 — OAuth

### §4.1 Providers list

```powershell
curl.exe -sk "$Base/api/auth/oauth/providers"
```

Without client IDs in `.env`: `{"providers":[]}`. After configuring Google: includes `google`.

---

## Task 5–6 — Gateway, HTTPS, headers

### §5.1 Route smoke tests

```powershell
curl.exe -sk "$Base/api/ai/health"
curl.exe -sk -w "`nHTTP:%{http_code}`n" "$Base/api/auth/profile" -H "Authorization: Bearer $token"
```

### §5.3 Security headers

```powershell
curl.exe -skI "$Base/"
```

Look for `strict-transport-security`, `content-security-policy`, `x-content-type-options`.

### §6.1 HTTP redirect

```powershell
curl.exe -sI http://localhost/ | Select-String -Pattern "301|Location"
```

### §6.2 HTTPS health

```powershell
curl.exe -sk "$Base/nginx-health"
```

---

## Task 7 — Rate limiting

### §7.1 Login flood → 429

```powershell
1..35 | ForEach-Object {
  curl.exe -sk -o NUL -w "%{http_code}`n" -X POST "$Base/api/auth/login" `
    -H "Content-Type: application/json" `
    -d '{"email":"x@y.z","password":"bad"}'
}
```

Expect at least one **429**.

### §7.2 Single normal request (not 429)

```powershell
curl.exe -sk -w "`nHTTP:%{http_code}`n" -X POST "$Base/api/auth/login" `
  -H "Content-Type: application/json" `
  -d "{`"email`":`"$Email`",`"password`":`"$Pass`"}"
```

---

## Task 8 — Input validation

### §8.1 Bad email on register

```powershell
curl.exe -sk -w "`nHTTP:%{http_code}`n" "$Base/api/auth/register" -H "Content-Type: application/json" `
  -d '{"email":"not-an-email","password":"password12345"}'
```

### §8.2 Short password

```powershell
curl.exe -sk -w "`nHTTP:%{http_code}`n" "$Base/api/auth/register" -H "Content-Type: application/json" `
  -d '{"email":"shortpw@example.com","password":"short"}'
```

### §8.3 Chat message too long (optional)

```powershell
$long = "x" * 9000
curl.exe -sk -w "`nHTTP:%{http_code}`n" -X POST "$Base/api/ai/chat/sessions" `
  -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "{}"
# Then POST message with $long content to session messages endpoint if CHAT_MAX_MESSAGE_LENGTH < 9000
```

---

## Task 9 — Secure upload

### §9.1 Valid file

```powershell
"security upload test" | Out-File -Encoding utf8 valid-upload.txt
curl.exe -sk -w "`nHTTP:%{http_code}`n" "$Base/api/documents/upload" `
  -H "Authorization: Bearer $token" -F "file=@valid-upload.txt"
```

### §9.2 Blocked extension (.exe)

```powershell
"MZ" | Out-File -Encoding ascii bad.exe
curl.exe -sk -w "`nHTTP:%{http_code}`n" "$Base/api/documents/upload" `
  -H "Authorization: Bearer $token" -F "file=@bad.exe"
```

Expect **415** or **400**.

### §9.3 Oversized file (if you have a large test file)

```powershell
# Create ~25MB+ file or lower MAX_FILE_SIZE in .env for demo
# fsutil file createnew big.bin 25000000
# curl.exe -sk -w "`nHTTP:%{http_code}`n" ... -F "file=@big.bin"
```

---

## Task 10 — Encryption

### §10.2 Owner download

```powershell
$docs = curl.exe -sk "$Base/api/documents" -H "Authorization: Bearer $token" | ConvertFrom-Json
$id = $docs.documents[0].id
curl.exe -sk -o downloaded.bin "$Base/api/documents/$id/download" -H "Authorization: Bearer $token"
```

### §10.3 Other user download blocked

Use §3.3 `$docId` and other user's token — expect **404**.

---

## Task 11 — Integrity

### §11.1 Verify unmodified document

```powershell
curl.exe -sk "$Base/api/documents/$id/verify" -H "Authorization: Bearer $token"
```

Expect `"integrity_valid":true`.

### §11.2 Tamper demo (corrupt ciphertext)

```powershell
# Replace DOCUMENT_ID and STORED_FILENAME from DB
docker compose exec -T postgres psql -U scda_user -d scda_db -c `
  "SELECT id, stored_filename, encrypted_path FROM documents LIMIT 1;"
# Truncate encrypted file inside document-service volume (destructive — use a test doc only):
# docker compose exec document-service sh -c "dd if=/dev/zero of=/app/uploads/... bs=1 count=32 conv=notrunc"
curl.exe -sk "$Base/api/documents/$id/verify" -H "Authorization: Bearer $token"
```

Expect `"integrity_valid":false` after tamper.

---

## Task 12 — Internal API key

Load key from `.env` (do not commit):

```powershell
$internalKey = (Get-Content .env | Where-Object { $_ -match '^INTERNAL_API_KEY=' }) -replace 'INTERNAL_API_KEY=',''
```

### §12.1 Valid key

```powershell
curl.exe -sk -w "`nHTTP:%{http_code}`n" -X POST "$Base/api/audit/log" `
  -H "Content-Type: application/json" `
  -H "X-Internal-Api-Key: $internalKey" `
  -d '{"service":"proof","action":"security.test","status":"success"}'
```

Expect **201**.

### §12.2 Missing key

```powershell
curl.exe -sk -w "`nHTTP:%{http_code}`n" -X POST "$Base/api/audit/log" `
  -H "Content-Type: application/json" `
  -d '{"service":"proof","action":"security.test","status":"success"}'
```

Expect **403**.

### §12.3 Wrong key

```powershell
curl.exe -sk -w "`nHTTP:%{http_code}`n" -X POST "$Base/api/audit/log" `
  -H "Content-Type: application/json" `
  -H "X-Internal-Api-Key: wrong-key" `
  -d '{"service":"proof","action":"security.test","status":"success"}'
```

Expect **403**.

---

## Task 14 — PostgreSQL tables

### §14.1 List tables

```powershell
docker compose exec -T postgres psql -U scda_user -d scda_db -c "\dt"
```

---

## Task 15–16 — RabbitMQ

### §15.1 Queues

```powershell
docker compose exec rabbitmq rabbitmqctl list_queues name messages consumers
```

### §15.2 Worker logs

```powershell
docker compose logs worker-service --tail 30
```

### §15.3 Document status

```powershell
curl.exe -sk "$Base/api/documents" -H "Authorization: Bearer $token"
```

### §16.1 RabbitMQ users (no guest)

```powershell
docker compose exec rabbitmq rabbitmqctl list_users
```

Management UI: **http://127.0.0.1:15672** (localhost only) with `RABBITMQ_USER` / `RABBITMQ_PASS` from `.env`.

---

## Task 17 — Audit trail sample

```powershell
curl.exe -sk "$Base/api/audit/logs?limit=30" -H "Authorization: Bearer $token" | ConvertFrom-Json |
  Select-Object -ExpandProperty logs |
  Select-Object created_at, service, action, status, user_id |
  Format-Table -AutoSize
```

Filter examples:

```powershell
docker compose exec -T postgres psql -U scda_user -d scda_db -c `
  "SELECT action, status, COUNT(*) FROM audit_logs GROUP BY action, status ORDER BY COUNT(*) DESC LIMIT 20;"
```

---

## Task 18 — Monitoring stats

### §18.1 Admin stats API

```powershell
curl.exe -sk "$Base/api/audit/logs/stats" -H "Authorization: Bearer $token" | ConvertFrom-Json
```

UI: open **`https://localhost/audit`** as admin.

---

## Task 19 — Safe errors

```powershell
curl.exe -sk "$Base/api/auth/register" -H "Content-Type: application/json" `
  -d '{"email":"bad","password":"x"}'
```

Response body should be JSON with `error.message` only — no stack trace.

---

## Task 20 — Docker Compose

### §20.1 All services

```powershell
docker compose ps
```

---

## Task 13 — Secrets (manual checks)

```powershell
git check-ignore -v .env
Test-Path .env.example
Select-String -Path .env.example -Pattern "JWT_SECRET|ENCRYPTION_KEY|INTERNAL_API_KEY|RABBITMQ"
```

---

## AI / Qdrant (supporting Tasks 9–11, 15, 18)

```powershell
curl.exe -sk "$Base/api/ai/search?q=integrity+verification&limit=3" -H "Authorization: Bearer $token"
curl.exe -s http://localhost:6333/collections/scda_ai
```

---

See also **`FINAL_TEST_COMMANDS.md`** for extended chat and analyze flows.
