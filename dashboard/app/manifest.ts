import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "tunl — Make localhost public with one SSH command",
    short_name: "tunl",
    description:
      "Zero-install OpenSSH reverse tunnel. Expose localhost web servers, APIs, WebSockets, and webhooks with one ssh command. Free ngrok alternative.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0c0b",
    theme_color: "#2fd272",
    categories: ["developer", "utilities", "productivity"],
    icons: [
      {
        src: "/tunl.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
