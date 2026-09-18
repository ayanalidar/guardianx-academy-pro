import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
export const runtime = "nodejs"
export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  try { const actions = await db.sentinelAction.findMany({ orderBy: { timestamp: "desc" }, take: 50 }); return NextResponse.json({ actions, count: actions.length }) } catch { return NextResponse.json({ actions: [], count: 0 }) }
}
