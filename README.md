# Victorian Tiling

Portfolio site for Victorian Tiling, a tiling studio in London.

Static pages — `index.html` (home gallery), `projects.html` (all projects in a grid), `about.html` and `contact.html` — sharing `css/site.css` and `js/site.js`. Fonts are in `fonts/`, photos and tile graphics in `img/`. No build step: GitHub Pages serves it as it is.

## Editing

- **Projects:** each project is an `<article class="card">` in `index.html`. The before/after photos are set by `.ph-before` and `.ph-after` in the stylesheet; the geometric tiles are `img/geometric-tile.svg`.
- **Contact details:** search all three pages for `Email@email.com` and `Instagram handle` (the header is repeated in each page).
- **About text:** in `about.html`.

Typeface: PP Editorial New (Pangram Pangram). Check the licence covers web use before the site goes public.

Made by ElinLondon.

## Projects from a Google Sheet

The homepage gallery and the projects page both read the same Google Sheet, so new jobs can be added without
touching the code. The sheet's link is in `js/config.js`; the sheet must be shared as **Anyone with the link: Viewer**.

Columns (row 1): `Show, Order, Title, Year, Location, Type, Description, Before photo, After photo, Photo 2, Photo 3, Photo 4`.
Other columns (such as the photo previews) are ignored.

- **Photos:** upload to the shared Google Drive folder and paste each file's share link into the sheet.
  A single photo goes in *After photo*. Fill *Before photo* too and the project gets the before/after slider.
  *Photo 2–4* are extra photos of the same job, shown under the main photo in the project view.
- **Show = No** hides a row; **Order** sets the position on both pages. The homepage shows the first 5, then "View all projects" (change `HOME_COUNT` in `js/projects.js`).
- **Type** becomes the filter buttons on the projects page, so keep the names consistent (e.g. "Hallway", not "Hallways").

If the sheet can't be reached, the homepage shows the projects written in `index.html`.

## Projects page

`projects.html` shows every project in a grid (5 across on a laptop, 2 on a phone; photos alternate between landscape, square and portrait like a gallery wall) with filter buttons for each Type.
Clicking a project opens the same project view as the homepage (`js/detail.js`). Each project has its own link
(`projects.html#green-hallway`) and so does each filter (`projects.html?type=hallway`), so both can be shared.

## Publishing changes

After changing `css/site.css` or anything in `js/`, bump the `?v=` number on those links in all three pages so
browsers load the new files straight away (GitHub Pages lets browsers keep them for up to 10 minutes).

## Enquiry form (Netlify)

The form on `contact.html` uses Netlify Forms, so it only sends once the site is hosted on Netlify.

1. Deploy the site on Netlify. The form is picked up automatically (Forms → enable form detection if asked).
2. In Netlify: Project configuration → Notifications → Emails and webhooks → Form submission notifications →
   add Kieron's email. Each enquiry then arrives by email, with any photos as links.
3. Spam is filtered with a hidden honeypot field; Netlify also flags spam itself.

Up to 3 photos per enquiry. Large phone photos are shrunk in the browser before sending, to stay under
Netlify's 8 MB limit per enquiry. On other hosts the form shows a "didn't send, please email" message.

## Free home visits

There's no separate booking calendar. "Book a free visit" links go to the enquiry form on `contact.html`, which asks
**When can Kieron pop round?** with Mon to Fri of this week (next week from Thursday onwards), plus "Next week" and
"Any day's good". The choice arrives with the enquiry as `visit-day`, e.g. "Tuesday 24 November", and Kieron confirms
the time. `book.html` only forwards old links to the form.
