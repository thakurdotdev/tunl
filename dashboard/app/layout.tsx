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
    default: "tunl — Zero-Install OpenSSH Reverse Tunneling Platform",
    template: "%s | tunl",
  },
  description:
    "Expose localhost web servers, APIs, WebSockets, and webhooks to the public internet via standard OpenSSH. No CLI binary downloads required.",
  keywords: [
    "ssh tunnel",
    "localhost https",
    "ngrok alternative",
    "openSSH reverse proxy",
    "webhook testing",
    "dev tunnels",
    "custom subdomains",
    "localtunnel alternative",
    "secure HTTP tunnel",
  ],
  authors: [{ name: "tunl team" }],
  creator: "tunl",
  publisher: "tunl",
  robots: {
    index: true,
    follow: true,
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
    siteName: "tunl",
    title: "tunl — Zero-Install OpenSSH Reverse Tunneling Platform",
    description:
      "Expose localhost web servers, APIs, WebSockets, and webhooks to the public internet via standard OpenSSH.",
  },
  twitter: {
    card: "summary_large_image",
    title: "tunl — Zero-Install OpenSSH Reverse Tunneling Platform",
    description:
      "Expose localhost web servers, APIs, WebSockets, and webhooks to the public internet via standard OpenSSH.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "tunl",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "macOS, Linux, Windows",
  description:
    "Zero-install reverse tunneling platform powered by standard OpenSSH. Expose local servers to the internet instantly.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
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
          src="https://cloud.umami.is/script.js"
          data-website-id="3221f3d8-5f0d-4fa5-a872-b50183e30ef2"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          {children}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
