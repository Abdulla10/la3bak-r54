// R123: «اشحن» — باقات العملات المشحونة 💳. اللاعب يدفع برابط Ziina، ويرسل الإيصال مع الآيدي بالواتساب، والإدارة تشحن له.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const CSS = `.rc123{position:fixed;inset:0;z-index:9650;display:flex;align-items:flex-end;justify-content:center;background:rgba(5,2,12,.65);direction:rtl;font-family:inherit}
.rc123-s{position:relative;width:100%;max-width:560px;max-height:90vh;overflow:auto;padding:18px 16px calc(18px + env(safe-area-inset-bottom));border-radius:26px 26px 0 0;background:linear-gradient(180deg,#2a0f4a,#14062a 70%);border-top:1.5px solid #f5c54288;color:#fff;animation:rc123 .25s ease both}
@keyframes rc123{from{transform:translateY(100%)}}
.rc123 h2{margin:0 0 4px;font-size:22px;text-align:center}.rc123 .sub{margin:0 0 12px;text-align:center;color:#cdb8f0;font-size:13px;line-height:1.6}
.rc123 .bal{display:flex;gap:8px;margin:0 0 14px}.rc123 .bal div{flex:1;padding:10px;border-radius:14px;background:#ffffff10;text-align:center}.rc123 .bal b{display:block;font-size:18px}.rc123 .bal small{color:#cdb8f0}
.rc123 .pk{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;padding:14px;border-radius:18px;border:1.5px solid #f5c54266;background:linear-gradient(160deg,#f5c5421f,#ffffff06)}
.rc123 .pk b{font-size:19px}.rc123 .pk small{display:block;color:#cdb8f0;font-weight:700}
.rc123 .pay{flex:none;border:0;border-radius:14px;padding:12px 16px;font:900 15px inherit;background:linear-gradient(180deg,#ffe07a,#f0a91f);color:#3a1600;text-decoration:none;cursor:pointer}.rc123 .pay[aria-disabled=true]{opacity:.45;pointer-events:none}
.rc123 .steps{display:block!important;margin:12px 0;padding:12px 14px;border-radius:14px;background:#ffffff0a;font-size:13.5px;line-height:1.8;color:#eadcff}.rc123 .steps b{color:#ffd76a}
.rc123 .wa{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px;border-radius:14px;background:#25d366;color:#05300f;font:900 15px inherit;text-decoration:none}
.rc123 .x{position:absolute;top:12px;left:12px;width:38px;height:38px;border-radius:50%;border:1.5px solid #ffffff2e;background:#ffffff12;color:#fff;font-size:18px}
.rc123 .rc123-id{direction:ltr;display:inline!important;width:auto!important;margin:0 2px!important;padding:2px 10px;border-radius:99px;background:#ffd76a;color:#3a1600;font-weight:900}`;
export async function openRecharge() {
  if (!document.querySelector('style[data-rc123]')) { const s = document.createElement('style'); s.dataset.rc123 = '1'; s.textContent = CSS; document.head.append(s); }
  document.querySelector('.rc123')?.remove();
  const root = document.createElement('div'); root.className = 'rc123'; root.innerHTML = '<section class="rc123-s" role="dialog" aria-label="اشحن"><p class="sub">جاري التحميل…</p></section>'; document.body.append(root);
  const sh = root.querySelector('.rc123-s');
  root.addEventListener('click', (e) => { if (e.target === root || e.target.closest('[data-rc=x]')) root.remove(); });
  let d; try { const r = await fetch('/api/recharge', { credentials: 'same-origin', cache: 'no-store' }); d = await r.json(); if (!r.ok || !d.ok) throw new Error(d.error || 'سجّل دخولك أول.'); }
  catch (e) { sh.innerHTML = `<button type="button" class="x" data-rc="x">✕</button><p class="sub">${esc(e.message)}</p>`; return; }
  const wa = d.whatsapp ? `https://wa.me/${d.whatsapp.replace(/^\+/, '')}?text=${encodeURIComponent(`هلا، دفعت لشحن رصيدي في لعبك 💳\nالآيدي: ${d.displayId}\nالاسم: ${d.name}\n(مرفق الإيصال)`)}` : '';
  sh.innerHTML = `<button type="button" class="x" data-rc="x" aria-label="إغلاق">✕</button><h2>💳 اشحن رصيدك</h2><p class="sub">العملات المشحونة تشتري فيها الأشياء الغالية (الآيدي المميز، الدخوليات، القطع الأسطورية، المناجم).</p>
    <div class="bal"><div><small>رصيدك</small><b>${nf(d.coins)} 🪙</b></div><div><small>منها مشحونة</small><b>${nf(d.paid)} 💳</b></div></div>
    ${d.packs.map((p) => `<div class="pk"><div><b>${nf(p.coins)} 🪙</b><small>${nf(p.aed)} درهم</small></div><a class="pay" ${p.link ? `href="${esc(p.link)}" target="_blank" rel="noopener"` : 'aria-disabled="true"'}>${p.link ? 'ادفع' : 'قريبًا'}</a></div>`).join('')}
    <div class="steps"><b style="display:block">طريقة الشحن:</b>1) اضغط «ادفع» وادفع ببطاقتك أو Apple Pay.<br>2) أرسل صورة الإيصال مع الآيدي حقك <bdi class="rc123-id">${esc(d.displayId)}</bdi> بالواتساب.<br>3) نشحن لك خلال وقت قصير وتوصلك رسالة ✅</div>
    ${wa ? `<a class="wa" href="${esc(wa)}" target="_blank" rel="noopener">أرسل الإيصال بالواتساب</a>` : ''}`;
}
document.addEventListener('click', (e) => { const a = e.target.closest?.('a[href^="#/shop/packs"], [data-recharge123]'); if (!a) return; e.preventDefault(); e.stopPropagation(); openRecharge(); }, true);
