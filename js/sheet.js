/* Reads the projects from the Google Sheet set in js/config.js.
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

  let pending = null;
  KT.loadProjects = () => {
    if (pending) return pending;
    const SHEET = (window.KT_SHEET || '').trim();
    if (!SHEET) return (pending = Promise.resolve(null));
    const ctrl = 'AbortController' in window ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), 6000);
    return (pending = fetch(csvUrl(SHEET), { signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('Sheet returned ' + r.status); return r.text(); })
      .then(text => {
        if (/^\s*</.test(text)) throw new Error('Sheet is not shared publicly');
        const list = toProjects(parseCSV(text));
        return list.length ? list : null;
      })
      .catch(err => { console.warn('[Victorian Tiling] Using the built-in projects:', err.message); return null; })
      .finally(() => clearTimeout(timer)));
  };

  // For testing the parser without a network.
  KT._parse = text => toProjects(parseCSV(text));
})();
