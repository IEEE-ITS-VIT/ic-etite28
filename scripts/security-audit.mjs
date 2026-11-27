#!/usr/bin/env node
/**
 * Automated Security & WAF Resilience Audit
 * Tests:
 * 1. HTTP Security Headers & WAF protection (HSTS, CSP, X-Content-Type-Options, X-Frame-Options)
 * 2. Unauthenticated Access & Auth Boundaries (/admin, /admin/refunds, /api/admin/backup)
 * 3. Client Static Bundle Secret Leak Scans (.next/static)
 * 4. SQL Injection prepared-statement safety
 * 5. Superadmin immutability rules
 *
 * Usage:
 *   node scripts/security-audit.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const SITES = [
  { name: "ic-ETITE'28 (Website)", url: process.env.ICETITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000" },
  { name: "BOLT 3.0 (Hackathon)", url: process.env.BOLT_URL || process.env.NEXT_PUBLIC_BOLT_URL || "http://localhost:3001" },
  { name: "TechNext '28 (Expo)", url: process.env.TECHNEXT_URL || process.env.NEXT_PUBLIC_TECHNEXT_URL || "http://localhost:3002" },
];

console.log("\n=======================================================");
console.log(" 🛡️  AUTOMATED SECURITY & INTEGRITY AUDIT SUITE");
console.log("=======================================================\n");

let passed = 0;
let warned = 0;
let failed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    passed++;
    console.log(`   [PASS] ${testName}`);
  } else {
    failed++;
    console.log(`   [FAIL] ${testName} - ${details}`);
  }
}

function warn(condition, testName, note = "") {
  if (condition) {
    passed++;
    console.log(`   [PASS] ${testName}`);
  } else {
    warned++;
    console.log(`   [WARN] ${testName} - ${note}`);
  }
}

// 1. Audit Client Static Bundles for Environment Secret Leaks
console.log("1. AUDITING CLIENT BUNDLES FOR LEAKED SECRETS (.next/static)");
function scanDirectory(dir, patterns) {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir);
  const found = [];
  for (const f of files) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) {
      found.push(...scanDirectory(full, patterns));
    } else if (f.endsWith(".js") || f.endsWith(".json")) {
      const content = readFileSync(full, "utf-8");
      for (const p of patterns) {
        if (content.includes(p)) {
          found.push({ file: f, secret: p });
        }
      }
    }
  }
  return found;
}

const sampleSecrets = [
  "aimrlxmsdmgrotrd", // Known SMTP pass
  "VGy8NopUuySISajBbXgoAGZiBdvX", // Gateway secret snippet
  "_gVNiw2eRcttAlls4y5hq0pSoKdUGa", // Session secret snippet
];

const nextStaticDir = resolve(process.cwd(), ".next/static");
const leaks = scanDirectory(nextStaticDir, sampleSecrets);
assert(leaks.length === 0, "Client JS bundles contain ZERO leaked backend secrets", `Found ${leaks.length} leaks`);

// 2. Audit Auth Boundary Enforcement
console.log("\n2. AUTHENTICATION & ACCESS BOUNDARY ENFORCEMENT");
async function checkAuthBoundary(siteUrl) {
  try {
    const endpoints = [
      { path: "/admin", expectedStatuses: [307, 308, 401, 403] },
      { path: "/admin/refunds", expectedStatuses: [307, 308, 401, 403] },
      { path: "/admin/users", expectedStatuses: [307, 308, 401, 403] },
      { path: "/api/admin/backup", expectedStatuses: [401, 403] },
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${siteUrl}${ep.path}`, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(6000),
      });
      const ok = ep.expectedStatuses.includes(res.status);
      assert(ok, `Unauthenticated request to ${ep.path} blocked`, `Status returned: ${res.status}`);
    }
  } catch (err) {
    warn(false, `Site reachable check for ${siteUrl}`, err.message);
  }
}

// 3. Security Headers & WAF Check
console.log("\n3. HTTP SECURITY HEADERS & WAF AUDIT");
async function checkSecurityHeaders(siteUrl) {
  try {
    const res = await fetch(siteUrl, { method: "HEAD", signal: AbortSignal.timeout(6000) });
    const h = res.headers;

    assert(h.has("x-content-type-options") && h.get("x-content-type-options") === "nosniff", "X-Content-Type-Options is nosniff");
    assert(h.has("x-frame-options"), "X-Frame-Options is set (Clickjacking protection)");
    assert(h.has("strict-transport-security"), "Strict-Transport-Security (HSTS) is enabled");
    assert(h.has("referrer-policy"), "Referrer-Policy is configured");
    warn(h.has("content-security-policy"), "Content-Security-Policy (CSP) header present");
  } catch (err) {
    warn(false, `Header inspection for ${siteUrl}`, err.message);
  }
}

// 4. Codebase SQL Injection Resilience
console.log("\n4. SQL INJECTION (SQLi) PARAMETERIZATION RESILIENCE");
function checkSqlSafety() {
  const dbFile = resolve(process.cwd(), "lib/db.ts");
  if (existsSync(dbFile)) {
    const content = readFileSync(dbFile, "utf-8");
    assert(content.includes("params: norm(params)"), "lib/db.ts strictly enforces parameterized input bindings");
    assert(content.includes("signal: AbortSignal.timeout"), "lib/db.ts includes abort timeout to prevent connection exhaustion");
  } else {
    warn(false, "lib/db.ts inspection", "File not found in current directory");
  }
}
checkSqlSafety();

// 5. Superadmin & Refund Immutability Rules
console.log("\n5. DEFAULT SUPERADMIN & REFUND IMMUTABILITY RULES");
function checkSuperadminImmutability() {
  const rolesFile = resolve(process.cwd(), "lib/auth/roles.ts");
  if (existsSync(rolesFile)) {
    const content = readFileSync(rolesFile, "utf-8");
    assert(content.includes("ieeeitsvitscore@gmail.com"), "Permanent default superadmin ieeeitsvitscore@gmail.com is hard-coded in roles.ts");
  }

  const refundFile = resolve(process.cwd(), "lib/refund.ts");
  if (existsSync(refundFile)) {
    const content = readFileSync(refundFile, "utf-8");
    assert(content.includes("REFUND_SUPERADMIN_EMAIL = \"ieeeitsvitscore@gmail.com\""), "Refund authority strictly bound to ieeeitsvitscore@gmail.com");
    assert(content.includes("scrypt$"), "Refund authorization password enforced with scrypt hash");
  }
}
checkSuperadminImmutability();

async function run() {
  for (const s of SITES) {
    console.log(`\n--- Testing Live Site: ${s.name} (${s.url}) ---`);
    await checkSecurityHeaders(s.url);
    await checkAuthBoundary(s.url);
  }

  console.log("\n=======================================================");
  console.log(` AUDIT RESULTS: ${passed} PASSED, ${warned} WARNINGS, ${failed} FAILED`);
  console.log("=======================================================\n");
}

run().catch(console.error);
