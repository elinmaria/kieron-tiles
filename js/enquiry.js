/* Contact page enquiry form (Netlify Forms).
   - Up to 3 photos, one per hidden file input (Netlify takes one file per input).
   - Large phone photos are shrunk in the browser so an enquiry stays under Netlify's 8 MB limit.
   - Sends in the background and shows a thank-you, or a clear message if it can't send. */
(() => {
  const form = document.getElementById('enquiry');
  if (!form) return;
  const inputs = [...form.querySelectorAll('input[type=file]')];
  const list = document.getElementById('photo-list');
  const addBtn = document.getElementById('add-photo');
  const status = document.getElementById('status');
  const send = document.getElementById('send');
  const LIMIT = 7.5 * 1024 * 1024;     // keep a margin under Netlify's 8 MB per enquiry
  const MAX_SIDE = 1800;               // longest side after shrinking, in pixels

  // hand-drawn underline on the send button, like the nav links
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'scribble'); svg.setAttribute('viewBox', '0 0 120 14');
  svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', 'M3 9.6C21 6.8 40 11.2 61 8.4S100 5.4 117 8.6'); p.setAttribute('pathLength', '1');
  svg.append(p); send.append(svg);

  /* ---- photos ---- */
  const shrink = file => new Promise(resolve => {
    if (!/^image\//.test(file.type) || file.type === 'image/gif') return resolve(file);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      if (scale === 1 && file.size < 1.5 * 1024 * 1024) { URL.revokeObjectURL(url); return resolve(file); }
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => resolve(b ? new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };  // e.g. HEIC the browser can't read: send as is
    img.src = url;
  });

  const setFile = (input, file) => {
    try { const dt = new DataTransfer(); if (file) dt.items.add(file); input.files = dt.files; }
    catch (e) { if (!file) input.value = ''; }
  };

  function render() {
    list.textContent = '';
    inputs.forEach(input => {
      const f = input.files && input.files[0]; if (!f) return;
      const t = document.createElement('div'); t.className = 'thumb';
      t.style.backgroundImage = `url("${URL.createObjectURL(f)}")`;
      t.title = f.name;
      const x = document.createElement('button'); x.type = 'button'; x.textContent = '×';
      x.setAttribute('aria-label', 'Remove ' + f.name);
      x.addEventListener('click', () => { setFile(input, null); render(); });
      t.append(x); list.append(t);
    });
    addBtn.hidden = inputs.every(i => i.files && i.files.length);
  }

  addBtn.addEventListener('click', () => {
    const free = inputs.find(i => !(i.files && i.files.length));
    if (free) free.click();
  });
  inputs.forEach(input => input.addEventListener('change', async () => {
    const f = input.files && input.files[0]; if (!f) return render();
    addBtn.textContent = 'Preparing photo…'; addBtn.disabled = true;
    const small = await shrink(f);
    if (small !== f) setFile(input, small);
    addBtn.textContent = '+ Add a photo'; addBtn.disabled = false;
    render();
  }));

  /* ---- checks ---- */
  const fields = [
    ['f-name', v => v.trim() ? '' : 'Please add your name.'],
    ['f-email', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Please add an email address Kieron can reply to.'],
    ['f-msg', v => v.trim() ? '' : 'A line or two about the job helps Kieron quote.']
  ];
  function check() {
    let first = null;
    fields.forEach(([id, rule]) => {
      const el = document.getElementById(id), box = el.closest('.field');
      const msg = rule(el.value);
      box.classList.toggle('invalid', !!msg);
      let e = box.querySelector('.err');
      if (msg) { if (!e) { e = document.createElement('span'); e.className = 'err'; box.append(e); } e.textContent = msg; first = first || el; }
      else if (e) e.remove();
    });
    if (first) first.focus();
    return !first;
  }
  fields.forEach(([id]) => document.getElementById(id).addEventListener('input', e => {
    const box = e.target.closest('.field'); if (box.classList.contains('invalid')) check();
  }));

  /* ---- send ---- */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.className = 'status'; status.textContent = '';
    if (!check()) return;
    const total = inputs.reduce((s, i) => s + ((i.files && i.files[0]) ? i.files[0].size : 0), 0);
    if (total > LIMIT) { status.className = 'status bad'; status.textContent = 'The photos are too large together. Remove one and try again.'; return; }
    send.disabled = true; status.textContent = 'Sending…';
    try {
      const r = await fetch(form.getAttribute('action') || '/', { method: 'POST', body: new FormData(form) });
      if (!r.ok) throw new Error(r.status);
      const name = document.getElementById('f-name').value.trim().split(' ')[0];
      form.classList.add('done');
      form.innerHTML = `<h2 class="enquiry-title">Thank you${name ? ', ' + name.replace(/[<>&"]/g, '') : ''}.</h2><p class="thanks">Your enquiry is with Kieron. He'll get back to you by email, usually within a couple of days.</p>`;
    } catch (err) {
      send.disabled = false;
      status.className = 'status bad';
      status.textContent = "Sorry, that didn't send. Please try again, or email Email@email.com directly.";
    }
  });
})();
