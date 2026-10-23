import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withDriftRetry } from "@/lib/db-safe"

export const runtime = "nodejs"

/**
 * GET /api/media/<id> - serve an uploaded file.
 *
 * Public by design: partner logos render on public pages and published MoU
 * PDFs open from public profiles. Access control happens at PUBLISH time -
 * a partner's MoU only becomes a public page element when the admin flips
 * `mouPublic` to "yes" in Content Studio.
 *
 * Response hardening:
 *  - ids are immutable, so responses are cached aggressively
 *    (`immutable` lets Vercel's edge + browsers serve logos from cache).
 *  - `Content-Security-Policy: default-src 'none'` neutralizes scripts in
 *    uploaded SVGs when the file is opened directly (browsers block active
 *    content in <img> contexts anyway; this covers direct navigation).
 *  - `X-Content-Type-Options: nosniff` prevents MIME sniffing.
 *  - `?download=1` switches Content-Disposition to attachment with the
 *    original filename (used by "Download MoU copy" buttons).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const [row, err] = await withDriftRetry("MediaAsset", () =>
    db.mediaAsset.findUnique({
      where: { id },
      select: { filename: true, mime: true, size: true, data: true },
    }),
  )

  if (!row) {
    if (err) console.error("[media] read failed:", err)
    return new NextResponse("Not found", { status: 404 })
  }

  const download = _req.nextUrl.searchParams.get("download") === "1"
  const body = new Uint8Array(row.data)

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${row.filename.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:",
    },
  })
}
