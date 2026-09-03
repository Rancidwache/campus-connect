# Campus Connect V2 — System Architecture

This note tracks the architecture described in Chapter 3 of the proposal and how the
codebase realises it, phase by phase.

## Three-tier structure

1. **Client tier** — a React Progressive Web App (`web/`). Mobile-first and installable.
   The proposal's native mobile app is deferred; the PWA is the "companion responsive
   website" serving as the mobile surface until then.
2. **Application tier** — a Node/Express REST API (`server/`), organised into five
   functional modules: Auth & Profiles, Listings & Discovery, HustleGuard Escrow,
   Secure Messaging, Notifications.
3. **Data tier** — PostgreSQL, accessed through Prisma. Four primary entities: Users,
   Listings, Messages, Transactions (see `data-model.md`).

## Edge: WAF + Kong API Gateway

In production the API sits behind a native Web Application Firewall and a Kong API
Gateway, so only clean, authenticated traffic reaches the backend. That is a
**deployment concern**, not application code. The application supports it by:

- Emitting standard security headers (`helmet`).
- Enforcing per-IP rate limits on auth and write endpoints (`express-rate-limit`) —
  a backstop even when the gateway also rate-limits.
- Trusting `X-Forwarded-*` headers only when `TRUST_PROXY=1`, so client IPs are read
  correctly when Kong terminates TLS.
- Keeping all configuration in environment variables (12-factor), so the same image
  runs locally and behind the gateway.

A `kong/` declarative config and a `docker-compose` edge stack will be added in the
deployment phase.

## Service isolation

Sensitive flows — the escrow ledger, M-Pesa webhooks, and chat routing — are separate
modules with their own routers and services. They share the database but not code
paths with the public listings service, so a fault in one does not directly compromise
the others. When traffic justifies it, the escrow and messaging modules can be split
into their own deployables without changing their internal interfaces.

## Security architecture (Auth phase)

- Every account is tied to a **phone number verified by an SMS OTP**. This same
  verification is the identity check Daraja needs before it can STK-Push or B2C on a
  user's behalf, so it is done once, up front.
- Passwords are hashed with bcrypt. OTP codes are hashed at rest, single-use, expiring,
  and attempt-limited.
- Auth uses short-lived JWT access tokens.
- The **public key** each client generates for end-to-end encrypted chat is uploaded
  and stored on the user record. Private keys never leave the device. The server only
  ever relays ciphertext (`Message.encryptedPayload`).

## Payment & escrow architecture (Month 2 — planned)

`HustleGuard` integrates directly with the Safaricom Daraja API:

1. Client hires a listing → system computes `gig fee + deposit` → **STK Push**.
2. Safaricom confirms via webhook → `Transaction.escrowStatus = HELD` → provider notified.
3. Client taps **Approve Delivery** → **B2C** call releases funds to the provider's phone
   → `escrowStatus = RELEASED`.

Neither party trusts the other; both trust the escrow mechanism. Sequence diagram:
proposal Figure 4.5.

## Real-time layer (Month 3 — planned)

A WebSocket layer (Socket.IO) carries encrypted chat payloads and push notifications
for payment confirmation, new messages, and delivery approval.
