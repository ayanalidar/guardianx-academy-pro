import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandler } from "@/lib/session";

export const runtime = "nodejs";

/* ============================================================
   /api/robots.txt  (GET - public, no auth)

   Returns the robots.txt content. If the admin has saved a
   custom robots.txt in SiteContent (page="seo", section="robots",
   key="content"), use that. Otherwise return a sensible default
   that allows all crawlers and points them at the sitemap.

   Set Content-Type: text/plain.
   ============================================================ */

const BASE_URL = "https://academy.guardianx.cloud";

const DEFAULT_ROBOTS = `# robots.txt - GuardianX Academy
# Default policy: allow all crawlers, point at the sitemap.

User-agent: *
Allow: /
Disallow: /api/auth/
Disallow: /api/me
Disallow: /api/parent
Disallow: /api/school/
Disallow: /api/instructor/
Disallow: /api/admin/
Disallow: /api/affiliate/me
Disallow: /api/affiliate/join
Disallow: /api/affiliate/track
Disallow: /api/messages/
Disallow: /api/notes/

# Sitemap
Sitemap: ${BASE_URL}/api/sitemap.xml
`;

export const GET = withErrorHandler(async () => {
  // Try to read a custom robots.txt from SiteContent
  let content: string | null = null;
  try {
    const row = await db.siteContent.findUnique({
      where: {
        page_section_key: {
          page: "seo",
          section: "robots",
          key: "content",
        },
      },
    });
    if (row && typeof row.value === "string") {
      content = row.value;
    } else if (row && row.value != null) {
      try {
        content = JSON.stringify(row.value);
      } catch {
        content = String(row.value);
      }
    }
  } catch {
    // fall through to default
  }

  const body = content ?? DEFAULT_ROBOTS;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});
