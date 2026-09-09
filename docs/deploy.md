# Deployment — WAF + API gateway edge

Realises the security architecture from proposal §3.2.4 / §4.0: *"All traffic will
be routed through the native Web Application Firewall and Kong API Gateway before
it reaches any backend service."*

```
Internet
  │
  ▼  http://<host>:8080
┌─────────┐   serves the installable PWA;
│  web    │   forwards /api  /uploads  /socket.io  ─────┐
│ (nginx) │                                             │
└─────────┘                                             ▼
                                              ┌───────────────────┐
                                              │  waf              │  OWASP ModSecurity
                                              │  ModSecurity CRS  │  Core Rule Set
                                              └─────────┬─────────┘  (SQLi, XSS, RCE,
                                                        │             path traversal,
                                                        ▼             scanners…)
                                              ┌───────────────────┐
                                              │  gateway (Kong)   │  rate limiting,
                                              │  DB-less          │  payload caps, CORS,
                                              └─────────┬─────────┘  M-Pesa IP allow-list
                                                        │
                                                        ▼
                                              ┌───────────────────┐
                                              │  api (Node)       │ ──► Supabase Postgres
                                              └───────────────────┘     Supabase Storage
```

Nothing reaches `api` except through `web → waf → gateway`. The API also keeps its
own defences (helmet, `express-rate-limit`, zod validation, the callback-secret
path segment) so it is not naked if run without the edge.

## Run the whole stack locally

Needs Docker with Compose v2.

```bash
cp deploy/.env.example deploy/.env
#   → set DATABASE_URL, DIRECT_URL, JWT_SECRET, MPESA_CALLBACK_SECRET
#   → MPESA_MODE=mock is fine for a first run
#   → STORAGE_DRIVER=supabase needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
#     or set STORAGE_DRIVER=local to keep uploads on the api container

docker compose --env-file deploy/.env -f deploy/docker-compose.yml up --build
```

Open **http://localhost:8080**. The `api` container runs `prisma migrate deploy`
on start (set `RUN_MIGRATIONS=0` to skip).

### What each layer does

| Service | Image | Role |
| --- | --- | --- |
| `web` | `nginx:1.27-alpine` (+ built PWA) | Public entrypoint. Serves the PWA; proxies API/upload/WebSocket traffic to the WAF. |
| `waf` | `owasp/modsecurity-crs:nginx` | OWASP CRS at paranoia 1, anomaly threshold 5. `MODSEC_RULE_ENGINE=DetectionOnly` logs without blocking while you tune. |
| `gateway` | `kong:3.7` (DB-less) | `deploy/kong/kong.yml`: 600 req/min/IP on the API, 60 MB payload cap (room for the listing video), CORS, and a **separate route for `/api/mpesa/*` restricted to Safaricom's Daraja IP ranges** + a 1 MB cap. |
| `api` | built from `server/` | The Express app. `TRUST_PROXY=1` so client IPs and `X-Forwarded-Proto` are read from the edge. |

## Going to a real host

- **DNS + TLS** terminate at `web` (add a `certbot`/`Caddy` sidecar, or run the
  stack behind a cloud load balancer that does TLS).
- Set `PUBLIC_URL=https://your-domain` in `deploy/.env` — it drives `CORS_ORIGIN`
  and `SELF_BASE_URL` (the base for M-Pesa callback URLs).
- For **real M-Pesa**: `MPESA_MODE=sandbox` (or `production`) and fill the Daraja
  credentials. Safaricom must be able to reach `https://your-domain/api/mpesa/*`.
- Tighten `kong.yml` CORS `origins` to your web origin, and flip
  `MODSEC_RULE_ENGINE=On` once the CRS logs are clean for your traffic.
- The database and media storage stay on Supabase — nothing to host there.

## Split deployment (no single VM)

Each piece is independent: host `api` on Fly.io / Render, put a managed Kong or an
API-gateway product in front, deploy the PWA (`web/` build output) to Netlify /
Vercel / Cloudflare Pages, and point the PWA at the gateway URL. The
`docker-compose.yml` is the reference wiring.
