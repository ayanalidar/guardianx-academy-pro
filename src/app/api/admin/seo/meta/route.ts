import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, withErrorHandler } from "@/lib/session";
import { logAction } from "@/lib/audit";

export const runtime = "nodejs";

/* ============================================================
   /api/admin/seo/meta  (GET + POST — ADMIN only)

   Storage convention (SiteContent rows where page="seo"):

     - per-page SEO overrides
         section = <pageKey>            (e.g. "home", "course-ceh",
                                          "blog-getting-started")
         key     = "title" | "description" | "ogImage" | "keywords"

     - global SEO defaults
         section = "global"
         key     = "titleTemplate" | "description" | "ogImage" |
                   "twitterCard"

     - robots.txt
         section = "robots"
         key     = "content"

   ----------------------------------------------------------
   GET  — returns ALL SEO meta entries (page="seo").
          Response: { items: [{ id, section, key, value, updatedAt,
                                updatedBy }], bySection: {...} }

   POST — Body: { page, title, description, ogImage, keywords }
          Upserts 4 rows (one per field) for section=<page>.
          Any field that is undefined / null is skipped (no
          overwrite with empty string).

          Special body shapes (also accepted by POST):
            { scope: "global", titleTemplate, description, ogImage,
              twitterCard }  → section="global"
            { scope: "robots", content }                  → section="robots"
   ============================================================ */

function readStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** GET — ADMIN only. Returns all SEO meta rows. */
export const GET = withErrorHandler(async () => {
  const user = await requireAdmin();
  if (user instanceof NextResponse) return user;

  const items = await db.siteContent.findMany({
    where: { page: "seo" },
    orderBy: [{ section: "asc" }, { key: "asc" }],
  });

  // Group by section for easier client-side consumption
  const bySection: Record<string, Record<string, string>> = {};
  for (const it of items) {
    if (!bySection[it.section]) bySection[it.section] = {};
    bySection[it.section][it.key] = readStr(it.value);
  }

  return NextResponse.json({
    items: items.map((it) => ({
      id: it.id,
      section: it.section,
      key: it.key,
      value: readStr(it.value),
      updatedAt: it.updatedAt.toISOString(),
      updatedBy: it.updatedBy,
    })),
    bySection,
  });
});

/** POST — ADMIN only. Body shapes documented at the top of the file. */
export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin();
  if (user instanceof NextResponse) return user;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Determine which section we're writing to + which field/values
  // to upsert. Each entry is [section, key, value].
  const upserts: Array<{ section: string; key: string; value: string }> = [];
  let actionLabel = "seo.update";

  if (body?.scope === "global") {
    // Global defaults
    if (typeof body.titleTemplate === "string") {
      upserts.push({ section: "global", key: "titleTemplate", value: body.titleTemplate });
    }
    if (typeof body.description === "string") {
      upserts.push({ section: "global", key: "description", value: body.description });
    }
    if (typeof body.ogImage === "string") {
      upserts.push({ section: "global", key: "ogImage", value: body.ogImage });
    }
    if (typeof body.twitterCard === "string") {
      upserts.push({ section: "global", key: "twitterCard", value: body.twitterCard });
    }
    actionLabel = "seo.update.global";
  } else if (body?.scope === "robots") {
    // robots.txt content
    if (typeof body.content === "string") {
      upserts.push({ section: "robots", key: "content", value: body.content });
    }
    actionLabel = "seo.update.robots";
  } else if (typeof body?.page === "string") {
    // Per-page SEO overrides
    const section = String(body.page);
    if (typeof body.title === "string") {
      upserts.push({ section, key: "title", value: body.title });
    }
    if (typeof body.description === "string") {
      upserts.push({ section, key: "description", value: body.description });
    }
    if (typeof body.ogImage === "string") {
      upserts.push({ section, key: "ogImage", value: body.ogImage });
    }
    if (typeof body.keywords === "string") {
      upserts.push({ section, key: "keywords", value: body.keywords });
    }
    actionLabel = `seo.update.${section}`;
  } else if (body?.section && body?.key && body?.value !== undefined) {
    // Generic upsert (used by the keyword tracker)
    upserts.push({
      section: String(body.section),
      key: String(body.key),
      value: readStr(body.value),
    });
    actionLabel = `seo.update.${body.section}.${body.key}`;
  } else {
    return NextResponse.json(
      {
        error:
          'Body must be one of: { page, title?, description?, ogImage?, keywords? } | { scope: "global", ... } | { scope: "robots", content } | { section, key, value }',
      },
      { status: 400 },
    );
  }

  if (upserts.length === 0) {
    return NextResponse.json(
      { error: "No fields to upsert — supply at least one of title/description/ogImage/keywords/content." },
      { status: 400 },
    );
  }

  // Run upserts sequentially (Neon connection limits + the unique
  // composite key avoids deadlocks when run serially).
  const written: Array<{ section: string; key: string }> = [];
  for (const u of upserts) {
    await db.siteContent.upsert({
      where: { page_section_key: { page: "seo", section: u.section, key: u.key } },
      create: {
        page: "seo",
        section: u.section,
        key: u.key,
        value: u.value,
        updatedBy: user.id,
      },
      update: { value: u.value, updatedBy: user.id },
    });
    written.push({ section: u.section, key: u.key });
  }

  await logAction(user.id, user.name ?? "", actionLabel, "SiteContent", null, {
    written,
  }).catch(() => {
    /* audit logging is best-effort */
  });

  return NextResponse.json({ ok: true, written });
});
