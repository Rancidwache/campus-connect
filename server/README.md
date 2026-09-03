# Campus Connect V2 — API

Node + Express + Prisma REST API.

## Setup

```bash
cp .env.example .env
# Edit JWT_SECRET (any long random string). DATABASE_URL already points at the
# local database created below.

npm install
```

**Get a PostgreSQL database** — pick one:

- **Docker:** `docker compose up -d` (creates the role + DB from the compose file).
- **An existing local PostgreSQL:** create the role and database once, as the
  superuser (use the password you set when installing PostgreSQL):

  ```bash
  psql -U postgres -h 127.0.0.1 -f scripts/bootstrap-db.sql
  ```

- **Your own connection string:** edit `DATABASE_URL` in `.env` to point anywhere.

Then:

```bash
npm run db:migrate      # creates the schema
npm run db:seed         # 3 demo users (password: "Password123") + 6 listings
npm run dev             # http://localhost:4000
```

Health check: `GET http://localhost:4000/api/health`

## Environment

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signs access tokens — required |
| `JWT_EXPIRES_IN` | Token lifetime (default `7d`) |
| `CORS_ORIGIN` | Comma-separated allowed web origins |
| `TRUST_PROXY` | `1` when running behind Kong / a reverse proxy |
| `SMS_PROVIDER` | `console` (dev, logs the code) or `africastalking` |
| `OTP_DEV_ECHO` | `true` returns the OTP in the API response — **dev only** |
| `OTP_TTL_MINUTES` / `OTP_MAX_ATTEMPTS` | OTP expiry and wrong-guess limit |
| `AT_USERNAME` / `AT_API_KEY` / `AT_SENDER_ID` | Africa's Talking creds |

## API — Module 1

All routes are prefixed with `/api`. Send `Authorization: Bearer <token>` where noted.

### Auth  `/api/auth`

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| POST | `/register` | `fullName, phoneNumber, password` | Creates the account, sends an SMS OTP |
| POST | `/verify-phone` | `phoneNumber, code` | Marks the phone verified, returns a token |
| POST | `/resend-code` | `phoneNumber` | Sends a fresh OTP |
| POST | `/login` | `phoneNumber, password` | Returns a token; `403 + needsVerification` if unverified |

Phone numbers accept `0712345678`, `712345678`, `254712…`, `+254712…`.

### Users  `/api/users`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/me` | yes | Current profile |
| PATCH | `/me` | yes | Update `fullName` |
| PUT | `/me/public-key` | yes | Register the device public key for E2EE chat |
| GET | `/:id` | no | Public profile of a listing owner (no phone number) |

### Listings  `/api/listings`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/` | optional | Browse / search. Query: `q, categoryType, category, minPrice, maxPrice, sort, page, pageSize`, and `mine=true` (auth) |
| GET | `/:id` | no | Single listing |
| POST | `/` | verified | Create — `categoryType(DIGITAL\|PHYSICAL), category, title, description, price, location?` |
| PATCH | `/:id` | verified, owner | Update fields or `status(ACTIVE\|PAUSED\|HIRED)` |
| DELETE | `/:id` | verified, owner | Remove |

See `requests.http` for ready-to-run examples (VS Code REST Client / IntelliJ HTTP).

## Layout

```
prisma/schema.prisma      Users, Listings, Messages, Transactions
src/
  config/env.js           Env parsing + validation
  lib/                     prisma client, jwt, phone normalisation, error types
  middleware/              auth, validation (zod), rate limiting, error handler
  modules/
    auth/                  register, OTP verify, login, SMS provider
    users/                 profile, public-key upload
    listings/              CRUD + search
  app.js / routes.js / index.js
scripts/seed.js           Demo data
```
