import { NextResponse } from "next/server";

// Tracking of clicks and page navigation has been permanently disabled per audit policy.
// Audit logs strictly record admin logins, configuration changes, user edits, and stall bookings.
export async function POST() {
  return new NextResponse(null, { status: 204 });
}
