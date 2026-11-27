import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { logAudit, type AuditCategory } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action.slice(0, 80) : "admin.click";
    const category = (typeof body.category === "string" ? body.category : "click") as AuditCategory;
    const path = typeof body.path === "string" ? body.path.slice(0, 200) : null;
    const label = typeof body.label === "string" ? body.label.slice(0, 200) : null;
    const metadata = typeof body.metadata === "object" && body.metadata !== null ? body.metadata : undefined;

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      action,
      category,
      path,
      details: label ? { label, ...metadata } : metadata,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to track admin audit click:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
