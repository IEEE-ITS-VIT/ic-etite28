import "server-only";
import { PDFDocument, PDFPage, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { toWinAnsi } from "@/lib/certificates/render";
import type { InvoiceRow } from "@/lib/invoices";
import type { InvoiceTemplate } from "@/lib/settings";
import {
  DEFAULT_INVOICE_LAYOUT,
  getInvoiceFieldValue,
  type InvoiceFieldFont,
  type InvoiceLayout,
  type InvoiceTemplateRow,
} from "./types";

const FONT_MAP: Record<InvoiceFieldFont, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  "Helvetica-Bold": StandardFonts.HelveticaBold,
  "Times-Roman": StandardFonts.TimesRoman,
  "Times-Bold": StandardFonts.TimesRomanBold,
  Courier: StandardFonts.Courier,
};

const NAVY = rgb(0, 33 / 255, 71 / 255);
const GOLD = rgb(1, 184 / 255, 28 / 255);
const WHITE = rgb(1, 1, 1);

export function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
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

export async function renderInvoicePdfWithTemplate(
  inv: InvoiceRow,
  tplRow: InvoiceTemplateRow | null,
  tplSettings?: InvoiceTemplate | null,
  options?: { preview?: boolean }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Invoice - ${toWinAnsi(inv.number || "Document")}`);
  doc.setCreator("ic-ETITE'28 Organizing Committee");
  doc.setProducer("Vellore Institute of Technology");

  let page: PDFPage;
  let pageWidth = 595.28;
  let pageHeight = 841.89;

  // 1. Base Layer (Uploaded PDF stationery, Uploaded Image, or Default Letterhead)
  if (tplRow?.file_b64) {
    const rawBytes = Buffer.from(tplRow.file_b64, "base64");
    if (tplRow.mime === "application/pdf") {
      const baseDoc = await PDFDocument.load(rawBytes);
      const [copiedPage] = await doc.copyPages(baseDoc, [0]);
      page = doc.addPage(copiedPage);
      const size = page.getSize();
      pageWidth = size.width;
      pageHeight = size.height;
    } else {
      page = doc.addPage([tplRow.width || pageWidth, tplRow.height || pageHeight]);
      pageWidth = page.getWidth();
      pageHeight = page.getHeight();
      try {
        const img =
          tplRow.mime === "image/png"
            ? await doc.embedPng(rawBytes)
            : await doc.embedJpg(rawBytes);
        page.drawImage(img, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      } catch (err) {
        console.error("Failed to embed invoice template background image", err);
      }
    }
  } else {
    // Default Clean Header & Frame
    page = doc.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ x: 0, y: pageHeight - 90, width: pageWidth, height: 90, color: NAVY });
    page.drawRectangle({ x: 0, y: pageHeight - 94, width: pageWidth, height: 4, color: GOLD });

    try {
      const logoBytes = await readFile(join(process.cwd(), "public/logos/ic-etite28-cropped-transparent.png"));
      const logoImg = await doc.embedPng(logoBytes);
      const lh = 34;
      const lw = (logoImg.width / logoImg.height) * lh;
      page.drawImage(logoImg, { x: 44, y: pageHeight - 64, width: lw, height: lh });
    } catch {
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);
      page.drawText("ic-ETITE'28", { x: 44, y: pageHeight - 55, size: 20, font: bold, color: WHITE });
    }

    if (options?.preview) {
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);
      page.drawText("[ INVOICE TEMPLATE PREVIEW ]", {
        x: pageWidth - 210,
        y: pageHeight - 32,
        size: 8.5,
        font: bold,
        color: GOLD,
      });
    }

    // Bottom border band
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: 26, color: NAVY });
  }

  // 2. Parse Layout Fields
  let layout: InvoiceLayout = DEFAULT_INVOICE_LAYOUT;
  if (tplRow?.layout) {
    try {
      const parsed = JSON.parse(tplRow.layout);
      if (Array.isArray(parsed?.fields)) layout = parsed;
    } catch {}
  }

  // Cache embedded fonts
  const fontCache: Record<string, PDFFont> = {};
  for (const f of layout.fields) {
    const fontName = FONT_MAP[f.font] || StandardFonts.Helvetica;
    if (!fontCache[fontName]) {
      fontCache[fontName] = await doc.embedFont(fontName);
    }
  }

  // 3. Render each positioned field
  for (const field of layout.fields) {
    const val = getInvoiceFieldValue(field, inv, tplSettings, Boolean(options?.preview));
    if (!val) continue;

    const fontName = FONT_MAP[field.font] || StandardFonts.Helvetica;
    const font = fontCache[fontName];
    const fontSize = Number(field.fontSize) || 10;
    const color = hexToRgb(field.color || "#000000");

    // Convert normalized coordinates (0 to 1) into PDF points (origin bottom-left)
    const px = field.x * pageWidth;
    const py = pageHeight - field.y * pageHeight - fontSize;
    const fieldWidth = (field.width ? field.width * pageWidth : pageWidth * 0.84);

    if (field.multiline || val.includes("\n")) {
      const lines = wrapText(val, font, fontSize, fieldWidth);
      const lineHeight = fontSize * 1.25;
      lines.forEach((line, idx) => {
        const textY = py - idx * lineHeight;
        if (textY < 10) return; // avoid overflowing bottom of page

        let textX = px;
        const lineW = font.widthOfTextAtSize(toWinAnsi(line), fontSize);
        if (field.align === "center") {
          textX = px - lineW / 2;
        } else if (field.align === "right") {
          textX = px - lineW;
        }

        page.drawText(toWinAnsi(line), {
          x: Math.max(10, Math.min(pageWidth - lineW - 10, textX)),
          y: textY,
          size: fontSize,
          font,
          color,
        });
      });
    } else {
      const safeText = toWinAnsi(val);
      const textW = font.widthOfTextAtSize(safeText, fontSize);
      let textX = px;
      if (field.align === "center") {
        textX = px - textW / 2;
      } else if (field.align === "right") {
        textX = px - textW;
      }

      page.drawText(safeText, {
        x: Math.max(10, Math.min(pageWidth - textW - 10, textX)),
        y: py,
        size: fontSize,
        font,
        color,
      });
    }
  }

  return doc.save();
}
