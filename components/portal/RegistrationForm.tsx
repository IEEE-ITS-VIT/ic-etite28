"use client";

import { useState } from "react";
import type { EarlyBird } from "@/lib/pricing";
import { isEarlyBird, priceNow } from "@/lib/pricing";
import SubmitButton from "@/components/portal/SubmitButton";
import { Field, inputCls, labelCls } from "@/components/portal/ui";
import { ShieldCheck, Award, Building, FileText } from "lucide-react";

export interface FeeTier {
  key: string;
  category: string;
  inr: number | null;
  usd: number | null;
  earlyInr?: number | null;
  earlyUsd?: number | null;
  isIeeeDiscount?: boolean;
}

export interface RegData {
  id: string;
  category_key: string;
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
  payment_status: string;
  payment_amount: number;
  payment_currency: string;
  identity_proof_type?: string | null;
  identity_proof_number?: string | null;
  institution_id_number?: string | null;
  department?: string | null;
}

interface RegistrationFormProps {
  user: {
    name: string;
    email: string;
    institution?: string | null;
    department?: string | null;
  };
  fees: FeeTier[];
  reg?: RegData | null;
  locked: boolean;
  open: boolean;
  earlyBird: EarlyBird;
  action: (formData: FormData) => Promise<void>;
}

function formatInr(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `INR ${amount.toLocaleString("en-IN")}`;
}

function formatUsd(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `USD ${amount.toLocaleString("en-US")}`;
}

