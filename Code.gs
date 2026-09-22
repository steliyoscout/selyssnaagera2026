const SPREADSHEET_ID = "1J_ldqeDJ_zYEDu_iB49JJ46yIVrUsOmmulV-VQv2r-w";
const SPREADSHEET_NAME = "Aktiviteter";

const ACTIVITY_NAME = "Se, Lyssna, agera. 2026";
const ACTIVITY_CODE = "SLA";
const SHEET_NAME = "Se, Lyssna, agera 2026";

const SWISH_NUMBER = "1231841493";
const ACTIVITY_AMOUNT = 300;

const ACTIVITY_DATE = "24–25 oktober 2026";
const ACTIVITY_TIME = "24 oktober 08:30 – 25 oktober 13:00";
const ACTIVITY_LOCATION = "Färna";
const ACTIVITY_ADDRESS = "Färna 3, 730 30 Kolsva, Köping";

const ALLOWED_SECTIONS = ["Spårare", "Upptäckare"];

const HEADERS = [
  "Registrerad",
  "Registrerings-ID",
  "Aktivitet",
  "Deltagare",
  "Avdelning",
  "Vårdnadshavare",
  "Vårdnadshavares mobilnummer",
  "E-post",
  "Allergier / sjukdomar / medicin",
  "Mat / allergi / specialkost",
  "Foto och film",
  "Belopp",
  "Swishnummer",
  "Swishmeddelande",
  "Status"
];

function doGet() {
  return HtmlService
    .createTemplateFromFile("Index")
    .evaluate()
    .setTitle(ACTIVITY_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const requestId = clean_(e && e.parameter ? e.parameter.requestId : "");

  try {
    const registration = {
      requestId: requestId,
      fullName: clean_(e.parameter.fullName),
      section: clean_(e.parameter.section),
      guardianName: clean_(e.parameter.guardianName),
      guardianPhone: clean_(e.parameter.guardianPhone),
      email: clean_(e.parameter.email).toLowerCase(),
      healthInfo: clean_(e.parameter.healthInfo),
      foodInfo: clean_(e.parameter.foodInfo),
      photoConsent: clean_(e.parameter.photoConsent)
    };

    validateRegistration_(registration);

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);

    let result;
    try {
      result = saveRegistration_(registration);
    } finally {
      lock.releaseLock();
    }

    try {
      sendConfirmationEmail_(result);
    } catch (emailError) {
      console.error("Bekräftelsemejl kunde inte skickas:", emailError);
    }

    return postMessageResponse_({
      success: true,
      requestId: requestId,
      registrationId: result.registrationId,
      fullName: result.fullName,
      section: result.section,
      amount: ACTIVITY_AMOUNT,
      swishNumber: SWISH_NUMBER,
      message: result.swishMessage
    });

  } catch (error) {
    console.error(error);

    return postMessageResponse_({
      success: false,
      requestId: requestId,
      message: error && error.message
        ? error.message
        : "Ett oväntat fel inträffade."
    });
  }
}

function setupActivity() {
  const spreadsheet = getSpreadsheet_();

  if (spreadsheet.getName() !== SPREADSHEET_NAME) {
    spreadsheet.rename(SPREADSHEET_NAME);
  }

  const sheet = getOrCreateActivitySheet_(spreadsheet);

  return {
    spreadsheetName: spreadsheet.getName(),
    sheetName: sheet.getName(),
    spreadsheetUrl: spreadsheet.getUrl()
  };
}

