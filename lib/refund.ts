import "server-only";
import { all, first, run, now } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { PortalError } from "@/lib/portal/events";
import { logAudit } from "@/lib/audit";

export const REFUND_SUPERADMIN_EMAIL = "ieeeitsvitscore@gmail.com";

export interface RefundRecord {
  id: string; // unique ID or "eventId:userId"
  purpose: "conference" | "technext" | "event";
  scopeLabel: string;
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  status: string;
  paymentRef: string | null;
  createdAt: string;
  adminNotes: string | null;
  isRefunded: boolean;
  canProceedRefund: boolean;
  canCancelBeforeProceed: boolean;
}

/**
 * Checks whether the refund authorization password hash has been configured in the database.
 */
export async function hasRefundPassword(): Promise<boolean> {
  const row = await first<{ value: string }>("SELECT value FROM settings WHERE key = 'refund_password_hash'");
  if (!row) return false;
  try {
    const hash = JSON.parse(row.value);
    return typeof hash === "string" && hash.startsWith("scrypt$");
  } catch {
    return false;
  }
}

/**
 * Sets or updates the refund authorization password.
 * Strictly restricted to ieeeitsvitscore@gmail.com.
 * Stores the password as a secure scrypt hash in the settings table.
 */
export async function setRefundPassword(password: string, userEmail: string, userId: string): Promise<void> {
  if (userEmail.toLowerCase() !== REFUND_SUPERADMIN_EMAIL.toLowerCase()) {
    throw new PortalError(`Unauthorized. Only ${REFUND_SUPERADMIN_EMAIL} can configure the refund security password.`);
  }
  if (!password || password.length < 8) {
    throw new PortalError("Refund authorization password must be at least 8 characters.");
  }
  const hash = await hashPassword(password);
  await run(
    `INSERT INTO settings (key, value, updated_at, updated_by)
     VALUES ('refund_password_hash', ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    [JSON.stringify(hash), now(), userId]
  );
  try {
    await logAudit({
      userId,
      userEmail,
      action: "security.refund_password_set",
      category: "users",
      details: { email: userEmail, configured: true },
    });
  } catch {}
}

/**
 * Verifies a given plaintext password against the stored scrypt hash.
 */
export async function verifyRefundPassword(password: string): Promise<boolean> {
  const row = await first<{ value: string }>("SELECT value FROM settings WHERE key = 'refund_password_hash'");
  if (!row) return false;
  try {
    const hash = JSON.parse(row.value);
    if (typeof hash !== "string") return false;
    return await verifyPassword(password, hash);
  } catch {
    return false;
  }
}

/**
 * Fetches all transactions across Conference, TechNext, and Events/Hackathons.
 */
export async function getAllRefundableRecords(filter?: {
  scope?: string;
  status?: string;
  q?: string;
}): Promise<RefundRecord[]> {
  const [confRows, techRows, eventRows] = await Promise.all([
    all<{
      id: string;
      title: string;
      subtitle: string;
      amount: number;
      currency: string;
      payment_status: string;
      status: string;
      payment_ref: string | null;
      created_at: string;
      admin_notes: string | null;
    }>(
      `SELECT c.id, u.name AS title, (c.category_label || ' · ' || u.email) AS subtitle,
              c.payment_amount AS amount, c.payment_currency AS currency,
              c.payment_status, c.status, c.payment_ref, c.created_at, c.admin_notes
         FROM conference_registrations c
         JOIN users u ON u.id = c.user_id
        ORDER BY c.created_at DESC`
    ).catch(() => []),

    all<{
      id: string;
      title: string;
      subtitle: string;
      amount: number;
      currency: string;
      payment_status: string;
      status: string;
      payment_ref: string | null;
      created_at: string;
      admin_notes: string | null;
    }>(
      `SELECT b.id, b.organization_name AS title, (b.contact_name || ' · ' || b.email || ' · ' || b.stall_type) AS subtitle,
              b.payment_amount AS amount, b.payment_currency AS currency,
              b.payment_status, b.status, b.payment_ref, b.created_at, b.admin_notes
         FROM technext_bookings b
        ORDER BY b.created_at DESC`
    ).catch(() => []),

    all<{
      id: string;
      title: string;
      subtitle: string;
      amount: number;
      currency: string;
      payment_status: string;
      status: string;
      payment_ref: string | null;
      created_at: string;
      admin_notes: string | null;
    }>(
      `SELECT (r.event_id || ':' || r.user_id) AS id, u.name AS title,
              (COALESCE(e.title, 'Event') || ' · ' || u.email) AS subtitle,
              r.payment_amount AS amount, r.payment_currency AS currency,
              r.payment_status, 'registered' AS status, r.payment_ref,
              r.registered_at AS created_at, '' AS admin_notes
         FROM registrations r
         JOIN users u ON u.id = r.user_id
         LEFT JOIN events e ON e.id = r.event_id
        ORDER BY r.registered_at DESC`
    ).catch(() => []),
  ]);

  const list: RefundRecord[] = [
    ...confRows.map((r) => ({
      id: r.id,
      purpose: "conference" as const,
      scopeLabel: "Conference",
      title: r.title,
      subtitle: r.subtitle,
      amount: r.amount,
      currency: r.currency,
      paymentStatus: r.payment_status,
      status: r.status,
      paymentRef: r.payment_ref,
      createdAt: r.created_at,
      adminNotes: r.admin_notes,
      isRefunded: r.payment_status === "refunded",
      canProceedRefund: r.payment_status === "paid",
      canCancelBeforeProceed: r.payment_status === "paid",
    })),
    ...techRows.map((r) => ({
      id: r.id,
      purpose: "technext" as const,
      scopeLabel: "TechNext Expo",
      title: r.title,
      subtitle: r.subtitle,
      amount: r.amount,
      currency: r.currency,
      paymentStatus: r.payment_status,
      status: r.status,
      paymentRef: r.payment_ref,
      createdAt: r.created_at,
      adminNotes: r.admin_notes,
      isRefunded: r.payment_status === "refunded",
      canProceedRefund: r.payment_status === "paid",
      canCancelBeforeProceed: r.payment_status === "paid",
    })),
    ...eventRows.map((r) => ({
      id: r.id,
      purpose: "event" as const,
      scopeLabel: "BOLT 3.0 / Event",
      title: r.title,
      subtitle: r.subtitle,
      amount: r.amount,
      currency: r.currency,
      paymentStatus: r.payment_status,
      status: r.status,
      paymentRef: r.payment_ref,
      createdAt: r.created_at,
      adminNotes: r.admin_notes,
      isRefunded: r.payment_status === "refunded",
      canProceedRefund: r.payment_status === "paid",
      canCancelBeforeProceed: r.payment_status === "paid",
    })),
  ];

  let filtered = list;
  if (filter?.scope && filter.scope !== "all") {
    filtered = filtered.filter((r) => r.purpose === filter.scope);
  }
  if (filter?.status && filter.status !== "all") {
    if (filter.status === "refunded") {
      filtered = filtered.filter((r) => r.isRefunded);
    } else if (filter.status === "paid") {
      filtered = filtered.filter((r) => r.paymentStatus === "paid");
    } else if (filter.status === "cancelled") {
      filtered = filtered.filter((r) => r.status === "cancelled");
    }
  }
  if (filter?.q) {
    const qLower = filter.q.toLowerCase().trim();
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(qLower) ||
        r.subtitle.toLowerCase().includes(qLower) ||
        r.id.toLowerCase().includes(qLower) ||
        (r.paymentRef && r.paymentRef.toLowerCase().includes(qLower))
    );
  }

  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
