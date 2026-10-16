/* Shared by every page: text rolls, the hand-drawn nav underline,
   gentle page-to-page transitions and copy-to-clipboard buttons. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- text rolls ---- */
  const rollify = (el, intro) => {
    const t = el.textContent.trim();
    el.textContent = '';
    const r = document.createElement('span');
    r.className = 'roll' + (intro ? ' in' : '');
    if (el.dataset.d) r.style.setProperty('--d', el.dataset.d + 's');
    const a = document.createElement('span'); a.textContent = t;
    const b = document.createElement('span'); b.textContent = t; b.setAttribute('aria-hidden', 'true');
    r.append(a, b); el.append(r);
  };
  window.KT = { rollify, reduce };
  document.querySelectorAll('[data-roll]').forEach(el => rollify(el, !!el.dataset.d));

  /* ---- hand-drawn underline ---- */
  // Three slightly different strokes so the links don't look stamped out.
  const strokes = [
    'M3 9.6C21 6.8 40 11.2 61 8.4S100 5.4 117 8.6',
    'M2 8.2C18 10.9 39 5.6 62 7.6S98 10.4 118 6.4',
    'M4 9.8C27 7.2 50 7.6 73 9.1S104 6.6 114 7.1C118 7.3 113 9.4 105 10.2'
  ];
  const NS = 'http://www.w3.org/2000/svg';
  const links = [...document.querySelectorAll('.nav-link')];
  links.forEach((a, i) => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'scribble');
    svg.setAttribute('viewBox', '0 0 120 14');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', strokes[i % strokes.length]);
    p.setAttribute('pathLength', '1');
    svg.append(p); a.append(svg);
  });

  // The current page keeps its line; it draws in once the header has settled.
  const page = document.body.dataset.page;
  const current = links.find(a => a.dataset.page === page);
  if (current) {
    current.setAttribute('aria-current', 'page');
    setTimeout(() => current.classList.add('is-active'), reduce ? 0 : 1100);
  }

  // Clicking a link draws its line and leaves it there.
  const leave = (href) => {
    if (reduce) { location.href = href; return; }
    document.body.classList.add('is-leaving');
    setTimeout(() => { location.href = href; }, 620);
  };
  links.forEach(a => a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    // Another page's line lifts off; Email and Instagram keep theirs once clicked.
    if (a.dataset.page) links.forEach(l => { if (l !== a && l.dataset.page) l.classList.remove('is-active'); });
    a.classList.add('is-active');
    if (a.dataset.page) {
      if (a.dataset.page === page) { e.preventDefault(); return; }
      e.preventDefault(); leave(a.href);
    }
  }));
  const brand = document.querySelector('.brand');
  if (brand) brand.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (page === 'home') { e.preventDefault(); return; }
    e.preventDefault(); links.forEach(l => l.classList.remove('is-active')); leave(brand.href);
  });
  // Coming back with the browser's back button: undo the fade.
  addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));

  /* ---- copy buttons ---- */
  document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', () => {
    const done = () => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 1600); };
    const sel = () => { try { const r = document.createRange(); r.selectNodeContents(b.parentNode); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {} };
    try { navigator.clipboard.writeText(b.dataset.copy).then(done, sel); } catch (e) { sel(); }
  }));
})();
