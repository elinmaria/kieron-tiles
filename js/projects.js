/* Homepage gallery: fills the draggable row from the Google Sheet (js/sheet.js).
   If the sheet can't be reached, the projects written in index.html are kept. */
(() => {
  const KT = window.KT;
  const esc = s => KT.esc(s);
  const start = () => KT.startHome && KT.startHome();

  function cardHTML(p, i) {
    const caption = [p.title, p.year].filter(Boolean).join(' ') + '.';
    const pair = !!p.before;
    return `<article class="card${pair ? '' : ' single'}" data-i="${i}" data-title="${esc(p.title)}" data-year="${esc(p.year)}" data-type="${esc(p.type)}" data-location="${esc(p.location)}" data-desc="${esc(p.description)}">
      <div class="tile ${i % 2 ? 'b' : 'a'}"></div>
      ${pair ? '<div class="labels" aria-hidden="true"><span>Before</span><span>After</span></div>' : ''}
      <div class="frame" aria-label="Open project: ${esc(p.title)}">
        <div class="ph ph-after" role="img" aria-label="${esc(p.title)}${pair ? ', after' : ''}" style="${KT.bg(p.afterThumb)}"></div>
        ${pair ? `<div class="before"><div class="ph ph-before" role="img" aria-label="${esc(p.title)}, before" style="${KT.bg(p.beforeThumb)}"></div></div>
        <div class="divider"></div>
        <button class="handle" type="button" role="slider" aria-label="Compare before and after" aria-valuemin="0" aria-valuemax="100" aria-valuenow="37"></button>` : ''}
      </div>
      <div class="caption">${esc(caption)}</div>
    </article>`;
  }

  // The project behind a card: from the sheet if we have it, otherwise read off the card itself.
  KT.homeProjects = null;
  KT.projectForCard = card => {
    if (KT.homeProjects && card.dataset.i != null) return KT.homeProjects[+card.dataset.i];
    const d = card.dataset;
    return { title: d.title, year: d.year, type: d.type, location: d.location, description: d.desc,
      before: card.querySelector('.ph-before') ? 'img/before.webp' : '', after: 'img/after.webp', photos: [] };
  };

  function render(projects) {
    KT.homeProjects = projects;
    document.getElementById('track').innerHTML = projects.map(cardHTML).join('\n');
    // The opening slideshow uses the first project's photos.
    const first = projects[0];
    document.querySelectorAll('#intro .ph').forEach((el, i) => {
      const u = i % 2 === 0 ? (first.before || first.after) : first.after;
      el.style.backgroundImage = `url("${u}")`;
    });
  }

  KT.loadProjects().then(list => { if (list) render(list); }).finally(start);
})();
