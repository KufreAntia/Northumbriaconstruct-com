/* Cookie-free statistics. No collection until the visitor explicitly allows it. */
(() => {
  'use strict';
  const preferenceKey = 'nc-statistics-preference-v1';
  let preference = readPreference();
  let config;
  let started = false;
  const signal = () => navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
  function readPreference() {
    try { return localStorage.getItem(preferenceKey); } catch { return 'off'; }
  }
  const allowed = () => preference === 'on' && !signal();
  function pagePath() {
    const path = location.pathname === '/index.html' ? '/' : location.pathname;
    return config?.pages.includes(path) ? path : null;
  }
  function send(kind, target) {
    const page = pagePath();
    if (!allowed() || !config?.enabled || !page) return;
    // Never send a URL, query, fragment, referrer, form value or visitor identifier.
    fetch('/api/analytics-collect', {
      method: 'POST', credentials: 'omit', keepalive: true, referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(target ? { kind, page, target } : { kind, page })
    }).catch(() => {}); // Navigation always continues, including when statistics fail.
  }
  function start() {
    if (started || !allowed() || !config?.enabled || !pagePath()) return;
    started = true;
    send('pageview');
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    window.va('beforeSend', event => {
      if (!allowed() || !pagePath() || event.type !== 'pageview') return null;
      // The provider's referrer is not exposed by beforeSend. Suppress Vercel
      // collection when it could contain information beyond known public paths.
      try {
        if (document.referrer) {
          const referrer = new URL(document.referrer);
          const path = referrer.pathname === '/index.html' ? '/' : referrer.pathname;
          if (referrer.origin !== location.origin || referrer.search || !config.pages.includes(path)) return null;
        }
      } catch { return null; }
      return { ...event, url: location.origin + pagePath() };
    });
    const script = document.createElement('script');
    script.defer = true;
    script.src = '/_vercel/insights/script.js';
    script.referrerPolicy = 'no-referrer';
    document.head.append(script);
  }
  function choose(value) {
    preference = value;
    try { localStorage.setItem(preferenceKey, value); } catch { preference = 'off'; }
    render();
    start();
  }
  function render() {
    const status = document.querySelector('[data-statistics-status]');
    if (status) status.textContent = signal() ? 'Statistics are off because your browser requests privacy.' : !config?.enabled ? 'Website statistics are currently disabled.' : allowed() ? 'Anonymous statistics are on. You can turn them off at any time.' : 'Anonymous statistics are off.';
    document.querySelectorAll('[data-statistics-choice="on"]').forEach(button => { button.disabled = signal() || !config?.enabled; });
    document.querySelector('[data-statistics-notice]')?.remove();
    if (preference || signal() || !config?.enabled) return;
    const notice = document.createElement('aside');
    notice.className = 'statistics-notice';
    notice.dataset.statisticsNotice = '';
    notice.setAttribute('aria-label', 'Anonymous statistics preference');
    notice.innerHTML = '<p>May we collect anonymous, cookie-free statistics to improve this website? <a href="/privacy.html#website-statistics">Privacy and choices</a></p><div><button type="button" data-statistics-choice="on">Allow statistics</button><button type="button" data-statistics-choice="off">Keep statistics off</button></div>';
    document.body.append(notice);
  }
  function recordClick(event) {
    const button = event.target.closest('[data-statistics-choice]');
    if (button) { choose(button.dataset.statisticsChoice); return; }
    const link = event.target.closest('a[href]');
    if (!link || !allowed() || !config?.enabled) return;
    let url;
    try { url = new URL(link.getAttribute('href'), location.href); } catch { return; }
    const destination = url.origin === location.origin ? url.pathname + url.hash : url.href;
    const target = config.targets.find(item => item.destination === destination);
    if (target) send('click', target.id);
  }
  document.addEventListener('click', recordClick);
  document.addEventListener('auxclick', event => { if (event.button === 1) recordClick(event); });
  window.addEventListener('storage', event => {
    if (event.key === preferenceKey) { preference = readPreference(); render(); start(); }
  });
  fetch('/api/analytics-config', { credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' })
    .then(response => response.ok ? response.json() : null)
    .then(value => { config = value; render(); start(); }).catch(() => { render(); });
})();
