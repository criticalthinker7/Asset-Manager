/**
 * CanGrants wishlist — Google Apps Script
 *
 * Setup:
 * 1. Create a Google Sheet with header row (row 1):
 *    timestamp | name | email | city | country | source
 * 2. Extensions → Apps Script → paste this file → Save
 * 3. (Optional) Project Settings → Script properties → add WISHLIST_SECRET
 * 4. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web app URL into Vercel as VITE_WISHLIST_ENDPOINT
 */

function doPost(e) {
  try {
    const raw = e.postData ? e.postData.contents : "{}";
    const data = JSON.parse(raw);

    var expectedSecret = PropertiesService.getScriptProperties().getProperty("WISHLIST_SECRET");
    if (expectedSecret && data.secret !== expectedSecret) {
      return jsonResponse({ ok: false, error: "Unauthorized" });
    }

    if (data.website) {
      return jsonResponse({ ok: true });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.appendRow([
      new Date().toISOString(),
      String(data.name || "").trim(),
      String(data.email || "").trim(),
      String(data.city || "").trim(),
      String(data.country || "").trim(),
      String(data.source || "").trim(),
    ]);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
