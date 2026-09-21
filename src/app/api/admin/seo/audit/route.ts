import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, withErrorHandler } from "@/lib/session";

export const runtime = "nodejs";

/* ============================================================
   /api/admin/seo/audit  (GET - ADMIN only)

   Runs a server-side audit of every public page that the
   GuardianX SPA can render (per PUBLIC_VIEWS in src/app/page.tsx)
   plus every dynamic instance (each published Course, BlogPost,
   Event, GuardianCertification) since those all have their own
   URL via the hash router.

   Because the platform is a SPA with hash routing, we can't fetch
   server-rendered HTML for each "page". Instead we:

     1. Pull SEO overrides from SiteContent
        (page="seo", section=<pageKey>, key in
        ["title","description","ogImage","keywords"]).
     2. Pull the actual CMS content for each static page
        (page=<pageKey>) to estimate word count + H1/H2 counts.
     3. Pull the canonical DB row (Course / BlogPost / Event /
        GuardianCertification) for each dynamic page so we know
        its real title/description/OG image.
     4. Run a checklist of SEO rules per page and compute a
        0-100 score (per page + rolled-up overall).

   Response shape (matches the task spec):
     {
       pages: [{ name, url, title, titleLength, description,
                 descriptionLength, hasOGImage, hasCanonical,
                 h1Count, h2Count, wordCount, issues, score }],
       score, totalPages, totalIssues
     }
   ============================================================ */

/* -------- per-page SEO defaults --------
 * Used only when there's no SiteContent override and no DB row.
 * The defaults match the homepage layout.tsx metadata and the
 * known structure of each public view.
 */
interface PublicPageDef {
  name: string;
  pageKey: string;
  url: string;
  defaultTitle: string;
  defaultDescription: string;
  /** Approximate word count we expect if CMS is empty
   *  (used only as a sanity floor). */
  minWords?: number;
}

