import { FAQ_ITEMS } from "@/components/landing/faq-data";

export const SITE_URL = "https://tunl.online";
export const SITE_NAME = "tunl";
export const SSH_COMMAND = "ssh -R 80:localhost:3000 -p 2222 tunl.online";

export const SEO_TITLE =
  "tunl — Make localhost public with one SSH command | Free OpenSSH Reverse Tunnel";

export const SEO_DESCRIPTION =
  "tunl is a zero-install OpenSSH reverse tunnel. Expose localhost web servers, APIs, WebSockets, and webhooks with one ssh command — no CLI download, no account required for basic tunnels. Free ngrok alternative on tunl.online.";

export const SEO_KEYWORDS = [
  "tunl",
  "tunl online",
  "tunl.online",
  "ssh tunl",
  "ssh tunnel",
  "ssh reverse tunnel",
  "ssh reverse proxy",
  "openssh tunnel",
  "openssh reverse tunnel",
  "expose localhost online",
  "expose localhost to internet",
  "make localhost public",
  "public url for localhost",
  "localhost https tunnel",
  "localhost to https",
  "free ssh tunnel",
  "free reverse tunnel",
  "free ngrok alternative",
  "ngrok alternative",
  "ngrok alternative openssh",
  "cloudflare tunnel alternative",
  "cloudflared alternative",
  "localtunnel alternative",
  "bore alternative",
  "serveo alternative",
  "localhost.run alternative",
  "dev tunnel",
  "developer tunnel",
  "webhook testing",
  "stripe webhook localhost",
  "github webhook localhost",
  "shopify webhook localhost",
  "oauth redirect localhost",
  "websocket tunnel",
  "sse tunnel",
  "next.js tunnel",
  "vite hmr tunnel",
  "share localhost",
  "demo localhost",
  "mobile test localhost",
  "persistent subdomain",
  "custom subdomain tunnel",
  "ssh -R",
  "remote port forwarding",
  "zero install tunnel",
  "no install reverse proxy",
];

export function buildJsonLdGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: [
          "tunl online",
          "tunl.online",
          "ssh tunl",
          "tunl reverse tunnel",
          "tunl SSH tunnel",
        ],
        description: SEO_DESCRIPTION,
        inLanguage: "en-US",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/tunl.svg`,
        },
        sameAs: [
          "https://github.com/thakurdotdev",
          "https://x.com/thakurdotdev",
          "https://thakur.dev",
        ],
        founder: {
          "@type": "Person",
          name: "Pankaj Thakur",
          url: "https://thakur.dev",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#application`,
        name: "tunl",
        alternateName: ["tunl online", "tunl.online"],
        applicationCategory: "DeveloperApplication",
        applicationSubCategory: "Reverse Tunnel / Localhost Sharing",
        operatingSystem: "macOS, Linux, Windows 10, Windows 11, BSD",
        url: SITE_URL,
        downloadUrl: SITE_URL,
        installUrl: SITE_URL,
        softwareVersion: "1.0",
        description: SEO_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          description:
            "Ephemeral tunnels are free forever. Reserved subdomains are free during developer preview.",
        },
        featureList: [
          "Zero-install OpenSSH reverse tunneling",
          "Instant public HTTPS URLs with automatic TLS",
          "WebSocket and Server-Sent Events (SSE) upgrades",
          "Persistent subdomains tied to SSH keys",
          "Real-time HTTP request inspection",
          "No account required for basic tunnels",
          "Ed25519 and RSA public key authentication",
          "IP allowlisting and key revocation",
        ],
        keywords: SEO_KEYWORDS.join(", "),
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: SEO_TITLE,
        description: SEO_DESCRIPTION,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#application` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${SITE_URL}/opengraph-image`,
        },
        inLanguage: "en-US",
      },
      {
        "@type": "HowTo",
        "@id": `${SITE_URL}/#howto`,
        name: "How to make localhost public with one SSH command using tunl",
        description:
          "Expose a local development server to a public HTTPS URL using standard OpenSSH on tunl.online — no binary to install.",
        totalTime: "PT1M",
        tool: [
          {
            "@type": "HowToTool",
            name: "OpenSSH client (preinstalled on macOS, Linux, and Windows 10/11)",
          },
        ],
        step: [
          {
            "@type": "HowToStep",
            position: 1,
            name: "Start your local server",
            text: "Run your web server or API locally on any TCP port (for example localhost:3000).",
          },
          {
            "@type": "HowToStep",
            position: 2,
            name: "Run the tunl SSH command",
            text: `Open your terminal and run: ${SSH_COMMAND}`,
          },
          {
            "@type": "HowToStep",
            position: 3,
            name: "Use your public HTTPS URL",
            text: "Copy the public HTTPS endpoint (for example https://my-app.tunl.online) for webhooks, teammates, or mobile testing.",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer.replace(/`/g, ""),
          },
        })),
      },
    ],
  };
}
