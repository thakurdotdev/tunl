"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#uses", label: "Use cases" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#compare", label: "Compare" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className={`top${open ? " open" : ""}`}>
      <div className="wrap bar">
        <a className="logo" href="#top" aria-label="tunl home">
          <span className="p">&gt;_</span>tunl
          <span className="blk" />
        </a>
        <nav className="links" id="menu" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <Link className="only-m" href="/login" onClick={() => setOpen(false)}>
            Log in
          </Link>
          <Link className="only-m" href="/dashboard" onClick={() => setOpen(false)}>
            Open dashboard
          </Link>
        </nav>
        <div className="nav-right">
          <button
            className="icon-btn"
            type="button"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            <svg className="i-moon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
            <svg className="i-sun" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </button>
          <Link className="login" href="/login">
            Log in
          </Link>
          <Link className="btn primary sm" href="/dashboard">
            Open dashboard
          </Link>
          <button
            className="icon-btn menu-btn"
            id="menu-btn"
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
