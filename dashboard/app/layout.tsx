import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { cn } from "@/lib/utils";
import {
  SEO_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_TITLE,
  SITE_NAME,
  SITE_URL,
  buildJsonLdGraph,
} from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c0b" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SEO_TITLE,
    template: "%s | tunl.online",
  },
  description: SEO_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  alternates: {
    canonical: "/",
  },
  authors: [
    { name: "tunl", url: SITE_URL },
    { name: "Pankaj Thakur", url: "https://thakur.dev" },
  ],
  creator: "Pankaj Thakur",
  publisher: SITE_NAME,
  category: "Developer Tools",
  applicationName: SITE_NAME,
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
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
    url: SITE_URL,
    siteName: "tunl.online",
    title: "tunl — Make localhost public with one SSH command",
    description: SEO_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "tunl — Free OpenSSH reverse tunnel to expose localhost online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "tunl — Make localhost public with one SSH command",
    description:
      "Zero-install OpenSSH reverse tunnel. Expose localhost, APIs, WebSockets, and webhooks with one ssh command. Free ngrok alternative.",
    creator: "@thakurdotdev",
    site: "@thakurdotdev",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/tunl.svg", type: "image/svg+xml" }],
    apple: [{ url: "/tunl.svg" }],
  },
  other: {
    "color-scheme": "light dark",
  },
};

const jsonLdGraph = buildJsonLdGraph();

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
