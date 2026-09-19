import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/keys",
          "/keys/*",
          "/inspect",
          "/inspect/*",
          "/profile",
          "/profile/*",
          "/admin",
          "/admin/*",
          "/api/*",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/keys",
          "/keys/*",
          "/inspect",
          "/inspect/*",
          "/profile",
          "/profile/*",
          "/admin",
          "/admin/*",
          "/api/*",
        ],
      },
    ],
    sitemap: "https://tunl.online/sitemap.xml",
    host: "https://tunl.online",
  };
}
