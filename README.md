# Kieron Tiles

Portfolio site for Kieron Tiles, a tiling studio in London.

Three static pages — `index.html` (projects), `about.html` and `contact.html` — sharing `css/site.css` and `js/site.js`. Fonts are in `fonts/`, photos and tile graphics in `img/`. No build step: GitHub Pages serves it as it is.

## Editing

- **Projects:** each project is an `<article class="card">` in `index.html`. The before/after photos are set by `.ph-before` and `.ph-after` in the stylesheet; the geometric tiles are `img/geometric-tile.svg`.
- **Contact details:** search all three pages for `Email@email.com` and `Instagram handle` (the header is repeated in each page).
- **About text:** in `about.html`.

Typeface: PP Editorial New (Pangram Pangram). Check the licence covers web use before the site goes public.

Made by ElinLondon.

## Projects from a Google Sheet

The project cards can come from a Google Sheet, so new jobs can be added without touching the code.

1. Import `kieron-tiles-projects.xlsx` into Google Sheets (File → Import), or make a sheet with the headers
   `Show, Order, Title, Year, Location, Type, Description, Before photo, After photo`.
2. Share the sheet as **Anyone with the link: Viewer**.
3. Paste its link into `window.KT_SHEET = "…"` near the top of `index.html`.

Photos: upload them to a Google Drive folder shared as *Anyone with the link*, and paste each file's share link
into the sheet. Rows with `Show = No` stay hidden; `Order` sets the position. If the sheet can't be reached, the
projects written in `index.html` are shown instead.
