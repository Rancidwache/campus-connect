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
| 3. Secure Messaging (E2EE) | Month 3 | Schema in place; endpoints pending |
| 4. Notifications | Month 3 | In-app notifications live (Module 2); real-time push pending |

## Architecture (this phase)

```
React PWA (web)  ──HTTPS/REST──►  Node/Express API  ──►  PostgreSQL
     mobile-first, installable         behind Kong API Gateway + WAF
                                       (deployment concern — see docs/architecture.md)
```

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
