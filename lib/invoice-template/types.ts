export type InvoiceFieldFont =
  | "Helvetica"
  | "Helvetica-Bold"
  | "Times-Roman"
  | "Times-Bold"
  | "Courier";

export type InvoiceFieldKey =
  | "invoice_number"
  | "date"
  | "bill_to_name"
  | "bill_to_email"
  | "bill_to_org"
  | "bill_to_address"
  | "bill_to_gstin"
  | "purpose"
  | "items"
  | "amount"
  | "amount_words"
  | "payment_ref"
  | "payment_status"
  | "org_name"
  | "org_details"
  | "signatory"
  | "notes"
  | "custom";

export interface InvoiceLayoutField {
  id: string;
  key: InvoiceFieldKey;
  label: string;
  x: number; // 0 to 1 normalized coordinate from left
  y: number; // 0 to 1 normalized coordinate from top
  font: InvoiceFieldFont;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  width?: number; // normalized width (0 to 1)
  multiline?: boolean;
  customText?: string;
}

export interface InvoiceLayout {
  fields: InvoiceLayoutField[];
}

export interface InvoiceTemplateRow {
  id: string;
  file_b64: string | null;
  preview_b64: string | null;
  mime: string;
  width: number;
  height: number;
  layout: string; // JSON string of InvoiceLayout
  updated_at: string;
}

export const INVOICE_FIELD_DEFINITIONS: {
  key: InvoiceFieldKey;
  label: string;
  defaultFont: InvoiceFieldFont;
  defaultFontSize: number;
  defaultColor: string;
  defaultAlign: "left" | "center" | "right";
  defaultWidth?: number;
  multiline?: boolean;
}[] = [
  { key: "org_name", label: "Issuer Organization", defaultFont: "Helvetica-Bold", defaultFontSize: 14, defaultColor: "#002147", defaultAlign: "left" },
  { key: "org_details", label: "Issuer Address & GSTIN", defaultFont: "Helvetica", defaultFontSize: 8.5, defaultColor: "#475569", defaultAlign: "left", multiline: true, defaultWidth: 0.42 },
  { key: "invoice_number", label: "Invoice Number", defaultFont: "Helvetica-Bold", defaultFontSize: 12, defaultColor: "#002147", defaultAlign: "right" },
  { key: "date", label: "Invoice Date", defaultFont: "Helvetica", defaultFontSize: 9, defaultColor: "#475569", defaultAlign: "right" },
  { key: "bill_to_name", label: "Billed To Name", defaultFont: "Helvetica-Bold", defaultFontSize: 10, defaultColor: "#0f172a", defaultAlign: "left" },
  { key: "bill_to_email", label: "Billed To Email", defaultFont: "Helvetica", defaultFontSize: 9, defaultColor: "#334155", defaultAlign: "left" },
  { key: "bill_to_org", label: "Billed To Organization", defaultFont: "Helvetica", defaultFontSize: 9, defaultColor: "#475569", defaultAlign: "left" },
  { key: "bill_to_address", label: "Billed To Address", defaultFont: "Helvetica", defaultFontSize: 8.5, defaultColor: "#64748b", defaultAlign: "left" },
  { key: "bill_to_gstin", label: "Billed To GSTIN", defaultFont: "Helvetica", defaultFontSize: 8.5, defaultColor: "#64748b", defaultAlign: "left" },
  { key: "purpose", label: "Event / Purpose", defaultFont: "Helvetica-Bold", defaultFontSize: 10, defaultColor: "#002147", defaultAlign: "left" },
  { key: "items", label: "Line Items & Description", defaultFont: "Helvetica", defaultFontSize: 9.5, defaultColor: "#1e293b", defaultAlign: "left", multiline: true, defaultWidth: 0.84 },
  { key: "amount", label: "Total Amount", defaultFont: "Helvetica-Bold", defaultFontSize: 13, defaultColor: "#002147", defaultAlign: "right" },
  { key: "amount_words", label: "Amount in Words", defaultFont: "Helvetica-Bold", defaultFontSize: 8.5, defaultColor: "#334155", defaultAlign: "left", multiline: true, defaultWidth: 0.84 },
  { key: "payment_ref", label: "Payment Reference / UTR", defaultFont: "Helvetica", defaultFontSize: 8.5, defaultColor: "#64748b", defaultAlign: "left" },
  { key: "payment_status", label: "Payment Status", defaultFont: "Helvetica-Bold", defaultFontSize: 10, defaultColor: "#15803d", defaultAlign: "right" },
  { key: "signatory", label: "Authorized Signatory", defaultFont: "Helvetica-Bold", defaultFontSize: 9.5, defaultColor: "#0f172a", defaultAlign: "right" },
  { key: "notes", label: "Notes & Terms", defaultFont: "Helvetica", defaultFontSize: 8, defaultColor: "#64748b", defaultAlign: "left", multiline: true, defaultWidth: 0.84 },
  { key: "custom", label: "Custom Field / Text", defaultFont: "Helvetica", defaultFontSize: 9, defaultColor: "#0f172a", defaultAlign: "left" },
];

