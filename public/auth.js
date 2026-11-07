/* الدخول بـ Google: زر «Sign in with Google» الرسمي يعطينا رمز ID، والخادم هو اللي يتحقق منه ويبني الجلسة.
   ما فيه أسرار هنا: معرّف العميل عام ويجي من /api/auth/config. */
const A = { cfg: undefined, gsi: null, inited: false };

async function config() {
  if (A.cfg !== undefined) return A.cfg;
  try { A.cfg = (await (await fetch('/api/auth/config', { cache: 'no-store' })).json()).google || null; } catch { A.cfg = null; }
  return A.cfg;
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

export async function enabled() { return !!(await config()); }

/** يعرض زر Google داخل el. onLogin(user) بعد نجاح الخادم، onError(msg) عند الفشل */
export async function mount(el, { onLogin, onError, beforeLogin }) {
  const id = await config();
  if (!el || !id) { if (el) el.closest('.g-card')?.setAttribute('hidden', ''); return; }
  try { await loadGsi(); } catch {
    // السبب الفعلي: السكربت من accounts.google.com ما انحمّل (شبكة، DNS، حاجب إعلانات/محتوى، أو متصفح يمنع الطرف الثالث)
    onError(navigator.onLine === false
      ? 'ما فيه اتصال بالإنترنت الحين، فما قدرنا نحمّل زر Google.'
      : 'ما قدرنا نفتح accounts.google.com من متصفحك أو شبكتك (ممكن حاجب إعلانات أو شبكة مقيّدة). تقدر تكمل كضيف، أو جرّب شبكة ثانية ثم أعد المحاولة.');
    return;
  }
  if (!document.body.contains(el)) return;
  window.google.accounts.id.initialize({
    client_id: id,
    ux_mode: 'popup',
    auto_select: false,
    callback: async (resp) => {
      try {
        if (beforeLogin && !await beforeLogin()) return;
        const r = await fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: resp.credential }) });
        const j = await r.json().catch(() => ({}));
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
