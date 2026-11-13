const COIN = '<img class="rc-coin" src="/coin-r128.svg?v=r128h" width="20" height="20" alt="" aria-hidden="true" style="display:inline-block;vertical-align:-4px">';
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
  if (d.closed) { sh.innerHTML = `<button type="button" class="x" data-rc="x" aria-label="إغلاق">✕</button><h2>💳 اشحن رصيدك</h2>
    <div class="bal"><div><small>رصيدك</small><b style="white-space:nowrap;display:flex;justify-content:center;align-items:center;gap:4px">${nf(d.coins)}${COIN}</b></div><div><small>منها مشحونة</small><b>${nf(d.paid)} 💳</b></div></div>
    ${(d.packs || []).map((p) => `<div class="pk"><div><b style="white-space:nowrap;display:inline-flex;align-items:center;gap:4px">${nf(p.coins)}${COIN}</b><small>${nf(p.aed)} درهم</small></div><span class="pay" aria-disabled="true" style="opacity:.8;white-space:nowrap;max-width:55%;overflow:hidden;text-overflow:ellipsis">${esc(d.closedMsg)}</span></div>`).join('')}`; return; }
  const wa = d.whatsapp ? `https://wa.me/${d.whatsapp.replace(/^\+/, '')}?text=${encodeURIComponent(`هلا، دفعت لشحن رصيدي في لعبك 💳\nالآيدي: ${d.displayId}\nالاسم: ${d.name}\n(مرفق الإيصال)`)}` : '';
  sh.innerHTML = `<button type="button" class="x" data-rc="x" aria-label="إغلاق">✕</button><h2>💳 اشحن رصيدك</h2><p class="sub">العملات المشحونة تشتري فيها الأشياء الغالية (الآيدي المميز، الدخوليات، القطع الأسطورية، المناجم).</p>
    <div class="bal"><div><small>رصيدك</small><b style="white-space:nowrap;display:flex;justify-content:center;align-items:center;gap:4px">${nf(d.coins)}${COIN}</b></div><div><small>منها مشحونة</small><b>${nf(d.paid)} 💳</b></div></div>
    ${d.packs.map((p) => `<div class="pk"><div><b style="white-space:nowrap;display:inline-flex;align-items:center;gap:4px">${nf(p.coins)}${COIN}</b><small>${nf(p.aed)} درهم</small></div>${d.ziina ? `<button type="button" class="pay" data-zpack="${esc(p.id)}">ادفع</button>` : `<a class="pay" ${p.link ? `href="${esc(p.link)}" target="_blank" rel="noopener"` : 'aria-disabled="true"'}>${p.link ? 'ادفع' : 'قريبًا'}</a>`}</div>`).join('')}
    ${d.ziina ? `<div class="steps"><b style="display:block">طريقة الشحن:</b>اضغط «ادفع» وادفع ببطاقتك أو Apple Pay، وترجع للموقع والعملات تنضاف لك تلقائياً ✅</div>` : `<div class="steps"><b style="display:block">طريقة الشحن:</b>1) اضغط «ادفع» وادفع ببطاقتك أو Apple Pay.<br>2) أرسل صورة الإيصال مع الآيدي حقك <bdi class="rc123-id">${esc(d.displayId)}</bdi> بالواتساب.<br>3) نشحن لك خلال وقت قصير وتوصلك رسالة ✅</div>
    ${wa ? `<a class="wa" href="${esc(wa)}" target="_blank" rel="noopener">أرسل الإيصال بالواتساب</a>` : ''}`}`;
  sh.addEventListener('click', async (e) => { const b = e.target.closest('[data-zpack]'); if (!b || b.disabled) return; b.disabled = true; b.textContent = '…';
    try { const r = await fetch('/api/recharge/ziina', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pack: b.dataset.zpack }) }); const j = await r.json().catch(() => ({})); if (!r.ok || !j.url) throw new Error(j.error || 'تعذّر فتح صفحة الدفع.'); location.href = j.url; }
    catch (er) { b.disabled = false; b.textContent = 'ادفع'; alert(er.message); } });
}
document.addEventListener('click', (e) => { const a = e.target.closest?.('a[href^="#/shop/packs"], [data-recharge123]'); if (!a) return; e.preventDefault(); e.stopPropagation(); openRecharge(); }, true);

/* R124: رجع من صفحة Ziina — نتأكد من الدفع ونشحن */
(async () => {
  const m = /(?:^|;\s*)zp_res=([^;]+)/.exec(document.cookie); if (!m) return;
  const val = decodeURIComponent(m[1]); const clean = () => { document.cookie = 'zp_res=; Path=/; Max-Age=0; SameSite=Lax'; };
  const cancel = val === 'cancel', failed = val === 'failed', doneC = val.startsWith('done.') ? Number(val.slice(5)) : 0, pid = val.startsWith('pending.') ? val.slice(8) : '';
  await new Promise((r) => setTimeout(r, 800));
  const note = (t, ok) => { if (!document.querySelector('style[data-rc124]')) { const s = document.createElement('style'); s.dataset.rc124 = '1'; s.textContent = '.rc124{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 70px);transform:translateX(-50%);z-index:99999;max-width:92vw;padding:14px 18px;border-radius:16px;font:800 15px system-ui,sans-serif;direction:rtl;text-align:center;box-shadow:0 10px 30px #000a;color:#fff}'; document.head.append(s); } document.querySelector('.rc124')?.remove(); const n = document.createElement('div'); n.className = 'rc124'; n.style.background = ok === true ? 'linear-gradient(180deg,#22c55e,#15803d)' : ok === false ? 'linear-gradient(180deg,#ef4444,#991b1b)' : 'linear-gradient(180deg,#7c3aed,#4c1d95)'; n.textContent = t; document.body.append(n); if (ok !== undefined) setTimeout(() => n.remove(), 6000); };
  clean();
  if (cancel) { note('ما تم الدفع.', false); return; }
  if (failed) { note('الدفع ما نجح.', false); return; }
  if (doneC) { note(`تم ✅ انضافت ${doneC.toLocaleString('en-US')} عملة مشحونة 💳`, true); return; }
  if (!pid) return;
  note('جاري التأكد من الدفع…');
  for (let i = 0; i < 15; i++) {
    try { const r = await fetch('/api/recharge/ziina/check', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pid }) }); const j = await r.json().catch(() => ({})); if (j.done) { note(`تم ✅ انضافت ${Number(j.coins || 0).toLocaleString('en-US')} عملة مشحونة 💳`, true); return; } if (j.status === 'failed') { note('الدفع ما نجح.', false); return; } if (r.status === 404) { note('الطلب غير موجود.', false); return; } } catch { /* */ }
    await new Promise((r) => setTimeout(r, 3000));
  }
  note('الدفع قيد المراجعة، بتنضاف العملات أول ما يتأكد ✅', true);
})();
