"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function AdminAuditTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  // Track client-side navigation within admin
  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;

    const data = JSON.stringify({
      action: "admin.navigate",
      category: "navigation",
      path: pathname,
      label: `Navigated to ${pathname}`,
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/admin/audit/track", data);
    } else {
      fetch("/api/admin/audit/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname]);

  // Track important admin clicks (buttons, links, actions)
  useEffect(() => {
    let lastClickTime = 0;

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest(
        "button, a, input[type='submit'], [role='button'], [data-audit]"
      ) as HTMLElement | null;

      if (!target) return;

      const now = Date.now();
      // Debounce clicks within 300ms
      if (now - lastClickTime < 300) return;
      lastClickTime = now;

      const text =
        target.getAttribute("data-audit") ||
        target.getAttribute("aria-label") ||
        target.innerText?.trim() ||
        (target as HTMLInputElement).value ||
        target.getAttribute("title") ||
        target.tagName.toLowerCase();

      // Only track informative labels (shortened to 100 chars)
      const cleanLabel = text.replace(/\s+/g, " ").slice(0, 100);
      if (!cleanLabel) return;

      const href = target.getAttribute("href");
      const isFormSubmit = target.getAttribute("type") === "submit";

      const data = JSON.stringify({
        action: isFormSubmit ? "admin.submit_click" : "admin.click",
        category: "click",
        path: window.location.pathname,
        label: cleanLabel,
        metadata: {
          tag: target.tagName.toLowerCase(),
          href: href || undefined,
          id: target.id || undefined,
        },
      });

      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/admin/audit/track", data);
      } else {
        fetch("/api/admin/audit/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: data,
          keepalive: true,
        }).catch(() => {});
      }
    };

    document.addEventListener("click", handleClick, { capture: true, passive: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  return null;
}
