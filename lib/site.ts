// Which of the three websites this codebase is. All three (ic-ETITE'28, BOLT 3.0 and
// TechNext '28) share one database and one user table, so one account works everywhere;
// settings, CMS content, admins, payments and the email queue are kept per site.
export type SiteKey = "icetite" | "bolt" | "technext";

export const SITE = "icetite" as SiteKey;

export const SITES: Record<SiteKey, { name: string; short: string; payments: ("conference" | "technext" | "event")[] }> = {
  icetite: { name: "ic-ETITE'28", short: "ic-ETITE", payments: ["conference"] },
  bolt: { name: "BOLT 3.0", short: "BOLT", payments: ["event"] },
  technext: { name: "TechNext '28", short: "TechNext", payments: ["technext"] },
};

export const SITE_NAME = SITES[SITE].name;

// Settings rows are stored under "<site>:<key>" for BOLT and TechNext; ic-ETITE keeps the
// original un-prefixed keys.
export const siteKey = (key: string) => (SITE === "icetite" ? key : `${SITE}:${key}`);

// Everyone can sign in on any of the three sites with the same email and password.
export const SHARED_ACCOUNT_NOTE = "One account works on ic-ETITE'28, BOLT 3.0 and TechNext '28.";