const STATIC_PAGES: PublicPageDef[] = [
  {
    name: "Homepage",
    pageKey: "home",
    url: "/",
    defaultTitle: "GuardianX Academy - Cyber Security Training Operating System",
    defaultDescription:
      "Master cybersecurity by actually breaking things. Real cyber range, hands-on labs, certification tracks, CTF arena, and career paths. Learn. Break. Defend. Prove.",
    minWords: 600,
  },
  {
    name: "Impact",
    pageKey: "impact",
    url: "/#/impact",
    defaultTitle: "Our Impact - GuardianX Academy",
    defaultDescription:
      "Every number tells a story - learners who leveled up their careers, institutions that transformed their curriculum, and a community quietly making the digital world safer.",
    minWords: 300,
  },
  {
    name: "Contact",
    pageKey: "contact",
    url: "/#/contact",
    defaultTitle: "Contact GuardianX Academy",
    defaultDescription:
      "Have questions about courses, partnerships, or anything else? Our team responds fast - reach out and we'll get back to you within 24 hours.",
    minWords: 200,
  },
  {
    name: "Institutions - Schools",
    pageKey: "institutions-schools",
    url: "/#/institutions-schools",
    defaultTitle: "Cyber Security Training for Schools - GuardianX Academy",
    defaultDescription:
      "On-premises cyber security training for secondary schools. Dedicated login portal, age-appropriate curriculum, shared cyber range, and joint certifications.",
    minWords: 300,
  },
  {
    name: "Institutions - Colleges",
    pageKey: "institutions-colleges",
    url: "/#/institutions-colleges",
    defaultTitle: "Cyber Security Training for Colleges - GuardianX Academy",
    defaultDescription:
      "On-premises cyber security training for colleges and professional institutes. Dedicated login portal, lab access, and industry-recognized certifications.",
    minWords: 300,
  },
  {
    name: "Institutions - Universities",
    pageKey: "institutions-universities",
    url: "/#/institutions-universities",
    defaultTitle: "Cyber Security Training for Universities - GuardianX Academy",
    defaultDescription:
      "On-premises cyber security training for research universities. Dedicated cyber range, joint certifications, research-grade labs, and curriculum alignment.",
    minWords: 300,
  },
  {
    name: "Course Catalog",
    pageKey: "catalog",
    url: "/#/catalog",
    defaultTitle: "Course Catalog - GuardianX Academy",
    defaultDescription:
      "Browse 27+ certification tracks across ethical hacking, networking, web security, system administration, IAM, and cloud security - from beginner to advanced.",
    minWords: 250,
  },
  {
    name: "Training Batches",
    pageKey: "batches",
    url: "/#/batches",
    defaultTitle: "Upcoming Training Batches - GuardianX Academy",
    defaultDescription:
      "Find upcoming live training batches for CEH, CCNA, RHCSA, CISSP, and more - with dates, instructors, mode, and availability.",
    minWords: 200,
  },
  {
    name: "Cyber Range",
    pageKey: "cyber-range",
    url: "/#/cyber-range",
    defaultTitle: "Cyber Range - Live Attack & Defend - GuardianX Academy",
    defaultDescription:
      "Train against real targets in a live cyber range. Docker-powered vulnerable systems you can attack, exploit, and defend. 31+ scenarios.",
    minWords: 250,
  },
  {
    name: "Learning Paths",
    pageKey: "learning-paths",
    url: "/#/learning-paths",
    defaultTitle: "Learning Paths - GuardianX Academy",
    defaultDescription:
      "Guided multi-course learning paths that take you from beginner to job-ready. Each path includes hands-on labs, projects, and certifications.",
    minWords: 200,
  },
  {
    name: "Skill Tree",
    pageKey: "skill-tree",
    url: "/#/skill-tree",
    defaultTitle: "Skill Tree - GuardianX Academy",
    defaultDescription:
      "Visualize your cyber security skill tree. Unlock nodes by completing courses, labs, and certifications - and track progress to mastery.",
    minWords: 150,
  },
  {
    name: "Proctored Exams",
    pageKey: "exams",
    url: "/#/exams",
    defaultTitle: "Proctored Exams - GuardianX Academy",
    defaultDescription:
      "Schedule and take proctored certification exams. Identity-verified, browser-locked, and recorded for integrity. Verified digital certificates on pass.",
    minWords: 150,
  },
  {
    name: "Credentials",
    pageKey: "credentials",
    url: "/#/credentials",
    defaultTitle: "My Credentials - GuardianX Academy",
    defaultDescription:
      "View and verify your earned GuardianX credentials and industry certifications. Each credential is verifiable via a public URL.",
    minWords: 150,
  },
  {
    name: "Support",
    pageKey: "support",
    url: "/#/support",
    defaultTitle: "Support Center - GuardianX Academy",
    defaultDescription:
      "Help articles, FAQ, and contact options for GuardianX Academy. Get help with courses, payments, certificates, and platform issues.",
    minWords: 150,
  },
  {
    name: "Verify Credential",
    pageKey: "verify",
    url: "/#/verify",
    defaultTitle: "Verify a Credential - GuardianX Academy",
    defaultDescription:
      "Verify the authenticity of any GuardianX-issued credential. Enter the credential ID to confirm its validity, recipient, and issue date.",
    minWords: 100,
  },
  {
    name: "Instructors",
    pageKey: "instructors",
    url: "/#/instructors",
    defaultTitle: "Instructors - GuardianX Academy",
    defaultDescription:
      "Meet the GuardianX instructors - industry practitioners in ethical hacking, network security, IAM, and cloud defense with years of field experience.",
    minWords: 200,
  },
  {
    name: "Events & Webinars",
    pageKey: "events",
    url: "/#/events",
    defaultTitle: "Events & Webinars - GuardianX Academy",
    defaultDescription:
      "Upcoming cyber security workshops, webinars, CTFs, bootcamps, and awareness sessions. Register online - most events are free.",
    minWords: 200,
  },
  {
    name: "Blog",
    pageKey: "blog",
    url: "/#/blog",
    defaultTitle: "Blog - GuardianX Academy",
    defaultDescription:
      "Threat analysis, how-to guides, certification tips, and industry news from the GuardianX community of practitioners and instructors.",
    minWords: 200,
  },
  {
    name: "Pricing",
    pageKey: "pricing",
    url: "/#/pricing",
    defaultTitle: "Pricing - GuardianX Academy",
    defaultDescription:
      "Simple, transparent pricing for learners, teams, and institutions. Free to start - no credit card required. Pro and Enterprise plans available.",
    minWords: 200,
  },
];

