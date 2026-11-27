/**
 * Victorian Tiler: website enquiry form → Kieron's Google account.
 *
 * For each enquiry this script:
 *   1. emails Kieron (Reply goes straight to the customer),
 *   2. adds a "Visit request" to his Google Calendar on the day they picked,
 *   3. saves any photos to a Google Drive folder,
 *   4. adds a row to a "Website enquiries" Google Sheet,
 *   5. sends a short alert to a phone, if phone alerts are on (see turnOnPhoneAlerts below).
 *
 * Set-up (about 5 minutes, signed in as the Google account that should own all this):
 *   1. Go to script.google.com → New project. Name it "Victorian Tiler form".
 *   2. Replace everything in Code.gs with this file. Fill in NOTIFY_EMAIL below.
 *   3. Click Run with "setup" selected and allow the permissions it asks for
 *      (Gmail to send, Calendar, Drive, Sheets). This also sends a test email.
 *   4. Deploy → New deployment → type "Web app".
 *      Execute as: Me.  Who has access: Anyone.  → Deploy.
 *   5. Copy the Web app URL (ends in /exec) into js/config.js as KT_FORM_URL.
 * After editing this file later: Deploy → Manage deployments → Edit → Version: New version → Deploy
 * (the URL stays the same).
 */

const CONFIG = {
  NOTIFY_EMAIL: 'victoriantiler@gmail.com',      // where enquiries are emailed
  CALENDAR_ID: 'primary',                  // 'primary' = this account's main calendar, or a calendar's ID
  VISIT_START_HOUR: { Morning: 9, Afternoon: 13, Default: 9 },
  VISIT_LENGTH_HOURS: 1,
  FOLDER_NAME: 'Website enquiry photos',
  SHEET_NAME: 'Website enquiries',
  MAX_PHOTOS: 3
};

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.botField) return json_({ ok: true });                       // spam trap filled in: quietly ignore
    const clip = (v, n) => String(v || '').trim().slice(0, n || 200);
    const f = {
      name: clip(d.name, 120), email: clip(d.email, 200), phone: clip(d.phone, 40), area: clip(d.area, 120),
      job: clip(d.job, 60), message: clip(d.message, 4000), visitDay: clip(d.visitDay, 80), visitDate: clip(d.visitDate, 10)
    };
    if (!f.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) || !f.message) return json_({ ok: false, error: 'Missing name, email or message' });

    const photoLinks = savePhotos_(d.photos, f);
    const event = addVisit_(f, photoLinks);
    logRow_(f, photoLinks, event);
    emailKieron_(f, photoLinks, event);
    try { phoneAlert_(f); } catch (err) { console.error('Phone alert failed', err); }   // never stops the enquiry
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Something went wrong' });
  }
}

/* Photos go into one Drive folder, named after the customer and date. */
function savePhotos_(photos, f) {
  if (!Array.isArray(photos) || !photos.length) return [];
  const folder = folder_();
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return photos.slice(0, CONFIG.MAX_PHOTOS).map((p, i) => {
    const type = /^image\//.test(p.type) ? p.type : 'image/jpeg';
    const blob = Utilities.newBlob(Utilities.base64Decode(p.data), type, `${stamp} ${f.name} ${i + 1}.jpg`);
    return folder.createFile(blob).getUrl();
  });
}

/* A visit request on the day they picked, morning or afternoon if they said. Kieron confirms by email. */
function addVisit_(f, photoLinks) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.visitDate)) return null;
  const [y, m, day] = f.visitDate.split('-').map(Number);
  const cal = CONFIG.CALENDAR_ID === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const when = /afternoon/i.test(f.visitDay) ? 'Afternoon' : /morning/i.test(f.visitDay) ? 'Morning' : 'Default';
  const start = new Date(y, m - 1, day, CONFIG.VISIT_START_HOUR[when], 0);
  const end = new Date(start.getTime() + CONFIG.VISIT_LENGTH_HOURS * 3600 * 1000);
  const ev = cal.createEvent(`Visit request: ${f.name}${f.area ? ' (' + f.area + ')' : ''}`, start, end, {
    location: f.area,
    description: [
      'Requested on the website. Time to be confirmed with the customer.', '',
      `Job: ${f.job}`, `Email: ${f.email}`, f.phone ? `Phone: ${f.phone}` : '', '', f.message,
      photoLinks.length ? '\nPhotos:\n' + photoLinks.join('\n') : ''
    ].filter(x => x !== null).join('\n')
  });
  ev.setColor(CalendarApp.EventColor.YELLOW);   // yellow = not confirmed yet
  return ev;
}

