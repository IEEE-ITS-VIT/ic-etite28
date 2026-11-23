export type VisaStatus = "pending" | "approved" | "rejected";

export interface VisaRequestRow {
  id: string;
  user_id: string;
  registration_id: string;
  passport_name: string;
  passport_number: string;
  passport_expiry: string;
  date_of_birth: string;
  nationality: string;
  country_of_birth: string | null;
  gender: string | null;
  affiliation: string;
  designation: string | null;
  address: string | null;
  city: string | null;
  country: string;
  embassy_details: string | null;
  paper_id: string | null;
  paper_title: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  additional_notes: string | null;
  status: VisaStatus;
  admin_notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisaRequestWithUser extends VisaRequestRow {
  user_name: string;
  user_email: string;
  user_phone: string | null;
  reg_category: string;
  reg_residency: string;
  reg_status: string;
  reg_payment_status: string;
  reg_payment_amount: number;
  reg_payment_currency: string;
}

export interface VisaTemplate {
  refPrefix: string;
  title: string;
  conferenceTitle: string;
  conferenceShortName: string;
  organizer: string;
  venue: string;
  dates: string;
  addressee: string;
  openingText: string;
  paperText: string;
  purposeText: string;
  clearancesText: string;
  closingText: string;
  signatoryName: string;
  signatoryTitle: string;
  signatoryDept: string;
  signatoryOrg: string;
  signatoryEmail: string;
  signatoryPhone: string;
  notes: string;
}
