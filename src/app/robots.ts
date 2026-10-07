import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/auth/",
          "/api/me",
          "/api/parent",
          "/api/school/",
          "/api/instructor/",
          "/api/admin/",
          "/api/affiliate/me",
          "/api/affiliate/join",
          "/api/affiliate/track",
          "/api/messages/",
          "/api/payment/",
          "/api/coupons/verify",
          // Security honeypots: keep honest crawlers away (attackers ignore
          // robots.txt - that is exactly who these are instrumented for).
          "/api/backup",
          "/api/debug",
          "/api/db-init",
          "/api/v1/",
        ],
      },
    ],
    sitemap: "https://academy.guardianx.cloud/sitemap.xml",
    host: "https://academy.guardianx.cloud",
  }
}
