import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.tunl.online"],
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
};

export default nextConfig;
