# OAuth external login (Task 4)

SCDA supports **Google**, **GitHub**, and **Microsoft** sign-in using OAuth 2.0 authorization code flow. After the provider authenticates the user, `auth-service` issues the same **HS256 JWT** used for email/password login.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/oauth/providers` | Lists configured providers |
| `GET` | `/api/auth/oauth/:provider` | Redirect to provider (`google`, `github`, `microsoft`) |
| `GET` | `/api/auth/oauth/:provider/callback` | OAuth callback (server-side) |

Frontend callback: `https://localhost/oauth/callback` (receives `#access_token=…`).

## Environment variables (`auth-service`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OAUTH_CALLBACK_BASE_URL` | recommended | Public origin for callbacks, e.g. `https://localhost` |
| `OAUTH_FRONTEND_REDIRECT_URL` | recommended | e.g. `https://localhost/oauth/callback` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | for Google | [Google Cloud Console](https://console.cloud.google.com/) OAuth client |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | for GitHub | GitHub → Settings → Developer settings → OAuth Apps |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | for Microsoft | Azure App registration |
| `MICROSOFT_TENANT` | optional | Default `common` (work + personal accounts) |

Redirect URIs to register with each provider:

- `https://localhost/api/auth/oauth/google/callback`
- `https://localhost/api/auth/oauth/github/callback`
- `https://localhost/api/auth/oauth/microsoft/callback`

## Database

- `users.password_hash` is optional (OAuth-only users).
- `oauth_accounts` links `provider` + `provider_account_id` to `user_id`.
- Same email from provider links to an existing user account.

## Security

- Signed `state` JWT (10-minute TTL) prevents CSRF.
- Tokens returned to the SPA in URL **hash** (not query) to reduce log leakage.
- Audit events: `auth.oauth.login.success` / failures.

## Google sign-in (step-by-step)

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select or create a project.
2. **APIs & Services** → **OAuth consent screen** → External → add app name and your email as test user (while in Testing mode).
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID** → type **Web application**.
4. **Authorized redirect URIs** — add exactly:
   ```
   https://localhost/api/auth/oauth/google/callback
   ```
5. Copy **Client ID** and **Client secret** into your root `.env`:
   ```env
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
   OAUTH_CALLBACK_BASE_URL=https://localhost
   OAUTH_FRONTEND_REDIRECT_URL=https://localhost/oauth/callback
   ```
6. Restart auth-service:
   ```powershell
   docker compose up -d auth-service frontend
   ```
7. Open `https://localhost/login` — you should see **Continue with Google**.

**Note:** Use `https://localhost` (same as nginx), not `http://127.0.0.1`. If the button is missing, check `GET https://localhost/api/auth/oauth/providers` returns `{"providers":[{"id":"google","name":"Google"}]}`.

## GitHub sign-in (step-by-step)

1. Open **GitHub** → your profile photo → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.
   - Direct link: [github.com/settings/developers](https://github.com/settings/developers)
2. Fill in the form:
   - **Application name:** `SCDA Local` (any name)
   - **Homepage URL:** `https://localhost`
   - **Authorization callback URL** — must match exactly:
     ```
     https://localhost/api/auth/oauth/github/callback
     ```
3. Click **Register application**, then **Generate a new client secret**.
4. Copy **Client ID** and **Client secret** into your root `.env`:
   ```env
   GITHUB_CLIENT_ID=Ov23lixxxxxxxxxxxx
   GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   OAUTH_CALLBACK_BASE_URL=https://localhost
   OAUTH_FRONTEND_REDIRECT_URL=https://localhost/oauth/callback
   ```
5. Restart **auth-service** (picks up new env vars):
   ```powershell
   docker compose up -d auth-service
   ```
6. Verify the provider is enabled:
   ```powershell
   curl.exe -sk https://localhost/api/auth/oauth/providers
   ```
   Expect: `{"providers":[...,{"id":"github","name":"GitHub"}]}`
7. Open **`https://localhost/login`** — click **Continue with GitHub**.

**GitHub email:** The app requests `read:user` and `user:email`. If your GitHub email is private, SCDA loads it from the `/user/emails` API. Ensure at least one **verified** email exists on your GitHub account, or sign-in will fail with a clear error.

**Troubleshooting**

| Symptom | Fix |
|---------|-----|
| No GitHub button | `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` empty or auth-service not restarted |
| `redirect_uri mismatch` | Callback URL in GitHub app must be exactly `https://localhost/api/auth/oauth/github/callback` |
| `Could not obtain an email` | Add/verify a public or primary email on GitHub |
| Browser cert warning | Expected for self-signed TLS — proceed to `https://localhost` |

## Local testing without providers

If no client IDs are set, `/api/auth/oauth/providers` returns `[]` and the login page hides social buttons. Email/password login still works.
