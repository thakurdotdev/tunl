export interface FaqItem {
  question: string;
  answer: string;
}

/** Shared FAQ copy for the landing page UI and FAQPage JSON-LD. */
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is tunl?",
    answer:
      "tunl is a zero-install reverse tunneling platform powered by standard OpenSSH. It exposes local development servers, APIs, WebSockets and webhooks to the public internet over HTTPS, with no proprietary CLI binary or background daemon.",
  },
  {
    question: "How do I create a tunnel without installing anything?",
    answer:
      "Run `ssh -R 80:localhost:3000 -p 2222 tunl.online` in your terminal, changing 3000 to your local port. You get an HTTPS endpoint straight away, and no signup is needed.",
  },
  {
    question: "What if my network blocks port 2222?",
    answer:
      "tunl connects outbound over TCP port 2222. If the command hangs or times out, your network or firewall may be blocking that port. Try another network, or ask your network admin to allow outbound connections to tunl.online on port 2222.",
  },
  {
    question: "How do I keep a tunnel alive?",
    answer:
      "A tunnel is a standard SSH session, so it ends when the connection drops. Add `-o ServerAliveInterval=30` so OpenSSH sends keepalives, or wrap the command in a loop or a tool such as autossh to reconnect automatically.",
  },
  {
    question: "How does tunl compare to ngrok and Cloudflare Tunnel?",
    answer:
      "tunl needs no account for a basic tunnel and nothing to set up: no agent, no auth token, no key upload. ngrok also has an SSH mode, but it needs an account and a registered public key. Cloudflare's Quick Tunnels need no account but do need cloudflared installed. The comparison table above has the details, including features tunl does not have yet.",
  },
  {
    question: "Is tunl free to use?",
    answer:
      "Yes. The Ephemeral tier is free forever, and the Reserved tier is $0 during developer preview.",
  },
  {
    question: "Can I reserve a persistent subdomain?",
    answer:
      "Yes. Register an SSH key and claim a fixed name such as `name.tunl.online`, linked to that key.",
  },
  {
    question: "Does it support WebSockets, Next.js HMR and webhooks?",
    answer:
      "Yes. tunl supports full HTTP/1.1 upgrades for WebSockets, Server-Sent Events and hot module replacement, and it receives webhook callbacks from services like Stripe, GitHub and Shopify.",
  },
  {
    question: "Is it secure?",
    answer:
      "Authentication uses Ed25519 or RSA public keys over an encrypted SSH transport. Forwarding is scoped to the single local port you choose, and you can allowlist IP ranges and revoke keys from the dashboard.",
  },
];
