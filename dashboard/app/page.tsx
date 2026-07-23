"use client";

import { Logo } from "@/components/logo";
import { TerminalDemo } from "@/components/terminal-demo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Cpu,
  Globe,
  HelpCircle,
  Key,
  Layers,
  Server,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function LandingPage() {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [activeOs, setActiveOs] = useState<"mac" | "linux" | "win">("mac");
  const [activeFramework, setActiveFramework] = useState("next");

  // OS Auto-detection on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("win")) {
      setActiveOs("win");
    } else if (ua.includes("linux")) {
      setActiveOs("linux");
    } else if (ua.includes("mac")) {
      setActiveOs("mac");
    }
  }, []);

  const defaultSshCmd = "ssh -R 80:localhost:3000 -p 2222 t.thakur.dev";

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    toast.success("Command copied to clipboard!");
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const frameworks = [
    {
      id: "next",
      name: "Next.js / React",
      port: "3000",
      cmd: "ssh -R 80:localhost:3000 -p 2222 t.thakur.dev",
      note: "Perfect for testing Next.js dev server, Server Actions & Webhooks",
    },
    {
      id: "vite",
      name: "Vite / Vue / Svelte",
      port: "5173",
      cmd: "ssh -R 80:localhost:5173 -p 2222 t.thakur.dev",
      note: "Full WebSocket HMR (Hot Module Replacement) support",
    },
    {
      id: "fastapi",
      name: "FastAPI / Python",
      port: "8000",
      cmd: "ssh -R 80:localhost:8000 -p 2222 t.thakur.dev",
      note: "Instant public endpoint for AI APIs, LangChain & async streaming",
    },
    {
      id: "express",
      name: "Express / Node.js",
      port: "3000",
      cmd: "ssh -R 80:localhost:3000 -p 2222 t.thakur.dev",
      note: "Receive Stripe, GitHub, or Shopify webhooks on local machine",
    },
    {
      id: "django",
      name: "Django / Flask",
      port: "8000",
      cmd: "ssh -R 80:localhost:8000 -p 2222 t.thakur.dev",
      note: "Expose local Django admin & API endpoints securely",
    },
  ];

  const currentFramework = frameworks.find((f) => f.id === activeFramework) || frameworks[0];

  return (
    <div className="bg-background text-foreground selection:bg-primary/30 selection:text-primary flex min-h-screen flex-col font-mono">
      {/* Sticky Header / Navbar */}
      <header className="bg-card/80 border-border/60 sticky top-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>

          <nav className="text-muted-foreground hidden items-center gap-6 font-mono text-xs md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">
              0:features
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              1:how-it-works
            </a>
            <a href="#presets" className="hover:text-foreground transition-colors">
              2:presets
            </a>
            <a href="#comparison" className="hover:text-foreground transition-colors">
              3:comparison
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              4:pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="border-border/60 h-8 font-mono text-xs"
              >
                Login
              </Button>
            </Link>

            <Link href="/dashboard">
              <Button size="sm" className="h-8 gap-1.5 px-3.5 font-mono text-xs">
                Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-border/60 relative overflow-hidden border-b pt-16 pb-24 md:pt-24 md:pb-32">
          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              {/* Left Hero Column */}
              <div className="flex flex-col gap-6 text-left lg:col-span-6">
                <h1 className="text-foreground text-3xl leading-[1.15] font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  Expose Localhost to the Internet via{" "}
                  <span className="text-primary">Standard SSH</span>
                </h1>

                <p className="text-muted-foreground max-w-xl text-xs leading-relaxed sm:text-sm">
                  Instant HTTPS tunnels for Next.js, Vite, FastAPI, and webhooks. No agent
                  downloads, no third-party daemons, zero configuration files.
                </p>

                {/* Clean Command Box Card with Integrated OS Switcher */}
                <div className="border-border/60 bg-card/90 flex flex-col overflow-hidden rounded-xl border font-mono text-xs shadow-xs backdrop-blur-xs">
                  <div className="border-border/60 bg-muted/30 flex items-center justify-between border-b px-4 py-2.5 text-xs">
                    <span className="text-muted-foreground text-[11px] font-semibold uppercase">
                      CLI COMMAND ({activeOs.toUpperCase()})
                    </span>
                    <div className="bg-muted/80 border-border/60 flex rounded-md border p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setActiveOs("mac")}
                        className={`rounded-xs px-2 py-0.5 font-semibold transition-colors ${
                          activeOs === "mac"
                            ? "bg-primary/20 text-primary border-primary/40 border"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        macOS
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveOs("linux")}
                        className={`rounded-xs px-2 py-0.5 font-semibold transition-colors ${
                          activeOs === "linux"
                            ? "bg-primary/20 text-primary border-primary/40 border"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Linux
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveOs("win")}
                        className={`rounded-xs px-2 py-0.5 font-semibold transition-colors ${
                          activeOs === "win"
                            ? "bg-primary/20 text-primary border-primary/40 border"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Win
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-muted-foreground select-none">$</span>
                      <code className="text-primary truncate font-semibold">{defaultSshCmd}</code>
                    </div>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() => handleCopy(defaultSshCmd, "hero")}
                      className="bg-background/80 hover:bg-background border-border/60 shrink-0"
                    >
                      {copiedCmd === "hero" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <Link href="/dashboard">
                    <Button size="lg" className="h-10 gap-2 px-5 font-mono text-xs">
                      Start Free Tunnel <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/keys">
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-border/60 h-10 gap-2 px-5 font-mono text-xs"
                    >
                      <Key className="text-primary h-4 w-4" />
                      Add SSH Public Key
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right Hero Column: Clean Terminal Preview Demo */}
              <div className="lg:col-span-6">
                <TerminalDemo />
              </div>
            </div>
          </div>
        </section>

        {/* Trust Metrics / Architecture Highlights */}
        <section className="border-border/60 bg-muted/20 border-b py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
              <div className="border-border/40 flex flex-col gap-1 border-r p-2 last:border-0">
                <span className="text-primary text-2xl font-bold sm:text-3xl">100%</span>
                <span className="text-muted-foreground text-xs">Native OpenSSH Protocol</span>
              </div>
              <div className="border-border/40 flex flex-col gap-1 border-r p-2 last:border-0">
                <span className="text-2xl font-bold text-emerald-400 sm:text-3xl">&lt; 15ms</span>
                <span className="text-muted-foreground text-xs">Ultra Low Latency Routing</span>
              </div>
              <div className="border-border/40 flex flex-col gap-1 border-r p-2 last:border-0">
                <span className="text-foreground text-2xl font-bold sm:text-3xl">0</span>
                <span className="text-muted-foreground text-xs">Third-Party CLI Binaries</span>
              </div>
              <div className="flex flex-col gap-1 p-2">
                <span className="text-primary text-2xl font-bold sm:text-3xl">99.99%</span>
                <span className="text-muted-foreground text-xs">Control Plane Uptime</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step How It Works Section */}
        <section id="how-it-works" className="border-border/60 relative border-b py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
                <Zap className="h-3.5 w-3.5" />
                <span>3-Step Quickstart</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How tunl Works</h2>
              <p className="text-muted-foreground max-w-lg text-xs sm:text-sm">
                Expose your local development environment to the public internet in under 5 seconds.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="border-border/60 bg-card/80 hover:border-primary/40 relative flex flex-col gap-4 rounded-xl border p-6 shadow-xs transition-all">
                <div className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold">
                  01
                </div>
                <h3 className="text-base font-bold">Start Your Local Server</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Run your frontend or backend application locally on any port (e.g. 3000, 5173, or
                  8000).
                </p>
                <div className="bg-muted/60 border-border/60 text-muted-foreground rounded-lg border p-2.5 font-mono text-xs">
                  <code>$ npm run dev</code>
                </div>
              </div>

              {/* Step 2 */}
              <div className="border-border/60 bg-card/80 hover:border-primary/40 relative flex flex-col gap-4 rounded-xl border p-6 shadow-xs transition-all">
                <div className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold">
                  02
                </div>
                <h3 className="text-base font-bold">Run Standard SSH Command</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Execute a single OpenSSH command from your terminal. No login or installation
                  required.
                </p>
                <div className="bg-muted/60 border-border/60 rounded-lg border p-2.5 font-mono text-xs text-emerald-400">
                  <code className="block truncate">$ ssh -R 80:localhost:3000...</code>
                </div>
              </div>

              {/* Step 3 */}
              <div className="border-border/60 bg-card/80 hover:border-primary/40 relative flex flex-col gap-4 rounded-xl border p-6 shadow-xs transition-all">
                <div className="bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold">
                  03
                </div>
                <h3 className="text-base font-bold">Share Your Live HTTPS URL</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Access your app via a secure public HTTPS endpoint with automatic TLS
                  certificates.
                </p>
                <div className="bg-muted/60 border-border/60 text-primary rounded-lg border p-2.5 font-mono text-xs">
                  <code className="block truncate">https://my-app.thakur.dev</code>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Matrix Cards Grid */}
        <section id="features" className="border-border/60 bg-muted/10 border-b py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
                <Code2 className="h-3.5 w-3.5" />
                <span>Built for Developers</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Everything You Need for Tunneling
              </h2>
              <p className="text-muted-foreground max-w-lg text-xs sm:text-sm">
                Engineered for speed, developer simplicity, and hardware-grade security.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Card 1 */}
              <div className="border-border/60 bg-card/90 hover:border-border/80 flex flex-col gap-3 rounded-xl border p-6 shadow-xs backdrop-blur-xs transition-all">
                <div className="bg-primary/15 text-primary w-fit rounded-lg p-2.5">
                  <Terminal className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold">Zero Binary Dependencies</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Uses the OpenSSH client pre-installed on macOS, Linux, and Windows 10/11. No extra
                  agent daemons to update or manage.
                </p>
              </div>

              {/* Card 2 */}
              <div className="border-border/60 bg-card/90 hover:border-border/80 flex flex-col gap-3 rounded-xl border p-6 shadow-xs backdrop-blur-xs transition-all">
                <div className="bg-primary/15 text-primary w-fit rounded-lg p-2.5">
                  <Globe className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold">Reserved Subdomain Aliases</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Register persistent static subdomains (e.g.{" "}
                  <code className="text-primary font-mono">my-app.thakur.dev</code>) bound directly
                  to your SSH public key.
                </p>
              </div>

              {/* Card 3 */}
              <div className="border-border/60 bg-card/90 hover:border-border/80 flex flex-col gap-3 rounded-xl border p-6 shadow-xs backdrop-blur-xs transition-all">
                <div className="bg-primary/15 text-primary w-fit rounded-lg p-2.5">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold">WebSockets & HMR Support</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Supports HTTP/1.1 protocol upgrading for WebSockets, Server-Sent Events (SSE), and
                  Vite/Next.js Hot Module Replacement.
                </p>
              </div>

              {/* Card 4 */}
              <div className="border-border/60 bg-card/90 hover:border-border/80 flex flex-col gap-3 rounded-xl border p-6 shadow-xs backdrop-blur-xs transition-all">
                <div className="bg-primary/15 text-primary w-fit rounded-lg p-2.5">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold">OpenSSH Key Authentication</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Authenticate securely using standard Ed25519 or RSA public keys. Zero cleartext
                  passwords or vulnerable token leaks.
                </p>
              </div>

              {/* Card 5 */}
              <div className="border-border/60 bg-card/90 hover:border-border/80 flex flex-col gap-3 rounded-xl border p-6 shadow-xs backdrop-blur-xs transition-all">
                <div className="bg-primary/15 text-primary w-fit rounded-lg p-2.5">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold">Real-Time Telemetry Dashboard</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Monitor active live tunnel sessions, remote client IPs, uptime metrics, and manage
                  authorized public keys in real time.
                </p>
              </div>

              {/* Card 6 */}
              <div className="border-border/60 bg-card/90 hover:border-border/80 flex flex-col gap-3 rounded-xl border p-6 shadow-xs backdrop-blur-xs transition-all">
                <div className="bg-primary/15 text-primary w-fit rounded-lg p-2.5">
                  <Server className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold">Webhook Testing & Integration</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Test Stripe, GitHub, Shopify, or Twilio webhooks locally without exposing router
                  ports or configuring firewall rules.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Framework Presets */}
        <section id="presets" className="border-border/60 border-b py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
                <Cpu className="h-3.5 w-3.5" />
                <span>Framework Quickstarts</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Works With Every Stack
              </h2>
              <p className="text-muted-foreground max-w-lg text-xs sm:text-sm">
                Select your framework to get the exact one-liner SSH command.
              </p>
            </div>

            <div className="border-border/60 bg-card/90 flex flex-col overflow-hidden rounded-xl border shadow-xs backdrop-blur-xs">
              {/* Framework Tabs (Mobile Scrollable Swipe Bar) */}
              <div className="border-border/60 bg-muted/30 no-scrollbar flex flex-nowrap items-center gap-1.5 overflow-x-auto border-b p-2.5">
                {frameworks.map((fw) => (
                  <button
                    key={fw.id}
                    type="button"
                    onClick={() => setActiveFramework(fw.id)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 font-mono text-xs whitespace-nowrap transition-colors ${
                      activeFramework === fw.id
                        ? "bg-primary/20 text-primary border-primary/40 border font-bold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent"
                    }`}
                  >
                    {fw.name}
                  </button>
                ))}
              </div>

              {/* Framework Command Showcase */}
              <div className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-1">
                  <span className="text-foreground text-xs font-semibold">
                    {currentFramework.name} (Port {currentFramework.port})
                  </span>
                  <p className="text-muted-foreground text-xs">{currentFramework.note}</p>
                </div>

                <div className="bg-muted/80 text-primary border-border/60 flex items-center justify-between gap-3 rounded-xl border p-3.5 font-mono text-xs select-all">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-muted-foreground select-none">$</span>
                    <code className="truncate font-semibold text-emerald-400">
                      {currentFramework.cmd}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => handleCopy(currentFramework.cmd, currentFramework.id)}
                    className="shrink-0"
                  >
                    {copiedCmd === currentFramework.id ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section id="comparison" className="border-border/60 bg-muted/10 border-b py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
                <Layers className="h-3.5 w-3.5" />
                <span>Comparison</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Why Choose tunl?</h2>
              <p className="text-muted-foreground max-w-lg text-xs sm:text-sm">
                Compare tunl against legacy reverse proxy tools.
              </p>
            </div>

            <div className="border-border/60 bg-card/90 overflow-hidden rounded-xl border shadow-xs backdrop-blur-xs">
              <div className="no-scrollbar overflow-x-auto">
                <table className="w-full border-collapse text-left font-mono text-xs">
                  <thead>
                    <tr className="border-border/60 bg-muted/30 text-muted-foreground border-b text-[11px] tracking-wider uppercase">
                      <th className="w-[220px] p-4 font-semibold">Feature</th>
                      <th className="text-primary p-4 font-semibold">tunl</th>
                      <th className="text-muted-foreground p-4 font-semibold">
                        ngrok / localtunnel
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-border/40 hover:bg-muted/10 border-b transition-colors">
                      <td className="text-foreground p-4 font-bold">Binary Installation</td>
                      <td className="flex items-center gap-1.5 p-4 font-bold text-emerald-400">
                        <Check className="h-4 w-4" /> None (Standard SSH)
                      </td>
                      <td className="text-muted-foreground p-4">Requires Binary / npm install</td>
                    </tr>
                    <tr className="border-border/40 hover:bg-muted/10 border-b transition-colors">
                      <td className="text-foreground p-4 font-bold">Authentication</td>
                      <td className="flex items-center gap-1.5 p-4 font-bold text-emerald-400">
                        <Check className="h-4 w-4" /> OpenSSH Key Cryptography
                      </td>
                      <td className="text-muted-foreground p-4">API Tokens / Passwords</td>
                    </tr>
                    <tr className="border-border/40 hover:bg-muted/10 border-b transition-colors">
                      <td className="text-foreground p-4 font-bold">WebSocket & HMR</td>
                      <td className="flex items-center gap-1.5 p-4 font-bold text-emerald-400">
                        <Check className="h-4 w-4" /> Full Support (HTTP/1.1 Upgrades)
                      </td>
                      <td className="text-muted-foreground p-4">Varies by Plan</td>
                    </tr>
                    <tr className="border-border/40 hover:bg-muted/10 border-b transition-colors">
                      <td className="text-foreground p-4 font-bold">Setup Time</td>
                      <td className="flex items-center gap-1.5 p-4 font-bold text-emerald-400">
                        <Zap className="h-4 w-4 text-amber-400" /> ~3 Seconds
                      </td>
                      <td className="text-muted-foreground p-4">2 to 5 Minutes</td>
                    </tr>
                    <tr className="hover:bg-muted/10 transition-colors">
                      <td className="text-foreground p-4 font-bold">
                        Static Subdomain Reservation
                      </td>
                      <td className="flex items-center gap-1.5 p-4 font-bold text-emerald-400">
                        <Check className="h-4 w-4" /> Supported
                      </td>
                      <td className="text-muted-foreground p-4">Paid Add-on</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing / Tiers Section */}
        <section id="pricing" className="border-border/60 border-b py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
                <Zap className="h-3.5 w-3.5" />
                <span>Simple Pricing</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Flexible Tunneling Plans
              </h2>
              <p className="text-muted-foreground max-w-lg text-xs sm:text-sm">
                Start free with zero configuration, upgrade when you need persistent reserved
                subdomains.
              </p>
            </div>

            <div className="mx-auto grid w-full max-w-4xl gap-8 md:grid-cols-2">
              {/* Free Tier */}
              <div className="border-border/60 bg-card/90 flex flex-col justify-between gap-6 rounded-xl border p-8 shadow-xs backdrop-blur-xs">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-sm font-bold">EPHEMERAL TIER</span>
                    <span className="bg-muted text-muted-foreground rounded px-2.5 py-0.5 text-[10px] font-bold">
                      FREE FOREVER
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-foreground text-3xl font-bold">$0</span>
                    <span className="text-muted-foreground text-xs">/ month</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Instant 1-command tunneling for quick testing and debugging.
                  </p>
                  <div className="border-border/50 flex flex-col gap-2 border-t pt-4 text-xs">
                    <span className="text-foreground flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      Instant OpenSSH reverse tunnels
                    </span>
                    <span className="text-foreground flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      Dynamic random HTTP/HTTPS subdomains
                    </span>
                    <span className="text-foreground flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      WebSocket & SSE streaming
                    </span>
                    <span className="text-foreground flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      No credit card required
                    </span>
                  </div>
                </div>

                <Link href="/dashboard" className="w-full">
                  <Button variant="outline" className="border-border/60 w-full font-mono text-xs">
                    Run Free Tunnel
                  </Button>
                </Link>
              </div>

              {/* Pro Reserved Tier */}
              <div className="border-primary/60 bg-card/90 shadow-primary/5 relative flex flex-col justify-between gap-6 rounded-xl border-2 p-8 shadow-lg backdrop-blur-xs">
                <div className="bg-primary absolute -top-3 right-6 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-black uppercase">
                  RECOMMENDED
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-primary text-sm font-bold">RESERVED TIER</span>
                    <span className="bg-primary/20 text-primary border-primary/40 rounded border px-2.5 py-0.5 text-[10px] font-bold">
                      PRO
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-foreground text-3xl font-bold">$0</span>
                    <span className="text-muted-foreground text-xs">/ developer preview</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Persistent subdomains locked to your personal SSH public key.
                  </p>
                  <div className="border-border/50 flex flex-col gap-2 border-t pt-4 text-xs">
                    <span className="text-foreground flex items-center gap-2 font-semibold">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      All Ephemeral Features included
                    </span>
                    <span className="text-foreground flex items-center gap-2 font-semibold">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      Persistent reserved subdomain alias
                    </span>
                    <span className="text-foreground flex items-center gap-2 font-semibold">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      Ed25519 SSH Public Key Authorization
                    </span>
                    <span className="text-foreground flex items-center gap-2 font-semibold">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      Live Session Telemetry & Inspector
                    </span>
                  </div>
                </div>

                <Link href="/login" className="w-full">
                  <Button className="w-full gap-2 font-mono text-xs">
                    Claim Reserved Subdomain <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section */}
        <section className="border-border/60 bg-muted/10 border-b py-20">
          <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 sm:px-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold">
                <HelpCircle className="h-3.5 w-3.5" />
                <span>FAQ</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Frequently Asked Questions
              </h2>
            </div>

            <Accordion className="flex w-full flex-col gap-3 font-mono text-xs">
              <AccordionItem
                value="item-1"
                className="border-border/60 bg-card/90 rounded-xl border px-4 py-1"
              >
                <AccordionTrigger className="text-xs font-bold hover:no-underline">
                  Do I need to install any CLI tool or binary?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-2 text-xs leading-relaxed">
                  No! tunl relies on standard OpenSSH (
                  <code className="text-foreground font-mono">ssh</code>), which is already
                  pre-installed on macOS, Linux, and Windows 10/11.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-2"
                className="border-border/60 bg-card/90 rounded-xl border px-4 py-1"
              >
                <AccordionTrigger className="text-xs font-bold hover:no-underline">
                  How do persistent custom subdomains work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-2 text-xs leading-relaxed">
                  Log into the tunl dashboard, paste your OpenSSH public key (
                  <code className="text-foreground font-mono">id_ed25519.pub</code>), and reserve a
                  subdomain alias. Your SSH key authorizes incoming tunnel requests for that
                  specific subdomain.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-3"
                className="border-border/60 bg-card/90 rounded-xl border px-4 py-1"
              >
                <AccordionTrigger className="text-xs font-bold hover:no-underline">
                  Does tunl support WebSockets and Vite HMR?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-2 text-xs leading-relaxed">
                  Yes! tunl’s control plane handles HTTP/1.1 connection upgrades, enabling seamless
                  WebSocket streaming and Hot Module Replacement (HMR) for Vite and Next.js
                  applications.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-4"
                className="border-border/60 bg-card/90 rounded-xl border px-4 py-1"
              >
                <AccordionTrigger className="text-xs font-bold hover:no-underline">
                  Is my local machine secure when running a tunnel?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-2 text-xs leading-relaxed">
                  Yes. tunl only forwards traffic to the specific local port you designate (e.g.
                  3000). Standard SSH encryption protects the tunnel transport layer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="bg-card/50 relative overflow-hidden py-20">
          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to expose your first tunnel in <span className="text-primary">3 seconds</span>?
            </h2>
            <p className="text-muted-foreground max-w-lg text-xs sm:text-sm">
              No installation required. Fire up standard SSH in your terminal right now.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link href="/dashboard">
                <Button size="lg" className="h-11 gap-2 px-8 font-mono text-xs">
                  Open Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/keys">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-border/60 h-11 gap-2 px-6 font-mono text-xs"
                >
                  Register SSH Key
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-border/60 bg-card/90 border-t py-10 font-mono text-xs">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-muted-foreground text-[11px]">
              © {new Date().getFullYear()} tunl. All rights reserved.
            </span>
          </div>

          <div className="text-muted-foreground flex items-center gap-6 text-[11px]">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              tunnels
            </Link>
            <Link href="/keys" className="hover:text-foreground transition-colors">
              ssh-keys
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
