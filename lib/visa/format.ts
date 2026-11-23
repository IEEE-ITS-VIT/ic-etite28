import type { VisaLayoutField, VisaRequestRow } from "@/lib/visa/types";

export function formatDate(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function getVisaPlaceholderMap(req: VisaRequestRow): Record<string, string> {
  const issueDate = formatDate(req.approved_at || req.created_at);
  const refNo = `VIT/ic-ETITE28/VISA/${new Date().getFullYear()}/${req.id.replace(/[^\w]/g, "").slice(0, 6).toUpperCase()}`;

  return {
    name: req.passport_name || "",
    passport: req.passport_number || "",
    passportNumber: req.passport_number || "",
    passport_number: req.passport_number || "",
    passportExpiry: req.passport_expiry || "",
    passport_expiry: req.passport_expiry || "",
    nationality: req.nationality || "",
    countryOfBirth: req.country_of_birth || req.nationality || "",
    country_of_birth: req.country_of_birth || req.nationality || "",
    dob: req.date_of_birth || "",
    date_of_birth: req.date_of_birth || "",
    gender: req.gender || "Unspecified",
    affiliation: req.affiliation || "",
    designation: req.designation || "Delegate",
    country: req.country || "",
    city: req.city || "",
    address: req.address || "",
    paperId: req.paper_id || "N/A",
    paper_id: req.paper_id || "N/A",
    paperTitle: req.paper_title || "Technical Session Presentation",
    paper_title: req.paper_title || "Technical Session Presentation",
    registrationRef: req.registration_id || "",
    registration_id: req.registration_id || "",
    refNo: refNo,
    ref_no: refNo,
    date: issueDate,
    issue_date: issueDate,
    dates: "10-11 February 2028",
    venue: "Vellore Institute of Technology (VIT), Vellore, Tamil Nadu, India",
    conferenceTitle: "3rd International Conference on Emerging Trends in Information Technology and Engineering (ic-ETITE'28)",
    conferenceShortName: "ic-ETITE'28",
    arrivalDate: req.arrival_date || "February 2028",
    departureDate: req.departure_date || "February 2028",
    embassy: req.embassy_details || "To Whom It May Concern / The Consular Officer\nEmbassy / Consulate General of India",
  };
}

export function getVisaFieldValue(field: VisaLayoutField, req: VisaRequestRow, isPreview?: boolean): string {
  const map = getVisaPlaceholderMap(req);

  if (field.text) {
    return field.text.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k: string) => map[k] ?? map[k.toLowerCase()] ?? "");
  }

  return map[field.key] ?? map[field.key.toLowerCase()] ?? "";
}
