"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { btnPrimary } from "@/components/portal/ui";

// Disables itself while the surrounding form's server action runs; shows a rotating spinner
// during save / update and preserves the exact scroll position across redirects.
export default function SubmitButton({
  children,
  className = btnPrimary,
  pendingText = "Saving…",
  confirm,
  name,
  value,
  formAction,
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  confirm?: string;
  name?: string;
  value?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (confirm && !window.confirm(confirm)) {
      e.preventDefault();
      return;
    }
    // Record scroll position right when submitting so it persists across redirects / reloads
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("admin_scroll_y", String(window.scrollY));
        sessionStorage.setItem("admin_scroll_time", String(Date.now()));
      }
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={pending}
      className={`${className} transition-all duration-150 inline-flex items-center justify-center gap-2`}
      onClick={handleClick}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>{pendingText}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
