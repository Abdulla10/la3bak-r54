// R67ae: حذف الحساب — نافذة التأكيد + تنبيه «حسابك مجدول للحذف» مع زر التراجع
const p2 = (n) => String(n).padStart(2, '0');
const dateOf = (ms) => { const d = new Date(Number(ms) + 4 * 3600_000); return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`; };
function css() {
  if (document.querySelector('style[data-ad67]')) return; const st = document.createElement('style'); st.dataset.ad67 = '1';
  st.textContent = `.ad67-sheet{position:fixed;inset:0;z-index:9700;display:grid;place-items:center;background:#000a;padding:16px}.ad67-box{width:min(100%,420px);background:#1a0b2b;border:1px solid #ff8a8a55;border-radius:22px;padding:18px;color:#fff;box-shadow:0 20px 60px #000a}
.ad67-box h3{margin:0 0 8px;font:700 21px var(--font-display,'Cairo')}.ad67-box p{margin:0 0 10px;color:#d8cbe8;line-height:1.7;font-size:14px}.ad67-box ul{margin:0 0 12px;padding-inline-start:18px;color:#d8cbe8;font-size:13px;line-height:1.8}
.ad67-box input{width:100%;box-sizing:border-box;height:46px;border-radius:12px;border:1px solid #ffffff2a;background:#0d0614;color:#fff;padding:0 12px;font:inherit;text-align:center}.ad67-err{color:#ff9a9a;font-size:13px;min-height:18px;margin-top:6px}
.ad67-acts{display:flex;gap:8px;margin-top:10px}.ad67-acts button{flex:1;height:46px;border-radius:14px;border:0;font:700 15px inherit;cursor:pointer}.ad67-del{background:#b4232f;color:#fff}.ad67-del:disabled{opacity:.45}.ad67-keep{background:#ffd66b;color:#2a1300}.ad67-no{background:#ffffff14;color:#fff}`;
  document.head.appendChild(st);
}
function openConfirm() {
  css(); const sh = document.createElement('div'); sh.className = 'ad67-sheet';
  sh.innerHTML = `<div class="ad67-box" role="dialog" aria-modal="true" aria-label="حذف الحساب"><h3>⚠️ حذف الحساب</h3>
  <p>حسابك يتعطل الحين ويختفي عن الكل، وينحذف نهائيًا بعد <b>30 يوم</b>. لو غيرت رأيك، سجل دخول قبل ما تخلص المدة واضغط «تراجع عن الحذف».</p>
  <ul><li>بعد 30 يوم: اسمك وصورتك ومنشوراتك وغرفك تنمسح.</li><li>عملاتك ومقتنياتك ورتبك تروح ومن يرجعونها.</li><li>تطلع من قبيلتك، وينفك الارتباط.</li></ul>
  <p>اكتب كلمة <b>حذف</b> للتأكيد:</p><input data-c autocomplete="off" placeholder="حذف"><div class="ad67-err" data-e></div>
  <div class="ad67-acts"><button type="button" class="ad67-no" data-x>إلغاء</button><button type="button" class="ad67-del" data-go disabled>احذف حسابي</button></div></div>`;
  document.body.appendChild(sh);
  const inp = sh.querySelector('[data-c]'), go = sh.querySelector('[data-go]'), err = sh.querySelector('[data-e]');
  inp.addEventListener('input', () => { go.disabled = inp.value.trim() !== 'حذف'; });
  sh.addEventListener('click', async (e) => {
    if (e.target === sh || e.target.closest('[data-x]')) return sh.remove();
    if (!e.target.closest('[data-go]') || go.disabled) return;
    go.disabled = true; go.textContent = 'جاري…';
    try {
      const r = await fetch('/api/account/delete', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: inp.value.trim() }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { err.textContent = j.error || 'تعذّر الطلب.'; go.disabled = false; go.textContent = 'احذف حسابي'; return; }
      sh.querySelector('.ad67-box').innerHTML = `<h3>تم ✔️</h3><p>حسابك بينحذف نهائيًا يوم <b>${dateOf(j.executeAt)}</b>. سجلناك خروج من كل الأجهزة. لو غيرت رأيك، سجل دخول قبل هالتاريخ وتقدر تتراجع.</p><div class="ad67-acts"><button type="button" class="ad67-no" data-home>تمام</button></div>`;
      sh.querySelector('[data-home]').addEventListener('click', () => { location.hash = '#/'; location.reload(); });
    } catch { err.textContent = 'تعذّر الاتصال.'; go.disabled = false; go.textContent = 'احذف حسابي'; }
  });
}
function pendingNotice(d) {
  if (document.querySelector('.ad67-sheet[data-pending]')) return; css();
  const sh = document.createElement('div'); sh.className = 'ad67-sheet'; sh.dataset.pending = '1';
  sh.innerHTML = `<div class="ad67-box" role="dialog" aria-modal="true" aria-label="الحساب مجدول للحذف"><h3>حسابك مجدول للحذف</h3><p>طلبت حذف حسابك، وبينحذف نهائيًا يوم <b>${dateOf(d.executeAt)}</b>. الحين حسابك مخفي عن الكل.</p><p>تبي ترجع لحسابك؟</p>
  <div class="ad67-err" data-e></div><div class="ad67-acts"><button type="button" class="ad67-keep" data-keep>تراجع عن الحذف</button><button type="button" class="ad67-no" data-out>تسجيل خروج</button></div></div>`;
  document.body.appendChild(sh);
  sh.addEventListener('click', async (e) => {
    if (e.target.closest('[data-keep]')) { try { const r = await fetch('/api/account/delete-cancel', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' }); if (!r.ok) throw 0; sh.remove(); location.reload(); } catch { sh.querySelector('[data-e]').textContent = 'تعذّر التراجع، جرّب مرة ثانية.'; } }
    if (e.target.closest('[data-out]')) { try { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); } catch {} location.hash = '#/'; location.reload(); }
  });
}
document.addEventListener('click', (e) => { const b = e.target.closest?.('[data-s60="delete-account"]'); if (b) { e.preventDefault(); e.stopPropagation(); openConfirm(); } }, true);
(async () => { try { const r = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }); const j = r.ok ? await r.json() : null; if (j?.deletion) pendingNotice(j.deletion); } catch {} })();
