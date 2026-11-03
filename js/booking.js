/* Free home visit booking: Cal.com inline embed on the Contact page.
   The event link is set in contact.html (window.KT_BOOKING). */
(() => {
  const link = (window.KT_BOOKING || '').replace(/^https?:\/\/(app\.)?cal\.com\//, '').replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '');
  const box = document.getElementById('cal-inline');
  const fallback = document.getElementById('cal-fallback');
  if (!box) return;
  if (!link) { box.innerHTML = '<p class="cal-loading">Booking opens soon. In the meantime, send a message below.</p>'; if (fallback) fallback.hidden = true; return; }
  if (fallback) fallback.href = 'https://cal.com/' + link;

  // Cal.com's loader (adds https://app.cal.com/embed/embed.js on first use)
  (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");

  Cal("init", "visit", { origin: "https://cal.com" });
  Cal.ns.visit("inline", {
    elementOrSelector: "#cal-inline",
    calLink: link,
    config: { layout: innerWidth < 820 ? "column_view" : "month_view", theme: "light" }
  });
  Cal.ns.visit("ui", {
    theme: "light",
    hideEventTypeDetails: false,
    layout: innerWidth < 820 ? "column_view" : "month_view",
    styles: { branding: { brandColor: "#2E2E2E" } },
    cssVarsPerTheme: { light: { "cal-brand": "#2E2E2E", "cal-brand-emphasis": "#8B261D", "cal-brand-text": "#F4EFE3" } }
  });
  // once the calendar has loaded, drop the "Loading" line
  const t = setInterval(() => { if (box.querySelector('iframe')) { const l = box.querySelector('.cal-loading'); if (l) l.remove(); clearInterval(t); } }, 300);
  setTimeout(() => clearInterval(t), 20000);
})();
