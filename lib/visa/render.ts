import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { toWinAnsi } from "@/lib/certificates/render";
import type {
  VisaFieldFont,
  VisaLayout,
  VisaLayoutField,
  VisaRequestRow,
  VisaTemplate,
  VisaTemplateRow,
} from "@/lib/visa/types";
import { DEFAULT_VISA_LAYOUT } from "@/lib/visa/types";

const NAVY = rgb(0, 33 / 255, 71 / 255);
const GOLD = rgb(255 / 255, 184 / 255, 28 / 255);
const WHITE = rgb(1, 1, 1);
const MUTED = rgb(0.38, 0.44, 0.52);

const FONT_MAP: Record<VisaFieldFont, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  "Helvetica-Bold": StandardFonts.HelveticaBold,
  "Times-Roman": StandardFonts.TimesRoman,
  "Times-Bold": StandardFonts.TimesRomanBold,
  "Times-Italic": StandardFonts.TimesRomanItalic,
  Courier: StandardFonts.Courier,
};

export function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
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

import { formatDate, getVisaFieldValue } from "@/lib/visa/format";
export { formatDate, getVisaFieldValue };

export async function renderVisaLetterPdf(
  req: VisaRequestRow,
  tplRow?: VisaTemplateRow | null,
  options?: { preview?: boolean }
): Promise<Uint8Array> {
  return renderVisaLetterWithTemplate(req, tplRow ?? null, options);
}

async function drawDefaultHeader(
  doc: PDFDocument,
  page: PDFPage,
  width: number,
  height: number,
  isPreview?: boolean
) {
  const headerH = 76;
  const M = 40;
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: NAVY });
  page.drawRectangle({ x: 0, y: height - headerH - 3, width, height: 3, color: GOLD });

  try {
    const logoBytes = await readFile(join(process.cwd(), "public/logos/ic-etite28-cropped-transparent.png"));
    const logoImg = await doc.embedPng(logoBytes);
    const lh = 36;
    const lw = (logoImg.width / logoImg.height) * lh;
    page.drawImage(logoImg, { x: M, y: height - headerH + (headerH - lh) / 2, width: lw, height: lh });
  } catch {
    page.drawText("ic-ETITE'28", { x: M, y: height - 38, size: 18, font: bold, color: WHITE });
  }

  page.drawText("VELLORE INSTITUTE OF TECHNOLOGY (VIT)", { x: M + 55, y: height - 28, size: 12, font: bold, color: WHITE });
  page.drawText(
    "3rd International Conference on Emerging Trends in Information Technology & Engineering (ic-ETITE'28)",
    { x: M + 55, y: height - 42, size: 8.5, font: bold, color: GOLD }
  );
  page.drawText(
    "School of Information Technology and Engineering (SITE) · Vellore, Tamil Nadu, India",
    { x: M + 55, y: height - 55, size: 7.5, font, color: rgb(0.85, 0.89, 0.95) }
  );

  if (isPreview) {
    page.drawText("[ TEMPLATE PREVIEW - SAMPLE DATA ]", {
      x: width - M - 170,
      y: height - 30,
      size: 8.5,
      font: bold,
      color: GOLD,
    });
  }

  // Bottom footer note
  page.drawLine({
    start: { x: M, y: 38 },
    end: { x: width - M, y: 38 },
    thickness: 0.6,
    color: rgb(0.85, 0.88, 0.93),
  });

  page.drawText(
    "Conference Secretariat: VIT Vellore, Tamil Nadu 632014, India · Web: https://ic-etite28.vercel.app · Email: icetiteconference@vit.ac.in",
    { x: M, y: 26, size: 7, font, color: MUTED }
  );
  page.drawText(
    "This official document is generated for verified conference registrants. For authenticity verification, contact the secretariat.",
    { x: M, y: 16, size: 6.5, font, color: MUTED }
  );
}

export async function renderVisaLetterWithTemplate(
  req: VisaRequestRow,
  tplRow: VisaTemplateRow | null,
  options?: { preview?: boolean }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Visa Invitation Letter - ${toWinAnsi(req.passport_name || "Delegate")}`);
  doc.setCreator("ic-ETITE'28 Organizing Committee");
  doc.setProducer("Vellore Institute of Technology");

  let page: PDFPage;
  let pageWidth = 595.28;
  let pageHeight = 841.89;

  // 1. Base Layer (Uploaded PDF, Uploaded Image, or Default Letterhead)
  if (tplRow?.file_b64) {
    const rawBytes = Buffer.from(tplRow.file_b64, "base64");
    if (tplRow.mime === "application/pdf") {
      const baseDoc = await PDFDocument.load(rawBytes);
      const [copied] = await doc.copyPages(baseDoc, [0]);
      page = doc.addPage(copied);
      const sz = page.getSize();
      pageWidth = sz.width;
      pageHeight = sz.height;
    } else {
      const img = tplRow.mime === "image/png" ? await doc.embedPng(rawBytes) : await doc.embedJpg(rawBytes);
      page = doc.addPage([pageWidth, pageHeight]);
      page.drawImage(img, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    }
  } else {
    page = doc.addPage([pageWidth, pageHeight]);
    await drawDefaultHeader(doc, page, pageWidth, pageHeight, options?.preview);
  }

  // 2. Parse Layout
  let layout: VisaLayout = DEFAULT_VISA_LAYOUT;
  if (tplRow?.layout) {
    try {
      const parsed = JSON.parse(tplRow.layout) as VisaLayout;
      if (Array.isArray(parsed?.fields)) layout = parsed;
    } catch {}
  }

  // 3. Draw Placed Fields onto the Page
  const fontCache = new Map<VisaFieldFont, PDFFont>();

  for (const field of layout.fields) {
    if (!field.enabled) continue;
    const rawText = getVisaFieldValue(field, req, options?.preview);
    const textStr = toWinAnsi(rawText);
    if (!textStr.trim()) continue;

    let font = fontCache.get(field.font);
    if (!font) {
      font = await doc.embedFont(FONT_MAP[field.font] ?? StandardFonts.Helvetica);
      fontCache.set(field.font, font);
    }

    const anchorX = field.x * pageWidth;
    const anchorY = pageHeight - field.y * pageHeight;
    const color = hexToRgb(field.color || "#101B2E");
    const maxW = field.width && field.width > 0 ? field.width : pageWidth - anchorX - 20;

    const lines = field.width && field.width > 0 ? wrap(textStr, font, field.size, maxW) : textStr.split("\n");
    let lineY = anchorY;
    const lineHeight = field.size * 1.35;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        lineY -= lineHeight * 0.6;
        continue;
      }
      let sz = field.size;
      while (sz > 6 && font.widthOfTextAtSize(line, sz) > pageWidth * 0.94) {
        sz -= 0.5;
      }
      const tw = font.widthOfTextAtSize(line, sz);
      const x = field.align === "center" ? anchorX - tw / 2 : field.align === "right" ? anchorX - tw : anchorX;
      page.drawText(line, { x, y: lineY, size: sz, font, color });
      lineY -= lineHeight;
    }
  }

  return doc.save();
}
