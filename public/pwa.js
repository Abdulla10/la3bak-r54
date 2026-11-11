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
    const reg = () => navigator.serviceWorker.register('/sw.js?v=r70').catch(() => {});
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

export function openDialog(kind) {
  closeDialog();
  dialog = document.createElement('div');
  dialog.className = 'modal-back';
  dialog.dataset.act = 'install-close-bg';
  const body =
    kind === 'ios'
      ? `<div class="big-emoji" aria-hidden="true">🍎</div>
         <h3 id="instTitle">ثبّت اللعبة على iPhone</h3>
         <p class="step-box">اضغط زر المشاركة في أسفل المتصفح، ثم اختر: «إضافة إلى الشاشة الرئيسية»</p>
         <p class="note">ستظهر اللعبة كتطبيق على شاشة جوالك مباشرة</p>`
      : `<div class="big-emoji" aria-hidden="true">📲</div>
         <h3 id="instTitle">ثبّت اللعبة كتطبيق</h3>
         <p class="step-box">افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»</p>
         <p class="note">إذا ما ظهر الخيار، جرّب متصفح كروم أو سفاري.</p>`;
  dialog.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="instTitle"><button class="x" type="button" data-act="install-close" aria-label="إغلاق">✕</button>${body}</div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('.x').focus();
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
    <div class="links"><a href="#/about">عن الموقع</a><a href="#/privacy">سياسة الخصوصية</a><a href="/admin">الإدارة</a></div>
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
