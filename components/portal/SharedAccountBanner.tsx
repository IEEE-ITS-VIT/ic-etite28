export default function SharedAccountBanner({
  mode = "login",
}: {
  mode?: "login" | "signup";
  currentSiteName?: string;
}) {
  return (
    <div className="mt-2.5 mb-1 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-left">
      <div className="text-xs text-slate-800">
        <strong className="font-semibold text-blue-900">Unified Portal Access:</strong> One account operates across{" "}
        <span className="font-semibold text-slate-900">ic-ETITE&apos;28</span>,{" "}
        <span className="font-semibold text-slate-900">BOLT 3.0</span>, and{" "}
        <span className="font-semibold text-slate-900">TechNext &apos;28</span>.
      </div>
      <p className="mt-0.5 text-[11.5px] text-slate-600">
        {mode === "login"
          ? "If you have an existing account from any of these portals, sign in using the same credentials."
          : "Already registered on any of these portals? Sign in directly using your existing credentials."}
      </p>
    </div>
  );
}