function validateRegistration_(data) {
  if (!data.fullName) {
    throw new Error("Deltagarens namn saknas.");
  }

  if (!ALLOWED_SECTIONS.includes(data.section)) {
    throw new Error("Välj Spårare eller Upptäckare.");
  }

  if (!data.guardianName) {
    throw new Error("Vårdnadshavarens namn saknas.");
  }

  if (!data.guardianPhone) {
    throw new Error("Vårdnadshavarens mobilnummer saknas.");
  }

  if (!data.email || !isValidEmail_(data.email)) {
    throw new Error("Ange en giltig e-postadress.");
  }

  if (!data.healthInfo) {
    throw new Error("Besvara frågan om allergier, sjukdomar och medicin. Skriv Nej om inget finns.");
  }

  if (!data.foodInfo) {
    throw new Error("Besvara frågan om mat och allergier. Skriv Nej om inget finns.");
  }

  if (data.photoConsent !== "Ja") {
    throw new Error("Foto- och filmsamtycket måste godkännas för att anmälan ska kunna skickas.");
  }
}

function saveRegistration_(data) {
  const spreadsheet = getSpreadsheet_();
  const sheet = getOrCreateActivitySheet_(spreadsheet);

  const now = new Date();
  const registrationId = createRegistrationId_(now);
  const swishMessage = createSwishMessage_(data.fullName);

  sheet.appendRow([
    now,
    registrationId,
    ACTIVITY_NAME,
    data.fullName,
    data.section,
    data.guardianName,
    data.guardianPhone,
    data.email,
    data.healthInfo,
    data.foodInfo,
    data.photoConsent,
    ACTIVITY_AMOUNT,
    SWISH_NUMBER,
    swishMessage,
    "Väntar på Swish"
  ]);

  const row = sheet.getLastRow();
  sheet.getRange(row, 1).setNumberFormat("yyyy-mm-dd hh:mm:ss");
  sheet.getRange(row, 12).setNumberFormat("0 \"kr\"");

  return {
    registrationId: registrationId,
    fullName: data.fullName,
    section: data.section,
    guardianName: data.guardianName,
    guardianPhone: data.guardianPhone,
    email: data.email,
    swishMessage: swishMessage
  };
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getOrCreateActivitySheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  ensureHeaders_(sheet);
  formatActivitySheet_(sheet);

  return sheet;
}

function ensureHeaders_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  const current = headerRange.getValues()[0];

  const needsHeaders = HEADERS.some(function(header, index) {
    return current[index] !== header;
  });

  if (needsHeaders) {
    headerRange.setValues([HEADERS]);
  }
}

function formatActivitySheet_(sheet) {
  sheet.setFrozenRows(1);

  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange
    .setFontWeight("bold")
    .setBackground("#8c52ff")
    .setFontColor("#ffffff")
    .setWrap(true);

  const widths = [
    155, 205, 190, 190, 120,
    190, 180, 220, 300, 300,
    120, 90, 140, 250, 150
  ];

  widths.forEach(function(width, index) {
    sheet.setColumnWidth(index + 1, width);
  });

  if (sheet.getMaxRows() > 1) {
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, HEADERS.length)
      .setVerticalAlignment("top")
      .setWrap(true);
  }
}

function createRegistrationId_(date) {
  const timezone = Session.getScriptTimeZone() || "Europe/Stockholm";
  const stamp = Utilities.formatDate(date, timezone, "yyyyMMdd-HHmmss");
  const random = Math.floor(100 + Math.random() * 900);
  return ACTIVITY_CODE + "-" + stamp + "-" + random;
}

function createSwishMessage_(fullName) {
  const prefix = "SLA 2026 - ";
  const maxLength = 50;
  const available = Math.max(1, maxLength - prefix.length);
  return prefix + String(fullName || "").substring(0, available);
}

