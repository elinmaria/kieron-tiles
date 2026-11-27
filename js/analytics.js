/* Google Tag Manager (container in js/config.js). Skipped on the github.io preview and local testing. */
(() => {
  const id = window.KT_GTM, host = location.hostname;
  if (!id || /(^|\.)github\.io$|^localhost$|^127\.|^\[?::1\]?$|\.local$|\.test$/.test(host) || location.protocol === 'file:') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id);
  document.head.appendChild(s);
})();
