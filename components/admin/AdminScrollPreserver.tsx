"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ScrollPreserverInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isRestoring = useRef(false);

  // Set browser scrollRestoration to manual inside admin
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Save scroll position continuously on scroll (throttled) and on form submit
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking && !isRestoring.current) {
        window.requestAnimationFrame(() => {
          try {
            sessionStorage.setItem("admin_scroll_y", String(window.scrollY));
            sessionStorage.setItem("admin_scroll_time", String(Date.now()));
          } catch {}
          ticking = false;
        });
        ticking = true;
      }
    };

    const handleFormSubmit = () => {
      try {
        sessionStorage.setItem("admin_scroll_y", String(window.scrollY));
        sessionStorage.setItem("admin_scroll_time", String(Date.now()));
      } catch {}
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("submit", handleFormSubmit, { capture: true, passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("submit", handleFormSubmit);
    };
  }, []);

  // Restore scroll position whenever pathname or searchParams change (such as on ?ok= flash redirect)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("admin_scroll_y");
      const savedTime = sessionStorage.getItem("admin_scroll_time");
      if (saved !== null) {
        const top = parseFloat(saved);
        const age = savedTime ? Date.now() - parseInt(savedTime, 10) : 0;
        // Only restore if saved within recent 15 minutes
        if (!isNaN(top) && age < 15 * 60 * 1000) {
          isRestoring.current = true;
          // Restore immediately
          window.scrollTo({ top, behavior: "instant" });

          // Also re-apply over consecutive frames in case of dynamic layout or hydration shifts
          const timer1 = setTimeout(() => window.scrollTo({ top, behavior: "instant" }), 20);
          const timer2 = setTimeout(() => window.scrollTo({ top, behavior: "instant" }), 80);
          const timer3 = setTimeout(() => {
            window.scrollTo({ top, behavior: "instant" });
            isRestoring.current = false;
          }, 200);

          return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
          };
        }
      }
    } catch {}
  }, [pathname, searchParams]);

  return null;
}

export default function AdminScrollPreserver() {
  return (
    <Suspense fallback={null}>
      <ScrollPreserverInner />
    </Suspense>
  );
}
