import Link from "next/link";
import { Eye, LayoutTemplate, List } from "lucide-react";
import { listInvoices } from "@/lib/invoices";
import { formatMoney } from "@/lib/settings";
import { fmtIst } from "@/lib/portal/actions";
import { resendInvoiceAction } from "@/app/actions/admin-records";
import { getInvoiceTemplateRow } from "@/lib/invoice-template/server";
import InvoiceTemplateEditor from "@/components/admin/InvoiceTemplateEditor";
import SubmitButton from "@/components/portal/SubmitButton";
import { Card, Empty, Flash, PortalPage, Stat, Table, Td, btnSecondary } from "@/components/portal/ui";

const PURPOSE = { conference: "Conference", technext: "TechNext", event: "Event" } as const;

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; tab?: string }>;
}) {
  const { ok, error, tab } = await searchParams;
  const isTemplateTab = tab === "template";

  const [invoices, existingTemplate] = await Promise.all([
    listInvoices(),
    getInvoiceTemplateRow("default"),
  ]);

  const totals = invoices.reduce<Record<string, number>>(
    (acc, i) => ({ ...acc, [i.currency]: (acc[i.currency] ?? 0) + i.amount }),
    {}
  );

  return (
    <PortalPage
      title="Invoices & Templates"
      subtitle="Issued automatically with a unique number when registrations are paid. Customize your official invoice stationery and field positions with the drag-and-drop template editor."
      width="max-w-7xl"
      actions={
        <a
          href="/api/admin/invoices/preview"
          target="_blank"
          rel="noopener noreferrer"
          className={btnSecondary}
        >
          <Eye className="h-4 w-4" />
          <span>Preview Sample Invoice PDF</span>
        </a>
      }
    >
      <Flash ok={ok} error={error} />

      {/* Navigation Tabs */}
      <div className="mb-6 flex items-center gap-2 border-b border-slate-200">
        <Link
          href="/admin/invoices"
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            !isTemplateTab
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <List className="h-4 w-4" />
          <span>All Invoices ({invoices.length})</span>
        </Link>
        <Link
          href="/admin/invoices?tab=template"
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
            isTemplateTab
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <LayoutTemplate className="h-4 w-4" />
          <span>Template Editor (Drag &amp; Drop)</span>
          {existingTemplate?.file_b64 && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Active Template
            </span>
          )}
        </Link>
      </div>

      {isTemplateTab ? (
        <InvoiceTemplateEditor existing={existingTemplate} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Total Invoices" value={invoices.length} />
            {Object.entries(totals).map(([cur, sum]) => (
              <Stat key={cur} label={`Collected (${cur})`} value={formatMoney(sum, cur)} />
            ))}
          </div>

          <Card title="All issued invoices">
            {invoices.length === 0 ? (
              <Empty>No invoices yet. They appear here when a registration is marked paid.</Empty>
            ) : (
              <Table head={["Number", "Date", "Billed to", "For", "Amount", ""]}>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <Td className="font-mono text-xs font-bold text-brand-primary">{i.number}</Td>
                    <Td className="whitespace-nowrap text-xs">{fmtIst(i.issued_at)}</Td>
                    <Td>
                      <div className="font-semibold">{i.bill_name}</div>
                      <div className="text-xs text-slate-500">{i.bill_email}</div>
                    </Td>
                    <Td>{PURPOSE[i.purpose]}</Td>
                    <Td className="whitespace-nowrap font-semibold">{formatMoney(i.amount, i.currency)}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <a href={`/api/invoices?id=${i.id}&inline=1`} target="_blank" className={btnSecondary}>
                          PDF
                        </a>
                        <form action={resendInvoiceAction}>
                          <input type="hidden" name="id" value={i.id} />
                          <SubmitButton
                            className={btnSecondary}
                            pendingText="…"
                            confirm={`Email invoice ${i.number} to ${i.bill_email} again?`}
                          >
                            Resend
                          </SubmitButton>
                        </form>
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </>
      )}
    </PortalPage>
  );
}