/* -------- helpers -------- */

/** Recursively count words in a JSON-shaped SiteContent value
 *  (string | string[] | object | number | boolean). */
function countWords(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "string") {
    const t = value.trim();
    return t ? t.split(/\s+/).length : 0;
  }
  if (typeof value === "number" || typeof value === "boolean") return 1;
  if (Array.isArray(value)) {
    return value.reduce<number>((acc, v) => acc + countWords(v), 0);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (acc, v) => acc + countWords(v),
      0,
    );
  }
  return 0;
}

/** Estimate H1 + H2 counts from CMS items.
 *  Convention across the GuardianX views: each section has a
 *  `title` (rendered as an H2), the `hero` section's `title` +
 *  `titleAccent` are the H1. Some sections also have `subtitle` /
 *  `eyebrow` (not headings). */
function estimateHeadings(
  items: { section: string; key: string; value: unknown }[],
): { h1Count: number; h2Count: number } {
  let h1 = 0;
  let h2 = 0;
  for (const it of items) {
    if (it.key === "title" || it.key === "titleAccent") {
      if (typeof it.value === "string" && it.value.trim()) {
        if (it.section === "hero") h1 = 1;
        else h2 += 1;
      }
    }
  }
  if (h1 === 0) h1 = 1; // every public page has at least one H1 by design
  return { h1Count: h1, h2Count: h2 };
}

interface AuditPage {
  name: string;
  url: string;
  title: string;
  titleLength: number;
  description: string;
  descriptionLength: number;
  hasOGImage: boolean;
  hasCanonical: boolean;
  h1Count: number;
  h2Count: number;
  wordCount: number;
  issues: string[];
  score: number;
}

interface AuditResult {
  pages: AuditPage[];
  score: number;
  totalPages: number;
  totalIssues: number;
}

/** Compute a per-page score (0-100) based on the SEO checklist. */
function scorePage(p: {
  title: string;
  description: string;
  hasOGImage: boolean;
  hasCanonical: boolean;
  h1Count: number;
  wordCount: number;
  minWords?: number;
}): number {
  let points = 0;
  let max = 0;

  // Title: 25 points
  max += 25;
  if (p.title) {
    const len = p.title.length;
    if (len >= 30 && len <= 60) points += 25;
    else if (len > 0) points += 15; // exists but suboptimal length
  }

  // Description: 25 points
  max += 25;
  if (p.description) {
    const len = p.description.length;
    if (len >= 120 && len <= 160) points += 25;
    else if (len >= 80 && len < 200) points += 15; // close
    else if (len > 0) points += 8;
  }

  // OG image: 15 points
  max += 15;
  if (p.hasOGImage) points += 15;

  // Canonical: 10 points
  max += 10;
  if (p.hasCanonical) points += 10;

  // H1 count: 10 points (should be exactly 1)
  max += 10;
  if (p.h1Count === 1) points += 10;
  else if (p.h1Count >= 1) points += 5; // has at least one

  // Word count: 15 points
  max += 15;
  const floor = p.minWords ?? 300;
  if (p.wordCount >= floor) points += 15;
  else if (p.wordCount >= floor / 2) points += 8;
  else if (p.wordCount > 0) points += 3;

  // Normalize to 0-100
  return max === 0 ? 0 : Math.round((points / max) * 100);
}

