import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuditLogs } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const site = searchParams.get("site") || undefined;
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("q") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const { logs } = await getAuditLogs({
    site,
    category,
    search,
    startDate,
    endDate,
    limit: 1000,
  });

  const headers = [
    "ID",
    "Timestamp (IST)",
    "Site",
    "Admin Name",
    "Admin Email",
    "Action",
    "Category",
    "Path",
    "IP Address",
    "Details",
    "User Agent",
  ];

  const escapeCsv = (v: unknown) => {
    if (v === null || v === undefined) return '""';
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = logs.map((log) => [
    escapeCsv(log.id),
    escapeCsv(new Date(log.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })),
    escapeCsv(log.site),
    escapeCsv(log.user_name || "—"),
    escapeCsv(log.user_email || "—"),
    escapeCsv(log.action),
    escapeCsv(log.category),
    escapeCsv(log.path || "—"),
    escapeCsv(log.ip_address || "—"),
    escapeCsv(log.details || "—"),
    escapeCsv(log.user_agent || "—"),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-logs-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
