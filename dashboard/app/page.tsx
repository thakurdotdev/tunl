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
  Copy,
  Globe,
  Key,
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

  const defaultSshCmd = "ssh -R 80:localhost:3000 -p 2222 tunl.online";

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
      cmd: "ssh -R 80:localhost:3000 -p 2222 tunl.online",
      note: "Perfect for testing Next.js dev server, Server Actions & Webhooks",
    },
    {
      id: "vite",
      name: "Vite / Vue / Svelte",
      port: "5173",
      cmd: "ssh -R 80:localhost:5173 -p 2222 tunl.online",
      note: "Full WebSocket HMR (Hot Module Replacement) support",
    },
    {
      id: "fastapi",
      name: "FastAPI / Python",
      port: "8000",
      cmd: "ssh -R 80:localhost:8000 -p 2222 tunl.online",
      note: "Instant public endpoint for AI APIs, LangChain & async streaming",
    },
    {
      id: "express",
      name: "Express / Node.js",
      port: "3000",
      cmd: "ssh -R 80:localhost:3000 -p 2222 tunl.online",
      note: "Receive Stripe, GitHub, or Shopify webhooks on local machine",
    },
    {
      id: "django",
      name: "Django / Flask",
      port: "8000",
      cmd: "ssh -R 80:localhost:8000 -p 2222 tunl.online",
      note: "Expose local Django admin & API endpoints securely",
    },
  ];

  const currentFramework = frameworks.find((f) => f.id === activeFramework) || frameworks[0];

  return (
    <div className="bg-background text-foreground selection:bg-primary/20 selection:text-primary flex min-h-screen flex-col font-sans">
      {/* Header / Navbar */}
      <header className="bg-card/90 border-border/60 sticky top-0 z-50 border-b backdrop-blur-xs">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>

          <nav className="text-muted-foreground hidden items-center gap-6 text-xs font-medium md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How it Works
            </a>
            <a href="#presets" className="hover:text-foreground transition-colors">
              Presets
            </a>
            <a href="#comparison" className="hover:text-foreground transition-colors">
              Comparison
            </a>
            <a href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="outline" size="sm" className="border-border/60 text-xs">
                Log In
              </Button>
            </Link>

            <Link href="/dashboard">
              <Button size="sm" className="gap-1.5 px-3.5 text-xs">
                Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-border/60 relative overflow-hidden border-b pt-10 pb-12 md:pt-14 md:pb-16">
          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              {/* Left Hero Column */}
              <div className="flex flex-col gap-5 text-left lg:col-span-6">
                <div className="border-border/60 bg-muted/40 text-muted-foreground inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Standard OpenSSH Compatibility</span>
                </div>

                <h1 className="text-foreground text-3xl leading-[1.12] font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  Expose Localhost via <span className="text-primary">Standard SSH</span>
                </h1>

                <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
                  Instant HTTPS tunnels for Next.js, Vite, FastAPI, and webhooks. Zero binary
                  downloads, no client daemons, zero configuration files.
                </p>

                {/* Primary CTA Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/dashboard">
                    <Button size="default" className="gap-2 px-4 text-xs font-semibold">
                      Start Free Tunnel <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Link href="/keys">
                    <Button variant="outline" size="default" className="gap-2 px-4 text-xs">
                      <Key className="text-primary h-3.5 w-3.5" />
                      Add SSH Public Key
                    </Button>
                  </Link>
                </div>

                {/* Command Box Card with OS Switcher */}
                <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-lg border text-xs shadow-2xs">
                  <div className="border-border/60 bg-muted/40 flex items-center justify-between border-b px-4 py-2 font-sans text-xs">
                    <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                      CLI Command ({activeOs.toUpperCase()})
                    </span>
                    <div className="bg-background border-border/60 flex rounded-md border p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setActiveOs("mac")}
                        className={`rounded-xs px-2.5 py-0.5 font-medium transition-colors ${
                          activeOs === "mac"
                            ? "bg-secondary text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        macOS
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveOs("linux")}
                        className={`rounded-xs px-2.5 py-0.5 font-medium transition-colors ${
                          activeOs === "linux"
                            ? "bg-secondary text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Linux
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveOs("win")}
                        className={`rounded-xs px-2.5 py-0.5 font-medium transition-colors ${
                          activeOs === "win"
                            ? "bg-secondary text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Windows
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 p-3.5 font-mono">
                    <div className="flex items-center gap-2 overflow-hidden text-xs">
                      <span className="text-muted-foreground select-none">$</span>
                      <code className="truncate font-semibold text-emerald-400">
                        {defaultSshCmd}
                      </code>
                    </div>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() => handleCopy(defaultSshCmd, "hero")}
                      className="shrink-0"
                    >
                      {copiedCmd === "hero" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Hero Column: Terminal Preview Demo */}
              <div className="lg:col-span-6">
                <TerminalDemo />
              </div>
            </div>
          </div>
        </section>

        {/* Trust Metrics */}
        <section className="border-border/60 bg-muted/20 border-b py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
              <div className="border-border/40 flex flex-col gap-1 border-r p-2 last:border-0">
                <span className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                  100%
                </span>
                <span className="text-muted-foreground text-xs font-medium">Standard OpenSSH</span>
              </div>
              <div className="border-border/40 flex flex-col gap-1 border-r p-2 last:border-0">
                <span className="text-2xl font-bold tracking-tight text-emerald-400 sm:text-3xl">
                  &lt; 15ms
                </span>
                <span className="text-muted-foreground text-xs font-medium">
                  Low-Latency Routing
                </span>
              </div>
              <div className="border-border/40 flex flex-col gap-1 border-r p-2 last:border-0">
                <span className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                  0
                </span>
                <span className="text-muted-foreground text-xs font-medium">
                  Client Agent Downloads
                </span>
              </div>
              <div className="flex flex-col gap-1 p-2">
                <span className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                  99.99%
                </span>
                <span className="text-muted-foreground text-xs font-medium">Platform Uptime</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step How It Works Section */}
        <section id="how-it-works" className="border-border/60 border-b py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How tunl Works</h2>
              <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
                Expose your local development environment to the public internet in under 5 seconds.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Step 1 */}
              <div className="border-border/60 bg-card flex flex-col gap-4 rounded-lg border p-6 shadow-2xs">
                <div className="bg-secondary text-foreground flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-bold">
                  01
                </div>
                <h3 className="text-base font-semibold">Start Your Local Server</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Run your web app or API locally on any port (e.g. 3000, 5173, or 8000).
                </p>
                <div className="bg-muted/60 border-border/60 text-foreground rounded-md border p-3 font-mono text-xs">
                  <code>$ npm run dev</code>
                </div>
              </div>

              {/* Step 2 */}
              <div className="border-border/60 bg-card flex flex-col gap-4 rounded-lg border p-6 shadow-2xs">
                <div className="bg-secondary text-foreground flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-bold">
                  02
                </div>
                <h3 className="text-base font-semibold">Run SSH Command</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Execute a single OpenSSH command in your terminal. Zero agent installation needed.
                </p>
                <div className="bg-muted/60 border-border/60 rounded-md border p-3 font-mono text-xs text-emerald-400">
                  <code className="block truncate">$ ssh -R 80:localhost:3000...</code>
                </div>
              </div>

              {/* Step 3 */}
              <div className="border-border/60 bg-card flex flex-col gap-4 rounded-lg border p-6 shadow-2xs">
                <div className="bg-secondary text-foreground flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-bold">
                  03
                </div>
                <h3 className="text-base font-semibold">Share Your HTTPS URL</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Access your application via an instant public HTTPS endpoint with TLS encryption.
                </p>
                <div className="bg-muted/60 border-border/60 rounded-md border p-3 font-mono text-xs text-emerald-400">
                  <code className="block truncate">https://my-app.tunl.online</code>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="border-border/60 bg-muted/10 border-b py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Everything You Need for Tunneling
              </h2>
              <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
                Engineered for performance, developer simplicity, and key-based security.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Card 1 */}
              <div className="border-border/60 bg-card flex flex-col gap-2.5 rounded-lg border p-6 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Terminal className="h-4 w-4 shrink-0 text-emerald-400" />
                  <h3 className="text-foreground text-sm font-semibold">
                    Zero Binary Dependencies
                  </h3>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Leverages standard OpenSSH pre-installed on macOS, Linux, and Windows. No extra
                  daemons or agents to update.
                </p>
              </div>

              {/* Card 2 */}
              <div className="border-border/60 bg-card flex flex-col gap-2.5 rounded-lg border p-6 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Globe className="h-4 w-4 shrink-0 text-emerald-400" />
                  <h3 className="text-foreground text-sm font-semibold">Reserved Subdomains</h3>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Reserve persistent static subdomains (e.g.{" "}
                  <code className="font-mono text-[11px] text-emerald-400">my-app.tunl.online</code>
                  ) bound directly to your SSH public key.
                </p>
              </div>

              {/* Card 3 */}
              <div className="border-border/60 bg-card flex flex-col gap-2.5 rounded-lg border p-6 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Zap className="h-4 w-4 shrink-0 text-emerald-400" />
                  <h3 className="text-foreground text-sm font-semibold">
                    WebSockets & HMR Support
                  </h3>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Full HTTP/1.1 protocol upgrade support for WebSockets, Server-Sent Events (SSE),
                  and Vite/Next.js Hot Reloading.
                </p>
              </div>

              {/* Card 4 */}
              <div className="border-border/60 bg-card flex flex-col gap-2.5 rounded-lg border p-6 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                  <h3 className="text-foreground text-sm font-semibold">OpenSSH Cryptography</h3>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Authenticate securely using Ed25519 or RSA public key pairs. No shared API tokens
                  or vulnerable secrets.
                </p>
              </div>

              {/* Card 5 */}
              <div className="border-border/60 bg-card flex flex-col gap-2.5 rounded-lg border p-6 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Activity className="h-4 w-4 shrink-0 text-emerald-400" />
                  <h3 className="text-foreground text-sm font-semibold">Live Traffic Telemetry</h3>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Monitor active tunnel sessions, HTTP traffic inspection, latency, and authorized
                  SSH keys from your dashboard.
                </p>
              </div>

              {/* Card 6 */}
              <div className="border-border/60 bg-card flex flex-col gap-2.5 rounded-lg border p-6 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <Server className="h-4 w-4 shrink-0 text-emerald-400" />
                  <h3 className="text-foreground text-sm font-semibold">Webhook Integrations</h3>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Receive Stripe, GitHub, Shopify, or Twilio webhooks on localhost without opening
                  firewall ports.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Framework Presets */}
        <section id="presets" className="border-border/60 border-b py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Works With Every Stack
              </h2>
              <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
                Select your tech stack for the instant one-liner SSH command.
              </p>
            </div>

            <div className="border-border/60 bg-card flex flex-col overflow-hidden rounded-lg border shadow-2xs">
              {/* Framework Tabs */}
              <div className="border-border/60 bg-muted/40 no-scrollbar flex flex-nowrap items-center gap-1 overflow-x-auto border-b p-2">
                {frameworks.map((fw) => (
                  <button
                    key={fw.id}
                    type="button"
                    onClick={() => setActiveFramework(fw.id)}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                      activeFramework === fw.id
                        ? "bg-secondary text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    {fw.name}
                  </button>
                ))}
              </div>

              {/* Framework Command Showcase */}
              <div className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-1">
                  <span className="text-foreground text-sm font-semibold">
                    {currentFramework.name} (Port {currentFramework.port})
                  </span>
                  <p className="text-muted-foreground text-xs">{currentFramework.note}</p>
                </div>

                <div className="bg-muted/60 text-foreground border-border/60 flex items-center justify-between gap-3 rounded-md border p-3 font-mono text-xs select-all">
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
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Why Choose tunl?</h2>
              <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
                How tunl compares with traditional reverse tunnel utilities.
              </p>
            </div>

            <div className="border-border/60 bg-card overflow-hidden rounded-lg border shadow-2xs">
              <div className="no-scrollbar overflow-x-auto">
                <table className="w-full border-collapse text-left font-sans text-xs">
                  <thead>
                    <tr className="border-border/60 bg-muted/40 text-muted-foreground border-b text-[11px] font-semibold tracking-wider uppercase">
                      <th className="w-[240px] p-4">Feature</th>
                      <th className="text-foreground p-4">tunl</th>
                      <th className="text-muted-foreground p-4">ngrok / localtunnel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border/60 divide-y">
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="text-foreground p-4 font-semibold">Binary Installation</td>
                      <td className="flex items-center gap-1.5 p-4 font-medium text-emerald-400">
                        <Check className="h-4 w-4" /> None (Standard OpenSSH)
                      </td>
                      <td className="text-muted-foreground p-4">Requires CLI binary install</td>
                    </tr>
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="text-foreground p-4 font-semibold">Authentication</td>
                      <td className="flex items-center gap-1.5 p-4 font-medium text-emerald-400">
                        <Check className="h-4 w-4" /> OpenSSH Public Keys
                      </td>
                      <td className="text-muted-foreground p-4">API Auth Tokens</td>
                    </tr>
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="text-foreground p-4 font-semibold">WebSocket & HMR</td>
                      <td className="flex items-center gap-1.5 p-4 font-medium text-emerald-400">
                        <Check className="h-4 w-4" /> Native HTTP/1.1 Upgrades
                      </td>
                      <td className="text-muted-foreground p-4">Varies by Plan</td>
                    </tr>
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="text-foreground p-4 font-semibold">Time to First Tunnel</td>
                      <td className="flex items-center gap-1.5 p-4 font-medium text-emerald-400">
                        <Zap className="h-4 w-4 text-emerald-400" /> ~3 Seconds
                      </td>
                      <td className="text-muted-foreground p-4">2 to 5 Minutes</td>
                    </tr>
                    <tr className="hover:bg-muted/20 transition-colors">
                      <td className="text-foreground p-4 font-semibold">Static Subdomains</td>
                      <td className="flex items-center gap-1.5 p-4 font-medium text-emerald-400">
                        <Check className="h-4 w-4" /> Supported via Dashboard
                      </td>
                      <td className="text-muted-foreground p-4">Paid Plan Requirement</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Tiers Section */}
        <section id="pricing" className="border-border/60 border-b py-20">
          <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Flexible Tunneling Plans
              </h2>
              <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
                Start free with zero configuration, upgrade when you need persistent reserved
                subdomains.
              </p>
            </div>

            <div className="mx-auto grid w-full max-w-4xl gap-8 md:grid-cols-2">
              {/* Free Tier */}
              <div className="border-border/60 bg-card flex flex-col justify-between gap-6 rounded-lg border p-8 shadow-2xs">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-sm font-semibold tracking-wider uppercase">
                      Ephemeral Tier
                    </span>
                    <span className="bg-muted text-muted-foreground rounded-md px-2.5 py-0.5 text-[11px] font-semibold">
                      Free Forever
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-foreground text-3xl font-bold">$0</span>
                    <span className="text-muted-foreground text-xs">/ month</span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Instant 1-command tunneling for quick testing and local debugging.
                  </p>
                  <div className="border-border/60 flex flex-col gap-2.5 border-t pt-4 text-xs">
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
                  <Button variant="outline" className="w-full text-xs">
                    Run Free Tunnel
                  </Button>
                </Link>
              </div>

              {/* Pro Reserved Tier */}
              <div className="border-primary/60 bg-card relative flex flex-col justify-between gap-6 rounded-lg border p-8 shadow-2xs">
                <div className="bg-primary/20 text-primary border-primary/30 absolute -top-3 right-6 rounded-md border px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                  Recommended
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-sm font-semibold tracking-wider uppercase">
                      Reserved Tier
                    </span>
                    <span className="bg-primary/15 text-primary border-primary/20 rounded-md border px-2.5 py-0.5 text-[11px] font-semibold">
                      Pro
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-foreground text-3xl font-bold">$0</span>
                    <span className="text-muted-foreground text-xs">/ developer preview</span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Persistent subdomains locked directly to your personal SSH public key.
                  </p>
                  <div className="border-border/60 flex flex-col gap-2.5 border-t pt-4 text-xs">
                    <span className="text-foreground flex items-center gap-2 font-medium">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      All Ephemeral Features included
                    </span>
                    <span className="text-foreground flex items-center gap-2 font-medium">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      Persistent reserved subdomain alias
                    </span>
                    <span className="text-foreground flex items-center gap-2 font-medium">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      Ed25519 SSH Public Key Authorization
                    </span>
                    <span className="text-foreground flex items-center gap-2 font-medium">
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      Live Traffic Inspector & Dashboard
                    </span>
                  </div>
                </div>

                <Link href="/login" className="w-full">
                  <Button className="w-full gap-2 text-xs font-semibold">
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
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Frequently Asked Questions
              </h2>
            </div>

            <Accordion className="flex w-full flex-col gap-3 text-xs">
              <AccordionItem
                value="item-1"
                className="border-border/60 bg-card rounded-lg border px-4 py-1"
              >
                <AccordionTrigger className="text-xs font-semibold hover:no-underline">
                  Do I need to install any CLI tool or binary?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-2 text-xs leading-relaxed">
                  No! tunl relies on standard OpenSSH (
                  <code className="text-foreground font-mono">ssh</code>), which is pre-installed on
                  macOS, Linux, and Windows 10/11.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-2"
                className="border-border/60 bg-card rounded-lg border px-4 py-1"
              >
                <AccordionTrigger className="text-xs font-semibold hover:no-underline">
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
                className="border-border/60 bg-card rounded-lg border px-4 py-1"
              >
                <AccordionTrigger className="text-xs font-semibold hover:no-underline">
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
                className="border-border/60 bg-card rounded-lg border px-4 py-1"
              >
                <AccordionTrigger className="text-xs font-semibold hover:no-underline">
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
        <section className="bg-card/50 border-border/60 border-b py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to expose your first tunnel in <span className="text-primary">3 seconds</span>?
            </h2>
            <p className="text-muted-foreground max-w-lg text-sm">
              No installation required. Fire up standard SSH in your terminal right now.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/dashboard">
                <Button size="lg" className="h-10 gap-2 px-6 text-xs font-semibold">
                  Open Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/keys">
                <Button variant="outline" size="lg" className="h-10 gap-2 px-6 text-xs">
                  Register SSH Key
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-border/60 bg-card py-8 font-sans text-xs">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-muted-foreground text-xs">
              © {new Date().getFullYear()} tunl. All rights reserved.
            </span>
          </div>

          <div className="text-muted-foreground flex items-center gap-6 text-xs font-medium">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Tunnels
            </Link>
            <Link href="/keys" className="hover:text-foreground transition-colors">
              SSH Keys
            </Link>
            <Link href="/inspect" className="hover:text-foreground transition-colors">
              Inspect
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
