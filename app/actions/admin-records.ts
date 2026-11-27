"use server";

import { setRoleStatements } from "@/lib/auth/roles";
import { SITE } from "@/lib/site";
import type { Role } from "@/lib/auth/session";

import { requireAdmin } from "@/lib/auth/session";
import { batch, first, now, run } from "@/lib/db";
import { guarded, isEmail, str } from "@/lib/portal/actions";
import { PortalError } from "@/lib/portal/events";
import { PAYMENT_STATUSES, applyPaymentStatus, type PaymentStatus } from "@/lib/payments";
import { notify } from "@/lib/notifications";
import { formatInr, getSettings } from "@/lib/settings";
import { emailLayout, outboxInsert, textToHtml } from "@/lib/email/mailer";
import { newId } from "@/lib/portal/ids";
import { hashPassword } from "@/lib/auth/password";
import { randomBytes } from "node:crypto";
import { sha256 } from "@/lib/portal/ids";
import { SITE_URL } from "@/lib/seo";

const payment = (fd: FormData) => {
  const status = str(fd, "payment_status", 20) as PaymentStatus;
  if (!PAYMENT_STATUSES.includes(status)) throw new PortalError("Invalid payment status.");
  return status;
};

const link = (fd: FormData) => {
  const v = str(fd, "payment_link", 500);
  if (v && !/^https?:\/\//i.test(v)) throw new PortalError("Payment link must start with http:// or https://");
  return v || null;
};


// ─── Conference ────────────────────────────────────────────────────────

export async function updateConferenceRegistrationAction(fd: FormData) {
  const admin = await requireAdmin();
  const id = str(fd, "id", 40);
  const back = `/admin/conference#r-${id}`;
  await guarded(back, async () => {
    const status = str(fd, "status", 20);
    if (!["pending", "confirmed", "cancelled"].includes(status)) throw new PortalError("Invalid status.");
    await run("UPDATE conference_registrations SET status = ?, admin_notes = ?, payment_link = ?, updated_at = ? WHERE id = ?", [
      status,
      str(fd, "admin_notes", 1000) || null,
      link(fd),
      now(),
      id,
    ]);
    const pay = payment(fd);
    await applyPaymentStatus("conference", id, pay, str(fd, "payment_ref", 120) || null);
    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: admin.id,
        userEmail: admin.email,
        userName: admin.name,
        action: "conference.registration_update",
        category: "records",
        path: "/admin/conference",
        details: { registrationId: id, status, paymentStatus: pay },
      });
    } catch {}
    return pay === "paid" ? "Saved. If this was a new payment, the invoice was issued and emailed." : "Registration updated.";
  });
}

// ─── Users ─────────────────────────────────────────────────────────────

export async function setUserRoleAction(fd: FormData) {
  const admin = await requireAdmin();
  const back = `/admin/users?q=${encodeURIComponent(str(fd, "q", 80))}`;
  await guarded(back, async () => {
    const userId = str(fd, "user_id", 40);
    const role = str(fd, "role", 20);
    if (!["participant", "evaluator", "admin"].includes(role)) throw new PortalError("Invalid role.");
    if (userId === admin.id && role !== "admin") throw new PortalError("You cannot remove your own admin access.");
    await batch(setRoleStatements(userId, role as Role));
    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: admin.id,
        userEmail: admin.email,
        userName: admin.name,
        action: "users.role_update",
        category: "users",
        path: "/admin/users",
        details: { targetUserId: userId, newRole: role },
      });
    } catch {}
    return "Role updated.";
  });
}

export async function verifyUserAction(fd: FormData) {
  const admin = await requireAdmin();
  const back = `/admin/users?q=${encodeURIComponent(str(fd, "q", 80))}`;
  await guarded(back, async () => {
    const targetUserId = str(fd, "user_id", 40);
    await run("UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?", [now(), targetUserId]);
    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: admin.id,
        userEmail: admin.email,
        userName: admin.name,
        action: "users.verify_email",
        category: "users",
        path: "/admin/users",
        details: { targetUserId },
      });
    } catch {}
    return "Email marked as verified.";
  });
}

