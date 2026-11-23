/* Projects page: every project in a five-column gallery grid, filtered by Type.
   Clicking a project opens the same project view as the homepage (js/detail.js).
   Each project has its own address (projects.html#red-star-path) and each filter too
   (projects.html?type=hallway, projects.html?service=pattern-library), so both can be shared. */
(() => {
  const KT = window.KT, esc = s => KT.esc(s);
  const grid = document.getElementById('pgrid'), bar = document.getElementById('filters');
  const count = document.getElementById('pp-count'), empty = document.getElementById('pp-empty');
  const reduce = KT.reduce;
  const pad = n => String(n).padStart(2, '0');
  // Card shapes repeat in this order, like a hung gallery wall: landscape, square, portrait.
  const SHAPES = ['l', 's', 'p', 's', 'p', 'p', 'p', 's', 'l', 'p'];
  const shape = i => 'shape-' + SHAPES[i % SHAPES.length];

  let projects = [], current = 'all';
  // A project can have more than one service, separated by commas in the sheet.
  const services = p => String(p.service || '').split(',').map(s => s.trim()).filter(Boolean);

  function cardHTML(p, i) {
    const n = 1 + (p.photos || []).length;   // the main photo plus Photo 2–4
    return `<a class="pcard ${shape(i)}" href="#${esc(p.id)}" data-id="${esc(p.id)}" data-type="${esc(KT.slug(p.type))}" data-service="${esc(services(p).map(KT.slug).join(' '))}" style="--i:${i}">
      <div class="frame">
        <div class="ph ph-after" role="img" aria-label="${esc(p.title)}" style="${KT.bg(p.afterThumb)}"></div>
        ${p.before ? `<div class="ph ph-before pc-before" aria-hidden="true" style="${KT.bg(p.beforeThumb)}"></div><span class="pc-tag" aria-hidden="true"><span>After</span><span>Before</span></span>` : ''}
        ${n > 1 ? `<span class="pc-count" aria-label="${n} photos">${n}</span>` : ''}
      </div>
      <div class="caption"><span class="cap-title">${esc([p.title, p.year].filter(Boolean).join(' '))}.</span><span class="cap-type">${esc(p.type)}</span><span class="cap-num">${pad(i + 1)}</span></div>
    </a>`;
  }

  // Filters: All, then the services (Pattern library, Copy existing pattern, New pattern), then each Type.
  // Service filters are keyed "s-<slug>" so they never clash with a type of the same name.
  const SERVICE_ORDER = ['pattern-library', 'copy-existing-pattern', 'new-pattern'];
  function buildFilters() {
    const types = {}, servs = {};
    projects.forEach(p => {
      if (p.type) { const k = KT.slug(p.type); (types[k] = types[k] || { label: p.type, n: 0 }).n++; }
      services(p).forEach(s => { const k = 's-' + KT.slug(s); (servs[k] = servs[k] || { label: s, n: 0 }).n++; });
    });
    const list = Object.entries(types).sort((a, b) => b[1].n - a[1].n || a[1].label.localeCompare(b[1].label));
    const rank = k => { const i = SERVICE_ORDER.indexOf(k.slice(2)); return i < 0 ? 99 : i; };
    const slist = Object.entries(servs).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1].label.localeCompare(b[1].label));
    bar.hidden = list.length + slist.length < 2;
    const btn = ([k, t]) => `<button type="button" class="filter${k.startsWith('s-') ? ' filter-service' : ''}" data-type="${esc(k)}" aria-pressed="false">${esc(t.label)}<sup>${t.n}</sup></button>`;
    bar.innerHTML = btn(['all', { label: 'All', n: projects.length }]) + slist.map(btn).join('')
      + (slist.length ? '<span class="filter-sep" aria-hidden="true"></span>' : '') + list.map(btn).join('');
    bar.querySelectorAll('.filter').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.type, true)));
  }

  function setFilter(type, user) {
    if (!bar.querySelector(`[data-type="${CSS.escape(type)}"]`)) type = 'all';
    current = type;
    bar.querySelectorAll('.filter').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type === type)));
    const show = c => type === 'all' || (type.startsWith('s-') ? c.dataset.service.split(' ').includes(type.slice(2)) : c.dataset.type === type);
    const cards = [...grid.children];
    const apply = () => {
      let k = 0;
      cards.forEach(c => {
        const on = show(c); c.hidden = !on;
        if (on) { c.style.setProperty('--i', k); c.className = c.className.replace(/shape-\w/, shape(k)); c.querySelector('.cap-num').textContent = pad(++k); }
      });
      count.textContent = k === 1 ? '1 project' : k + ' projects';
      empty.hidden = k > 0;
      grid.classList.remove('out'); grid.classList.add('in');
    };
    if (user && !reduce) { grid.classList.remove('in'); grid.classList.add('out'); setTimeout(apply, 320); }
    else apply();
    if (user) {
      const u = new URL(location.href);
      u.searchParams.delete('type'); u.searchParams.delete('service');
      if (type.startsWith('s-')) u.searchParams.set('service', type.slice(2)); else if (type !== 'all') u.searchParams.set('type', type);
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
    const q = new URLSearchParams(location.search);
    setFilter(q.get('service') ? 's-' + KT.slug(q.get('service')) : (q.get('type') || 'all'), false);
    document.body.classList.remove('is-loading');
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) open(id, grid.querySelector(`[data-id="${CSS.escape(id)}"] .frame`), false);
  }

  // Browser back/forward: open or close the project view to match the address.
  addEventListener('popstate', () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) KT.detail.close(); else if (!KT.detail.isOpen()) open(id, null, false);
  });

  KT.loadProjects().then(list => { projects = list || KT.FALLBACK; render(); });
})();
