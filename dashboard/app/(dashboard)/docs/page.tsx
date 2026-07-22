"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  Copy,
  Globe,
  HelpCircle,
  Key,
  Layers,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DocsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "all" | "quickstart" | "subdomains" | "presets" | "ssh" | "faq"
  >("all");
  const [customPort, setCustomPort] = useState("3000");
  const [customSub, setCustomSub] = useState("my-app");
  const [strictHostKey, setStrictHostKey] = useState(false);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Command copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const subPrefix = customSub.trim() ? `${customSub.trim()}@` : "";
  const hostFlag = strictHostKey ? " -o StrictHostKeyChecking=accept-new" : "";
  const generatedSshCmd = `ssh -R 80:localhost:${customPort || "3000"}${hostFlag} -p 2222 ${subPrefix}t.thakur.dev`;

  const frameworkPresets = [
    { name: "Next.js / React", port: "3000", cmd: "ssh -R 80:localhost:3000 -p 2222 t.thakur.dev" },
    {
      name: "Vite / Vue / Svelte",
      port: "5173",
      cmd: "ssh -R 80:localhost:5173 -p 2222 t.thakur.dev",
    },
    {
      name: "FastAPI / Uvicorn",
      port: "8000",
      cmd: "ssh -R 80:localhost:8000 -p 2222 t.thakur.dev",
    },
    {
      name: "Express / Node.js",
      port: "3000",
      cmd: "ssh -R 80:localhost:3000 -p 2222 t.thakur.dev",
    },
    { name: "Django / Flask", port: "8000", cmd: "ssh -R 80:localhost:8000 -p 2222 t.thakur.dev" },
    { name: "Ruby on Rails", port: "3000", cmd: "ssh -R 80:localhost:3000 -p 2222 t.thakur.dev" },
  ];

  return (
    <div className="flex flex-col gap-6 font-mono">
      {/* Header */}
      <div className="border-border flex flex-col gap-1 border-b pb-4">
        <div className="flex items-center gap-2">
          <span className="text-primary text-xl font-bold">{">"}</span>
          <h1 className="text-xl font-bold tracking-tight">CLI Documentation & Manual</h1>
          <span className="border-primary/40 bg-primary/10 text-primary rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold">
            v1.0-STABLE
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          // Official reference manual for exposing local servers to the internet using OpenSSH.
        </p>
      </div>

      {/* 2-Column Sidebar & Main Content */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Sidebar Index */}
        <div className="lg:col-span-3">
          <div className="flex flex-col gap-2 lg:sticky lg:top-20">
            <span className="text-muted-foreground px-2 text-[10px] font-bold tracking-wider uppercase">
              DOCUMENTATION INDEX
            </span>

            <nav className="flex flex-col gap-1 text-xs">
              {[
                { id: "all", label: "0: Overview & Builder", icon: Layers },
                { id: "quickstart", label: "1: 10s Quickstart", icon: Zap },
                { id: "subdomains", label: "2: Static Subdomains", icon: Globe },
                { id: "presets", label: "3: Framework Presets", icon: Code2 },
                { id: "ssh", label: "4: SSH Key Setup", icon: Key },
                { id: "faq", label: "5: Troubleshooting", icon: HelpCircle },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-left font-mono text-xs transition-all ${
                      isActive
                        ? "bg-primary/20 text-primary border-primary/40 border font-bold shadow-2xs"
                        : "text-muted-foreground hover:bg-card hover:text-foreground border border-transparent"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="flex flex-col gap-6 lg:col-span-9">
          {/* Interactive Command Generator */}
          <div className="border-border bg-card overflow-hidden rounded-lg border shadow-xs">
            <div className="border-border bg-muted/40 flex items-center justify-between border-b px-4 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-muted-foreground ml-2 font-mono text-[11px]">
                  tunl :: command-builder
                </span>
              </div>
              <span className="text-primary text-[10px] font-bold">BUILDER</span>
            </div>

            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-2.5">
                <Sparkles className="text-primary h-4 w-4 shrink-0" />
                <div>
                  <h2 className="text-sm font-bold">Interactive SSH Command Generator</h2>
                  <p className="text-muted-foreground text-[11px]">
                    Customize your local port, subdomain, and flags to output an exact copyable
                    command.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="customPort"
                    className="text-muted-foreground text-xs font-semibold"
                  >
                    LOCAL PORT TO FORWARD
                  </Label>
                  <Input
                    id="customPort"
                    value={customPort}
                    onChange={(e) => setCustomPort(e.target.value)}
                    placeholder="3000"
                    className="bg-background/50 border-border focus-visible:ring-primary/40 h-9 font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="customSub"
                    className="text-muted-foreground text-xs font-semibold"
                  >
                    RESERVED SUBDOMAIN ALIAS (OPTIONAL)
                  </Label>
                  <Input
                    id="customSub"
                    value={customSub}
                    onChange={(e) => setCustomSub(e.target.value)}
                    placeholder="my-app"
                    className="bg-background/50 border-border focus-visible:ring-primary/40 h-9 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="strictCheck"
                  checked={strictHostKey}
                  onChange={(e) => setStrictHostKey(e.target.checked)}
                  className="border-border text-primary focus:ring-primary h-3.5 w-3.5 rounded"
                />
                <Label
                  htmlFor="strictCheck"
                  className="text-muted-foreground cursor-pointer font-mono text-xs"
                >
                  Include <code className="text-primary">-o StrictHostKeyChecking=accept-new</code>{" "}
                  flag
                </Label>
              </div>

              <div className="bg-muted/80 border-border text-primary flex items-center gap-3 rounded-md border p-3 font-mono text-xs select-all">
                <span className="text-muted-foreground select-none">$</span>
                <code className="flex-1 truncate">{generatedSshCmd}</code>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => copyText(generatedSshCmd, "builder")}
                  className="shrink-0"
                >
                  {copiedId === "builder" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Section 1: Quickstart */}
          {(activeTab === "all" || activeTab === "quickstart") && (
            <div className="border-border bg-card flex flex-col gap-4 overflow-hidden rounded-lg border p-5 shadow-xs">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-bold">10-Second Quickstart (Ephemeral Tunnel)</h2>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                You can expose any local web server to the public internet instantly without
                creating an account or reserving a subdomain.
              </p>

              <div className="grid gap-3 pt-1 text-xs sm:grid-cols-3">
                <div className="border-border bg-muted/20 flex flex-col gap-1.5 rounded-md border p-3">
                  <span className="text-primary text-[10px] font-bold">STEP 1</span>
                  <span className="text-foreground font-semibold">Start Local Server</span>
                  <p className="text-muted-foreground text-[11px]">
                    Run your web app on local port 3000 (or any port).
                  </p>
                </div>
                <div className="border-border bg-muted/20 flex flex-col gap-1.5 rounded-md border p-3">
                  <span className="text-primary text-[10px] font-bold">STEP 2</span>
                  <span className="text-foreground font-semibold">Open Terminal</span>
                  <p className="text-muted-foreground text-[11px]">
                    No client binaries required. Open bash, zsh, or PowerShell.
                  </p>
                </div>
                <div className="border-border bg-muted/20 flex flex-col gap-1.5 rounded-md border p-3">
                  <span className="text-primary text-[10px] font-bold">STEP 3</span>
                  <span className="text-foreground font-semibold">Execute SSH Command</span>
                  <p className="text-muted-foreground text-[11px]">
                    Run the command below to get a live HTTPS URL.
                  </p>
                </div>
              </div>

              <div className="bg-muted/80 text-primary border-border flex items-center gap-2 rounded-md border p-3 font-mono text-xs select-all">
                <span className="text-muted-foreground select-none">$</span>
                <code className="flex-1 truncate">
                  ssh -R 80:localhost:3000 -p 2222 t.thakur.dev
                </code>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() =>
                    copyText("ssh -R 80:localhost:3000 -p 2222 t.thakur.dev", "qs_cmd")
                  }
                >
                  {copiedId === "qs_cmd" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Section 2: Reserved Static Subdomains */}
          {(activeTab === "all" || activeTab === "subdomains") && (
            <div className="border-border bg-card flex flex-col gap-4 overflow-hidden rounded-lg border p-5 shadow-xs">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-bold">Reserved Static Subdomains</h2>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Reserve persistent subdomains (e.g.{" "}
                <code className="text-primary font-bold">my-app.thakur.dev</code>) so your public
                URL stays constant every time you connect.
              </p>

              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="bg-primary/20 text-primary border-primary/30 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold">
                    1
                  </span>
                  <span>
                    Go to <strong className="text-foreground">Tunnels</strong> page and claim your
                    subdomain alias (e.g. <code className="text-primary font-mono">my-app</code>).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="bg-primary/20 text-primary border-primary/30 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold">
                    2
                  </span>
                  <span>
                    Go to <strong className="text-foreground">SSH Keys</strong> page and register
                    your SSH public key (<code className="font-mono">~/.ssh/id_ed25519.pub</code>).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="bg-primary/20 text-primary border-primary/30 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold">
                    3
                  </span>
                  <span>Pass your reserved subdomain as the SSH username:</span>
                </div>
              </div>

              <div className="bg-muted/80 text-primary border-border flex items-center gap-2 rounded-md border p-3 font-mono text-xs select-all">
                <span className="text-muted-foreground select-none">$</span>
                <code className="flex-1 truncate">
                  ssh -R 80:localhost:3000 -p 2222 my-app@t.thakur.dev
                </code>
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() =>
                    copyText("ssh -R 80:localhost:3000 -p 2222 my-app@t.thakur.dev", "sub_cmd")
                  }
                >
                  {copiedId === "sub_cmd" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Section 3: Framework Presets */}
          {(activeTab === "all" || activeTab === "presets") && (
            <div className="border-border bg-card flex flex-col gap-4 overflow-hidden rounded-lg border p-5 shadow-xs">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-bold">Framework Quick-Commands</h2>
              </div>
              <p className="text-muted-foreground text-xs">
                Copy pre-configured commands for popular development frameworks:
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {frameworkPresets.map((fw, idx) => (
                  <div
                    key={idx}
                    className="border-border bg-muted/20 flex flex-col gap-2 rounded-md border p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-foreground font-bold">{fw.name}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        PORT {fw.port}
                      </span>
                    </div>
                    <div className="bg-background/80 text-primary border-border flex items-center justify-between gap-2 rounded border p-2 text-[11px]">
                      <code className="truncate">$ {fw.cmd}</code>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() => copyText(fw.cmd, `fw_${idx}`)}
                        className="shrink-0"
                      >
                        {copiedId === `fw_${idx}` ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: SSH Key Setup & SSH Config Trick */}
          {(activeTab === "all" || activeTab === "ssh") && (
            <div className="border-border bg-card flex flex-col gap-4 overflow-hidden rounded-lg border p-5 shadow-xs">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-violet-400" />
                <h2 className="text-sm font-bold">
                  SSH Public Key Authentication & Config Shortcut
                </h2>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Tunl authenticates clients via SSH public key cryptography with zero passwords
                required.
              </p>

              <div className="border-border bg-muted/20 flex flex-col gap-2 rounded-md border p-3 text-xs">
                <span className="text-primary text-[11px] font-bold">
                  SSH CONFIG SHORTCUT TRICK
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Add this block to your local{" "}
                  <code className="text-foreground font-mono">~/.ssh/config</code> file so you can
                  launch tunnels simply by typing{" "}
                  <code className="text-primary font-bold">ssh tunl</code>:
                </p>
                <div className="bg-background/90 text-muted-foreground border-border rounded border p-2.5 font-mono text-[11px] leading-relaxed select-all">
                  Host tunl{"\n"}
                  {"  "}HostName t.thakur.dev{"\n"}
                  {"  "}Port 2222{"\n"}
                  {"  "}RemoteForward 80 localhost:3000
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Troubleshooting & FAQ */}
          {(activeTab === "all" || activeTab === "faq") && (
            <div className="border-border bg-card flex flex-col gap-4 overflow-hidden rounded-lg border p-5 shadow-xs">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-rose-400" />
                <h2 className="text-sm font-bold">Troubleshooting & Frequently Asked Questions</h2>
              </div>

              <div className="flex flex-col gap-3 text-xs">
                <div className="border-border bg-muted/20 flex flex-col gap-1 rounded-md border p-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Warning: Remote port forwarding failed</span>
                  </div>
                  <p className="text-muted-foreground pl-5 text-[11px]">
                    This occurs if your plan limit is reached (1 active session allowed), or if the
                    requested subdomain is already open in another terminal session.
                  </p>
                </div>

                <div className="border-border bg-muted/20 flex flex-col gap-1 rounded-md border p-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Host key verification failed</span>
                  </div>
                  <p className="text-muted-foreground pl-5 text-[11px]">
                    If the server host key is updated, pass{" "}
                    <code className="text-primary">-o StrictHostKeyChecking=accept-new</code> in
                    your SSH command.
                  </p>
                </div>

                <div className="border-border bg-muted/20 flex flex-col gap-1 rounded-md border p-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>WebSocket & Hot Module Reloading (HMR) Support</span>
                  </div>
                  <p className="text-muted-foreground pl-5 text-[11px]">
                    Tunl transparently forwards HTTP/1.1 chunked encoding, WebSockets, and
                    Server-Sent Events (SSE) automatically.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
