/* Projects page: every project in a grid, filtered by Type.
   Clicking a project opens the same project view as the homepage (js/detail.js).
   Each project has its own address (projects.html#red-star-path) and each filter too
   (projects.html?type=hallway), so both can be shared. */
(() => {
  const KT = window.KT, esc = s => KT.esc(s);
  const grid = document.getElementById('pgrid'), bar = document.getElementById('filters');
  const count = document.getElementById('pp-count'), empty = document.getElementById('pp-empty');
  const reduce = KT.reduce;
  const pad = n => String(n).padStart(2, '0');

  // Shown if the sheet can't be reached: the sample project that ships with the site.
  const FALLBACK = [{ id: 'hampstead', title: 'Hampstead', year: '2026', location: 'Hampstead, London', type: 'Garden path',
    description: 'A cracked concrete path replaced with a Victorian geometric pattern in red, buff and black, finished with a black border.',
    before: 'img/before.webp', after: 'img/after.webp', beforeThumb: 'img/before.webp', afterThumb: 'img/after.webp', photos: [] }];

  let projects = [], current = 'all';

  function cardHTML(p, i) {
    const n = 1 + (p.photos || []).length;   // the main photo plus Photo 2–4
    return `<a class="pcard" href="#${esc(p.id)}" data-id="${esc(p.id)}" data-type="${esc(KT.slug(p.type))}" style="--i:${i}">
      <div class="frame">
        <div class="ph ph-after" role="img" aria-label="${esc(p.title)}" style="${KT.bg(p.afterThumb)}"></div>
        ${p.before ? `<div class="ph ph-before pc-before" aria-hidden="true" style="${KT.bg(p.beforeThumb)}"></div><span class="pc-tag" aria-hidden="true"><span>After</span><span>Before</span></span>` : ''}
        ${n > 1 ? `<span class="pc-count" aria-label="${n} photos">${n}</span>` : ''}
      </div>
      <div class="caption"><span class="cap-title">${esc([p.title, p.year].filter(Boolean).join(' '))}.</span><span class="cap-type">${esc(p.type)}</span><span class="cap-num">${pad(i + 1)}</span></div>
    </a>`;
  }

  function buildFilters() {
    const types = {};
    projects.forEach(p => { if (!p.type) return; const k = KT.slug(p.type); (types[k] = types[k] || { label: p.type, n: 0 }).n++; });
    const list = Object.entries(types).sort((a, b) => b[1].n - a[1].n || a[1].label.localeCompare(b[1].label));
    bar.hidden = list.length < 2;
    bar.innerHTML = [['all', { label: 'All', n: projects.length }], ...list].map(([k, t]) =>
      `<button type="button" class="filter" data-type="${esc(k)}" aria-pressed="false">${esc(t.label)}<sup>${t.n}</sup></button>`).join('');
    bar.querySelectorAll('.filter').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.type, true)));
  }

  function setFilter(type, user) {
    if (!bar.querySelector(`[data-type="${CSS.escape(type)}"]`)) type = 'all';
    current = type;
    bar.querySelectorAll('.filter').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type === type)));
    const show = c => type === 'all' || c.dataset.type === type;
    const cards = [...grid.children];
    const apply = () => {
      let k = 0;
      cards.forEach(c => {
        const on = show(c); c.hidden = !on;
        if (on) { c.style.setProperty('--i', k); c.querySelector('.cap-num').textContent = pad(++k); }
      });
      count.textContent = k === 1 ? '1 project' : k + ' projects';
      empty.hidden = k > 0;
      grid.classList.remove('out'); grid.classList.add('in');
    };
    if (user && !reduce) { grid.classList.remove('in'); grid.classList.add('out'); setTimeout(apply, 320); }
    else apply();
    if (user) {
      const u = new URL(location.href);
      if (type === 'all') u.searchParams.delete('type'); else u.searchParams.set('type', type);
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    }
  }

  function open(id, fromEl, push) {
    const p = projects.find(x => x.id === id); if (!p) return;
    if (push) history.pushState({ project: id }, '', location.pathname + location.search + '#' + id);
    KT.detail.open(p, fromEl, { onClose: () => {
      if (!location.hash) return;
      // Opened from the grid: step back so the Back button doesn't reopen it. Opened from a shared link: just tidy the address.
      if (history.state && history.state.project) history.back();
      else history.replaceState(null, '', location.pathname + location.search);
    } });
  }

  function render() {
    grid.innerHTML = projects.map(cardHTML).join('');
    grid.querySelectorAll('.pcard').forEach(a => a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault(); open(a.dataset.id, a.querySelector('.frame'), true);
    }));
    buildFilters();
    setFilter(new URLSearchParams(location.search).get('type') || 'all', false);
    document.body.classList.remove('is-loading');
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) open(id, grid.querySelector(`[data-id="${CSS.escape(id)}"] .frame`), false);
  }

  // Browser back/forward: open or close the project view to match the address.
  addEventListener('popstate', () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) KT.detail.close(); else if (!KT.detail.isOpen()) open(id, null, false);
  });

  KT.loadProjects().then(list => { projects = list || FALLBACK; render(); });
})();
