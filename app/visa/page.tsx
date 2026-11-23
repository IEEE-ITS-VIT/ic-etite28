import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  Mail,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Building2,
  ArrowRight,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import E from "@/components/cms/E";
import { getCurrentUser } from "@/lib/auth/session";
import { first } from "@/lib/db";
import { getVisaRequestForUser } from "@/lib/visa/server";

export const metadata: Metadata = pageMetadata("/visa", {
  title: "Visa Information & Facilitation | ic-ETITE'28",
  description:
    "Official Indian Conference Visa guidelines, Government of India clearances, and invitation letter assistance for international delegates of ic-ETITE'28 at VIT Vellore.",
});

export default async function VisaPage() {
  const user = await getCurrentUser();
  const registration = user
    ? await first<{
        id: string;
        category_label: string;
        status: string;
        payment_status: string;
      }>(
        "SELECT id, category_label, status, payment_status FROM conference_registrations WHERE user_id = ?",
        [user.id]
      ).catch(() => null)
    : null;

  const visaRequest = user && registration ? await getVisaRequestForUser(user.id).catch(() => null) : null;

  return (
    <div className="bg-brand-surface min-h-screen text-brand-primary">
      <PageHeader
        badge="International Delegates & Authors · Embassy Facilitation"
        title="Conference Visa & Travel Clearance"
        subtitle="Official visa facilitation guidelines, Government of India statutory clearances, and invitation letter protocols for international participants attending ic-ETITE'28 at VIT Vellore."
        breadcrumb="Visa Information"
        bgImage="/images/frame_.webp"
      />

      <div className="container-x py-8 sm:py-12 space-y-8">
        {/* Registered Delegate Quick Action Banner - Show ONLY for registered conference users */}
        {registration && (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-950 via-brand-primary-dark to-[#002A5C] text-white border-2 border-emerald-400/40 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30 shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-0.5 rounded-full">
                    Registered Conference Delegate
                  </span>
                  {registration.category_label && (
                    <span className="text-xs text-emerald-200/90 font-medium">
                      {registration.category_label}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
                  {visaRequest?.status === "approved"
                    ? "Your Visa Facilitation Letter is Approved!"
                    : visaRequest?.status === "pending"
                    ? "Your Visa Letter Request is Under Review"
                    : visaRequest?.status === "rejected"
                    ? "Visa Letter Request Needs Attention"
                    : "Apply for Your Official Visa Invitation Letter"}
                </h2>
                <p className="text-xs sm:text-sm text-white/80 max-w-xl font-normal leading-relaxed">
                  {visaRequest?.status === "approved"
                    ? "Your official invitation letter bearing institutional clearances is ready for download and embassy submission."
                    : visaRequest?.status === "pending"
                    ? "Your submitted passport particulars and travel schedule are currently being reviewed by the conference secretariat."
                    : visaRequest?.status === "rejected"
                    ? `Admin note: ${visaRequest.admin_notes || "Please revise your passport details."}`
                    : "As a registered delegate, you are eligible to request an official personalized facilitation letter with institutional seal and Government of India clearance attachments."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0 w-full lg:w-auto">
              {visaRequest?.status === "approved" ? (
                <>
                  <a
                    href="/api/visa-letter"
                    download
                    className="bg-brand-accent hover:bg-brand-accent-dark text-brand-primary font-bold text-xs sm:text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Visa Letter (PDF)</span>
                  </a>
                  <Link
                    href="/dashboard/visa"
                    className="bg-white/10 hover:bg-white/20 text-white font-medium text-xs sm:text-sm px-4 py-3 rounded-xl border border-white/20 flex items-center justify-center gap-1.5 transition"
                  >
                    <span>View in Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              ) : visaRequest?.status === "pending" ? (
                <Link
                  href="/dashboard/visa"
                  className="bg-brand-accent hover:bg-brand-accent-dark text-brand-primary font-bold text-xs sm:text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Clock className="w-4 h-4" />
                  <span>Check Status in Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href="/dashboard/visa"
                  className="bg-brand-accent hover:bg-brand-accent-dark text-brand-primary font-bold text-xs sm:text-sm px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition"
                >
                  <FileText className="w-4 h-4" />
                  <span>Apply from Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Important Notice Callout */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-brand-primary/15 shadow-sm flex flex-col md:flex-row items-start gap-5">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary text-brand-accent flex items-center justify-center shrink-0 shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-[#FFF4DB] text-brand-primary border border-brand-accent-dark px-2.5 py-0.5 rounded-full"><E f="visa">{"Statutory Requirement"}</E></span>
              <span className="text-xs text-slate-500 font-medium"><E f="visa">{"Government of India Regulations"}</E></span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-primary"><E f="visa">{"Conference Visa Protocol for Foreign Nationals"}</E></h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal"><E f="visa">{"All foreign nationals (except citizens of Nepal and Bhutan holding valid identification) require a valid"}</E><E f="visa">{" "}</E>
              <strong><E f="visa">{"Conference Visa"}</E></strong><E f="visa">{" or an "}</E><strong><E f="visa">{"e-Conference Visa"}</E></strong><E f="visa">{" issued by the Government of India to enter India and present research papers or attend ic-ETITE'28. Tourist visas are"}</E><E f="visa">{" "}</E>
              <strong className="text-rose-700"><E f="visa">{"strictly prohibited"}</E></strong><E f="visa">{" for presenting papers or attending academic conferences."}</E></p>
          </div>
        </div>

        {/* Visa Types Comparison */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-widest font-extrabold text-[#DE6D1B] bg-[#FFF4EB] px-3 py-1 rounded-full border border-[#DE6D1B]/30"><E f="visa">{"Visa Categories"}</E></span>
            <h2 className="font-serif text-3xl font-bold text-brand-primary mt-3"><E f="visa">{"Available Visa Pathways"}</E></h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1"><E f="visa">{"Choose the appropriate visa category based on your nationality and embassy regulations."}</E></p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Option 1: e-Conference Visa */}
            <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 shadow-sm hover:border-brand-primary transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider"><E f="visa">{"Recommended & Fast-Track"}</E></span>
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-brand-primary mb-2"><E f="visa">{"e-Conference Visa (Online)"}</E></h3>
                <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed font-normal"><E f="visa">{"Citizens of eligible countries (over 160+ nations) can apply online via the official Government of India portal without visiting an Indian Mission in person."}</E></p>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><E f="visa">{"Applied 100% online through "}</E><strong><E f="visa">{"indianvisaonline.gov.in"}</E></strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><E f="visa">{"Processing time: "}</E><strong><E f="visa">{"4 to 7 working days"}</E></strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><E f="visa">{"Valid for entry through 30+ designated international airports (including Chennai MAA & Bengaluru BLR)"}</E></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><E f="visa">{"Requires official invitation letter and conference clearance copies from VIT"}</E></span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <a
                  href="https://indianvisaonline.gov.in/evisa/tvoa.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full text-xs sm:text-sm flex items-center justify-center gap-2 py-3"
                >
                  <span><E f="visa">{"Apply on Official Indian e-Visa Portal"}</E></span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Option 2: Regular Paper Conference Visa */}
            <div className="bg-white rounded-3xl border-2 border-slate-200 p-8 shadow-sm hover:border-brand-primary transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 uppercase tracking-wider"><E f="visa">{"Indian Mission / Embassy"}</E></span>
                  <Building2 className="w-4 h-4 text-slate-500" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-brand-primary mb-2"><E f="visa">{"Regular Conference Visa"}</E></h3>
                <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed font-normal"><E f="visa">{"For delegates from non-eVisa countries or those requiring physical sticker visas stamped at the nearest Indian Embassy or Consulate General."}</E></p>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <span><E f="visa">{"Submitted to Indian Embassy, High Commission, or authorized VFS centre"}</E></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <span><E f="visa">{"Processing time: "}</E><strong><E f="visa">{"3 to 6 weeks"}</E></strong><E f="visa">{" (apply at least 45 days before travel)"}</E></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <span><E f="visa">{"Requires signed original/electronic official invitation letter with seal"}</E></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <span><E f="visa">{"Requires MHA, MEA, and MoE statutory clearance letters provided by VIT"}</E></span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <a
                  href="https://indianvisaonline.gov.in/visa/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full text-xs sm:text-sm flex items-center justify-center gap-2 py-3"
                >
                  <span><E f="visa">{"Regular Visa Application Portal"}</E></span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Step-by-Step Process */}
        <section className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#DE6D1B]"><E f="visa">{"Roadmap"}</E></span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-brand-primary mt-1"><E f="visa">{"4 Steps to Obtain Your Indian Conference Visa"}</E></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-brand-surface border border-slate-200 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-brand-primary text-brand-accent font-bold text-sm flex items-center justify-center"><E f="visa">{"1"}</E></div>
              <h4 className="font-bold text-base text-brand-primary"><E f="visa">{"Paper Acceptance & Registration"}</E></h4>
              <p className="text-xs text-slate-600 leading-relaxed"><E f="visa">{"Ensure your manuscript is accepted and complete delegate/author fee registration for ic-ETITE'28."}</E></p>
            </div>

            <div className="p-6 rounded-2xl bg-brand-surface border border-slate-200 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-brand-primary text-brand-accent font-bold text-sm flex items-center justify-center"><E f="visa">{"2"}</E></div>
              <h4 className="font-bold text-base text-brand-primary"><E f="visa">{"Request Invitation Letter"}</E></h4>
              <p className="text-xs text-slate-600 leading-relaxed"><E f="visa">{"Submit your passport details and Paper ID to receive an official personalized invitation letter."}</E></p>
              {registration && (
                <Link
                  href="/dashboard/visa"
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-secondary underline pt-1"
                >
                  <span>Apply from Dashboard</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-brand-surface border border-slate-200 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-brand-primary text-brand-accent font-bold text-sm flex items-center justify-center"><E f="visa">{"3"}</E></div>
              <h4 className="font-bold text-base text-brand-primary"><E f="visa">{"Apply Online / Embassy"}</E></h4>
              <p className="text-xs text-slate-600 leading-relaxed"><E f="visa">{"Submit the e-Conference Visa application online with the invitation letter and Government clearance documents attached."}</E></p>
            </div>

            <div className="p-6 rounded-2xl bg-brand-surface border border-slate-200 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-brand-primary text-brand-accent font-bold text-sm flex items-center justify-center"><E f="visa">{"4"}</E></div>
              <h4 className="font-bold text-base text-brand-primary"><E f="visa">{"Receive Electronic Travel Auth"}</E></h4>
              <p className="text-xs text-slate-600 leading-relaxed"><E f="visa">{"Receive your Electronic Travel Authorization (ETA) via email, print it out, and board your flight to India!"}</E></p>
            </div>
          </div>
        </section>

        {/* How to Request an Official Invitation Letter */}
        <section id="invitation-letter" className="bg-gradient-to-br from-brand-primary-dark to-[#002A5C] rounded-3xl p-8 sm:p-12 text-white shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-black uppercase tracking-wider text-brand-accent bg-white/10 px-3 py-1 rounded-full border border-white/15 inline-block"><E f="visa">{"Facilitation Protocol"}</E></span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight"><E f="visa">{"Request Official Visa Invitation Letter"}</E></h2>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed font-normal"><E f="visa">{"To issue your customized, official conference invitation letter bearing the seal of Vellore Institute of Technology, please ensure the following particulars are ready:"}</E></p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm text-white/90">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-accent" />
                  <span><E f="visa">{"Full Legal Name (as printed on Passport)"}</E></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-accent" />
                  <span><E f="visa">{"Passport Number & Expiry Date"}</E></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-accent" />
                  <span><E f="visa">{"Nationality & Country of Residence"}</E></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-accent" />
                  <span><E f="visa">{"Institutional Affiliation / University"}</E></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-accent" />
                  <span><E f="visa">{"Accepted Paper ID & Title"}</E></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-accent" />
                  <span><E f="visa">{"Confirmed Registration Receipt Number"}</E></span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white/10 border border-white/20 rounded-2xl p-6 sm:p-8 backdrop-blur-md text-center space-y-4">
              <Mail className="w-10 h-10 text-brand-accent mx-auto" />
              <h3 className="font-bold text-lg text-white"><E f="visa">{"Apply for Invitation Letter"}</E></h3>

              {/* Show apply from dashboard ONLY for registered users */}
              {registration ? (
                <div className="space-y-3">
                  <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-xl p-3 text-left space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Registered Delegate Verified</span>
                    </div>
                    <p className="text-[11px] text-white/80">
                      You are eligible to apply directly from your dashboard for priority issuance.
                    </p>
                  </div>

                  <Link
                    href="/dashboard/visa"
                    className="bg-brand-accent text-brand-primary hover:bg-brand-accent-dark w-full text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg transition"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{visaRequest ? "View Visa Letter in Dashboard" : "Apply for Visa Letter via Dashboard"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : user ? (
                <div className="bg-amber-500/20 border border-amber-400/30 rounded-xl p-4 text-left space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Conference Registration Required</span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed">
                    Visa letters are strictly issued to registered conference participants. Please complete your registration to apply from the dashboard.
                  </p>
                  <Link
                    href="/registration/apply"
                    className="bg-brand-accent text-brand-primary hover:bg-brand-accent-dark w-full text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 font-bold transition mt-1"
                  >
                    <span>Register for Conference</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-left space-y-2">
                  <p className="text-xs text-white/80 leading-relaxed">
                    Registered delegates can apply for visa letters directly through their personal dashboard.
                  </p>
                  <Link
                    href="/login?next=/dashboard/visa"
                    className="bg-white/15 hover:bg-white/25 text-white border border-white/25 w-full text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 font-semibold transition"
                  >
                    <span>Sign In to Apply from Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              <div className="pt-2 border-t border-white/15">
                <p className="text-xs text-white/75 leading-relaxed mb-3">
                  <E f="visa">{"Or email the conference secretariat directly:"}</E>
                </p>
                <a
                  href="mailto:icetiteconference@vit.ac.in?subject=%5BVisa%20Letter%20Request%5D%20Paper%20ID%20-%20Full%20Name&body=Dear%20ic-ETITE%2728%20Secretariat%2C%0A%0APlease%20find%20my%20details%20for%20an%20official%20visa%20invitation%20letter%3A%0A%0A1.%20Full%20Name%20(as%20in%20Passport)%3A%20%0A2.%20Passport%20Number%3A%20%0A3.%20Passport%20Expiry%20Date%3A%20%0A4.%20Nationality%3A%20%0A5.%20Institution%2FUniversity%3A%20%0A6.%20Designation%3A%20%0A7.%20Accepted%20Paper%20ID%20%26%20Title%3A%20%0A8.%20Registration%20Order%20ID%3A%20%0A%0AThank%20you%2C%0A"
                  className="btn-primary w-full text-xs sm:text-sm py-2.5 flex items-center justify-center gap-2 font-bold shadow-md"
                >
                  <Mail className="w-4 h-4" />
                  <span><E f="visa">{"Email Secretariat"}</E></span>
                </a>
              </div>

              <p className="text-[11px] text-white/60"><E f="visa">{"Letters are dispatched within 2–3 business days after registration verification."}</E></p>
            </div>
          </div>
        </section>

        {/* Statutory Clearances Note */}
        <section className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-sm space-y-4">
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-brand-primary flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-[#DE6D1B]" />
            <span><E f="visa">{"Government of India Statutory Clearances"}</E></span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal"><E f="visa">{"As an IEEE technically co-sponsored conference hosted by an Institution of Eminence (VIT Vellore), ic-ETITE'28 adheres strictly to the Ministry of Home Affairs (MHA) and Ministry of External Affairs (MEA) guidelines for international conferences held in India."}</E></p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-brand-primary"><E f="visa">{"MEA Clearance"}</E></p>
              <p className="text-[11px] text-slate-600 mt-1"><E f="visa">{"Ministry of External Affairs Political Clearance"}</E></p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-brand-primary"><E f="visa">{"MHA Clearance"}</E></p>
              <p className="text-[11px] text-slate-600 mt-1"><E f="visa">{"Ministry of Home Affairs Event Clearance & Security Vetting"}</E></p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-brand-primary"><E f="visa">{"MoE Nodal Clearance"}</E></p>
              <p className="text-[11px] text-slate-600 mt-1"><E f="visa">{"Ministry of Education Conference Clearance"}</E></p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
