import Link from "next/link";
import { first } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { formatDeadline, isEarlyBird, windowState } from "@/lib/pricing";
import { saveConferenceRegistrationAction } from "@/app/actions/registrations";
import PaymentCard from "@/components/portal/PaymentCard";
import { Card, Empty, Flash, PortalPage, StatusBadge, btnSecondary } from "@/components/portal/ui";
import { RegistrationForm, type RegData } from "@/components/portal/RegistrationForm";
import { portalMetadata } from "@/lib/seo";

export const metadata = portalMetadata("Conference registration");

export default async function ConferenceRegisterPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const user = await requireUser("/registration/apply");
  const settings = await getSettings();
  const reg = await first<RegData>("SELECT * FROM conference_registrations WHERE user_id = ?", [user.id]);
  const locked = reg ? reg.status === "confirmed" || reg.payment_status === "paid" || reg.payment_status === "waived" : false;
  const win = windowState(settings.conference.opensAt, settings.conference.closesAt);
  // Existing registrations stay editable after the deadline until they are paid/confirmed.
  const open = settings.visibility.conferenceRegistration && (win === "open" || Boolean(reg));
  const eb = settings.conference.earlyBird;
  const early = isEarlyBird(eb);

  return (
    <PortalPage
      title="ic-ETITE'28 registration"
      subtitle="Author, delegate and participant registration. Fees follow the published registration tariff."
      width="max-w-4xl"
      actions={
        <Link href="/registration" className={btnSecondary}>
          Fee details
        </Link>
      }
    >
      <Flash ok={ok} error={error} />
      {!reg && settings.visibility.conferenceRegistration && (early || settings.conference.closesAt) && (
        <div className="mb-6 flex flex-wrap gap-2 text-xs font-bold">
          {early && <span className="rounded-full bg-emerald-600 px-3 py-1.5 text-white">Early-bird pricing until {formatDeadline(eb.endsAt)}</span>}
          {settings.conference.closesAt && <span className="rounded-full bg-brand-primary px-3 py-1.5 text-white">Registration deadline: {formatDeadline(settings.conference.closesAt)}</span>}
        </div>
      )}
      {reg && (
        <Card className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-bold text-brand-primary">Your registration</span>
            <StatusBadge status={reg.status} />
          </div>
          <PaymentCard purpose="conference" refId={reg.id} amount={reg.payment_amount} currency={reg.payment_currency} status={reg.payment_status} back="/registration/apply" />
        </Card>
      )}
      {!open && !reg ? (
        <Empty>
          {settings.visibility.conferenceRegistration && win === "closed"
            ? "The registration deadline has passed. Please contact the secretariat."
            : settings.visibility.conferenceRegistration && win === "not_open"
              ? `Registration opens on ${formatDeadline(settings.conference.opensAt)}.`
              : "Conference registration will open soon. Please check the Important Dates page."}
        </Empty>
      ) : (
        <Card title={reg ? "Registration details" : "Register"}>
          <RegistrationForm
            user={user}
            fees={settings.fees}
            reg={reg}
            locked={locked}
            open={open}
            earlyBird={eb}
            action={saveConferenceRegistrationAction}
          />
        </Card>
      )}
    </PortalPage>
  );
}
