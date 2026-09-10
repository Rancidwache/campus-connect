# Campus Connect V2 — Web (PWA)

React + Vite. Installable, mobile-first. Talks to the API at `/api` (proxied to
`http://localhost:4000` in development — see `vite.config.js`).

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
```

Run the API (`../server`) alongside it.

## Build

```bash
npm run build      # -> dist/
npm run preview
```

`vite-plugin-pwa` emits the service worker and web manifest on build. Provide real
`public/pwa-192.png` and `public/pwa-512.png` icons before shipping — a placeholder
`favicon.svg` is included for development.

## Structure

```
src/
  api/client.js            fetch wrapper + token storage + ApiError
  context/                 Auth, Realtime (socket), Notifications, Chat, Theme, Toast
  lib/e2ee.js              in-browser ECDH keypair for encrypted chat
  theme/tokens.css         design tokens — dual light/dark palette, type, motion
  theme/components.css     buttons, cards, inputs, badges, chips, skeleton, toast
  components/
    motion.jsx             PageTransition / Stagger / FadeIn / Pop (framer-motion)
    Modal, Skeleton, ThemeToggle, AuthShell, Avatar, ...
  pages/                   Landing, auth, Browse, ListingDetail, Orders, ...
```

### Design system

- **Dual theme** — `ThemeProvider` cycles light → dark → system; `data-theme`
  on `<html>`, OS fallback via `prefers-color-scheme`. Pre-paint script in
  `index.html` avoids a flash. All colours are semantic CSS variables so both
  themes come from one set of rules.
- **Motion** — framer-motion under `<MotionConfig reducedMotion="user">`: page
  transitions, list stagger, an animated escrow stepper, the favourite heart,
  toasts. Everything degrades under `prefers-reduced-motion`.
- **Type** — Inter Variable (`@fontsource-variable/inter`, bundled/offline).

## What works now (Modules 1–3)

- Register → SMS OTP verify → signed in (JWT).
- Profile editing and **encrypted-chat key setup** (ECDH key pair; private key
  kept on device).
- Browse / search / filter / sort / paginate listings (public).
- Create, edit, pause and delete your own listings (verified users).
- **Hire & pay to escrow** — fee breakdown, M-Pesa STK Push, then an order page
  that polls the escrow status through `Funds Secured → Released`.
- **Orders** — buyer / seller views with escrow-status badges; **Approve delivery**
  (client) and **Decline & refund** (provider).
- **Chat** — end-to-end encrypted threads (`lib/e2ee.js`: ECDH → HKDF → AES-GCM).
  Live delivery over Socket.IO; message the provider from a listing or an order.
- **Alerts** — notifications, pushed instantly over the socket (25 s poll fallback).
- **Media** — listing photo galleries + short video; drag-free uploader on the
  edit screen; cover thumbnails in Browse.
- **Profiles** — avatar, bio and social links; a public profile page at `/u/:id`
  linked from listing owners, orders and chat.
- **Reviews** — a summary (average + distribution bars) and threaded review list
  on every provider profile and listing page. Star ratings from people who
  completed an order; replies + likes for everyone; Provider/Customer/Visitor
  badges. "Leave a review" from a completed order.
- **Browse & discovery** — curated category chips (with live counts), price-range
  and location filters, "Clear filters"; a ♥ on every card and listing page, and
  a **Saved** page.
- **Guidelines & reporting** — a `/guidelines` page (footer link); a Report dialog
  on listings, reviews, replies and profiles; a moderator queue at `/admin/reports`
  (nav link shown only to `isAdmin` users) with status tabs and content removal.

Pages: `Orders`, `OrderDetail`, `Messages`, `Thread`, `Notifications`,
`PublicProfile`. Components: `EscrowBadge`, `Avatar`, `SocialLinks`,
`ListingMediaManager`, `Stars`, `RoleBadge`, `ReviewsSection`. Contexts:
`RealtimeProvider` (Socket.IO), `NotificationsProvider`, `ChatProvider`.
