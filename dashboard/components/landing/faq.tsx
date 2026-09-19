"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is tunl online?",
    answer:
      "tunl (tunl.online) is a zero-install reverse tunneling platform powered by standard OpenSSH. It allows developers to securely expose local development servers, APIs, WebSockets, and webhooks to the public internet over HTTPS without installing any proprietary CLI binary or background daemon.",
  },
  {
    question: "How do I create an SSH tunnel with tunl without installing software?",
    answer:
      "tunl relies entirely on native OpenSSH remote port forwarding (`ssh -R`). Since OpenSSH is preinstalled on macOS, Linux, and Windows 10/11, you only need to run a single command in your terminal: `ssh -R 80:localhost:3000 -p 2222 tunl.online`. Your local server is immediately accessible via a secure HTTPS URL.",
  },
  {
    question: "How does tunl compare to ngrok and Cloudflare Tunnel?",
    answer:
      "Unlike ngrok or Cloudflare Tunnel (cloudflared), tunl requires no custom binary downloads, no background agents, and no account signup for ephemeral tunnels. It uses cryptographic OpenSSH public keys (Ed25519/RSA) instead of proprietary authentication tokens or configuration files.",
  },
  {
    question: "Is tunl free to use?",
    answer:
      "Yes, tunl is 100% free for basic tunneling. You can start anonymous ephemeral tunnels instantly with no credit card or account. Registering an SSH key allows you to claim persistent custom subdomains at no cost during developer preview.",
  },
  {
    question: "Can I reserve a persistent custom subdomain on tunl.online?",
    answer:
      "Yes! Simply sign in and add your OpenSSH public key. Once registered, you can reserve a dedicated subdomain (e.g. `yourname.tunl.online`) that is permanently linked to your key fingerprint.",
  },
  {
    question: "Does tunl support WebSockets, Next.js HMR, and webhook callbacks?",
    answer:
      "Yes. tunl provides full HTTP/1.1 protocol upgrade support for WebSockets, Server-Sent Events (SSE), and Hot Module Replacement in frameworks like Next.js and Vite. It also receives webhook callbacks from Stripe, GitHub, Shopify, and Slack with zero latency.",
  },
  {
    question: "Is SSH reverse tunneling through tunl secure?",
    answer:
      "Yes. All traffic between your machine and tunl is encrypted using standard OpenSSH cryptographic protocols (Ed25519/RSA). Public traffic is encrypted with automatic TLS/HTTPS certificates. Furthermore, port forwarding is strictly scoped to your chosen local TCP port without granting filesystem or network access.",
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-14 md:py-20 border-border/40 border-t">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <div className="mb-10 max-w-xl">
          <span className="text-muted-foreground mb-2 block font-mono text-[11px] font-medium tracking-wider uppercase">
            Frequently Asked Questions
          </span>
          <h2 className="text-foreground mb-3 text-xl font-bold tracking-tight sm:text-2xl">
            Everything You Need to Know About tunl
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Common questions about zero-install SSH reverse tunneling, security, and custom subdomains on <strong className="text-foreground font-semibold">tunl.online</strong>.
          </p>
        </div>

        <div className="divide-border/60 border-border/60 divide-y rounded-lg border bg-card">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.question} className="transition-colors">
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-muted/20"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <h3 className="text-foreground text-sm font-semibold sm:text-base">
                    {item.question}
                  </h3>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-foreground" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div
                    id={`faq-answer-${index}`}
                    className="px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