export const DEFAULT_INVOICE_LAYOUT: InvoiceLayout = {
  fields: [
    { id: "f_org_name", key: "org_name", label: "Issuer Organization", x: 0.08, y: 0.08, font: "Helvetica-Bold", fontSize: 13, color: "#002147", align: "left" },
    { id: "f_org_details", key: "org_details", label: "Issuer Address & GSTIN", x: 0.08, y: 0.11, font: "Helvetica", fontSize: 8.5, color: "#475569", align: "left", multiline: true, width: 0.45 },
    { id: "f_num", key: "invoice_number", label: "Invoice Number", x: 0.72, y: 0.08, font: "Helvetica-Bold", fontSize: 12, color: "#002147", align: "right" },
    { id: "f_date", key: "date", label: "Invoice Date", x: 0.72, y: 0.11, font: "Helvetica", fontSize: 9, color: "#475569", align: "right" },
    { id: "f_bill_to", key: "bill_to_name", label: "Billed To Name", x: 0.08, y: 0.22, font: "Helvetica-Bold", fontSize: 10, color: "#0f172a", align: "left" },
    { id: "f_bill_email", key: "bill_to_email", label: "Billed To Email", x: 0.08, y: 0.25, font: "Helvetica", fontSize: 9, color: "#334155", align: "left" },
    { id: "f_bill_org", key: "bill_to_org", label: "Billed To Organization", x: 0.08, y: 0.28, font: "Helvetica", fontSize: 9, color: "#475569", align: "left" },
    { id: "f_purpose", key: "purpose", label: "Event / Purpose", x: 0.58, y: 0.22, font: "Helvetica-Bold", fontSize: 10, color: "#002147", align: "left" },
    { id: "f_items", key: "items", label: "Line Items & Description", x: 0.08, y: 0.42, font: "Helvetica", fontSize: 9.5, color: "#1e293b", align: "left", multiline: true, width: 0.84 },
    { id: "f_total", key: "amount", label: "Total Amount", x: 0.78, y: 0.65, font: "Helvetica-Bold", fontSize: 13, color: "#002147", align: "right" },
    { id: "f_words", key: "amount_words", label: "Amount in Words", x: 0.08, y: 0.69, font: "Helvetica-Bold", fontSize: 8.5, color: "#334155", align: "left", multiline: true, width: 0.84 },
    { id: "f_pay_ref", key: "payment_ref", label: "Payment Reference / UTR", x: 0.08, y: 0.74, font: "Helvetica", fontSize: 8.5, color: "#64748b", align: "left" },
    { id: "f_status", key: "payment_status", label: "Payment Status", x: 0.78, y: 0.74, font: "Helvetica-Bold", fontSize: 10, color: "#15803d", align: "right" },
    { id: "f_signatory", key: "signatory", label: "Authorized Signatory", x: 0.78, y: 0.88, font: "Helvetica-Bold", fontSize: 9.5, color: "#0f172a", align: "right" },
  ],
};

