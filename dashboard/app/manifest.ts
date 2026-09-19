import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "tunl — Free OpenSSH Reverse Tunneling Platform",
    short_name: "tunl",
    description:
      "Expose localhost web servers, APIs, and webhooks to the public internet via standard OpenSSH. No CLI binary downloads required.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/tunl.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