export function RegistrationForm({ user, fees, reg, locked, open, earlyBird, action }: RegistrationFormProps) {
  const [residency, setResidency] = useState<"indian" | "foreign">(
    (reg?.residency as "indian" | "foreign") || "indian"
  );
  const [categoryKey, setCategoryKey] = useState<string>(
    reg?.category_key || fees[0]?.key || "tier-1"
  );
  const [presentingAuthor, setPresentingAuthor] = useState<"yes" | "no">(
    reg ? (reg.presenting_author === 1 ? "yes" : "no") : "yes"
  );

  const selectedTier = fees.find((f) => f.key === categoryKey) || fees[0];
  const isIeee = Boolean(
    selectedTier?.isIeeeDiscount ||
      /ieee/i.test(selectedTier?.category || "") ||
      categoryKey.toLowerCase().includes("ieee")
  );
  const isVit = Boolean(
    /vit/i.test(selectedTier?.category || "") ||
      categoryKey.toLowerCase().includes("vit")
  );
  const isStudent = Boolean(
    /student|scholar/i.test(selectedTier?.category || "")
  );
  const isFaculty = Boolean(
    /faculty|academician/i.test(selectedTier?.category || "")
  );
  const isIndustry = Boolean(
    /industry/i.test(selectedTier?.category || "")
  );

  return (
    <form action={action} className="space-y-7">
      <fieldset disabled={locked || !open} className="space-y-7">
        {/* ─── Profile & Residency Section ─── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="h-5 w-5 text-brand-primary" />
            <h3 className="text-base font-bold text-slate-800">Delegate Profile & Verification</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Registering as">
              <input value={`${user.name} (${user.email})`} disabled className={inputCls} />
            </Field>

            <Field label="Delegate type *">
              <select
                name="residency"
                value={residency}
                onChange={(e) => setResidency(e.target.value as "indian" | "foreign")}
                className={inputCls}
                required
              >
                <option value="indian">Indian delegate (INR)</option>
                <option value="foreign">Foreign delegate (USD)</option>
              </select>
            </Field>
          </div>

          {/* Dynamic Identity Proof Input */}
          <input
            type="hidden"
            name="identity_proof_type"
            value={residency === "indian" ? "Indian Identity (Aadhaar / Govt ID)" : "Passport"}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {residency === "indian" ? (
              <Field
                label="Identity proof (Aadhaar / Voter ID / Govt ID number) *"
                hint="Mandatory Indian identity proof verification"
              >
                <input
                  name="identity_proof_number"
                  required
                  defaultValue={reg?.identity_proof_number ?? ""}
                  placeholder="e.g. 12-digit Aadhaar number or Govt ID number"
                  className={inputCls}
                />
              </Field>
            ) : (
              <Field
                label="Passport number (Identity proof) *"
                hint="Mandatory foreign passport verification"
              >
                <input
                  name="identity_proof_number"
                  required
                  defaultValue={reg?.identity_proof_number ?? ""}
                  placeholder="e.g. Valid passport number"
                  className={inputCls}
                />
              </Field>
            )}

            <Field label="Country *">
              <input
                name="country"
                required
                defaultValue={reg?.country ?? (residency === "indian" ? "India" : "")}
                placeholder="Country of residence"
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* ─── Category Selection Section ─── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Award className="h-5 w-5 text-brand-primary" />
            <h3 className="text-base font-bold text-slate-800">Registration Category</h3>
          </div>

          <div className="space-y-2">
            {fees.map((f) => {
              const checked = categoryKey === f.key;
              const inrPrice = priceNow(f.inr, f.earlyInr, earlyBird);
              const usdPrice = priceNow(f.usd, f.earlyUsd, earlyBird);
              const tierIsIeee = Boolean(f.isIeeeDiscount || /ieee/i.test(f.category));

              return (
                <label
                  key={f.key}
                  className={`flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-all ${
                    checked
                      ? "border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/20 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="category"
                      value={f.key}
                      checked={checked}
                      onChange={() => setCategoryKey(f.key)}
                      required
                      className="h-4 w-4 accent-brand-primary cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">{f.category}</div>
                      {tierIsIeee && (
                        <span className="inline-block mt-0.5 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                          IEEE Member Discounted Rate
                        </span>
                      )}
                      {f.category.includes("VIT") && (
                        <span className="inline-block mt-0.5 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                          VIT Internal Delegate Rate
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-sm font-bold text-brand-primary">
                    {residency === "indian" ? (
                      <div>
                        {inrPrice.early && (
                          <span className="mr-1.5 text-xs text-slate-400 line-through">
                            {formatInr(f.inr)}
                          </span>
                        )}
                        <span className={inrPrice.early ? "text-emerald-700" : ""}>
                          {formatInr(inrPrice.amount)}
                        </span>
                      </div>
                    ) : (
                      <div>
                        {usdPrice.early && (
                          <span className="mr-1.5 text-xs text-slate-400 line-through">
                            {formatUsd(f.usd)}
                          </span>
                        )}
                        <span className={usdPrice.early ? "text-emerald-700" : ""}>
                          {formatUsd(usdPrice.amount)}
                        </span>
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* ─── Institutional Details & Identity Requirements ─── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="h-5 w-5 text-brand-primary" />
            <h3 className="text-base font-bold text-slate-800">Institutional & Membership Identification</h3>
          </div>

          {/* Automatic IEEE Membership field if IEEE member category selected - NO CHECKBOX */}
          <input type="hidden" name="ieee_member" value={isIeee ? "1" : "0"} />
          {isIeee && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
              <Field
                label="IEEE membership number / ID *"
                hint="6 to 12-digit IEEE membership number required for member discount"
              >
                <input
                  name="ieee_number"
                  required
                  defaultValue={reg?.ieee_number ?? ""}
                  placeholder="e.g. 9XXXXXXXX (6-12 digits)"
                  inputMode="numeric"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {/* Dynamic Institutional ID / VIT Branch Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            {isVit ? (
              <>
                <Field
                  label="VIT Branch / School / Department *"
                  hint="Specify your VIT school (e.g. SCOPE, SENSE, SELECT, SMEC, SAS)"
                >
                  <input
                    name="department"
                    required
                    defaultValue={reg?.department ?? user.department ?? ""}
                    placeholder="e.g. SCOPE, SENSE, SELECT"
                    className={inputCls}
                  />
                </Field>
                <Field
                  label="VIT Employee ID / Registration number *"
                  hint="VIT staff employee ID or student registration number"
                >
                  <input
                    name="institution_id_number"
                    required
                    defaultValue={reg?.institution_id_number ?? ""}
                    placeholder="e.g. 5XXXX (Emp ID) or 21BCE0001 (Reg No.)"
                    className={inputCls}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field
                  label={
                    isStudent
                      ? "College roll no. / Student registration number *"
                      : isFaculty
                      ? "Faculty employee ID / Institutional ID *"
                      : isIndustry
                      ? "Corporate employee ID / Work ID *"
                      : "College roll no. / Employee ID / Institutional ID *"
                  }
                  hint="Mandatory identification number for delegate credentials"
                >
                  <input
                    name="institution_id_number"
                    required
                    defaultValue={reg?.institution_id_number ?? ""}
                    placeholder={
                      isStudent
                        ? "e.g. 21BCE1234 or College Roll Number"
                        : "e.g. Employee ID or Institutional Reg No."
                    }
                    className={inputCls}
                  />
                </Field>

                <Field label="Department / Specialization (optional)">
                  <input
                    name="department"
                    defaultValue={reg?.department ?? user.department ?? ""}
                    placeholder="e.g. Computer Science, Electronics, AI"
                    className={inputCls}
                  />
                </Field>
              </>
            )}

            <Field label="Affiliation (institution / organisation) *">
              <input
                name="affiliation"
                required
                defaultValue={reg?.affiliation ?? user.institution ?? (isVit ? "Vellore Institute of Technology" : "")}
                placeholder="University, College, or Company name"
                className={inputCls}
              />
            </Field>

            <Field label="Designation">
              <input
                name="designation"
                defaultValue={reg?.designation ?? ""}
                placeholder="Professor / Research Scholar / Student / Engineer"
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* ─── Paper & Presentation Details (No Checkboxes) ─── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="h-5 w-5 text-brand-primary" />
            <h3 className="text-base font-bold text-slate-800">Conference Paper & Presentation</h3>
          </div>

          <div>
            <span className={labelCls}>Are you the presenting author? *</span>
            <div className="grid gap-3 sm:grid-cols-2 mt-1.5">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all ${
                  presentingAuthor === "yes"
                    ? "border-brand-primary bg-brand-primary/5 text-brand-primary font-bold ring-2 ring-brand-primary/20"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="presenting_author_choice"
                  value="yes"
                  checked={presentingAuthor === "yes"}
                  onChange={() => setPresentingAuthor("yes")}
                  className="h-4 w-4 accent-brand-primary cursor-pointer"
                />
                <span className="text-sm">Yes, I am the presenting author</span>
              </label>

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all ${
                  presentingAuthor === "no"
                    ? "border-brand-primary bg-brand-primary/5 text-brand-primary font-bold ring-2 ring-brand-primary/20"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="presenting_author_choice"
                  value="no"
                  checked={presentingAuthor === "no"}
                  onChange={() => setPresentingAuthor("no")}
                  className="h-4 w-4 accent-brand-primary cursor-pointer"
                />
                <span className="text-sm">No, co-author / participant delegate</span>
              </label>
            </div>
            <input type="hidden" name="presenting_author" value={presentingAuthor === "yes" ? "1" : "0"} />
          </div>

          <Field
            label={`CMT paper ID(s) ${presentingAuthor === "yes" ? "*" : "(optional)"}`}
            hint={
              presentingAuthor === "yes"
                ? "Comma-separated, e.g. 123, 456 (Required for presenting authors)"
                : "Optional for co-authors or non-presenting participants"
            }
          >
            <input
              name="paper_ids"
              required={presentingAuthor === "yes"}
              defaultValue={reg?.paper_ids ?? ""}
              placeholder="e.g. 123, 456"
              className={inputCls}
            />
          </Field>

          <Field label="Paper title(s)">
            <textarea
              name="paper_titles"
              rows={2}
              defaultValue={reg?.paper_titles ?? ""}
              placeholder="Title of submitted conference paper(s)"
              className={inputCls}
            />
          </Field>
        </div>
      </fieldset>

      {!locked && open && (
        <SubmitButton pendingText="Saving…">
          {reg ? "Update registration" : "Register"}
        </SubmitButton>
      )}

      {locked && (
        <p className="text-sm font-medium text-slate-600 bg-slate-100 p-3 rounded-xl text-center">
          Your registration is confirmed. Contact the secretariat for any modifications.
        </p>
      )}
    </form>
  );
}
