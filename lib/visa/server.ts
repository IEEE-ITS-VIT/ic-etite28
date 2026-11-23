import "server-only";
import { all, first, run } from "@/lib/db";
import type { VisaLayout, VisaRequestRow, VisaRequestWithUser, VisaTemplateRow } from "@/lib/visa/types";
import { DEFAULT_VISA_LAYOUT } from "@/lib/visa/types";

let tableEnsured = false;

export async function ensureVisaTable(): Promise<void> {
  if (tableEnsured) return;
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS visa_requests (
        id                TEXT PRIMARY KEY,
        user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        registration_id   TEXT NOT NULL REFERENCES conference_registrations(id) ON DELETE CASCADE,
        passport_name     TEXT NOT NULL,
        passport_number   TEXT NOT NULL,
        passport_expiry   TEXT NOT NULL,
        date_of_birth     TEXT NOT NULL,
        nationality       TEXT NOT NULL,
        country_of_birth  TEXT,
        gender            TEXT,
        affiliation       TEXT NOT NULL,
        designation       TEXT,
        address           TEXT,
        city              TEXT,
        country           TEXT NOT NULL,
        embassy_details   TEXT,
        paper_id          TEXT,
        paper_title       TEXT,
        arrival_date      TEXT,
        departure_date    TEXT,
        additional_notes  TEXT,
        status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        admin_notes       TEXT,
        approved_at       TEXT,
        approved_by       TEXT REFERENCES users(id),
        created_at        TEXT NOT NULL,
        updated_at        TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_visa_requests_user ON visa_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_visa_requests_status ON visa_requests(status);

      CREATE TABLE IF NOT EXISTS visa_templates (
        id           TEXT PRIMARY KEY,
        file_b64     TEXT,
        preview_b64  TEXT,
        mime         TEXT NOT NULL DEFAULT 'application/pdf',
        width        INTEGER NOT NULL DEFAULT 595,
        height       INTEGER NOT NULL DEFAULT 842,
        layout       TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );
    `);
    tableEnsured = true;
  } catch (err) {
    tableEnsured = true;
  }
}

export async function getVisaRequestForUser(userId: string): Promise<VisaRequestRow | null> {
  await ensureVisaTable();
  return first<VisaRequestRow>("SELECT * FROM visa_requests WHERE user_id = ?", [userId]);
}

export async function getVisaRequestById(id: string): Promise<VisaRequestWithUser | null> {
  await ensureVisaTable();
  return first<VisaRequestWithUser>(
    `SELECT v.*,
            u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
            c.category_label AS reg_category, c.residency AS reg_residency,
            c.status AS reg_status, c.payment_status AS reg_payment_status,
            c.payment_amount AS reg_payment_amount, c.payment_currency AS reg_payment_currency
       FROM visa_requests v
       JOIN users u ON u.id = v.user_id
       JOIN conference_registrations c ON c.id = v.registration_id
      WHERE v.id = ?`,
    [id]
  );
}

export async function listVisaRequests(options?: {
  status?: string;
  q?: string;
}): Promise<VisaRequestWithUser[]> {
  await ensureVisaTable();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.status && options.status !== "all") {
    conditions.push("v.status = ?");
    params.push(options.status);
  }

  if (options?.q) {
    const like = `%${options.q.trim()}%`;
    conditions.push(
      "(u.name LIKE ? OR u.email LIKE ? OR v.passport_name LIKE ? OR v.passport_number LIKE ? OR v.paper_id LIKE ? OR v.affiliation LIKE ? OR v.country LIKE ?)"
    );
    params.push(like, like, like, like, like, like, like);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return all<VisaRequestWithUser>(
    `SELECT v.*,
            u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
            c.category_label AS reg_category, c.residency AS reg_residency,
            c.status AS reg_status, c.payment_status AS reg_payment_status,
            c.payment_amount AS reg_payment_amount, c.payment_currency AS reg_payment_currency
       FROM visa_requests v
       JOIN users u ON u.id = v.user_id
       JOIN conference_registrations c ON c.id = v.registration_id
      ${whereClause}
      ORDER BY v.created_at DESC`,
    params
  );
}

export async function getVisaStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}> {
  await ensureVisaTable();
  const rows = await all<{ status: string; count: number }>(
    "SELECT status, COUNT(*) AS count FROM visa_requests GROUP BY status"
  );

  const stats = { total: 0, pending: 0, approved: 0, rejected: 0 };
  for (const r of rows) {
    if (r.status === "pending") stats.pending = r.count;
    if (r.status === "approved") stats.approved = r.count;
    if (r.status === "rejected") stats.rejected = r.count;
    stats.total += r.count;
  }
  return stats;
}

export async function getVisaTemplateRow(): Promise<VisaTemplateRow | null> {
  await ensureVisaTable();
  return first<VisaTemplateRow>("SELECT * FROM visa_templates WHERE id = 'default'");
}

export async function getParsedVisaLayout(): Promise<VisaLayout> {
  const row = await getVisaTemplateRow();
  if (!row?.layout) return DEFAULT_VISA_LAYOUT;
  try {
    const parsed = JSON.parse(row.layout) as VisaLayout;
    if (Array.isArray(parsed?.fields)) return parsed;
    return DEFAULT_VISA_LAYOUT;
  } catch {
    return DEFAULT_VISA_LAYOUT;
  }
}
