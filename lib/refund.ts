import "server-only";
import { first, run, now } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { PortalError } from "@/lib/portal/events";
import { logAudit } from "@/lib/audit";

export const REFUND_SUPERADMIN_EMAIL = "ieeeitsvitscore@gmail.com";

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
