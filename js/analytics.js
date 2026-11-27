/* Analytics: Google Tag Manager (container in js/config.js), cookie consent and the events Kieron cares about.

   Tag Manager only runs on the real domain: never on the github.io preview or local testing.
   Consent: nothing that sets cookies may run until the visitor says yes. Tag Manager is told "denied" first;
   the little banner at the bottom asks once and remembers the answer in this browser. In Tag Manager, set the
   analytics tags to need analytics_storage consent. Privacy page has a "Cookie settings" link to change it.
   Preview the banner anywhere by adding ?cookies to the address.

   Events sent to Tag Manager (make a Custom Event trigger for each):
     enquiry_sent    the contact form went through          visit_requested (yes/no), photos (0-3)
     email_click     an email link was clicked               link_location (header, menu, footer, contact, ...)
     phone_click     a phone link was clicked                link_location
     project_view    a project was opened                    project_name, project_type */
(() => {
  const KT = window.KT = window.KT || {};
  const id = (window.KT_GTM || '').trim(), host = location.hostname;
  const preview = /(^|\.)github\.io$|^localhost$|^127\.|^\[?::1\]?$|\.local$|\.test$/.test(host) || location.protocol === 'file:';
  const live = !!id && !preview;
  const forceBanner = /[?&]cookies\b/.test(location.search);

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  KT.track = (event, params = {}) => { dataLayer.push(Object.assign({ event }, params)); };

  /* ---- consent ---- */
  const KEY = 'kt-consent';
  const saved = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const keep = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
  const state = v => ({ analytics_storage: v, ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  gtag('consent', 'default', Object.assign(state('denied'), { wait_for_update: 500 }));
  if (saved() === 'granted') gtag('consent', 'update', state('granted'));

  /* ---- Tag Manager ---- */
  if (live) {
    dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }

  /* ---- the banner ---- */
  function banner() {
    if (document.querySelector('.cookie-note')) return;
    const box = document.createElement('div');
    box.className = 'cookie-note';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Cookies');
    box.innerHTML = `<p>Can we count your visit? It helps Kieron see which projects people like. No adverts, nothing sold on. <a href="privacy.html#cookies">More about cookies</a></p>
      <div class="cookie-actions"><button type="button" class="cookie-yes">That's fine</button><button type="button" class="cookie-no">No thanks</button></div>`;
    const answer = v => {
      keep(v);
      gtag('consent', 'update', state(v));
      if (v === 'granted') KT.track('consent_granted');
      box.classList.add('going');
      setTimeout(() => box.remove(), 400);
    };
    box.querySelector('.cookie-yes').addEventListener('click', () => answer('granted'));
    box.querySelector('.cookie-no').addEventListener('click', () => answer('denied'));
    document.body.appendChild(box);
    requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('in')));
  }
  KT.cookieSettings = banner;

  const ready = fn => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn());
  ready(() => {
    if (forceBanner || (live && !saved())) setTimeout(banner, 900);
    document.querySelectorAll('[data-cookie-settings]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); banner(); }));
  });

  /* ---- email and phone clicks ---- */
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const kind = href.startsWith('mailto:') ? 'email_click'
      : (href.startsWith('tel:') || a.matches('#nav-phone, .m-phone, .nav-phone')) ? 'phone_click' : null;
    if (!kind) return;
    const where = a.closest('.m-contact') ? 'menu' : a.closest('header') ? 'header' : a.closest('footer') ? 'footer'
      : (document.body.dataset.page || 'page');
    KT.track(kind, { link_location: where });
  }, true);
})();