export const INVOICE_SAMPLE_VALUES = {
  invoice_number: "INV-2028-00042",
  date: "27 Nov 2026",
  bill_to_name: "Dr. Priya Sharma",
  bill_to_email: "priya.sharma@example.edu",
  bill_to_org: "Indian Institute of Technology Madras",
  bill_to_address: "Adyar, Chennai, Tamil Nadu 600036, India",
  bill_to_gstin: "33AAATV0000A1Z5",
  purpose: "ic-ETITE'28 Conference Registration",
  items: "1. Conference Registration — Faculty / Academician (Paper ID: #123) — INR 14,000.00",
  amount: "INR 14,000.00",
  amount_words: "Rupees Fourteen Thousand Only",
  payment_ref: "UTR98234710293",
  payment_status: "PAID / CONFIRMED",
  org_name: "Vellore Institute of Technology (VIT)",
  org_details: "School of Information Technology and Engineering (SITE)\nVellore - 632014, Tamil Nadu, India | GSTIN: 33AAATV0000A1Z2",
  signatory: "Finance Officer, ic-ETITE'28",
  notes: "This is a computer-generated tax invoice issued by VIT Vellore. Valid without signature.",
  custom: "Official Delegate Pass Included",
};

import type { InvoiceRow } from "@/lib/invoices";
import type { InvoiceTemplate } from "@/lib/settings";

export type InvoiceLike = Partial<InvoiceRow> & {
  amount_in_words?: string;
};

export function getInvoiceFieldValue(
  field: InvoiceLayoutField,
  inv?: InvoiceLike | null,
  tplSettings?: InvoiceTemplate | null,
  sampleMock = false
): string {
  if (field.customText && field.key === "custom") {
    return field.customText;
  }

  if (sampleMock || !inv) {
    if (field.key === "custom") return field.customText || INVOICE_SAMPLE_VALUES.custom;
    return (INVOICE_SAMPLE_VALUES as Record<string, string>)[field.key] || field.label;
  }

  switch (field.key) {
    case "invoice_number":
      return String(inv.number || INVOICE_SAMPLE_VALUES.invoice_number);
    case "date": {
      const d = inv.issued_at ? new Date(String(inv.issued_at)) : new Date();
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
    }
    case "bill_to_name":
      return String(inv.bill_name || "");
    case "bill_to_email":
      return String(inv.bill_email || "");
    case "bill_to_org":
      return String(inv.bill_org || "");
    case "bill_to_address":
      return String(inv.bill_address || "");
    case "bill_to_gstin":
      return inv.bill_gstin ? `GSTIN: ${inv.bill_gstin}` : "";
    case "purpose":
      return inv.purpose === "conference"
        ? "ic-ETITE'28 Conference Registration"
        : inv.purpose === "technext"
        ? "TechNext '28 Stall Booking"
        : "Event / Hackathon Registration";
    case "items": {
      try {
        const parsed = typeof inv.items === "string" ? JSON.parse(inv.items) : inv.items;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((it: { description?: string; amount?: number }, i: number) => `${i + 1}. ${it.description || "Registration"} — ${inv.currency === "USD" ? "$" : "₹"}${Number(it.amount || 0).toLocaleString()}`).join("\n");
        }
      } catch {}
      return String(inv.items || "");
    }
    case "amount": {
      const cur = String(inv.currency || "INR");
      const amt = Number(inv.amount) || 0;
      return `${cur} ${amt.toLocaleString(cur === "USD" ? "en-US" : "en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    case "amount_words":
      return String(inv.amount_in_words || INVOICE_SAMPLE_VALUES.amount_words);
    case "payment_ref":
      return inv.payment_ref ? `Ref / UTR: ${inv.payment_ref}` : "Payment Confirmed";
    case "payment_status":
      return "PAID / CONFIRMED";
    case "org_name":
      return String(tplSettings?.orgName || INVOICE_SAMPLE_VALUES.org_name);
    case "org_details": {
      const lines = [String(tplSettings?.orgAddress || "VIT Vellore, Tamil Nadu, India")];
      if (tplSettings?.gstin) lines.push(`GSTIN: ${tplSettings.gstin}`);
      if (tplSettings?.pan) lines.push(`PAN: ${tplSettings.pan}`);
      if (tplSettings?.email || tplSettings?.phone) lines.push([tplSettings.email, tplSettings.phone].filter(Boolean).join(" | "));
      return lines.join("\n");
    }
    case "signatory":
      return String(tplSettings?.signatory || "Authorised Signatory");
    case "notes":
      return String(tplSettings?.notes || INVOICE_SAMPLE_VALUES.notes);
    case "custom":
      return field.customText || "";
    default:
      return field.label;
  }
}
