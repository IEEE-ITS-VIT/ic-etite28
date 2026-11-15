import { NextResponse } from "next/server";
import { processOutbox, requeueRecentFailures } from "@/lib/email/mailer";

export const maxDuration = 60;

// Vercel Cron (vercel.json), once a day: sends whatever is still queued (e.g. because the
// daily Gmail quota was reached) and retries emails that failed in the last few days. Vercel sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const started = Date.now();
  const requeued = await requeueRecentFailures();
  let total = 0;
  let last = await processOutbox(20);
  total += last.sent;
  while (last.sent > 0 && last.remainingQueued > 0 && last.dailyRemaining > 0 && Date.now() - started < 45_000) {
    last = await processOutbox(20);
    total += last.sent;
  }
  return NextResponse.json({ sent: total, requeued, remainingQueued: last.remainingQueued, dailyRemaining: last.dailyRemaining });
}
