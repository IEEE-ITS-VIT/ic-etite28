"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getPayable, startCheckout, type PaymentPurpose } from "@/lib/payments";
import { guarded, str } from "@/lib/portal/actions";
import { PortalError } from "@/lib/portal/events";
import { SITE, SITES } from "@/lib/site";

// "Pay now" button. Each website only starts payments for what it sells, through its own
// gateway settings (ic-ETITE: conference, BOLT: events, TechNext: stalls).
export async function payAction(formData: FormData) {
  const purpose = str(formData, "purpose", 20) as PaymentPurpose;
  const ref = str(formData, "ref", 100);
  const back = str(formData, "back", 200) || "/dashboard";
  const user = await requireUser(back);
  await guarded(back, async () => {
    if (!SITES[SITE].payments.includes(purpose)) throw new PortalError("This payment belongs to another website.");
    const payable = await getPayable(purpose, ref);
    if (!payable || payable.userId !== user.id) throw new PortalError("Payment record not found.");
    const result = await startCheckout(payable);
    if (result.redirectUrl) redirect(result.redirectUrl);
    return result.message ?? "Payment started.";
  });
}
