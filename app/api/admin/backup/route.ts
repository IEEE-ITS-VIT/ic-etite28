import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { all } from "@/lib/db";
import { SITE } from "@/lib/site";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Snapshot core tables
    const [settings, users, invoices, auditLogs, bookings, events, confRegs] = await Promise.all([
      all("SELECT key, value, updated_at, updated_by FROM settings").catch(() => []),
      all("SELECT id, email, name, phone, institution, department, year_of_study, city, role, email_verified, created_at FROM users").catch(() => []),
      all("SELECT * FROM invoices ORDER BY seq DESC").catch(() => []),
      all("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500").catch(() => []),
      all("SELECT * FROM technext_bookings ORDER BY created_at DESC").catch(() => []),
      all("SELECT * FROM events").catch(() => []),
      all("SELECT * FROM conference_registrations").catch(() => []),
    ]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const payload = {
      meta: {
        site: SITE,
        timestamp: new Date().toISOString(),
        exportedBy: user.email,
        version: "3.0",
      },
      data: {
        settings,
        users,
        invoices,
        auditLogs,
        bookings,
        events,
        conferenceRegistrations: confRegs,
      },
    };

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      action: "admin.database_backup_downloaded",
      category: "export",
      path: "/api/admin/backup",
      details: {
        usersCount: users.length,
        settingsCount: settings.length,
        invoicesCount: invoices.length,
      },
    });

    const jsonStr = JSON.stringify(payload, null, 2);
    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${SITE}-database-backup-${timestamp}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    console.error("Backup failed:", err);
    return NextResponse.json({ error: "Failed to generate database backup" }, { status: 500 });
  }
}
