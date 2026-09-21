import { Check, Minus } from "lucide-react";

interface ComparisonFeature {
  name: string;
  description: string;
  tunl: boolean | string;
  ngrok: boolean | string;
  cloudflare: boolean | string;
}

const COMPARISON_FEATURES: ComparisonFeature[] = [
  {
    name: "Zero CLI Download",
    description: "Uses standard preinstalled OpenSSH client directly from your terminal",
    tunl: true,
    ngrok: false,
    cloudflare: false,
  },
  {
    name: "No Signup Required",
    description: "Run tunnels immediately without signing up or creating an account",
    tunl: true,
    ngrok: false,
    cloudflare: false,
  },
  {
    name: "Public Key Authentication",
    description: "Secure cryptographic authentication using Ed25519 & RSA SSH keys",
    tunl: true,
    ngrok: false,
    cloudflare: false,
  },
  {
    name: "Automatic HTTPS / TLS",
    description: "Instant SSL certificates and TLS termination on public tunnel URLs",
    tunl: true,
    ngrok: true,
    cloudflare: true,
  },
  {
    name: "Persistent Custom Subdomains",
    description: "Claim reserved static subdomains tied directly to your SSH key",
    tunl: "Free in Preview",
    ngrok: "Paid Tier Only",
    cloudflare: "Requires Domain",
  },
  {
    name: "WebSocket & SSE Protocol Upgrades",
    description: "Full HTTP/1.1 connection upgrades for Vite, Next.js HMR, and sockets",
    tunl: true,
    ngrok: true,
    cloudflare: true,
  },
  {
    name: "Real-time Traffic Telemetry",
    description: "Inspect HTTP headers, payloads, status codes, and latency in web UI",
    tunl: true,
    ngrok: true,
    cloudflare: "Audit Logs",
  },
];

export function Comparison() {
  return (
    <section id="comparison" className="border-border/40 border-t py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <div className="mb-10 max-w-xl">
          <span className="text-muted-foreground mb-2 block font-mono text-[11px] font-medium tracking-wider uppercase">
            Comparison & Alternatives
          </span>
          <h2 className="text-foreground mb-3 text-xl font-bold tracking-tight sm:text-2xl">
            tunl vs Traditional Tunneling Tools
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Why developers choose{" "}
            <strong className="text-foreground font-semibold">tunl.online</strong> over proprietary
            agents like ngrok or cloudflared.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="border-border/60 bg-card overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-border/60 bg-muted/30 border-b font-mono">
                <th scope="col" className="text-foreground p-4 font-semibold sm:px-6 sm:py-3.5">
                  Feature
                </th>
                <th
                  scope="col"
                  className="text-primary bg-primary/5 border-border/60 border-x p-4 font-semibold sm:px-6 sm:py-3.5"
                >
                  tunl (tunl.online)
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground p-4 font-semibold sm:px-6 sm:py-3.5"
                >
                  ngrok
                </th>
                <th
                  scope="col"
                  className="text-muted-foreground p-4 font-semibold sm:px-6 sm:py-3.5"
                >
                  Cloudflare Tunnel
                </th>
              </tr>
            </thead>
            <tbody className="divide-border/40 divide-y">
              {COMPARISON_FEATURES.map((feat) => (
                <tr key={feat.name} className="hover:bg-muted/15 transition-colors">
                  <td className="p-4 sm:px-6">
                    <div className="text-foreground font-semibold">{feat.name}</div>
                    <div className="text-muted-foreground mt-0.5 text-[11px]">
                      {feat.description}
                    </div>
                  </td>
                  <td className="bg-primary/[0.02] border-border/60 border-x p-4 sm:px-6">
                    {typeof feat.tunl === "boolean" ? (
                      feat.tunl ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                          <Check className="h-4 w-4" /> Yes
                        </span>
                      ) : (
                        <Minus className="text-muted-foreground h-4 w-4" />
                      )
                    ) : (
                      <span className="font-mono font-medium text-emerald-400">{feat.tunl}</span>
                    )}
                  </td>
                  <td className="text-muted-foreground p-4 sm:px-6">
                    {typeof feat.ngrok === "boolean" ? (
                      feat.ngrok ? (
                        <span className="text-foreground inline-flex items-center gap-1.5 font-medium">
                          <Check className="h-4 w-4" /> Yes
                        </span>
                      ) : (
                        <span className="text-muted-foreground inline-flex items-center gap-1.5">
                          <Minus className="h-4 w-4" /> No
                        </span>
                      )
                    ) : (
                      <span className="font-mono">{feat.ngrok}</span>
                    )}
                  </td>
                  <td className="text-muted-foreground p-4 sm:px-6">
                    {typeof feat.cloudflare === "boolean" ? (
                      feat.cloudflare ? (
                        <span className="text-foreground inline-flex items-center gap-1.5 font-medium">
                          <Check className="h-4 w-4" /> Yes
                        </span>
                      ) : (
                        <span className="text-muted-foreground inline-flex items-center gap-1.5">
                          <Minus className="h-4 w-4" /> No
                        </span>
                      )
                    ) : (
                      <span className="font-mono">{feat.cloudflare}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
