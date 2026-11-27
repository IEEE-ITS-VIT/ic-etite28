"use server";

import { requireAdmin } from "@/lib/auth/session";
import { first, run, now } from "@/lib/db";
import { guarded, str } from "@/lib/portal/actions";
import { PortalError } from "@/lib/portal/events";
import { logAudit } from "@/lib/audit";
import {
  verifyRefundPassword,
  setRefundPassword,
  hasRefundPassword,
  REFUND_SUPERADMIN_EMAIL,
} from "@/lib/refund";
import { applyPaymentStatus } from "@/lib/payments";
import { notify } from "@/lib/notifications";
import { formatInr } from "@/lib/settings";

/**
 * Superadmin (ieeeitsvitscore@gmail.com) sets or updates the master refund authorization password.
 * Securely stored as an scrypt hash in the settings table.
 */
export async function setRefundPasswordAction(fd: FormData) {
  const user = await requireAdmin("/admin/refunds");
  await guarded("/admin/refunds", async () => {
    if (user.email.toLowerCase() !== REFUND_SUPERADMIN_EMAIL.toLowerCase()) {
      throw new PortalError(`Unauthorized. Only ${REFUND_SUPERADMIN_EMAIL} can configure the refund security key.`);
    }
    const password = str(fd, "password", 100);
    const confirm = str(fd, "confirm_password", 100);
    if (!password || password.length < 8) {
      throw new PortalError("Master refund password must be at least 8 characters long.");
    }
    if (password !== confirm) {
      throw new PortalError("Passwords do not match.");
    }
    await setRefundPassword(password, user.email, user.id);
    return "Master refund authorization password has been successfully saved.";
  });
}

/**
 * Proceed Refund:
 * - Requires admin session.
 * - Requires verification of the refund security key set by ieeeitsvitscore@gmail.com.
 * - Record MUST currently be paid and NOT already refunded.
 * - Sets payment_status to 'refunded' and record status to 'cancelled'.
 * - Once proceeded, this refund is PERMANENT and can NEVER be cancelled, rolled back, or reversed.
 */
export async function proceedRefundAction(fd: FormData) {
  const user = await requireAdmin("/admin/refunds");
  const id = str(fd, "id", 100);
  const purpose = str(fd, "purpose", 20) as "conference" | "technext" | "event";
  const password = str(fd, "refund_password", 100);
  const reason = str(fd, "reason", 500) || "Admin authorized refund";

  await guarded("/admin/refunds", async () => {
    if (!password) {
      throw new PortalError("Refund authorization password is required.");
    }
    const configured = await hasRefundPassword();
    if (!configured) {
      throw new PortalError(
        `Refund authorization key has not been configured yet. Please configure it in ${REFUND_SUPERADMIN_EMAIL}'s profile.`
      );
    }
    const isValidPassword = await verifyRefundPassword(password);
    if (!isValidPassword) {
      throw new PortalError("Invalid refund authorization password. Refund rejected.");
    }

    if (purpose === "conference") {
      const rec = await first<{ payment_status: string; status: string; payment_amount: number; user_id: string }>(
        "SELECT payment_status, status, payment_amount, user_id FROM conference_registrations WHERE id = ?",
        [id]
      );
      if (!rec) throw new PortalError("Conference registration not found.");
      if (rec.payment_status === "refunded") {
        throw new PortalError("This refund has already proceeded and cannot be cancelled or reversed.");
      }
      if (rec.payment_status !== "paid") {
        throw new PortalError("Only paid transactions are eligible for refund.");
      }

      const note = `[REFUND PROCESSED on ${new Date().toISOString()} by ${user.email}. Reason: ${reason}]`;
      await run(
        `UPDATE conference_registrations 
            SET payment_status = 'refunded', 
                status = 'cancelled', 
                admin_notes = COALESCE(admin_notes || '\n', '') || ?, 
                updated_at = ? 
          WHERE id = ?`,
        [note, now(), id]
      );
      await applyPaymentStatus("conference", id, "refunded");
      await run("UPDATE payments SET status = 'refunded', updated_at = ? WHERE purpose = 'conference' AND ref_id = ?", [now(), id]).catch(() => {});

      const u = await first<{ email: string; name: string }>("SELECT email, name FROM users WHERE id = ?", [rec.user_id]);
      if (u) {
        await notify("refund_processed", {
          to: u.email,
          name: u.name,
          scope: "conference",
          vars: {
            amount: formatInr(rec.payment_amount),
            reason,
          },
        }).catch(() => {});
      }

      await logAudit({
        userId: user.id,
        userEmail: user.email,
        action: "records.refund_processed",
        category: "records",
        path: "/admin/refunds",
        details: { scope: "conference", id, amount: rec.payment_amount, reason },
      });

      return `Refund of ${formatInr(rec.payment_amount)} successfully processed. Record is permanently locked.`;
    } else if (purpose === "technext") {
      const rec = await first<{
        payment_status: string;
        status: string;
        payment_amount: number;
        email: string;
        contact_name: string;
        organization_name: string;
      }>(
        "SELECT payment_status, status, payment_amount, email, contact_name, organization_name FROM technext_bookings WHERE id = ?",
        [id]
      );
      if (!rec) throw new PortalError("TechNext booking not found.");
      if (rec.payment_status === "refunded") {
        throw new PortalError("This refund has already proceeded and cannot be cancelled or reversed.");
      }
      if (rec.payment_status !== "paid") {
        throw new PortalError("Only paid transactions are eligible for refund.");
      }

      const note = `[REFUND PROCESSED on ${new Date().toISOString()} by ${user.email}. Reason: ${reason}]`;
      await run(
        `UPDATE technext_bookings 
            SET payment_status = 'refunded', 
                status = 'cancelled', 
                admin_notes = COALESCE(admin_notes || '\n', '') || ?, 
                updated_at = ? 
          WHERE id = ?`,
        [note, now(), id]
      );
      await applyPaymentStatus("technext", id, "refunded");
      await run("UPDATE payments SET status = 'refunded', updated_at = ? WHERE purpose = 'technext' AND ref_id = ?", [now(), id]).catch(() => {});

      await notify("refund_processed", {
        to: rec.email,
        name: rec.contact_name,
        scope: "technext",
        vars: {
          amount: formatInr(rec.payment_amount),
          reason,
        },
      }).catch(() => {});

      await logAudit({
        userId: user.id,
        userEmail: user.email,
        action: "records.refund_processed",
        category: "records",
        path: "/admin/refunds",
        details: { scope: "technext", id, organization: rec.organization_name, amount: rec.payment_amount, reason },
      });

      return `Refund of ${formatInr(rec.payment_amount)} successfully processed for ${rec.organization_name}. Record is permanently locked.`;
    } else if (purpose === "event") {
      const [eventId, userId] = id.split(":");
      if (!eventId || !userId) throw new PortalError("Invalid event registration ID.");

      const rec = await first<{ payment_status: string; payment_amount: number }>(
        "SELECT payment_status, payment_amount FROM registrations WHERE event_id = ? AND user_id = ?",
        [eventId, userId]
      );
      if (!rec) throw new PortalError("Event registration not found.");
      if (rec.payment_status === "refunded") {
        throw new PortalError("This refund has already proceeded and cannot be cancelled or reversed.");
      }
      if (rec.payment_status !== "paid") {
        throw new PortalError("Only paid transactions are eligible for refund.");
      }

      await run(
        `UPDATE registrations 
            SET payment_status = 'refunded' 
          WHERE event_id = ? AND user_id = ?`,
        [eventId, userId]
      );
      await applyPaymentStatus("event", id, "refunded");
      await run("UPDATE payments SET status = 'refunded', updated_at = ? WHERE purpose = 'event' AND ref_id = ?", [now(), id]).catch(() => {});

      const u = await first<{ email: string; name: string }>("SELECT email, name FROM users WHERE id = ?", [userId]);
      if (u) {
        await notify("refund_processed", {
          to: u.email,
          name: u.name,
          scope: `event:${eventId}`,
          vars: {
            amount: formatInr(rec.payment_amount),
            reason,
          },
        }).catch(() => {});
      }

      await logAudit({
        userId: user.id,
        userEmail: user.email,
        action: "records.refund_processed",
        category: "records",
        path: "/admin/refunds",
        details: { scope: "event", eventId, userId, amount: rec.payment_amount, reason },
      });

      return `Refund of ${formatInr(rec.payment_amount)} successfully processed. Record is permanently locked.`;
    } else {
      throw new PortalError("Invalid refund scope.");
    }
  });
}

