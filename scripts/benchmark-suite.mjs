#!/usr/bin/env node
/**
 * Universal Speed & Latency Benchmark Suite
 * Measures D1 query latency, scrypt security compute time, and endpoint response times across all 3 portals.
 *
 * Usage:
 *   node scripts/benchmark-suite.mjs
 */

import { performance } from "node:perf_hooks";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { scryptSync, randomBytes } from "node:crypto";

// Load environment variables from .env.local if present
function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv();

const GATEWAY_URL = process.env.D1_GATEWAY_URL?.replace(/\/+$/, "") || "http://127.0.0.1:8788";
const GATEWAY_SECRET = process.env.D1_GATEWAY_SECRET || "";

const SITES = [
  { name: "ic-ETITE'28 (Website)", url: process.env.ICETITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000" },
  { name: "BOLT 3.0 (Hackathon)", url: process.env.BOLT_URL || process.env.NEXT_PUBLIC_BOLT_URL || "http://localhost:3001" },
  { name: "TechNext '28 (Expo)", url: process.env.TECHNEXT_URL || process.env.NEXT_PUBLIC_TECHNEXT_URL || "http://localhost:3002" },
];

console.log("\n=======================================================");
console.log(" 🚀 PERFORMANCE & SPEED BENCHMARK SUITE");
console.log("=======================================================\n");

async function queryD1(sql, params = []) {
  const start = performance.now();
  const res = await fetch(`${GATEWAY_URL}/query`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${GATEWAY_SECRET}`,
    },
    body: JSON.stringify({ sql, params }),
    signal: AbortSignal.timeout(10000),
  });
  const elapsed = Math.round(performance.now() - start);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return { elapsed, count: data.results?.length ?? 0 };
}

function benchmarkScrypt() {
  const password = "SampleSecurePassword123!";
  const salt = randomBytes(16);
  const start = performance.now();
  scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  const hashTime = Math.round(performance.now() - start);

  const startVerify = performance.now();
  scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  const verifyTime = Math.round(performance.now() - startVerify);

  return { hashTime, verifyTime };
}

async function pingEndpoint(url, label) {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "user-agent": "BenchmarkSuite/3.0" },
      signal: AbortSignal.timeout(8000),
      redirect: "manual",
    });
    const elapsed = Math.round(performance.now() - start);
    return { label, status: res.status, elapsed, ok: true };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    return { label, status: "ERR", elapsed, ok: false, error: err.message };
  }
}

async function run() {
  console.log("1. DATABASE LATENCY BENCHMARK (Cloudflare D1 Gateway)");
  console.log(`   Target: ${GATEWAY_URL}\n`);

  try {
    const q1 = await queryD1("SELECT 1 AS ping");
    console.log(`   ✓ Ping Gateway (Round-trip)        : ${q1.elapsed} ms`);

    const q2 = await queryD1("SELECT key FROM settings LIMIT 10");
    console.log(`   ✓ Settings Read Query              : ${q2.elapsed} ms (${q2.count} rows)`);

    const q3 = await queryD1("SELECT id, email, role FROM users LIMIT 10");
    console.log(`   ✓ Users Directory Query            : ${q3.elapsed} ms (${q3.count} rows)`);

    const q4 = await queryD1("SELECT id, payment_status, payment_amount FROM conference_registrations LIMIT 10");
    console.log(`   ✓ Registrations Read Query         : ${q4.elapsed} ms (${q4.count} rows)`);

    const q5 = await queryD1("SELECT id, payment_status, payment_amount FROM technext_bookings LIMIT 10");
    console.log(`   ✓ TechNext Bookings Read Query     : ${q5.elapsed} ms (${q5.count} rows)`);
  } catch (err) {
    console.log(`   ⚠️  D1 Gateway direct benchmark: ${err.message}`);
    console.log("   (If running locally without cloud gateway token, connect to cloud gateway via D1_GATEWAY_URL in .env.local)");
  }

  console.log("\n2. CRYPTOGRAPHIC & SECURITY SPEED BENCHMARK (Scrypt Hashing)");
  const crypto = benchmarkScrypt();
  console.log(`   ✓ Scrypt Master Password Hash Time : ${crypto.hashTime} ms (N=16384, r=8, p=1)`);
  console.log(`   ✓ Scrypt Password Verification Time: ${crypto.verifyTime} ms`);
  console.log("   ℹ️  Note: Scrypt is intentionally CPU-hardened (ideal range: 40-150ms) to prevent GPU brute-force attacks.");

  console.log("\n3. LIVE ENDPOINTS RESPONSE TIME & TTFB (All 3 Websites)");
  for (const site of SITES) {
    console.log(`\n   --- ${site.name} ---`);
    const home = await pingEndpoint(site.url, "Homepage");
    const apiMe = await pingEndpoint(`${site.url}/api/auth/me`, "Auth Session API (/api/auth/me)");
    const login = await pingEndpoint(`${site.url}/login`, "Login Page (/login)");
    const refunds = await pingEndpoint(`${site.url}/admin/refunds`, "Refunds Portal (/admin/refunds)");

    console.log(`   * ${home.label.padEnd(30)}: ${home.status} (${home.elapsed} ms)`);
    console.log(`   * ${apiMe.label.padEnd(30)}: ${apiMe.status} (${apiMe.elapsed} ms)`);
    console.log(`   * ${login.label.padEnd(30)}: ${login.status} (${login.elapsed} ms)`);
    console.log(`   * ${refunds.label.padEnd(30)}: ${refunds.status} (${refunds.elapsed} ms) [Protected]`);
  }

  console.log("\n=======================================================");
  console.log(" ✅ BENCHMARK COMPLETE");
  console.log("=======================================================\n");
}

run().catch(console.error);
