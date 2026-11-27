import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getInvoiceTemplateRow } from "@/lib/invoice-template/server";

export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tpl = await getInvoiceTemplateRow("default");
  if (!tpl || (!tpl.preview_b64 && !tpl.file_b64)) {
    return NextResponse.json({ error: "No template uploaded" }, { status: 404 });
  }

  const b64 = tpl.preview_b64 || tpl.file_b64;
  const mime = tpl.preview_b64 ? "image/jpeg" : tpl.mime;
  const buffer = Buffer.from(b64!, "base64");

  return new NextResponse(buffer, {
    headers: {
      "content-type": mime,
      "cache-control": "no-store",
    },
  });
}
