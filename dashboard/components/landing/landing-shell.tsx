"use client";

import { type ReactNode, useEffect, useState } from "react";

export function LandingShell({ children }: { children: ReactNode }) {
  const [anim, setAnim] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && "IntersectionObserver" in window) setAnim(true);
  }, []);

  return (
    <div className={`landing${anim ? " anim" : ""}`}>
      {children}
      <span className="sr" id="landing-live" role="status" aria-live="polite" />
    </div>
  );
}
