import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { notifyAdmins, leadNotificationEmailTemplate, sendEmail, emailSocialLinksHtml } from "@/lib/email"
import { getSetting } from "@/lib/settings"
import { ensureTable } from "@/lib/db-safe"
import { parseBodyLoose, extractWebhookToken, normalizeLeadFields } from "@/lib/webhook-parse"

export const runtime = "nodejs"

/* POST /api/crm/batch-webhook
 *
 * Google Apps Script webhook receiver for per-batch Google Forms.
 * When a batch's Google Form is submitted, the per-batch Apps Script
 * sends the response here with the batchId baked in.
 *
 * Accepts (in order of preference):
 *   - JSON body { token, formId, lead: { batchId, batchName, name, whatsappNumber, email?, ... } }
 *   - JSON body with the fields flat at the top level
 *   - application/x-www-form-urlencoded posts (Apps Script default)
 *   - positional e.values arrays (body.values or body.lead as array)
 * Token may come from body.token, the x-webhook-token header, or ?token=.
 *
 * batchId may be omitted IF batchName matches exactly one batch (the
 * generated scripts bake the id in; hand-written scripts often only
 * know the name).
 *
 * Creates a BatchLead record linked to the correct batch.
 * No auth - the webhook URL + token provide security.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await parseBodyLoose(req)
    if (!body) return NextResponse.json({ error: "Invalid body - send JSON or form data" }, { status: 400 })

    // SECURITY: verify the webhook secret. There is NO hardcoded fallback -
    // the previous default ("guardianx-crm-webhook-2025") was shipped in a
    // public file and let anyone inject leads / email-bomb admins.
    // Set CRM_WEBHOOK_SECRET (env or Platform Settings). The Leads Hub shows
    // it to admins and bakes it into every generated Apps Script.
    const { timingSafeEqual } = await import("crypto")
    const webhookSecret = await getSetting("CRM_WEBHOOK_SECRET")
    if (!webhookSecret) {
      console.error("[batch-webhook] CRM_WEBHOOK_SECRET not configured - rejecting webhook")
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
    }
    const provided = extractWebhookToken(req, body)
    const a = Buffer.from(webhookSecret)
    const b = Buffer.from(provided)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      console.error("[batch-webhook] rejected: invalid webhook token")
      return NextResponse.json({ error: "Invalid webhook token - regenerate your Apps Script from the Leads Hub so it carries the current token" }, { status: 401 })
    }
    // Rate limit per IP (spam/DoS protection on an unauthenticated endpoint)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const { rateLimit } = await import("@/lib/session")
    if (!rateLimit(`crm-webhook:${ip}`, { max: 30, windowMs: 60 * 1000 })) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    // Normalize whatever shape arrived into a lead-shaped object.
    const norm = normalizeLeadFields(body)
    const name = norm.name
    const whatsapp = norm.phone // alias map treats WhatsApp/phone/mobile identically
    const email = norm.email.toLowerCase() || ""

    // Resolve the batch: prefer the baked-in batchId; fall back to an exact
    // (case-insensitive) batch name match when it identifies exactly one row.
    let batch = norm.batchId
      ? await db.trainingBatch.findUnique({
          where: { id: norm.batchId },
          select: { id: true, name: true, certification: true, schedule: true, startDate: true, mode: true },
        })
      : null
    if (!batch && norm.batchName) {
      const matches = await db.trainingBatch.findMany({
        where: { name: { equals: norm.batchName, mode: "insensitive" } },
        select: { id: true, name: true, certification: true, schedule: true, startDate: true, mode: true },
        take: 2,
      })
      if (matches.length === 1) batch = matches[0]
    }
    if (!batch) {
      return NextResponse.json(
        {
          error: "Batch not found - include the batchId baked into the per-batch Apps Script (Leads Hub → Batch Enrollments → Lead Capture Script), or an exact batch name",
          receivedBatchId: norm.batchId || null,
          receivedBatchName: norm.batchName || null,
        },
        { status: 404 },
      )
    }

    if (!name && !whatsapp && !email) {
      return NextResponse.json(
        { error: "Could not find a name, WhatsApp number or email in the payload - check the generated Apps Script maps your form questions" },
        { status: 400 },
      )
    }

    // Self-heal the table so the create below can't fail on schema drift
    // (memoized per instance - a no-op after the first call).
    try {
      await ensureTable("BatchLead")
    } catch (healErr) {
      console.error("[batch-webhook] ensureTable self-heal failed:", healErr)
    }

    // Create the BatchLead. whatsappNumber is NOT NULL in the schema - when a
    // form only collected an email we store a placeholder instead of losing
    // the lead entirely.
    const batchLead = await db.batchLead.create({
      data: {
        batchId: batch.id,
        name: (name || email || "Unknown").trim(),
        whatsappNumber: (whatsapp || "-").trim(),
        email: email || null,
        linkedinProfile: norm.linkedinProfile || null,
        professionalStatus: norm.professionalStatus || null,
        jobRole: norm.jobRole || null,
        source: "Google Form",
      },
    })

    // --- email notification to admins ---
    await notifyAdmins(
      `New Batch Lead - ${batch.name} (${batch.certification}) - ${batchLead.name}`,
      leadNotificationEmailTemplate(`Batch Lead - ${batch.name}`, [
        { label: "Name", value: batchLead.name },
        { label: "WhatsApp", value: batchLead.whatsappNumber },
        { label: "Email", value: batchLead.email || " - " },
        { label: "LinkedIn", value: batchLead.linkedinProfile || " - " },
        { label: "Status", value: batchLead.professionalStatus || " - " },
        { label: "Job role", value: batchLead.jobRole || " - " },
        { label: "Batch", value: `${batch.name} (${batch.certification})` },
      ]),
    ).catch((err) => console.error("[batch-webhook] admin notify failed (lead captured ok):", err))

    // --- send confirmation email to the candidate when we have an address ---
    if (email && email.includes("@")) {
      await sendEmail({
        to: email,
        subject: `Registration received - ${batch.name} | GuardianX Academy`,
        html: `
<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; padding: 40px; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Guardian<span style="color: #a78bfa;">X</span> Academy</h1>
  </div>
  <h2 style="color: #ffffff; font-size: 18px; margin-bottom: 16px;">Registration Received ✅</h2>
  <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">Hi ${String(batchLead.name ?? "").trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")},</p> <!-- audit fix C-12: HTML-escaped -->
  <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">We've received your registration for <strong style="color: #a78bfa;">${batch.name}</strong> (${batch.certification}). Our team will contact you within 24 hours to complete the enrollment process.</p>
  <div style="background: #11111a; border-radius: 8px; padding: 16px; margin: 24px 0;">
    <p style="color: #6b7280; font-size: 12px; margin: 0;">Batch details:</p>
    <p style="color: #ffffff; font-size: 14px; margin: 4px 0 0 0;">${batch.name}</p>
    <p style="color: #9ca3af; font-size: 12px; margin: 2px 0 0 0;">${batch.schedule || ""} · ${batch.startDate || ""} · ${batch.mode}</p>
  </div>
  <p style="color: #6b7280; font-size: 12px;">If you have questions, WhatsApp us or email hello@guardianx.in</p>
  <hr style="border: none; border-top: 1px solid #1f2937; margin: 24px 0;" />
  <p style="color: #4b5563; font-size: 11px; text-align: center; margin: 0 0 4px;">GuardianX Academy · <a href="https://academy.guardianx.cloud" style="color: #6b7280; text-decoration: none;">academy.guardianx.cloud</a></p>
  ${emailSocialLinksHtml("dark")}
</div>
`,
      }).catch((err) => console.error("[batch-webhook] candidate confirm email failed (lead captured ok):", err))
    }

    console.log(`[batch-webhook] lead captured: ${batchLead.name} → batch ${batch.name} (${batch.id})`)
    return NextResponse.json({ ok: true, id: batchLead.id, batch: batch.name }, { status: 201 })
  } catch (error: any) {
    // If it's a unique constraint (duplicate submission), return a friendly error
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Duplicate lead - this form has already been submitted" }, { status: 409 })
    }
    console.error("[batch-webhook] Error:", error?.message || error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Health/debug probe: confirms reachability without touching the DB.
export async function GET() {
  const webhookSecret = await getSetting("CRM_WEBHOOK_SECRET")
  return NextResponse.json({ ok: true, webhook: "batch-webhook", configured: !!webhookSecret })
}
