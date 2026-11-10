/* R69zo: الدخول بـ Face ID / البصمة (Passkeys) */
const b64u = (buf) => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb = (s) => { const t = atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); const a = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) a[i] = t.charCodeAt(i); return a.buffer; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const supported = () => !!(globalThis.PublicKeyCredential && navigator.credentials?.create);
const post = async (p, body = {}) => { const r = await fetch('/api/passkey/' + p, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'صار خطأ، جرّب مرة ثانية.'); return j; };
const why = (e) => e?.name === 'NotAllowedError' ? 'انلغت العملية أو انتهى الوقت.' : e?.name === 'InvalidStateError' ? 'هالجهاز مسجل من قبل ✅' : e?.message || 'صار خطأ، جرّب مرة ثانية.';
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
export const bioName = () => (isIOS() ? 'Face ID' : 'البصمة');

/** يفعّل الدخول بالبصمة على هالجهاز للحساب الحالي */
export async function enable() {
  const o = await post('register/options');
  const pk = { ...o, challenge: unb(o.challenge), user: { ...o.user, id: unb(o.user.id) }, excludeCredentials: (o.excludeCredentials || []).map((c) => ({ ...c, id: unb(c.id) })) };
  let cred; try { cred = await navigator.credentials.create({ publicKey: pk }); } catch (e) { throw new Error(why(e)); }
  const r = cred.response; const spki = r.getPublicKey?.(); if (!spki) throw new Error('متصفحك قديم. حدّث iOS أو المتصفح.');
  return post('register', { id: b64u(cred.rawId), clientDataJSON: b64u(r.clientDataJSON), authenticatorData: b64u(r.getAuthenticatorData()), publicKey: b64u(spki), alg: r.getPublicKeyAlgorithm() });
}
/** دخول بالبصمة: يرجع {user, google} */
export async function login() {
  const o = await post('login/options');
  let cred; try { cred = await navigator.credentials.get({ publicKey: { challenge: unb(o.challenge), rpId: o.rpId, userVerification: o.userVerification, timeout: o.timeout, allowCredentials: [] } }); } catch (e) { throw new Error(why(e)); }
  const r = cred.response;
  return post('login', { id: b64u(cred.rawId), clientDataJSON: b64u(r.clientDataJSON), authenticatorData: b64u(r.authenticatorData), signature: b64u(r.signature), userHandle: r.userHandle ? b64u(r.userHandle) : '' });
}
export const loginButton = () => supported() ? `<button class="gold-btn pk69-login" type="button" data-act="pk-login" style="margin-top:12px;width:100%;font-weight:800">🔐 ادخل بـ ${bioName()}</button>` : '';

/** صفحة الإعدادات */
const P = { list: null, err: '', msg: '', busy: false };
export function pageHTML() {
  if (!supported()) return `<section class="card"><h1>🔐 الدخول بـ ${bioName()}</h1><p class="muted">متصفحك ما يدعم هالميزة. على الآيفون حدّث iOS لـ 16 أو أحدث وافتح الموقع من Safari.</p></section>`;
  return `<section class="card pk69"><h1>🔐 الدخول بـ ${bioName()}</h1>
    <p class="muted">بدل كلمة السر: تدخل حسابك بوجهك أو بصمتك بثانية. أأمن من أي كلمة سر — ما تنسرق وما ينفع معها التصيّد، لأن المفتاح محفوظ بجوالك بس.</p>
    ${P.err ? `<p class="neg" role="alert">${esc(P.err)}</p>` : ''}${P.msg ? `<p class="pos" role="status">${esc(P.msg)}</p>` : ''}
    <button class="btn block gold-btn" type="button" data-act="pk-enable" ${P.busy ? 'disabled' : ''}>${P.busy ? 'لحظة…' : `فعّل ${bioName()} على هالجهاز`}</button>
    <h2 style="margin:16px 0 6px;font-size:16px">الأجهزة المفعّلة</h2>
    ${P.list === null ? '<p class="muted">جاري التحميل…</p>' : P.list.length ? P.list.map((k) => `<div class="list-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)"><span>📱 ${esc(k.label)}<small style="display:block;opacity:.7">تفعّل ${new Date(k.at).toLocaleDateString('ar-AE-u-nu-latn')}${k.used ? ` · آخر دخول ${new Date(k.used).toLocaleDateString('ar-AE-u-nu-latn')}` : ''}</small></span><button class="btn ghost" type="button" data-act="pk-remove" data-id="${esc(k.id)}">احذف</button></div>`).join('') : '<p class="muted">ما فعّلتها على أي جهاز للحين.</p>'}
    <p class="hint" style="margin-top:12px">بعد التفعيل: لو طلعت من حسابك، بصفحة الدخول اضغط «ادخل بـ ${bioName()}».</p></section>`;
}
export async function load(rerender) { try { P.list = (await post('list')).list; } catch (e) { P.err = e.message; P.list = []; } rerender(); }
export async function act(name, el, rerender) {
  if (P.busy) return; P.err = ''; P.msg = '';
  try {
    P.busy = true; rerender();
    if (name === 'pk-enable') { await enable(); P.msg = `تم ✅ الحين تقدر تدخل بـ ${bioName()}`; }
    if (name === 'pk-remove') { if (!confirm('تحذف هالجهاز؟')) return; await post('remove', { id: el.dataset.id }); P.msg = 'انحذف'; }
    P.list = (await post('list')).list;
  } catch (e) { P.err = e.message; } finally { P.busy = false; rerender(); }
}
