# auth-service

Express.js authentication service for SCDA: registration, login, JWT access tokens, and RBAC (`admin` / `user`).

## Stack

- Express.js, PostgreSQL, Prisma ORM  
- JWT (`jsonwebtoken`), bcrypt password hashing, `express-validator`, `dotenv`

## Project layout

```
auth-service/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── errors/
│   ├── middleware/
│   ├── prisma/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── validators/
```

## Environment

Copy `.env.example` to `.env` and set values (never commit `.env`).

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | Secret for signing access tokens |
| `JWT_EXPIRES_IN` | yes | JWT lifetime (e.g. `15m`, `1h`) |
| `BCRYPT_ROUNDS` | no | bcrypt cost factor (default `12`) |
| `PORT` / `HOST` | no | Listen address (default `3001` / `0.0.0.0`) |

For **Docker Compose**, set `JWT_SECRET` in a `.env` file next to `docker-compose.yml` (Compose reads it for variable substitution) or export it in your shell before `docker compose up`. The compose file also injects `DATABASE_URL` for the `postgres` service hostname.

## Database migrations

```bash
# Local development (creates/updates DB and migration files)
cp .env.example .env
npm install
npx prisma migrate dev

# Production / CI — apply existing migrations
npx prisma migrate deploy
```

The Docker image runs `prisma migrate deploy` before starting the server.

## API (base path `/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | no | Register (role always `user`; `password` never stored in plain text) |
| `POST` | `/api/auth/login` | no | Login; returns JWT + public user |
| `GET` | `/api/auth/profile` | JWT | Current user profile (no password fields) |
| `GET` | `/api/auth/admin` | JWT + `admin` | Admin-only probe route |
| `GET` | `/health` | no | Liveness at service root |

### Examples

```bash
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

curl -s http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer <access_token>"
```

To create an **admin** for local testing, update the row in PostgreSQL (e.g. `UPDATE users SET role = 'admin' WHERE email = 'user@example.com';`) or use `prisma studio` — there is no public “promote to admin” endpoint by design.

## Security notes

- Passwords are hashed with bcrypt; hashes are never returned in JSON responses.  
- Login failures use a generic message (`Invalid credentials`).  
- API errors do not include stack traces in HTTP responses.  
- Passwords must not be logged by application code.

## Not implemented

OAuth, refresh tokens, email verification, password reset.
