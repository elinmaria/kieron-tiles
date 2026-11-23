/* Projects and About text: read from the daily copy of the Google Sheet set in js/config.js (see scripts/sync_sheet.py).
   The sheet must be shared as "Anyone with the link: Viewer". Each row is a project.
   Columns (first row, any order, case doesn't matter):
     Show | Order | Title | Year | Location | Type | Description |
     Before photo | After photo | Photo 2 | Photo 3 | Photo 4
   Columns it doesn't know (like the preview columns) are ignored.
   KT.loadProjects() resolves to a list of projects, or null if the sheet can't be read. */
(() => {
  const KT = window.KT = window.KT || {};

  // Accept a normal share link, a "Publish to web" CSV link, or a direct CSV URL.
  function csvUrl(u) {
    if (/output=csv|format=csv|tqx=out:csv/.test(u) || /\.csv(\?|$)/.test(u)) return u;
    const m = u.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!m || m[1] === 'e') return u;
    const gid = (u.match(/[#&?]gid=(\d+)/) || [])[1];
    return `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv&headers=1${gid ? '&gid=' + gid : ''}`;
  }

  // Google Drive share links → a direct image URL at the given width. Anything else is used as is.
  function imageUrl(u, w) {
    u = (u || '').trim();
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=|thumbnail\?(?:[^#]*&)?id=)([a-zA-Z0-9-_]+)/);
    return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w${w || 2000}` : u;
  }

  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(v => v.trim() !== ''));
  }

  const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const key = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  function toProjects(rows) {
    const head = rows.shift().map(key);
    const col = name => head.indexOf(name);
    const get = (r, ...names) => { for (const n of names) { const i = col(n); if (i > -1 && r[i] != null && r[i].trim()) return r[i].trim(); } return ''; };
    const seen = {};
    return rows.map((r, i) => {
      const raw = {
        before: get(r, 'beforephoto', 'before', 'beforeimage'),
        after: get(r, 'afterphoto', 'after', 'afterimage', 'photo', 'photo1'),
        extra: ['photo2', 'photo3', 'photo4', 'photo5', 'photo6'].map(n => get(r, n)).filter(Boolean)
      };
      // A photo already used as the before or after isn't repeated in the extra photos.
      const fid = u => (u.match(/\/d\/([a-zA-Z0-9-_]+)|[?&]id=([a-zA-Z0-9-_]+)/) || []).slice(1).find(Boolean) || u;
      const used = new Set([raw.before, raw.after].filter(Boolean).map(fid));
      raw.extra = raw.extra.filter(u => !used.has(fid(u)));
      const title = get(r, 'title', 'project', 'name');
      let id = slug(title) || 'project-' + (i + 1);
      if (seen[id]) id += '-' + (++seen[id]); else seen[id] = 1;
      return {
        id,
        show: get(r, 'show', 'visible', 'live').toLowerCase(),
        order: parseFloat(get(r, 'order')) || 1000 + i,
        title,
        year: get(r, 'year'),
        location: get(r, 'location', 'area'),
        type: get(r, 'type', 'category'),
        description: get(r, 'description', 'text', 'about'),
        before: imageUrl(raw.before), after: imageUrl(raw.after),
        beforeThumb: imageUrl(raw.before, 900), afterThumb: imageUrl(raw.after, 900),
        photos: raw.extra.map(u => imageUrl(u)),
        photoThumbs: raw.extra.map(u => imageUrl(u, 400))
      };
    })
      .filter(p => p.title && p.after && !/^(no|n|false|hide|hidden|0)$/.test(p.show))
      .sort((a, b) => a.order - b.order);
  }

  KT.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  KT.bg = u => `background-image:url(&quot;${KT.esc(u).replace(/\(/g, '%28').replace(/\)/g, '%29')}&quot;)`;
  KT.slug = slug;
  KT.parseCSV = parseCSV;

  // Another tab of the same sheet, by name (e.g. "About page"), as rows of {column: value}.
  // Resolves to null if it can't be read or doesn't have the expected first column.
  KT.loadTab = name => {
    const file = { 'About page': 'data/about.json' }[name];
    if (!file) return Promise.resolve(null);
    return fetch(file, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  };

  /* Projects come from data/projects.json, a copy of the Google Sheet made once a day by
     scripts/sync_sheet.py (GitHub Actions, .github/workflows/sync-sheet.yml), with the photos stored in img/sheet/.
     The site never reads the sheet live, so a problem with Google or the sheet can't break it. */
  let pending = null;
  KT.loadProjects = () => pending || (pending = fetch('data/projects.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(list => (Array.isArray(list) && list.length ? list : null))
    .catch(err => { console.warn('[Victorian Tiler] Using the built-in projects:', err.message); return null; }));

  // Shown if the sheet can't be reached: a few real projects with photos stored in img/projects/.
  const fb = (id, title, year, type, description, after, before, photos) => ({ id, title, year, type, location: 'London', description,
    after: 'img/projects/' + after, afterThumb: 'img/projects/' + after, before: before ? 'img/projects/' + before : '',
    beforeThumb: before ? 'img/projects/' + before : '', photos: [], photoThumbs: [] });
  KT.FALLBACK = [
    fb('red-star-path', 'Red Star Path', '', 'Garden path', 'A garden path in a red, buff and black star pattern, framed by a red sawtooth border and a black edge.', 'red-star-path.jpg'),
    fb('green-hallway', 'Green Hallway', '', 'Hallway', 'A matching green, cream and black geometric floor laid through the hallway, across the stair landing and out onto the front step.', 'green-hallway.jpg'),
    fb('buff-and-brown-path', 'Buff and Brown Path', '2022', 'Front path', 'A front path in brown, buff, black and white geometric tiles, finished with a red edge.', 'buff-and-brown-path.jpg'),
    fb('black-and-white-path', 'Black and White Path', '2026', 'Front path', 'A classic black and white diamond path with a patterned border running along one side.', 'black-and-white-path.jpg'),
    fb('rosette-hallway', 'Rosette Hallway', '2024', 'Restoration', 'Cracked tiles in an original rosette and star floor replaced with matching ones, so the pattern reads as one again.', 'rosette-hallway-after.jpg', 'rosette-hallway-before.jpg')
  ];

  // For testing the parser without a network.
  KT._parse = text => toProjects(parseCSV(text));
})();
