/* الدخول بـ Google: زر «Sign in with Google» الرسمي يعطينا رمز ID، والخادم هو اللي يتحقق منه ويبني الجلسة.
   ما فيه أسرار هنا: معرّف العميل عام ويجي من /api/auth/config. */
const A = { cfg: undefined, gsi: null, inited: false };
const FALLBACK_ID = '122506681992-rfqqr0ji8l7srsbfl1jj6pl5qknsa6jb.apps.googleusercontent.com';

async function config() {
  if (A.cfg !== undefined) return A.cfg;
  /* R98: لو الطلب فشل (شبكة/خادم) ما نحفظ الفشل، نعيد المحاولة مرة ثانية */
  for (let i = 0; i < 2; i++) {
    try { const r = await fetch('/api/auth/config', { cache: 'no-store' }); if (r.ok) { A.cfg = (await r.json()).google || null; return A.cfg; } } catch { /* نعيد */ }
    await new Promise((ok) => setTimeout(ok, 400));
  }
  /* R99: لو الخادم ما رد على الإعداد، نستخدم معرّف Google العام (مب سر) عشان الزر يطلع دايماً */
  return FALLBACK_ID;
}

function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  A.gsi ??= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
    s.onload = () => res(); s.onerror = () => { A.gsi = null; rej(new Error('gsi')); };
    document.head.appendChild(s);
  });
  return A.gsi;
}

const UA = navigator.userAgent || '';
const useRedirect = () => /iphone|ipad|ipod|android|mobile|FBAN|FBAV|Instagram|Snapchat|TikTok|Line\/|WhatsApp|Telegram|wv\)/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) || matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
const cookieGet = (k) => (document.cookie.match(new RegExp('(?:^|;\\s*)' + k + '=([^;]+)')) || [])[1] || '';
const cookieDel = (k) => { document.cookie = `${k}=; Path=/; Max-Age=0; SameSite=Lax`; };
function note(msg) {
  const n = document.createElement('div'); n.setAttribute('role', 'alert');
  n.style.cssText = 'position:fixed;z-index:2147483600;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top));padding:12px 14px;border-radius:16px;background:linear-gradient(135deg,#3b0a6b,#1d0638);border:1.5px solid #f5c542;color:#fff;font:700 14px system-ui,sans-serif;direction:rtl;box-shadow:0 10px 30px rgba(0,0,0,.5);text-align:center';
  n.textContent = msg; n.onclick = () => n.remove(); document.body.append(n); setTimeout(() => n.remove(), 6000);
}
/** R112: نكمّل دخول Google بعد ما يرجع من صفحة Google (التذكرة بكوكي قصير) */
async function resumeRedirect() {
  if (cookieGet('g_err')) { cookieDel('g_err'); note('تعذّر تسجيل الدخول بـ Google، جرّب مرة ثانية.'); return; }
  const ticket = cookieGet('g_tk'); if (!ticket) return; cookieDel('g_tk');
  try {
    let body = { ticket };
    let r = await fetch('/api/auth/google', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let j = await r.json().catch(() => ({}));
    while (!r.ok && j.need2fa) {
      const code = await askTotp(j.error); if (!code) throw new Error('ألغيت تسجيل الدخول.');
      body = { ticket, totp: code };
      r = await fetch('/api/auth/google', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      j = await r.json().catch(() => ({}));
    }
    if (!r.ok) throw new Error(j.error || 'فشل تسجيل الدخول.');
    try { sessionStorage.setItem('la3_after_login', '1'); } catch { /* */ }
    location.replace('/#/profile'); setTimeout(() => location.reload(), 50);
  } catch (e) { note(e.message || 'فشل تسجيل الدخول.'); }
}
if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resumeRedirect, { once: true }); else setTimeout(resumeRedirect, 0); }

export async function enabled() { return !!(await config()); }

