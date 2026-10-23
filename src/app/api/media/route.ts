import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { ensureTable, withDriftRetry } from "@/lib/db-safe"

export const runtime = "nodejs"

/**
 * POST /api/media - upload a file (admin only), multipart/form-data.
 *
 * Stores the bytes in the MediaAsset table (Postgres) so uploads survive on
 * serverless hosting where the filesystem is read-only. Returns the public
 * URL `/api/media/<id>` which the caller stores in CMS fields (e.g. a
 * partner's `logoUrl` or `mouPdfUrl`).
 *
 * Security:
 *  - ADMIN / SUPER_ADMIN only (same gate as /api/cms).
 *  - MIME allowlist: PNG / JPEG / WEBP / SVG (logos) and PDF (MoU copies).
 *    The extension must agree with the claimed MIME type.
 *  - Size caps: images 2 MB, SVG 300 KB, PDF 10 MB.
 *  - Filename is sanitized to a display-only string (no path components).
 */
const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp"])
const SVG_MIME = "image/svg+xml"
const PDF_MIME = "application/pdf"

const CAPS: Record<string, number> = {
  [SVG_MIME]: 300 * 1024,
  [PDF_MIME]: 10 * 1024 * 1024,
}
const IMAGE_CAP = 2 * 1024 * 1024

const EXT_FOR_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  [SVG_MIME]: "svg",
  [PDF_MIME]: "pdf",
}

function capFor(mime: string): number {
  return mime === PDF_MIME || mime === SVG_MIME ? CAPS[mime] : IMAGE_CAP
}

function sanitizeFilename(raw: string): string {
  const base = (raw || "upload")
    .split(/[\\/]+/)
    .pop()! // drop any path components
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80)
  return base || "upload"
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let file: File
  try {
    const form = await req.formData()
    const candidate = form.get("file")
    if (!(candidate instanceof File)) {
      return NextResponse.json({ error: "Missing file (send multipart/form-data with a `file` field)" }, { status: 400 })
    }
    file = candidate
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 })
  }

  // ---- MIME validation (declared type + extension must agree) ----
  const mime = (file.type || "").toLowerCase()
  const allowed = IMAGE_MIMES.has(mime) || mime === SVG_MIME || mime === PDF_MIME
  if (!allowed) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: PNG, JPEG, WEBP, SVG images and PDF documents." },
      { status: 415 },
    )
  }
  const ext = (file.name.split(".").pop() || "").toLowerCase()
  const expectedExt = EXT_FOR_MIME[mime]
  if (expectedExt && ext && ext !== expectedExt && !(mime === "image/jpeg" && ext === "jpeg")) {
    return NextResponse.json(
      { error: `File extension ".${ext}" does not match content type ${mime}.` },
      { status: 415 },
    )
  }

  // ---- Size cap ----
  const cap = capFor(mime)
  if (file.size <= 0 || file.size > cap) {
    const capMb = Math.round(cap / (1024 * 1024) * 10) / 10
    return NextResponse.json(
      { error: `File is ${Math.ceil(file.size / 1024)} KB; the limit for this type is ${capMb} MB.` },
      { status: 413 },
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const filename = sanitizeFilename(file.name)

  // ---- Persist (self-healing table) ----
  try {
    await ensureTable("MediaAsset")
  } catch (e) {
    console.error("[media] ensureTable(MediaAsset) failed:", e)
  }

  const created = await withDriftRetry("MediaAsset", () =>
    db.mediaAsset.create({
      data: {
        filename,
        mime,
        size: bytes.byteLength,
        data: bytes,
        uploadedBy: user.id,
      },
      select: { id: true },
    }),
  )

  if (!created[0]) {
    console.error("[media] create failed:", created[1])
    return NextResponse.json({ error: "Upload could not be stored. Try again." }, { status: 500 })
  }

  const id = created[0].id
  return NextResponse.json({
    id,
    url: `/api/media/${id}`,
    mime,
    size: bytes.byteLength,
    filename,
  })
}