/**
 * Cancel Refund Request:
 * "in refund page can cancel it to before proceeed ,if procced we cant cancel"
 * - If already refunded: REJECT permanently ("This refund has already proceeded and cannot be cancelled or reversed.")
 * - If before proceed: Clears/dismisses refund request, keeping the transaction active.
 */
export async function cancelRefundRequestAction(fd: FormData) {
  const user = await requireAdmin("/admin/refunds");
  const id = str(fd, "id", 100);
  const purpose = str(fd, "purpose", 20);

  await guarded("/admin/refunds", async () => {
    if (purpose === "conference") {
      const rec = await first<{ payment_status: string; admin_notes: string | null }>(
        "SELECT payment_status, admin_notes FROM conference_registrations WHERE id = ?",
        [id]
      );
      if (!rec) throw new PortalError("Conference registration not found.");
      if (rec.payment_status === "refunded") {
        throw new PortalError("This refund has already proceeded and cannot be cancelled or reversed.");
      }
      const note = `[REFUND REQUEST CANCELLED on ${new Date().toISOString()} by ${user.email}. Transaction remains active.]`;
      await run(
        "UPDATE conference_registrations SET admin_notes = COALESCE(admin_notes || '\n', '') || ?, updated_at = ? WHERE id = ?",
        [note, now(), id]
      );
    } else if (purpose === "technext") {
      const rec = await first<{ payment_status: string; admin_notes: string | null }>(
        "SELECT payment_status, admin_notes FROM technext_bookings WHERE id = ?",
        [id]
      );
      if (!rec) throw new PortalError("TechNext booking not found.");
      if (rec.payment_status === "refunded") {
        throw new PortalError("This refund has already proceeded and cannot be cancelled or reversed.");
      }
      const note = `[REFUND REQUEST CANCELLED on ${new Date().toISOString()} by ${user.email}. Transaction remains active.]`;
      await run(
        "UPDATE technext_bookings SET admin_notes = COALESCE(admin_notes || '\n', '') || ?, updated_at = ? WHERE id = ?",
        [note, now(), id]
      );
    } else if (purpose === "event") {
      const [eventId, userId] = id.split(":");
      const rec = await first<{ payment_status: string }>(
        "SELECT payment_status FROM registrations WHERE event_id = ? AND user_id = ?",
        [eventId, userId]
      );
      if (!rec) throw new PortalError("Event registration not found.");
      if (rec.payment_status === "refunded") {
        throw new PortalError("This refund has already proceeded and cannot be cancelled or reversed.");
      }
    }

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: "records.refund_cancelled",
      category: "records",
      path: "/admin/refunds",
      details: { scope: purpose, id, message: "Refund request dismissed/cancelled before proceeding" },
    });

    return "Refund request cancelled. The transaction remains active.";
  });
}
