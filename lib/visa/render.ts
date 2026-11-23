import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { toWinAnsi } from "@/lib/certificates/render";
import type { VisaRequestRow, VisaTemplate } from "@/lib/visa/types";

const NAVY = rgb(0, 33 / 255, 71 / 255);
const NAVY_DARK = rgb(0, 23 / 255, 51 / 255);
const GOLD = rgb(255 / 255, 184 / 255, 28 / 255);
const INK = rgb(0.12, 0.16, 0.23);
const MUTED = rgb(0.38, 0.44, 0.52);
const BORDER = rgb(0.85, 0.88, 0.93);
const CARD_BG = rgb(0.97, 0.98, 0.995);
const WHITE = rgb(1, 1, 1);

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of toWinAnsi(text).split("\n")) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export function fillVisaPlaceholders(text: string, req: VisaRequestRow, tpl: VisaTemplate): string {
  const map: Record<string, string> = {
    name: req.passport_name,
    passportNumber: req.passport_number,
    passportExpiry: req.passport_expiry,
    nationality: req.nationality,
    countryOfBirth: req.country_of_birth || req.nationality,
    dob: req.date_of_birth,
    gender: req.gender || "Unspecified",
    affiliation: req.affiliation,
    designation: req.designation || "Delegate",
    country: req.country,
    paperId: req.paper_id || "N/A",
    paperTitle: req.paper_title || "Technical Session Presentation",
    registrationRef: req.registration_id,
    conferenceTitle: tpl.conferenceTitle,
    conferenceShortName: tpl.conferenceShortName,
    dates: tpl.dates,
    venue: tpl.venue,
    organizer: tpl.organizer,
    arrivalDate: req.arrival_date || "February 2028",
    departureDate: req.departure_date || "February 2028",
    embassy: req.embassy_details || "Embassy / Consulate General of India",
  };

  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => map[k] ?? "");
}

