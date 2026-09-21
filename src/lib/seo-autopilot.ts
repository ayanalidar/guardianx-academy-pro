/* ============================================================
   SEO Autopilot - pure logic (no DB, no network).

   Used by /api/admin/seo/autopilot to:
     1. Audit content rows (courses / blog / events / batches /
        certifications) for SEO completeness.
     2. Propose deterministic, SAFE auto-fixes (generated
        descriptions, excerpts, slugs) - everything a human would
        otherwise fix by copy-pasting content.
     3. Score content 0-100 before and after applying fixes.

   Pure functions only → unit-testable without a database.
   ============================================================ */

/* ---------------- types ---------------- */

export type SeoContentType = "course" | "blog" | "event" | "batch" | "cert";

export interface SeoIssue {
  type: SeoContentType;
  id: string;
  label: string; // human name, e.g. "Blog: Getting Started in SOC"
  url: string; // clean public URL path (no host)
  issue: string; // e.g. "Missing meta description"
  severity: "critical" | "warning" | "info";
  autoFixable: boolean;
}

export interface ProposedFix {
  type: SeoContentType;
  id: string;
  label: string;
  field: string; // "description" | "excerpt" | "slug"
  before: string; // "" when empty
  after: string; // generated value
  /** Public URL to ping after the fix is applied. */
  pingUrl: string;
}

export interface HumanAction {
  label: string;
  reason: string;
}

export interface ContentAuditRow {
  type: SeoContentType;
  id: string;
  title: string;
  slug: string;
  /** primary short description field (course.description / blog.excerpt / event.description) */
  description: string;
  /** longer source used to generate a description when missing */
  longText?: string;
  thumbnail?: string | null;
  tags?: string;
  published?: boolean;
}

export interface AutopilotAudit {
  issues: SeoIssue[];
  fixes: ProposedFix[];
  humanActions: HumanAction[];
  scoreBefore: number;
  counts: { total: number; byType: Record<SeoContentType, number> };
}

/* ---------------- constants ---------------- */

export const TITLE_MIN = 15;
export const TITLE_MAX = 70;
export const DESC_MIN = 70;
export const DESC_IDEAL_MAX = 160;

/* ---------------- text helpers ---------------- */

/** Convert arbitrary title text into a URL-safe slug. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
}

/** Strip markdown syntax down to readable plain text. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → anchor text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/^\s*[-*+]\s+/gm, "") // list bullets
    .replace(/^\s*>\s?/gm, "") // blockquotes
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1") // emphasis
    .replace(/\|/g, " ") // table pipes
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate a meta-description-shaped snippet from longer text.
 * Cuts at the last word boundary under `maxLen`, appends an
 * ellipsis when truncated. Returns "" when there is no source text.
 */
export function generateSnippet(source: string, maxLen = 155): string {
  const text = stripMarkdown(source || "");
  if (!text) return "";
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const body = (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
  return `${body}…`;
}

/** Deterministically derive tags from category + title keywords. */
export function deriveTags(category: string, title: string): string {
  const parts = [category, ...title.split(/[\s\--- :,]+/)]
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && t.length <= 24 && !/^\d+$/.test(t));
  const uniq = Array.from(new Set(parts.map((p) => p.toLowerCase()))).slice(0, 6);
  return uniq.join(", ");
}

/* ---------------- audit rules ---------------- */

function scoreRow(row: ContentAuditRow, issues: number): number {
  // Start at 100; deduct per issue by severity.
  let score = 100;
  for (let i = 0; i < issues; i++) score -= 18;
  // Bonus signals.
  if (row.thumbnail) score += 4;
  if (row.tags && row.tags.trim()) score += 2;
  if (row.slug && row.slug.length > 3) score += 4;
  return Math.max(0, Math.min(100, score));
}

/**
 * Audit a set of content rows → issues + safe proposed fixes.
 * `fixThresholds` lets callers tune when generation kicks in
 * (defaults: description/excerpt shorter than DESC_MIN counts as
 * missing; slug empty counts as missing).
 */
