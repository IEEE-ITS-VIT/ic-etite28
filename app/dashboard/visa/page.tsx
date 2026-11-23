import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Download, ExternalLink, Eye, FileText, Globe, ShieldAlert, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { first } from "@/lib/db";
import { portalMetadata } from "@/lib/seo";
import { submitVisaRequestAction } from "@/app/actions/visa";
import { getVisaRequestForUser } from "@/lib/visa/server";
import SubmitButton from "@/components/portal/SubmitButton";
import { Card, Field, Flash, PortalPage, StatusBadge, btnGold, btnPrimary, btnSecondary, inputCls } from "@/components/portal/ui";

export const metadata = portalMetadata("Visa Letter Request");

type SearchParams = Promise<{ ok?: string; error?: string }>;

export default async function DashboardVisaPage({ searchParams }: { searchParams: SearchParams }) {
  const { ok, error } = await searchParams;
  const user = await requireUser("/dashboard/visa");

  // Check conference registration
  const registration = await first<{
    id: string;
    category_label: string;
    residency: string;
    affiliation: string;
    designation: string | null;
    country: string;
    paper_ids: string | null;
    paper_titles: string | null;
    presenting_author: number;
    status: string;
    payment_status: string;
  }>(
    `SELECT id, category_label, residency, affiliation, designation, country, paper_ids, paper_titles, presenting_author, status, payment_status
       FROM conference_registrations
      WHERE user_id = ?`,
    [user.id]
  );

  const visaRequest = await getVisaRequestForUser(user.id);

  if (!registration) {
    return (
      <PortalPage
        title="Visa Invitation Letter"
        subtitle="Official facilitation letter for Indian Conference Visa applicants."
        actions={
          <Link href="/dashboard" className={btnSecondary}>
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        }
      >
        <Card title="Conference Registration Required">
          <div className="space-y-4 py-4 text-center sm:py-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div className="mx-auto max-w-md space-y-2">
              <h3 className="font-serif text-xl font-bold text-slate-800">Registration Not Found</h3>
              <p className="text-sm text-slate-600">
                Official visa invitation letters are exclusively provided to registered authors, delegates, and participants of ic-ETITE&apos;28.
              </p>
            </div>
            <div className="pt-2">
              <Link href="/registration/apply" className={btnGold}>
                Register for ic-ETITE&apos;28
              </Link>
            </div>
          </div>
        </Card>
      </PortalPage>
    );
  }

  // Pre-fill values
  const defaultValues = {
    passport_name: visaRequest?.passport_name ?? user.name,
    passport_number: visaRequest?.passport_number ?? "",
    passport_expiry: visaRequest?.passport_expiry ?? "",
    date_of_birth: visaRequest?.date_of_birth ?? "",
    nationality: visaRequest?.nationality ?? (registration.residency === "indian" ? "Indian" : registration.country),
    country_of_birth: visaRequest?.country_of_birth ?? "",
    gender: visaRequest?.gender ?? "unspecified",
    affiliation: visaRequest?.affiliation ?? registration.affiliation,
    designation: visaRequest?.designation ?? registration.designation ?? "",
    address: visaRequest?.address ?? "",
    city: visaRequest?.city ?? "",
    country: visaRequest?.country ?? registration.country,
    embassy_details: visaRequest?.embassy_details ?? "",
    paper_id: visaRequest?.paper_id ?? registration.paper_ids ?? "",
    paper_title: visaRequest?.paper_title ?? registration.paper_titles ?? "",
    arrival_date: visaRequest?.arrival_date ?? "2028-02-09",
    departure_date: visaRequest?.departure_date ?? "2028-02-12",
    additional_notes: visaRequest?.additional_notes ?? "",
  };

  return (
    <PortalPage
      title="Visa Invitation Letter"
      subtitle="Request and download your official Government of India conference visa invitation letter."
      actions={
        <Link href="/dashboard" className={btnSecondary}>
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      }
    >
      <Flash ok={ok} error={error} />

      {/* Status Banner */}
      {visaRequest && (
        <div className="mb-6">
          {visaRequest.status === "approved" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-emerald-100 p-1.5 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-emerald-900">Visa Letter Approved &amp; Generated</h4>
                      <StatusBadge status="approved" />
                    </div>
                    <p className="mt-1 text-sm text-emerald-800">
                      Your official conference invitation letter for passport <strong>{visaRequest.passport_number}</strong> has been approved by the committee.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a href="/api/visa-letter" className={btnPrimary} download>
                    <Download className="h-4 w-4" /> Download PDF
                  </a>
                  <a href="/api/visa-letter?inline=1" target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                    <Eye className="h-4 w-4" /> Preview
                  </a>
                </div>
              </div>
            </div>
          ) : visaRequest.status === "pending" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-amber-100 p-1.5 text-amber-700">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-amber-900">Request Under Admin Review</h4>
                    <StatusBadge status="pending" />
                  </div>
                  <p className="mt-1 text-sm text-amber-800">
                    Your visa invitation letter request is currently being verified by the conference secretariat. You will be notified once approved. You may update your particulars below if needed.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-rose-100 p-1.5 text-rose-700">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-rose-900">Request Needs Revision</h4>
                    <StatusBadge status="rejected" />
                  </div>
                  <p className="mt-1 text-sm text-rose-800">
                    {visaRequest.admin_notes
                      ? `Admin comment: ${visaRequest.admin_notes}`
                      : "Your request was declined. Please review the details below, correct any discrepancies with your passport or registration, and resubmit."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Main Request Form */}
        <Card
          title={
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-primary" />
              {visaRequest ? "Visa Letter Particulars" : "Request Official Visa Invitation Letter"}
            </span>
          }
        >
          <form action={submitVisaRequestAction} className="space-y-6">
            {/* Passport & Identity */}
            <div>
              <h4 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Passport &amp; Legal Identity
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Full Legal Name (as on Passport)">
                  <input
                    name="passport_name"
                    defaultValue={defaultValues.passport_name}
                    required
                    placeholder="e.g. John Doe"
                    className={inputCls}
                  />
                </Field>
                <Field label="Passport Number">
                  <input
                    name="passport_number"
                    defaultValue={defaultValues.passport_number}
                    required
                    placeholder="e.g. A12345678"
                    className={inputCls}
                  />
                </Field>
                <Field label="Passport Expiry Date" hint="Must be valid for at least 6 months">
                  <input
                    name="passport_expiry"
                    type="date"
                    defaultValue={defaultValues.passport_expiry}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Date of Birth">
                  <input
                    name="date_of_birth"
                    type="date"
                    defaultValue={defaultValues.date_of_birth}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field label="Nationality / Citizenship">
                  <input
                    name="nationality"
                    defaultValue={defaultValues.nationality}
                    required
                    placeholder="e.g. United Kingdom, Singapore, USA"
                    className={inputCls}
                  />
                </Field>
                <Field label="Country of Birth" hint="Optional, as per passport">
                  <input
                    name="country_of_birth"
                    defaultValue={defaultValues.country_of_birth}
                    placeholder="e.g. United Kingdom"
                    className={inputCls}
                  />
                </Field>
                <Field label="Gender" className="sm:col-span-2">
                  <select name="gender" defaultValue={defaultValues.gender} className={inputCls}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="unspecified">Prefer not to say</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* Affiliation & Address */}
            <div>
              <h4 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Institutional Affiliation &amp; Address
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Institution / University" className="sm:col-span-2">
                  <input
                    name="affiliation"
                    defaultValue={defaultValues.affiliation}
                    required
                    placeholder="e.g. National University of Singapore"
                    className={inputCls}
                  />
                </Field>
                <Field label="Designation / Role" hint="e.g. Professor, Postdoc, Researcher, PhD Student">
                  <input
                    name="designation"
                    defaultValue={defaultValues.designation}
                    placeholder="e.g. Associate Professor"
                    className={inputCls}
                  />
                </Field>
                <Field label="Country of Current Residence">
                  <input
                    name="country"
                    defaultValue={defaultValues.country}
                    required
                    placeholder="e.g. Singapore"
                    className={inputCls}
                  />
                </Field>
                <Field label="City &amp; Postal Code">
                  <input
                    name="city"
                    defaultValue={defaultValues.city}
                    placeholder="e.g. Singapore 119077"
                    className={inputCls}
                  />
                </Field>
                <Field label="Complete Postal Address" className="sm:col-span-2">
                  <input
                    name="address"
                    defaultValue={defaultValues.address}
                    placeholder="Street address of institution or residence"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            {/* Conference & Travel */}
            <div>
              <h4 className="border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                3. Conference Presentation &amp; Visa Processing
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Accepted Paper ID (if Author)" hint="Leave blank if attending as delegate">
                  <input
                    name="paper_id"
                    defaultValue={defaultValues.paper_id}
                    placeholder="e.g. ETITE-2028-102"
                    className={inputCls}
                  />
                </Field>
                <Field label="Indian Embassy / Consulate applied to" hint="City and country of the Mission">
                  <input
                    name="embassy_details"
                    defaultValue={defaultValues.embassy_details}
                    placeholder="e.g. High Commission of India, Singapore"
                    className={inputCls}
                  />
                </Field>
                <Field label="Accepted Paper Title (if Author)" className="sm:col-span-2">
                  <input
                    name="paper_title"
                    defaultValue={defaultValues.paper_title}
                    placeholder="Full accepted research paper title"
                    className={inputCls}
                  />
                </Field>
                <Field label="Tentative Arrival in India">
                  <input
                    name="arrival_date"
                    type="date"
                    defaultValue={defaultValues.arrival_date}
                    className={inputCls}
                  />
                </Field>
                <Field label="Tentative Departure from India">
                  <input
                    name="departure_date"
                    type="date"
                    defaultValue={defaultValues.departure_date}
                    className={inputCls}
                  />
                </Field>
                <Field label="Special Requests / Additional Remarks" className="sm:col-span-2">
                  <textarea
                    name="additional_notes"
                    defaultValue={defaultValues.additional_notes}
                    rows={2}
                    placeholder="Any specific embassy requirements or comments..."
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <SubmitButton pendingText="Submitting…">
                {visaRequest ? "Update & Resubmit Visa Request" : "Submit Visa Letter Request"}
              </SubmitButton>
              {visaRequest?.status === "approved" && (
                <a href="/api/visa-letter" className={btnSecondary} download>
                  <Download className="h-4 w-4" /> Download Approved PDF
                </a>
              )}
            </div>
          </form>
        </Card>

        {/* Info & Clearance Side Card */}
        <div className="space-y-6">
          <Card title="Conference Registration">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Registration ID:</span>
                <span className="font-mono text-xs font-semibold text-slate-800">{registration.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Category:</span>
                <span className="font-medium text-slate-800">{registration.category_label}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Registration Status:</span>
                <StatusBadge status={registration.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment:</span>
                <StatusBadge status={registration.payment_status} />
              </div>
            </div>
          </Card>

          <Card title="Government Clearances">
            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <div className="flex items-start gap-2.5">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                <p>
                  <strong>MEA Political Clearance:</strong> Ministry of External Affairs clearance is granted for ic-ETITE&apos;28.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                <p>
                  <strong>MHA Event Clearance:</strong> Ministry of Home Affairs security clearance for foreign delegates.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                <p>
                  <strong>e-Conference Visa:</strong> Citizens of 160+ countries can apply online at{" "}
                  <a
                    href="https://indianvisaonline.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand-secondary underline"
                  >
                    indianvisaonline.gov.in
                  </a>
                  .
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link href="/visa" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-secondary hover:underline">
                View Conference Visa Guide <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </PortalPage>
  );
}
