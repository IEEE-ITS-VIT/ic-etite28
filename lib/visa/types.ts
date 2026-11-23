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

export type VisaFieldFont = "Helvetica" | "Helvetica-Bold" | "Times-Roman" | "Times-Bold" | "Times-Italic" | "Courier";

export interface VisaLayoutField {
  id: string;
  key: string;
  label: string;
  enabled: boolean;
  x: number; // 0 to 1
  y: number; // 0 to 1
  size: number; // points
  color: string; // hex
  font: VisaFieldFont;
  align: "left" | "center" | "right";
  width?: number; // max width in pt, 0 = no wrap
  text?: string; // template string with {{placeholders}}
}

export interface VisaLayout {
  fields: VisaLayoutField[];
}

export interface VisaTemplateRow {
  id: string;
  file_b64: string | null;
  preview_b64: string | null;
  mime: string;
  width: number;
  height: number;
  layout: string;
  updated_at: string;
}

export const VISA_SAMPLE_VALUES: Record<string, string> = {
  name: "Dr. Alexander von Humboldt",
  passport_number: "P123456789",
  passport_expiry: "15 October 2031",
  date_of_birth: "22 June 1988",
  dob: "22 June 1988",
  nationality: "German",
  country_of_birth: "Germany",
  gender: "Male",
  affiliation: "Technical University of Munich (TUM)",
  designation: "Associate Professor",
  country: "Germany",
  city: "Munich",
  address: "Arcisstrasse 21, 80333 Munich, Germany",
  paper_id: "ETITE-2028-402",
  paper_title: "Deep Reinforcement Learning in Low-Latency Autonomous Edge Robotics",
  dates: "10-11 February 2028",
  venue: "Vellore Institute of Technology (VIT), Vellore, Tamil Nadu, India",
  registration_id: "CONF-REG-2028-099",
  ref_no: "VIT/ic-ETITE28/VISA/2028/00142",
  issue_date: "23 November 2026",
  arrival_date: "08 February 2028",
  departure_date: "13 February 2028",
  embassy: "Consulate General of India, Frankfurt\nKohlstrasse 8, Frankfurt am Main, Germany",
};

