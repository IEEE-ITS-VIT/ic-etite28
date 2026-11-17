import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { portalMetadata } from "@/lib/seo";
import { SITE, SITE_NAME, type SiteKey } from "@/lib/site";

export const metadata = portalMetadata("Admin");

const COMMON_END = [
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/certificates", label: "Certificates (Excel)" },
  { href: "/admin/users", label: "Users & roles" },
  { href: "/admin/email", label: "Email & SMTP" },
];
// Each website has its own admin portal with only its own sections.
const NAV_BY_SITE: Record<SiteKey, { href: string; label: string }[]> = {
  icetite: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/settings", label: "Site content (CMS)" },
    { href: "/admin/content", label: "Page content" },
    { href: "/admin/lists", label: "Lists" },
    { href: "/admin/conference", label: "Conference registrations" },
    { href: "/admin/hotels", label: "Hotels" },
    ...COMMON_END,
  ],
  bolt: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/settings", label: "Site content (CMS)" },
    { href: "/admin/content", label: "Page content" },
    { href: "/admin/events", label: "Events & teams" },
    ...COMMON_END,
  ],
  technext: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/settings", label: "Site content (CMS)" },
    { href: "/admin/content", label: "Page content" },
    { href: "/admin/technext", label: "Stall bookings" },
    ...COMMON_END,
  ],
};
const NAV = NAV_BY_SITE[SITE];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin("/admin");
  return (
    <div className="bg-[#F4F6FA]">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-4 py-2.5 sm:px-6">
          <span className="mr-2 shrink-0 rounded-full bg-brand-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-accent">{SITE_NAME} admin</span>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-brand-primary">
              {n.label}
            </Link>
          ))}
          <span className="ml-auto hidden shrink-0 text-xs text-slate-500 md:block">{user.email}</span>
        </div>
      </div>
      {children}
    </div>
  );
}
