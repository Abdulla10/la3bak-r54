/* تثبيت الموقع كتطبيق (PWA)، نافذة iPhone، الفوتر، وشارة المميزات. */
import * as SFX from './sfx.js?v=r69zu-r6';

const ua = navigator.userAgent || '';
export const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

let deferred = null;
let dialog = null; // 'ios' | 'generic' | null
let onChange = () => {};

export function init(cb) {
  onChange = cb;
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    // R60b: لو الصفحة خلصت تحميل قبل ما يوصل هالسطر، حدث load ما يرجع يصير — فنسجّل على طول (قبل كان الـ SW أحيانًا ما يتسجل أبدًا)
    const reg = () => navigator.serviceWorker.register('/sw.js?v=r127b').catch(() => {});
    if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg);
    /* R69zz: لما تنزل نسخة جديدة من الموقع، نقول للاعب بدل ما يظل على القديمة */
    const hadController = !!navigator.serviceWorker.controller; let shown = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || shown) return; shown = true;
      const b = document.createElement('div'); b.setAttribute('role', 'status');
      b.style.cssText = 'position:fixed;z-index:2147483600;left:12px;right:12px;top:calc(10px + env(safe-area-inset-top));display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;background:linear-gradient(135deg,#3b0a6b,#1d0638);border:1.5px solid #f5c542;color:#fff;font:600 14px system-ui,sans-serif;direction:rtl;box-shadow:0 10px 30px rgba(0,0,0,.5)';
      b.innerHTML = '<span style="font-size:22px">✨</span><span style="flex:1">نسخة جديدة من لعبك جاهزة</span><button type="button" style="border:0;border-radius:12px;padding:8px 14px;font:800 14px system-ui;background:linear-gradient(#ffd86b,#e2a920);color:#2a1500">حدّث</button><button type="button" aria-label="لاحقاً" style="border:0;background:transparent;color:#fff;font-size:18px;opacity:.7">✕</button>';
      const [go, x] = b.querySelectorAll('button'); go.onclick = () => location.reload(); x.onclick = () => b.remove();
      // داخل لعبة شغالة ما نزعجه: يطلع بعد ما يطلع من اللعبة
      const put = () => { if (/^#\/room\//.test(String((globalThis.__LA3BAK_NAV__ || location).hash || ''))) { addEventListener('hashchange', put, { once: true }); return; } document.body.appendChild(b); };
      put();
    });
    // نتأكد من التحديثات لما يرجع للتطبيق (كل نص ساعة كحد أقصى)
    let lastCheck = Date.now();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - lastCheck > 30 * 60_000) { lastCheck = Date.now(); navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {}); } });
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    refreshFab();
    onChange();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    refreshFab();
    onChange();
  });
  refreshFab();
  /* R104: لو فاتح من أيقونة الجوال (تطبيق) نعلّم الصفحة، ولو من المتصفح نعرض شرح التثبيت مرة كل يومين */
  if (isStandalone()) document.documentElement.classList.add('is-app');
  else setTimeout(autoSheet, 6000);
}
const SEEN = 'la3_install_seen_v1';
const mobile = () => isIOS || /android/i.test(ua);
function autoSheet() {
  if (isStandalone() || !mobile() || dialog) return;
  let last = 0; try { last = Number(localStorage.getItem(SEEN)) || 0; } catch { /* */ }
  if (Date.now() - last < 2 * 86400_000) return;
  if (/^#\/(room|social-room|game|slot|foodwheel)\//.test(String((globalThis.__LA3BAK_NAV__ || location).hash || ''))) return;
  try { localStorage.setItem(SEEN, String(Date.now())); } catch { /* */ }
  openDialog(isIOS ? 'ios' : 'generic');
}

export const canInstall = () => !isStandalone();

export async function install() {
  if (deferred) {
    const d = deferred;
    deferred = null;
    d.prompt();
    try { await d.userChoice; } catch { /* ignore */ }
    refreshFab();
    onChange();
    return;
  }
  openDialog(isIOS ? 'ios' : 'generic');
}

const SHARE_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ADD_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
/* R104: شاشة تثبيت مثل التطبيقات — خطوات واضحة بالصور، وعلى أندرويد زر تثبيت مباشر */
export function openDialog(kind) {
  closeDialog();
  const inSafari = isIOS && !/crios|fxios|edgios/i.test(ua);
  dialog = document.createElement('div');
  dialog.className = 'ins104';
  const steps = kind === 'ios'
    ? `<li><i>${SHARE_SVG}</i><span>اضغط زر <b>المشاركة</b> ${inSafari ? 'تحت في سفاري' : 'في المتصفح'}</span></li>
       <li><i>${ADD_SVG}</i><span>اختر <b>«إضافة إلى الشاشة الرئيسية»</b></span></li>
       <li><i>✓</i><span>اضغط <b>«إضافة»</b>، وافتح لعبك من أيقونته على شاشتك</span></li>`
    : `<li><i>⋮</i><span>افتح قائمة المتصفح (الثلاث نقاط)</span></li>
       <li><i>${ADD_SVG}</i><span>اختر <b>«تثبيت التطبيق»</b> أو «إضافة إلى الشاشة الرئيسية»</span></li>
       <li><i>✓</i><span>افتح لعبك من أيقونته على شاشتك</span></li>`;
  dialog.innerHTML = `<div class="ins104-sheet" role="dialog" aria-modal="true" aria-labelledby="ins104t">
    <button class="ins104-x" type="button" aria-label="إغلاق">✕</button>
    <img class="ins104-ic" src="/icon-192.png" alt="" width="76" height="76">
    <h3 id="ins104t">ثبّت لعبك كتطبيق</h3>
    <p class="ins104-sub">يفتح بشاشة كاملة مثل التطبيق، بدون شريط المتصفح، وأسرع.</p>
    ${deferred ? '<button class="ins104-go" type="button" data-ins="go">📲 ثبّت الحين</button>' : `<ol class="ins104-steps">${steps}</ol>`}
    <button class="ins104-later" type="button">لاحقاً</button>
  </div>${kind === 'ios' && inSafari ? '<div class="ins104-arrow" aria-hidden="true">⬇</div>' : ''}`;
  const close = () => closeDialog();
  dialog.addEventListener('click', (e) => { if (e.target === dialog || e.target.closest('.ins104-x,.ins104-later')) close(); else if (e.target.closest('[data-ins="go"]')) { close(); install(); } });
  document.body.appendChild(dialog);
  ensureCss();
  dialog.querySelector('.ins104-x').focus({ preventScroll: true });
}
function ensureCss() {
  if (document.getElementById('ins104css')) return;
  const st = document.createElement('style'); st.id = 'ins104css';
  st.textContent = `.ins104{position:fixed;inset:0;z-index:2147483000;background:rgba(8,2,18,.66);display:flex;align-items:flex-end;justify-content:center;direction:rtl;animation:ins104f .25s ease both}
  @keyframes ins104f{from{opacity:0}}@keyframes ins104u{from{transform:translateY(100%)}}
  .ins104-sheet{position:relative;width:min(100%,480px);background:linear-gradient(180deg,#2b0f52,#170733);border-top:1.5px solid #f5c54288;border-radius:24px 24px 0 0;padding:22px 20px calc(18px + env(safe-area-inset-bottom));color:#fff;text-align:center;animation:ins104u .35s cubic-bezier(.2,.9,.3,1.1) both;box-shadow:0 -12px 40px rgba(0,0,0,.5)}
  .ins104-ic{width:76px;height:76px;border-radius:18px;box-shadow:0 8px 24px rgba(0,0,0,.45)}
  .ins104 h3{margin:10px 0 4px;font-size:21px;color:#ffd977}
  .ins104-sub{margin:0 0 14px;color:#e2d6f5;font-size:14px;line-height:1.6}
  .ins104-steps{list-style:none;margin:0 0 14px;padding:0;display:grid;gap:8px;text-align:right}
  .ins104-steps li{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.07);border:1px solid #ffffff1f;border-radius:14px;padding:10px 12px;font-size:14.5px;line-height:1.5}
  .ins104-steps i{flex:none;display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:#fff;color:#1a73e8;font-style:normal;font-weight:900;font-size:18px}
  .ins104-steps b{color:#ffd977}
  .ins104-go{width:100%;border:0;border-radius:14px;padding:14px;font:800 16px inherit;background:linear-gradient(90deg,#f5c542,#e0a92e);color:#2a1600;margin-bottom:8px;cursor:pointer}
  .ins104-later{border:0;background:transparent;color:#cdb8e6;font:700 14px inherit;padding:8px 16px;cursor:pointer}
  .ins104-x{position:absolute;top:12px;left:12px;width:34px;height:34px;border-radius:50%;border:1px solid #ffffff33;background:rgba(255,255,255,.08);color:#fff;font-size:16px;cursor:pointer}
  .ins104-arrow{position:fixed;bottom:calc(4px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);font-size:30px;color:#ffd977;animation:ins104b 1s ease-in-out infinite alternate;z-index:1;pointer-events:none;display:none}
  @keyframes ins104b{to{transform:translate(-50%,8px)}}`;
  document.head.appendChild(st);
}
export function closeDialog() {
  dialog?.remove();
  dialog = null;
}

/* الزر العائم «ثبّت كتطبيق» */
function refreshFab() {
  let fab = document.getElementById('installFab');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'installFab';
    fab.type = 'button';
    fab.className = 'install-fab';
    fab.dataset.act = 'install';
    fab.innerHTML = '<span aria-hidden="true">📲</span> ثبّت كتطبيق';
    document.body.appendChild(fab);
  }
  fab.hidden = isStandalone() || !(deferred || isIOS);
}

