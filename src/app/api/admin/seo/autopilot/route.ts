import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, withErrorHandler } from "@/lib/session";
import { logAction } from "@/lib/audit";
import {
  auditContent,
  projectScoreAfter,
  slugify,
  generateSnippet,
  trimSnippet,
  publicUrlFor,
  DESC_MIN,
  DESC_MAX,
  DESC_IDEAL_MAX,
  type ContentAuditRow,
  type ProposedFix,
  type SeoContentType,
  type SeoIssue,
  type HumanAction,
} from "@/lib/seo-autopilot";
import { STATIC_PAGES } from "@/lib/seo-static-pages";
import { pingIndexNow } from "@/lib/indexnow";

export const runtime = "nodejs";

/* ============================================================
   POST /api/admin/seo/autopilot   (ADMIN only)

   Body: { mode: "dry-run" | "apply" }

   The one-click SEO fixer:

     dry-run → audits every published Course / BlogPost / Event /
               GuardianCertification, lists issues + the exact
               auto-fixes it WOULD apply (nothing is written).

     apply   → writes the safe fixes (generated meta descriptions,
               missing excerpts, missing slugs - generated from the
               item's own content, deduped against the DB), then
               re-audits for the real after-score, pings IndexNow
               so search engines recrawl immediately, and writes an
               AuditLog entry.

   Response: { ok, mode, scoreBefore, scoreAfter (projected on
   dry-run / real on apply), issues, fixes, fixed, skipped,
   humanActions, ping, counts }
   ============================================================ */

const MAX_WRITES = 200; // safety cap per run

/** Build audit rows from the DB (published content only). */
async function loadRows(): Promise<ContentAuditRow[]> {
  const [courses, blogPosts, events, certs] = await Promise.all([
    db.course.findMany({
      where: { published: true },
      select: { id: true, slug: true, title: true, shortName: true, description: true, longDescription: true, thumbnail: true, tags: true },
    }),
    db.blogPost.findMany({
      where: { published: true },
      select: { id: true, slug: true, title: true, excerpt: true, content: true, thumbnail: true, tags: true },
    }),
    db.event.findMany({
      where: { published: true },
      select: { id: true, slug: true, title: true, description: true, longDescription: true, imageUrl: true, startDate: true, time: true, mode: true, venue: true, type: true },
    }),
    db.guardianCertification.findMany({
      where: { published: true },
      select: { id: true, slug: true, name: true, description: true, skills: true, domains: true },
    }),
  ]);

  const rows: ContentAuditRow[] = [];

  for (const c of courses) {
    rows.push({
      type: "course", id: c.id, title: c.title, slug: c.slug,
      description: c.description ?? "",
      longText: `${c.description ?? ""} ${c.longDescription ?? ""}`.trim(),
      thumbnail: c.thumbnail, shortName: c.shortName, tags: c.tags, published: true,
    });
  }
  for (const b of blogPosts) {
    rows.push({
      type: "blog", id: b.id, title: b.title, slug: b.slug,
      description: b.excerpt ?? "",
      longText: b.content ?? "",
      thumbnail: b.thumbnail, tags: b.tags, published: true,
    });
  }
  for (const e of events) {
    // Last-resort composed source so events always get a meaningful
    // description even when admins wrote nothing.
    const eventFallback = [
      e.description, e.longDescription,
      [e.startDate, e.time, e.mode, e.venue].filter(Boolean).join(" · "),
      `${e.type} by GuardianX Academy`,
    ].filter(Boolean).join(". ");
    rows.push({
      type: "event", id: e.id, title: e.title, slug: e.slug,
      description: e.description ?? "",
      longText: eventFallback,
      thumbnail: e.imageUrl, published: true,
    });
  }
  for (const cert of certs) {
    let skills: string[] = [];
    try { skills = JSON.parse(cert.skills || "[]"); } catch { /* ignore */ }
    rows.push({
      type: "cert", id: cert.id, title: cert.name, slug: cert.slug,
      description: cert.description ?? "",
      longText: `${cert.description ?? ""} Skills assessed: ${skills.join(", ")}`.trim(),
      thumbnail: null, published: true,
    });
  }

  return rows;
}

