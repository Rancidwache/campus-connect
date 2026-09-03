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
  api/client.js          fetch wrapper + token storage + ApiError
  context/AuthContext.jsx session state (token in localStorage)
  lib/e2ee.js             in-browser ECDH keypair for encrypted chat (Module 1 setup)
  theme/tokens.css        the shared design system (colours, spacing, components)
  components/             Layout, ListingCard, ProtectedRoute
  pages/
    Landing, Register, VerifyOtp, Login
    Browse, ListingDetail, ListingForm (create/edit), Dashboard, Profile
```

## What works now (Modules 1–2)

- Register → SMS OTP verify → signed in (JWT).
- Profile editing and **encrypted-chat key setup** (private key kept on device).
- Browse / search / filter / sort / paginate listings (public).
- Create, edit, pause and delete your own listings (verified users).
- **Hire & pay to escrow** — fee breakdown, M-Pesa STK Push, then an order page
  that polls the escrow status through `Funds Secured → Released`.
- **Orders** — buyer / seller views with escrow-status badges; **Approve delivery**
  (client) and **Decline & refund** (provider).
- **Alerts** — in-app notifications with an unread count in the nav.

Extra pages: `Orders`, `OrderDetail`, `Notifications`. Components: `EscrowBadge`.
Context: `NotificationsContext` (polls every 25s).
