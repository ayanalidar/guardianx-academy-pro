import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSetting } from "@/lib/settings"
import { ensureTable, isDriftError } from "@/lib/db-safe"
import { parseBodyLoose, extractWebhookToken, normalizeLeadFields } from "@/lib/webhook-parse"

export const runtime = "nodejs"

/* ============================================================
   POST /api/crm/webhook - general lead capture (Google Apps Script).

   Accepts (in order of preference):
     - JSON body { token, formId, lead: { name, email, phone, ... } }
     - JSON body with the fields flat at the top level
     - application/x-www-form-urlencoded posts (Apps Script default)
     - positional e.values arrays (body.values or body.lead as array)
   Token may come from body.token, the x-webhook-token header, or ?token=.
   Common field aliases (WhatsApp/phone/mobile, fullName/name, ...) are
   mapped automatically - see src/lib/webhook-parse.ts.

   Leads are deduped by email below; the requirement/message lands as the
   first note. The Leads Hub (Admin → Leads Hub) shows the current token
   and can test this endpoint with one click.
   ============================================================ */

export async function POST(req: NextRequest) {
  const body = await parseBodyLoose(req)
  if (!body) {
    return NextResponse.json({ error: "Invalid body - send JSON or form data" }, { status: 400 })
  }

  // SECURITY: verify the webhook secret. There is NO hardcoded fallback -
  // the previous default ("guardianx-crm-webhook-2025") was shipped in a
  // public file and let anyone inject leads / email-bomb admins.
  // Set CRM_WEBHOOK_SECRET (env or Platform Settings). The Leads Hub shows
  // it to admins and bakes it into every generated Apps Script.
  const { timingSafeEqual } = await import("crypto")
  const webhookSecret = await getSetting("CRM_WEBHOOK_SECRET")
  if (!webhookSecret) {
    console.error("[crm/webhook] CRM_WEBHOOK_SECRET not configured - rejecting webhook")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  }
  const provided = extractWebhookToken(req, body)
  const a = Buffer.from(webhookSecret)
  const b = Buffer.from(provided)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    console.error("[crm/webhook] rejected: invalid webhook token")
    return NextResponse.json({ error: "Invalid webhook token - copy the current token from the Leads Hub capture card" }, { status: 401 })
  }
  // Rate limit per IP (spam/DoS protection on an unauthenticated endpoint)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const { rateLimit } = await import("@/lib/session")
  if (!rateLimit(`crm-webhook:${ip}`, { max: 30, windowMs: 60 * 1000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  // Normalize whatever shape arrived into a lead-shaped object.
  const lead = normalizeLeadFields(body)

  if (!lead.name && !lead.email) {
    return NextResponse.json({ error: "At least name or email required" }, { status: 400 })
  }

  try {
    // Self-heal the CRM trio so writes below can't fail on schema drift
    // (memoized per instance - a no-op after the first call).
    try {
      await ensureTable("Lead")
      await ensureTable("LeadNote")
      await ensureTable("LeadStatusHistory")
    } catch (healErr) {
      console.error("[crm/webhook] ensureTable self-heal failed:", healErr)
    }

    // Determine lead type and score
    const leadType = lead.type || "Individual"
    const score = calculateLeadScore(leadType, lead.requirement || "")

    // Check if lead already exists (by email)
    const existing = lead.email
      ? await db.lead.findFirst({ where: { email: lead.email.toLowerCase() } })
      : null

    if (existing) {
      // Update existing lead with new info
      const updated = await db.lead.update({
        where: { id: existing.id },
        data: {
          name: lead.name || existing.name,
          phone: lead.phone || existing.phone,
          organization: lead.organization || existing.organization,
          source: "Google Form",
          score,
        },
      })

      await db.leadStatusHistory.create({
        data: {
          leadId: existing.id,
          fromStatus: existing.status,
          toStatus: existing.status,
        },
      }).catch((err) => console.error("[crm/webhook] history write failed (lead updated ok):", err))

      console.log(`[crm/webhook] lead updated: ${updated.name} (${updated.id})`)
      return NextResponse.json({ success: true, action: "updated", leadId: existing.id })
    }

    // Create new lead
    const newLead = await db.lead.create({
      data: {
        name: lead.name || "Unknown",
        email: lead.email.toLowerCase() || null,
        phone: lead.phone || null,
        organization: lead.organization || null,
        type: leadType,
        status: "New",
        source: "Google Form",
        score,
      },
    })

    // Add the requirement/message as a note
    if (lead.requirement) {
      await db.leadNote.create({
        data: {
          leadId: newLead.id,
          content: lead.requirement,
          authorId: null,
        },
      }).catch((err) => console.error("[crm/webhook] note write failed (lead created ok):", err))
    }

    await db.leadStatusHistory.create({
      data: {
        leadId: newLead.id,
        fromStatus: null,
        toStatus: "New",
      },
    }).catch((err) => console.error("[crm/webhook] history write failed (lead created ok):", err))

    console.log(`[crm/webhook] lead captured: ${newLead.name} (${newLead.id})`)
    return NextResponse.json({ success: true, action: "created", leadId: newLead.id }, { status: 201 })
  } catch (err) {
    console.error("[crm/webhook] error:", err)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

// Health/debug probe: confirms reachability without touching the DB.
export async function GET() {
  const webhookSecret = await getSetting("CRM_WEBHOOK_SECRET")
  return NextResponse.json({ ok: true, webhook: "crm", configured: !!webhookSecret, hint: "POST the lead payload with the CRM_WEBHOOK_SECRET token" })
}

function calculateLeadScore(type: string, requirement: string): number {
  let score = 0
  const typeScores: Record<string, number> = {
    University: 40, College: 35, Corporate: 30, School: 25, Partner: 20, Individual: 10,
  }
  score += typeScores[type] || 10

  const req = requirement.toLowerCase()
  if (req.includes("mou") || req.includes("partnership")) score += 20
  if (req.includes("bulk") || req.includes("batch") || req.includes("cohort")) score += 15
  if (req.includes("certification") || req.includes("ceh") || req.includes("cissp")) score += 10
  if (req.includes("campus") || req.includes("on-campus") || req.includes("on-premises")) score += 10
  if (req.includes("budget") || req.includes("funded")) score += 15

  return Math.min(100, score)
}
