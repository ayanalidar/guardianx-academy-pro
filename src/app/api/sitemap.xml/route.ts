import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandler } from "@/lib/session";

export const runtime = "nodejs";

/* ============================================================
   /api/sitemap.xml  (GET - public, no auth)

   Generates a dynamic XML sitemap covering:
     - Homepage (/)
     - All public path routes (/courses, /batches, /placements, etc.)
     - All published courses (/courses/<slug>)
     - All published blog posts (/blog/<slug>)
     - All published events (/events/<slug>)
     - All published certifications (/cert/<slug>)

   The platform is a path-routed SPA: every public view has a real,
   crawlable URL (hash URLs like /#/catalog are legacy and are
   rewritten to clean paths on first load). Sitemaps must never use
   fragment URLs - crawlers ignore fragments - so all entries are
   real paths, mirroring the static /sitemap.xml.

   Set Content-Type: text/xml.
   ============================================================ */

const BASE_URL = "https://academy.guardianx.cloud";

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
}

const STATIC_PATH_ROUTES: Array<{
  path: string;
  changefreq: SitemapEntry["changefreq"];
  priority: number;
}> = [
  { path: "", changefreq: "daily", priority: 1.0 }, // Homepage
  { path: "/courses", changefreq: "weekly", priority: 0.9 },
  { path: "/batches", changefreq: "weekly", priority: 0.9 },
  { path: "/instructors", changefreq: "monthly", priority: 0.8 },
  { path: "/events", changefreq: "weekly", priority: 0.8 },
  { path: "/learning-paths", changefreq: "monthly", priority: 0.8 },
  { path: "/cyber-range", changefreq: "monthly", priority: 0.8 },
  { path: "/skill-tree", changefreq: "monthly", priority: 0.7 },
  { path: "/exams", changefreq: "monthly", priority: 0.7 },
  { path: "/credentials", changefreq: "monthly", priority: 0.6 },
  { path: "/blog", changefreq: "weekly", priority: 0.8 },
  { path: "/pricing", changefreq: "monthly", priority: 0.7 },
  { path: "/hiring", changefreq: "weekly", priority: 0.8 },
  { path: "/placements", changefreq: "weekly", priority: 0.8 },
  { path: "/contact", changefreq: "yearly", priority: 0.5 },
  { path: "/support", changefreq: "monthly", priority: 0.5 },
  { path: "/verify", changefreq: "yearly", priority: 0.5 },
  { path: "/institutions/schools", changefreq: "monthly", priority: 0.7 },
  { path: "/institutions/colleges", changefreq: "monthly", priority: 0.7 },
  { path: "/institutions/universities", changefreq: "monthly", priority: 0.7 },
  { path: "/corporate-training", changefreq: "monthly", priority: 0.7 },
  { path: "/cyber-quiz", changefreq: "monthly", priority: 0.8 },
];

function isoDate(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString().split("T")[0];
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderEntry(e: SitemapEntry): string {
  const parts = [`  <url>`, `    <loc>${escapeXml(e.loc)}</loc>`];
  if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
  if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
  parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
  parts.push(`  </url>`);
  return parts.join("\n");
}

export const GET = withErrorHandler(async () => {
  const entries: SitemapEntry[] = [];

  // 1. Static path routes
  for (const r of STATIC_PATH_ROUTES) {
    entries.push({
      loc: r.path ? `${BASE_URL}${r.path}` : `${BASE_URL}/`,
      changefreq: r.changefreq,
      priority: r.priority,
      lastmod: isoDate(new Date()),
    });
  }

  // 2. Dynamic content - wrapped in try/catch so the sitemap still works
  //    even if the DB has issues. Static routes are always included.
  let courses: any[] = []
  let blogPosts: any[] = []
  let events: any[] = []
  let certifications: any[] = []
  try {
    [courses, blogPosts, events, certifications] = await Promise.all([
      db.course.findMany({
        where: { published: true },
        select: { slug: true, title: true, updatedAt: true },
      }).catch(() => []),
      db.blogPost.findMany({
        where: { published: true },
        select: { slug: true, title: true, updatedAt: true },
      }).catch(() => []),
      db.event.findMany({
        where: { published: true },
        select: { slug: true, title: true, updatedAt: true },
      }).catch(() => []),
      db.guardianCertification.findMany({
        where: { published: true },
        select: { slug: true, name: true, updatedAt: true },
      }).catch(() => []),
    ])
  } catch (e) {
    // DB failed - still return the static routes
    console.error("[sitemap] DB query failed, returning static routes only")
  }

  // 3. Append dynamic entries
  for (const c of courses) {
    entries.push({
      loc: `${BASE_URL}/courses/${encodeURIComponent(c.slug)}`,
      lastmod: isoDate(c.updatedAt),
      changefreq: "weekly",
      priority: 0.9,
    });
  }
  for (const b of blogPosts) {
    entries.push({
      loc: `${BASE_URL}/blog/${encodeURIComponent(b.slug)}`,
      lastmod: isoDate(b.updatedAt),
      changefreq: "monthly",
      priority: 0.7,
    });
  }
  for (const e of events) {
    entries.push({
      loc: `${BASE_URL}/events/${encodeURIComponent(e.slug)}`,
      lastmod: isoDate(e.updatedAt),
      changefreq: "weekly",
      priority: 0.7,
    });
  }
  for (const cert of certifications) {
    entries.push({
      loc: `${BASE_URL}/cert/${encodeURIComponent(cert.slug)}`,
      lastmod: isoDate(cert.updatedAt),
      changefreq: "monthly",
      priority: 0.8,
    });
  }

  // 4. Render XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(renderEntry).join("\n")}
</urlset>
`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});
