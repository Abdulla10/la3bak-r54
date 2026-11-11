/* R77: حارس التشغيل — لو الموقع ما ظهر (كاش قديم بالجوال أو ملف ما تحمّل)، يصلّح نفسه بدون ما اللاعب يسوي شي:
   1) يمسح الكاش وعامل الخدمة ويعيد التحميل  2) يجرب النسخة غير المدموجة  3) يطلع رسالة واضحة مع زر إعادة المحاولة */
(() => {
  if (globalThis.__la3Guard) return; globalThis.__la3Guard = true;
  const url = new URL(location.href); const tries = Number(url.searchParams.get('lg') || 0) || 0;
  const fails = [];
  addEventListener('error', (e) => { const t = e.target; if (t && t !== window && (t.src || t.href)) fails.push('load ' + String(t.src || t.href).replace(location.origin, '')); else if (e.message) fails.push(String(e.message).slice(0, 160)); }, true);
  addEventListener('unhandledrejection', (e) => { const r = e.reason; fails.push('(promise) ' + String((r && r.message) || r).slice(0, 160)); });
  const ok = () => { const v = document.getElementById('view'); return !!(v && [...v.children].some((c) => !c.hasAttribute('data-skel'))); };
  const report = (stage) => { try { const body = JSON.stringify({ msg: 'boot-guard ' + stage + ': ' + fails.slice(0, 6).join(' | ').slice(0, 280), src: '/boot-guard-r77.js', line: tries, col: 0, stack: fails.join('\n').slice(0, 1200), route: location.hash.slice(0, 40), ua: navigator.userAgent.slice(0, 160), ver: 'r77' }); navigator.sendBeacon && navigator.sendBeacon('/api/client-error', new Blob([body], { type: 'application/json' })); } catch (_) { /* لا شي */ } };
  const clean = () => { if (!tries) return; try { url.searchParams.delete('lg'); url.searchParams.delete('nb'); url.searchParams.delete('fresh'); history.replaceState(history.state, '', url.pathname + (url.search || '') + location.hash); } catch (_) { /* لا شي */ } };
  const heal = async () => {
    report('heal' + tries);
    try { const rs = await (navigator.serviceWorker && navigator.serviceWorker.getRegistrations ? navigator.serviceWorker.getRegistrations() : []); await Promise.all((rs || []).map((r) => r.unregister())); } catch (_) { /* لا شي */ }
    try { if (globalThis.caches) { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))); } } catch (_) { /* لا شي */ }
    const u = new URL(location.href); u.searchParams.set('lg', String(tries + 1)); u.searchParams.set('fresh', String(Date.now())); if (tries >= 1) u.searchParams.set('nb', '1');
    location.replace(u.href);
  };
  const showBox = () => {
    report('box');
    if (document.getElementById('la3GuardBox')) return;
    const d = document.createElement('div'); d.id = 'la3GuardBox';
    d.setAttribute('style', 'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:#120822;color:#fff;font-family:system-ui,-apple-system,sans-serif;direction:rtl;padding:24px;text-align:center');
    d.innerHTML = '<div style="max-width:340px"><div style="font-size:44px">🎮</div><h2 style="margin:10px 0;color:#ffd66b;font-size:20px">لعبك</h2><p style="margin:0 0 16px;line-height:1.7;color:#efe4ff">الاتصال ضعيف أو الموقع يتحدّث الحين. اضغط الزر عشان نحاول من جديد.</p><button id="la3GuardBtn" style="border:0;border-radius:14px;padding:12px 26px;font-size:16px;font-weight:700;background:linear-gradient(135deg,#ffd66b,#f0b429);color:#2a1500">حاول مرة ثانية</button></div>';
    document.body.appendChild(d);
    document.getElementById('la3GuardBtn').onclick = () => { const u = new URL(location.href); u.searchParams.set('lg', '0'); u.searchParams.set('fresh', String(Date.now())); location.replace(u.href); };
  };
  /* R78: الهيكل المؤقت (يطلع فوراً بدل الشاشة السودا) ينشال أول ما تظهر الصفحة الحقيقية */
  const dropSkel = () => { const v = document.getElementById('view'); if (!v) return false; if (ok()) { v.querySelectorAll(':scope > [data-skel]').forEach((n) => n.remove()); return true; } return false; };
  const watchSkel = () => { const v = document.getElementById('view'); if (!v || dropSkel()) return; try { const mo = new MutationObserver(() => { if (dropSkel()) mo.disconnect(); }); mo.observe(v, { childList: true }); } catch (_) { /* لا شي */ } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchSkel); else watchSkel();
  let done = false;
  const check = () => { if (done) return; if (ok()) { done = true; clean(); return; } done = true; if (tries < 2) heal(); else showBox(); };
  /* بعد ما يخلص التحميل نعطيه مهلة، وحد أقصى لو التحميل نفسه علّق */
  addEventListener('load', () => setTimeout(check, 4000));
  setTimeout(check, 15000);
  /* لو ظهر بعدين (نت بطيء) نشيل الرسالة */
  setInterval(() => { if (ok()) { const b = document.getElementById('la3GuardBox'); if (b) b.remove(); } }, 1500);
})();
