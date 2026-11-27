"use client";

import { useEffect, useState, useRef } from "react";

export default function StartupAnimation() {
  const [dismissed, setDismissed] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      const alreadyShown = sessionStorage.getItem("icetite28_intro_seen");
      const isHome = window.location.pathname === "/" && !window.location.search.includes("cms_preview");

      if (!alreadyShown && isHome) {
        document.documentElement.classList.add("show-intro");
        document.body.style.overflow = "hidden";
        sessionStorage.setItem("icetite28_intro_seen", "1");

        const timer = setTimeout(() => {
          document.documentElement.classList.remove("show-intro");
          document.body.style.overflow = "";
          setDismissed(true);
        }, 3800);

        return () => {
          clearTimeout(timer);
          document.documentElement.classList.remove("show-intro");
          document.body.style.overflow = "";
        };
      } else {
        document.documentElement.classList.remove("show-intro");
        document.body.style.overflow = "";
        setDismissed(true);
      }
    } catch {
      document.documentElement.classList.remove("show-intro");
      setDismissed(true);
    }

    // Expose a global replay trigger for manual testing (window.restartIntro())
    const replay = () => {
      try {
        sessionStorage.removeItem("icetite28_intro_seen");
      } catch {}
      setDismissed(false);
      document.documentElement.classList.add("show-intro");
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        document.documentElement.classList.remove("show-intro");
        document.body.style.overflow = "";
        setDismissed(true);
      }, 3800);
    };

    (window as unknown as { restartIntro?: () => void }).restartIntro = replay;
    window.addEventListener("replay-startup-animation", replay);

    return () => {
      window.removeEventListener("replay-startup-animation", replay);
    };
  }, []);

  if (dismissed) {
    return null;
  }

  return (
    <div
      id="intro-overlay"
      className="active"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#f7f7f7",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        animation: "introExit 0.9s cubic-bezier(0.77, 0, 0.18, 1) 2.85s forwards",
      }}
      aria-label="ic-ETITE'28 Startup Animation"
    >
      <div className="sa-stage-wrapper">
        <div className="sa-stage">
          <div className="sa-frame" />
          <div className="sa-dot sa-one" />
          <div className="sa-dot sa-two" />

          <div className="sa-logo-wrap">
            <div className="sa-logo" aria-label="ic-ETITE 28">
              <span className="sa-ic">ic</span>
              <span className="sa-dash">-</span>
              <span className="sa-e">E</span>
              <span className="sa-t">T</span>
              <span className="sa-i">I</span>
              <span className="sa-t">T</span>
              <span className="sa-e">E</span>
              <span className="sa-apostrophe">&apos;</span>
              <span className="sa-year">28</span>
            </div>

            <div className="sa-subtitle">SCORE VIT VELLORE</div>
          </div>
        </div>
      </div>
    </div>
  );
}
