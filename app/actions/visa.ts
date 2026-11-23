"use server";

import { revalidatePath } from "next/cache";
import { first, now, run } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { getSettings, saveSetting } from "@/lib/settings";
import { guarded, str } from "@/lib/portal/actions";
import { PortalError } from "@/lib/portal/events";
import { newId } from "@/lib/portal/ids";
import { emailLayout, outboxInsert, textToHtml } from "@/lib/email/mailer";
import { ensureVisaTable, getVisaRequestById } from "@/lib/visa/server";
import type { VisaStatus, VisaTemplate } from "@/lib/visa/types";

export async function submitVisaRequestAction(fd: FormData) {
  const user = await requireUser("/dashboard/visa");
  await ensureVisaTable();

  await guarded("/dashboard/visa", async () => {
    // 1. Check conference registration
    const reg = await first<{ id: string; status: string }>(
      "SELECT id, status FROM conference_registrations WHERE user_id = ?",
      [user.id]
    );

    if (!reg) {
      throw new PortalError("Only registered conference participants can request a visa invitation letter.");
    }

    // 2. Validate mandatory inputs
    const passport_name = str(fd, "passport_name", 120);
    const passport_number = str(fd, "passport_number", 60);
    const passport_expiry = str(fd, "passport_expiry", 30);
    const date_of_birth = str(fd, "date_of_birth", 30);
    const nationality = str(fd, "nationality", 80);
    const country = str(fd, "country", 80);
    const affiliation = str(fd, "affiliation", 200);

    if (!passport_name) throw new PortalError("Full legal name as on passport is required.");
    if (!passport_number) throw new PortalError("Passport number is required.");
    if (!passport_expiry) throw new PortalError("Passport expiry date is required.");
    if (!date_of_birth) throw new PortalError("Date of birth is required.");
    if (!nationality) throw new PortalError("Nationality is required.");
    if (!country) throw new PortalError("Country of residence is required.");
    if (!affiliation) throw new PortalError("Institution / Affiliation is required.");

    // Optional inputs
    const country_of_birth = str(fd, "country_of_birth", 80) || null;
    const gender = str(fd, "gender", 20) || null;
    const designation = str(fd, "designation", 100) || null;
    const address = str(fd, "address", 300) || null;
    const city = str(fd, "city", 100) || null;
    const embassy_details = str(fd, "embassy_details", 200) || null;
    const paper_id = str(fd, "paper_id", 80) || null;
    const paper_title = str(fd, "paper_title", 300) || null;
    const arrival_date = str(fd, "arrival_date", 30) || null;
    const departure_date = str(fd, "departure_date", 30) || null;
    const additional_notes = str(fd, "additional_notes", 1000) || null;

    const existing = await first<{ id: string }>("SELECT id FROM visa_requests WHERE user_id = ?", [user.id]);
    const timestamp = now();

    if (existing) {
      await run(
        `UPDATE visa_requests SET
          registration_id = ?,
          passport_name = ?,
          passport_number = ?,
          passport_expiry = ?,
          date_of_birth = ?,
          nationality = ?,
          country_of_birth = ?,
          gender = ?,
          affiliation = ?,
          designation = ?,
          address = ?,
          city = ?,
          country = ?,
          embassy_details = ?,
          paper_id = ?,
          paper_title = ?,
          arrival_date = ?,
          departure_date = ?,
          additional_notes = ?,
          status = 'pending',
          updated_at = ?
         WHERE user_id = ?`,
        [
          reg.id,
          passport_name,
          passport_number,
          passport_expiry,
          date_of_birth,
          nationality,
          country_of_birth,
          gender,
          affiliation,
          designation,
          address,
          city,
          country,
          embassy_details,
          paper_id,
          paper_title,
          arrival_date,
          departure_date,
          additional_notes,
          timestamp,
          user.id,
        ]
      );
    } else {
      await run(
        `INSERT INTO visa_requests (
          id, user_id, registration_id, passport_name, passport_number, passport_expiry,
          date_of_birth, nationality, country_of_birth, gender, affiliation, designation,
          address, city, country, embassy_details, paper_id, paper_title,
          arrival_date, departure_date, additional_notes, status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, 'pending', ?, ?
        )`,
        [
          newId(),
          user.id,
          reg.id,
          passport_name,
          passport_number,
          passport_expiry,
          date_of_birth,
          nationality,
          country_of_birth,
          gender,
          affiliation,
          designation,
          address,
          city,
          country,
          embassy_details,
          paper_id,
          paper_title,
          arrival_date,
          departure_date,
          additional_notes,
          timestamp,
          timestamp,
        ]
      );
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/visa");
    return "Visa invitation letter request submitted successfully. It is now awaiting admin approval.";
  });
}

export async function updateVisaRequestStatusAction(fd: FormData) {
  const admin = await requireAdmin("/admin/visa");
  await ensureVisaTable();

  await guarded("/admin/visa", async () => {
    const id = str(fd, "id", 60);
    const status = str(fd, "status", 20) as VisaStatus;
    const admin_notes = str(fd, "admin_notes", 1000) || null;

    if (!id) throw new PortalError("Request ID is missing.");
    if (!["pending", "approved", "rejected"].includes(status)) {
      throw new PortalError("Invalid status.");
    }

    const req = await getVisaRequestById(id);
    if (!req) throw new PortalError("Visa request not found.");

    const timestamp = now();
    const approved_at = status === "approved" ? timestamp : null;
    const approved_by = status === "approved" ? admin.id : null;

    await run(
      `UPDATE visa_requests SET status = ?, admin_notes = ?, approved_at = ?, approved_by = ?, updated_at = ? WHERE id = ?`,
      [status, admin_notes, approved_at, approved_by, timestamp, id]
    );

    // Queue email notification if status changed to approved or rejected
    try {
      if (status === "approved") {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ic-etite-28final.vercel.app";
        const subject = `[ic-ETITE'28] Visa Invitation Letter Approved`;
        const body = `Dear ${req.passport_name},\n\nWe are pleased to inform you that your official Visa Invitation Letter for ic-ETITE'28 has been approved by the conference secretariat.\n\nYou can download your official letter (PDF) directly from your participant dashboard:\n${siteUrl}/dashboard/visa\n\nIf you have any questions or require additional embassy documentation, please reply to this email.\n\nWarm regards,\nic-ETITE'28 Conference Secretariat`;

        const outbox = outboxInsert({
          to: req.user_email,
          toName: req.passport_name,
          subject,
          html: emailLayout(subject, textToHtml(body)),
          scope: "conference",
          priority: 3,
        });
        await run(outbox.sql, outbox.params);
      } else if (status === "rejected") {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ic-etite-28final.vercel.app";
        const subject = `[ic-ETITE'28] Visa Letter Request Update`;
        const body = `Dear ${req.passport_name},\n\nYour request for an official Visa Invitation Letter has been reviewed by the conference committee and could not be approved at this time.\n\nReason / Notes: ${admin_notes || "Please verify your passport information and conference registration details."}\n\nYou can update your information and resubmit your request through your dashboard:\n${siteUrl}/dashboard/visa\n\nWarm regards,\nic-ETITE'28 Conference Secretariat`;

        const outbox = outboxInsert({
          to: req.user_email,
          toName: req.passport_name,
          subject,
          html: emailLayout(subject, textToHtml(body)),
          scope: "conference",
          priority: 3,
        });
        await run(outbox.sql, outbox.params);
      }
    } catch (e) {
      console.error("Failed to queue email notification for visa status update", e);
    }

    revalidatePath("/admin/visa");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/visa");
    return `Request for ${req.passport_name} updated to "${status}".`;
  });
}

export async function saveVisaTemplateAction(fd: FormData) {
  const admin = await requireAdmin("/admin/visa");

  await guarded("/admin/visa", async () => {
    const settings = await getSettings();
    const existing = settings.visa;

    const template: VisaTemplate = {
      refPrefix: str(fd, "refPrefix", 60) || existing.refPrefix,
      title: str(fd, "title", 120) || existing.title,
      conferenceTitle: str(fd, "conferenceTitle", 200) || existing.conferenceTitle,
      conferenceShortName: str(fd, "conferenceShortName", 60) || existing.conferenceShortName,
      organizer: str(fd, "organizer", 200) || existing.organizer,
      venue: str(fd, "venue", 200) || existing.venue,
      dates: str(fd, "dates", 100) || existing.dates,
      addressee: str(fd, "addressee", 500) || existing.addressee,
      openingText: str(fd, "openingText", 2000) || existing.openingText,
      paperText: str(fd, "paperText", 2000) || existing.paperText,
      purposeText: str(fd, "purposeText", 2000) || existing.purposeText,
      clearancesText: str(fd, "clearancesText", 2000) || existing.clearancesText,
      closingText: str(fd, "closingText", 2000) || existing.closingText,
      signatoryName: str(fd, "signatoryName", 120) || existing.signatoryName,
      signatoryTitle: str(fd, "signatoryTitle", 120) || existing.signatoryTitle,
      signatoryDept: str(fd, "signatoryDept", 150) || existing.signatoryDept,
      signatoryOrg: str(fd, "signatoryOrg", 150) || existing.signatoryOrg,
      signatoryEmail: str(fd, "signatoryEmail", 120) || existing.signatoryEmail,
      signatoryPhone: str(fd, "signatoryPhone", 60) || existing.signatoryPhone,
      notes: str(fd, "notes", 1000) || existing.notes,
    };

    await saveSetting("visa", template, admin.id);
    revalidatePath("/admin/visa");
    return "Visa letter template settings saved.";
  });
}
