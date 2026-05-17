# Final test commands — PowerShell

Repo root: adjust `Set-Location` to your **`FINAL-DIST`** path. Assumes stack is up (`docker compose up -d --build`) and **`.env`** + **`nginx/certs/*.pem`** exist.

**TLS note:** use **`curl.exe -sk`** for HTTPS to skip self-signed verification in automation.

---

## 1. All containers running

```powershell
Set-Location "C:\Users\Seif\OneDrive\Desktop\FINAL-DIST"
docker compose ps
```

Expect **running** / **healthy** (where healthchecks exist) for nginx, postgres, rabbitmq, qdrant, auth, document, worker, ai, audit, frontend.

---

## 2. HTTPS works

```powershell
curl.exe -sk https://localhost/api/ai/health
```

Expect JSON health body.

---

## 3. HTTP redirects to HTTPS

```powershell
curl.exe -v http://localhost/api/ai/health 2>&1 | Select-String -Pattern "301|302|Location: https"
```

Expect redirect to **`https://`**.

---

## 4. Security headers present

```powershell
curl.exe -skI https://localhost/
```

Expect gateway headers (e.g. **`strict-transport-security`**, **`content-security-policy`** — exact values configured in `nginx/nginx.conf`).

---

## 5. Login works

```powershell
curl.exe -sk https://localhost/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"proof@example.com\",\"password\":\"password12345\"}"
$login = curl.exe -sk https://localhost/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"proof@example.com\",\"password\":\"password12345\"}" | ConvertFrom-Json
$token = $login.access_token
curl.exe -sk https://localhost/api/auth/profile -H "Authorization: Bearer $token"
```

Expect **`200`** profile with user id/email/role.

---

## 6. Invalid login fails

```powershell
curl.exe -sk -w "`nHTTP:%{http_code}`n" https://localhost/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"proof@example.com\",\"password\":\"wrongpassword\"}"
```

Expect **`401`**.

---

## 7. Missing token fails (protected route)

```powershell
curl.exe -sk -w "`nHTTP:%{http_code}`n" https://localhost/api/documents
```

Expect **`401`**.

---

## 8. Admin endpoint works (promote user first)

```powershell
docker compose exec -T postgres psql -U scda_user -d scda_db -c "UPDATE users SET role = 'admin' WHERE email = 'proof@example.com';"
$login = curl.exe -sk https://localhost/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"proof@example.com\",\"password\":\"password12345\"}" | ConvertFrom-Json
$token = $login.access_token
curl.exe -sk -w "`nHTTP:%{http_code}`n" "https://localhost/api/audit/logs?limit=5" -H "Authorization: Bearer $token"
```

Expect **`200`** and JSON `logs`.

---

## 9. Upload valid file works

```powershell
$login = curl.exe -sk https://localhost/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"proof@example.com\",\"password\":\"password12345\"}" | ConvertFrom-Json
$token = $login.access_token
echo "integrity-proof" | Out-File -Encoding utf8 proof-upload.txt
curl.exe -sk -w "`nHTTP:%{http_code}`n" https://localhost/api/documents/upload -H "Authorization: Bearer $token" -F "file=@proof-upload.txt"
```

Expect **`201`/`200`** (success) with document metadata.

---

## 10. Invalid extension rejected

```powershell
echo "x" | Out-File -Encoding ascii bad.exe
curl.exe -sk -w "`nHTTP:%{http_code}`n" https://localhost/api/documents/upload -H "Authorization: Bearer $token" -F "file=@bad.exe"
```

Expect **client error** (e.g. **415** / **400** per `document-service` policy).

---

## 11. Document status becomes ready

```powershell
curl.exe -sk https://localhost/api/documents -H "Authorization: Bearer $token"
```

Repeat until newest row shows **`ready`** (worker + RabbitMQ). If stuck **`queued`**, check **`worker-service`** and RabbitMQ queue **`document.jobs`**.

---

## 12. Verify integrity works

```powershell
$docs = curl.exe -sk https://localhost/api/documents -H "Authorization: Bearer $token" | ConvertFrom-Json
$id = $docs.documents[0].id
curl.exe -sk "https://localhost/api/documents/$id/verify" -H "Authorization: Bearer $token"
```

Expect **`integrity_valid": true`** for an unmodified upload.

---

## 13. AI analyze / search work

```powershell
curl.exe -sk -w "`nHTTP:%{http_code}`n" https://localhost/api/ai/analyze -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "{\"text\":\"final test query\"}"
curl.exe -sk "https://localhost/api/ai/search?q=test&limit=5" -H "Authorization: Bearer $token"
```

Expect **`201`** on analyze and JSON hits on search.

---

## 14. Audit logs show records

```powershell
curl.exe -sk "https://localhost/api/audit/logs?limit=20" -H "Authorization: Bearer $token"
```

Expect non-empty **`logs`** array after traffic (admin JWT only).

---

## 15. RabbitMQ queue exists

Open **`http://127.0.0.1:15672`** — login with **`RABBITMQ_USER` / `RABBITMQ_PASS`** from `.env`. Under **Queues**, find **`document.jobs`** (default; or your `DOCUMENT_JOBS_QUEUE`).

**Do not use `guest`/`guest`.**

---

## 16. Qdrant collection exists

Browser: **`http://localhost:6333/dashboard`** — collections should include **`scda_ai`** (or `QDRANT_COLLECTION` from `.env`).

Optional CLI-style check:

```powershell
curl.exe -s http://localhost:6333/collections
```

---

## 17. Database tables exist

```powershell
docker compose exec -T postgres psql -U scda_user -d scda_db -c "\dt"
```

Expect tables including **`users`**, **`documents`**, **`audit_logs`**, **`chat_sessions`**, **`chat_messages`** (exact names may vary by migration naming — verify in output).

---

## 18. Rate limiting (429)

```powershell
1..40 | ForEach-Object {
  curl.exe -sk -o NUL -w "%{http_code}`n" -X POST "https://localhost/api/auth/login" `
    -H "Content-Type: application/json" `
    -d "{\"email\":\"x@y.z\",\"password\":\"bad\"}"
}
```

Expect at least one **`429`** after the configured burst/window.

---

## 19. Assistant Chat API (persisted)

Requires valid JWT (`$token` from login). Replace `$sid` after creating a session.

```powershell
$chat = curl.exe -sk https://localhost/api/ai/chat/sessions -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "{}" | ConvertFrom-Json
$sid = $chat.session.id
curl.exe -sk "https://localhost/api/ai/chat/sessions" -H "Authorization: Bearer $token"
curl.exe -sk "https://localhost/api/ai/chat/sessions/$sid/messages" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "{\"content\":\"What appears in my indexed vectors?\"}"
curl.exe -sk "https://localhost/api/ai/chat/sessions/$sid/messages" -H "Authorization: Bearer $token"
curl.exe -sk -X DELETE "https://localhost/api/ai/chat/sessions/$sid" -H "Authorization: Bearer $token"
```

Admin-only listing (optional):

```powershell
curl.exe -sk "https://localhost/api/ai/chat/admin/sessions" -H "Authorization: Bearer $token"
```
