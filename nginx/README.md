# nginx-api-gateway

TLS-terminated reverse proxy for SCDA. Routes:

- `/api/auth/` → auth-service  
- `/api/documents/` → document-service  
- `/api/audit/` → audit-service  
- `/api/ai/` → ai-service  

## TLS certificates

Before `docker compose up`, create **`nginx/certs/fullchain.pem`** and **`nginx/certs/privkey.pem`** (self-signed is fine for local dev). See repository root **README** or the PowerShell section below.

`*.pem` under `nginx/certs/` is **gitignored**.

## Behaviour (gateway)

| Feature | Notes |
|--------|--------|
| **HTTPS** | `443` with TLS 1.2+ and modern cipher suites |
| **HTTP → HTTPS** | All HTTP requests return **301** to `https://$host$request_uri`, except **`GET /nginx-health`** on port **80** (plain HTTP for container healthchecks) |
| **Rate limits** | **General** API: `25r/s` per IP (`api_general`, burst 40). **`POST /api/auth/login`**: `10r/m` per IP (`api_login`, burst 5) |
| **Body size** | `client_max_body_size 25m` (document uploads) |
| **Headers** | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Content-Security-Policy`, `Strict-Transport-Security` (HTTPS only) |

---

## PowerShell — generate certs, rebuild, test

Run from repository root (`FINAL-DIST`). Adjust paths if your clone lives elsewhere.

### 1) Create self-signed certificate (OpenSSL via Alpine)

```powershell
Set-Location "C:\Users\Seif\OneDrive\Desktop\FINAL-DIST"
New-Item -ItemType Directory -Force -Path ".\nginx\certs" | Out-Null

docker run --rm -v "${PWD}/nginx/certs:/out" alpine:3.20 sh -c "apk add --no-cache openssl >/dev/null && openssl req -x509 -nodes -days 825 -newkey rsa:2048 -subj '/CN=localhost' -keyout /out/privkey.pem -out /out/fullchain.pem"
```

### 2) Rebuild gateway

```powershell
docker compose build nginx-api-gateway
```

### 3) Start stack (example)

```powershell
docker compose up -d postgres rabbitmq auth-service document-service audit-service qdrant ai-service worker-service nginx-api-gateway
```

### 4) Test HTTPS (skip TLS verification for self-signed)

```powershell
# Health through TLS (gateway placeholder or upstream JSON depending on path)
curl.exe -vk https://localhost/api/ai/health

# Example authenticated call (replace body with valid credentials)
curl.exe -vk https://localhost/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"testuser@example.com\",\"password\":\"password123\"}"
```

### 5) Test HTTP → HTTPS redirect

```powershell
curl.exe -v http://localhost/api/ai/health 2>&1 | Select-String -Pattern "301|Location: https"
```

Expect **301** and **`Location: https://localhost/...`**.

### 6) Test rate limiting (login — applies on **HTTPS** only; HTTP login is redirected before upstream)

```powershell
# Rapid HTTPS login attempts (invalid credentials) — expect 429 after burst / minute window
1..40 | ForEach-Object {
  curl.exe -sk -o NUL -w "%{http_code}`n" -X POST "https://localhost/api/auth/login" `
    -H "Content-Type: application/json" `
    -d "{\"email\":\"x@y.z\",\"password\":\"bad\"}"
}
```

### 7) Confirm existing routes (HTTPS)

```powershell
$login = Invoke-RestMethod -SkipCertificateCheck -Uri "https://localhost/api/auth/login" `
  -Method Post -Body '{"email":"testuser@example.com","password":"password123"}' -ContentType "application/json"
Invoke-RestMethod -SkipCertificateCheck -Uri "https://localhost/api/ai/health"
```

PowerShell 5.1 has no `-SkipCertificateCheck`; use **`curl.exe -k`** for HTTPS tests instead.

### 8) Plain HTTP health (no redirect)

```powershell
Invoke-RestMethod -Uri "http://localhost/nginx-health"
```

---

## Validate nginx configuration inside Compose network

`nginx -t` resolves upstream names; run it attached to the project network (with backend services defined, DNS names exist):

```powershell
docker compose run --rm nginx-api-gateway nginx -t
```
