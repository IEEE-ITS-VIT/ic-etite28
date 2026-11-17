import "server-only";
import { now, type Statement } from "@/lib/db";
import { SITE } from "@/lib/site";
import type { Role } from "@/lib/auth/session";

// SQL expression for a user's role on this site (`alias` is the users table alias).
// ic-ETITE uses users.role; BOLT and TechNext use site_roles, defaulting to participant.
export const roleSql = (alias = "u") =>
  SITE === "icetite"
    ? `${alias}.role`
    : `COALESCE((SELECT sr.role FROM site_roles sr WHERE sr.user_id = ${alias}.id AND sr.site = '${SITE}'), 'participant')`;

// Statements that set a user's role on this site only.
export function setRoleStatements(userId: string, role: Role): Statement[] {
  if (SITE === "icetite") return [{ sql: "UPDATE users SET role = ?, updated_at = ? WHERE id = ?", params: [role, now(), userId] }];
  return [
    {
      sql: `INSERT INTO site_roles (user_id, site, role, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, site) DO UPDATE SET role = excluded.role, updated_at = excluded.updated_at`,
      params: [userId, SITE, role, now()],
    },
  ];
}
