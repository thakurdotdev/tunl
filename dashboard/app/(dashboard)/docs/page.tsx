"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
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
  const [activeTab, setActiveTab] = useState<"all" | "quickstart" | "subdomains" | "ssh" | "faq">(
    "all",
  );
  const [customPort, setCustomPort] = useState("3000");
  const [customSub, setCustomSub] = useState("my-app");

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Command copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generatedSshCmd = customSub.trim()
    ? `ssh -R 80:localhost:${customPort || "3000"} -p 2222 ${customSub.trim()}@t.thakur.dev`
    : `ssh -R 80:localhost:${customPort || "3000"} -p 2222 t.thakur.dev`;

  return (
    <div className="flex flex-col gap-8">
      {/* Page Title Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Documentation</h1>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            CLI v1.0
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          Everything you need to know about exposing local ports to the internet using standard SSH.
        </p>
      </div>

      {/* Interactive Command Generator */}
      <div className="border-border bg-card relative overflow-hidden rounded-2xl border p-6 shadow-xs">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Interactive SSH Command Builder</h2>
                <p className="text-muted-foreground text-xs">
                  Customize your port and subdomain to generate your exact SSH command.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customPort" className="text-xs">
                Local Port
              </Label>
              <Input
                id="customPort"
                value={customPort}
                onChange={(e) => setCustomPort(e.target.value)}
                placeholder="3000"
                className="h-9 font-mono text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customSub" className="text-xs">
                Subdomain (Optional for reserved subdomains)
              </Label>
              <Input
                id="customSub"
                value={customSub}
                onChange={(e) => setCustomSub(e.target.value)}
                placeholder="my-app"
                className="h-9 font-mono text-xs"
              />
            </div>
          </div>

          <div className="bg-muted/70 flex items-center gap-3 rounded-xl p-3 font-mono text-xs select-all">
            <code className="text-foreground flex-1 truncate">{generatedSshCmd}</code>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => copyText(generatedSshCmd, "builder")}
              className="shrink-0"
            >
              {copiedId === "builder" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
        {[
          { id: "all", label: "All Guides", icon: Layers },
          { id: "quickstart", label: "Quickstart", icon: Zap },
          { id: "subdomains", label: "Subdomains", icon: Globe },
          { id: "ssh", label: "SSH Authentication", icon: Key },
          { id: "faq", label: "Troubleshooting", icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Grid Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Section 1: Quickstart */}
        {(activeTab === "all" || activeTab === "quickstart") && (
          <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6">
            <div className="flex items-center gap-2.5">
              <Zap className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-semibold">10-Second Quickstart</h2>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Expose any local HTTP server instantly without installing third-party CLI tools or
              binaries.
            </p>
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="bg-muted text-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  1
                </span>
                <span>
                  Start your local web application on any port (e.g.{" "}
                  <code className="font-mono">localhost:3000</code>).
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="bg-muted text-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  2
                </span>
                <span>Run the single SSH tunnel command in your terminal:</span>
              </div>
            </div>
            <div className="bg-muted/70 flex items-center gap-2 rounded-xl p-2.5 font-mono text-xs select-all">
              <code className="flex-1 truncate">ssh -R 80:localhost:3000 -p 2222 t.thakur.dev</code>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => copyText("ssh -R 80:localhost:3000 -p 2222 t.thakur.dev", "qs_card")}
              >
                {copiedId === "qs_card" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Section 2: Reserved Subdomains */}
        {(activeTab === "all" || activeTab === "subdomains") && (
          <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6">
            <div className="flex items-center gap-2.5">
              <Globe className="h-5 w-5 text-emerald-500" />
              <h2 className="text-base font-semibold">Reserved Subdomains</h2>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Claim persistent subdomains so your tunnel URL remains constant every time you
              connect.
            </p>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="bg-muted text-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  1
                </span>
                <span>
                  Reserve your subdomain in the <strong>Tunnels</strong> tab in your dashboard.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="bg-muted text-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  2
                </span>
                <span>
                  Add your local SSH public key under <strong>SSH Keys</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="bg-muted text-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  3
                </span>
                <span>Connect specifying your subdomain as the SSH username:</span>
              </div>
            </div>
            <div className="bg-muted/70 flex items-center gap-2 rounded-xl p-2.5 font-mono text-xs select-all">
              <code className="flex-1 truncate">
                ssh -R 80:localhost:3000 -p 2222 my-app@t.thakur.dev
              </code>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() =>
                  copyText("ssh -R 80:localhost:3000 -p 2222 my-app@t.thakur.dev", "sub_card")
                }
              >
                {copiedId === "sub_card" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Section 3: Framework Presets */}
        {(activeTab === "all" || activeTab === "quickstart") && (
          <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6">
            <div className="flex items-center gap-2.5">
              <Code2 className="h-5 w-5 text-blue-500" />
              <h2 className="text-base font-semibold">Framework Commands</h2>
            </div>
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">
                  Next.js / React (Port 3000)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyText("ssh -R 80:localhost:3000 -p 2222 t.thakur.dev", "fw_next")
                  }
                  className="hover:text-foreground font-mono text-[11px] underline"
                >
                  {copiedId === "fw_next" ? "Copied!" : "Copy"}
                </button>
              </div>
              <code className="bg-muted/70 block rounded-lg p-2 font-mono text-[11px] select-all">
                ssh -R 80:localhost:3000 -p 2222 t.thakur.dev
              </code>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">
                  Vite / Vue / Svelte (Port 5173)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyText("ssh -R 80:localhost:5173 -p 2222 t.thakur.dev", "fw_vite")
                  }
                  className="hover:text-foreground font-mono text-[11px] underline"
                >
                  {copiedId === "fw_vite" ? "Copied!" : "Copy"}
                </button>
              </div>
              <code className="bg-muted/70 block rounded-lg p-2 font-mono text-[11px] select-all">
                ssh -R 80:localhost:5173 -p 2222 t.thakur.dev
              </code>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">
                  FastAPI / Python (Port 8000)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyText("ssh -R 80:localhost:8000 -p 2222 t.thakur.dev", "fw_fastapi")
                  }
                  className="hover:text-foreground font-mono text-[11px] underline"
                >
                  {copiedId === "fw_fastapi" ? "Copied!" : "Copy"}
                </button>
              </div>
              <code className="bg-muted/70 block rounded-lg p-2 font-mono text-[11px] select-all">
                ssh -R 80:localhost:8000 -p 2222 t.thakur.dev
              </code>
            </div>
          </div>
        )}

        {/* Section 4: SSH Authentication */}
        {(activeTab === "all" || activeTab === "ssh") && (
          <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6">
            <div className="flex items-center gap-2.5">
              <Shield className="h-5 w-5 text-violet-500" />
              <h2 className="text-base font-semibold">SSH Key Authentication</h2>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Tunl authenticates client connections using SSH public keys. This ensures zero
              passwords and instant key-to-account mapping.
            </p>
            <div className="bg-muted/40 flex flex-col gap-2 rounded-xl p-3 text-xs">
              <span className="text-foreground font-medium">Recommended key generation:</span>
              <div className="flex items-center gap-2">
                <code className="bg-muted block flex-1 truncate rounded-lg p-2 font-mono text-[11px] select-all">
                  ssh-keygen -t ed25519 -C "your_email@example.com"
                </code>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    copyText('ssh-keygen -t ed25519 -C "your_email@example.com"', "ssh_gen")
                  }
                >
                  {copiedId === "ssh_gen" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-muted-foreground mt-1 text-[11px]">
                Copy <code className="font-mono">~/.ssh/id_ed25519.pub</code> and paste it into the{" "}
                <strong>SSH Keys</strong> page.
              </p>
            </div>
          </div>
        )}

        {/* Section 5: Troubleshooting */}
        {(activeTab === "all" || activeTab === "faq") && (
          <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6">
            <div className="flex items-center gap-2.5">
              <HelpCircle className="h-5 w-5 text-rose-500" />
              <h2 className="text-base font-semibold">Troubleshooting & FAQ</h2>
            </div>
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <span className="text-foreground font-medium">
                  Warning: Remote port forwarding failed
                </span>
                <p className="text-muted-foreground mt-0.5">
                  Occurs if you have reached your plan limit (1 active tunnel per account/IP) or if
                  the requested subdomain is already active in another session.
                </p>
              </div>
              <div>
                <span className="text-foreground font-medium">Host key verification failed?</span>
                <p className="text-muted-foreground mt-0.5">
                  If the server host key changes, add{" "}
                  <code className="font-mono">-o StrictHostKeyChecking=accept-new</code> to your SSH
                  command.
                </p>
              </div>
              <div>
                <span className="text-foreground font-medium">WebSocket support</span>
                <p className="text-muted-foreground mt-0.5">
                  Tunl supports HTTP/1.1 chunking, keep-alive, and WebSocket upgrade requests
                  automatically.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
