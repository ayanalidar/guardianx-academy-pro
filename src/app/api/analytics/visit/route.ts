import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ensureTable, isDriftError } from "@/lib/db-safe"

export const runtime = "nodejs"

/* ============================================================
   POST /api/analytics/visit - footer visitor counter ping.

   The client generates an ANONYMOUS random id (crypto.randomUUID)
   in localStorage - no PII, no fingerprinting, no IP storage. One
   row per (visitorId, UTC day); the same POST returns the current
   aggregates so the footer can paint them in one round-trip.

   Aggregates:
     total  - distinct visitorIds ever
     today  - distinct visitorIds today (UTC)
     online - distinct visitorIds with lastSeen < 5 min ago

   GET returns the same aggregates without recording a visit.
   ============================================================ */

const VISITOR_ID_RE = /^[A-Za-z0-9_-]{8,64}$/
const ONLINE_WINDOW_MS = 5 * 60 * 1000

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

type Aggregates = { total: number; today: number; online: number }

async function readAggregates(): Promise<Aggregates> {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS)
  const rows = await db.$queryRaw<{ total: bigint; today: bigint; online: bigint }[]>`
    SELECT
      COUNT(DISTINCT "visitorId") AS total,
      COUNT(DISTINCT CASE WHEN "day" = ${todayUtc()} THEN "visitorId" END) AS today,
      COUNT(DISTINCT CASE WHEN "lastSeen" > ${since} THEN "visitorId" END) AS online
    FROM "SiteVisit"`
  const r = rows[0]
  return {
    total: Number(r?.total ?? 0),
    today: Number(r?.today ?? 0),
    online: Number(r?.online ?? 0),
  }
}

async function recordVisit(visitorId: string): Promise<void> {
  await db.siteVisit.upsert({
    where: { visitorId_day: { visitorId, day: todayUtc() } },
    create: { visitorId, day: todayUtc() },
    update: { views: { increment: 1 }, lastSeen: new Date() },
  })
}

export async function handle(req: NextRequest, record: boolean) {
  let visitorId = ""
  if (record) {
    const body = (await req.json().catch(() => null)) as { visitorId?: unknown } | null
    const raw = typeof body?.visitorId === "string" ? body.visitorId.trim() : ""
    if (!VISITOR_ID_RE.test(raw)) {
      return NextResponse.json({ error: "visitorId missing or malformed" }, { status: 400 })
    }
    visitorId = raw
  }

  try {
    await ensureTable("SiteVisit")
    if (record) await recordVisit(visitorId)
    const aggregates = await readAggregates()
    return NextResponse.json(aggregates)
  } catch (e) {
    if (isDriftError(e)) {
      try {
        await ensureTable("SiteVisit", true)
        if (record) await recordVisit(visitorId)
        const aggregates = await readAggregates()
        return NextResponse.json(aggregates)
      } catch (e2) {
        console.error("[visit] self-heal retry failed:", e2)
        return NextResponse.json({ error: "visit tracking unavailable" }, { status: 503 })
      }
    }
    console.error("[visit] failed:", e)
    return NextResponse.json({ error: "visit tracking unavailable" }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  return handle(req, true)
}

export async function GET() {
  return handle(
    new NextRequest("http://local/health", { method: "GET" }),
    false,
  )
}
