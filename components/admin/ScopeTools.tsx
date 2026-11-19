import { all, parseJson } from "@/lib/db";
import { audienceOptions, PLACEHOLDERS } from "@/lib/portal/audience";
import { certificateRecipients } from "@/lib/certificates/server";
import { DEFAULT_LAYOUT, type CertLayout } from "@/lib/certificates/render";
import EmailComposer from "@/components/admin/EmailComposer";
import CertificateManager, { type TemplateMeta } from "@/components/admin/CertificateManager";
import { Card, btnPrimary, btnSecondary } from "@/components/portal/ui";

// Email, certificate and export tools for the TechNext and conference admin pages.
export default async function ScopeTools({ scope, back, label }: { scope: "technext" | "conference"; back: string; label: string }) {
  const [templates, audiences, certRows, eligible] = await Promise.all([
    all<{ id: string; name: string; subject: string; body: string }>("SELECT id, name, subject, body FROM email_templates WHERE scope = ? ORDER BY name", [scope]),
    audienceOptions(scope),
    all<{ kind: "participation" | "winner"; width: number; height: number; mime: string; layout: string; released: number; updated_at: string }>(
      "SELECT kind, width, height, mime, layout, released, updated_at FROM certificate_templates WHERE scope = ?",
      [scope]
    ),
    certificateRecipients(scope, "participation"),
  ]);
  const certTemplates: TemplateMeta[] = certRows.map((r) => ({ ...r, layout: parseJson<CertLayout>(r.layout, DEFAULT_LAYOUT) }));
  return (
    <div className="mt-6 space-y-6">
      <Card title={`Email ${label}`}>
        <EmailComposer scope={scope} back={back} templates={templates} audiences={audiences} certKinds={certRows.map((c) => c.kind)} placeholders={PLACEHOLDERS.filter((p) => !["teamCode", "round", "rank", "score"].includes(p))} />
      </Card>
      <Card title="Certificates">
        <CertificateManager scope={scope} back={back} kinds={["participation"]} templates={certTemplates} eligible={{ participation: eligible.length, winner: 0 }} />
        <p className="mt-3 text-sm text-slate-500">{scope === "technext" ? "Issued to approved exhibitors (contact person and organisation)." : "Issued to confirmed registrations."}</p>
      </Card>
      <Card title="Export registrations">
        <p className="mb-4 text-sm text-slate-600">
          Export full details including participant/organization names, emails, phone numbers, affiliations, categories, payments, status and timestamps.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/api/admin/export?scope=${scope}&format=xlsx`}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download {label} (Excel .xlsx)
          </a>
          <a href={`/api/admin/export?scope=${scope}&format=zip`} className={btnSecondary}>
            Download all {label} (.zip of CSV)
          </a>
        </div>
      </Card>
    </div>
  );
}
