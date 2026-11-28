import * as XLSX from "xlsx";
import { all, parseJson } from "@/lib/db";
import { fmtIst } from "@/lib/portal/actions";
import { getRounds, roundCriteria, roundFields, roundLeaderboard, type EventRow } from "@/lib/portal/events";
import { rankLabel } from "@/lib/certificates/render";

export interface SheetDefinition {
  name: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}

export function buildExcelWorkbook(sheets: SheetDefinition[]): Uint8Array {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const safeName = sheet.name.replace(/[:\\/?*\[\]]/g, "-").slice(0, 31) || "Sheet";
    const aoa: (string | number)[][] = [
      sheet.headers,
      ...sheet.rows.map((row) =>
        row.map((val) => {
          if (val === null || val === undefined) return "";
          if (typeof val === "boolean") return val ? "Yes" : "No";
          return val;
        })
      ),
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Auto-fit column widths with padding
    const colWidths = sheet.headers.map((h, i) => {
      let maxLen = h.length;
      for (const row of sheet.rows) {
        const val = row[i];
        if (val != null) {
          const str = String(val);
          const firstLineLen = str.split("\n")[0].length;
          if (firstLineLen > maxLen) maxLen = firstLineLen;
        }
      }
      return { wch: Math.min(Math.max(maxLen + 3, 12), 55) };
    });
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Uint8Array(buf);
}

export async function getConferenceRegistrationsSheet(): Promise<SheetDefinition> {
  const rows = await all<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    institution: string | null;
    department: string | null;
    year_of_study: string | null;
    user_city: string | null;
    category_key: string;
    category_label: string;
    residency: string;
    ieee_member: number;
    ieee_number: string | null;
    affiliation: string;
    designation: string | null;
    country: string;
    paper_ids: string | null;
    paper_titles: string | null;
    presenting_author: number;
    status: string;
    admin_notes: string | null;
    payment_status: string;
    payment_amount: number;
    payment_currency: string;
    payment_ref: string | null;
    payment_link: string | null;
    identity_proof_type?: string | null;
    identity_proof_number?: string | null;
    institution_id_number?: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT c.*, u.name, u.email, u.phone, u.institution, u.department, u.year_of_study, u.city AS user_city
       FROM conference_registrations c
       JOIN users u ON u.id = c.user_id
      ORDER BY c.created_at DESC`
  );

  const headers = [
    "Registration ID",
    "Full Name",
    "Email Address",
    "Phone Number",
    "Affiliation / Institution",
    "Designation",
    "Country",
    "City",
    "Department",
    "Year of Study",
    "Category Label",
    "Category Code",
    "Residency",
    "Identity Proof Type",
    "Identity Proof Number",
    "College Roll / Emp ID",
    "IEEE Member",
    "IEEE Number",
    "Paper ID(s)",
    "Paper Title(s)",
    "Presenting Author",
    "Registration Status",
    "Payment Status",
    "Payment Amount",
    "Payment Currency",
    "Payment Reference / UTR",
    "Payment Link",
    "Admin Notes",
    "Registered At (IST)",
    "Registered At (UTC)",
    "Last Updated (IST)",
  ];

  const sheetRows = rows.map((r) => [
    r.id,
    r.name,
    r.email,
    r.phone ?? "",
    r.affiliation || r.institution || "",
    r.designation ?? "",
    r.country,
    r.user_city ?? "",
    r.department ?? "",
    r.year_of_study ?? "",
    r.category_label,
    r.category_key,
    r.residency === "foreign" ? "Foreign" : "Indian",
    r.identity_proof_type ?? "",
    r.identity_proof_number ?? "",
    r.institution_id_number ?? "",
    r.ieee_member === 1 ? "Yes" : "No",
    r.ieee_number ?? "",
    r.paper_ids ?? "",
    r.paper_titles ?? "",
    r.presenting_author === 1 ? "Yes" : "No",
    r.status,
    r.payment_status,
    r.payment_amount,
    r.payment_currency,
    r.payment_ref ?? "",
    r.payment_link ?? "",
    r.admin_notes ?? "",
    fmtIst(r.created_at),
    r.created_at,
    fmtIst(r.updated_at),
  ]);

  return {
    name: "Conference Registrations",
    headers,
    rows: sheetRows,
  };
}

export async function getTechnextBookingsSheet(): Promise<SheetDefinition> {
  const rows = await all<{
    id: string;
    organization_name: string;
    organization_type: string;
    sector: string;
    contact_name: string;
    designation: string | null;
    email: string;
    phone: string;
    city: string;
    state: string | null;
    website: string | null;
    stall_type: string;
    representatives: string;
    exhibit_description: string;
    power_required: number;
    special_requirements: string | null;
    gst_number: string | null;
    status: string;
    admin_notes: string | null;
    payment_status: string;
    payment_amount: number;
    payment_currency: string;
    payment_ref: string | null;
    payment_link: string | null;
    identity_proof_type?: string | null;
    identity_proof_number?: string | null;
    institution_id_number?: string | null;
    created_at: string;
    updated_at: string;
  }>("SELECT * FROM technext_bookings ORDER BY created_at DESC");

  const headers = [
    "Booking ID",
    "Organization Name",
    "Organization Type",
    "Sector / Industry",
    "Contact Person Name",
    "Designation",
    "Email Address",
    "Phone Number",
    "City",
    "State",
    "Website",
    "Stall Type",
    "Representatives Count",
    "Representatives List",
    "Exhibit Description",
    "Power Required",
    "Special Requirements",
    "GSTIN Number",
    "Booking Status",
    "Payment Status",
    "Payment Amount",
    "Payment Currency",
    "Payment Reference / UTR",
    "Payment Link",
    "Admin Notes",
    "Booking Date (IST)",
    "Booking Date (UTC)",
    "Last Updated (IST)",
  ];

  const sheetRows = rows.map((r) => {
    const reps = parseJson<string[]>(r.representatives, []);
    return [
      r.id,
      r.organization_name,
      r.organization_type,
      r.sector,
      r.contact_name,
      r.designation ?? "",
      r.email,
      r.phone,
      r.city,
      r.state ?? "",
      r.website ?? "",
      r.stall_type,
      reps.length,
      reps.join("; "),
      r.exhibit_description,
      r.power_required ? "Yes" : "No",
      r.special_requirements ?? "",
      r.gst_number ?? "",
      r.status,
      r.payment_status,
      r.payment_amount,
      r.payment_currency,
      r.payment_ref ?? "",
      r.payment_link ?? "",
      r.admin_notes ?? "",
      fmtIst(r.created_at),
      r.created_at,
      fmtIst(r.updated_at),
    ];
  });

  return {
    name: "TechNext Bookings",
    headers,
    rows: sheetRows,
  };
}

export async function getEventSheets(event: EventRow): Promise<SheetDefinition[]> {
  const [people, teams, rounds] = await Promise.all([
    all<{
      name: string;
      email: string;
      phone: string | null;
      institution: string | null;
      department: string | null;
      year_of_study: string | null;
      city: string | null;
      team: string | null;
      team_code: string | null;
      member_role: string;
      payment_status: string;
      payment_amount: number;
      payment_currency: string;
      payment_ref: string | null;
      payment_link: string | null;
      registered_at: string;
    }>(
      `SELECT u.name, u.email, u.phone, u.institution, u.department, u.year_of_study, u.city,
              t.name AS team, t.code AS team_code, r.member_role, r.payment_status,
              r.payment_amount, r.payment_currency, r.payment_ref, r.payment_link, r.registered_at
         FROM registrations r
         JOIN users u ON u.id = r.user_id
         LEFT JOIN teams t ON t.id = r.team_id
        WHERE r.event_id = ?
        ORDER BY t.name, r.member_role = 'lead' DESC, u.name`,
      [event.id]
    ),
    all<{ id: string; name: string; code: string; final_rank: number | null; created_at: string }>(
      "SELECT id, name, code, final_rank, created_at FROM teams WHERE event_id = ? ORDER BY name",
      [event.id]
    ),
    getRounds(event.id),
  ]);

  const members = await all<{ team_id: string; name: string; email: string; phone: string | null; member_role: string }>(
    "SELECT r.team_id, u.name, u.email, u.phone, r.member_role FROM registrations r JOIN users u ON u.id = r.user_id WHERE r.event_id = ? AND r.team_id IS NOT NULL",
    [event.id]
  );
  const byTeam = new Map<string, typeof members>();
  for (const m of members) byTeam.set(m.team_id, [...(byTeam.get(m.team_id) ?? []), m]);

  const participantHeaders = [
    "Full Name",
    "Email Address",
    "Phone Number",
    "Institution / College",
    "Department",
    "Year of Study",
    "City",
    "Team Name",
    "Team Code",
    "Role in Team",
    "Payment Status",
    "Payment Amount",
    "Payment Currency",
    "Payment Reference / UTR",
    "Payment Link",
    "Registered At (IST)",
    "Registered At (UTC)",
  ];

  const participantRows = people.map((p) => [
    p.name,
    p.email,
    p.phone ?? "",
    p.institution ?? "",
    p.department ?? "",
    p.year_of_study ?? "",
    p.city ?? "",
    p.team ?? "Individual",
    p.team_code ?? "",
    p.member_role === "lead" ? "Team Leader" : "Member",
    p.payment_status,
    p.payment_amount,
    p.payment_currency,
    p.payment_ref ?? "",
    p.payment_link ?? "",
    fmtIst(p.registered_at),
    p.registered_at,
  ]);

  const teamHeaders = [
    "Team Name",
    "Team Code",
    "Final Rank",
    "Team Leader Name",
    "Team Leader Email",
    "Team Leader Phone",
    "Total Members",
    "All Member Names",
    "All Member Emails",
    "All Member Phones",
    "Created At (IST)",
    "Created At (UTC)",
  ];

  const teamRows = teams.map((t) => {
    const ms = byTeam.get(t.id) ?? [];
    const lead = ms.find((m) => m.member_role === "lead");
    return [
      t.name,
      t.code,
      t.final_rank != null ? rankLabel(t.final_rank) : "—",
      lead?.name ?? "—",
      lead?.email ?? "—",
      lead?.phone ?? "—",
      ms.length,
      ms.map((m) => m.name).join("; "),
      ms.map((m) => m.email).join("; "),
      ms.map((m) => m.phone ?? "").join("; "),
      fmtIst(t.created_at),
      t.created_at,
    ];
  });

  const sheets: SheetDefinition[] = [
    { name: "Participants", headers: participantHeaders, rows: participantRows },
    { name: "Teams", headers: teamHeaders, rows: teamRows },
  ];

  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  for (const r of rounds) {
    const fields = roundFields(r, event);
    const subs = await all<{ team_id: string; data: string; updated_at: string }>(
      "SELECT team_id, data, updated_at FROM submissions WHERE round_id = ?",
      [r.id]
    );
    if (subs.length > 0) {
      sheets.push({
        name: `R${r.seq} Submissions`,
        headers: ["Team Name", ...fields.map((f) => f.label), "Submitted At (IST)"],
        rows: subs.map((s) => {
          const d = parseJson<Record<string, string>>(s.data, {});
          return [teamName.get(s.team_id) ?? s.team_id, ...fields.map((f) => d[f.key] ?? ""), fmtIst(s.updated_at)];
        }),
      });
    }

    const board = await roundLeaderboard(r);
    if (board.length > 0) {
      const criteria = roundCriteria(r);
      sheets.push({
        name: `R${r.seq} Leaderboard`,
        headers: ["Rank", "Team Name", ...criteria.map((c) => `Avg ${c.label}`), "Avg Total", "Evaluations", "Qualified"],
        rows: board.map((b, i) => [
          i + 1,
          b.team_name,
          ...criteria.map((c) => b.criteria[c.key] ?? ""),
          b.avg_total ?? "",
          b.evaluations,
          b.qualified == null ? "Pending" : b.qualified ? "Yes" : "No",
        ]),
      });
    }
  }

  const winners = teams.filter((t) => t.final_rank != null && t.final_rank <= event.winners_count).sort((a, b) => a.final_rank! - b.final_rank!);
  if (winners.length > 0) {
    sheets.push({
      name: "Winners",
      headers: ["Rank", "Title", "Team Name", "Team Code", "Leader Name", "Leader Email", "Leader Phone", "Members"],
      rows: winners.map((t) => {
        const ms = byTeam.get(t.id) ?? [];
        const lead = ms.find((m) => m.member_role === "lead");
        return [
          t.final_rank,
          rankLabel(t.final_rank),
          t.name,
          t.code,
          lead?.name ?? "",
          lead?.email ?? "",
          lead?.phone ?? "",
          ms.map((m) => m.name).join(", "),
        ];
      }),
    });
  }

  return sheets;
}

export async function getAllEventsSheet(): Promise<SheetDefinition> {
  const people = await all<{
    event_title: string;
    event_slug: string;
    name: string;
    email: string;
    phone: string | null;
    institution: string | null;
    department: string | null;
    year_of_study: string | null;
    city: string | null;
    team: string | null;
    team_code: string | null;
    member_role: string;
    payment_status: string;
    payment_amount: number;
    payment_currency: string;
    payment_ref: string | null;
    payment_link: string | null;
    registered_at: string;
  }>(
    `SELECT e.title AS event_title, e.slug AS event_slug, u.name, u.email, u.phone,
            u.institution, u.department, u.year_of_study, u.city,
            t.name AS team, t.code AS team_code, r.member_role,
            r.payment_status, r.payment_amount, r.payment_currency, r.payment_ref, r.payment_link, r.registered_at
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       JOIN users u ON u.id = r.user_id
       LEFT JOIN teams t ON t.id = r.team_id
      ORDER BY e.title, t.name, r.registered_at DESC`
  );

  const headers = [
    "Event Title",
    "Event Slug",
    "Participant Name",
    "Email Address",
    "Phone Number",
    "Institution / College",
    "Department",
    "Year of Study",
    "City",
    "Team Name",
    "Team Code",
    "Role in Team",
    "Payment Status",
    "Payment Amount",
    "Payment Currency",
    "Payment Reference / UTR",
    "Payment Link",
    "Registered At (IST)",
    "Registered At (UTC)",
  ];

  const rows = people.map((p) => [
    p.event_title,
    p.event_slug,
    p.name,
    p.email,
    p.phone ?? "",
    p.institution ?? "",
    p.department ?? "",
    p.year_of_study ?? "",
    p.city ?? "",
    p.team ?? "Individual",
    p.team_code ?? "",
    p.member_role === "lead" ? "Leader" : "Member",
    p.payment_status,
    p.payment_amount,
    p.payment_currency,
    p.payment_ref ?? "",
    p.payment_link ?? "",
    fmtIst(p.registered_at),
    p.registered_at,
  ]);

  return {
    name: "All Event Registrations",
    headers,
    rows,
  };
}

export async function getUsersSheet(): Promise<SheetDefinition> {
  const users = await all<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    institution: string | null;
    department: string | null;
    year_of_study: string | null;
    city: string | null;
    role: string;
    email_verified: number;
    conf_count: number;
    technext_count: number;
    event_count: number;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT u.*,
            (SELECT COUNT(*) FROM conference_registrations cr WHERE cr.user_id = u.id) AS conf_count,
            (SELECT COUNT(*) FROM technext_bookings tb WHERE tb.user_id = u.id) AS technext_count,
            (SELECT COUNT(*) FROM registrations r WHERE r.user_id = u.id) AS event_count
       FROM users u
      ORDER BY u.created_at DESC`
  );

  const headers = [
    "User ID",
    "Full Name",
    "Email Address",
    "Phone Number",
    "Institution / College",
    "Department",
    "Year of Study",
    "City",
    "User Role",
    "Email Verified",
    "Conference Registered",
    "TechNext Registered",
    "Events Registered Count",
    "Joined Date (IST)",
    "Joined Date (UTC)",
    "Last Updated (IST)",
  ];

  const rows = users.map((u) => [
    u.id,
    u.name,
    u.email,
    u.phone ?? "",
    u.institution ?? "",
    u.department ?? "",
    u.year_of_study ?? "",
    u.city ?? "",
    u.role,
    u.email_verified ? "Yes" : "No",
    u.conf_count > 0 ? "Yes" : "No",
    u.technext_count > 0 ? "Yes" : "No",
    u.event_count,
    fmtIst(u.created_at),
    u.created_at,
    fmtIst(u.updated_at),
  ]);

  return {
    name: "Users Directory",
    headers,
    rows,
  };
}
