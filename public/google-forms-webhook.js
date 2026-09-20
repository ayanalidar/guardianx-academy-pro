/**
 * GuardianX Academy — Google Forms Webhook Script
 * 
 * HOW TO SET UP:
 * 1. Create a Google Form at https://forms.new
 * 2. Add these questions (exact titles recommended):
 *    - Name (Short answer)
 *    - Email (Short answer)
 *    - Phone (Short answer)
 *    - Organization (Short answer)
 *    - Type (Multiple choice: School, College, University, Corporate, Individual)
 *    - Requirement (Paragraph)
 *    - Message (Paragraph)
 * 3. In your Google Form, click the 3-dot menu → Script Editor
 * 4. Delete the default code and paste this entire script
 * 5. Click the "Save" icon
 * 6. Click "Run" → "setupTriggers" and grant permissions
 * 7. Your form responses will now automatically sync to GuardianX CRM
 * 
 * WEBHOOK URL: https://academy.guardianx.cloud/api/crm/webhook
 * WEBHOOK TOKEN: (SECRET) — ask the platform admin for the current value of
 *   CRM_WEBHOOK_SECRET and paste it below. Never commit real tokens to git.
 */

var WEBHOOK_URL = "https://academy.guardianx.cloud/api/crm/webhook";
var WEBHOOK_TOKEN = ""; // paste CRM_WEBHOOK_SECRET here (do NOT commit real values)

// BATCH-SPECIFIC: Set these to auto-tag leads with the correct batch
// When creating a Google Form for a specific batch, set these variables
// to the batch name and certification. All leads from this form will be
// tagged with this batch info automatically.
var BATCH_NAME = "";  // e.g. "CEH Weekend Batch - Nov 2025"
var BATCH_CERT = "";  // e.g. "CEH"

function setupTriggers() {
  // Remove existing triggers
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });
  
  // Create new trigger on form submit
  ScriptApp.newTrigger("onFormSubmit")
    .forForm(FormApp.getActiveForm())
    .onFormSubmit()
    .create();
  
  Logger.log("Trigger set up successfully! Form responses will now sync to GuardianX CRM.");
}

/**
 * BACKFILL — run this ONCE to sync ALL existing form responses
 * (Apps Script triggers only fire on NEW submissions, so responses
 * collected before setup never reach the CRM). Run it from the
 * Apps Script editor: select backfillAllResponses → Run.
 */
function backfillAllResponses() {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var sent = 0, failed = 0;

  for (var i = 0; i < responses.length; i++) {
    var ok = submitResponse_(responses[i]);
    if (ok) sent++; else failed++;
    // Small delay so we never hammer the webhook / trip its rate limit.
    Utilities.sleep(300);
  }
  Logger.log("Backfill complete: " + sent + " synced, " + failed + " failed of " + responses.length + " total responses.");
}

/** Shared submit used by both the live trigger and the backfill. */
function submitResponse_(response) {
  try {
    var itemResponses = response.getItemResponses();

    var lead = {
      name: "",
      email: "",
      phone: "",
      organization: "",
      type: "Individual",
      requirement: "",
      message: ""
    };

    itemResponses.forEach(function(itemResponse) {
      var question = itemResponse.getItem().getTitle().toLowerCase();
      var answer = itemResponse.getResponse();

      if (question.indexOf("name") !== -1) {
        lead.name = answer;
      } else if (question.indexOf("email") !== -1) {
        lead.email = answer;
      } else if (question.indexOf("phone") !== -1 || question.indexOf("mobile") !== -1 || question.indexOf("contact") !== -1) {
        lead.phone = answer;
      } else if (question.indexOf("organization") !== -1 || question.indexOf("organisation") !== -1 || question.indexOf("institute") !== -1 || question.indexOf("institution") !== -1 || question.indexOf("school") !== -1 || question.indexOf("college") !== -1 || question.indexOf("university") !== -1 || question.indexOf("company") !== -1) {
        lead.organization = answer;
      } else if (question.indexOf("type") !== -1) {
        lead.type = answer;
      } else if (question.indexOf("requirement") !== -1 || question.indexOf("need") !== -1 || question.indexOf("interest") !== -1 || question.indexOf("course") !== -1 || question.indexOf("training") !== -1) {
        lead.requirement = answer;
      } else if (question.indexOf("message") !== -1 || question.indexOf("query") !== -1 || question.indexOf("question") !== -1 || question.indexOf("comment") !== -1) {
        lead.message = answer;
      }
    });

    if (BATCH_NAME) {
      lead.batchName = BATCH_NAME;
      lead.certification = BATCH_CERT;
      if (!lead.requirement) {
        lead.requirement = "Enrollment for " + BATCH_NAME + " (" + BATCH_CERT + ")";
      }
    }

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

    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();

    if (responseCode === 200 || responseCode === 201) {
      Logger.log("Lead synced successfully: " + lead.name + " (" + lead.email + ")");
      return true;
    } else {
      Logger.log("Webhook failed. Code: " + responseCode + ", Response: " + responseText);
      return false;
    }

  } catch (error) {
    Logger.log("Error in onFormSubmit: " + error.toString());
    return false;
  }
}

function onFormSubmit(e) {
  if (e && e.response) {
    submitResponse_(e.response);
  }
}

/**
 * Test function — run this manually to test the webhook
 */
function testWebhook() {
  var testLead = {
    token: WEBHOOK_TOKEN,
    formId: "test-form",
    lead: {
      name: "Test Lead",
      email: "test@academy.guardianx.cloud",
      phone: "+91 98765 43210",
      organization: "Test School",
      type: "School",
      requirement: "Cybersecurity training for students",
      message: "This is a test lead from Google Apps Script"
    }
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(testLead),
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
  Logger.log("Test response: " + response.getResponseCode() + " - " + response.getContentText());
}
