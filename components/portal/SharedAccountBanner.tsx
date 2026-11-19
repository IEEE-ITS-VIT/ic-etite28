import { Sparkles, CheckCircle2 } from "lucide-react";

export default function SharedAccountBanner({
  mode = "login",
  currentSiteName,
}: {
  mode?: "login" | "signup";
  currentSiteName?: string;
}) {
  return (
    <div className="mt-3.5 mb-1 overflow-hidden rounded-2xl border-2 border-blue-200/90 bg-gradient-to-br from-blue-50/95 via-indigo-50/70 to-amber-50/60 p-3.5 shadow-sm text-left">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
          <Sparkles className="h-3 w-3 text-amber-300" />
          One Common Account
        </span>
        <span className="text-xs font-semibold text-blue-900/80">3 Portals · 1 Login</span>
      </div>

      <p className="mt-2 text-[13.5px] leading-relaxed text-slate-800">
        <strong className="font-bold text-blue-950">One account works across all three portals:</strong>{" "}
        <span className="font-semibold text-blue-900">ic-ETITE&apos;28</span>,{" "}
        <span className="font-semibold text-blue-900">BOLT 3.0</span>, and{" "}
        <span className="font-semibold text-blue-900">TechNext &apos;28</span>.
      </p>

      <div className="mt-2 flex items-center gap-2 rounded-xl border border-blue-200/80 bg-white/90 px-3 py-2 shadow-2xs">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        <span className="text-xs font-medium text-slate-700">
          {mode === "login" ? (
            <>
              Already have an account from any of them?{" "}
              <strong className="font-bold text-blue-900">Use the same email &amp; password.</strong>
            </>
          ) : (
            <>
              Already registered on any of them?{" "}
              <strong className="font-bold text-blue-900">No need to sign up again—log in with that password.</strong>
            </>
          )}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-blue-200/60 text-[11px]">
        <span className="text-slate-500 font-medium">Synced across:</span>
        <span className="rounded-md border border-blue-200 bg-blue-100/70 px-2 py-0.5 font-semibold text-blue-900">
          ic-ETITE&apos;28
        </span>
        <span className="rounded-md border border-indigo-200 bg-indigo-100/70 px-2 py-0.5 font-semibold text-indigo-900">
          BOLT 3.0
        </span>
        <span className="rounded-md border border-amber-200 bg-amber-100/70 px-2 py-0.5 font-semibold text-amber-900">
          TechNext &apos;28
        </span>
      </div>
    </div>
  );
}