function logRow_(f, photoLinks, event) {
  const sheet = sheet_();
  sheet.appendRow([new Date(), f.name, f.email, f.phone, f.area, f.job, f.visitDay || '—', f.message, photoLinks.join('\n'), event ? 'In calendar' : '']);
}

function emailKieron_(f, photoLinks, event) {
  const lines = [
    `${f.name} sent an enquiry from the website.`, '',
    `Job: ${f.job}`,
    `Area: ${f.area || '—'}`,
    `Preferred visit: ${f.visitDay || 'not given'}${event ? ' (added to your calendar as a visit request)' : ''}`,
    `Email: ${f.email}`,
    `Phone: ${f.phone || '—'}`, '',
    f.message,
    photoLinks.length ? '\nPhotos:\n' + photoLinks.join('\n') : '',
    '', 'Reply to this email to answer them directly.'
  ];
  MailApp.sendEmail({
    to: CONFIG.NOTIFY_EMAIL, replyTo: f.email, name: 'Victorian Tiler website',
    subject: `New enquiry: ${f.name}, ${f.job}${f.visitDay ? ' · visit ' + f.visitDay : ''}`,
    body: lines.join('\n')
  });
}

/* ---- phone alerts ----
   A short notification on the phone through the free ntfy app (ntfy.sh): no account, no phone number needed.
   1. Run turnOnPhoneAlerts once. The log shows a private channel name.
   2. On the phone: install "ntfy" (App Store / Google Play), tap +, type that channel name, Subscribe.
   3. Run testPhoneAlert to check it arrives.
   Anyone else's phone can subscribe to the same channel later (e.g. Kieron's), and unsubscribe in the app.
   The alert only says the first name, the kind of job and the visit day; the details stay in Gmail. */
function turnOnPhoneAlerts() {
  const props = PropertiesService.getScriptProperties();
  let topic = props.getProperty('NTFY_TOPIC');
  if (!topic) {
    topic = 'victoriantiler-' + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    props.setProperty('NTFY_TOPIC', topic);
  }
  console.log('Phone alerts are on. In the ntfy app, subscribe to: ' + topic);
}
function turnOffPhoneAlerts() {
  PropertiesService.getScriptProperties().deleteProperty('NTFY_TOPIC');
  console.log('Phone alerts are off.');
}
function testPhoneAlert() {
  phoneAlert_({ name: 'Test', job: 'Hallway', visitDay: 'Thursday morning' }, true);
  console.log('Test alert sent. It should be on the phone within a few seconds.');
}
function phoneAlert_(f, isTest) {
  const topic = PropertiesService.getScriptProperties().getProperty('NTFY_TOPIC');
  if (!topic) return;
  const first = String(f.name || '').trim().split(/\s+/)[0];
  const msg = [first, f.job, f.visitDay ? 'visit ' + f.visitDay : 'no visit, just email'].filter(Boolean).join(' · ');
  UrlFetchApp.fetch('https://ntfy.sh/' + topic, {
    method: 'post',
    payload: (isTest ? 'Test: ' : '') + msg + '\nDetails are in Gmail.',
    headers: { Title: 'New website enquiry', Tags: 'house', Click: 'https://mail.google.com/mail/u/0/#inbox', Priority: 'high' },
    muteHttpExceptions: true
  });
}

/* ---- helpers: the folder and sheet are created on first use and remembered ---- */
function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const folder = DriveApp.createFolder(CONFIG.FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}
function sheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id).getSheets()[0]; } catch (e) {} }
  const ss = SpreadsheetApp.create(CONFIG.SHEET_NAME);
  const sh = ss.getSheets()[0];
  sh.appendRow(['Received', 'Name', 'Email', 'Phone', 'Area', 'Job', 'Preferred visit', 'Message', 'Photos', 'Calendar']);
  sh.setFrozenRows(1); sh.getRange('1:1').setFontWeight('bold');
  props.setProperty('SHEET_ID', ss.getId());
  return sh;
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* Run once from the editor: asks for permissions, creates the folder and sheet, sends a test email. */
function setup() {
  folder_(); sheet_();
  MailApp.sendEmail(CONFIG.NOTIFY_EMAIL, 'Victorian Tiler form is connected', 'Website enquiries will arrive here, and visit requests will appear in your Google Calendar in yellow.');
}