export const FEATURES = [
  ['🌐', 'دعم كامل للعربية والاتجاه من اليمين'],
  ['📴', 'يشتغل بدون إنترنت (الواجهة واللعب على نفس الجهاز)'],
  ['👤', 'ملف لاعب وإحصائيات'],
  ['🏆', 'صدارة أسبوعية'],
  ['🔊', 'أصوات ومؤثرات'],
  ['🔗', 'روابط دعوة للأصدقاء'],
  ['🎖️', 'إنجازات'],
  ['📲', 'يتثبّت كتطبيق'],
  ['🎨', '7 مظاهر'],
  ['🔥', 'تحدي يومي وسلسلة'],
  ['⭐', 'مهام ونجوم'],
  ['🔠', 'تكبير الخط'],
];
export const featuresHTML = () =>
  `<section class="card"><h2>مميزات الموقع</h2><div class="feat-grid" style="margin-top:12px">${FEATURES.map(([i, t]) => `<span class="feat"><span aria-hidden="true">${i}</span>${t}</span>`).join('')}</div></section>`;

/* الفوتر */
export function footerHTML(q) {
  const yr = new Date().getFullYear();
  return `<footer class="site-foot">
    <div class="links"><a href="#/about">عن الموقع</a><a href="#/privacy">سياسة الخصوصية</a><a href="/games">كل الألعاب</a><a href="/admin">الإدارة</a></div>
    <div class="tools">
      ${canInstall() ? `<button class="pill-btn" type="button" data-act="install">📲 ثبّت التطبيق</button>` : `<span class="pill-btn" style="display:inline-grid;place-items:center">✅ مثبّت</span>`}
      <button class="pill-btn" type="button" data-act="sound" aria-pressed="${SFX.isOn()}">${SFX.isOn() ? '🔊 الصوت يعمل' : '🔇 الصوت مكتوم'}</button>
      <button class="pill-btn" type="button" data-act="fontsize" aria-label="حجم الخط">🔠 الخط ${fontScale() === 1 ? 'عادي' : fontScale() === 1.12 ? 'كبير' : 'كبير جداً'}</button>
      <button class="pill-btn" type="button" data-act="quality" aria-pressed="${q === 'high'}">${q === 'high' ? '✨ جودة عالية' : '⚡ جودة خفيفة'}</button>
    </div>
    <div class="copy">© ${yr} لعبك — جميع الحقوق محفوظة</div>
  </footer>`;
}

