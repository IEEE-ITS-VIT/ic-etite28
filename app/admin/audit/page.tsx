import Link from "next/link";
import { getAuditLogs, getAuditStats } from "@/lib/audit";
import { SITES, type SiteKey } from "@/lib/site";
import { Card, Empty, Flash, PortalPage, Table, Td, btnSecondary, inputCls } from "@/components/portal/ui";

const small = `${inputCls} !py-1.5 !text-sm`;

function actionBadge(action: string, category: string) {
  if (action === "admin.login_success") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Login Success</span>;
  }
  if (action === "admin.login_failed") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Login Failed</span>;
  }
  if (action === "admin.logout") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Logout</span>;
  }
  if (category === "settings") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Settings Change</span>;
  }
  if (category === "content") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">Content Change</span>;
  }
  if (category === "users") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">User Change</span>;
  }
  if (category === "records") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">Booking / Record</span>;
  }
  if (category === "export") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">Data Export</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{action}</span>;
}

function siteBadge(site: string) {
  const meta = SITES[site as SiteKey];
  const name = meta ? meta.short : site;
  const color =
    site === "bolt"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : site === "technext"
      ? "bg-orange-100 text-orange-800 border-orange-200"
      : "bg-blue-100 text-blue-800 border-blue-200";
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded border ${color}`}>
      {name}
    </span>
  );
}

function formatDetails(details: string | null) {
  if (!details) return <span className="text-slate-400 font-mono">—</span>;
  try {
    const obj = JSON.parse(details);
    if (typeof obj === "object" && obj !== null) {
      if (obj.label && Object.keys(obj).length === 1) {
        return <span className="font-semibold text-slate-800 text-xs">{String(obj.label)}</span>;
      }
      return (
        <div className="flex flex-wrap gap-1.5 py-0.5 max-w-lg">
          {Object.entries(obj).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/90 text-[11px] font-mono text-slate-700 border border-slate-200/80 leading-normal"
            >
              <span className="font-semibold text-slate-500">{k}:</span>
              <span className="break-all font-medium text-slate-900">
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </span>
            </span>
          ))}
        </div>
      );
    }
    return <span className="break-all text-xs font-mono text-slate-700">{details}</span>;
  } catch {
    return <span className="break-all text-xs text-slate-700">{details}</span>;
  }
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    error?: string;
    q?: string;
    category?: string;
    site?: string;
    page?: string;
  }>;
}) {
  const { ok, error, q = "", category = "", site = "", page = "1" } = await searchParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = 50;
  const offset = (pageNum - 1) * pageSize;

  const [{ logs, total }, stats] = await Promise.all([
    getAuditLogs({
      search: q || undefined,
      category: category || undefined,
      site: site || undefined,
      limit: pageSize,
      offset,
    }),
    getAuditStats(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Build export query URL
  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (category) exportParams.set("category", category);
  if (site) exportParams.set("site", site);
  const exportUrl = `/api/admin/audit/export?${exportParams.toString()}`;

  return (
    <PortalPage
      title="Audit logs"
      subtitle="Complete trail of admin logins, configuration changes, user edits, and stall bookings."
      width="max-w-7xl"
    >
      <Flash ok={ok} error={error} />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Events</p>
          <p className="text-2xl font-black text-brand-primary mt-1">{stats.totalEvents.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">Logins, changes & bookings</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Admin Logins</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.adminLogins.toLocaleString()}</p>
          <p className="text-xs text-rose-500 mt-0.5">{stats.failedLogins} failed attempts</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Admin Changes</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{stats.changesCount.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">Settings, content & users</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Bookings & Records</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{stats.bookingsCount.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">Stall & attendee records</p>
        </div>
      </div>

      <Card
        title="Audit trail"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={exportUrl}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </a>
            <form className="flex flex-wrap gap-2">
              <input
                name="q"
                defaultValue={q}
                placeholder="Search email, IP, action, details..."
                className={`${small} !w-56`}
              />
              <select name="category" defaultValue={category} className={`${small} !w-44`}>
                <option value="">All categories</option>
                <option value="auth">Auth & Logins</option>
                <option value="settings">Settings / CMS</option>
                <option value="content">Page Content</option>
                <option value="users">Users & Roles</option>
                <option value="records">Bookings & Registrations</option>
                <option value="export">Data Exports</option>
              </select>
              <select name="site" defaultValue={site} className={`${small} !w-32`}>
                <option value="">All sites</option>
                <option value="technext">TechNext</option>
                <option value="bolt">BOLT</option>
                <option value="icetite">ic-ETITE</option>
              </select>
              <button className={btnSecondary}>Filter</button>
              {(q || category || site) && (
                <Link href="/admin/audit" className="inline-flex items-center px-2 py-1 text-xs text-slate-500 hover:text-slate-800">
                  Clear
                </Link>
              )}
            </form>
          </div>
        }
      >
        {logs.length === 0 ? (
          <Empty>No audit log events found matching the criteria.</Empty>
        ) : (
          <Table head={["Time (IST)", "Admin User", "Action", "Site", "Details", "Path", "IP Address"]}>
            {logs.map((log) => {
              const date = new Date(log.created_at);
              const timeFormatted = date.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <Td className="whitespace-nowrap text-xs text-slate-600 font-mono w-32">{timeFormatted}</Td>
                  <Td className="min-w-[180px]">
                    <div className="font-semibold text-slate-900 leading-snug">{log.user_name || "—"}</div>
                    <div className="text-xs text-slate-500 font-mono break-all">{log.user_email || "System / Anonymous"}</div>
                  </Td>
                  <Td className="min-w-[160px]">
                    <div className="space-y-1">
                      {actionBadge(log.action, log.category)}
                      <div className="text-[11px] text-slate-400 font-mono">{log.action}</div>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap w-24">{siteBadge(log.site)}</Td>
                  <Td className="min-w-[240px] max-w-lg">
                    {formatDetails(log.details)}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-500 font-mono max-w-[160px]">
                    <div className="truncate" title={log.path || undefined}>
                      {log.path || "—"}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap w-32">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200/60">
                      {log.ip_address || "—"}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 mt-4">
            <p className="text-xs text-slate-500">
              Showing page <span className="font-bold">{pageNum}</span> of <span className="font-bold">{totalPages}</span> ({total} events)
            </p>
            <div className="flex gap-2">
              {pageNum > 1 && (
                <Link
                  href={`/admin/audit?page=${pageNum - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${category ? `&category=${category}` : ""}${site ? `&site=${site}` : ""}`}
                  className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  Previous
                </Link>
              )}
              {pageNum < totalPages && (
                <Link
                  href={`/admin/audit?page=${pageNum + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${category ? `&category=${category}` : ""}${site ? `&site=${site}` : ""}`}
                  className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </PortalPage>
  );
}
