import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
export const runtime = "nodejs"
export async function GET() {
  // Auth-optional: uptime monitors ping this unauthenticated, so anonymous
  // callers get status booleans ONLY. The detailed per-service latencies and
  // row counts (users/courses/leads…) — genuine recon value — are included
  // for admins only.
  const user = await getCurrentUser().catch(() => null)
  const isAdmin = !!user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "INSTRUCTOR")
  const services: Array<{ name: string; status: string; latency: number; detail?: string }> = []
  const start = Date.now()
  try { await db.$queryRaw`SELECT 1`; services.push({ name: "Database", status: "operational", latency: Date.now() - start }) } catch { services.push({ name: "Database", status: "down", latency: Date.now() - start }) }
  try { const c = await db.user.count(); services.push({ name: "Authentication", status: "operational", latency: Date.now() - start, detail: `${c} users` }) } catch { services.push({ name: "Authentication", status: "degraded", latency: Date.now() - start }) }
  try { const c = await db.course.count(); services.push({ name: "LMS", status: "operational", latency: Date.now() - start, detail: `${c} courses` }) } catch { services.push({ name: "LMS", status: "degraded", latency: Date.now() - start }) }
  try { const c = await db.lab.count(); services.push({ name: "Cyber Labs", status: "operational", latency: Date.now() - start, detail: `${c} labs` }) } catch { services.push({ name: "Cyber Labs", status: "degraded", latency: Date.now() - start }) }
  try { const c = await db.exam.count(); services.push({ name: "Exams", status: "operational", latency: Date.now() - start, detail: `${c} exams` }) } catch { services.push({ name: "Exams", status: "degraded", latency: Date.now() - start }) }
  try { const c = await db.siteContent.count(); services.push({ name: "CMS", status: "operational", latency: Date.now() - start, detail: `${c} items` }) } catch { services.push({ name: "CMS", status: "degraded", latency: Date.now() - start }) }
  try { const c = await db.guardianCredential.count(); services.push({ name: "Certifications", status: "operational", latency: Date.now() - start, detail: `${c} credentials` }) } catch { services.push({ name: "Certifications", status: "degraded", latency: Date.now() - start }) }
  try { const c = await db.lead.count(); services.push({ name: "CRM", status: "operational", latency: Date.now() - start, detail: `${c} leads` }) } catch { services.push({ name: "CRM", status: "degraded", latency: Date.now() - start }) }
  // Lab orchestrator (only meaningful when configured)
  try {
    const { ORCHESTRATOR_URL } = await import("@/lib/orchestrator")
    const startO = Date.now()
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 1500)
    const res = await fetch(`${ORCHESTRATOR_URL}/health`, { signal: ctrl.signal, cache: "no-store" }).catch(() => null)
    clearTimeout(timer)
    if (res?.ok) {
      const d = await res.json().catch(() => null)
      services.push({
        name: "Lab Orchestrator",
        status: "operational",
        latency: Date.now() - startO,
        detail: d?.mode ? `${d.mode}${typeof d.activeSessions === "number" ? ` · ${d.activeSessions} active` : ""}` : undefined,
      })
    } else {
      services.push({ name: "Lab Orchestrator", status: "down", latency: Date.now() - startO, detail: "unreachable" })
    }
  } catch {
    services.push({ name: "Lab Orchestrator", status: "down", latency: -1, detail: "unreachable" })
  }
  // Email (configuration check — no test send)
  try {
    const { getSettings } = await import("@/lib/settings")
    const s = await getSettings(["SMTP_HOST", "SMTP_USER"])
    const configured = !!(s.SMTP_HOST && s.SMTP_USER)
    services.push({ name: "Email (SMTP)", status: configured ? "operational" : "degraded", latency: 0, detail: configured ? "configured" : "not configured" })
  } catch {
    services.push({ name: "Email (SMTP)", status: "degraded", latency: 0, detail: "check failed" })
  }

  const overall = services.every(s => s.status === "operational") ? "operational" : services.some(s => s.status === "down") ? "down" : "degraded"
  if (!isAdmin) {
    // Minimal public shape — statuses only, no counts, no latencies
    return NextResponse.json({
      overall,
      services: services.map((s) => ({ name: s.name, status: s.status })),
      timestamp: new Date().toISOString(),
    })
  }
  return NextResponse.json({ overall, services, timestamp: new Date().toISOString() })
}
