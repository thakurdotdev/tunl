"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const SSH_COMMAND = "ssh -R 80:localhost:3000 -p 2222 tunl.online";

export function FinalCta() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SSH_COMMAND);
    setCopied(true);
    toast.success("Command copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-5 text-center sm:px-6">
        <h2 className="text-foreground mb-2 text-xl font-bold tracking-tight sm:text-2xl">
          Start your first tunnel
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md text-xs leading-relaxed">
          No signup required. Execute standard SSH in your terminal to get an immediate HTTPS
          endpoint.
        </p>

        {/* Command Box */}
        <button
          type="button"
          onClick={handleCopy}
          className="bg-card border-border/60 hover:border-border group mb-6 flex items-center gap-3 rounded-lg border px-4 py-3 font-mono text-xs transition-colors select-all"
        >
          <span className="text-muted-foreground select-none">$</span>
          <code className="text-foreground font-semibold sm:text-sm">{SSH_COMMAND}</code>
          <span className="text-muted-foreground group-hover:text-foreground ml-1 transition-colors">
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </span>
        </button>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button size="lg" className="gap-2 px-5 text-xs font-semibold">
              Open Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="px-5 text-xs">
              Add SSH Key
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
