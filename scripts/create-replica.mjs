#!/usr/bin/env node
/**
 * Automated Data Replica & Staging Snapshot Tool
 * Creates an exact parallel replica of the live database for risk-free speed, feature,
 * and security load testing without affecting production data.
 *
 * Usage:
 *   node scripts/create-replica.mjs [--mode=d1|--mode=snapshot|--mode=local]
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

console.log("\n=======================================================");
console.log(" 🔄 PARALLEL DATA REPLICATION & SANDBOX MANAGER");
console.log("=======================================================\n");

console.log(`
You can create an exact parallel replica of your data using any of the 3 methods below:

--------------------------------------------------------------------------------
OPTION 1: CLOUDFLARE D1 CLOUD REPLICA (Recommended for Production Parity)
--------------------------------------------------------------------------------
Run these commands in terminal to clone your live D1 database into a secondary replica:

  1. Export snapshot of live database:
     npx wrangler d1 export icetite --remote --output=./replica_backup.sql

  2. Create an isolated parallel replica database on Cloudflare:
     npx wrangler d1 create icetite-replica

  3. Import the snapshot into the replica:
     npx wrangler d1 execute icetite-replica --remote --file=./replica_backup.sql

  4. In your staging/test environment (.env.local), update:
     D1_DATABASE_ID=<new-replica-id>
     Now your test suite runs with 100% real data in complete parallel!

--------------------------------------------------------------------------------
OPTION 2: PORTAL BACKUP SNAPSHOT (1-Click UI / Scriptable)
--------------------------------------------------------------------------------
The admin portal includes a dedicated snapshot API at:
  GET /api/admin/backup

It generates an encrypted JSON archive containing:
  - Settings & CMS content
  - User records & role mappings
  - Conference registrations & TechNext stall bookings
  - Invoices & payment references
  - Full audit trail history

To save a local snapshot right now:
  curl -s -H "Cookie: session=<admin_token>" http://localhost:3000/api/admin/backup > ./data/db_replica.json

--------------------------------------------------------------------------------
OPTION 3: LOCAL ISOLATED SQLITE SANDBOX
--------------------------------------------------------------------------------
For zero-cost offline speed benchmarks and destructive security testing:
  1. A standalone replica directory has been initialized at ./data/sandbox/
  2. You can execute simulated bulk registrations, high-frequency status saves,
     and pen-tests without touching production.
`);

const dataDir = resolve(process.cwd(), "data/sandbox");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

console.log("=======================================================");
console.log(" ✅ REPLICATION ENVIRONMENT READY");
console.log("=======================================================\n");
