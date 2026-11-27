import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { first } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { isSmtpConfigured } from "@/lib/email/mailer";
import { Card, PortalPage, Stat, StatusBadge } from "@/components/portal/ui";
import { SITE, SITE_NAME } from "@/lib/site";

export default async function AdminHome() {
  const [s, c, smtp] = await Promise.all([
    getSettings(),
    first<{ users: number; events: number; regs: number; technext: number; technext_pending: number; conf: number; conf_due: number; queued: number }>(
      `SELECT (SELECT COUNT(*) FROM users) AS users,
              (SELECT COUNT(*) FROM events WHERE status = 'active') AS events,
              (SELECT COUNT(*) FROM registrations) AS regs,
              (SELECT COUNT(*) FROM technext_bookings WHERE status != 'cancelled') AS technext,
              (SELECT COUNT(*) FROM technext_bookings WHERE status = 'pending') AS technext_pending,
              (SELECT COUNT(*) FROM conference_registrations) AS conf,
              (SELECT COUNT(*) FROM conference_registrations WHERE payment_status IN ('unpaid','pending')) AS conf_due,
              (SELECT COUNT(*) FROM email_outbox WHERE status = 'queued' AND site = ?) AS queued`,
      [SITE]
    ),
    isSmtpConfigured(),
  ]);

  const tile = (href: string, title: string, body: React.ReactNode) => (
    <Link href={href} className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div>
        <div className="font-bold text-brand-primary">{title}</div>
        <div className="mt-1 text-sm text-slate-600">{body}</div>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-brand-primary" />
    </Link>
  );

  return (
    <PortalPage title={`${SITE_NAME} admin portal`} subtitle="Manage this website's content, registrations, payments, emails and certificates." width="max-w-7xl">
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Accounts (all 3 sites)" value={c?.users ?? 0} />
        {SITE === "bolt" && <Stat label="Event registrations" value={c?.regs ?? 0} hint={`${c?.events ?? 0} active event(s)`} />}
        {SITE === "icetite" && <Stat label="Conference" value={c?.conf ?? 0} hint={`${c?.conf_due ?? 0} payment(s) due`} />}
        {SITE === "technext" && <Stat label="Stall bookings" value={c?.technext ?? 0} hint={`${c?.technext_pending ?? 0} awaiting review`} />}
        <Stat label="Emails queued" value={c?.queued ?? 0} />
      </div>
      {!smtp && (
        <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          SMTP is not configured, so verification codes and emails cannot be sent.{" "}
          <Link href="/admin/email" className="font-bold underline">
            Set up Gmail SMTP
          </Link>
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tile("/admin/settings", "Site content (CMS)", "Announcement bar, appearance, payments, invoice template and website links.")}
        {tile("/admin/content", "Page content", "Edit every text and image on this website, with a live preview.")}
        {SITE === "icetite" && tile("/admin/conference", "Conference registrations", `${c?.conf_due ?? 0} registration(s) with payment due.`)}
        {SITE === "bolt" && tile("/admin/events", "Events & teams", "Create events, invite lists, teams, rounds, scoring, results, emails, certificates and exports.")}
        {SITE === "technext" && tile("/admin/technext", "Stall bookings", `${c?.technext_pending ?? 0} booking(s) awaiting review.`)}
        {tile("/admin/users", SITE === "bolt" ? "Users & evaluators" : "Users & roles", `Roles on ${SITE_NAME} only. Accounts are shared by all three websites.`)}
        {tile("/admin/email", "Email & SMTP", `${c?.queued ?? 0} email(s) queued.`)}
      </div>
      <Card title="Export Registrations & Accounts (Excel .xlsx)" className="mt-6">
        <p className="mb-4 text-sm text-slate-600">
          Download real-time spreadsheets containing full participant details (name, email, phone, institution, department, year of study, city, payment info, UTR, and timestamps).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {SITE === "bolt" && (
            <a
              href="/api/admin/export?scope=all-events&format=xlsx"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export BOLT Registrations (.xlsx)
            </a>
          )}
          {SITE === "icetite" && (
            <a
              href="/api/admin/export?scope=conference&format=xlsx"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Conference Registrations (.xlsx)
            </a>
          )}
          {SITE === "technext" && (
            <a
              href="/api/admin/export?scope=technext&format=xlsx"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export TechNext Stalls (.xlsx)
            </a>
          )}
          <a
            href="/api/admin/export?scope=all&format=xlsx"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Master Workbook (All 3 Sites)
          </a>
          <a
            href="/api/admin/export?scope=users&format=xlsx"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Export All Users (.xlsx)
          </a>
        </div>
      </Card>
      <Card title="Status" className="mt-6">
        <div className="flex flex-wrap gap-3 text-sm">
          {SITE === "icetite" && (
            <>
              <span className="flex items-center gap-2">BOLT badge <StatusBadge status={s.visibility.bolt ? "public" : "hidden"} /></span>
              <span className="flex items-center gap-2">TechNext badge <StatusBadge status={s.visibility.technext ? "public" : "hidden"} /></span>
              <span className="flex items-center gap-2">Conference registration <StatusBadge status={s.visibility.conferenceRegistration ? "open" : "closed"} /></span>
            </>
          )}
          {SITE === "technext" && (
            <span className="flex items-center gap-2">Stall booking <StatusBadge status={s.visibility.technextRegistration ? "open" : "closed"} /></span>
          )}
          {SITE === "bolt" && <span className="flex items-center gap-2">Home page event: <code className="text-xs">{s.bolt.eventSlug}</code></span>}
        </div>
      </Card>
    </PortalPage>
  );
}
