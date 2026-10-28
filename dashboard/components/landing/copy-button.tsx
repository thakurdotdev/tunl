"use client";

import { useRef, useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [label, setLabel] = useState("Copy");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = (message: string) => {
    const live = document.getElementById("landing-live");
    if (live) live.textContent = message;
  };

  const done = (ok: boolean) => {
    setLabel(ok ? "Copied" : "Select and copy");
    announce(ok ? "Command copied to clipboard" : "Copy failed. Select the command and copy it manually.");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLabel("Copy"), 1800);
  };

  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    done(ok);
  };

  const handleCopy = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => done(true), fallback);
    } else {
      fallback();
    }
  };

  return (
    <button className="copy" type="button" onClick={handleCopy}>
      {label}
    </button>
  );
}