export function auditContent(rows: ContentAuditRow[]): AutopilotAudit {
  const issues: SeoIssue[] = [];
  const fixes: ProposedFix[] = [];
  const humanActions: HumanAction[] = [];
  const seenSlugs = new Set<string>();

  for (const row of rows) {
    if (row.published === false) continue; // only public content matters

    const label = `${row.type[0].toUpperCase()}${row.type.slice(1)}: ${row.title || row.id}`;
    const url = publicUrlFor(row.type, row.slug || row.id);

    // -- slug --
    const slug = (row.slug || "").trim();
    if (!slug || slug === "" || /^[0-9a-f]{24,}$/i.test(slug)) {
      const generated = slugify(row.title || "") || `item-${row.id.slice(-6)}`;
      let candidate = generated;
      let n = 2;
      while (seenSlugs.has(candidate)) candidate = `${generated}-${n++}`;
      seenSlugs.add(candidate);
      issues.push({
        type: row.type, id: row.id, label, url,
        issue: "Missing or invalid URL slug", severity: "critical", autoFixable: true,
      });
      fixes.push({
        type: row.type, id: row.id, label, field: "slug",
        before: slug, after: candidate, pingUrl: publicUrlFor(row.type, candidate),
      });
    } else {
      seenSlugs.add(slug);
    }

    // -- title length (report only - titles are content) --
    const titleLen = (row.title || "").trim().length;
    if (!row.title || titleLen === 0) {
      issues.push({
        type: row.type, id: row.id, label, url,
        issue: "Missing title", severity: "critical", autoFixable: false,
      });
      humanActions.push({ label, reason: "Title is empty - give the item a real name in the CMS." });
    } else if (titleLen < TITLE_MIN) {
      issues.push({
        type: row.type, id: row.id, label, url,
        issue: `Title too short (${titleLen} chars - aim for ${TITLE_MIN}+)`, severity: "warning", autoFixable: false,
      });
    } else if (titleLen > TITLE_MAX) {
      issues.push({
        type: row.type, id: row.id, label, url,
        issue: `Title too long (${titleLen} chars - aim for ≤${TITLE_MAX})`, severity: "info", autoFixable: false,
      });
    }

    // -- primary description (auto-fixable) --
    const desc = (row.description || "").trim();
    if (desc.length < DESC_MIN) {
      const generated = generateSnippet(row.longText || "", DESC_IDEAL_MAX);
      if (generated.length >= DESC_MIN && generated.length > desc.length) {
        issues.push({
          type: row.type, id: row.id, label, url,
          issue: desc.length === 0 ? "Missing meta description" : `Meta description too short (${desc.length} chars)`,
          severity: "critical", autoFixable: true,
        });
        fixes.push({
          type: row.type, id: row.id, label, field: row.type === "blog" ? "excerpt" : "description",
          before: desc, after: generated, pingUrl: url,
        });
      } else {
        issues.push({
          type: row.type, id: row.id, label, url,
          issue: "Missing meta description (no source text to generate one from)",
          severity: "critical", autoFixable: false,
        });
        humanActions.push({
          label,
          reason: "No description and no long-form body to generate one from - write 1-2 sentences in the CMS.",
        });
      }
    } else if (desc.length > 300) {
      issues.push({
        type: row.type, id: row.id, label, url,
        issue: `Description very long (${desc.length} chars - SERPs cut at ~160)`, severity: "info", autoFixable: false,
      });
    }

    // -- thumbnail (report only) --
    if (!row.thumbnail || !row.thumbnail.trim()) {
      issues.push({
        type: row.type, id: row.id, label, url,
        issue: "No cover image (falls back to branded OG card)", severity: "info", autoFixable: false,
      });
      humanActions.push({ label, reason: "Upload a cover/thumbnail image for richer social shares." });
    }
  }

  const byType: Record<SeoContentType, number> = {
    course: 0, blog: 0, event: 0, batch: 0, cert: 0,
  };
  let total = 0;
  for (const row of rows) {
    if (row.published === false) continue;
    byType[row.type] += 1;
    total += 1;
  }

  // Score = average of per-row scores (rows dedupe their issue counts).
  const rowsAudited = rows.filter((r) => r.published !== false);
  const issueCountByRow = new Map<string, number>();
  for (const is of issues) {
    issueCountByRow.set(is.id, (issueCountByRow.get(is.id) ?? 0) + 1);
  }
  const scoreBefore =
    rowsAudited.length === 0
      ? 100
      : Math.round(
          rowsAudited.reduce(
            (acc, r) => acc + scoreRow(r, issueCountByRow.get(r.id) ?? 0),
            0,
          ) / rowsAudited.length,
        );

  return { issues, fixes, humanActions, scoreBefore, counts: { total, byType } };
}

/** Clean public URL path for a content type (matches the live route map). */
export function publicUrlFor(type: SeoContentType, slugOrId: string): string {
  switch (type) {
    case "course": return `/courses/${slugOrId}`;
    case "blog": return `/blog/${slugOrId}`;
    case "event": return `/events/${slugOrId}`;
    case "batch": return `/batches/${slugOrId}`;
    case "cert": return `/cert/${slugOrId}`;
  }
}

/**
 * Re-score assuming every proposed fix has been applied.
 * (Pure - no DB writes; used to show projected score.)
 */
export function projectScoreAfter(audit: AutopilotAudit): number {
  const fixedByKey = new Set(audit.fixes.map((f) => `${f.type}:${f.id}:${f.field}`));
  const stillOpen = audit.issues.filter((is) => {
    if (!is.autoFixable) return true; // human action - remains open
    const field = is.issue.toLowerCase().includes("slug")
      ? "slug"
      : is.type === "blog" ? "excerpt" : "description";
    return !fixedByKey.has(`${is.type}:${is.id}:${field}`); // fix not proposed
  });
  const fixedCount = audit.issues.length - stillOpen.length;
  if (audit.issues.length === 0 || fixedCount === 0) return audit.scoreBefore;
  return Math.min(
    100,
    audit.scoreBefore + Math.round((fixedCount / audit.issues.length) * (100 - audit.scoreBefore)),
  );
}
