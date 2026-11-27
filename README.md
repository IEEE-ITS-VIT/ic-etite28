# ic-ETITE'28 — Conference Website & Unified Portal

Production website and portal for **ic-ETITE'28** (Third International Conference on Emerging Trends in Information Technology and Engineering, VIT Vellore, 10–11 February 2028).

Live URL: [https://ic-etite28.vercel.app](https://ic-etite28.vercel.app)

---

## 1. System Architecture

The ecosystem consists of three federated applications sharing a single Cloudflare D1 database, unified authentication (Single Sign-On), Upstash Redis caching, and an asynchronous audit queue:

| Application | Role | Repository | Default Port | Production Domain |
| :--- | :--- | :--- | :--- | :--- |
| **ic-ETITE'28** (This repo) | Conference Website, Registrations, Invoices, Gateway | `IEEEITSVIT/ic-etite28` | `3000` | `https://ic-etite28.vercel.app` |
| **BOLT 3.0** | Flagship Hackathon, Team Scoring, Rounds, Evaluations | `IEEEITSVIT/BOLT-3.0` | `3001` | `https://bolt-3-0.vercel.app` |
| **TechNext '28** | Technology Expo, Stall Bookings, Industry Showcase | `IEEEITSVIT/TECHNEXT-3.O` | `3002` | `https://technext-3-0.vercel.app` |

### Key Shared Architecture Principles
- **One User Account Across All Sites:** The `users` table is unified. An account created on any of the three websites immediately logs into the other two.
- **Federated Redirection:** Visiting `/hackathon` or `/technext` on the conference domain automatically redirects visitors to the respective portal.
- **Site-Scoped Roles:** Admins can be global or scoped per site using the `site_roles` table. Super-admin `ieeeitsvitscore@gmail.com` retains permanent root authorization.
- **Low-Latency Caching & Events:** Read-heavy portal settings and sessions are cached via Upstash Redis (`lib/cache/redis.ts`). Background audit logs are pushed asynchronously to Upstash QStash/Kafka (`lib/queue/kafka.ts`).

---

## 2. Cloudflare D1 Database & Gateway

All persistent data is stored in a serverless SQLite Cloudflare D1 database (`ieeeitsvit`). Portals access D1 through a zero-latency HTTPS Gateway Worker (`workers/d1-gateway`).

### Database Identifiers
- **Database Name:** `ieeeitsvit` (or `icetite`)
- **Database ID:** `6d59618c-0ce8-4a86-9773-9918c1733e1e`
- **Cloudflare Account ID:** `dfc2c80c18c70fffd6da339251650e04`

### Schema Migrations (`db/migrations/`)
The database schema is managed through versioned SQL migrations:
- `0001_init.sql`: Core users, sessions, events, registrations, settings, and outbox tables.
- `0002_team_name_unique.sql` to `0009_rate_limits.sql`: Team limits, invoices, scoring rounds, and security rate limits.
- `0010_sites.sql`: Multi-portal separation and `site_roles`.
- `0011_visa_letters.sql` & `0012_visa_templates.sql`: Visa invitation letter generation.
- `0013_audit_logs.sql`: Security audit logging and change tracking.
- `0014_invoice_templates.sql`: Dynamic invoice generation templates.
- `0015_performance_indexes.sql`: Composite performance indexes for sessions, registrations, bookings, and invoices.

To execute all migrations against the remote Cloudflare D1 database:
```bash
for file in db/migrations/*.sql; do
  npx wrangler d1 execute ieeeitsvit --remote --file="$file"
done
```

### Deploying the D1 Gateway Worker (`workers/d1-gateway`)
The gateway translates HTTP POST requests into prepared SQL statements:
```bash
cd workers/d1-gateway
npm install
npx wrangler secret put GATEWAY_SECRET   # Enter your secure random secret
npx wrangler deploy
```
Copy the published worker URL (e.g., `https://icetite-d1-gateway.<subdomain>.workers.dev`) and set it as `D1_GATEWAY_URL` in your `.env.local` / deployment settings.

---

## 3. Backups, Recovery & Read Replicas

### Automated Cloudflare Time Travel (Point-in-Time Recovery)
Cloudflare D1 automatically captures Continuous Point-in-Time backups (retained for 30 days).
```bash
# View backup bookmarks and timeline
./scripts/d1-backup-restore.sh info ieeeitsvit

# Restore database to any point in time (RFC3339 format)
./scripts/d1-backup-restore.sh timetravel 2026-11-28T00:00:00Z ieeeitsvit
```

### Manual & Automated SQL Snapshots
Full remote schema and data exports can be generated and restored using the provided backup utility:
```bash
# Create an encrypted SQL snapshot in ./backups/
./scripts/d1-backup-restore.sh backup ieeeitsvit

# Restore an existing SQL snapshot to the database
./scripts/d1-backup-restore.sh restore ./backups/d1_ieeeitsvit_20261128_000000.sql ieeeitsvit
```

### Parallel Sandbox / Replica Creation
To spin up a separate sandbox replica database for high-load benchmarking or security tests without touching production:
```bash
./scripts/d1-backup-restore.sh replica-create ieeeitsvit-staging ieeeitsvit
```

### In-App Portal Backup
Administrators can download live JSON or SQL dumps directly from the running portal:
- Endpoint: `GET /api/admin/backup?format=sql` or `GET /api/admin/backup?format=json`
- Access: Restricted to authenticated administrators.

### Global Read Replicas
Cloudflare D1 supports automatic read replication. In `workers/d1-gateway/wrangler.toml`, read replication is enabled so read queries are served from edge nodes closest to the user while mutations route to the primary database.

---

## 4. Redis Caching & Queue Integration

### Cache Structure (`lib/cache/redis.ts`)
The portal integrates with Upstash Redis via HTTP REST protocol (avoiding serverless TCP connection pooling issues). If environment variables are absent, an in-memory TTL cache acts as an automatic fallback.

- **Settings (`settings:${SITE}`):** TTL 600s. Invalidated immediately upon any change in Admin Settings.
- **Sessions (`sess:${hash}`):** TTL 45s. Invalidated immediately upon logout or password reset.

### Event Streaming (`lib/queue/kafka.ts`)
Audit events, login telemetry, and payment reconciliation events are pushed to Upstash QStash / Kafka topic `portal-audit-events` without blocking HTTP user transactions.

---

## 5. Deployment Guide (Deploy Anywhere)

### Option A: Vercel Serverless (Recommended Cloud Deployment)
1. Import repository into Vercel.
2. In **Settings -> Environment Variables**, configure all variables from Section 6.
3. In **Integrations**, connect the **Upstash** integration to automatically populate Redis and QStash credentials.
4. Deploy the project.

### Option B: Docker / Container Deployment (Any VPS / Cloud Server)
Each repository contains a production-ready, multi-stage `Dockerfile` and `docker-compose.yml`.

```bash
# 1. Clone the repository on your server
git clone https://github.com/IEEEITSVIT/ic-etite28.git
cd ic-etite28

# 2. Create your production environment file
cp .env.example .env.local
nano .env.local

# 3. Build and launch with Docker Compose
docker compose up -d --build
```
The application will launch on port `3000` inside an isolated Linux container with standalone output optimization.

### Option C: PM2 / Direct Node.js on a Linux Server
```bash
# 1. Install Node.js 20+ and PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# 2. Build standalone output
export STANDALONE=true
npm ci
npm run build

# 3. Run standalone server via PM2
pm2 start .next/standalone/server.js --name "icetite-portal" -- -p 3000
pm2 save
pm2 startup
```

### Nginx Reverse Proxy with HTTPS SSL (Certbot)
Place this configuration at `/etc/nginx/sites-available/icetite`:
```nginx
server {
    server_name icetite.itsvit.ac.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Obtain SSL certificate:
```bash
sudo certbot --nginx -d icetite.itsvit.ac.in
```

---

## 6. Complete Environment Variables Catalog

| Variable | Required | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `D1_GATEWAY_URL` | Yes | HTTPS endpoint of the Cloudflare D1 Gateway Worker | `https://icetite-d1-gateway.workers.dev` |
| `D1_GATEWAY_SECRET` | Yes | Shared authorization secret between Next.js and D1 Worker | `64-char-random-secret` |
| `SESSION_SECRET` | Yes | 32+ character key for encrypting sessions and SMTP configs | `min-32-character-random-hex-key` |
| `NEXT_PUBLIC_SITE_URL` | Yes | Base URL of this portal | `https://ic-etite28.vercel.app` |
| `NEXT_PUBLIC_BOLT_URL` | Yes | Base URL of the BOLT 3.0 hackathon website | `https://bolt-3-0.vercel.app` |
| `NEXT_PUBLIC_TECHNEXT_URL`| Yes | Base URL of the TechNext '28 expo website | `https://technext-3-0.vercel.app` |
| `ADMIN_EMAILS` | No | Comma-separated emails automatically granted Admin role | `ieeeitsvitscore@gmail.com` |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis REST URL for sub-millisecond caching | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN`| Optional | Upstash Redis REST Bearer Token | `AX...` |
| `UPSTASH_KAFKA_REST_URL` | Optional | Upstash QStash / Kafka REST URL for async audit trail | `https://qstash.upstash.io` |
| `UPSTASH_KAFKA_REST_USERNAME` | Optional | Kafka / QStash Client Username | `user_...` |
| `UPSTASH_KAFKA_REST_PASSWORD` | Optional | Kafka / QStash Client Password | `pass_...` |
| `CRON_SECRET` | Yes | Bearer token authenticating Vercel / external cron triggers | `cron-random-secret` |
| `SMTP_HOST` | Optional | Fallback SMTP host (can also be configured in Admin CMS) | `smtp.gmail.com` |
| `SMTP_PORT` | Optional | Fallback SMTP port | `465` |
| `SMTP_USER` | Optional | Fallback SMTP username / email address | `ieeeitsvitscore@gmail.com` |
| `SMTP_PASS` | Optional | Fallback SMTP password or Google App Password | `xxxx xxxx xxxx xxxx` |

---

## 7. Security, Failover & Administration

- **Default Root Administrator:** `ieeeitsvitscore@gmail.com` is permanently protected in code from demotion or deletion.
- **Refund Protection:** Refunds cannot be executed without entering the dedicated refund authorization password, which is stored securely as a cryptographic hash in D1 and configurable only by `ieeeitsvitscore@gmail.com`.
- **Payment Immutability:** Once a payment transaction is reconciled via payment webhooks/APIs, its status is locked against manual tampering.
- **Database Connection Failure Resilience:** If the database gateway experiences transient connectivity drops, portals display an informative status alert and automatically retry with exponential backoff rather than crashing.