/** Run the checklist for a single page → issues[] + score. */
function auditPage(params: {
  name: string;
  url: string;
  title: string;
  description: string;
  ogImage: string | null;
  canonical: boolean;
  h1Count: number;
  h2Count: number;
  wordCount: number;
  minWords?: number;
}): AuditPage {
  const issues: string[] = [];
  if (!params.title) issues.push("Missing title");
  else if (params.title.length < 30) issues.push("Title too short");
  else if (params.title.length > 60) issues.push("Title too long");

  if (!params.description) issues.push("Missing description");
  else if (params.description.length < 120) issues.push("Description too short");
  else if (params.description.length > 160) issues.push("Description too long");

  if (!params.ogImage) issues.push("Missing OG image");
  if (!params.canonical) issues.push("Missing canonical");
  if (params.h1Count === 0) issues.push("Missing H1");
  else if (params.h1Count > 1) issues.push("Multiple H1 tags");

  const floor = params.minWords ?? 300;
  if (params.wordCount < floor) issues.push(`Low word count (${params.wordCount})`);

  const score = scorePage({
    title: params.title,
    description: params.description,
    hasOGImage: !!params.ogImage,
    hasCanonical: params.canonical,
    h1Count: params.h1Count,
    wordCount: params.wordCount,
    minWords: params.minWords,
  });

  return {
    name: params.name,
    url: params.url,
    title: params.title || "",
    titleLength: params.title?.length ?? 0,
    description: params.description || "",
    descriptionLength: params.description?.length ?? 0,
    hasOGImage: !!params.ogImage,
    hasCanonical: params.canonical,
    h1Count: params.h1Count,
    h2Count: params.h2Count,
    wordCount: params.wordCount,
    issues,
    score,
  };
}

