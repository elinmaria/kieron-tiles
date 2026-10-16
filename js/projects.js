/* Projects from a Google Sheet.
   Set window.KT_SHEET (in index.html) to the sheet's share link. The sheet
   must be shared as "Anyone with the link: Viewer". Each row is a project.
   Columns (first row, any order, case doesn't matter):
     Show | Order | Title | Year | Location | Type | Description | Before photo | After photo
   If the sheet can't be reached, the projects written in index.html are kept. */
(() => {
  const SHEET = (window.KT_SHEET || '').trim();
  const start = () => window.KT.startHome && window.KT.startHome();

  // Accept a normal share link, a "Publish to web" CSV link, or a direct CSV URL.
  function csvUrl(u) {
    if (/output=csv|format=csv|tqx=out:csv/.test(u) || /\.csv(\?|$)/.test(u)) return u;
    const m = u.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!m || m[1] === 'e') return u;
    const gid = (u.match(/[#&?]gid=(\d+)/) || [])[1];
    return `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv${gid ? '&gid=' + gid : ''}`;
  }

  // Google Drive share links → a direct image URL. Anything else is used as is.
  function imageUrl(u) {
    u = (u || '').trim();
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([a-zA-Z0-9-_]+)/);
    return m ? `https://lh3.googleusercontent.com/d/${m[1]}=w2000` : u;
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

  const key = s => s.toLowerCase().replace(/[^a-z]/g, '');
  function toProjects(rows) {
    const head = rows.shift().map(key);
    const col = name => head.indexOf(name);
    const get = (r, ...names) => { for (const n of names) { const i = col(n); if (i > -1 && r[i] != null) return r[i].trim(); } return ''; };
    return rows.map((r, i) => ({
      show: get(r, 'show', 'visible', 'live').toLowerCase(),
      order: parseFloat(get(r, 'order')) || 1000 + i,
      title: get(r, 'title', 'project', 'name'),
      year: get(r, 'year'),
      location: get(r, 'location', 'area'),
      type: get(r, 'type', 'category'),
      description: get(r, 'description', 'text', 'about'),
      before: imageUrl(get(r, 'beforephoto', 'before', 'beforeimage')),
      after: imageUrl(get(r, 'afterphoto', 'after', 'afterimage', 'photo'))
    }))
      .filter(p => p.title && p.after && !/^(no|n|false|hide|hidden|0)$/.test(p.show))
      .sort((a, b) => a.order - b.order);
  }

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bg = u => `background-image:url(&quot;${esc(u).replace(/\(/g, '%28').replace(/\)/g, '%29')}&quot;)`;

  function cardHTML(p, i) {
    const caption = [p.title, p.year].filter(Boolean).join(' ') + '.';
    const pair = !!p.before;
    return `<article class="card${pair ? '' : ' single'}" data-title="${esc(p.title)}" data-year="${esc(p.year)}" data-type="${esc(p.type)}" data-location="${esc(p.location)}" data-desc="${esc(p.description)}">
      <div class="tile ${i % 2 ? 'b' : 'a'}"></div>
      ${pair ? '<div class="labels" aria-hidden="true"><span>Before</span><span>After</span></div>' : ''}
      <div class="frame" aria-label="Open project: ${esc(p.title)}">
        <div class="ph ph-after" role="img" aria-label="${esc(p.title)}, after" style="${bg(p.after)}"></div>
        ${pair ? `<div class="before"><div class="ph ph-before" role="img" aria-label="${esc(p.title)}, before" style="${bg(p.before)}"></div></div>
        <div class="divider"></div>
        <button class="handle" type="button" role="slider" aria-label="Compare before and after" aria-valuemin="0" aria-valuemax="100" aria-valuenow="37"></button>` : ''}
      </div>
      <div class="caption">${esc(caption)}</div>
    </article>`;
  }

  function render(projects) {
    document.getElementById('track').innerHTML = projects.map(cardHTML).join('\n');
    // The opening slideshow uses the first project's photos.
    const first = projects[0];
    document.querySelectorAll('#intro .ph').forEach((el, i) => {
      const u = i % 2 === 0 ? (first.before || first.after) : first.after;
      el.style.backgroundImage = `url("${u}")`;
    });
  }

  if (!SHEET) { start(); return; }
  const ctrl = 'AbortController' in window ? new AbortController() : null;
  const timer = setTimeout(() => ctrl && ctrl.abort(), 5000);
  fetch(csvUrl(SHEET), { signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' })
    .then(r => { if (!r.ok) throw new Error('Sheet returned ' + r.status); return r.text(); })
    .then(text => {
      if (/^\s*</.test(text)) throw new Error('Sheet is not shared publicly');
      const projects = toProjects(parseCSV(text));
      if (projects.length) render(projects);
    })
    .catch(err => console.warn('[Kieron’s Tiling] Using the built-in projects:', err.message))
    .finally(() => { clearTimeout(timer); start(); });
})();
