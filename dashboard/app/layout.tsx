import type { Metadata } from "next";
import Script from "next/script";
import { Geist, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tunl.online"),
  title: {
    default: "tunl — Free SSH Reverse Tunnel | Expose Localhost Online (tunl.online)",
    template: "%s | tunl.online",
  },
  description:
    "tunl (tunl.online) is a zero-install OpenSSH reverse tunneling platform. Expose localhost web servers, APIs, WebSockets, and webhooks to the public internet using a single SSH command.",
  keywords: [
    "tunl",
    "tunl online",
    "ssh tunl",
    "ssh tunnel",
    "ssh reverse tunnel",
    "expose localhost online",
    "ngrok alternative openssh",
    "free ssh reverse proxy",
    "localhost https tunnel",
    "webhook testing",
    "dev tunnel",
    "custom subdomains",
    "localtunnel alternative",
    "bore alternative",
    "cloudflare tunnel alternative",
  ],
  alternates: {
    canonical: "/",
  },
  authors: [
    { name: "tunl team", url: "https://tunl.online" },
    { name: "Pankaj Thakur", url: "https://thakur.dev" },
  ],
  creator: "tunl",
  publisher: "tunl",
  category: "Developer Tools",
  applicationName: "tunl",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tunl.online",
    siteName: "tunl.online",
    title: "tunl — Free SSH Reverse Tunnel | Expose Localhost Online",
    description:
      "Zero-install OpenSSH reverse tunneling. Expose localhost to the internet instantly with one command: ssh -R 80:localhost:3000 -p 2222 tunl.online",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "tunl — Free SSH Reverse Tunnel Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "tunl — Free SSH Reverse Tunnel | Expose Localhost Online (tunl.online)",
    description:
      "Expose localhost web servers, APIs, and webhooks to the public internet via native OpenSSH. No CLI download required.",
    creator: "@thakurdotdev",
    site: "@thakurdotdev",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/tunl.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/tunl.svg" }],
  },
};

const jsonLdGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://tunl.online/#website",
      url: "https://tunl.online",
      name: "tunl",
      alternateName: ["tunl online", "tunl.online", "ssh tunl", "tunl reverse tunnel"],
      description:
        "Zero-install OpenSSH reverse tunneling platform to expose localhost to the public internet.",
      inLanguage: "en-US",
      publisher: {
        "@id": "https://tunl.online/#organization",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://tunl.online/#organization",
      name: "tunl",
      url: "https://tunl.online",
      logo: "https://tunl.online/tunl.svg",
      sameAs: [
        "https://github.com/thakurdotdev",
        "https://x.com/thakurdotdev",
        "https://thakur.dev",
      ],
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://tunl.online/#application",
      name: "tunl",
      alternateName: "tunl online",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "macOS, Linux, Windows, BSD",
      url: "https://tunl.online",
      description:
        "Zero-install OpenSSH reverse tunneling platform. Expose localhost web servers, APIs, WebSockets, and webhooks to the public internet via standard OpenSSH.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "Zero-install OpenSSH reverse tunneling",
        "Instant public HTTPS URLs with SSL certificates",
        "WebSocket and Server-Sent Events (SSE) support",
        "Persistent custom subdomains with Ed25519 SSH keys",
        "Real-time HTTP request inspection and telemetry",
      ],
    },
    {
      "@type": "HowTo",
      "@id": "https://tunl.online/#howto",
      name: "How to Expose Localhost to the Internet using SSH with tunl",
      description:
        "A quick 3-step guide to tunneling localhost to a public HTTPS URL using standard OpenSSH on tunl.online.",
      step: [
        {
          "@type": "HowToStep",
          name: "Start your local server",
          text: "Run your web server or API locally on any TCP port (e.g., localhost:3000).",
        },
        {
          "@type": "HowToStep",
          name: "Run the tunl SSH command",
          text: "Open your terminal and execute: ssh -R 80:localhost:3000 -p 2222 tunl.online",
        },
        {
          "@type": "HowToStep",
          name: "Access your public HTTPS URL",
          text: "Receive an instant live HTTPS endpoint (e.g., https://xyz.tunl.online) with automatic SSL certificates.",
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": "https://tunl.online/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is tunl online?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "tunl (tunl.online) is a zero-install reverse tunneling platform powered by standard OpenSSH. It allows developers to expose local development servers, APIs, WebSockets, and webhooks to the public internet over secure HTTPS without installing any proprietary CLI agent or daemon.",
          },
        },
        {
          "@type": "Question",
          name: "How does tunl create an SSH tunnel without installing any CLI?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "tunl uses native OpenSSH remote port forwarding (ssh -R). Since OpenSSH is preinstalled on macOS, Linux, and Windows 10/11, you can simply run 'ssh -R 80:localhost:3000 -p 2222 tunl.online' directly in your command line.",
          },
        },
        {
          "@type": "Question",
          name: "How does tunl compare to ngrok and Cloudflare Tunnel?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Unlike ngrok or Cloudflare Tunnel (cloudflared), tunl requires zero CLI downloads, zero background daemons, and zero account registration for ephemeral tunnels. It uses standard OpenSSH cryptographic keys instead of proprietary authentication tokens.",
          },
        },
        {
          "@type": "Question",
          name: "Is tunl free to use?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, tunl is free to use. You can start anonymous ephemeral tunnels immediately with no credit card or account. Registering an SSH key allows you to claim persistent custom subdomains at no cost during developer preview.",
          },
        },
        {
          "@type": "Question",
          name: "Can I reserve a custom persistent subdomain on tunl.online?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! Log in and register your OpenSSH public key (Ed25519 or RSA). Once registered, your custom subdomain (e.g., my-app.tunl.online) is tied to your key fingerprint and reserved exclusively for you.",
          },
        },
        {
          "@type": "Question",
          name: "Does tunl support WebSockets, Next.js HMR, and webhook callbacks?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, tunl fully supports HTTP/1.1 protocol upgrades including WebSockets, Server-Sent Events (SSE), and Vite/Next.js Hot Module Replacement, as well as webhook payloads from Stripe, GitHub, Shopify, and Slack.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased", geistSans.variable, jetbrainsMono.variable)}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        <Script
          defer
          src="https://analytics.thakur.dev/script.js"
          data-website-id="dc588219-d595-493d-a02a-95b632d82fdd"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }}
        />
        <Providers>
          {children}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