/** Read a string-shaped SiteContent value safely. */
function readStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/* -------- route -------- */
export const GET = withErrorHandler(async () => {
  const user = await requireAdmin();
  if (user instanceof NextResponse) return user;

  // ---- 1. Pull all SEO overrides at once (page="seo") ----
  const seoRows = await db.siteContent.findMany({
    where: { page: "seo" },
  });
  // Index by section+key → value (string-coerced)
  const seoIndex = new Map<string, string>();
  for (const row of seoRows) {
    seoIndex.set(`${row.section}.${row.key}`, readStr(row.value));
  }

  // ---- 2. Pull CMS content for each static page ----
  // We fetch in parallel - Neon handles concurrent reads fine.
  const staticCmsResults = await Promise.all(
    STATIC_PAGES.map((p) =>
      db.siteContent.findMany({ where: { page: p.pageKey } }).then((rows) => ({
        pageKey: p.pageKey,
        rows,
      })),
    ),
  );
  const cmsByPage = new Map<string, typeof staticCmsResults[number]["rows"]>();
  for (const r of staticCmsResults) cmsByPage.set(r.pageKey, r.rows);

  // ---- 3. Pull dynamic content (courses / blog / events / certs) ----
  const [courses, blogPosts, events, certifications] = await Promise.all([
    db.course.findMany({
      where: { published: true },
      select: {
        slug: true,
        title: true,
        shortName: true,
        description: true,
        longDescription: true,
        thumbnail: true,
      },
    }),
    db.blogPost.findMany({
      where: { published: true },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        thumbnail: true,
      },
    }),
    db.event.findMany({
      where: { published: true },
      select: {
        slug: true,
        title: true,
        description: true,
        longDescription: true,
        imageUrl: true,
      },
    }),
    db.guardianCertification.findMany({
      where: { published: true },
      select: {
        slug: true,
        name: true,
        description: true,
        level: true,
        domains: true,
        skills: true,
      },
    }),
  ]);

  // ---- 4. Build audit rows ----
  const pages: AuditPage[] = [];

  // Static pages
  for (const def of STATIC_PAGES) {
    const cms = cmsByPage.get(def.pageKey) ?? [];
    const wordCount = cms.reduce((acc, it) => acc + countWords(it.value), 0);
    const { h1Count, h2Count } = estimateHeadings(cms);

    // SEO overrides win; fall back to defaults
    const title = seoIndex.get(`${def.pageKey}.title`) || def.defaultTitle;
    const description =
      seoIndex.get(`${def.pageKey}.description`) || def.defaultDescription;
    const ogImage = seoIndex.get(`${def.pageKey}.ogImage`) || null;

    pages.push(
      auditPage({
        name: def.name,
        url: def.url,
        title,
        description,
        ogImage,
        canonical: true, // SPA always sets a canonical via layout.tsx + page-level canonicals
        h1Count,
        h2Count,
        wordCount,
        minWords: def.minWords,
      }),
    );
  }

  // Dynamic: Courses
  for (const c of courses) {
    const pageKey = `course-${c.slug}`;
    const wordCount =
      countWords(c.title) + countWords(c.shortName) +
      countWords(c.description) + countWords(c.longDescription);
    const title =
      seoIndex.get(`${pageKey}.title`) ||
      `${c.title} (${c.shortName}) - GuardianX Academy`;
    const description =
      seoIndex.get(`${pageKey}.description`) ||
      c.description ||
      (typeof c.longDescription === "string" ? c.longDescription.slice(0, 160) : "") ||
      "";
    const ogImage = seoIndex.get(`${pageKey}.ogImage`) || c.thumbnail;
    pages.push(
      auditPage({
        name: `Course: ${c.title}`,
        url: `/#/course/${c.slug}`,
        title,
        description,
        ogImage,
        canonical: true,
        h1Count: 1,
        h2Count: 8, // course-detail view has ~8 section H2s
        wordCount,
        minWords: 300,
      }),
    );
  }

  // Dynamic: Blog posts
  for (const b of blogPosts) {
    const pageKey = `blog-${b.slug}`;
    const wordCount =
      countWords(b.title) + countWords(b.excerpt) + countWords(b.content);
    const title =
      seoIndex.get(`${pageKey}.title`) || `${b.title} - GuardianX Academy Blog`;
    const description =
      seoIndex.get(`${pageKey}.description`) || b.excerpt || "";
    const ogImage = seoIndex.get(`${pageKey}.ogImage`) || b.thumbnail;
    pages.push(
      auditPage({
        name: `Blog: ${b.title}`,
        url: `/#/blog/${b.slug}`,
        title,
        description,
        ogImage,
        canonical: true,
        h1Count: 1,
        h2Count: 4,
        wordCount,
        minWords: 300,
      }),
    );
  }

  // Dynamic: Events
  for (const e of events) {
    const pageKey = `event-${e.slug}`;
    const wordCount =
      countWords(e.title) + countWords(e.description) +
      countWords(e.longDescription);
    const title =
      seoIndex.get(`${pageKey}.title`) || `${e.title} - GuardianX Academy`;
    const description =
      seoIndex.get(`${pageKey}.description`) || e.description || "";
    const ogImage = seoIndex.get(`${pageKey}.ogImage`) || e.imageUrl;
    pages.push(
      auditPage({
        name: `Event: ${e.title}`,
        url: `/#/event/${e.slug}`,
        title,
        description,
        ogImage,
        canonical: true,
        h1Count: 1,
        h2Count: 4,
        wordCount,
        minWords: 200,
      }),
    );
  }

  // Dynamic: Certifications
  for (const cert of certifications) {
    const pageKey = `cert-${cert.slug}`;
    const wordCount =
      countWords(cert.name) + countWords(cert.description) +
      countWords(cert.domains) + countWords(cert.skills);
    const title =
      seoIndex.get(`${pageKey}.title`) ||
      `${cert.name} Certification - GuardianX Academy`;
    const description =
      seoIndex.get(`${pageKey}.description`) || cert.description || "";
    const ogImage = seoIndex.get(`${pageKey}.ogImage`) || null;
    pages.push(
      auditPage({
        name: `Cert: ${cert.name}`,
        url: `/#/cert/${cert.slug}`,
        title,
        description,
        ogImage,
        canonical: true,
        h1Count: 1,
        h2Count: 6,
        wordCount,
        minWords: 250,
      }),
    );
  }

  // ---- 5. Roll up overall score + counts ----
  const totalPages = pages.length;
  const totalIssues = pages.reduce((acc, p) => acc + p.issues.length, 0);
  const overall =
    totalPages === 0
      ? 0
      : Math.round(pages.reduce((acc, p) => acc + p.score, 0) / totalPages);

  const result: AuditResult = {
    pages,
    score: overall,
    totalPages,
    totalIssues,
  };

  return NextResponse.json(result);
});
