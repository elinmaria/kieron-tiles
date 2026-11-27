/* Contact page enquiry form.
   Sends to Kieron's Google account through a small Apps Script web app (apps-script/Code.gs; its address
   goes in js/config.js as KT_FORM_URL). That script emails Kieron, puts the visit request in his Google
   Calendar, saves photos to Drive and logs the enquiry in a Google Sheet. Works on any host.
   - Up to 3 photos; large phone photos are shrunk in the browser first.
   - Sends in the background and shows a thank-you, or a clear message if it can't send. */
(() => {
  const form = document.getElementById('enquiry');
  if (!form) return;
  const inputs = [...form.querySelectorAll('input[type=file]')];
  const list = document.getElementById('photo-list');
  const addBtn = document.getElementById('add-photo');
  const status = document.getElementById('status');
  const send = document.getElementById('send');
  const LIMIT = 15 * 1024 * 1024;      // all photos together, after shrinking
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

  /* ---- when can Kieron pop round? ----
     A short list: this week (then pick a day, Mon to Fri), next week, any day, or just email.
     From Thursday on, "this week" becomes next week and "next week" the week after. */
  const opts = document.getElementById('visit-options');
  if (opts) {
    const out = document.getElementById('visit-day'), outDate = document.getElementById('visit-date');
    const note = document.getElementById('visit-note'), days = document.getElementById('visit-days');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dow = (today.getDay() + 6) % 7, late = dow >= 3;              // 0 = Monday; Thursday onwards counts as late
    const monday = new Date(today); monday.setDate(today.getDate() - dow + (late ? 7 : 0));
    const short = d => d.toLocaleDateString('en-GB', { weekday: 'short' }) + ' ' + d.getDate();
    const long = d => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (late) {
      document.getElementById('this-week-label').textContent = 'Next week';
      opts.querySelector('input[value=next-week]').nextElementSibling.nextElementSibling.textContent = 'The week after';
    }
    const week = [...Array(5)].map((_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
    days.innerHTML = week.map((d, i) => `<label class="day"><input type="radio" name="visit-choice" value="${i}"${d <= today ? ' disabled' : ''}><span>${short(d)}</span></label>`).join('');
    const say = {
      'next-week': late ? 'The week after it is. Kieron will message to fix a day.' : 'Next week it is. Kieron will message to fix a day.',
      any: 'Lovely. Kieron will suggest a day that suits him.',
      email: "No problem. Kieron will just reply by email."
    };
    const value = { 'next-week': late ? 'The week after' : 'Next week', any: 'Any day', email: 'No visit, just email' };
    const set = (v, date, text) => { out.value = v; outDate.value = date || ''; note.textContent = text || ''; };
    opts.addEventListener('change', e => {
      const r = e.target;
      if (r.name === 'visit-when') {
        opts.querySelectorAll('.option').forEach(o => o.classList.toggle('on', o.contains(r) && r.checked));
        days.hidden = r.value !== 'this-week';
        if (r.value === 'this-week') {
          days.querySelectorAll('input').forEach(i => { i.checked = false; });
          set('', '', 'Pick a day and Kieron will confirm the time.');
          const first = days.querySelector('input:not(:disabled)'); if (first) first.focus();
        } else set(value[r.value], '', say[r.value]);
      } else if (r.name === 'visit-choice') {
        const d = week[+r.value];
        set(long(d), iso(d), `Lovely, ${long(d)} it is. Kieron will confirm the time.`);
      }
    });
  }

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
      const URL_ = (window.KT_FORM_URL || '').trim();
      if (!URL_) throw new Error('No form address set');
      const toData = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });
      const photos = [];
      for (const i of inputs) { const f = i.files && i.files[0]; if (f) photos.push({ name: f.name, type: f.type || 'image/jpeg', data: await toData(f) }); }
      const fd = new FormData(form), v = k => (fd.get(k) || '').toString().trim();
      const payload = { name: v('name'), email: v('email'), phone: v('phone'), area: v('area'), job: v('job'), message: v('message'),
        visitDay: v('visit-day'), visitDate: v('visit-date'), botField: v('bot-field'), page: location.href, photos };
      // text/plain keeps this a "simple" request, which Apps Script accepts from any website
      const r = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const res = await r.json().catch(() => ({}));
      if (!r.ok || !res.ok) throw new Error(res.error || r.status);
      const name = document.getElementById('f-name').value.trim().split(' ')[0];
      if (KT.track) KT.track('enquiry_sent', { visit_requested: payload.visitDate ? 'yes' : 'no', photos: photos.length });
      form.classList.add('done');
      form.innerHTML = `<h2 class="enquiry-title">Thank you${name ? ', ' + name.replace(/[<>&"]/g, '') : ''}.</h2><p class="thanks">${payload.visitDate ? "Your visit request is in Kieron's calendar. He'll confirm the time by email, usually within a couple of days." : "Your enquiry is with Kieron. He'll get back to you by email, usually within a couple of days."}</p>`;
    } catch (err) {
      send.disabled = false;
      status.className = 'status bad';
      status.textContent = "Sorry, that didn't send. Please try again, or email Email@email.com directly.";
    }
  });
})();
