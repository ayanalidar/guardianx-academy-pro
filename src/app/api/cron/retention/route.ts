import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* GET|POST /api/cron/retention - DPDPA retention enforcement (audit fixes D-05, D-10)
 * -----------------------------------------------------------------------------------
 * Daily Vercel Cron job that enforces the retention windows the privacy
 * policy already promises. Currently:
 *   - Proctoring sessions older than 90 days  -> flags JSON scrubbed to "[]"
 *     (the privacy notice commits to 90-day proctoring retention)
 *   - Affiliate clicks older than 90 days     -> ip + userAgent blanked
 *     (IP addresses are personal data; click counts stay for attribution)
 *
 * Secured with CRON_SECRET (same model as /api/cron/emi-reminders):
 * Vercel sends "Authorization: Bearer <CRON_SECRET>". Refuses to run
 * unprotected when CRON_SECRET is not configured.
 *
 * Add to vercel.json crons: { "path": "/api/cron/retention", "schedule": "30 4 * * *" }
 */

const RETENTION_DAYS = 90

function cutoff(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

async function runRetention(): Promise<Record<string, number | string>> {
  const results: Record<string, number | string> = {}

  // 1. Proctoring data: the policy promises 90-day retention. Scrub the
  //    violation-flag history; keep the session row so attempt integrity
  //    checks (identityVerified etc.) still resolve.
  try {
    const proctored = await db.proctoringSession.updateMany({
      where: { createdAt: { lt: cutoff(RETENTION_DAYS) }, flags: { not: "[]" } },
      data: { flags: "[]" },
    })
    results.proctoringFlagsScrubbed = proctored.count
  } catch (e: any) {
    results.proctoringError = String(e?.message ?? e).slice(0, 200)
  }

  // 2. Affiliate click PII (D-10): blank IP + user agent past 90 days.
  try {
    const clicks = await db.affiliateClick.updateMany({
      where: {
        createdAt: { lt: cutoff(RETENTION_DAYS) },
        OR: [{ ip: { not: "" } }, { userAgent: { not: "" } }],
      },
      data: { ip: "", userAgent: "" },
    })
    results.affiliateClicksAnonymised = clicks.count
  } catch (e: any) {
    results.affiliateClickError = String(e?.message ?? e).slice(0, 200)
  }

  return results
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // refuse to run unprotected
  const header = req.headers.get("authorization") || ""
  return header === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const results = await runRetention()
  return NextResponse.json({ ok: true, retentionDays: RETENTION_DAYS, ...results })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
