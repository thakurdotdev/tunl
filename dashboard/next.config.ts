import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Fully static build in `out/`, served by nginx. There is no Node server in
  // production, so redirects/headers/rewrites live in the nginx config.
  output: "export",
  images: { unoptimized: true },
  allowedDevOrigins: ["*.tunl.online"],
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
};

export default nextConfig;