/* حجم الخط: عادي / كبير / كبير جداً (تكبير الصفحة كلها) */
const FKEY = 'qa_font_v1';
const SCALES = [1, 1.12, 1.25];
export const fontScale = () => { try { const v = Number(localStorage.getItem(FKEY)); return SCALES.includes(v) ? v : 1; } catch { return 1; } };
export const nextFontScale = () => SCALES[(SCALES.indexOf(fontScale()) + 1) % SCALES.length];
export function setFontScale(v) {
  try { localStorage.setItem(FKEY, String(v)); } catch { /* ignore */ }
  document.documentElement.style.zoom = v === 1 ? '' : String(v);
}
document.documentElement.style.zoom = fontScale() === 1 ? '' : String(fontScale());

/* جودة الرسوم: «خفيفة» توقف الحركات والتمويه عشان الأجهزة الضعيفة */
const QKEY = 'qa_quality_v1';
export function quality() {
  try { return localStorage.getItem(QKEY) === 'low' ? 'low' : 'high'; } catch { return 'high'; }
}
export function setQuality(q) {
  try { localStorage.setItem(QKEY, q); } catch { /* ignore */ }
  document.documentElement.classList.toggle('lite', q === 'low');
}
document.documentElement.classList.toggle('lite', quality() === 'low');
