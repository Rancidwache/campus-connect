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

- **Supabase (hosted Postgres):** from Project Settings → Database → Connection string,
  set `DATABASE_URL` to the transaction pooler URI (port `6543`) with
  `?pgbouncer=true&connection_limit=5`, and `DIRECT_URL` to the direct/session URI
  (port `5432`). Then run the migrate + seed steps below as normal.
- **Your own connection string:** edit `DATABASE_URL` (and `DIRECT_URL`) in `.env`.

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
| `MPESA_MODE` | `mock` (default — simulates STK/B2C callbacks, no network), `sandbox`, or `production` |
| `PLATFORM_FEE_RATE` | Commission added on top of the listing price (`0.10` = 10%) |
| `MPESA_CALLBACK_SECRET` | Unguessable path segment on the webhook routes |
| `SELF_BASE_URL` | Public URL of this API (for callback URLs; ngrok in sandbox) |
| `MPESA_CONSUMER_KEY` … `MPESA_SECURITY_CREDENTIAL` | Daraja creds — only for `sandbox` / `production` |

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
| PATCH | `/me` | yes | Update `fullName`, `bio`, `socials` (normalised to URLs) |
| PUT | `/me/public-key` | yes | Register the device public key for E2EE chat |
| POST | `/me/avatar` | yes | Upload a profile photo (multipart `avatar`) |
| DELETE | `/me/avatar` | yes | Remove the profile photo |
| GET | `/:id` | no | Public profile (no phone) + `activeListingCount` |
| GET | `/:id/listings` | no | That user's active listings (paginated) |

### Listings  `/api/listings`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/` | optional | Browse / search. Query: `q, categoryType, category, minPrice, maxPrice, sort, page, pageSize`, and `mine=true` (auth) |
| GET | `/:id` | no | Single listing |
| POST | `/` | verified | Create — `categoryType(DIGITAL\|PHYSICAL), category, title, description, price, location?` |
| PATCH | `/:id` | verified, owner | Update fields or `status(ACTIVE\|PAUSED\|HIRED)` |
| DELETE | `/:id` | verified, owner | Remove (also deletes its media) |
| POST | `/:id/images` | verified, owner | Upload photos (multipart `images`, ≤5 total) |
| POST | `/:id/video` | verified, owner | Set/replace the short video (multipart `video`) |
| DELETE | `/:id/media/:mediaId` | verified, owner | Remove one image or the video |

Listing responses carry `images: [{id,url,position}]` and `video: {id,url}`.

**Storage** — `STORAGE_DRIVER=local` (default) writes to `server/uploads/`, served
at `/uploads`. `STORAGE_DRIVER=supabase` uploads to a public Supabase Storage
bucket and needs `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server-only secret).

### Escrow — HustleGuard  `/api/transactions`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/quote?listingId=` | yes | Fee + platform-fee + total breakdown |
| POST | `/` | verified | Hire a listing — `{ listingId, phone? }`. Opens escrow, fires the STK Push |
| GET | `/` | yes | Your orders. Query: `role=client\|provider\|all`, `status`, `page`, `pageSize` |
| GET | `/:id` | participant | One order with full escrow state |
| POST | `/:id/approve` | client | Approve delivery → B2C payout to the provider |
| POST | `/:id/decline` | provider | Decline the job → B2C refund to the client |
| POST | `/:id/cancel` | client | Cancel before payment completes |

### M-Pesa webhooks (called by Safaricom)  `/api/mpesa`

`POST /stk-callback/:secret`, `POST /b2c/result/:secret`, `POST /b2c/timeout/:secret`
— `:secret` must equal `MPESA_CALLBACK_SECRET`. In `mock` mode the built-in
simulator calls these itself after `MPESA_MOCK_DELAY_MS`. A client phone ending
`0000` simulates a cancelled STK Push.

### Notifications  `/api/notifications`

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/` | yes | Recent notifications + `unreadCount` |
| POST | `/read` | yes | Mark read — `{ ids? }` (omit to mark all) |

### Messages — E2EE chat  `/api/messages`

The server is a blind relay: `encryptedPayload` is opaque `v1.<iv>.<ciphertext>`
produced on the client (ECDH P-256 → HKDF → AES-GCM). Both users must have a
`publicKey` set (`PUT /api/users/me/public-key`).

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/threads` | yes | Conversation list — peer, unread count, last message |
| GET | `/thread/:userId` | yes | Messages with a user (`?before=&limit=`); marks received ones delivered |
| POST | `/` | verified | Send — `{ toUserId, encryptedPayload }` |
| POST | `/delivered` | yes | Ack messages — `{ messageIds: [] }` |
| GET | `/unread-count` | yes | `{ unread }` |

### Reviews  `/api/reviews`

Star ratings come from the client of a completed (`RELEASED`/`REFUNDED`) order —
one review per order, about the provider. Replies and likes are open to any
signed-in user. Each author in a thread carries a role: `PROVIDER` /
`CUSTOMER` (has transacted with the provider) / `VISITOR`.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/provider/:providerId` | optional | Summary (`average`, `count`, `distribution`) + review threads; `likedByMe`/`mine` when signed in |
| GET | `/pending` | yes | Orders the user can still review |
| POST | `/` | verified | `{ transactionId, rating(1-5), body }` |
| PATCH | `/:id` | author | `{ rating?, body? }` |
| DELETE | `/:id` | author | |
| POST | `/:id/replies` | yes | `{ body, parentReplyId? }` |
| DELETE | `/replies/:replyId` | author | |
| POST | `/:id/like` · `/replies/:replyId/like` | yes | Toggle → `{ liked, likeCount }` |

`User.ratingAvg` / `ratingCount` are recomputed on every change and surface on
`GET /users/:id` and on `listing.owner`.

### Real-time  (Socket.IO, same origin/port)

Connect with `io(url, { auth: { token } })` — same JWT as REST. Server emits to the
authenticated user: `message:new`, `message:sent`, `message:delivered`,
`notification:new`. Client may emit `thread:open { withUserId }`.

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
