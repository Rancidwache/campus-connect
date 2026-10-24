# Campus Connect V2

A secure marketplace platform for skills, gigs and equipment hire, built for Kenyan Gen Z
users. It combines a Fiverr-style gig-posting model with a Craigslist-style classifieds
format, and adds a local trust layer: **HustleGuard** M-Pesa escrow (Daraja STK Push + B2C)
and end-to-end encrypted chat.

> ACS 400 Computer Project — Daystar University
> Student: 22-1661, Edgar Echwa Lochodo

## Status

Built Agile, in monthly increments (see proposal section 1.6):

| Module | Objective | State |
| --- | --- | --- |
| 1. User Authentication & Profiles | Month 1 | **Done** — registration, OTP phone verification, public-key setup |
| 1. Listings & Discovery | Month 1 | **Done** — post / browse / search digital & physical listings |
| 2. HustleGuard Escrow & Payments | Month 2 | **Done** — M-Pesa STK Push deposit → escrow → B2C payout / refund (mock + sandbox + production modes) |
| 3. Secure Messaging (E2EE) | Month 3 | **Done** — ECDH key exchange + AES-GCM in the browser; server is a blind relay; Socket.IO for live delivery |
| 4. Notifications | Month 3 | In-app notifications + Socket.IO real-time push; **done** |

### Marketplace features (post-MVP)

| Feature | State |
| --- | --- |
| Listing photos (≤5) + one short video | **Done** — object storage (local disk / Supabase Storage) |
| Rich profiles — avatar, bio, social links, public profile page | **Done** |
| Ratings & reviews (threaded, liked, role-badged) | **Done** — star rating gated to completed orders; open replies + likes; Provider/Customer/Visitor badges |
| Browse filters, categories, saved listings | **Done** — price/location filters, curated category chips with counts, favourite ♥ + a Saved page |
| Community guidelines + reporting | **Done** — a Guidelines page, Report on listings/reviews/replies/users, and a moderator queue (`/admin/reports`) |

### Objective 4 — testing & deployment

| Item | State |
| --- | --- |
| Automated test suite | **Done** — 57 tests (Vitest): unit + HTTP integration against in-memory PGlite. CI on every push/PR. See `server/README.md` → Tests |
| Kong API gateway + WAF edge stack | **Done** — `deploy/docker-compose.yml`: nginx (PWA) → OWASP ModSecurity CRS → Kong (DB-less) → API, M-Pesa callbacks locked to Safaricom IPs. See `docs/deploy.md` |
| Deploy (PWA + API + Supabase) | Next — run the edge stack on a host with TLS |

## Architecture (this phase)

```
React PWA (web)  ──HTTPS/REST──►  Node/Express API  ──►  PostgreSQL
     mobile-first, installable   ──WebSocket (Socket.IO)──►  (chat + notifications)
                                       behind Kong API Gateway + WAF
                                       (deployment concern — see docs/architecture.md)
```

Chat is end-to-end encrypted **on the client** (ECDH P-256 → HKDF → AES-GCM). The
API only ever stores and relays the ciphertext string.

The native mobile app is deferred; the responsive PWA covers mobile for now.

## Repository layout

```
server/   Node + Express + Prisma REST API
web/      React + Vite Progressive Web App
docs/     Architecture and data-model notes
```

## Quick start

Prerequisites: Node 20+, and PostgreSQL 14+ (a Docker one-liner is in `server/README.md`).

```bash
# 1. API
cd server
cp .env.example .env          # then edit DATABASE_URL / JWT_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev                   # http://localhost:4000

# 2. Web (in a second terminal)
cd web
npm install
npm run dev                   # http://localhost:5173
```

See `server/README.md` and `docs/` for detail.

## Keeping secrets out of git

- Real keys and passwords live only in `server/.env` (and `deploy/.env`), which are git-ignored. Only the `*.env.example` templates are committed, with placeholders.
- A pre-commit hook (`scripts/git-hooks/pre-commit`, runs `scripts/check-secrets.mjs`) blocks any commit containing an env file, a private key, a known key format (JWT/service keys, AWS, Stripe, GitHub, Google), a database URL with a real password, or a value copied from your local `.env`. On a fresh clone, enable it with `git config core.hooksPath scripts/git-hooks`.
- Scan everything tracked at any time with `node scripts/check-secrets.mjs --all`.
- Before going live, replace the development defaults (`MPESA_CALLBACK_SECRET`, `JWT_SECRET`) with long random values, and never reuse the sandbox Daraja credentials in production.
