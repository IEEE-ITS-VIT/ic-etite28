"use server";

import { requireUser } from "@/lib/auth/session";
import { batch, first, now, run } from "@/lib/db";
import { formatInr, formatMoney, getSettings } from "@/lib/settings";
import { notify } from "@/lib/notifications";
import { formatDeadline } from "@/lib/pricing";
import { priceNow, windowState } from "@/lib/pricing";
import { bool, guarded, isEmail, str } from "@/lib/portal/actions";
import { ORG_TYPES } from "@/lib/portal/technext";
import { PortalError } from "@/lib/portal/events";
import { newId } from "@/lib/portal/ids";
import { emailLayout, outboxInsert, textToHtml } from "@/lib/email/mailer";
import { SITE_URL } from "@/lib/seo";

// ─── TechNext stall booking ───────────────────────────────────────────

// ─── Conference registration ──────────────────────────────────────────

let columnsEnsured = false;
async function ensureRegistrationColumns() {
  if (columnsEnsured) return;
  try {
    await run("ALTER TABLE conference_registrations ADD COLUMN identity_proof_type TEXT").catch(() => {});
    await run("ALTER TABLE conference_registrations ADD COLUMN identity_proof_number TEXT").catch(() => {});
    await run("ALTER TABLE conference_registrations ADD COLUMN institution_id_number TEXT").catch(() => {});
    await run("ALTER TABLE conference_registrations ADD COLUMN department TEXT").catch(() => {});
    columnsEnsured = true;
  } catch {
    // Columns may already exist
  }
}

