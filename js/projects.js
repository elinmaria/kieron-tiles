/* Homepage gallery: fills the draggable row from the Google Sheet (js/sheet.js).
   If the sheet can't be reached, it shows the backup projects in KT.FALLBACK. */
(() => {
  const KT = window.KT;
  const esc = s => KT.esc(s);
  const start = () => KT.startHome && KT.startHome();

  function cardHTML(p, i) {
    const caption = [p.title, p.year].filter(Boolean).join(' ') + '.';
    const pair = !!p.before;
    return `<article class="card${pair ? '' : ' single'}" data-i="${i}" data-id="${esc(p.id || '')}" data-title="${esc(p.title)}" data-year="${esc(p.year)}" data-type="${esc(p.type)}" data-location="${esc(p.location)}" data-desc="${esc(p.description)}">
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
  KT.projectForCard = card => KT.homeProjects[+card.dataset.i];

  const HOME_COUNT = 5;   // how many projects the homepage shows before "View all projects"
  const viewAll = n => `<a class="view-all" href="projects.html" aria-label="All ${n} projects"><span class="text-cta">All projects</span></a>`;

  function render(all) {
    const projects = all.slice(0, HOME_COUNT);
    KT.homeProjects = projects; KT.allProjects = all;
    document.getElementById('track').innerHTML = projects.map(cardHTML).join('\n') + viewAll(all.length);
    // The opening slideshow uses the first project's photos.
    const first = projects[0];
    document.querySelectorAll('#intro .ph').forEach((el, i) => {
      const u = i % 2 === 0 ? (first.before || first.after) : first.after;
      el.style.backgroundImage = `url("${u}")`;
    });
  }

  KT.loadProjects().then(list => render(list || KT.FALLBACK)).finally(start);
})();
