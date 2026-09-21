import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withErrorHandler } from "@/lib/session";

export const runtime = "nodejs";

/* ============================================================
   /api/sitemap.xml  (GET - public, no auth)

   Generates a dynamic XML sitemap covering:
     - Homepage (/)
     - All public hash routes (/, #/catalog, #/batches, etc.)
     - All published courses (/#/course/<slug>)
     - All published blog posts (/#/blog/<slug>)
     - All published events (/#/event/<slug>)
     - All published certifications (/#/cert/<slug>)

   The platform is a hash-routed SPA on a single `/` Next.js
   route, so the sitemap uses fragment URLs (#/...). Search
   engines that follow hash-fragment URLs (Google does for
   crawlable hashbang patterns) get a complete URL set; the
   static `/sitemap.ts` (Next.js MetadataRoute.Sitemap) handles
   the no-fragment version for crawlers that don't follow
   fragments.

   Set Content-Type: text/xml.
   ============================================================ */

const BASE_URL = "https://academy.guardianx.cloud";

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
}

const STATIC_HASH_ROUTES: Array<{
  hash: string;
  changefreq: SitemapEntry["changefreq"];
  priority: number;
}> = [
  { hash: "", changefreq: "daily", priority: 1.0 }, // Homepage
  { hash: "#/catalog", changefreq: "weekly", priority: 0.9 },
  { hash: "#/batches", changefreq: "weekly", priority: 0.9 },
  { hash: "#/instructors", changefreq: "monthly", priority: 0.8 },
  { hash: "#/events", changefreq: "weekly", priority: 0.8 },
  { hash: "#/learning-paths", changefreq: "monthly", priority: 0.8 },
  { hash: "#/cyber-range", changefreq: "monthly", priority: 0.8 },
  { hash: "#/skill-tree", changefreq: "monthly", priority: 0.7 },
  { hash: "#/exams", changefreq: "monthly", priority: 0.7 },
  { hash: "#/credentials", changefreq: "monthly", priority: 0.6 },
  { hash: "#/blog", changefreq: "weekly", priority: 0.8 },
  { hash: "#/pricing", changefreq: "monthly", priority: 0.7 },
  { hash: "#/impact", changefreq: "monthly", priority: 0.6 },
  { hash: "#/contact", changefreq: "yearly", priority: 0.5 },
  { hash: "#/support", changefreq: "monthly", priority: 0.5 },
  { hash: "#/verify", changefreq: "yearly", priority: 0.5 },
  { hash: "#/institutions-schools", changefreq: "monthly", priority: 0.7 },
  { hash: "#/institutions-colleges", changefreq: "monthly", priority: 0.7 },
  { hash: "#/institutions-universities", changefreq: "monthly", priority: 0.7 },
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

  // 1. Static hash routes
  for (const r of STATIC_HASH_ROUTES) {
    entries.push({
      loc: r.hash ? `${BASE_URL}/${r.hash}` : `${BASE_URL}/`,
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
      loc: `${BASE_URL}/#/course/${encodeURIComponent(c.slug)}`,
      lastmod: isoDate(c.updatedAt),
      changefreq: "weekly",
      priority: 0.9,
    });
  }
  for (const b of blogPosts) {
    entries.push({
      loc: `${BASE_URL}/#/blog/${encodeURIComponent(b.slug)}`,
      lastmod: isoDate(b.updatedAt),
      changefreq: "monthly",
      priority: 0.7,
    });
  }
  for (const e of events) {
    entries.push({
      loc: `${BASE_URL}/#/event/${encodeURIComponent(e.slug)}`,
      lastmod: isoDate(e.updatedAt),
      changefreq: "weekly",
      priority: 0.7,
    });
  }
  for (const cert of certifications) {
    entries.push({
      loc: `${BASE_URL}/#/cert/${encodeURIComponent(cert.slug)}`,
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
