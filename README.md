# Victorian Tiler

Portfolio site for Victorian Tiler, a tiling studio in London.

Static pages — `index.html` (home gallery), `projects.html` (all projects in a grid), `about.html` and `contact.html` — sharing `css/site.css` and `js/site.js`. Fonts are in `fonts/`, photos and tile graphics in `img/`. No build step: any static host can serve it as it is.

## Editing

- **Projects:** come from the Google Sheet (below). The geometric tiles are `img/geometric-tile.svg`.
- **Contact details:** search all three pages for `Email@email.com` and `Instagram handle` (the header is repeated in each page).
- **About text:** in `about.html`.

Typeface: PP Editorial New (Pangram Pangram). Check the licence covers web use before the site goes public.

Made by ElinLondon.

## Projects from a Google Sheet

The homepage gallery and the projects page both read the same Google Sheet, so new jobs can be added without
touching the code. The sheet's link is in `js/config.js`; the sheet must be shared as **Anyone with the link: Viewer**.

Columns (row 1): `Show, Order, Title, Year, Location, Type, Service, Description, Before photo, After photo, Photo 2, Photo 3, Photo 4`.
Other columns (such as the photo previews) are ignored.

- **Photos:** upload to the shared Google Drive folder and paste each file's share link into the sheet.
  A single photo goes in *After photo*. Fill *Before photo* too and the project gets the before/after slider.
  *Photo 2–4* are extra photos of the same job, shown under the main photo in the project view.
- **Show = No** hides a row; **Order** sets the position on both pages. The homepage shows the first 5, then "View all projects" (change `HOME_COUNT` in `js/projects.js`).
- **Type** becomes the filter buttons on the projects page, so keep the names consistent (e.g. "Hallway", not "Hallways").
- **Service** is Pattern library, Copy existing pattern or New pattern (more than one: separate with commas). These are filter buttons too, and the services on the About page link to them (`projects.html?service=pattern-library`).

### About page text
The **About page** tab of the same sheet holds the About text, one row per piece (`Section | Title | Text`):
Intro (under the big title), Story (one paragraph per row; the first row's Title is the heading), Services (the list heading, in Title)
and Service (one row per service: name in Title, the opened text in Text). If the tab can't be read, the text in `about.html` is shown.

If the sheet can't be reached, both pages show a few backup projects (`KT.FALLBACK` in `js/sheet.js`, photos in `img/projects/`).

## Projects page

`projects.html` shows every project in a grid (5 across on a laptop, 2 on a phone; photos alternate between landscape, square and portrait like a gallery wall) with filter buttons for each Type.
Clicking a project opens the same project view as the homepage (`js/detail.js`). Each project has its own link
(`projects.html#green-hallway`) and so does each filter (`projects.html?type=hallway`), so both can be shared.

## Publishing changes

After changing `css/site.css` or anything in `js/`, bump the `?v=` number on those links in all three pages so
browsers load the new files straight away (GitHub Pages lets browsers keep them for up to 10 minutes).

## Enquiry form (Google)

The form on `contact.html` sends to Kieron's Google account through a small Apps Script (`apps-script/Code.gs`),
so it works on any host. Each enquiry:

- is emailed to Kieron (replying answers the customer directly),
- adds a yellow **Visit request** to his Google Calendar on the day they picked (he confirms the time by email),
- saves photos to a Drive folder, *Website enquiry photos*,
- is logged in a Google Sheet, *Website enquiries*.

Set-up, once, signed in as the Google account that should get the enquiries (steps are also at the top of `Code.gs`):

1. script.google.com → New project → paste `apps-script/Code.gs` → set `NOTIFY_EMAIL`.
2. Run `setup` and allow the permissions (it sends a test email).
3. Deploy → New deployment → Web app → Execute as **Me**, Who has access **Anyone** → copy the `/exec` URL.
4. Paste that URL into `js/config.js` as `KT_FORM_URL`.

Until `KT_FORM_URL` is set, the form tells people to email instead. Up to 3 photos per enquiry; phone photos are
shrunk in the browser before sending.

## Free home visits

There's no separate booking calendar. "Book a free visit" links go to the enquiry form on `contact.html`, which asks
**When can Kieron pop round?** with Mon to Fri of this week (next week from Thursday onwards), plus "Next week" and
"Any day's good". The choice arrives with the enquiry as `visit-day`, e.g. "Tuesday 24 November", and Kieron confirms
the time. `book.html` only forwards old links to the form.
