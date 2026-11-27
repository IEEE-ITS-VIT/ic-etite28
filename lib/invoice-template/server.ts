import "server-only";
import { first, now, run } from "@/lib/db";
import type { InvoiceTemplateRow } from "./types";

export async function ensureInvoiceTemplatesTable() {
  await run(`CREATE TABLE IF NOT EXISTS invoice_templates (
    id           TEXT PRIMARY KEY,
    file_b64     TEXT,
    preview_b64  TEXT,
    mime         TEXT NOT NULL DEFAULT 'application/pdf',
    width        INTEGER NOT NULL DEFAULT 595,
    height       INTEGER NOT NULL DEFAULT 842,
    layout       TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  )`);
}

export async function getInvoiceTemplateRow(id = "default"): Promise<InvoiceTemplateRow | null> {
  await ensureInvoiceTemplatesTable();
  return (await first<InvoiceTemplateRow>("SELECT * FROM invoice_templates WHERE id = ?", [id])) || null;
}

export async function saveInvoiceTemplateRow(data: {
  id?: string;
  file_b64?: string | null;
  preview_b64?: string | null;
  mime?: string;
  width?: number;
  height?: number;
  layout: string;
}) {
  await ensureInvoiceTemplatesTable();
  const id = data.id || "default";
  const timestamp = now();
  const mime = data.mime || "application/pdf";
  const width = data.width || 595;
  const height = data.height || 842;

  if (data.file_b64 !== undefined) {
    await run(
      `INSERT INTO invoice_templates (id, file_b64, preview_b64, mime, width, height, layout, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         file_b64 = excluded.file_b64,
         preview_b64 = excluded.preview_b64,
         mime = excluded.mime,
         width = excluded.width,
         height = excluded.height,
         layout = excluded.layout,
         updated_at = excluded.updated_at`,
      [id, data.file_b64, data.preview_b64 ?? null, mime, width, height, data.layout, timestamp]
    );
  } else {
    const existing = await first<{ id: string }>("SELECT id FROM invoice_templates WHERE id = ?", [id]);
    if (existing) {
      await run("UPDATE invoice_templates SET layout = ?, updated_at = ? WHERE id = ?", [data.layout, timestamp, id]);
    } else {
      await run(
        `INSERT INTO invoice_templates (id, file_b64, preview_b64, mime, width, height, layout, updated_at)
         VALUES (?, null, null, 'application/pdf', 595, 842, ?, ?)`,
        [id, data.layout, timestamp]
      );
    }
  }
}

export async function deleteInvoiceTemplateRow(id = "default") {
  await ensureInvoiceTemplatesTable();
  await run("DELETE FROM invoice_templates WHERE id = ?", [id]);
}
