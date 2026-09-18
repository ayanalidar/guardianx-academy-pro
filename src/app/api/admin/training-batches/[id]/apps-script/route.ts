import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireAdmin, withErrorHandler } from "@/lib/session"

export const runtime = "nodejs"

/* GET /api/admin/training-batches/[id]/apps-script
 * ADMIN-only. Generates a customized Google Apps Script (.gs) file for
 * this specific batch. The script has BATCH_ID + BATCH_NAME + BATCH_CERT
 * baked in so the admin doesn't need to manually edit anything.
 *
 * Returns: text/plain (the .gs file content) with a Content-Disposition
 * header so the browser downloads it as a file.
 *
 * The form questions the script maps:
 *   1. Name
 *   2. WhatsApp number with country code
 *   3. LinkedIn profile link
 *   4. Current professional status
 *   5. Current job role or designation
 */
export const GET = withErrorHandler(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const currentUser = await requireAdmin()
  if (currentUser instanceof NextResponse) return currentUser

  const { id } = await params
  const batch = await db.trainingBatch.findUnique({
    where: { id },
    select: { id: true, name: true, certification: true },
  })
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 })

  const webhookUrl = `${process.env.NEXTAUTH_URL || "https://academy.guardianx.cloud"}/api/crm/batch-webhook`
  // Secret comes from Platform Settings (DB) or env — never a hardcoded default.
  const { getSetting } = await import("@/lib/settings")
  const webhookToken = (await getSetting("CRM_WEBHOOK_SECRET")) || process.env.CRM_WEBHOOK_SECRET || ""
  if (!webhookToken) {
    return NextResponse.json(
      { error: "CRM_WEBHOOK_SECRET is not configured. Set it in Admin → Settings before generating webhook scripts." },
      { status: 503 }
    )
  }
  const slug = batch.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || batch.id
  const fileName = `guardianx-batch-${slug}.gs`

  // Build the Apps Script content with the batch values baked in
  const script = `/**
 * GuardianX Academy — Per-Batch Google Forms Webhook Script
 * Batch: ${batch.name} (${batch.certification})
 * Generated: ${new Date().toISOString()}
 *
 * HOW TO SET UP:
 * 1. Create a Google Form at https://forms.new
 * 2. Add these questions (exact titles recommended):
 *    - Name (Short answer)
 *    - WhatsApp number with country code (Short answer)
 *    - LinkedIn profile link (Short answer)
 *    - Current professional status (Multiple choice: Student, Working Professional, Freelancer, Job Seeker, Other)
 *    - Current job role or designation (Short answer)
 * 3. In your Google Form, click the 3-dot menu → Script Editor
 * 4. Delete the default code and paste this entire script
 * 5. Click the "Save" icon
 * 6. Click "Run" → "setupTriggers" and grant permissions
 * 7. Your form responses will now automatically sync to this batch's leads
 * 8. Copy the Google Form URL and paste it into the batch's "Google Form URL"
 *    field in the GuardianX admin panel
 *
 * WEBHOOK URL: ${webhookUrl}
 * BATCH: ${batch.name} (${batch.certification})
 * BATCH ID: ${batch.id}
 */

var WEBHOOK_URL = "${webhookUrl}";
var WEBHOOK_TOKEN = "${webhookToken}";

// Baked-in batch identifiers — DO NOT EDIT (auto-generated per batch)
var BATCH_ID = "${batch.id}";
var BATCH_NAME = ${JSON.stringify(batch.name)};
var BATCH_CERT = ${JSON.stringify(batch.certification)};

function setupTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("onFormSubmit")
    .forForm(FormApp.getActiveForm())
    .onFormSubmit()
    .create();
  Logger.log("Trigger set up! Leads will sync to batch: " + BATCH_NAME);
}

function onFormSubmit(e) {
  try {
    var response = e.response;
    var itemResponses = response.getItemResponses();

    var lead = {
      batchId: BATCH_ID,
      batchName: BATCH_NAME,
      certification: BATCH_CERT,
      name: "",
      whatsappNumber: "",
      linkedinProfile: "",
      professionalStatus: "",
      jobRole: ""
    };

    itemResponses.forEach(function(itemResponse) {
      var question = itemResponse.getItem().getTitle().toLowerCase();
      var answer = itemResponse.getResponse();
      if (typeof answer === "object") answer = answer.join(", ");

      if (question.indexOf("name") !== -1) {
        lead.name = answer;
      } else if (question.indexOf("whatsapp") !== -1 || (question.indexOf("phone") !== -1 && question.indexOf("country") !== -1)) {
        lead.whatsappNumber = answer;
      } else if (question.indexOf("linkedin") !== -1) {
        lead.linkedinProfile = answer;
      } else if (question.indexOf("professional status") !== -1 || question.indexOf("status") !== -1) {
        lead.professionalStatus = answer;
      } else if (question.indexOf("job role") !== -1 || question.indexOf("designation") !== -1 || question.indexOf("role") !== -1) {
        lead.jobRole = answer;
      }
    });

    var payload = {
      token: WEBHOOK_TOKEN,
      formId: FormApp.getActiveForm().getId(),
      lead: lead
    };

    var options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var resp = UrlFetchApp.fetch(WEBHOOK_URL, options);
    if (resp.getResponseCode() === 200 || resp.getResponseCode() === 201) {
      Logger.log("Lead synced: " + lead.name + " → batch: " + BATCH_NAME);
    } else {
      Logger.log("Webhook failed. Code: " + resp.getResponseCode() + ", Response: " + resp.getContentText());
    }
  } catch (error) {
    Logger.log("Error: " + error.toString());
  }
}

function testWebhook() {
  var testLead = {
    batchId: BATCH_ID,
    batchName: BATCH_NAME,
    certification: BATCH_CERT,
    name: "Test Lead",
    whatsappNumber: "+91 98765 43210",
    linkedinProfile: "https://linkedin.com/in/test",
    professionalStatus: "Working Professional",
    jobRole: "Software Engineer"
  };
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ token: WEBHOOK_TOKEN, formId: "test", lead: testLead }),
    muteHttpExceptions: true
  };
  var resp = UrlFetchApp.fetch(WEBHOOK_URL, options);
  Logger.log("Test response: " + resp.getResponseCode() + " - " + resp.getContentText());
}
`

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
})
