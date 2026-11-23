/* The project view, shared by the homepage and the projects page.
   KT.detail.open(project, fromEl) opens it; fromEl is the photo frame that was clicked,
   so the photo can grow out of it. KT.bindSlider(frame) wires up a before/after slider. */
(() => {
  const KT = window.KT = window.KT || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);

  /* ---- before / after slider ---- */
  KT.bindSlider = frame => {
    const h = frame.querySelector('.handle');
    if (!h || h.dataset.bound) return;
    h.dataset.bound = '1';
    const cur = $('cursor');
    const set = p => {
      p = Math.max(0, Math.min(100, p));
      frame.style.setProperty('--pos', p + '%');
      const cd = frame.closest('.card'); if (cd) cd.style.setProperty('--pos', p + '%');
      h.setAttribute('aria-valuenow', Math.round(p));
    };
    const fromX = x => { const r = frame.getBoundingClientRect(); set((x - r.left) / r.width * 100); };
    let on = false;
    h.addEventListener('pointerdown', e => { e.stopPropagation(); on = true; KT.sliding = frame; h.setPointerCapture(e.pointerId); cur && cur.classList.add('slide'); });
    h.addEventListener('pointermove', e => { if (on) fromX(e.clientX); });
    const end = () => { on = false; KT.sliding = null; cur && cur.classList.remove('slide'); };
    h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
    h.addEventListener('click', e => e.stopPropagation());
    h.addEventListener('keydown', e => {
      const step = e.key === 'ArrowLeft' ? -4 : e.key === 'ArrowRight' ? 4 : 0;
      if (!step) return;
      e.preventDefault();
      set((parseFloat(frame.style.getPropertyValue('--pos')) || 37) + step);
    });
  };

  /* ---- photo frames ---- */
  const esc = s => KT.esc(s);
  KT.frameHTML = (p, opts = {}) => {
    const after = opts.thumbs ? p.afterThumb : p.after, before = opts.thumbs ? p.beforeThumb : p.before;
    if (!p.before) return `<div class="frame"><div class="ph ph-after" role="img" aria-label="${esc(p.title)}" style="${KT.bg(after)}"></div></div>`;
    return `<div class="frame" style="--pos:37%">
      <div class="ph ph-after" role="img" aria-label="${esc(p.title)}, after" style="${KT.bg(after)}"></div>
      <div class="before"><div class="ph ph-before" role="img" aria-label="${esc(p.title)}, before" style="${KT.bg(before)}"></div></div>
      <div class="divider"></div>
      <button class="handle" type="button" role="slider" aria-label="Compare before and after" aria-valuemin="0" aria-valuemax="100" aria-valuenow="37"></button>
    </div>`;
  };
  const photoFrame = (url, label) => {
    const f = document.createElement('div'); f.className = 'frame';
    f.innerHTML = `<div class="ph" role="img" aria-label="${esc(label)}" style="${KT.bg(url)}"></div>`;
    return f;
  };

  /* ---- the view ---- */
  let openFrom = null, onClose = null;
  const detail = () => $('detail');

  function fillText(p) {
    const set = (id, v) => {
      const el = $(id); if (!el) return;
      el.textContent = v || '';
      if (el.dataset.row !== undefined) { el.hidden = !v; el.previousElementSibling.hidden = !v; }
    };
    set('d-l1', p.title); set('d-l2', p.year ? p.year + '.' : '');
    set('d-text', p.description); $('d-text').hidden = !p.description;
    set('d-type', p.type); set('d-loc', p.location); set('d-year', p.year);
  }

  function fillPhotos(p, mainFrame) {
    const stage = $('d-img'), strip = $('d-thumbs');
    stage.innerHTML = ''; stage.append(mainFrame); KT.bindSlider(mainFrame);
    if (!strip) return;
    const extra = p.photos || [];
    strip.innerHTML = ''; strip.hidden = !extra.length;
    if (!extra.length) return;
    const items = [{ main: true, thumb: p.afterThumb || p.after, label: p.before ? 'Before and after' : 'Main photo' }]
      .concat(extra.map((u, i) => ({ url: u, thumb: (p.photoThumbs || [])[i] || u, label: 'Photo ' + (i + 2) })));
    items.forEach((it, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'thumb-btn' + (i ? '' : ' on');
      b.setAttribute('aria-label', it.label); b.setAttribute('aria-pressed', i ? 'false' : 'true');
      b.style.backgroundImage = `url("${it.thumb}")`;
      if (it.main && p.before) b.classList.add('pair');
      b.addEventListener('click', () => {
        strip.querySelectorAll('.thumb-btn').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        const next = it.main ? mainFrame : photoFrame(it.url, p.title + ', ' + it.label.toLowerCase());
        stage.classList.add('swap');
        setTimeout(() => { stage.innerHTML = ''; stage.append(next); stage.classList.remove('swap'); }, reduce ? 0 : 280);
      });
      strip.append(b);
    });
  }

  KT.detail = {
    open(p, fromEl, opts = {}) {
      const d = detail(), dImg = $('d-img');
      let main;
      if (opts.frame) main = opts.frame;
      else { const t = document.createElement('div'); t.innerHTML = KT.frameHTML(p); main = t.firstElementChild; }
      main.style.transform = ''; main.removeAttribute('tabindex');
      fillText(p); fillPhotos(p, main);
      onClose = opts.onClose || null;
      d.setAttribute('aria-hidden', 'false');
      openFrom = fromEl || null;
      d.scrollTop = 0;
      d.classList.add('open');
      if (!reduce && fromEl) {
        const from = fromEl.getBoundingClientRect(), to = dImg.getBoundingClientRect();
        dImg.classList.remove('flip');
        dImg.style.transform = `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width})`;
        dImg.getBoundingClientRect();
        dImg.classList.add('flip'); dImg.style.transform = '';
      }
      document.body.style.overflow = 'hidden'; document.body.classList.add('detail-open');
      setTimeout(() => $('d-close').focus({ preventScroll: true }), 300);
    },
    close() {
      const d = detail(), dImg = $('d-img');
      if (!d.classList.contains('open')) return;
      if (!reduce && openFrom && openFrom.isConnected && openFrom.offsetParent) {
        const from = openFrom.getBoundingClientRect(), to = dImg.getBoundingClientRect();
        dImg.classList.add('flip');
        dImg.style.transform = `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width})`;
      }
      d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; document.body.classList.remove('detail-open');
      setTimeout(() => { if (d.classList.contains('open')) return; dImg.innerHTML = ''; dImg.style.transform = ''; dImg.classList.remove('flip'); }, 950);
      if (openFrom && openFrom.isConnected) openFrom.focus({ preventScroll: true });
      const cb = onClose; onClose = null; if (cb) cb();
    },
    isOpen: () => detail().classList.contains('open')
  };

  document.addEventListener('DOMContentLoaded', () => {
    const c = $('d-close'); if (c) c.addEventListener('click', () => KT.detail.close());
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && $('detail')) KT.detail.close(); });
})();