function formatDate(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export async function renderVisaLetterPdf(
  req: VisaRequestRow,
  tpl: VisaTemplate,
  options?: { preview?: boolean }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Visa Invitation Letter - ${toWinAnsi(req.passport_name)}`);
  doc.setCreator(`${tpl.conferenceShortName} Organizing Committee`);
  doc.setProducer("Vellore Institute of Technology");

  const page: PDFPage = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const M = 40; // margin
  const contentW = width - 2 * M;

  const text = (s: string, x: number, y: number, size = 9, f = font, color = INK) =>
    page.drawText(toWinAnsi(s), { x, y, size, font: f, color });

  const right = (s: string, xr: number, y: number, size = 9, f = font, color = INK) =>
    page.drawText(toWinAnsi(s), { x: xr - f.widthOfTextAtSize(toWinAnsi(s), size), y, size, font: f, color });

  // 1. Top Header Banner
  const headerH = 76;
  page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: NAVY });
  page.drawRectangle({ x: 0, y: height - headerH - 3, width, height: 3, color: GOLD });

  // Try embedding the conference logo
  try {
    const logoBytes = await readFile(join(process.cwd(), "public/logos/ic-etite28-cropped-transparent.png"));
    const logoImg = await doc.embedPng(logoBytes);
    const lh = 36;
    const lw = (logoImg.width / logoImg.height) * lh;
    page.drawImage(logoImg, { x: M, y: height - headerH + (headerH - lh) / 2, width: lw, height: lh });
  } catch {
    text(tpl.conferenceShortName, M, height - 38, 18, bold, WHITE);
  }

  // Header Titles
  text("VELLORE INSTITUTE OF TECHNOLOGY (VIT)", M + 55, height - 28, 12, bold, WHITE);
  text(tpl.conferenceTitle, M + 55, height - 42, 8.5, bold, GOLD);
  text("School of Information Technology and Engineering (SITE) · Vellore, Tamil Nadu, India", M + 55, height - 55, 7.5, font, rgb(0.85, 0.89, 0.95));

  // Preview Watermark if needed
  if (options?.preview) {
    text("[ TEMPLATE PREVIEW - SAMPLE DATA ]", width - M - 170, height - 30, 8.5, bold, GOLD);
  }

  let y = height - headerH - 24;

  // 2. Reference & Date Line
  const refNo = `${tpl.refPrefix}/${new Date().getFullYear()}/${req.id.replace(/[^\w]/g, "").slice(0, 6).toUpperCase()}`;
  const issueDate = formatDate(req.approved_at || req.created_at);

  text(`Ref: ${refNo}`, M, y, 9, bold, NAVY);
  right(`Date: ${issueDate}`, width - M, y, 9, bold, INK);

  y -= 18;

  // 3. Addressee Block
  const addresseeLines = wrap(req.embassy_details?.trim() || tpl.addressee, font, 9, contentW / 2);
  for (const line of addresseeLines) {
    if (line) {
      text(line, M, y, 9, font, INK);
      y -= 12;
    }
  }

  y -= 8;

  // 4. Subject Line with background highlight
  const subjectText = `SUBJECT: ${toWinAnsi(tpl.title).toUpperCase()}`;
  page.drawRectangle({
    x: M,
    y: y - 4,
    width: contentW,
    height: 20,
    color: CARD_BG,
    borderColor: BORDER,
    borderWidth: 0.8,
  });
  page.drawRectangle({ x: M, y: y - 4, width: 3.5, height: 20, color: NAVY });
  text(subjectText, M + 10, y + 2, 9.5, bold, NAVY);

  y -= 20;

  // 5. Salutation & Opening Text
  text("Dear Visa / Consular Officer,", M, y, 9, font, INK);
  y -= 14;

  const openingStr = fillVisaPlaceholders(tpl.openingText, req, tpl);
  for (const line of wrap(openingStr, font, 8.5, contentW)) {
    text(line, M, y, 8.5, font, INK);
    y -= 12;
  }

  y -= 6;

  // 6. Applicant Details Box (Structured Grid)
  const boxTop = y;
  const col1X = M + 8;
  const col2X = M + 265;
  const valOffset = 100;

  // Compute row data
  const gridRows: [string, string, string, string][] = [
    [
      "Full Name:",
      req.passport_name,
      "Nationality:",
      req.nationality,
    ],
    [
      "Passport Number:",
      req.passport_number,
      "Passport Expiry:",
      req.passport_expiry,
    ],
    [
      "Date of Birth:",
      req.date_of_birth,
      "Gender:",
      req.gender ? req.gender.charAt(0).toUpperCase() + req.gender.slice(1) : "N/A",
    ],
    [
      "Affiliation:",
      req.affiliation,
      "Designation:",
      req.designation || "Conference Delegate",
    ],
    [
      "Country of Res.:",
      req.country,
      "Registration ID:",
      req.registration_id,
    ],
  ];

  if (req.paper_id || req.paper_title) {
    gridRows.push([
      "Accepted Paper ID:",
      req.paper_id || "N/A",
      "Presentation:",
      "Oral Technical Session",
    ]);
  }

  const rowHeight = 15;
  const boxH = gridRows.length * rowHeight + 14;

  page.drawRectangle({
    x: M,
    y: boxTop - boxH,
    width: contentW,
    height: boxH,
    color: CARD_BG,
    borderColor: BORDER,
    borderWidth: 0.8,
  });

  let rowY = boxTop - 15;
  for (const [l1, v1, l2, v2] of gridRows) {
    text(l1, col1X, rowY, 8, bold, MUTED);
    text(v1.length > 28 ? `${v1.slice(0, 26)}...` : v1, col1X + valOffset, rowY, 8, bold, NAVY);

    text(l2, col2X, rowY, 8, bold, MUTED);
    text(v2.length > 28 ? `${v2.slice(0, 26)}...` : v2, col2X + valOffset - 10, rowY, 8, bold, NAVY);

    rowY -= rowHeight;
  }

  y = boxTop - boxH - 12;

  // 7. Paper Details (if author)
  if (req.paper_id || req.paper_title) {
    const paperStr = fillVisaPlaceholders(tpl.paperText, req, tpl);
    for (const line of wrap(paperStr, font, 8.5, contentW)) {
      text(line, M, y, 8.5, font, INK);
      y -= 11.5;
    }
    y -= 3;
  }

  // 8. Purpose of Visit & Expenses
  const purposeStr = fillVisaPlaceholders(tpl.purposeText, req, tpl);
  for (const line of wrap(purposeStr, font, 8.5, contentW)) {
    text(line, M, y, 8.5, font, INK);
    y -= 11.5;
  }
  y -= 3;

  // 9. Statutory Clearances (Government of India)
  const clearancesStr = fillVisaPlaceholders(tpl.clearancesText, req, tpl);
  for (const line of wrap(clearancesStr, font, 8.5, contentW)) {
    text(line, M, y, 8.5, font, INK);
    y -= 11.5;
  }
  y -= 3;

  // 10. Closing Request Statement
  const closingStr = fillVisaPlaceholders(tpl.closingText, req, tpl);
  for (const line of wrap(closingStr, font, 8.5, contentW)) {
    text(line, M, y, 8.5, bold, NAVY);
    y -= 11.5;
  }

  y -= 10;

  // 11. Signatory Block & Official Stamp (Dual Column)
  const sigY = y;
  text("Yours sincerely,", M, sigY, 9, font, INK);

  // Left column: Signatory
  let curSigY = sigY - 18;
  text(tpl.signatoryName, M, curSigY, 9.5, bold, NAVY_DARK);
  curSigY -= 12;
  text(tpl.signatoryTitle, M, curSigY, 8.5, bold, INK);
  curSigY -= 11;
  text(tpl.signatoryDept, M, curSigY, 8, font, INK);
  curSigY -= 11;
  text(tpl.signatoryOrg, M, curSigY, 8, font, INK);
  curSigY -= 11;
  text(`Email: ${tpl.signatoryEmail} | Tel: ${tpl.signatoryPhone}`, M, curSigY, 8, font, MUTED);

  // Right column: Official Verification Stamp
  const stampW = 180;
  const stampH = 68;
  const stampX = width - M - stampW;
  const stampY = sigY - stampH + 5;

  page.drawRectangle({
    x: stampX,
    y: stampY,
    width: stampW,
    height: stampH,
    color: CARD_BG,
    borderColor: NAVY,
    borderWidth: 1.2,
  });

  page.drawRectangle({
    x: stampX + 3,
    y: stampY + 3,
    width: stampW - 6,
    height: stampH - 6,
    borderColor: GOLD,
    borderWidth: 0.8,
  });

  page.drawText("OFFICIAL INVITATION SEAL", {
    x: stampX + (stampW - bold.widthOfTextAtSize("OFFICIAL INVITATION SEAL", 7.5)) / 2,
    y: stampY + stampH - 16,
    size: 7.5,
    font: bold,
    color: NAVY,
  });

  page.drawText("ic-ETITE'28 · VIT VELLORE", {
    x: stampX + (stampW - bold.widthOfTextAtSize("ic-ETITE'28 · VIT VELLORE", 8)) / 2,
    y: stampY + stampH - 30,
    size: 8,
    font: bold,
    color: INK,
  });

  page.drawText("STATUTORY CLEARANCE APPROVED", {
    x: stampX + (stampW - font.widthOfTextAtSize("STATUTORY CLEARANCE APPROVED", 6.5)) / 2,
    y: stampY + stampH - 43,
    size: 6.5,
    font,
    color: MUTED,
  });

  const verifiedCode = `VERIFIED: ${req.id.slice(0, 10).toUpperCase()}`;
  page.drawText(verifiedCode, {
    x: stampX + (stampW - bold.widthOfTextAtSize(verifiedCode, 7)) / 2,
    y: stampY + stampH - 56,
    size: 7,
    font: bold,
    color: NAVY,
  });

  // 12. Bottom Footer
  page.drawLine({
    start: { x: M, y: 38 },
    end: { x: width - M, y: 38 },
    thickness: 0.6,
    color: BORDER,
  });

  text(
    "Conference Secretariat: VIT Vellore, Tamil Nadu 632014, India · Website: https://ic-etite28.vercel.app · Email: icetiteconference@vit.ac.in",
    M,
    26,
    7,
    font,
    MUTED
  );
  text(
    "This official document is generated for verified conference registrants. For authenticity verification, contact the secretariat.",
    M,
    16,
    6.5,
    italic,
    MUTED
  );

  return doc.save();
}