/** يعرض زر Google داخل el. onLogin(user) بعد نجاح الخادم، onError(msg) عند الفشل */
/** R69: نافذة رمز التحقق بخطوتين (ترجع الرمز أو null لو ألغى) */
function askTotp(msg) {
  return new Promise((done) => {
    const ov = document.createElement('div'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'رمز التحقق');
    ov.style.cssText = 'position:fixed;inset:0;z-index:300;background:#000a;display:flex;align-items:center;justify-content:center;direction:rtl;padding:16px';
    ov.innerHTML = `<form style="width:min(100%,360px);background:linear-gradient(160deg,#3a1060,#170830);border:1px solid #a86bff66;border-radius:20px;padding:18px;color:#fff;font-family:inherit;text-align:center">
      <b style="font-size:18px">🔐 التحقق بخطوتين</b><p style="font-size:14px;opacity:.85;line-height:1.6;margin:8px 0 12px"></p>
      <input inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-label="الرمز" style="width:100%;box-sizing:border-box;border-radius:12px;border:1px solid #9b5cff;background:#0f0520;color:#fff;padding:12px;font:inherit;font-size:24px;letter-spacing:8px;text-align:center;direction:ltr">
      <div style="display:flex;gap:8px;margin-top:12px"><button type="submit" style="flex:1;border:0;border-radius:12px;padding:12px;font:inherit;font-weight:900;background:linear-gradient(90deg,#ffb020,#ffd76b);color:#3a1a00">دخول</button><button type="button" data-x style="border:0;border-radius:12px;padding:12px 16px;font:inherit;background:#ffffff1a;color:#fff">إلغاء</button></div></form>`;
    ov.querySelector('p').textContent = msg || 'اكتب الرمز من تطبيق المصادقة.';
    const inp = ov.querySelector('input'); const end = (v) => { ov.remove(); done(v); };
    ov.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const v = inp.value.replace(/\D/g, ''); if (v.length === 6) end(v); });
    ov.querySelector('[data-x]').addEventListener('click', () => end(null));
    document.body.append(ov); setTimeout(() => inp.focus(), 50);
  });
}
export async function mount(el, { onLogin, onError, beforeLogin }) {
  const id = await config();
  if (!el) return;
  if (!id) { onError('ما قدرنا نوصل للخادم الحين. تأكد من النت واضغط إعادة المحاولة.'); return; }
  try { await loadGsi(); } catch {
    // السبب الفعلي: السكربت من accounts.google.com ما انحمّل (شبكة، DNS، حاجب إعلانات/محتوى، أو متصفح يمنع الطرف الثالث)
    onError(navigator.onLine === false
      ? 'ما فيه اتصال بالإنترنت الحين، فما قدرنا نحمّل زر Google.'
      : 'ما قدرنا نفتح accounts.google.com من متصفحك أو شبكتك (ممكن حاجب إعلانات أو شبكة مقيّدة). جرّب شبكة ثانية ثم أعد المحاولة.');
    return;
  }
  if (!document.body.contains(el)) return;
  window.google.accounts.id.initialize({
    client_id: id,
    /* R112: بالجوال وداخل تطبيقات التواصل النافذة المنبثقة تطلع بيضا — نستخدم التحويل للصفحة بدالها */
    ux_mode: useRedirect() ? 'redirect' : 'popup',
    ...(useRedirect() ? { login_uri: location.origin + '/api/auth/google/redirect' } : {}),
    auto_select: false,
    callback: async (resp) => {
      try {
        if (beforeLogin && !await beforeLogin()) return;
        let body = { credential: resp.credential };
        let r = await fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        let j = await r.json().catch(() => ({}));
        // R69: الحساب محمي بالتحقق بخطوتين
        while (!r.ok && j.need2fa) {
          const code = await askTotp(j.error); if (!code) throw new Error('ألغيت تسجيل الدخول.');
          body = { credential: resp.credential, totp: code };
          r = await fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          j = await r.json().catch(() => ({}));
        }
        if (!r.ok) throw new Error(j.error || 'فشل تسجيل الدخول.');
        onLogin(j);
      } catch (e) {
        onError(e.message === 'Failed to fetch' ? 'ما قدرنا نوصل للخادم. تأكد من الاتصال.' : e.message);
      }
    },
  });
  el.innerHTML = '';
  window.google.accounts.id.renderButton(el, { type: 'standard', theme: 'filled_black', size: 'large', text: 'continue_with', shape: 'pill', logo_alignment: 'left', locale: 'ar', width: Math.max(200, Math.min(320, el.clientWidth || 300)) });
}

export async function logout() {
  try { window.google?.accounts?.id?.disableAutoSelect(); } catch { /* ما يأثر */ }
  const r = await fetch('/api/logout', { method: 'POST' });
  if (!r.ok) throw new Error('فشل تسجيل الخروج.');
}
