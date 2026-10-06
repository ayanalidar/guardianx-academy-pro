import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";

// Audit fix: GET used to be anonymous and dumped every template (names,
// descriptions, signature text, issued-certificate counts) to the public.
// Template config is internal admin/instructor metadata - the only consumer
// is the certificate-templates editor tab, which is always authenticated.
async function requireTemplateReader() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "INSTRUCTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return user
}

export async function GET() {
  const reader = await requireTemplateReader()
  if (reader instanceof NextResponse) return reader

  const templates = await db.certificateTemplate.findMany({
    include: { _count: { select: { certificates: true } } },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  })
  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!(user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "INSTRUCTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const {
    name,
    description = "",
    primaryColor = "#10b981",
    accentColor = "#06b6d4",
    fontFamily = "serif",
    borderStyle = "classic",
    logoUrl = null,
    signatureText = "Director, GuardianX Academy",
    sealStyle = "emerald",
    backgroundPattern = "grid",
    isDefault = false,
  } = body as Record<string, unknown>

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const created = await db.$transaction(async (tx) => {
    if (isDefault) {
      await tx.certificateTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }
    return tx.certificateTemplate.create({
      data: {
        name: name.trim(),
        description: typeof description === "string" ? description : "",
        primaryColor: typeof primaryColor === "string" ? primaryColor : "#10b981",
        accentColor: typeof accentColor === "string" ? accentColor : "#06b6d4",
        fontFamily: typeof fontFamily === "string" ? fontFamily : "serif",
        borderStyle: typeof borderStyle === "string" ? borderStyle : "classic",
        logoUrl: typeof logoUrl === "string" && logoUrl ? logoUrl : null,
        signatureText:
          typeof signatureText === "string" ? signatureText : "Director, GuardianX Academy",
        sealStyle: typeof sealStyle === "string" ? sealStyle : "emerald",
        backgroundPattern:
          typeof backgroundPattern === "string" ? backgroundPattern : "grid",
        isDefault: Boolean(isDefault),
      },
      include: { _count: { select: { certificates: true } } },
    })
  })

  return NextResponse.json({ template: created }, { status: 201 })
}