// Creates (or promotes) an evaluator and emails them a link to set their password.
export async function inviteUserAction(fd: FormData) {
  const admin = await requireAdmin();
  const back = "/admin/users";
  await guarded(back, async () => {
    const email = str(fd, "email", 200).toLowerCase();
    const name = str(fd, "name", 100);
    const role = str(fd, "role", 20) === "admin" ? "admin" : "evaluator";
    if (!isEmail(email)) throw new PortalError("Enter a valid email.");
    const existing = await first<{ id: string; name: string }>("SELECT id, name FROM users WHERE email = ?", [email]);
    if (existing) {
      await batch(setRoleStatements(existing.id, role));
      try {
        const { logAudit } = await import("@/lib/audit");
        await logAudit({
          userId: admin.id,
          userEmail: admin.email,
          userName: admin.name,
          action: "users.role_update",
          category: "users",
          path: "/admin/users",
          details: { targetEmail: email, targetName: existing.name, role },
        });
      } catch {}
      return `${existing.name} is now ${role === "admin" ? "an admin" : "an evaluator"}.`;
    }
    if (name.length < 2) throw new PortalError("Enter the person's name.");
    const id = newId();
    const token = randomBytes(32).toString("base64url");
    const setLink = `${SITE_URL}/reset-password?token=${token}`;
    await batch([
      {
        sql: `INSERT INTO users (id, email, password_hash, name, role, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        params: [id, email, await hashPassword(randomBytes(24).toString("base64url")), name, SITE === "icetite" ? role : "participant", now(), now()],
      },
      ...(SITE === "icetite" ? [] : setRoleStatements(id, role)),
      {
        sql: "INSERT INTO auth_tokens (id, user_id, purpose, expires_at, created_at) VALUES (?, ?, 'reset', ?, ?)",
        params: [sha256(token), id, new Date(Date.now() + 7 * 864e5).toISOString(), now()],
      },
      outboxInsert({
        to: email,
        toName: name,
        subject: `You're invited as ${role === "admin" ? "an admin" : "an evaluator"} for ic-ETITE'28`,
        html: emailLayout(
          "Portal invitation",
          textToHtml(`Hello ${name},\n\nYou have been added as ${role === "admin" ? "an administrator" : "an evaluator"} on the ic-ETITE'28 portal. Set your password with the link below (valid for 7 days):\n\n${setLink}\n\nAfter that, log in at ${SITE_URL}/login`)
        ),
        priority: 1,
      }),
    ]);
    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: admin.id,
        userEmail: admin.email,
        userName: admin.name,
        action: "users.invite",
        category: "users",
        path: "/admin/users",
        details: { targetEmail: email, targetName: name, role },
      });
    } catch {}
    return `Invitation queued for ${email}. Send it from Email & SMTP.`;
  });
}

export async function resendInvoiceAction(fd: FormData) {
  const admin = await requireAdmin();
  await guarded("/admin/invoices", async () => {
    const inv = await first<{ id: string; number: string; bill_name: string; bill_email: string; items: string; amount: number; currency: string; payment_ref: string | null; purpose: string; ref_id: string }>(
      "SELECT * FROM invoices WHERE id = ?",
      [str(fd, "id", 40)]
    );
    if (!inv) throw new PortalError("Invoice not found.");
    const { formatMoney } = await import("@/lib/settings");
    await notify("payment_received", {
      to: inv.bill_email,
      name: inv.bill_name,
      scope: inv.purpose === "event" ? `event:${inv.ref_id.split(":")[0]}` : inv.purpose,
      vars: {
        item: (JSON.parse(inv.items) as { description: string }[]).map((i) => i.description).join("; "),
        amount: formatMoney(inv.amount, inv.currency),
        invoiceNumber: inv.number,
        paymentRef: inv.payment_ref ?? "—",
      },
      attachment: { type: "invoice", invoiceId: inv.id },
    });
    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: admin.id,
        userEmail: admin.email,
        userName: admin.name,
        action: "invoices.resend",
        category: "records",
        path: "/admin/invoices",
        details: { invoiceId: inv.id, invoiceNumber: inv.number, billEmail: inv.bill_email },
      });
    } catch {}
    return `Invoice ${inv.number} emailed to ${inv.bill_email}.`;
  });
}
