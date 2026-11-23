import Link from "next/link";
import { Download, Eye, Search, Settings2, UserCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { portalMetadata } from "@/lib/seo";
import { fmtIst } from "@/lib/portal/actions";
import { saveVisaTemplateAction, updateVisaRequestStatusAction } from "@/app/actions/visa";
import { getVisaStats, listVisaRequests } from "@/lib/visa/server";
import SubmitButton from "@/components/portal/SubmitButton";
import { Card, Empty, Field, Flash, PortalPage, Stat, StatusBadge, Table, Td, btnSecondary, inputCls } from "@/components/portal/ui";

export const metadata = portalMetadata("Visa Invitation Letters (Admin)");

const small = `${inputCls} !py-1.5 !text-xs`;

type SearchParams = Promise<{
  ok?: string;
  error?: string;
  q?: string;
  status?: string;
  tab?: string;
}>;

export default async function AdminVisaPage({ searchParams }: { searchParams: SearchParams }) {
  const { ok, error, q, status, tab } = await searchParams;
  await requireAdmin("/admin/visa");

  const [stats, requests, settings] = await Promise.all([
    getVisaStats(),
    listVisaRequests({ status: status || "all", q }),
    getSettings(),
  ]);

  const activeTab = tab === "template" ? "template" : "requests";
  const tpl = settings.visa;

  return (
    <PortalPage
      title="Visa Invitation Letters"
      subtitle="Review foreign delegate visa requests, approve letters, and customize the official letterhead template."
      width="max-w-7xl"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/visa-letter?preview=1&inline=1"
            target="_blank"
            rel="noopener noreferrer"
            className={btnSecondary}
          >
            <Eye className="h-4 w-4" /> Preview Letter PDF
          </a>
        </div>
      }
    >
      <Flash ok={ok} error={error} />

      {/* Overview Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total Requests" value={stats.total} />
        <Stat label="Pending Approval" value={stats.pending} />
        <Stat label="Approved" value={stats.approved} />
        <Stat label="Needs Revision" value={stats.rejected} />
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex border-b border-slate-200">
        <Link
          href={`/admin/visa${q ? `?q=${encodeURIComponent(q)}` : ""}`}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "requests"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Requests
          {stats.pending > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {stats.pending}
            </span>
          )}
        </Link>
        <Link
          href="/admin/visa?tab=template"
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "template"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Settings2 className="h-4 w-4" />
          Template Configuration
        </Link>
      </div>

      {activeTab === "requests" ? (
        <Card
          title={`Visa Requests (${requests.length})`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter tabs */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-semibold">
                {["all", "pending", "approved", "rejected"].map((s) => (
                  <Link
                    key={s}
                    href={`/admin/visa?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                    className={`rounded-lg px-2.5 py-1 capitalize transition ${
                      (status || "all") === s
                        ? "bg-brand-primary text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {s}
                  </Link>
                ))}
              </div>

              {/* Search Form */}
              <form className="flex items-center gap-1.5">
                {status && <input type="hidden" name="status" value={status} />}
                <div className="relative">
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="Search name, passport, paper ID, country..."
                    className={`${small} !w-64 pl-7`}
                  />
                  <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                </div>
                <button className={btnSecondary}>Search</button>
                {q && (
                  <Link href={`/admin/visa${status ? `?status=${status}` : ""}`} className="text-xs text-slate-500 hover:underline">
                    Clear
                  </Link>
                )}
              </form>
            </div>
          }
        >
          {requests.length === 0 ? (
            <Empty>No visa invitation letter requests{q || status ? " match that filter" : " yet"}.</Empty>
          ) : (
            <Table head={["Applicant", "Passport Details", "Registration & Paper", "Status", "Admin Action"]}>
              {requests.map((r) => (
                <tr key={r.id} className="align-top">
                  {/* Applicant */}
                  <Td>
                    <div className="font-bold text-slate-900">{r.passport_name}</div>
                    {r.passport_name.toLowerCase() !== r.user_name.toLowerCase() && (
                      <div className="text-[11px] text-slate-500">Account: {r.user_name}</div>
                    )}
                    <div className="text-xs text-slate-600">{r.user_email}</div>
                    {r.user_phone && <div className="text-xs text-slate-400">{r.user_phone}</div>}
                    <div className="mt-1 text-xs font-medium text-slate-700">
                      {r.affiliation}
                      {r.designation && <span className="text-slate-500"> ({r.designation})</span>}
                    </div>
                    <div className="text-xs text-slate-500">{r.country}</div>
                  </Td>

                  {/* Passport Details */}
                  <Td>
                    <div className="font-mono text-xs font-semibold text-slate-800">
                      No: {r.passport_number}
                    </div>
                    <div className="text-xs text-slate-600">
                      Expires: <span className="font-medium text-slate-800">{r.passport_expiry}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      DOB: {r.date_of_birth} · {r.nationality}
                    </div>
                    {r.embassy_details && (
                      <div className="mt-1 text-[11px] text-slate-600 italic">
                        Mission: {r.embassy_details}
                      </div>
                    )}
                    {r.arrival_date && (
                      <div className="mt-1 text-[11px] text-slate-400">
                        Stay: {r.arrival_date} → {r.departure_date || "—"}
                      </div>
                    )}
                  </Td>

                  {/* Registration & Paper */}
                  <Td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-slate-800">{r.reg_category}</span>
                      <StatusBadge status={r.reg_status} />
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      Payment: <StatusBadge status={r.reg_payment_status} />
                    </div>
                    {r.paper_id ? (
                      <div className="mt-2 rounded-lg bg-slate-50 p-1.5 border border-slate-100 text-xs">
                        <span className="font-semibold text-brand-primary">Paper {r.paper_id}:</span>{" "}
                        <span className="text-slate-700">{r.paper_title || "Oral Presentation"}</span>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-400">Attendee / Non-author</div>
                    )}
                  </Td>

                  {/* Status & Timestamp */}
                  <Td>
                    <StatusBadge status={r.status} />
                    <div className="mt-1.5 text-[11px] text-slate-400">
                      Submitted: {fmtIst(r.created_at)}
                    </div>
                    {r.approved_at && (
                      <div className="text-[11px] text-emerald-600 font-medium">
                        Approved: {fmtIst(r.approved_at)}
                      </div>
                    )}
                    {r.admin_notes && (
                      <div className="mt-1.5 max-w-[200px] text-xs text-slate-600 bg-amber-50 border border-amber-200/60 rounded p-1">
                        <strong className="text-amber-800">Note:</strong> {r.admin_notes}
                      </div>
                    )}
                  </Td>

                  {/* Action / Update */}
                  <Td>
                    <div className="space-y-2">
                      <form action={updateVisaRequestStatusAction} className="flex flex-col gap-1.5">
                        <input type="hidden" name="id" value={r.id} />
                        <div className="flex items-center gap-1.5">
                          <select name="status" defaultValue={r.status} className={`${small} !w-32`}>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Needs Revision</option>
                          </select>
                          <SubmitButton className={btnSecondary} pendingText="…">
                            Save
                          </SubmitButton>
                        </div>
                        <input
                          name="admin_notes"
                          defaultValue={r.admin_notes ?? ""}
                          placeholder="Note to applicant (optional)"
                          className={`${small} !w-44`}
                        />
                      </form>

                      {/* PDF Links */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <a
                          href={`/api/visa-letter?id=${r.id}&inline=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-secondary hover:underline"
                        >
                          <Eye className="h-3 w-3" /> Preview
                        </a>
                        <span className="text-slate-300">·</span>
                        <a
                          href={`/api/visa-letter?id=${r.id}`}
                          download
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
                        >
                          <Download className="h-3 w-3" /> Download PDF
                        </a>
                      </div>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      ) : (
        /* Template Configuration Tab */
        <Card
          title="Official Visa Letterhead &amp; Body Template"
          actions={
            <a
              href="/api/visa-letter?preview=1&inline=1"
              target="_blank"
              rel="noopener noreferrer"
              className={btnSecondary}
            >
              <Eye className="h-4 w-4" /> Live PDF Preview
            </a>
          }
        >
          <form action={saveVisaTemplateAction} className="space-y-6">
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 text-xs text-sky-900 leading-relaxed">
              <strong>Available Placeholders:</strong> You can use standard dynamic tokens in any paragraph:
              <div className="mt-1.5 flex flex-wrap gap-1 font-mono text-[11px] text-sky-800">
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{name}}"}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{passportNumber}}"}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{passportExpiry}}"}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{nationality}}"}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{dob}}"}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{gender}}"}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{affiliation}}"}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{designation}}"}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{country}}"}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{paperId}}"}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{paperTitle}}"}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{registrationRef}}"}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{dates}}"}</span>
                <span className="rounded bg-sky-100 px-1.5 py-0.5">{"{{venue}}"}</span>
              </div>
            </div>

            {/* Document Header & Reference */}
            <div>
              <h4 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Reference Number &amp; Addressee
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Reference Number Prefix" hint="e.g. VIT/ic-ETITE28/VISA">
                  <input
                    name="refPrefix"
                    defaultValue={tpl.refPrefix}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Document Subject Line">
                  <input
                    name="title"
                    defaultValue={tpl.title}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Default Consular Addressee" className="sm:col-span-2">
                  <textarea
                    name="addressee"
                    defaultValue={tpl.addressee}
                    rows={2}
                    required
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            {/* Conference Particulars */}
            <div>
              <h4 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Conference Particulars
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Full Conference Title" className="sm:col-span-2">
                  <input
                    name="conferenceTitle"
                    defaultValue={tpl.conferenceTitle}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Short Name / Acronym">
                  <input
                    name="conferenceShortName"
                    defaultValue={tpl.conferenceShortName}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Conference Dates">
                  <input
                    name="dates"
                    defaultValue={tpl.dates}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Venue &amp; Host Institution" className="sm:col-span-2">
                  <input
                    name="venue"
                    defaultValue={tpl.venue}
                    required
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            {/* Letter Text & Clearances */}
            <div>
              <h4 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Letter Content Paragraphs
              </h4>
              <div className="mt-3 space-y-3">
                <Field label="Opening Invitation Paragraph">
                  <textarea
                    name="openingText"
                    defaultValue={tpl.openingText}
                    rows={3}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Paper Presentation Paragraph (for Authors)">
                  <textarea
                    name="paperText"
                    defaultValue={tpl.paperText}
                    rows={2}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Purpose of Stay &amp; Non-Employment Declaration">
                  <textarea
                    name="purposeText"
                    defaultValue={tpl.purposeText}
                    rows={3}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Government Clearances (MEA / MHA / MoE)">
                  <textarea
                    name="clearancesText"
                    defaultValue={tpl.clearancesText}
                    rows={3}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Closing Request to Consular Officer">
                  <textarea
                    name="closingText"
                    defaultValue={tpl.closingText}
                    rows={2}
                    required
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            {/* Signatory & Endorsement */}
            <div>
              <h4 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                4. Signatory &amp; Contact Details
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Signatory Name">
                  <input
                    name="signatoryName"
                    defaultValue={tpl.signatoryName}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Signatory Title">
                  <input
                    name="signatoryTitle"
                    defaultValue={tpl.signatoryTitle}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Department / Division">
                  <input
                    name="signatoryDept"
                    defaultValue={tpl.signatoryDept}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Institution Name &amp; Address">
                  <input
                    name="signatoryOrg"
                    defaultValue={tpl.signatoryOrg}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Signatory Official Email">
                  <input
                    name="signatoryEmail"
                    type="email"
                    defaultValue={tpl.signatoryEmail}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Signatory Phone Number">
                  <input
                    name="signatoryPhone"
                    defaultValue={tpl.signatoryPhone}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Footer Disclaimer Notes" className="sm:col-span-2">
                  <input
                    name="notes"
                    defaultValue={tpl.notes}
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <SubmitButton pendingText="Saving…">Save Visa Letter Template</SubmitButton>
              <a
                href="/api/visa-letter?preview=1&inline=1"
                target="_blank"
                rel="noopener noreferrer"
                className={btnSecondary}
              >
                <Eye className="h-4 w-4" /> Live PDF Preview
              </a>
            </div>
          </form>
        </Card>
      )}
    </PortalPage>
  );
}