function sendConfirmationEmail_(data) {
  const subject = "Bekräftelse på anmälan – " + ACTIVITY_NAME;

  const plainBody =
    "Hej " + data.guardianName + "!\n\n" +
    "Anmälan för " + data.fullName + " till " + ACTIVITY_NAME + " är mottagen.\n\n" +
    "Aktivitetsinformation:\n" +
    "Datum: " + ACTIVITY_DATE + "\n" +
    "Tid: " + ACTIVITY_TIME + "\n" +
    "Plats: " + ACTIVITY_LOCATION + "\n" +
    "Adress: " + ACTIVITY_ADDRESS + "\n" +
    "Avdelning: " + data.section + "\n\n" +
    "Registrerings-ID: " + data.registrationId + "\n\n" +
    "Detta mejl är endast en bekräftelse på anmälan och innehåller ingen betalningsuppmaning.\n\n" +
    "Med vänliga hälsningar,\nS:t Eliyo Scoutkår";

  const htmlBody =
    '<div style="margin:0;padding:28px;background:#0d0818;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">' +
      '<div style="max-width:620px;margin:0 auto;background:#171025;border:1px solid #34254a;border-radius:24px;overflow:hidden;">' +
        '<div style="padding:30px;background:linear-gradient(135deg,#8c52ff,#ff4fb3);">' +
          '<div style="font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;opacity:.85;">S:t Eliyo Scoutkår</div>' +
          '<h1 style="margin:8px 0 0;font-size:30px;line-height:1.1;">Se, Lyssna, agera.</h1>' +
        '</div>' +
        '<div style="padding:30px;">' +
          '<p style="margin:0 0 18px;color:#ffffff;font-size:17px;line-height:1.6;">Hej ' + escapeHtml_(data.guardianName) + '!</p>' +
          '<p style="margin:0 0 22px;color:#d8d1e3;font-size:15px;line-height:1.65;">Anmälan för <strong style="color:#ffffff;">' + escapeHtml_(data.fullName) + '</strong> är mottagen.</p>' +

          '<div style="padding:20px;border-radius:17px;background:#211731;border:1px solid #3a2a50;margin-bottom:16px;">' +
            '<div style="margin-bottom:8px;color:#c7a5ff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Aktivitetsinformation</div>' +
            '<div style="color:#ffffff;font-size:14px;line-height:1.8;">' +
              '<strong>Datum:</strong> ' + escapeHtml_(ACTIVITY_DATE) + '<br>' +
              '<strong>Tid:</strong> ' + escapeHtml_(ACTIVITY_TIME) + '<br>' +
              '<strong>Plats:</strong> ' + escapeHtml_(ACTIVITY_LOCATION) + '<br>' +
              '<strong>Adress:</strong> ' + escapeHtml_(ACTIVITY_ADDRESS) + '<br>' +
              '<strong>Avdelning:</strong> ' + escapeHtml_(data.section) +
            '</div>' +
          '</div>' +

          '<div style="padding:18px;border-radius:17px;background:#211731;border:1px solid #3a2a50;">' +
            '<div style="color:#c7a5ff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Registrerings-ID</div>' +
            '<div style="margin-top:6px;color:#ffffff;font-size:16px;font-weight:700;">' + escapeHtml_(data.registrationId) + '</div>' +
          '</div>' +

          '<p style="margin:22px 0 0;color:#9f96ad;font-size:13px;line-height:1.6;">Detta mejl är endast en bekräftelse på anmälan och innehåller ingen betalningsuppmaning.</p>' +
          '<p style="margin:26px 0 0;color:#d8d1e3;font-size:14px;line-height:1.6;">Med vänliga hälsningar,<br><strong style="color:#ffffff;">S:t Eliyo Scoutkår</strong></p>' +
        '</div>' +
      '</div>' +
    '</div>';

  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    body: plainBody,
    htmlBody: htmlBody,
    name: "S:t Eliyo Scoutkår"
  });
}

function postMessageResponse_(payload) {
  const safeJson = JSON.stringify(payload).replace(/</g, "\\u003c");

  const html =
    '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>' +
      'var data=' + safeJson + ';' +
      'try{window.parent.postMessage({type:"sla-registration-result",payload:data},"*");}catch(e){}' +
      'try{window.top.postMessage({type:"sla-registration-result",payload:data},"*");}catch(e){}' +
    '<\/script>' +
    '</body></html>';

  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clean_(value) {
  return String(value == null ? "" : value).trim();
}

function escapeHtml_(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
