import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, requireRole, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

// Color palette for auto-computing the cert / level color classes on create.
// Mirrors the per-batch colors used by the homepage static array.
const CERT_PALETTE: Record<string, {
  certColor: string
  certTint: string
  certBorder: string
  borderColor: string
  btnClass: string
}> = {
  "security+": {
    certColor: "text-emerald-300",
    certTint: "bg-emerald-500/15",
    certBorder: "border-emerald-500/30",
    borderColor:
      "border-border/60 hover:border-emerald-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.65_0.15_155_/_0.25)]",
    btnClass: "bg-emerald-600 hover:bg-emerald-500",
  },
  "ceh": {
    certColor: "text-amber-300",
    certTint: "bg-amber-500/15",
    certBorder: "border-amber-500/30",
    borderColor:
      "border-border/60 hover:border-amber-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.7_0.15_70_/_0.25)]",
    btnClass: "bg-amber-600 hover:bg-amber-500",
  },
  "ccna": {
    certColor: "text-cyan-300",
    certTint: "bg-cyan-500/15",
    certBorder: "border-cyan-500/30",
    borderColor:
      "border-border/60 hover:border-cyan-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.7_0.15_220_/_0.25)]",
    btnClass: "bg-cyan-600 hover:bg-cyan-500",
  },
  "cissp": {
    certColor: "text-rose-300",
    certTint: "bg-rose-500/15",
    certBorder: "border-rose-500/30",
    borderColor:
      "border-border/60 hover:border-rose-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.65_0.2_15_/_0.25)]",
    btnClass: "bg-rose-600 hover:bg-rose-500",
  },
}

const DEFAULT_CERT_PALETTE = {
  certColor: "text-violet-300",
  certTint: "bg-violet-500/15",
  certBorder: "border-violet-500/30",
  borderColor:
    "border-border/60 hover:border-violet-500/40 hover:shadow-[0_20px_60px_-20px_oklch(0.65_0.15_290_/_0.25)]",
  btnClass: "bg-violet-600 hover:bg-violet-500",
}

const LEVEL_PALETTE: Record<string, {
  levelColor: string
  levelTint: string
  levelBorder: string
}> = {
  beginner: {
    levelColor: "text-emerald-300",
    levelTint: "bg-emerald-500/10",
    levelBorder: "border-emerald-500/30",
  },
  intermediate: {
    levelColor: "text-amber-300",
    levelTint: "bg-amber-500/10",
    levelBorder: "border-amber-500/30",
  },
  advanced: {
    levelColor: "text-rose-300",
    levelTint: "bg-rose-500/10",
    levelBorder: "border-rose-500/30",
  },
}

const DEFAULT_LEVEL_PALETTE = LEVEL_PALETTE.beginner

function certKey(cert: string): string {
  // Normalise "CompTIA Security+" -> "security+", "CEH (Certified Ethical Hacker)" -> "ceh"
  const lower = cert.toLowerCase()
  if (lower.includes("security")) return "security+"
  if (lower.includes("ceh") || lower.includes("ethical hacker")) return "ceh"
  if (lower.includes("ccna")) return "ccna"
  if (lower.includes("cissp")) return "cissp"
  return ""
}

function levelKey(level: string): string {
  return level.trim().toLowerCase()
}

function computeCertPalette(cert: string) {
  const k = certKey(cert)
  return CERT_PALETTE[k] ?? DEFAULT_CERT_PALETTE
}

function computeLevelPalette(level: string) {
  return LEVEL_PALETTE[levelKey(level)] ?? DEFAULT_LEVEL_PALETTE
}

// GET /api/admin/training-batches - list ALL batches (incl. unpublished), ordered by order.
// Uses `select` to return only the fields the admin batch calendar needs - drops the
// 9 auto-computed color-class columns and the createdAt/updatedAt timestamps (which
// the calendar never renders). This keeps the JSON payload lean.
export const GET = withErrorHandler(async () => {
  const currentUser = await requireRole(["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"])
  if (currentUser instanceof NextResponse) return currentUser

  const [batches, newLeadGroups] = await Promise.all([
    db.trainingBatch.findMany({
      orderBy: [{ order: "asc" }, { startDate: "asc" }],
      select: {
        id: true,
        certification: true,
        name: true,
        schedule: true,
        startDate: true,
        startIsoDate: true,
        mode: true,
        instructor: true,
        instructorId: true,
        seats: true,
        enrolled: true,
        level: true,
        status: true,
        description: true,
        featured: true,
        order: true,
        published: true,
        googleFormUrl: true,
        // Per-batch lead counts for the Batch Leads Hub cards.
        _count: { select: { batchLeads: true } },
      },
    }),
    // "New" (unworked) lead count per batch - shown as an attention badge.
    db.batchLead.groupBy({
      by: ["batchId"],
      where: { status: "New" },
      _count: true,
    }),
  ])

  const newLeadCountByBatch = new Map(newLeadGroups.map((g) => [g.batchId, g._count]))
  const batchesWithCounts = batches.map((b) => ({
    ...b,
    leadCount: b._count.batchLeads,
    newLeadCount: newLeadCountByBatch.get(b.id) ?? 0,
    _count: undefined,
  }))

  return NextResponse.json({ batches: batchesWithCounts, count: batchesWithCounts.length })
})

// POST /api/admin/training-batches - create a new training batch.
// Auto-computes cert / level color classes from the certification name + level.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const {
    certification,
    name,
    schedule,
    startDate,
    startIsoDate,
    mode,
    instructor,
    instructorId,
    seats,
    enrolled,
    level,
    status,
    description,
    featured,
    order,
    published,
    googleFormUrl,
  } = body as {
    certification?: string
    name?: string
    schedule?: string
    startDate?: string
    startIsoDate?: string
    mode?: string
    instructor?: string
    instructorId?: string
    seats?: number
    enrolled?: number
    level?: string
    status?: string
    description?: string
    featured?: boolean
    order?: number
    published?: boolean
    googleFormUrl?: string
  }

  if (!certification?.trim()) return NextResponse.json({ error: "Certification required" }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: "Batch name required" }, { status: 400 })
  if (!schedule?.trim()) return NextResponse.json({ error: "Schedule required" }, { status: 400 })
  if (!startDate?.trim()) return NextResponse.json({ error: "Start date required" }, { status: 400 })
  if (!instructor?.trim()) return NextResponse.json({ error: "Instructor required" }, { status: 400 })

  const finalLevel = (level?.trim() && ["Beginner", "Intermediate", "Advanced"].includes(level.trim()))
    ? level.trim()
    : "Beginner"

  const certPalette = computeCertPalette(certification.trim())
  const levelPalette = computeLevelPalette(finalLevel)

  const created = await db.trainingBatch.create({
    data: {
      certification: certification.trim(),
      name: name.trim(),
      schedule: schedule.trim(),
      startDate: startDate.trim(),
      startIsoDate: startIsoDate?.trim() || null,
      mode: mode?.trim() || "Live Online",
      instructor: instructor.trim(),
      instructorId: instructorId?.trim() || null,
      seats: Number.isFinite(Number(seats)) ? Number(seats) : 20,
      enrolled: Number.isFinite(Number(enrolled)) ? Number(enrolled) : 0,
      level: finalLevel,
      status: status?.trim() || "Open",
      ...certPalette,
      ...levelPalette,
      description: description?.trim() || "",
      featured: Boolean(featured),
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
      published: published !== undefined ? Boolean(published) : true,
      googleFormUrl: googleFormUrl?.trim() || null,
    },
  })

  return NextResponse.json({ batch: created }, { status: 201 })
})
