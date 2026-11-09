// R68z: صفحة توثيق الحساب برقم الجوال.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CSS = `.ph68{max-width:440px;margin:0 auto;padding:14px 14px 120px;color:#fff;direction:rtl}.ph68-card{background:linear-gradient(160deg,#2a1048,#1a0a30);border:1px solid #9b5cff4d;border-radius:22px;padding:18px;box-shadow:0 8px 24px #0006}
.ph68 h1{font-size:22px;margin:4px 0 6px;text-align:center}.ph68-ic{font-size:54px;text-align:center}.ph68 p{opacity:.85;font-size:14px;line-height:1.7;text-align:center;margin:4px 0 12px}
.ph68 label{display:block;font-size:13px;margin:10px 0 5px;opacity:.9}.ph68-row{display:flex;gap:8px;direction:ltr}.ph68 select,.ph68 input{border-radius:14px;border:1px solid #9b5cff88;background:#0f0520;color:#fff;padding:12px;font:inherit;font-size:16px}
.ph68 select{flex:none;max-width:150px}.ph68 input{flex:1;min-width:0;text-align:left}.ph68 input.code{text-align:center;letter-spacing:8px;font-size:24px;width:100%;box-sizing:border-box}
.ph68-btn{width:100%;margin-top:14px;border:0;border-radius:16px;padding:14px;font:inherit;font-weight:900;font-size:16px;color:#fff;background:linear-gradient(90deg,#7b3cff,#b44dff);cursor:pointer}.ph68-btn:disabled{opacity:.5}
.ph68-link{background:none;border:0;color:#d6bcff;text-decoration:underline;font:inherit;margin-top:10px;cursor:pointer;width:100%}.ph68-err{color:#ffb3c0;font-weight:700;text-align:center;margin-top:10px}.ph68-ok{color:#7be0a0;font-weight:800;text-align:center}
.ph68-done{text-align:center}.ph68-done b{display:inline-block;margin-top:8px;padding:6px 16px;border-radius:99px;background:#123a26;border:1px solid #4be38a88;color:#c8ffdc}.ph68-pts{list-style:none;padding:0;margin:12px 0 0;font-size:13px;opacity:.85}.ph68-pts li{padding:3px 0}`;
export function mountPhone(root, { api }) {
  if (!document.querySelector('style[data-ph68]')) { const s = document.createElement('style'); s.dataset.ph68 = '1'; s.textContent = CSS; document.head.append(s); }
  const S = { d: null, step: 'phone', cc: '971', phone: '', code: '', err: '', msg: '', busy: false };
  const paint = () => {
    if (!root.isConnected) return;
    const d = S.d;
    let body = '';
    if (!d) body = `<p>${esc(S.err || 'جاري التحميل…')}</p>`;
    else if (d.verified) body = `<div class="ph68-done"><div class="ph68-ic">✅</div><h1>حسابك موثّق بالجوال</h1><p>الرقم المسجل ينتهي بـ <b dir="ltr">••${esc(d.tail)}</b></p><b>📱 موثّق</b></div>`;
    else if (!d.available) body = `<div class="ph68-ic">📱</div><h1>التوثيق بالجوال</h1><p>الخدمة مو متاحة حالياً، بتنفتح قريب.</p>`;
    else if (S.step === 'phone') body = `<div class="ph68-ic">📱</div><h1>وثّق حسابك برقم جوالك</h1><p>نرسل لك رمز برسالة SMS. الرقم ما يطلع لأحد، ونستخدمه بس عشان نمنع الحسابات الوهمية.</p>
      <label>رقم الجوال</label><div class="ph68-row"><select data-ph="cc" aria-label="الدولة">${d.countries.map(([k, n]) => `<option value="${k}" ${S.cc === k ? 'selected' : ''}>+${k} ${esc(n)}</option>`).join('')}</select><input data-ph="phone" inputmode="tel" autocomplete="tel-national" placeholder="5X XXX XXXX" value="${esc(S.phone)}" aria-label="رقم الجوال"></div>
      <button class="ph68-btn" type="button" data-ph="send" ${S.busy ? 'disabled' : ''}>${S.busy ? 'جاري الإرسال…' : 'أرسل الرمز'}</button>
      <ul class="ph68-pts"><li>✓ رقم واحد لكل حساب</li><li>✓ تاخذ علامة «📱 موثّق» بملفك</li></ul>`;
    else body = `<div class="ph68-ic">💬</div><h1>اكتب الرمز</h1><p>أرسلنا رمز من 6 أرقام إلى <b dir="ltr">+${esc(S.cc)} ${esc(S.phone)}</b></p>${S.msg ? `<p class="ph68-ok">${esc(S.msg)}</p>` : ''}
      <input class="code" data-ph="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" value="${esc(S.code)}" aria-label="رمز التحقق">
      <button class="ph68-btn" type="button" data-ph="verify" ${S.busy ? 'disabled' : ''}>${S.busy ? 'جاري التأكد…' : 'تأكيد'}</button><button class="ph68-link" type="button" data-ph="back">غيّر الرقم أو أرسل رمز جديد</button>`;
    root.innerHTML = `<div class="ph68"><section class="ph68-card">${body}${S.err && d ? `<p class="ph68-err" role="alert">${esc(S.err)}</p>` : ''}</section></div>`;
  };
  const load = async () => { try { S.d = await api('/api/phone'); if (S.d.pending && S.step === 'phone' && S.phone) S.step = 'code'; } catch (e) { S.err = e.message; } paint(); };
  root.addEventListener('input', (e) => { const k = e.target.dataset.ph; if (k === 'phone') S.phone = e.target.value; if (k === 'code') S.code = e.target.value; });
  root.addEventListener('change', (e) => { if (e.target.dataset.ph === 'cc') S.cc = e.target.value; });
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-ph]'); if (!b || b.tagName !== 'BUTTON' || S.busy) return; const k = b.dataset.ph;
    if (k === 'back') { S.step = 'phone'; S.err = ''; S.msg = ''; paint(); return; }
    S.busy = true; S.err = ''; paint();
    try {
      if (k === 'send') { const r = await api('/api/phone/send', 'POST', { cc: S.cc, phone: S.phone }); S.step = 'code'; S.code = ''; S.msg = r.devCode ? `(تجربة محلية) الرمز: ${r.devCode}` : ''; }
      if (k === 'verify') { await api('/api/phone/verify', 'POST', { code: S.code }); S.d = await api('/api/phone'); }
    } catch (er) { S.err = er.message; }
    S.busy = false; paint();
  });
  paint(); load();
  return { destroy() { root.innerHTML = ''; } };
}
