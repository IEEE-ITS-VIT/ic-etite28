"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { guarded, str } from "@/lib/portal/actions";
import { PortalError } from "@/lib/portal/events";
import {
  DEFAULT_INVOICE_LAYOUT,
  type InvoiceLayout,
} from "@/lib/invoice-template/types";
import {
  deleteInvoiceTemplateRow,
  ensureInvoiceTemplatesTable,
  saveInvoiceTemplateRow,
} from "@/lib/invoice-template/server";

export async function saveInvoiceCanvasTemplateAction(fd: FormData) {
  const admin = await requireAdmin("/admin/invoices");
  await ensureInvoiceTemplatesTable();

  await guarded("/admin/invoices?tab=template", async () => {
    let layout: InvoiceLayout;
    try {
      layout = JSON.parse(String(fd.get("layout") ?? ""));
      if (!Array.isArray(layout.fields)) throw new Error();
    } catch {
      layout = DEFAULT_INVOICE_LAYOUT;
    }

    const file_b64 = String(fd.get("file_b64") ?? "").trim();
    const preview_b64 = String(fd.get("preview_b64") ?? "").trim();
    const mime = str(fd, "mime", 40) || "application/pdf";
    const width = Number(fd.get("width")) || 595;
    const height = Number(fd.get("height")) || 842;

    if (file_b64) {
      if (file_b64.length > 2_500_000) {
        throw new PortalError("Template file is too large. Please upload a file under 1.8 MB.");
      }

      await saveInvoiceTemplateRow({
        id: "default",
        file_b64,
        preview_b64: preview_b64 || null,
        mime,
        width,
        height,
        layout: JSON.stringify(layout),
      });
    } else {
      await saveInvoiceTemplateRow({
        id: "default",
        layout: JSON.stringify(layout),
      });
    }

    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: admin.id,
        userEmail: admin.email,
        userName: admin.name,
        action: "invoice.template_update",
        category: "settings",
        path: "/admin/invoices",
        details: "Updated visual invoice template drag-and-drop layout and stationery background",
      });
    } catch {}

    revalidatePath("/admin/invoices");
    return "Invoice template layout and field positions saved successfully.";
  });
}

export async function deleteInvoiceCanvasTemplateAction(_fd: FormData) {
  const admin = await requireAdmin("/admin/invoices");
  await ensureInvoiceTemplatesTable();

  await guarded("/admin/invoices?tab=template", async () => {
    await deleteInvoiceTemplateRow("default");

    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        userId: admin.id,
        userEmail: admin.email,
        userName: admin.name,
        action: "invoice.template_delete",
        category: "settings",
        path: "/admin/invoices",
        details: "Deleted visual invoice template, reverted to standard invoice layout",
      });
    } catch {}

    revalidatePath("/admin/invoices");
    return "Uploaded template removed. Reverted to standard invoice layout.";
  });
}
