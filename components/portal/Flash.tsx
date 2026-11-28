"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export function Flash({ ok, error }: { ok?: string | string[]; error?: string | string[] }) {
  const okMsg = Array.isArray(ok) ? ok[0] : ok;
  const errMsg = Array.isArray(error) ? error[0] : error;
  const message = errMsg ?? okMsg;

  const [visible, setVisible] = useState(Boolean(message));
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      setFading(false);
      return;
    }

    setVisible(true);
    setFading(false);

    // Auto-dismiss after 2 seconds (2000ms)
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 2000);

    // Unmount and clean URL after fade animation (2000ms + 350ms)
    const removeTimer = setTimeout(() => {
      setVisible(false);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("error") || url.searchParams.has("ok")) {
          url.searchParams.delete("error");
          url.searchParams.delete("ok");
          const nextUrl = url.pathname + (url.search ? url.search : "") + url.hash;
          window.history.replaceState(null, "", nextUrl);
        }
      }
    }, 2350);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [message]);

  if (!visible || !message) return null;

  const handleDismiss = () => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("error") || url.searchParams.has("ok")) {
          url.searchParams.delete("error");
          url.searchParams.delete("ok");
          const nextUrl = url.pathname + (url.search ? url.search : "") + url.hash;
          window.history.replaceState(null, "", nextUrl);
        }
      }
    }, 200);
  };

  return (
    <>
      {/* Inline banner alert */}
      <div
        role={errMsg ? "alert" : "status"}
        className={`mb-5 flex items-start justify-between gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-300 ease-in-out ${
          fading ? "opacity-0 -translate-y-1" : "opacity-100 translate-y-0"
        } ${errMsg ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
      >
        <div className="flex items-start gap-2.5">
          {errMsg ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{message}</span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="ml-2 -mr-1 -mt-0.5 rounded-lg p-1 text-slate-400 hover:text-slate-700 focus:outline-none transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Floating toast to guarantee visibility regardless of scroll position */}
      <div
        className={`fixed top-4 right-4 z-50 max-w-md shadow-2xl rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center justify-between gap-3 backdrop-blur-md transition-all duration-300 ease-in-out pointer-events-auto ${
          fading ? "opacity-0 -translate-y-3 scale-95 pointer-events-none" : "opacity-100 translate-y-0 scale-100"
        } ${
          errMsg
            ? "border-red-300 bg-red-900/90 text-white shadow-red-950/20"
            : "border-emerald-300 bg-emerald-900/90 text-white shadow-emerald-950/20"
        }`}
      >
        <div className="flex items-center gap-3">
          {errMsg ? (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-300" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
          )}
          <span>{message}</span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="ml-2 rounded-lg p-1 text-white/70 hover:text-white hover:bg-white/10 focus:outline-none transition-colors"
          aria-label="Dismiss toast"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