export const DEFAULT_VISA_LAYOUT: VisaLayout = {
  fields: [
    {
      id: "f_ref",
      key: "ref_no",
      label: "Reference Number",
      enabled: true,
      x: 0.08,
      y: 0.15,
      size: 9,
      color: "#002147",
      font: "Helvetica-Bold",
      align: "left",
      text: "Ref: {{ref_no}}",
    },
    {
      id: "f_date",
      key: "issue_date",
      label: "Issue Date",
      enabled: true,
      x: 0.92,
      y: 0.15,
      size: 9,
      color: "#101B2E",
      font: "Helvetica-Bold",
      align: "right",
      text: "Date: {{issue_date}}",
    },
    {
      id: "f_embassy",
      key: "embassy",
      label: "Addressee / Embassy",
      enabled: true,
      x: 0.08,
      y: 0.19,
      size: 8.5,
      color: "#101B2E",
      font: "Helvetica",
      align: "left",
      width: 260,
      text: "{{embassy}}",
    },
    {
      id: "f_subj",
      key: "subject",
      label: "Subject Line",
      enabled: true,
      x: 0.08,
      y: 0.25,
      size: 9.5,
      color: "#002147",
      font: "Helvetica-Bold",
      align: "left",
      width: 500,
      text: "SUBJECT: OFFICIAL INVITATION LETTER FOR INDIAN CONFERENCE VISA",
    },
    {
      id: "f_open",
      key: "opening",
      label: "Opening Statement",
      enabled: true,
      x: 0.08,
      y: 0.29,
      size: 8.5,
      color: "#101B2E",
      font: "Helvetica",
      align: "left",
      width: 500,
      text: "Dear Visa / Consular Officer,\n\nOn behalf of the Organising Committee, we confirm that {{name}} has registered to attend the 3rd International Conference on Emerging Trends in Information Technology and Engineering (ic-ETITE'28), held at Vellore Institute of Technology (VIT), Vellore, Tamil Nadu, India from 10 to 11 February 2028.",
    },
    {
      id: "f_details",
      key: "applicant_table",
      label: "Applicant Particulars",
      enabled: true,
      x: 0.08,
      y: 0.38,
      size: 8.5,
      color: "#002147",
      font: "Helvetica",
      align: "left",
      width: 500,
      text: "Applicant Details:\n• Full Name: {{name}}\n• Passport Number: {{passport_number}} (Expiry: {{passport_expiry}})\n• Nationality: {{nationality}} | DOB: {{dob}}\n• Institution: {{affiliation}} ({{designation}})\n• Country: {{country}} | Registration Ref: {{registration_id}}",
    },
    {
      id: "f_paper",
      key: "paper_info",
      label: "Accepted Paper Details",
      enabled: true,
      x: 0.08,
      y: 0.51,
      size: 8.5,
      color: "#101B2E",
      font: "Helvetica",
      align: "left",
      width: 500,
      text: "Accepted Paper ID: {{paper_id}} - \"{{paper_title}}\"\nThe applicant has been invited to deliver an oral presentation in the technical sessions of the conference.",
    },
    {
      id: "f_purpose",
      key: "purpose",
      label: "Purpose & Non-Employment",
      enabled: true,
      x: 0.08,
      y: 0.59,
      size: 8.5,
      color: "#101B2E",
      font: "Helvetica",
      align: "left",
      width: 500,
      text: "The purpose of this visit is strictly academic. Vellore Institute of Technology confirms that no remuneration or employment will be provided in India. The delegate will return to their country of residence immediately upon the conclusion of the event.",
    },
    {
      id: "f_clearances",
      key: "clearances",
      label: "Statutory Clearances (MEA/MHA)",
      enabled: true,
      x: 0.08,
      y: 0.67,
      size: 8.5,
      color: "#101B2E",
      font: "Helvetica",
      align: "left",
      width: 500,
      text: "ic-ETITE'28 is held with all statutory clearances from the Government of India, including MEA Political Clearance, MHA Event Clearance, and MoE Nodal Clearance. The applicant is eligible for an Indian Conference Visa / e-Conference Visa.",
    },
    {
      id: "f_closing",
      key: "closing",
      label: "Consular Request & Signatory",
      enabled: true,
      x: 0.08,
      y: 0.76,
      size: 8.5,
      color: "#101B2E",
      font: "Helvetica",
      align: "left",
      width: 500,
      text: "We respectfully request the Consular Authorities to grant the necessary Conference Visa to enable {{name}} to attend.\n\nYours sincerely,\nGeneral Chair, ic-ETITE'28\nSchool of Information Technology and Engineering (SITE)\nVellore Institute of Technology (VIT), Vellore - 632014, India\nEmail: icetiteconference@vit.ac.in",
    },
    {
      id: "f_name_only",
      key: "name",
      label: "Participant Name (Standalone)",
      enabled: false,
      x: 0.35,
      y: 0.35,
      size: 11,
      color: "#002147",
      font: "Times-Bold",
      align: "left",
      text: "{{name}}",
    },
    {
      id: "f_pass_only",
      key: "passport_number",
      label: "Passport Number (Standalone)",
      enabled: false,
      x: 0.35,
      y: 0.38,
      size: 10,
      color: "#101B2E",
      font: "Helvetica-Bold",
      align: "left",
      text: "{{passport_number}}",
    },
    {
      id: "f_nat_only",
      key: "nationality",
      label: "Nationality (Standalone)",
      enabled: false,
      x: 0.35,
      y: 0.41,
      size: 10,
      color: "#101B2E",
      font: "Helvetica",
      align: "left",
      text: "{{nationality}}",
    },
    {
      id: "f_aff_only",
      key: "affiliation",
      label: "Affiliation (Standalone)",
      enabled: false,
      x: 0.35,
      y: 0.44,
      size: 10,
      color: "#101B2E",
      font: "Helvetica",
      align: "left",
      text: "{{affiliation}}",
    },
  ],
};
