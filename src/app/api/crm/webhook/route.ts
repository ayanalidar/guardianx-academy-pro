import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSetting } from "@/lib/settings"

export const runtime = "nodejs"

/**
 * POST /api/crm/webhook
 * 
 * Google Apps Script webhook receiver.
 * When a Google Form is submitted, the Apps Script sends the response here.
 * 
 * No auth required - the webhook URL contains a secret token for security.
 * 
 * Expected body shape (from Google Apps Script):
 * {
 *   "token": "your-webhook-secret",
 *   "formId": "form-id-from-google",
 *   "lead": {
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "phone": "+91 XXXXX XXXXX",
 *     "organization": "Delhi Public School",
 *     "type": "School",
 *     "requirement": "Cybersecurity training for grades 9-12",
 *     "message": "Additional details..."
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    // SECURITY: verify the webhook secret. There is NO hardcoded fallback - 
    // the previous default ("guardianx-crm-webhook-2025") was shipped in a
    // public file and let anyone inject leads / email-bomb admins.
    // Set CRM_WEBHOOK_SECRET (env or Platform Settings) and share it with
    // the Google Apps Script out-of-band.
    const { timingSafeEqual } = await import("crypto")
    const webhookSecret = await getSetting("CRM_WEBHOOK_SECRET")
    if (!webhookSecret) {
      console.error("[crm/webhook] CRM_WEBHOOK_SECRET not configured - rejecting webhook")
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
    }
    const provided = typeof body.token === "string" ? body.token : ""
    const a = Buffer.from(webhookSecret)
    const b = Buffer.from(provided)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "Invalid webhook token" }, { status: 401 })
    }
    // Rate limit per IP (spam/DoS protection on an unauthenticated endpoint)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const { rateLimit } = await import("@/lib/session")
    if (!rateLimit(`crm-webhook:${ip}`, { max: 30, windowMs: 60 * 1000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const lead = body.lead || body

    if (!lead.name && !lead.email) {
      return NextResponse.json({ error: "At least name or email required" }, { status: 400 })
    }

    // Determine lead type and score
    const leadType = lead.type || lead.organization_type || "Individual"
    const score = calculateLeadScore(leadType, lead.requirement || lead.message || "")

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
      }).catch(() => {})

      return NextResponse.json({ success: true, action: "updated", leadId: existing.id })
    }

    // Create new lead
    const newLead = await db.lead.create({
      data: {
        name: lead.name || "Unknown",
        email: (lead.email || "").toLowerCase() || null,
        phone: lead.phone || null,
        organization: lead.organization || null,
        type: leadType,
        status: "New",
        source: "Google Form",
        score,
      },
    })

    // Add the requirement/message as a note
    const requirementText = lead.requirement || lead.message
    if (requirementText) {
      await db.leadNote.create({
        data: {
          leadId: newLead.id,
          content: requirementText,
          authorId: null,
        },
      }).catch(() => {})
    }

    await db.leadStatusHistory.create({
      data: {
        leadId: newLead.id,
        fromStatus: null,
        toStatus: "New",
      },
    }).catch(() => {})

    return NextResponse.json({ success: true, action: "created", leadId: newLead.id }, { status: 201 })
  } catch (err) {
    console.error("[crm/webhook] error:", err)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
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
