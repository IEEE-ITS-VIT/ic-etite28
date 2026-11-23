import { NextResponse, type NextRequest } from "next/server";
import { first } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const row = await first<{ preview_b64: string | null; file_b64: string | null; mime: string }>(
    "SELECT preview_b64, file_b64, mime FROM visa_templates WHERE id = 'default'"
  );

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (row.preview_b64) {
    const raw = Buffer.from(row.preview_b64, "base64");
    return new NextResponse(raw, {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "private, max-age=60",
      },
    });
  }

  if (row.file_b64 && row.mime.startsWith("image/")) {
    const raw = Buffer.from(row.file_b64, "base64");
    return new NextResponse(raw, {
      headers: {
        "content-type": row.mime,
        "cache-control": "private, max-age=60",
      },
    });
  }

  return NextResponse.json({ error: "No image preview available" }, { status: 404 });
}
