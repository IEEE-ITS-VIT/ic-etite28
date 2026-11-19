import { roleSql } from "@/lib/auth/roles";
import { all, first } from "@/lib/db";
import { fmtIst } from "@/lib/portal/actions";
import { inviteUserAction, setUserRoleAction, verifyUserAction } from "@/app/actions/admin-records";
import SubmitButton from "@/components/portal/SubmitButton";
import { Badge, Card, Empty, Field, Flash, PortalPage, Table, Td, btnSecondary, inputCls } from "@/components/portal/ui";

const small = `${inputCls} !py-1.5 !text-sm`;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; q?: string; role?: string }> }) {
  const { ok, error, q = "", role = "" } = await searchParams;
  const where: string[] = [];
  const params: unknown[] = [];
  if (q) {
    where.push("(u.name LIKE ? OR u.email LIKE ? OR u.institution LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (role) {
    where.push(`${roleSql("u")} = ?`);
    params.push(role);
  }
  const [users, total] = await Promise.all([
    all<{ id: string; name: string; email: string; phone: string | null; institution: string | null; role: string; email_verified: number; created_at: string }>(
      `SELECT u.id, u.name, u.email, u.phone, u.institution, ${roleSql("u")} AS role, u.email_verified, u.created_at FROM users u ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY u.created_at DESC LIMIT 300`,
      params
    ),
    first<{ n: number }>("SELECT COUNT(*) AS n FROM users"),
  ]);

  return (
    <PortalPage title="Users & evaluators" subtitle={`${total?.n ?? 0} accounts`} width="max-w-7xl">
      <Flash ok={ok} error={error} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card
          title="Accounts"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/api/admin/export?scope=users&format=xlsx"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Users (.xlsx)
              </a>
              <form className="flex flex-wrap gap-2">
                <input name="q" defaultValue={q} placeholder="Name, email, institution" className={`${small} !w-56`} />
                <select name="role" defaultValue={role} className={`${small} !w-36`}>
                  <option value="">All roles</option>
                  <option value="participant">Participants</option>
                  <option value="evaluator">Evaluators</option>
                  <option value="admin">Admins</option>
                </select>
                <button className={btnSecondary}>Filter</button>
              </form>
            </div>
          }
        >
          {users.length === 0 ? (
            <Empty>No users found.</Empty>
          ) : (
            <Table head={["User", "Joined", "Role", ""]}>
              {users.map((u) => (
                <tr key={u.id}>
                  <Td>
                    <div className="font-semibold text-slate-800">
                      {u.name} {!u.email_verified && <Badge tone="amber">unverified</Badge>}
                    </div>
                    <div className="text-xs text-slate-500">
                      {u.email}
                      {u.phone && ` · ${u.phone}`}
                    </div>
                    {u.institution && <div className="text-xs text-slate-500">{u.institution}</div>}
                  </Td>
                  <Td className="whitespace-nowrap text-xs">{fmtIst(u.created_at)}</Td>
                  <Td>
                    <form action={setUserRoleAction} className="flex gap-1.5">
                      <input type="hidden" name="user_id" value={u.id} />
                      <input type="hidden" name="q" value={q} />
                      <select name="role" defaultValue={u.role} className={`${small} !w-32`}>
                        <option value="participant">participant</option>
                        <option value="evaluator">evaluator</option>
                        <option value="admin">admin</option>
                      </select>
                      <SubmitButton className={btnSecondary} pendingText="…">
                        Set
                      </SubmitButton>
                    </form>
                  </Td>
                  <Td>
                    {!u.email_verified && (
                      <form action={verifyUserAction}>
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="hidden" name="q" value={q} />
                        <SubmitButton className={btnSecondary} pendingText="…">
                          Mark verified
                        </SubmitButton>
                      </form>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
        <Card title="Add an evaluator or admin">
          <form action={inviteUserAction} className="space-y-3">
            <Field label="Email">
              <input name="email" type="email" required className={inputCls} />
            </Field>
            <Field label="Name" hint="Needed only for new accounts.">
              <input name="name" className={inputCls} />
            </Field>
            <Field label="Role">
              <select name="role" className={inputCls}>
                <option value="evaluator">Evaluator</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <SubmitButton pendingText="Adding…">Add & send invite</SubmitButton>
            <p className="text-xs text-slate-500">New people get an email with a link to set their password. Existing accounts are simply given the role. Then assign evaluators to an event under Events → Rounds & evaluators.</p>
          </form>
        </Card>
      </div>
    </PortalPage>
  );
}
