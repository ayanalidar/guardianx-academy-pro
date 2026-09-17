import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Converted", "Lost"]
const LEAD_TYPES = ["Individual", "School", "College", "University", "Corporate", "Partner", "Workshop", "CTF", "Webinar"]
const LEAD_SOURCES = ["Google Form", "Contact Form", "Manual", "Referral"]

function computeLeadScore(lead: {
  type: string
  source: string
  status: string
  email: string | null
  phone: string | null
  organization: string | null
}): number {
  let score = 0
  // Type scoring
  const typeMap: Record<string, number> = {
    University: 25,
    College: 20,
    Corporate: 18,
    School: 12,
    Partner: 15,
    Workshop: 10,
    CTF: 8,
    Webinar: 5,
    Individual: 5,
  }
  score += typeMap[lead.type] ?? 5
  // Source scoring
  const sourceMap: Record<string, number> = {
    "Google Form": 15,
    Referral: 20,
    "Contact Form": 10,
    Manual: 5,
  }
  score += sourceMap[lead.source] ?? 5
  // Contact completeness
  if (lead.email) score += 10
  if (lead.phone) score += 10
  if (lead.organization) score += 10
  // Status progression
  const statusBonus: Record<string, number> = {
    New: 0,
    Contacted: 5,
    Qualified: 15,
    Proposal: 20,
    Negotiation: 25,
    Converted: 30,
    Lost: 0,
  }
  score += statusBonus[lead.status] ?? 0
  return Math.min(100, score)
}

// GET /api/admin/leads — list leads + compute scores + stats
export const GET = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const url = new URL(req.url)
  const status = url.searchParams.get("status")
  const q = url.searchParams.get("q")?.trim() || undefined
  const source = url.searchParams.get("source")

  const where: {
    status?: string
    source?: string
    OR?: Array<Record<string, { contains: string }>>
  } = {}
  if (status && status !== "all") where.status = status
  if (source && source !== "all") where.source = source
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { organization: { contains: q } },
    ]
  }

  const leads = await db.lead.findMany({
    where,
    include: {
      notes: { orderBy: { createdAt: "desc" }, take: 5 },
      history: { orderBy: { changedAt: "desc" }, take: 10 },
    },
    orderBy: { createdAt: "desc" },
  })

  const enrichedLeads = leads.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    organization: l.organization,
    type: l.type,
    status: l.status,
    source: l.source,
    score: l.score || computeLeadScore(l),
    followUpDate: l.followUpDate,
    assignedTo: l.assignedTo,
    notes: l.notes.map((n) => ({ id: n.id, content: n.content, createdAt: n.createdAt, authorId: n.authorId })),
    history: l.history.map((h) => ({ id: h.id, fromStatus: h.fromStatus, toStatus: h.toStatus, changedAt: h.changedAt })),
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  }))

  // Stats
  const allLeads = await db.lead.findMany({ select: { status: true, source: true, createdAt: true } })
  const total = allLeads.length
  const converted = allLeads.filter((l) => l.status === "Converted").length
  const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const newThisMonth = allLeads.filter((l) => new Date(l.createdAt) >= monthStart).length

  // Source breakdown
  const bySource: Record<string, number> = {}
  for (const l of allLeads) {
    bySource[l.source] = (bySource[l.source] ?? 0) + 1
  }

  // Avg time to convert (rough — uses updatedAt of converted leads vs createdAt)
  const convertedLeads = await db.lead.findMany({
    where: { status: "Converted" },
    select: { createdAt: true, updatedAt: true },
  })
  let avgTimeToConvertDays = 0
  if (convertedLeads.length > 0) {
    const totalDays = convertedLeads.reduce((sum, l) => {
      const days = (new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      return sum + days
    }, 0)
    avgTimeToConvertDays = Math.round(totalDays / convertedLeads.length)
  }

  return NextResponse.json({
    leads: enrichedLeads,
    stats: {
      total,
      new: allLeads.filter((l) => l.status === "New").length,
      contacted: allLeads.filter((l) => l.status === "Contacted").length,
      qualified: allLeads.filter((l) => l.status === "Qualified").length,
      proposal: allLeads.filter((l) => l.status === "Proposal").length,
      converted,
      lost: allLeads.filter((l) => l.status === "Lost").length,
      conversionRate,
      avgTimeToConvertDays,
      newThisMonth,
      bySource,
    },
  })
})

// POST /api/admin/leads — create a new lead manually
export const POST = withErrorHandler(async (req: NextRequest) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })

  const { name, email, phone, organization, type, source, assignedTo } = body as {
    name?: string
    email?: string
    phone?: string
    organization?: string
    type?: string
    source?: string
    assignedTo?: string
  }

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const finalType = LEAD_TYPES.includes(type ?? "") ? type! : "Individual"
  const finalSource = LEAD_SOURCES.includes(source ?? "") ? source! : "Manual"

  const lead = await db.lead.create({
    data: {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      organization: organization?.trim() || null,
      type: finalType,
      source: finalSource,
      assignedTo: assignedTo?.trim() || null,
      score: computeLeadScore({
        type: finalType,
        source: finalSource,
        status: "New",
        email: email ?? null,
        phone: phone ?? null,
        organization: organization ?? null,
      }),
      history: { create: [{ fromStatus: null, toStatus: "New" }] },
    },
    include: { notes: true, history: true },
  })

  return NextResponse.json({ lead }, { status: 201 })
})