export async function saveConferenceRegistrationAction(fd: FormData) {
  const back = "/registration/apply";
  const user = await requireUser(back);
  await guarded(back, async () => {
    const settings = await getSettings();
    if (!settings.visibility.conferenceRegistration) throw new PortalError("Conference registration is not open yet.");
    const existing = await first<{ id: string; payment_status: string; status: string; created_at: string }>(
      "SELECT id, payment_status, status, created_at FROM conference_registrations WHERE user_id = ?",
      [user.id]
    );
    const cw = windowState(settings.conference.opensAt, settings.conference.closesAt);
    if (cw !== "open" && !existing) throw new PortalError(cw === "not_open" ? "Conference registration has not opened yet." : "Conference registration has closed.");
    if (existing && (existing.payment_status === "paid" || existing.payment_status === "waived" || existing.status === "confirmed")) {
      throw new PortalError("Your registration is confirmed. Contact the organisers to make changes.");
    }
    const tier = settings.fees.find((f) => f.key === str(fd, "category", 60));
    if (!tier) throw new PortalError("Choose a registration category.");
    const residency = str(fd, "residency", 10) === "foreign" ? "foreign" : "indian";
    // Price is fixed by when the delegate first registered, so edits keep an early-bird price.
    const pricedAt = existing ? new Date(existing.created_at).getTime() : Date.now();
    const amount =
      residency === "foreign"
        ? priceNow(tier.usd, tier.earlyUsd, settings.conference.earlyBird, pricedAt).amount
        : priceNow(tier.inr, tier.earlyInr, settings.conference.earlyBird, pricedAt).amount;
    if (amount == null) throw new PortalError(`"${tier.category}" is not available for ${residency === "foreign" ? "foreign" : "Indian"} delegates.`);

    // Identity verification
    const identityProofType = str(fd, "identity_proof_type", 60) || (residency === "foreign" ? "Passport" : "Indian Identity (Aadhaar / Govt ID)");
    const identityProofNumber = str(fd, "identity_proof_number", 80).trim();
    if (!identityProofNumber) {
      if (residency === "foreign") {
        throw new PortalError("Foreign delegates must provide a valid passport number.");
      } else {
        throw new PortalError("Indian delegates must provide a valid identity proof (Aadhaar / Voter ID / Govt ID number).");
      }
    }

    // Category and IEEE identification
    const isIeeeCategory = Boolean(
      tier.isIeeeDiscount ||
      /ieee/i.test(tier.category) ||
      str(fd, "category", 60).toLowerCase().includes("ieee")
    );
    const isVit = /vit/i.test(tier.category) || str(fd, "category", 60).toLowerCase().includes("vit");
    const isStudent = /student|scholar/i.test(tier.category);

    const ieee = isIeeeCategory ? 1 : (bool(fd, "ieee_member") ? 1 : 0);
    const ieeeNumber = str(fd, "ieee_number", 30).trim();
    if (isIeeeCategory) {
      if (!ieeeNumber || !/^\d{6,12}$/.test(ieeeNumber.replace(/\s+/g, ""))) {
        throw new PortalError("IEEE member categories require a valid 6-12 digit IEEE membership number.");
      }
    }

    // Institutional / Academic ID
    const institutionIdNumber = str(fd, "institution_id_number", 80).trim();
    if (!institutionIdNumber) {
      if (isVit) {
        throw new PortalError("VIT internal delegates must enter their VIT Employee ID or Student Registration Number.");
      } else if (isStudent) {
        throw new PortalError("Students and scholars must enter their College Roll Number or Student Registration Number.");
      } else {
        throw new PortalError("Please enter your College Roll No. / Employee ID / Institutional ID.");
      }
    }

    // Branch / Department
    const department = str(fd, "department", 100).trim();
    if (isVit && !department) {
      throw new PortalError("VIT internal delegates must specify their Branch / School / Department (e.g. SCOPE, SENSE, SELECT).");
    }

    const affiliation = str(fd, "affiliation", 200);
    const country = str(fd, "country", 80) || (residency === "indian" ? "India" : "");
    if (!affiliation) throw new PortalError("Affiliation is required.");
    if (!country) throw new PortalError("Country is required.");

    const paperIds = str(fd, "paper_ids", 200);
    const presenting = str(fd, "presenting_author", 10) === "1" || str(fd, "presenting_author", 10) === "yes" || bool(fd, "presenting_author");
    if (presenting && !paperIds) throw new PortalError("Presenting authors must enter their CMT paper ID(s).");

    const currency = residency === "foreign" ? "USD" : "INR";
    await ensureRegistrationColumns();

    if (existing) {
      try {
        await run(
          `UPDATE conference_registrations SET category_key=?, category_label=?, residency=?, ieee_member=?, ieee_number=?, affiliation=?, designation=?, country=?,
             paper_ids=?, paper_titles=?, presenting_author=?, payment_amount=?, payment_currency=?, payment_status=?,
             identity_proof_type=?, identity_proof_number=?, institution_id_number=?, department=?, updated_at=? WHERE id=?`,
          [
            tier.key,
            tier.category,
            residency,
            ieee,
            ieee ? ieeeNumber || null : null,
            affiliation,
            str(fd, "designation", 100) || null,
            country,
            paperIds || null,
            str(fd, "paper_titles", 1000) || null,
            presenting ? 1 : 0,
            amount,
            currency,
            amount > 0 ? "unpaid" : "not_required",
            identityProofType,
            identityProofNumber,
            institutionIdNumber,
            department || null,
            now(),
            existing.id,
          ]
        );
      } catch {
        const meta = `\n[ID: ${identityProofType} ${identityProofNumber} | Reg/Emp: ${institutionIdNumber} | Dept: ${department || ""}]`;
        await run(
          `UPDATE conference_registrations SET category_key=?, category_label=?, residency=?, ieee_member=?, ieee_number=?, affiliation=?, designation=?, country=?,
             paper_ids=?, paper_titles=?, presenting_author=?, payment_amount=?, payment_currency=?, payment_status=?,
             admin_notes = COALESCE(admin_notes, '') || ?, updated_at=? WHERE id=?`,
          [
            tier.key,
            tier.category,
            residency,
            ieee,
            ieee ? ieeeNumber || null : null,
            affiliation,
            str(fd, "designation", 100) || null,
            country,
            paperIds || null,
            str(fd, "paper_titles", 1000) || null,
            presenting ? 1 : 0,
            amount,
            currency,
            amount > 0 ? "unpaid" : "not_required",
            meta,
            now(),
            existing.id,
          ]
        );
      }
      return "Registration updated.";
    }

    try {
      await run(
        `INSERT INTO conference_registrations (category_key, category_label, residency, ieee_member, ieee_number, affiliation, designation, country,
           paper_ids, paper_titles, presenting_author, payment_amount, payment_currency, payment_status,
           identity_proof_type, identity_proof_number, institution_id_number, department, updated_at, id, user_id, status, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?)`,
        [
          tier.key,
          tier.category,
          residency,
          ieee,
          ieee ? ieeeNumber || null : null,
          affiliation,
          str(fd, "designation", 100) || null,
          country,
          paperIds || null,
          str(fd, "paper_titles", 1000) || null,
          presenting ? 1 : 0,
          amount,
          currency,
          amount > 0 ? "unpaid" : "not_required",
          identityProofType,
          identityProofNumber,
          institutionIdNumber,
          department || null,
          now(),
          newId(),
          user.id,
          now(),
        ]
      );
    } catch {
      const meta = `[ID: ${identityProofType} ${identityProofNumber} | Reg/Emp: ${institutionIdNumber} | Dept: ${department || ""}]`;
      await run(
        `INSERT INTO conference_registrations (category_key, category_label, residency, ieee_member, ieee_number, affiliation, designation, country,
           paper_ids, paper_titles, presenting_author, payment_amount, payment_currency, payment_status,
           admin_notes, updated_at, id, user_id, status, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending',?)`,
        [
          tier.key,
          tier.category,
          residency,
          ieee,
          ieee ? ieeeNumber || null : null,
          affiliation,
          str(fd, "designation", 100) || null,
          country,
          paperIds || null,
          str(fd, "paper_titles", 1000) || null,
          presenting ? 1 : 0,
          amount,
          currency,
          amount > 0 ? "unpaid" : "not_required",
          meta,
          now(),
          newId(),
          user.id,
          now(),
        ]
      );
    }
    await notify("conference_registered", {
      to: user.email,
      name: user.name,
      scope: "conference",
      vars: {
        category: tier.category,
        amount: formatMoney(amount, currency),
        deadline: settings.conference.closesAt ? ` before ${formatDeadline(settings.conference.closesAt)}` : "",
      },
    });
    return "Registration saved. Complete the payment to confirm it.";
  }, "/dashboard");
}
