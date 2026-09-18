import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
export const runtime = "nodejs"
export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  try {
    const incidents = await db.incident.findMany({ orderBy: { detectedAt: "desc" }, take: 50 })
    const openCount = incidents.filter(i => i.status === "open" || i.status === "investigating").length
    return NextResponse.json({ incidents, openCount, total: incidents.length })
  } catch { return NextResponse.json({ incidents: [], openCount: 0, total: 0 }) }
}
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  try {
    const incident = await db.incident.create({ data: { title: body.title || "Untitled", component: body.component || "unknown", severity: body.severity || "warning", status: "open", description: body.description || null, evidence: JSON.stringify(body.evidence || []) } })
    return NextResponse.json({ incident }, { status: 201 })
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }) }
}
