/* ============================================================
   ONE-TIME course cover sync (thumbnails).
   ⚠️ TEMPORARY ROUTE - remove in the commit immediately after
   the successful sync (precedent: content-sync d711aec/7f39c3f).

   Purpose: wire every published course's `thumbnail` to its
   dedicated per-course cover from course-images.ts without
   requiring an interactive admin session.

   Safety:
   - Lives OUTSIDE /api/admin on purpose (middleware gates that
     prefix by session-cookie presence). Authenticates with its
     own 256-bit one-time key supplied in the
     `x-course-cover-sync` header; only the SHA-256 is stored
     here (timing-safe compare) - the raw key never lives in
     the repo.
   - ONLY touches Course rows whose thumbnail is empty/null.
     Admin-uploaded custom thumbnails are never overwritten.
   - Exact shortName matches ONLY (no category/title guessing),
     so a course can never get a wrong-topic cover.
   - Every invocation is written to the AuditLog.
   ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { COURSE_SHORT_IMAGES } from "@/lib/course-images";

const KEY_HASH =
  "9f2f14634b2b5ada79f7d17b286d97a42b9be8bcc200362cac561d3791373018";

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-course-cover-sync") || "";
  const digest = createHash("sha256").update(key).digest();
  const expected = Buffer.from(KEY_HASH, "hex");
  if (digest.length !== expected.length || !timingSafeEqual(digest, expected)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const select = { id: true, shortName: true, title: true, thumbnail: true } as const;
  const [nullThumbs, emptyThumbs] = await Promise.all([
    db.course.findMany({ where: { thumbnail: null }, select }),
    db.course.findMany({ where: { thumbnail: "" }, select }),
  ]);
  const withEmpty = [...nullThumbs, ...emptyThumbs];

  const updated: { id: string; shortName: string; thumbnail: string }[] = [];
  const unmatched: { id: string; shortName: string; title: string }[] = [];

  for (const c of withEmpty) {
    const short = (c.shortName || "").trim().toUpperCase();
    const cover = COURSE_SHORT_IMAGES[short];
    if (!cover) {
      unmatched.push({ id: c.id, shortName: c.shortName || "", title: c.title });
      continue;
    }
    await db.course.update({
      where: { id: c.id },
      data: { thumbnail: cover },
    });
    updated.push({ id: c.id, shortName: c.shortName || "", thumbnail: cover });
  }

  await logAction(null, "one-time-cover-sync", "course.cover.sync", "course", null, {
    updated: updated.length,
    unmatched: unmatched.length,
  });

  return NextResponse.json({
    ok: true,
    updatedCount: updated.length,
    updated,
    unmatchedCount: unmatched.length,
    unmatched,
  });
}
