import "server-only";
import { headers } from "next/headers";
import { all, first, now, run } from "@/lib/db";
import { newId } from "@/lib/portal/ids";
import { SITE, type SiteKey } from "@/lib/site";
import { getCurrentUser } from "@/lib/auth/session";

export type AuditCategory =
  | "auth"
  | "settings"
  | "content"
  | "users"
  | "records"
  | "export"
  | "email";

export type AuditEntry = {
  id?: string;
  site?: SiteKey;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  category: AuditCategory;
  details?: string | Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  path?: string | null;
  createdAt?: string;
};

export type AuditLogRecord = {
  id: string;
  site: SiteKey;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  category: AuditCategory;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  path: string | null;
  created_at: string;
};

let tableEnsured = false;

export async function ensureAuditTable(): Promise<void> {
  if (tableEnsured) return;
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id          TEXT PRIMARY KEY,
        site        TEXT NOT NULL,
        user_id     TEXT,
        user_email  TEXT,
        user_name   TEXT,
        action      TEXT NOT NULL,
        category    TEXT NOT NULL,
        details     TEXT,
        ip_address  TEXT,
        user_agent  TEXT,
        path        TEXT,
        created_at  TEXT NOT NULL
      )
    `);
    await run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_site_created ON audit_logs(site, created_at DESC)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_email, created_at DESC)`);
    // Audit policy: only store logins, changes, and bookings. Purge any legacy click or telemetry records.
    await run(`DELETE FROM audit_logs WHERE category IN ('click', 'navigation', 'system')`);
    tableEnsured = true;
  } catch (err) {
    console.warn("Could not ensure audit_logs table:", err);
  }
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    // Audit policy: strictly ignore clicks, navigations, and unwanted telemetry
    if (
      entry.category === ("click" as AuditCategory) ||
      entry.category === ("navigation" as AuditCategory) ||
      (entry.category as string) === "system"
    ) {
      return;
    }

    await ensureAuditTable();

    let ip = entry.ipAddress;
    let ua = entry.userAgent;
    let currentUser: { id: string; email: string; name: string } | null = null;

    try {
      const h = await headers();
      if (!ip) {
        ip = (
          h.get("cf-connecting-ip") ||
          h.get("x-real-ip") ||
          h.get("x-forwarded-for")?.split(",")[0] ||
          "unknown"
        ).trim().slice(0, 64);
      }
      if (!ua) {
        ua = (h.get("user-agent") || "").slice(0, 300);
      }
    } catch {
      // headers() may not be available in non-request contexts
    }

    if (!entry.userId && !entry.userEmail) {
      try {
        currentUser = await getCurrentUser();
      } catch {
        // Not authenticated
      }
    }

    const userId = entry.userId ?? currentUser?.id ?? null;
    const userEmail = entry.userEmail ?? currentUser?.email ?? null;
    const userName = entry.userName ?? currentUser?.name ?? null;

    const detailsStr =
      typeof entry.details === "object" && entry.details !== null
        ? JSON.stringify(entry.details)
        : entry.details ?? null;

    const id = entry.id || newId();
    const site = entry.site || SITE;
    const createdAt = entry.createdAt || now();

    await run(
      `INSERT INTO audit_logs (id, site, user_id, user_email, user_name, action, category, details, ip_address, user_agent, path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        site,
        userId,
        userEmail,
        userName,
        entry.action,
        entry.category,
        detailsStr,
        ip ?? null,
        ua ?? null,
        entry.path ?? null,
        createdAt,
      ]
    );
  } catch (err) {
    // Audit logging must be fail-safe and never block core operations
    console.error("Failed to write audit log:", err);
  }
}

export type AuditFilter = {
  site?: string;
  category?: string;
  action?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export async function getAuditLogs(filter: AuditFilter = {}): Promise<{ logs: AuditLogRecord[]; total: number }> {
  await ensureAuditTable();

  const where: string[] = [];
  const params: unknown[] = [];

  if (filter.site && filter.site !== "all") {
    where.push("site = ?");
    params.push(filter.site);
  }

  if (filter.category && filter.category !== "all") {
    where.push("category = ?");
    params.push(filter.category);
  } else {
    // Only fetch valid categories: auth, settings, content, users, records, export
    where.push("category IN ('auth', 'settings', 'content', 'users', 'records', 'export')");
  }

  if (filter.action && filter.action !== "all") {
    where.push("action = ?");
    params.push(filter.action);
  }

  if (filter.search) {
    where.push("(user_email LIKE ? OR user_name LIKE ? OR ip_address LIKE ? OR action LIKE ? OR details LIKE ? OR path LIKE ?)");
    const q = `%${filter.search}%`;
    params.push(q, q, q, q, q, q);
  }

  if (filter.startDate) {
    where.push("created_at >= ?");
    params.push(`${filter.startDate}T00:00:00Z`);
  }

  if (filter.endDate) {
    where.push("created_at <= ?");
    params.push(`${filter.endDate}T23:59:59Z`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countRow = await first<{ n: number }>(`SELECT COUNT(*) AS n FROM audit_logs ${whereClause}`, params);
  const total = countRow?.n ?? 0;

  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
  const offset = Math.max(filter.offset ?? 0, 0);

  const logs = await all<AuditLogRecord>(
    `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { logs, total };
}

export async function getAuditStats(): Promise<{
  totalEvents: number;
  adminLogins: number;
  failedLogins: number;
  changesCount: number;
  bookingsCount: number;
}> {
  await ensureAuditTable();
  try {
    const [totalRow, loginRow, failedRow, changesRow, bookingsRow] = await Promise.all([
      first<{ n: number }>("SELECT COUNT(*) AS n FROM audit_logs WHERE category IN ('auth', 'settings', 'content', 'users', 'records', 'export')"),
      first<{ n: number }>("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'admin.login_success'"),
      first<{ n: number }>("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'admin.login_failed'"),
      first<{ n: number }>("SELECT COUNT(*) AS n FROM audit_logs WHERE category IN ('settings', 'content', 'users')"),
      first<{ n: number }>("SELECT COUNT(*) AS n FROM audit_logs WHERE category = 'records'"),
    ]);

    return {
      totalEvents: totalRow?.n ?? 0,
      adminLogins: loginRow?.n ?? 0,
      failedLogins: failedRow?.n ?? 0,
      changesCount: changesRow?.n ?? 0,
      bookingsCount: bookingsRow?.n ?? 0,
    };
  } catch {
    return {
      totalEvents: 0,
      adminLogins: 0,
      failedLogins: 0,
      changesCount: 0,
      bookingsCount: 0,
    };
  }
}
