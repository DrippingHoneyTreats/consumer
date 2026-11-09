# Dripping Honey Treats API (Express + Sequelize)

Progressive backend. **Phase 0–1 only:** health check + onboarding (OTP auth). Catalogue, cart, payments, and events come later.

## Stack

- Node.js + **Express** + **TypeScript**
- **Sequelize** + **PostgreSQL**
- Zod validation, JWT in `access_token` cookie

## Folder map (request path)

```
route → validator middleware → controller → service → model → Postgres
```

| Folder | Role |
|--------|------|
| `src/routes/` | URL paths only |
| `src/validators/` | Request shape (Zod) |
| `src/controllers/` | `req` / `res`, call services |
| `src/services/` | Business rules + DB |
| `src/models/` | Sequelize models |
| `src/middleware/` | Auth, validate helper, errors |
| `src/migrations/` | Schema changes for TablePlus / Postgres |
| `src/config/` | Env + DB connection |

## Setup (Mac)

### Postgres (pick one)

**A. Homebrew (what we used on this machine):**

```bash
brew install postgresql@16
brew services start postgresql@16
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
createuser -s postgres 2>/dev/null || true
psql -d postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
createdb -O postgres dhtcustomers
```

**B. Docker** (if Docker Desktop is installed):

```bash
docker compose up -d postgres
```

### App

```bash
cp .env.example .env   # if needed
npm install
npm run db:migrate
npm run dev
```

API: `http://localhost:4000/api/v1`  
Health: `GET http://localhost:4000/api/v1/health`

Frontend (already configured): `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`

If your Next app runs on port **3001**, set `CORS_ORIGIN=http://localhost:3001` in `.env`.

## TablePlus

- Host `127.0.0.1`, port `5432`
- User `postgres` / password `postgres`
- Database `dhtcustomers`

After migrate you should see `users` and `otp_requests`.

## Phase 1 auth endpoints

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/v1/auth/register` | `{ fullName, contact, channel, consent }` |
| POST | `/api/v1/auth/otp/send` | `{ contact, channel, purpose }` |
| POST | `/api/v1/auth/otp/verify` | `{ contact, code }` → sets cookie, returns user |
| POST | `/api/v1/auth/logout` | clears cookie |
| GET | `/api/v1/me` | current user (cookie required) |

**Dev OTP:** with `DEV_OTP_CODE=123456`, use that code in Verify (no SMS/WhatsApp yet).

### Curl smoke test

```bash
curl -s http://localhost:4000/api/v1/health

curl -s -c cookies.txt -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Ada Lovelace","contact":"+2348012345678","channel":"sms","consent":true}'

curl -s -c cookies.txt -X POST http://localhost:4000/api/v1/auth/otp/send \
  -H 'Content-Type: application/json' \
  -d '{"contact":"+2348012345678","channel":"sms","purpose":"register"}'

curl -s -c cookies.txt -b cookies.txt -X POST http://localhost:4000/api/v1/auth/otp/verify \
  -H 'Content-Type: application/json' \
  -d '{"contact":"+2348012345678","code":"123456"}'

curl -s -b cookies.txt http://localhost:4000/api/v1/me
```

## Phase 1 review checklist

- [ ] Explain OTP verify: route → validate → controller → service → model
- [ ] See rows in TablePlus (`users`, `otp_requests`)
- [ ] Welcome → Verify with `123456` works in the Next app
- [ ] Logout then `GET /me` returns 401
- [ ] Know where to change phone vs email rules (`utils/phone.ts`, `services/auth.service.ts`)

## Build phases (next)

2 Catalogue → 3 Cart → 4 Addresses → 5 Payments → 6 Orders → 7 Events → 8 Harden/deploy

Do not start Phase 2 until Phase 1 review is done.