/** Ensure a candidate slug is free in the target table. */
async function uniqueSlug(
  table: "blogPost" | "event",
  base: string,
  excludeId: string,
): Promise<string> {
  let candidate = base;
  let n = 2;
  for (let i = 0; i < 50; i++) {
    const clash =
      table === "blogPost"
        ? await db.blogPost.findFirst({ where: { slug: candidate, NOT: { id: excludeId } }, select: { id: true } })
        : await db.event.findFirst({ where: { slug: candidate, NOT: { id: excludeId } }, select: { id: true } });
    if (!clash) return candidate;
    candidate = `${base}-${n++}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/* -------- static-page meta audit -------- */

function readStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  try { return JSON.stringify(v); } catch { return String(v); }
}

/** Flatten a JSON-shaped SiteContent value into one text blob
 *  (generation source for a page's meta description). */
function flattenStrings(v: unknown, out: string[] = []): string[] {
  if (v == null) return out;
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const it of v) flattenStrings(it, out); return out; }
  if (typeof v === "object") {
    for (const it of Object.values(v as Record<string, unknown>)) flattenStrings(it, out);
    return out;
  }
  return out;
}

/**
 * Audit the STATIC pages' meta descriptions against the SAME band
 * the Health audit scores ([DESC_MIN, DESC_MAX]), so page fixes
 * move the gauge. Effective description = SiteContent override
 * (page="seo", section=<pageKey>, key="description") else the
 * shared default. Over-long descriptions are trimmed into the
 * band; short ones are generated from the page's own CMS content.
 * Titles are brand content - never auto-written.
 */
async function auditStaticPages(): Promise<{
  issues: SeoIssue[];
  fixes: ProposedFix[];
  humanActions: HumanAction[];
}> {
  const issues: SeoIssue[] = [];
  const fixes: ProposedFix[] = [];
  const humanActions: HumanAction[] = [];

  const seoRows = await db.siteContent.findMany({ where: { page: "seo" } });
  const seoIndex = new Map<string, string>();
  for (const row of seoRows) seoIndex.set(`${row.section}.${row.key}`, readStr(row.value));

  const cmsResults = await Promise.all(
    STATIC_PAGES.map((p) =>
      db.siteContent
        .findMany({ where: { page: p.pageKey }, select: { value: true } })
        .then((rs) => ({
          pageKey: p.pageKey,
          text: rs.map((r) => flattenStrings(r.value).join(" ")).join(". "),
        }))
        .catch(() => ({ pageKey: p.pageKey, text: "" })),
    ),
  );
  const cmsTextByPage = new Map(cmsResults.map((r) => [r.pageKey, r.text]));

  for (const def of STATIC_PAGES) {
    const label = `${def.name} (page meta)`;
    const url = publicUrlFor("page", def.url);
    const override = seoIndex.get(`${def.pageKey}.description`);
    const effective = (override || def.defaultDescription || "").trim();

    if (effective.length > DESC_MAX) {
      const trimmed = trimSnippet(effective, DESC_IDEAL_MAX - 5, DESC_MIN);
      if (trimmed.length >= DESC_MIN && trimmed.length < effective.length) {
        issues.push({
          type: "page", id: def.pageKey, label, url,
          issue: `Meta description too long (${effective.length} chars - SERPs cut at ~${DESC_MAX})`,
          severity: "warning", autoFixable: true,
        });
        fixes.push({
          type: "page", id: def.pageKey, label, field: "description",
          before: effective, after: trimmed, pingUrl: url,
        });
      }
    } else if (effective.length < DESC_MIN) {
      const generated = generateSnippet(cmsTextByPage.get(def.pageKey) || "", DESC_IDEAL_MAX - 5, DESC_MIN);
      if (generated.length >= DESC_MIN && generated.length > effective.length) {
        issues.push({
          type: "page", id: def.pageKey, label, url,
          issue: effective.length === 0 ? "Missing meta description" : `Meta description too short (${effective.length} chars)`,
          severity: "critical", autoFixable: true,
        });
        fixes.push({
          type: "page", id: def.pageKey, label, field: "description",
          before: effective, after: generated, pingUrl: url,
        });
      } else {
        issues.push({
          type: "page", id: def.pageKey, label, url,
          issue: `Meta description too short (${effective.length} chars - aim for 120-${DESC_MAX})`,
          severity: "critical", autoFixable: false,
        });
        humanActions.push({
          label,
          reason: "Page description is short and the page content is too thin to generate one - set a 120-160 char description under Meta Tags.",
        });
      }
    }
  }

  return { issues, fixes, humanActions };
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin();
  if (user instanceof NextResponse) return user;

  let body: { mode?: string } = {};
  try { body = await req.json(); } catch { /* default dry-run */ }
  const mode = body.mode === "apply" ? "apply" : "dry-run";

  // ---- 1. Audit (always read-only at this stage) ----
  const rows = await loadRows();
  const audit = auditContent(rows);
  const projected = projectScoreAfter(audit);

  // ---- 1b. Static-page meta audit (same grader bands) ----
  const pageAudit = await auditStaticPages();

  if (mode === "dry-run") {
    return NextResponse.json({
      ok: true,
      mode,
      scoreBefore: audit.scoreBefore,
      scoreAfter: projected, // projected - nothing written yet
      issues: [...audit.issues, ...pageAudit.issues],
      fixes: [...audit.fixes, ...pageAudit.fixes],
      fixed: [],
      skipped: [],
      humanActions: [...audit.humanActions, ...pageAudit.humanActions],
      ping: null,
      counts: audit.counts,
    });
  }

  // ---- 2. APPLY - write only the safe, proposed fixes ----
  const fixed: (ProposedFix & { applied: boolean })[] = [];
  const skipped: { label: string; field: string; reason: string }[] = [];
  const pingPaths: string[] = [];
  let writes = 0;

  const byType = (t: SeoContentType) => audit.fixes.filter((f) => f.type === t);

  // Page meta: write SiteContent overrides (page="seo"). The SPA's
  // static pages share one URL, so ping the root once per write
  // (deduped by pingIndexNow) instead of useless /#/fragment URLs.
  for (const f of pageAudit.fixes) {
    if (writes >= MAX_WRITES) { skipped.push({ label: f.label, field: f.field, reason: "Write cap reached" }); continue; }
    await db.siteContent.upsert({
      where: { page_section_key: { page: "seo", section: f.id, key: "description" } },
      update: { value: f.after },
      create: { page: "seo", section: f.id, key: "description", value: f.after },
    });
    writes++; pingPaths.push("/");
    fixed.push({ ...f, applied: true });
  }

  // Blog: excerpt + slug
  for (const f of byType("blog")) {
    if (writes >= MAX_WRITES) { skipped.push({ label: f.label, field: f.field, reason: "Write cap reached" }); continue; }
    if (f.field === "excerpt") {
      await db.blogPost.update({ where: { id: f.id }, data: { excerpt: f.after } });
      writes++; pingPaths.push(f.pingUrl);
      fixed.push({ ...f, applied: true });
    } else if (f.field === "slug") {
      const slug = await uniqueSlug("blogPost", slugify(f.after) || f.after, f.id);
      await db.blogPost.update({ where: { id: f.id }, data: { slug } });
      writes++; pingPaths.push(`/blog/${slug}`);
      fixed.push({ ...f, after: slug, applied: true });
    }
  }

  // Courses: description + thumbnail (dedicated per-course cover)
  for (const f of byType("course")) {
    if (f.field === "thumbnail") {
      if (writes >= MAX_WRITES) { skipped.push({ label: f.label, field: f.field, reason: "Write cap reached" }); continue; }
      await db.course.update({ where: { id: f.id }, data: { thumbnail: f.after } });
      writes++; pingPaths.push(f.pingUrl);
      fixed.push({ ...f, applied: true });
      continue;
    }
    if (f.field !== "description") continue;
    if (writes >= MAX_WRITES) { skipped.push({ label: f.label, field: f.field, reason: "Write cap reached" }); continue; }
    await db.course.update({ where: { id: f.id }, data: { description: f.after } });
    writes++; pingPaths.push(f.pingUrl);
    fixed.push({ ...f, applied: true });
  }

  // Events: description + slug
  for (const f of byType("event")) {
    if (writes >= MAX_WRITES) { skipped.push({ label: f.label, field: f.field, reason: "Write cap reached" }); continue; }
    if (f.field === "description") {
      await db.event.update({ where: { id: f.id }, data: { description: f.after } });
      writes++; pingPaths.push(f.pingUrl);
      fixed.push({ ...f, applied: true });
    } else if (f.field === "slug") {
      const slug = await uniqueSlug("event", slugify(f.after) || f.after, f.id);
      await db.event.update({ where: { id: f.id }, data: { slug } });
      writes++; pingPaths.push(`/events/${slug}`);
      fixed.push({ ...f, after: slug, applied: true });
    }
  }

  // Certifications: description
  for (const f of byType("cert")) {
    if (f.field !== "description") continue;
    if (writes >= MAX_WRITES) { skipped.push({ label: f.label, field: f.field, reason: "Write cap reached" }); continue; }
    await db.guardianCertification.update({ where: { id: f.id }, data: { description: f.after } });
    writes++; pingPaths.push(f.pingUrl);
    fixed.push({ ...f, applied: true });
  }

  // ---- 3. Re-audit for the REAL after-score ----
  const freshRows = writes > 0 ? await loadRows() : rows;
  const freshAudit = auditContent(freshRows);
  const freshPageAudit = writes > 0 ? await auditStaticPages() : pageAudit;

  // ---- 4. Ping IndexNow with every changed URL ----
  const ping = writes > 0 ? await pingIndexNow([...pingPaths, "/sitemap.xml"]) : null;

  // ---- 5. AuditLog trail ----
  await logAction(
    user.id ?? null,
    user.email ?? user.name ?? "admin",
    "seo.autopilot.apply",
    "seo",
    null,
    { fixed: fixed.length, skipped: skipped.length, scoreBefore: audit.scoreBefore, scoreAfter: freshAudit.scoreBefore },
  );

  return NextResponse.json({
    ok: true,
    mode,
    scoreBefore: audit.scoreBefore,
    scoreAfter: freshAudit.scoreBefore, // real re-audit score
    issues: [...freshAudit.issues, ...freshPageAudit.issues], // what still remains
    fixes: [...audit.fixes, ...pageAudit.fixes],
    fixed,
    skipped,
    humanActions: [...freshAudit.humanActions, ...freshPageAudit.humanActions],
    ping,
    counts: freshAudit.counts,
  });
});
