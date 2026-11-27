import Link from "next/link";
import { ShieldCheck, ShieldAlert, KeyRound, Lock, Search, AlertTriangle, Undo2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { formatInr } from "@/lib/settings";
import { fmtIst } from "@/lib/portal/actions";
import { hasRefundPassword, getAllRefundableRecords, REFUND_SUPERADMIN_EMAIL } from "@/lib/refund";
import { setRefundPasswordAction, proceedRefundAction, cancelRefundRequestAction } from "@/app/actions/admin-refunds";
import { Card, Empty, Flash, PortalPage, Stat, StatusBadge, Table, Td, inputCls } from "@/components/portal/ui";
import SubmitButton from "@/components/portal/SubmitButton";

const smallInput = `${inputCls} !py-1.5 !text-xs`;

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; scope?: string; status?: string; q?: string }>;
}) {
  const { ok, error, scope = "all", status = "all", q = "" } = await searchParams;
  const user = await requireAdmin("/admin/refunds");

  const [hasMasterKey, records] = await Promise.all([
    hasRefundPassword(),
    getAllRefundableRecords({ scope, status, q }),
  ]);

  const isSuperadmin = user.email.toLowerCase() === REFUND_SUPERADMIN_EMAIL.toLowerCase();

  // Metrics
  const totalTransactions = records.length;
  const totalCollected = records
    .filter((r) => r.paymentStatus === "paid" || r.isRefunded)
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalRefunded = records
    .filter((r) => r.isRefunded)
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  const eligibleForRefund = records.filter((r) => r.canProceedRefund).length;

  return (
    <PortalPage
      title="Refunds & Reconciliations"
      subtitle="Universal refund management across Conference registrations, TechNext stall bookings, and BOLT 3.0 event teams."
      width="max-w-7xl"
    >
      <Flash ok={ok} error={error} />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Total Transactions" value={totalTransactions} hint="Matching filters" />
        <Stat label="Gross Revenue" value={formatInr(totalCollected)} hint="Paid & refunded total" />
        <Stat label="Total Refunded" value={formatInr(totalRefunded)} hint="Permanent refunded amount" />
        <Stat label="Eligible for Refund" value={eligibleForRefund} hint="Currently paid records" />
      </div>

      {/* Superadmin Master Key Management */}
      <div className="mb-6">
        {isSuperadmin ? (
          <Card
            title={
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-brand-primary" />
                <span>Superadmin Refund Authorization Key</span>
              </div>
            }
          >
            {hasMasterKey ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      Master Refund Authorization Password Active (scrypt secured)
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Configured for <strong className="text-slate-700">{REFUND_SUPERADMIN_EMAIL}</strong>. Only this password can authorize irreversible refunds.
                    </div>
                  </div>
                </div>

                <details className="group">
                  <summary className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs list-none">
                    <span>Update Master Key</span>
                  </summary>
                  <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <form action={setRefundPasswordAction} className="flex flex-col sm:flex-row gap-2.5 items-end">
                      <div className="w-full sm:w-auto flex-1">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">New Master Password</label>
                        <input
                          type="password"
                          name="password"
                          required
                          minLength={8}
                          placeholder="Min 8 characters"
                          className={smallInput}
                        />
                      </div>
                      <div className="w-full sm:w-auto flex-1">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
                        <input
                          type="password"
                          name="confirm_password"
                          required
                          minLength={8}
                          placeholder="Confirm new password"
                          className={smallInput}
                        />
                      </div>
                      <SubmitButton
                        className="!px-4 !py-2 !text-xs font-bold rounded-lg !bg-brand-primary hover:!bg-brand-primary-hover text-white shrink-0"
                        pendingText="Saving…"
                      >
                        Update Key
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3 mb-3">
                  <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-amber-900">
                      Master Refund Password Not Configured Yet
                    </div>
                    <div className="text-xs text-amber-700 mt-0.5">
                      As the permanent superadmin (<span className="font-semibold">{REFUND_SUPERADMIN_EMAIL}</span>), configure a master refund security password to enable authorized refunds.
                    </div>
                  </div>
                </div>
                <form action={setRefundPasswordAction} className="flex flex-col sm:flex-row gap-2.5 items-end">
                  <div className="w-full sm:w-auto flex-1">
                    <label className="block text-xs font-semibold text-amber-900 mb-1">New Master Password</label>
                    <input
                      type="password"
                      name="password"
                      required
                      minLength={8}
                      placeholder="Min 8 characters"
                      className={smallInput}
                    />
                  </div>
                  <div className="w-full sm:w-auto flex-1">
                    <label className="block text-xs font-semibold text-amber-900 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      name="confirm_password"
                      required
                      minLength={8}
                      placeholder="Repeat password"
                      className={smallInput}
                    />
                  </div>
                  <SubmitButton
                    className="!px-4 !py-2 !text-xs font-bold rounded-lg !bg-amber-700 hover:!bg-amber-800 text-white shrink-0"
                    pendingText="Configuring…"
                  >
                    Save Master Key
                  </SubmitButton>
                </form>
              </div>
            )}
          </Card>
        ) : (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600">
            <Lock className="h-4 w-4 text-slate-500 shrink-0" />
            <span>
              Master refund authorization key is configured and managed exclusively by the default superadmin (<strong className="text-slate-700">{REFUND_SUPERADMIN_EMAIL}</strong>).
            </span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card className="mb-6">
        <form method="get" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Search Records</label>
            <div className="relative">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Name, email, booking ref…"
                className={`${smallInput} pl-8`}
              />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Scope</label>
            <select name="scope" defaultValue={scope} className={smallInput}>
              <option value="all">All Portals / Scopes</option>
              <option value="conference">Conference Registrations</option>
              <option value="technext">TechNext Expo</option>
              <option value="event">BOLT 3.0 / Events</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select name="status" defaultValue={status} className={smallInput}>
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid (Eligible for Refund)</option>
              <option value="refunded">Refunded (Permanent / Locked)</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-primary-hover transition"
            >
              Filter
            </button>
            {(q || scope !== "all" || status !== "all") && (
              <Link
                href="/admin/refunds"
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </Card>

      {/* Transactions Table */}
      {records.length === 0 ? (
        <Empty>No transactions found matching the specified filters.</Empty>
      ) : (
        <Table head={["Payer / Delegate", "Scope & Ref", "Amount", "Payment Status", "Record Status", "Actions"]}>
          {records.map((r) => (
            <tr key={`${r.purpose}-${r.id}`} className="hover:bg-slate-50/60 transition">
              <Td>
                <div className="font-bold text-slate-900">{r.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{r.subtitle}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{fmtIst(r.createdAt)}</div>
                {r.adminNotes && (
                  <div className="mt-1 text-[11px] text-amber-800 bg-amber-50 rounded px-2 py-1 border border-amber-200/60 max-w-sm whitespace-pre-line font-mono">
                    {r.adminNotes}
                  </div>
                )}
              </Td>

              <Td>
                <div className="flex flex-col gap-1 items-start">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {r.scopeLabel}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">ID: {r.id}</span>
                  {r.paymentRef && (
                    <span className="font-mono text-[11px] text-slate-600">Ref: {r.paymentRef}</span>
                  )}
                </div>
              </Td>

              <Td>
                <div className="font-extrabold text-slate-900">
                  {formatInr(r.amount)}
                </div>
                <div className="text-[11px] text-slate-400 uppercase">{r.currency}</div>
              </Td>

              <Td>
                <StatusBadge status={r.paymentStatus} />
              </Td>

              <Td>
                <StatusBadge status={r.status} />
              </Td>

              <Td>
                {r.isRefunded ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-xs">
                    <Lock className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                    <span>Refunded (Locked &amp; Permanent)</span>
                  </div>
                ) : r.canProceedRefund ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Before Proceed: Option to cancel / dismiss refund request */}
                    <form action={cancelRefundRequestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="purpose" value={r.purpose} />
                      <SubmitButton
                        className="!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !px-2.5 !py-1 !text-xs font-semibold rounded-lg border border-slate-300 shadow-xs inline-flex items-center gap-1"
                        pendingText="Cancelling…"
                        confirm={`Dismiss/cancel refund request for ${r.title}? The transaction will remain active.`}
                      >
                        <Undo2 className="h-3 w-3" />
                        <span>Cancel Request</span>
                      </SubmitButton>
                    </form>

                    {/* Proceed Refund: Irreversible once done, requires superadmin password */}
                    <details className="group relative">
                      <summary className="cursor-pointer inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs list-none">
                        <span>Proceed Refund</span>
                      </summary>
                      <div className="absolute right-0 top-full mt-2 z-40 w-80 rounded-2xl border border-rose-300 bg-white p-4 shadow-2xl text-left">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-1">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>Irreversible Action Warning</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug mb-3">
                          Once proceeded, this refund is <strong>permanent</strong> and <strong>cannot be cancelled or reversed</strong>. The record will be permanently marked cancelled.
                        </p>

                        <form action={proceedRefundAction} className="space-y-2.5">
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="purpose" value={r.purpose} />

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Master Authorization Password <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="password"
                              name="refund_password"
                              required
                              placeholder="Enter master key"
                              className={smallInput}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Reason / Audit Note
                            </label>
                            <input
                              type="text"
                              name="reason"
                              placeholder="e.g. Delegate cancellation requested"
                              className={smallInput}
                            />
                          </div>

                          <SubmitButton
                            className="w-full !bg-rose-600 hover:!bg-rose-700 !text-white !py-1.5 !text-xs font-bold rounded-xl shadow-xs"
                            pendingText="Processing refund…"
                            confirm={`CRITICAL: Are you sure you want to permanently refund ${formatInr(r.amount)} to ${r.title}? Once proceeded, this CANNOT be cancelled or reversed.`}
                          >
                            Confirm &amp; Proceed Irreversible Refund
                          </SubmitButton>
                        </form>
                      </div>
                    </details>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Not eligible (unpaid)</span>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </PortalPage>
  );
}
