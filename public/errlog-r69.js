/* R132: تطبيق جوجل بلاي (TWA): نلقط ?app=android قبل ما ينشال من الرابط */
try { if (/[?&]app=android\b/.test(location.search) || String(document.referrer).startsWith('android-app://')) localStorage.setItem('la3_app', 'android'); if (localStorage.getItem('la3_app') === 'android') document.documentElement.dataset.app = 'android'; } catch { /* */ }
/* R69zu: أي خطأ يصير بالموقع عند اللاعب يوصل للسيرفر (بدون بيانات شخصية) عشان نصلّحه بسرعة */
(() => {
  if (globalThis.__la3ErrLog) return; globalThis.__la3ErrLog = true;
  const VER = (document.querySelector('script[src*="preview/app.js"]')?.src.match(/v=([\w.-]+)/) || [])[1] || '';
  const seen = new Set(); let sent = 0, windowStart = Date.now();
  const send = (e) => {
    try {
      if (Date.now() - windowStart > 60000) { windowStart = Date.now(); sent = 0; }
      const key = (e.msg || '') + '|' + (e.src || '') + '|' + (e.line || 0); if (seen.has(key) || sent >= 5) return; seen.add(key); sent++;
      const nav = globalThis.__LA3BAK_NAV__; const body = JSON.stringify({ ...e, route: String((nav || location).hash || '').slice(0, 40), ua: navigator.userAgent.slice(0, 160), ver: VER });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/client-error', new Blob([body], { type: 'application/json' }));
      else fetch('/api/client-error', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
    } catch { /* ما نخرب الصفحة بسبب التسجيل */ }
  };
  const own = (src) => !src || src.startsWith(location.origin) || src.startsWith('/');
  addEventListener('error', (ev) => { if (!ev.message || !own(ev.filename)) return; send({ msg: String(ev.message).slice(0, 300), src: String(ev.filename || '').replace(location.origin, ''), line: ev.lineno, col: ev.colno, stack: String(ev.error?.stack || '').slice(0, 1200) }); });
  addEventListener('unhandledrejection', (ev) => { const r = ev.reason; const msg = r instanceof Error ? r.message : typeof r === 'string' ? r : ''; if (!msg) return; const m = String(r?.stack || '').match(/(\/[\w./-]+\.m?js)(?:\?[^:]*)?:(\d+):(\d+)/); if (m && !own(m[1])) return; send({ msg: ('(promise) ' + msg).slice(0, 300), src: m?.[1] || '', line: Number(m?.[2] || 0), col: Number(m?.[3] || 0), stack: String(r?.stack || '').slice(0, 1200) }); });
})();
/* R69zz: سرعة الموقع عند اللاعبين الحقيقيين (مرة وحدة بكل جلسة): وقت أول رد، وقت ظهور المحتوى، وقت التحميل الكامل */
(() => {
  try { if (sessionStorage.getItem('la3_perf')) return; sessionStorage.setItem('la3_perf', '1'); } catch { return; }
  let lcp = 0;
  try { new PerformanceObserver((l) => { const e = l.getEntries(); if (e.length) lcp = e[e.length - 1].startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch { /* سفاري القديم */ }
  addEventListener('load', () => setTimeout(() => {
    try {
      const n = performance.getEntriesByType('navigation')[0]; if (!n) return;
      const ua = navigator.userAgent, dev = /iPhone|iPad|iPod/.test(ua) ? 'iphone' : /Android/.test(ua) ? 'android' : 'desktop';
      const cn = navigator.connection?.effectiveType || '';
      const body = JSON.stringify({ dev, net: cn, ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd || performance.now()), lcp: Math.round(lcp || 0), standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true });
      navigator.sendBeacon?.('/api/client-perf', new Blob([body], { type: 'application/json' }));
    } catch { /* */ }
  }, 3000), { once: true });
})();
