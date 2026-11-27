import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { changePasswordAction, setRefundPasswordAction, updateProfileAction } from "@/app/actions/auth";
import { hasRefundPassword } from "@/lib/refund";
import SubmitButton from "@/components/portal/SubmitButton";
import { Card, Field, Flash, PortalPage, btnSecondary, inputCls } from "@/components/portal/ui";
import { portalMetadata } from "@/lib/seo";

export const metadata = portalMetadata("Profile");

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const user = await requireUser("/dashboard/profile");
  const isSuperAdmin = user.email.toLowerCase() === "ieeeitsvitscore@gmail.com";
  const refundConfigured = isSuperAdmin ? await hasRefundPassword() : false;
  return (
    <PortalPage
      title="Your profile"
      subtitle="Your name is printed on certificates exactly as entered here."
      width="max-w-3xl"
      actions={
        <Link href="/dashboard" className={btnSecondary}>
          Back to dashboard
        </Link>
      }
    >
      <Flash ok={ok} error={error} />
      <div className="space-y-6">
        <Card title="Details">
          <form action={updateProfileAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2">
              <input name="name" defaultValue={user.name} required minLength={2} maxLength={100} className={inputCls} />
            </Field>
            <Field label="Email" hint="Contact the organisers to change your email.">
              <input value={user.email} disabled className={inputCls} />
            </Field>
            <Field label="Phone">
              <input name="phone" defaultValue={user.phone ?? ""} maxLength={20} className={inputCls} />
            </Field>
            <Field label="Institution / organisation">
              <input name="institution" defaultValue={user.institution ?? ""} maxLength={150} className={inputCls} />
            </Field>
            <Field label="Department / programme">
              <input name="department" defaultValue={user.department ?? ""} maxLength={120} className={inputCls} />
            </Field>
            <Field label="Year of study">
              <input name="year_of_study" defaultValue={user.year_of_study ?? ""} maxLength={30} className={inputCls} />
            </Field>
            <Field label="City">
              <input name="city" defaultValue={user.city ?? ""} maxLength={80} className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
            </div>
          </form>
        </Card>
        <Card title="Change password">
          <form action={changePasswordAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Current password">
              <input name="current" type="password" required autoComplete="current-password" className={inputCls} />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <SubmitButton pendingText="Updating…">Change password</SubmitButton>
            </div>
          </form>
        </Card>
        {isSuperAdmin && (
          <Card title="Refund Security Password">
            <p className="text-sm text-slate-500 -mt-1 mb-4">
              Only visible to ieeeitsvitscore@gmail.com. This password is required to authorize and issue refunds across all portals.
            </p>
            <form action={setRefundPasswordAction} className="grid gap-4 sm:grid-cols-2">
              <Field
                label={refundConfigured ? "Update refund password" : "Set refund authorization password"}
                hint="At least 8 characters. Stored securely as a cryptographic scrypt hash."
                className="sm:col-span-2"
              >
                <input
                  name="refund_password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={inputCls}
                  placeholder="Enter authorization password"
                />
              </Field>
              <Field label="Confirm refund password" className="sm:col-span-2">
                <input
                  name="confirm_refund_password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={inputCls}
                  placeholder="Re-enter password to confirm"
                />
              </Field>
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
                <SubmitButton pendingText="Saving password…">
                  {refundConfigured ? "Update Refund Password" : "Save Refund Password"}
                </SubmitButton>
                {refundConfigured && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Refund Password Configured (Hash Protected)
                  </span>
                )}
              </div>
            </form>
          </Card>
        )}
      </div>
    </PortalPage>
  );
}
