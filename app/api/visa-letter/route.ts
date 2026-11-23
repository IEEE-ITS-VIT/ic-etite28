import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { first } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { renderVisaLetterPdf } from "@/lib/visa/render";
import { ensureVisaTable, getVisaRequestById, getVisaRequestForUser, getVisaTemplateRow } from "@/lib/visa/server";
import { safeFilename } from "@/lib/certificates/render";
import type { VisaRequestRow } from "@/lib/visa/types";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to access your visa letter." }, { status: 401 });
  }

  await ensureVisaTable();
  const [settings, tplRow] = await Promise.all([getSettings(), getVisaTemplateRow()]);
  const searchParams = req.nextUrl.searchParams;
  const requestId = searchParams.get("id");
  const isPreview = searchParams.get("preview") === "1";
  const isInline = searchParams.get("inline") === "1";

  // 1. Admin Preview Mode with Sample Data
  if (user.role === "admin" && isPreview) {
    const sampleReq: VisaRequestRow = {
      id: "PREVIEW12345",
      user_id: user.id,
      registration_id: "CONF-REG-SAMPLE-01",
      passport_name: "Dr. Alexander von Humboldt",
      passport_number: "P123456789",
      passport_expiry: "2031-10-15",
      date_of_birth: "1988-06-22",
      nationality: "German",
      country_of_birth: "Germany",
      gender: "Male",
      affiliation: "Technical University of Munich (TUM)",
      designation: "Associate Professor",
      address: "Arcisstrasse 21, 80333 Munich",
      city: "Munich",
      country: "Germany",
      embassy_details: "Consulate General of India, Frankfurt\nKohlstrasse 8, Frankfurt am Main, Germany",
      paper_id: "ETITE-2028-402",
      paper_title: "Deep Reinforcement Learning in Low-Latency Autonomous Edge Robotics",
      arrival_date: "08 February 2028",
      departure_date: "13 February 2028",
      additional_notes: "Sample preview for template configuration.",
      status: "approved",
      admin_notes: null,
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const pdfBytes = await renderVisaLetterPdf(sampleReq, tplRow, { preview: true });
    const disposition = isInline ? "inline" : 'attachment; filename="Visa_Invitation_Letter_Sample.pdf"';

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": disposition,
        "cache-control": "no-store, must-revalidate",
      },
    });
  }

  // 2. Admin viewing/downloading for a specific request ID
  let targetReq: VisaRequestRow | null = null;

  if (user.role === "admin" && requestId) {
    targetReq = await getVisaRequestById(requestId);
    if (!targetReq) {
      return NextResponse.json({ error: "Visa letter request not found." }, { status: 404 });
    }
  } else {
    // 3. Regular user accessing their own visa letter
    // Only registered conference attendees have access
    const reg = await first<{ id: string; status: string }>(
      "SELECT id, status FROM conference_registrations WHERE user_id = ?",
      [user.id]
    );

    if (!reg) {
      return NextResponse.json(
        { error: "Access denied. Only registered conference participants can request or download a visa letter." },
        { status: 403 }
      );
    }

    targetReq = await getVisaRequestForUser(user.id);
    if (!targetReq) {
      return NextResponse.json(
        { error: "No visa invitation letter request found for your account." },
        { status: 404 }
      );
    }

    if (user.role !== "admin" && targetReq.status !== "approved") {
      return NextResponse.json(
        {
          error:
            targetReq.status === "pending"
              ? "Your visa letter request is currently pending admin approval."
              : `Your visa letter request was not approved (${targetReq.admin_notes || "rejected"}).`,
        },
        { status: 403 }
      );
    }
  }

  // 4. Generate the PDF dynamically on demand from inputs (never stored)
  const pdfBytes = await renderVisaLetterPdf(targetReq, tplRow);
  const cleanName = safeFilename(targetReq.passport_name || "delegate");
  const filename = `Visa_Invitation_Letter_${cleanName}.pdf`;
  const disposition = isInline ? `inline; filename="${filename}"` : `attachment; filename="${filename}"`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": disposition,
      "cache-control": "private, no-store, must-revalidate",
    },
  });
}
