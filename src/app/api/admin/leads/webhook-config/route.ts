import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"
import { getSetting, clearSettingsCache } from "@/lib/settings"

export const runtime = "nodejs"

/* ============================================================
   GET /api/admin/leads/webhook-config - ADMIN-only.
   Returns the lead-capture webhook configuration so the Leads Hub can
   show it inline (URL + token + copy buttons + one-click test). The
   token is only ever returned to authenticated admins.

   POST { action: "regenerate" } - rotates CRM_WEBHOOK_SECRET. Existing
   Google Apps Scripts keep the OLD token and will start failing with
   401 until they are regenerated from the Leads Hub - the UI warns.
   ============================================================ */

const BASE_URL = process.env.NEXTAUTH_URL || "https://academy.guardianx.cloud"

export const GET = withErrorHandler(async () => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const token = (await getSetting("CRM_WEBHOOK_SECRET")) || ""
  return NextResponse.json({
    configured: !!token,
    token: token || null,
    webhookUrl: `${BASE_URL}/api/crm/webhook`,
    batchWebhookUrl: `${BASE_URL}/api/crm/batch-webhook`,
  })
})

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await requireAdmin()
  if (user instanceof NextResponse) return user

  const body = (await req.json().catch(() => ({}))) as { action?: string }
  if (body?.action !== "regenerate") {
    return NextResponse.json({ error: "Unknown action - use { action: 'regenerate' }" }, { status: 400 })
  }

  const { randomBytes } = await import("crypto")
  const token = randomBytes(24).toString("hex")
  await db.platformSetting.upsert({
    where: { key: "CRM_WEBHOOK_SECRET" },
    create: { key: "CRM_WEBHOOK_SECRET", value: token, category: "crm" },
    update: { value: token },
  })
  clearSettingsCache()

  const who = (user as { email?: string }).email || "admin"
  console.log(`[webhook-config] CRM_WEBHOOK_SECRET rotated by ${who}`)
  return NextResponse.json({ ok: true, token })
})
