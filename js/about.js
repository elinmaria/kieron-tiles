/* About page: the story and the services list.
   The text comes from the "About page" tab of the Google Sheet (js/config.js), one row per piece:
     Section | Title | Text
     Intro     the short text under the big title
     Story     one paragraph each; the Title on the first Story row is the heading above them
     Services  the heading above the services list (in Title)
     Service   one row per service: Title is the name, Text shows when it opens
   If the tab can't be read, the text written in about.html stays.
   Each service links to the projects page. */
(() => {
  const KT = window.KT, esc = s => KT.esc(s);
  const list = document.getElementById('services');
  if (!list) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const paras = t => String(t).split(/\n\s*\n|\n/).map(x => x.trim()).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('');

  const item = (title, text) => `<details class="acc" data-service="${esc(title)}">
      <summary><span class="mark" aria-hidden="true"></span><span class="option-text">${esc(title)}</span><span class="acc-plus" aria-hidden="true"></span></summary>
      <div class="acc-body"><div class="acc-inner">${paras(text)}<a class="text-cta" href="projects.html">See the projects</a></div></div>
    </details>`;

  /* ---- open and close smoothly: the body's height eases between 0 and its content ---- */
  function wire() {
    list.querySelectorAll('.acc').forEach(d => {
      const sum = d.querySelector('summary'), body = d.querySelector('.acc-body');
      sum.addEventListener('click', e => {
        if (reduce) return;                       // plain open/close
        e.preventDefault();
        if (d.dataset.busy) return;
        d.dataset.busy = '1';
        const done = () => { body.style.height = ''; delete d.dataset.busy; };
        if (!d.open) {
          d.open = true;
          const h = body.scrollHeight;
          body.style.height = '0px';
          requestAnimationFrame(() => { body.style.height = h + 'px'; });
          body.addEventListener('transitionend', done, { once: true });
        } else {
          body.style.height = body.scrollHeight + 'px';
          d.classList.add('closing');
          requestAnimationFrame(() => { body.style.height = '0px'; });
          body.addEventListener('transitionend', () => { d.open = false; d.classList.remove('closing'); done(); }, { once: true });
        }
      });
    });
  }

  /* ---- text from the sheet ---- */
  function apply(rows) {
    if (!rows || !rows.length) return;
    const by = s => rows.filter(r => (r.section || '').toLowerCase() === s);
    const intro = by('intro')[0];
    if (intro && intro.text) document.getElementById('lede-text').textContent = intro.text;
    const story = by('story').filter(r => r.text);
    if (story.length) {
      document.getElementById('story-text').innerHTML = story.map(r => paras(r.text)).join('');
      const h = by('story').find(r => r.title);
      if (h) document.getElementById('story-h').textContent = h.title;
    }
    const head = by('services')[0];
    if (head && head.title) document.getElementById('services-h').textContent = head.title;
    const services = by('service').filter(r => r.title);
    if (services.length) { list.innerHTML = services.map(r => item(r.title, r.text)).join(''); }
  }

  /* ---- start the story a comfortable gap below the intro, however long the intro text is ---- */
  const more = document.querySelector('.about-more'), lede = document.getElementById('about-lede');
  function place() {
    if (!more || !lede) return;
    if (matchMedia('(max-width:820px)').matches) { more.style.paddingTop = ''; return; }
    more.style.paddingTop = Math.round(lede.offsetTop + lede.offsetHeight + Math.max(96, innerWidth * 0.085)) + 'px';
  }
  place(); addEventListener('resize', place);
  if (document.fonts) document.fonts.ready.then(place);

  const tab = KT.loadTab ? KT.loadTab('About page', 'Section') : Promise.resolve(null);
  tab.then(rows => { apply(rows); place(); wire(); })
    .catch(() => wire());
})();
